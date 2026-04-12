// ═══════════════════════════════════════════════════════════════
// sel_tool_safety.js — Safety & Boundaries Plugin (v3.0)
// Body safety, trusted adults, consent, boundaries, crisis
// resources, grade-adaptive scenarios, safety quiz, boundary
// types lesson, safety plan builder, red/green flag activity,
// digital safety deep dive, assertiveness training, emergency
// preparedness, and safety badges.
// Registered tool ID: "safety"
// Category: responsible-decision-making
// Grade-adaptive: K-8 (elementary / middle)
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
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxReveal() { playTone(392, 0.1, 'sine', 0.06); setTimeout(function() { playTone(494, 0.1, 'sine', 0.06); }, 80); setTimeout(function() { playTone(588, 0.15, 'sine', 0.08); }, 160); }
  function sfxResolve() { playTone(262, 0.15, 'sine', 0.06); setTimeout(function() { playTone(330, 0.12, 'sine', 0.06); }, 100); setTimeout(function() { playTone(392, 0.12, 'sine', 0.07); }, 200); setTimeout(function() { playTone(523, 0.2, 'sine', 0.09); }, 320); }

  // ══════════════════════════════════════════════════════════════
  // ── Safety Concepts (grade-adaptive) ──
  // ══════════════════════════════════════════════════════════════
  var LEARN_TOPICS = {
    elementary: [
      { id: 'body_safety', icon: '\uD83E\uDDD1', title: 'Body Safety', desc: 'Your body belongs to you. No one has the right to touch you in a way that makes you feel uncomfortable.', tip: 'Remember: You are the boss of YOUR body \u2014 always!' },
      { id: 'safe_touch', icon: '\u2764\uFE0F', title: 'Safe vs. Unsafe Touch', desc: 'Safe touches feel caring and kind, like a high-five or a hug you want. Unsafe touches make you feel confused, scared, or icky inside.', tip: 'Remember: Touches that feel wrong ARE wrong. Trust your feelings.' },
      { id: 'trusted_adults', icon: '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1', title: 'Trusted Adults', desc: 'Trusted adults are grown-ups who keep you safe, listen to you, and believe you. They could be a parent, teacher, counselor, or coach.', tip: 'Remember: Who are the grown-ups you can talk to? Try to name at least 3!' },
      { id: 'saying_no', icon: '\u270B', title: 'Saying No', desc: 'You have the right to say NO to anyone \u2014 even adults \u2014 if something feels wrong or uncomfortable. A safe adult will respect your NO.', tip: 'Remember: It is okay to say NO, even to adults. Your safety comes first.' },
      { id: 'secrets', icon: '\uD83D\uDCEC', title: 'Secrets vs. Surprises', desc: 'Surprises are fun and make people happy (like a birthday party). Unsafe secrets make you feel bad, scared, or worried inside.', tip: 'Remember: Unsafe secrets make you feel bad inside. It is always okay to tell a trusted adult.' },
      { id: 'online_safety', icon: '\uD83D\uDCBB', title: 'Online Safety', desc: 'Never share your real name, address, school, phone number, or photos with strangers online. Not everyone online is who they say they are.', tip: 'Remember: Never share personal info online. If something feels weird, tell a grown-up.' },
      { id: 'bullying', icon: '\uD83D\uDEAB', title: 'Bullying', desc: 'Bullying is when someone is mean to you on purpose, over and over. It is NEVER your fault. You deserve to be treated with kindness.', tip: 'Remember: No one deserves to be bullied. Tell a trusted adult \u2014 you will NOT get in trouble.' },
      { id: 'feelings_signals', icon: '\uD83D\uDEA8', title: 'Feelings as Signals', desc: 'When something feels icky, scary, or confusing, that is your brain\u2019s alarm system telling you something might not be safe.', tip: 'Remember: Icky feelings are your brain\u2019s alarm system. Listen to them and tell someone you trust.' }
    ],
    middle: [
      { id: 'boundaries', icon: '\uD83D\uDEE1\uFE0F', title: 'Personal Boundaries', desc: 'Boundaries are invisible lines that protect your physical space, emotions, and personal information. Everyone has the right to set limits \u2014 and to change them.', tip: 'Remember: Setting boundaries is not rude. It is healthy and brave.' },
      { id: 'consent', icon: '\u2705', title: 'Consent', desc: 'Consent means someone freely and clearly says YES. It must be enthusiastic, informed, and reversible. Silence or pressure is NOT consent. You can change your mind at any time.', tip: 'Remember: Consent must be enthusiastic, informed, and reversible \u2014 every time.' },
      { id: 'digital_safety', icon: '\uD83D\uDCF1', title: 'Digital Safety', desc: 'Everything you share online can be screenshotted, saved, and shared without your knowledge. Think before you send. Protect your digital footprint.', tip: 'Remember: Screenshots are forever. If you would not want it on a billboard, do not send it.' },
      { id: 'peer_pressure', icon: '\uD83E\uDDD2', title: 'Peer Pressure', desc: 'Real friends respect your boundaries and never make you feel bad for saying no. If someone pressures you, that is about their needs, not yours.', tip: 'Remember: Real friends do not pressure you. Your NO is enough \u2014 no explanation needed.' },
      { id: 'grooming', icon: '\u26A0\uFE0F', title: 'Recognizing Grooming', desc: 'Grooming is when someone builds trust to take advantage of you. Warning signs: special treatment, secret-keeping, rule-breaking "just for you," and making you feel like you owe them.', tip: 'Remember: Adults who break rules "just for you" are testing your limits. Tell someone you trust.' },
      { id: 'self_advocacy', icon: '\uD83D\uDDE3\uFE0F', title: 'Self-Advocacy', desc: 'Speaking up about something that is wrong \u2014 or asking for help \u2014 is brave. It is NOT tattling. You have the right to be heard and believed.', tip: 'Remember: Speaking up is brave, not tattling. You deserve to be safe.' },
      { id: 'bystander', icon: '\uD83D\uDC65', title: 'Bystander Action', desc: 'If you see someone being hurt, harassed, or bullied, you have the power to help. Tell a trusted adult, support the person, or safely intervene.', tip: 'Remember: See something? Say something. Your voice can protect others.' },
      { id: 'crisis_resources', icon: '\uD83D\uDCDE', title: 'Crisis Resources', desc: 'You are NEVER alone. No matter what you are going through, trained helpers are available 24/7. You do NOT need to handle hard things by yourself.', tip: 'Remember: You are NEVER alone \u2014 help is always available. Reaching out is the bravest thing you can do.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Crisis Resources (always visible) ──
  // ══════════════════════════════════════════════════════════════
  var CRISIS_RESOURCES = [
    { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', desc: 'Free, confidential, 24/7 support', icon: '\uD83D\uDCDE' },
    { name: 'Crisis Text Line', contact: 'Text HOME to 741741', desc: 'Free crisis counseling via text', icon: '\uD83D\uDCF1' },
    { name: 'Childhelp National Child Abuse Hotline', contact: '1-800-422-4453', desc: 'Professional crisis counselors 24/7', icon: '\u2764\uFE0F' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Safety Scenarios ──
  // ══════════════════════════════════════════════════════════════
  var SAFETY_SCENARIOS = {
    elementary: [
      { id: 'es1', title: 'The Stranger\u2019s Car',
        setup: 'A person you don\u2019t know pulls up in a car and says, "Your mom asked me to pick you up. Hop in!" They seem friendly.',
        choices: [
          { label: 'Get in the car \u2014 they said Mom sent them.', rating: 1, feedback: 'A safe adult would NEVER ask a child to get in a car without your parent telling you first. Even if they seem nice, this is a trick. Your instinct to be cautious is right.' },
          { label: 'Say "No thank you" and run to a trusted adult nearby.', rating: 3, feedback: 'Excellent choice! You said no clearly and got to safety. Your parents would always tell you ahead of time if someone else was picking you up. You did exactly the right thing.' },
          { label: 'Stand there and talk to them to figure out if they are telling the truth.', rating: 2, feedback: 'It is smart to be careful, but talking to a stranger who is trying to get you in a car gives them more time to convince you. The safest thing is to say NO and go to a trusted adult right away.' }
        ] },
      { id: 'es2', title: 'The Secret',
        setup: 'An older kid at school shows you something on their phone and says, "This is our secret. Don\u2019t tell anyone or you\u2019ll get in trouble."',
        choices: [
          { label: 'Keep the secret because you do not want to get in trouble.', rating: 1, feedback: 'When someone tells you to keep a secret AND threatens that you will get in trouble, that is an unsafe secret. You will NOT get in trouble for telling a trusted adult. The person who showed you something wrong is the one who made a bad choice \u2014 not you.' },
          { label: 'Tell a trusted adult what happened.', rating: 3, feedback: 'That is exactly right. Unsafe secrets feel scary and heavy. Telling a trusted adult is always the right move. You are brave for speaking up, and you will NOT get in trouble.' },
          { label: 'Tell your friend but not an adult.', rating: 2, feedback: 'It is good that you did not want to keep this to yourself. But in situations like this, a trusted adult is the best person to tell because they can actually help and protect you.' }
        ] },
      { id: 'es3', title: 'The Uncomfortable Touch',
        setup: 'Someone touches you in a way that makes you feel confused and uncomfortable. They say, "This is normal. Everyone does this."',
        choices: [
          { label: 'Believe them because they are older and must know better.', rating: 1, feedback: 'Just because someone is older does NOT mean they are right. If a touch makes you feel confused, uncomfortable, or scared, it is NOT okay \u2014 no matter what anyone says. This is NEVER your fault.' },
          { label: 'Say "STOP! I don\u2019t like that!" and tell a trusted adult right away.', rating: 3, feedback: 'You are so brave. Saying STOP is powerful. Telling a trusted adult means you will be protected. Remember: this is NOT your fault, and you will NOT get in trouble for telling.' },
          { label: 'Try to forget about it and hope it does not happen again.', rating: 2, feedback: 'It makes sense to want it to go away, and your feelings are completely valid. But telling a trusted adult is the best way to make sure you stay safe. You deserve help and protection.' }
        ] },
      { id: 'es4', title: 'The Dangerous Dare',
        setup: 'A group of friends dares you to climb onto the school roof. They say, "Don\u2019t be a chicken! Everyone has done it!"',
        choices: [
          { label: 'Do it so they do not think you are a coward.', rating: 1, feedback: 'Being called a chicken stings, but a dangerous dare is never worth risking your safety. Real friends will not make you prove yourself by doing something that could hurt you.' },
          { label: 'Say "No, that is dangerous" and walk away.', rating: 3, feedback: 'That takes real courage! Saying no when everyone is watching is one of the hardest \u2014 and bravest \u2014 things you can do. You chose safety, and that is always the right call.' },
          { label: 'Watch them do it but do not do it yourself.', rating: 2, feedback: 'It is good that you did not do the dare. But watching someone do something dangerous without telling an adult means they could get hurt too. A trusted adult can help everyone stay safe.' }
        ] },
      { id: 'es5', title: 'The Online Photo Request',
        setup: 'Someone you met in an online game asks you to send a photo of yourself. They say they want to see what their "gaming buddy" looks like.',
        choices: [
          { label: 'Send a photo \u2014 they seem really nice.', rating: 1, feedback: 'People online are not always who they say they are. A photo of you can be shared, saved, or used in ways you cannot control. Never send photos to people you only know online.' },
          { label: 'Say "I do not share photos online" and tell a parent or trusted adult.', rating: 3, feedback: 'Perfect response! You set a clear boundary AND told a trusted adult. It does not matter how nice someone seems online \u2014 protecting your privacy is always the smart choice.' },
          { label: 'Block them without telling anyone.', rating: 2, feedback: 'Blocking is a good instinct! But telling a trusted adult is also important because they can help make sure this person does not try to contact you another way.' }
        ] },
      { id: 'es6', title: 'The Tablet Trouble',
        setup: 'A friend shows you something on their tablet that looks really inappropriate. They say, "Check this out! It is so funny!" It makes you feel uncomfortable inside.',
        choices: [
          { label: 'Look at it because your friend thinks it is funny.', rating: 1, feedback: 'If something makes you feel uncomfortable, that feeling is telling you something important. Just because a friend thinks something is funny does not make it okay. Trust your gut.' },
          { label: 'Say "That does not look right" and tell a trusted adult what you saw.', rating: 3, feedback: 'Excellent! You named the problem, set a boundary, and involved a safe adult. You will NOT get in trouble for reporting something inappropriate \u2014 you did the right thing.' },
          { label: 'Look away and walk to a different area.', rating: 2, feedback: 'Walking away shows you trust your feelings. But telling a trusted adult is also important because they can help make sure your friend gets guidance and that it does not happen again.' }
        ] },
      { id: 'es7', title: 'The Online Meeting',
        setup: 'Someone you chat with in an online game says they live nearby and want to meet you at the park after school. They say, "It will be so fun! Do not tell your parents, it is a surprise."',
        choices: [
          { label: 'Go to the park \u2014 they seem like a real friend.', rating: 1, feedback: 'People online are NOT always who they say they are. Meeting someone from the internet alone, especially without telling a parent, is extremely dangerous. This request to keep it secret is a major red flag.' },
          { label: 'Say no and immediately tell your parent or a trusted adult about the request.', rating: 3, feedback: 'You are absolutely right! Anyone who asks you to meet in secret is NOT safe. Telling an adult right away is the bravest and smartest thing to do. You could be preventing a very dangerous situation.' },
          { label: 'Do not go, but keep talking to them online.', rating: 2, feedback: 'It is good that you would not go. But someone who asks a kid to meet secretly is showing warning signs. Telling a trusted adult is important so they can help keep you safe online too.' }
        ] },
      { id: 'es8', title: 'The Store Stranger',
        setup: 'You are at a store with your family. An adult you do not know comes up and says, "Hey kid, I have some candy in my car. Want to come pick some out?" They seem friendly and smile a lot.',
        choices: [
          { label: 'Go with them \u2014 they seem nice and you like candy.', rating: 1, feedback: 'No matter how nice someone seems, a safe adult would NEVER ask a child they do not know to come to their car. This is a trick. Your safety is more important than anything someone might offer you.' },
          { label: 'Say "No!" loudly and run back to your family right away. Tell them what happened.', rating: 3, feedback: 'That is exactly the right move! Saying NO loudly, getting to safety, and telling your family is perfect. You do not have to be polite to someone who makes you feel unsafe. Your safety comes FIRST.' },
          { label: 'Say "No thank you" and walk away quietly.', rating: 2, feedback: 'Saying no is great! But it is very important to also tell your family right away so they can alert store security. This kind of thing should always be reported to a trusted adult.' }
        ] },
      { id: 'es9', title: 'The Game Chat Stranger',
        setup: 'You are playing an online game and someone in the chat starts asking you personal questions like what school you go to, where you live, and if your parents are home. They say they just want to be friends.',
        choices: [
          { label: 'Answer their questions \u2014 they seem like a nice player.', rating: 1, feedback: 'People online are NOT always who they say they are. Someone who asks where you live and if your parents are home is collecting information that could put you in danger. Never share personal details online.' },
          { label: 'Do not answer, leave the chat, and tell a parent or trusted adult what happened.', rating: 3, feedback: 'Exactly right! You protected your personal information and told an adult. A safe person would never ask a kid these kinds of questions. Your instincts are strong.' },
          { label: 'Give them fake answers to trick them.', rating: 2, feedback: 'It is smart that you did not share real information. But continuing to talk to someone who asks unsafe questions keeps the conversation going. The safest choice is to leave and tell a trusted adult.' }
        ] },
      { id: 'es10', title: 'The Unwanted Photo',
        setup: 'At recess, an older student takes a photo of you without asking. When you tell them to delete it, they laugh and say, "It is just a picture. Relax."',
        choices: [
          { label: 'Let it go \u2014 it is just a photo and you do not want to cause drama.', rating: 1, feedback: 'You have the right to decide who takes your photo. Someone taking your picture without permission and refusing to delete it is NOT okay. You deserve to have your boundaries respected.' },
          { label: 'Tell them firmly, "I did not say you could take my photo. Please delete it." Then tell a teacher or trusted adult.', rating: 3, feedback: 'You spoke up clearly AND got help from an adult. You have every right to control who takes your picture. Standing up for yourself like this is brave and important.' },
          { label: 'Try to grab their phone and delete it yourself.', rating: 2, feedback: 'It is understandable to want the photo gone immediately. But grabbing someone\u2019s phone could lead to a bigger conflict. Telling a trusted adult is the safest way to handle this \u2014 they can make sure the photo is deleted.' }
        ] },
      { id: 'es11', title: 'The Uncomfortable Babysitter',
        setup: 'Your babysitter starts doing things that make you feel uncomfortable. They tell you not to tell your parents because "they would not believe you anyway" and "you will get in trouble."',
        choices: [
          { label: 'Stay quiet because you are scared of getting in trouble.', rating: 1, feedback: 'You will NOT get in trouble for telling the truth. When someone says you will get in trouble for telling, that is a trick to keep you silent. What they are doing is wrong \u2014 not anything you did.' },
          { label: 'Tell your parent or another trusted adult as soon as possible, even if you feel scared.', rating: 3, feedback: 'You are so brave. Telling a trusted adult is always the right thing to do. Your parents WILL believe you, and you will NOT get in trouble. The babysitter is the one who did something wrong \u2014 not you.' },
          { label: 'Wait and hope it does not happen again.', rating: 2, feedback: 'It is natural to hope things will get better on their own. But telling a trusted adult is the best way to make sure you are protected. You deserve to feel safe, and adults in your life want to help you.' }
        ] }
    ],
    middle: [
      { id: 'ms1', title: 'The Inappropriate Message',
        setup: 'A friend forwards you a message with sexual content from someone at school. They think it is funny and want you to share it too.',
        choices: [
          { label: 'Forward it to keep the joke going.', rating: 1, feedback: 'Sharing sexual content \u2014 especially involving minors \u2014 can have serious legal consequences and deeply hurts the person in the message. Even if you did not create it, forwarding it makes you part of the problem.' },
          { label: 'Delete the message and tell a trusted adult.', rating: 3, feedback: 'That is the right call. You protected yourself legally and ethically, and telling an adult means someone can help the person who was exposed. This takes courage, and it matters.' },
          { label: 'Ignore it and do not forward it, but do not tell anyone either.', rating: 2, feedback: 'Not forwarding is important. But the person in that message may need help, and a trusted adult can step in to protect them. Your voice can make a difference.' }
        ] },
      { id: 'ms2', title: 'The Uncomfortable Comments',
        setup: 'An adult in your life \u2014 a coach, family friend, or mentor \u2014 has started making comments about your body or appearance that make you uncomfortable. They say it is "just a compliment."',
        choices: [
          { label: 'Accept it because they are an adult and probably do not mean anything by it.', rating: 1, feedback: 'Your discomfort is telling you something important. When an adult\u2019s comments make you uncomfortable, that feeling is valid \u2014 regardless of their intentions. You have the right to set boundaries with anyone, including adults.' },
          { label: 'Tell another trusted adult how the comments make you feel.', rating: 3, feedback: 'Absolutely the right move. Trusting your instincts and telling another adult is brave and important. A trusted adult can help you figure out next steps and make sure you feel safe.' },
          { label: 'Try to avoid being alone with that person.', rating: 2, feedback: 'Protecting yourself by creating distance is smart. But telling a trusted adult is important too, because they can help address the situation and make sure it stops. You should not have to manage this alone.' }
        ] },
      { id: 'ms3', title: 'The Cyberbullying Witness',
        setup: 'You see a group chat where several classmates are ganging up on someone \u2014 posting mean comments, fake screenshots, and threatening messages. The target is clearly upset.',
        choices: [
          { label: 'Stay out of it \u2014 it is not your problem.', rating: 1, feedback: 'It is understandable to not want to get involved. But silence can feel like agreement to the person being targeted. Bystanders have more power than they realize.' },
          { label: 'Screenshot the messages and show a trusted adult. Send a private supportive message to the targeted person.', rating: 3, feedback: 'Outstanding. You documented evidence, reported it to someone who can help, and supported the person being hurt. That is powerful bystander action.' },
          { label: 'Privately message the bullies and ask them to stop.', rating: 2, feedback: 'It is brave to speak up directly. But in group cyberbullying situations, involving a trusted adult is important because the behavior often does not stop with peer intervention alone.' }
        ] },
      { id: 'ms4', title: 'The Privacy Pressure',
        setup: 'A peer you are dating pressures you to share a private photo. They say, "If you really liked me, you would trust me. I would never show anyone."',
        choices: [
          { label: 'Send the photo to prove you trust them.', rating: 1, feedback: 'Someone who truly respects you would NEVER pressure you to share something private. Sharing intimate images can have lifelong consequences. This pressure is a red flag, not a sign of love.' },
          { label: 'Say no clearly: "I do care about you, but I am not comfortable with that. If you respect me, you will understand."', rating: 3, feedback: 'That is a strong, clear boundary. Real respect means accepting someone\u2019s no without guilt-tripping them. You showed that you know your worth.' },
          { label: 'Change the subject and hope they stop asking.', rating: 2, feedback: 'Avoiding the topic is understandable, but if they keep pressuring you, a direct no is important. You might also talk to a trusted adult about the pressure you are feeling.' }
        ] },
      { id: 'ms5', title: 'The Warning Signs',
        setup: 'A close friend has been acting differently \u2014 giving away their things, saying goodbye in strange ways, and posting dark messages online. You are worried.',
        choices: [
          { label: 'Assume they are just going through a phase and it will pass.', rating: 1, feedback: 'These warning signs should always be taken seriously. It is better to overreact and be wrong than to underreact and miss a chance to help. Your concern shows you care deeply.' },
          { label: 'Talk to your friend directly AND tell a trusted adult right away.', rating: 3, feedback: 'This is exactly right. Let your friend know you care, and immediately involve a trusted adult who can provide professional support. You may be saving a life. That is not an exaggeration.' },
          { label: 'Ask your friend if they are okay.', rating: 2, feedback: 'Checking in is important and kind. But when warning signs are this serious, telling a trusted adult is essential \u2014 even if your friend asks you not to. Their safety matters more than keeping a secret.' }
        ] },
      { id: 'ms6', title: 'The Photo Threat',
        setup: 'Someone you used to be close with is threatening to share private photos of you unless you do what they say. You feel scared and trapped.',
        choices: [
          { label: 'Do what they ask so they do not share the photos.', rating: 1, feedback: 'Giving in to threats does NOT make them stop \u2014 it usually makes the person ask for more. This is NOT your fault. What this person is doing is wrong, and in many cases, it is a crime. You deserve help.' },
          { label: 'Tell a trusted adult immediately. Do not respond to the threat. Save any evidence (screenshots).', rating: 3, feedback: 'This is exactly right. Telling a trusted adult, saving evidence, and not engaging with the threat are the safest steps. What this person is doing is wrong and possibly illegal. You are NOT in trouble \u2014 they are.' },
          { label: 'Block the person and hope they go away.', rating: 2, feedback: 'Blocking can help, but this situation needs adult support. The person may try to reach you other ways or follow through on their threat. A trusted adult can involve authorities if needed. This is NOT your fault.' }
        ] },
      { id: 'ms7', title: 'The Dangerous Home',
        setup: 'A close friend confides in you that they do not feel safe at home. They describe situations that sound really concerning. They beg you not to tell anyone.',
        choices: [
          { label: 'Keep their secret because they asked you to.', rating: 1, feedback: 'It is natural to want to honor your friend\u2019s wishes. But when someone is in danger, their safety matters more than keeping a secret. Getting help is NOT betraying them \u2014 it is protecting them.' },
          { label: 'Tell a trusted adult like a school counselor, even though your friend asked you not to.', rating: 3, feedback: 'You are being an incredible friend. When someone is in danger, the bravest thing you can do is get them help \u2014 even if they are not ready to ask for it themselves. A school counselor knows how to handle this safely and confidentially.' },
          { label: 'Tell your friend they should call a hotline and leave it up to them.', rating: 2, feedback: 'Sharing resources is kind. But your friend is scared and may not be able to take that step alone. Telling a trusted adult means a professional can step in to help. You do not need to carry this alone, and neither does your friend.' }
        ] },
      { id: 'ms8', title: 'The Hallway Harassment',
        setup: 'You witness a group of students surrounding a younger student in the hallway. They are making fun of them, blocking their way, and saying threatening things. The younger student looks terrified.',
        choices: [
          { label: 'Walk past \u2014 you do not want them to target you next.', rating: 1, feedback: 'Feeling scared for your own safety is completely understandable. But bystanders have more power than they think. Even if you do not confront the group directly, there are safe ways to help.' },
          { label: 'Get a teacher or staff member immediately. Later, check in on the targeted student privately.', rating: 3, feedback: 'Outstanding bystander action. Getting an adult is the safest and most effective response. Checking in on the targeted student shows compassion and lets them know they are not alone. You are making a real difference.' },
          { label: 'Record the incident on your phone.', rating: 2, feedback: 'Evidence can be important, but the priority should be getting immediate help. Find a trusted adult right away. Recording without also reporting can put the targeted student at further risk and may not stop the immediate harm.' }
        ] },
      { id: 'ms9', title: 'The Sextortion Attempt',
        setup: 'Someone you have been chatting with online says they have a private photo of you (or claims to). They threaten to share it with your entire school unless you send them money or more photos. You feel terrified.',
        choices: [
          { label: 'Send them what they want so they will leave you alone.', rating: 1, feedback: 'Giving in to threats NEVER makes them stop. People who do this almost always come back and demand more. This is a crime called sextortion, and it is NEVER your fault. You need and deserve adult help right now.' },
          { label: 'Do NOT respond to the threat. Screenshot everything as evidence. Tell a parent or trusted adult immediately. They can help you report this to the police or the CyberTipline (1-800-843-5678).', rating: 3, feedback: 'This is exactly right. Sextortion is a serious crime and trained professionals can help. You did nothing wrong, and you will NOT get in trouble for reporting. Many young people go through this \u2014 you are not alone, and there is help.' },
          { label: 'Block the person and try to forget about it.', rating: 2, feedback: 'Blocking is a good first step, but they may try to reach you through other accounts. Telling a trusted adult is critical because this is a crime. Law enforcement and organizations like the National Center for Missing & Exploited Children can help. You are NOT in trouble.' }
        ] },
      { id: 'ms10', title: 'The Risky Social Media Post',
        setup: 'A close friend posts their exact location, school name, and a photo in their school uniform on social media with the caption "Home alone all weekend!" You know this could be dangerous.',
        choices: [
          { label: 'Like the post and move on \u2014 it is their account.', rating: 1, feedback: 'While it is their account, a good friend looks out for each other. Sharing your location, school, and the fact that you are home alone puts a person at real risk. Friends help each other stay safe.' },
          { label: 'Send your friend a private message explaining why the post is risky, and suggest they take it down. If they do not, tell a trusted adult.', rating: 3, feedback: 'This is outstanding friendship. You approached it privately and respectfully, and you have a plan to involve an adult if needed. You are protecting your friend without embarrassing them.' },
          { label: 'Comment on the post telling them to take it down.', rating: 2, feedback: 'Your instinct to speak up is right. But commenting publicly could embarrass your friend and also draw more attention to the risky information. A private message is more effective and respectful.' }
        ] },
      { id: 'ms11', title: 'The Dating App Deception',
        setup: 'A friend shows you that they are using a dating app and have set their age to 18 even though they are only 14. They are talking to someone who thinks they are an adult. Your friend says it is just for fun.',
        choices: [
          { label: 'Think it is harmless \u2014 lots of people lie about their age online.', rating: 1, feedback: 'This is extremely dangerous. Adults on dating apps expect to interact with other adults. Your friend could attract attention from people with harmful intentions. Lying about age removes the protections that exist to keep young people safe.' },
          { label: 'Talk to your friend seriously about the dangers, and if they will not stop, tell a trusted adult. Your friend\u2019s safety is more important than them being upset with you.', rating: 3, feedback: 'This is exactly right. Real friendship means protecting someone even when it is hard. Adults on dating apps are strangers, and a 14-year-old pretending to be 18 is in real danger. A trusted adult can help handle this safely.' },
          { label: 'Tell your friend to be careful but do not push it.', rating: 2, feedback: 'It is good that you said something. But "be careful" is not enough when a young person is in active danger. If your friend continues, telling a trusted adult could prevent a very serious situation.' }
        ] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'safety_scholar',   icon: '\uD83D\uDCDA', name: 'Safety Scholar',     desc: 'Read all safety concepts in your grade band' },
    { id: 'boundary_builder', icon: '\uD83E\uDDF1', name: 'Boundary Builder',   desc: 'Complete the My Circle reflection' },
    { id: 'circle_trust',     icon: '\uD83D\uDC9A', name: 'Circle of Trust',    desc: 'Add 3 or more trusted adults to your circle' },
    { id: 'scenario_star',    icon: '\u2B50',        name: 'Scenario Star',      desc: 'Complete your first safety scenario' },
    { id: 'safe_online',      icon: '\uD83D\uDD12', name: 'Safe Online',        desc: 'Read online safety and digital safety topics' },
    { id: 'help_seeker',      icon: '\uD83D\uDCDE', name: 'Help Seeker',        desc: 'View the crisis resources' },
    { id: 'brave_voice',      icon: '\uD83E\uDDB8', name: 'Brave Voice',        desc: 'Complete 3 scenarios with the top rating' },
    { id: 'ally',             icon: '\uD83E\uDD1D', name: 'Ally',               desc: 'Complete bystander or advocacy scenarios' },
    { id: 'quick_thinker',    icon: '\u26A1',        name: 'Quick Thinker',      desc: 'Complete all scenarios in your grade band' },
    { id: 'safety_champion',  icon: '\uD83C\uDFC6', name: 'Safety Champion',    desc: 'Earn 7 or more badges' },
    { id: 'quiz_master',      icon: '\uD83E\uDDE0', name: 'Quiz Master',        desc: 'Score 8 or higher on the Safety Quiz' },
    { id: 'boundary_expert',  icon: '\uD83D\uDEE1\uFE0F', name: 'Boundary Expert',   desc: 'Read all boundary types in the lesson' },
    { id: 'safety_planner',   icon: '\uD83D\uDCCB', name: 'Safety Planner',     desc: 'Complete your personal Safety Plan' },
    { id: 'topics_explorer',  icon: '\uD83D\uDDFA\uFE0F', name: 'All Topics Explored', desc: 'Read every topic in Learn plus Boundary Types' },
    { id: 'flag_sorter',      icon: '\uD83D\uDEA9', name: 'Flag Sorter',        desc: 'Complete the Red Flag / Green Flag activity' },
    { id: 'digital_safety_pro', icon: '\uD83D\uDD10', name: 'Digital Safety Pro', desc: 'Read all 8 digital safety cards' },
    { id: 'assertiveness_master', icon: '\uD83D\uDCAA', name: 'Assertiveness Master', desc: 'Complete 6 assertiveness scenarios with the assertive response' },
    { id: 'emergency_ready',   icon: '\uD83D\uDE92', name: 'Emergency Ready',   desc: 'Complete all emergency preparedness topics' },
    { id: 'safety_educator',   icon: '\uD83C\uDF93', name: 'Safety Educator',   desc: 'Explore every tab in the Safety tool' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Safety Quiz Questions (grade-adaptive) ──
  // ══════════════════════════════════════════════════════════════
  var QUIZ_QUESTIONS = {
    elementary: [
      { q: 'Is it okay to say NO to an adult who makes you uncomfortable?', type: 'tf', answer: true, explain: 'You ALWAYS have the right to say NO to anyone \u2014 even adults \u2014 if something feels wrong. A safe adult will respect your no.' },
      { q: 'Should you keep a secret if it makes you feel scared?', type: 'tf', answer: false, explain: 'If a secret makes you feel scared, worried, or icky inside, it is an UNSAFE secret. You should always tell a trusted adult about unsafe secrets.' },
      { q: 'If something bad happens to you, is it your fault?', type: 'mc', choices: ['Yes', 'Sometimes', 'NEVER'], answer: 2, explain: 'It is NEVER your fault. No matter what happened, no matter what anyone says \u2014 you did not cause it. You deserve help and support.' },
      { q: 'Your body belongs to YOU and only you.', type: 'tf', answer: true, explain: 'That is right! You are the boss of your body. No one has the right to touch you in a way that makes you uncomfortable.' },
      { q: 'A trusted adult is someone who keeps you safe and believes you.', type: 'tf', answer: true, explain: 'Trusted adults listen to you, believe you, and work to keep you safe. Try to think of at least 3 trusted adults in your life!' },
      { q: 'If a friend tells you a secret that is dangerous, should you keep it?', type: 'tf', answer: false, explain: 'When someone is in danger, telling a trusted adult is NOT tattling \u2014 it is protecting them. Safety secrets should always be shared with a safe grown-up.' },
      { q: 'What is a "safe touch"?', type: 'mc', choices: ['Any touch from someone you know', 'A touch that feels caring and you said okay to', 'A touch from an adult'], answer: 1, explain: 'Safe touches feel caring and kind, and you have said it is okay. You always get to decide what touches are okay for YOUR body.' },
      { q: 'It is okay to share your address and phone number with people online.', type: 'tf', answer: false, explain: 'NEVER share personal information online. Not everyone online is who they say they are. Keep your address, phone number, school, and photos private.' },
      { q: 'If you tell a trusted adult about something bad, will you get in trouble?', type: 'mc', choices: ['Yes', 'Maybe', 'NO \u2014 you will NOT get in trouble'], answer: 2, explain: 'You will NOT get in trouble for telling the truth to a trusted adult. They are there to help and protect you.' },
      { q: 'Your feelings can be an alarm system that tells you something is not safe.', type: 'tf', answer: true, explain: 'When something feels icky, scary, or confusing, your brain is sending you an important signal. Always listen to those feelings and tell someone you trust.' }
    ],
    middle: [
      { q: 'Can consent be withdrawn at any time?', type: 'tf', answer: true, explain: 'Consent can ALWAYS be taken back. It does not matter if you said yes before \u2014 you can change your mind at any time, and that must be respected.' },
      { q: 'Is it okay for an adult to ask you to keep your relationship a secret?', type: 'mc', choices: ['Yes, if they are nice', 'It depends', 'No \u2014 that is a red flag'], answer: 2, explain: 'An adult asking you to keep a relationship secret is a major RED FLAG. Safe adults do not ask young people to hide their interactions from other adults.' },
      { q: 'What should you do if you see cyberbullying?', type: 'mc', choices: ['Ignore it \u2014 not your problem', 'Join in to fit in', 'Screenshot evidence and tell a trusted adult'], answer: 2, explain: 'Documenting evidence and telling a trusted adult is the most effective bystander action. You can also send a private supportive message to the person being targeted.' },
      { q: 'Setting boundaries with people you care about is rude.', type: 'tf', answer: false, explain: 'Setting boundaries is HEALTHY, not rude. People who truly care about you will respect your boundaries. It is one of the most important life skills you can develop.' },
      { q: 'Grooming always looks scary and obvious.', type: 'tf', answer: false, explain: 'Grooming often looks like special attention, gifts, and trust-building. That is what makes it dangerous \u2014 it is designed to feel good at first. Learning the warning signs helps you stay safe.' },
      { q: 'If someone pressures you by saying "If you loved me, you would..." what is that?', type: 'mc', choices: ['A sign of real love', 'Manipulation and a red flag', 'Just a disagreement'], answer: 1, explain: 'Using guilt or emotional pressure to cross your boundaries is manipulation. Real love means respecting someone\u2019s no without making them feel bad about it.' },
      { q: 'Everything you share online can be screenshotted and shared without your permission.', type: 'tf', answer: true, explain: 'Once something is sent digitally, you lose control of it. Screenshots are forever. If you would not want it on a billboard, do not send it.' },
      { q: 'Speaking up about something wrong is tattling.', type: 'tf', answer: false, explain: 'Speaking up about safety concerns is BRAVE, not tattling. Tattling is trying to get someone in trouble. Reporting is trying to keep someone safe. There is a big difference.' },
      { q: 'Silence counts as consent.', type: 'tf', answer: false, explain: 'Silence is NOT consent. Consent must be freely given, enthusiastic, informed, and clear. If someone does not say yes, or is unable to say yes, there is no consent.' },
      { q: 'If you are being harassed or threatened, who should you tell?', type: 'mc', choices: ['No one \u2014 handle it yourself', 'Only your best friend', 'A trusted adult who can help protect you'], answer: 2, explain: 'A trusted adult has the power and resources to help protect you. You do NOT need to handle threatening situations alone. Asking for help is the strongest thing you can do.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Boundary Types Lesson Data ──
  // ══════════════════════════════════════════════════════════════
  var BOUNDARY_TYPES = [
    { id: 'physical', icon: '\uD83E\uDDD1', title: 'Physical Boundaries',
      desc: 'Your body and personal space belong to you. You decide who can touch you, hug you, or stand close to you.',
      elementary_example: 'You do not have to hug or kiss anyone \u2014 even relatives \u2014 if you do not want to. A wave or high-five is always okay instead.',
      middle_example: 'You have the right to say "Please do not touch me" or "I need more personal space" \u2014 even with close friends or people you are dating.',
      practice: 'Practice saying: "I do not want a hug right now, but I would love a high-five!"' },
    { id: 'emotional', icon: '\u2764\uFE0F', title: 'Emotional Boundaries',
      desc: 'Your feelings are valid and important. You get to decide how much you share and with whom.',
      elementary_example: 'If someone says "You should not feel that way," remember: ALL your feelings are real and okay. No one gets to tell you how to feel.',
      middle_example: 'You do not owe anyone your emotional energy. It is okay to say "I am not ready to talk about that" or "I need some space right now."',
      practice: 'Practice saying: "I hear you, but I am not comfortable sharing that right now."' },
    { id: 'digital', icon: '\uD83D\uDCF1', title: 'Digital Boundaries',
      desc: 'Your online presence, passwords, and digital devices are yours. You control what you share and who can access your accounts.',
      elementary_example: 'Never share your passwords with friends. If someone asks for your login, say "That is private" \u2014 and tell a grown-up.',
      middle_example: 'You do not have to share your phone with anyone, give out your passwords, or accept follow requests. Your digital space is yours to protect.',
      practice: 'Practice saying: "My password is private. I do not share it with anyone except my parents."' },
    { id: 'time', icon: '\u23F0', title: 'Time Boundaries',
      desc: 'Your time and energy matter. It is okay to say "not right now" or to take breaks when you need them.',
      elementary_example: 'If a friend wants to play but you are tired, it is okay to say "Not right now. Can we play tomorrow?" True friends will understand.',
      middle_example: 'You do not have to respond to every text immediately or be available for everyone all the time. Taking time for yourself is not selfish \u2014 it is self-care.',
      practice: 'Practice saying: "I need some time to myself right now. I will talk to you later."' },
    { id: 'material', icon: '\uD83C\uDF92', title: 'Material Boundaries',
      desc: 'Your belongings are yours. You decide who can borrow, use, or touch your things.',
      elementary_example: 'If someone takes your toys or school supplies without asking, it is okay to say "Please ask me first." Your things are YOUR things.',
      middle_example: 'You are not obligated to lend money, share your belongings, or let someone use your phone. Saying no does not make you a bad friend.',
      practice: 'Practice saying: "I would rather not lend that out, but thank you for asking."' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Red Flag / Green Flag Activity Data ──
  // ══════════════════════════════════════════════════════════════
  var FLAG_ITEMS = {
    elementary: [
      { text: 'An adult asks you to sit on their lap when you do not want to.', flag: 'red', explain: 'You get to decide who touches you. If you do not want to sit on someone\u2019s lap, that is your choice. A safe adult will never pressure you.' },
      { text: 'Your teacher gives you a high-five for doing a great job.', flag: 'green', explain: 'A high-five is a safe, positive touch \u2014 especially when it is in a public place and you are comfortable with it.' },
      { text: 'Someone wants to take photos of you without your clothes.', flag: 'red', explain: 'NO ONE should ever take photos of you without clothes. This is NEVER okay. Tell a trusted adult immediately. This is NOT your fault.' },
      { text: 'Your friend shares their snack with you at lunch.', flag: 'green', explain: 'Sharing food with a friend is a kind and safe behavior. It shows they care about you!' },
      { text: 'A grown-up says "This is our little secret \u2014 do not tell your parents."', flag: 'red', explain: 'Safe adults do NOT ask kids to keep secrets from their parents. Unsafe secrets feel heavy and scary. Always tell a trusted adult.' },
      { text: 'Your school counselor talks to you in their office with the door open.', flag: 'green', explain: 'A counselor who keeps the door open and talks to you in a professional way is showing safe, appropriate behavior.' },
      { text: 'A neighbor offers you a ride home without your parents knowing.', flag: 'red', explain: 'You should never go anywhere with anyone unless your parent or guardian has told you it is okay. Always check with your trusted adult first.' },
      { text: 'Your friend invites you over and their parent calls your parent to arrange it.', flag: 'green', explain: 'When adults communicate with each other to plan things, that is a safe, healthy pattern. Everyone knows where you are.' }
    ],
    middle: [
      { text: 'A coach texts you late at night about things unrelated to the sport.', flag: 'red', explain: 'A coach contacting you privately at night about non-sport topics is a warning sign. Safe coaches communicate during appropriate hours and often include parents in messages.' },
      { text: 'A teacher keeps you after class with the door open to discuss your grade.', flag: 'green', explain: 'Keeping the door open and discussing school-related topics is appropriate, professional behavior from a teacher.' },
      { text: 'Someone says "This is our special secret \u2014 no one else would understand."', flag: 'red', explain: 'Creating secrecy and making you feel like no one else would understand is a classic grooming tactic. Safe relationships do NOT require secrecy.' },
      { text: 'A mentor meets with you in a public place and your parents know about it.', flag: 'green', explain: 'Meeting in public with parental knowledge shows transparency and respect for boundaries. This is healthy mentoring.' },
      { text: 'Someone your age pressures you to share private photos.', flag: 'red', explain: 'Pressuring someone to share private images is NEVER okay, regardless of age. This is a serious boundary violation. You have the right to say no.' },
      { text: 'A friend checks in on you when you seem upset and respects when you say "I am not ready to talk."', flag: 'green', explain: 'Checking in AND respecting your boundaries is a sign of a healthy, safe friendship. They care about you without pressuring you.' },
      { text: 'An adult gives you expensive gifts and asks you not to tell anyone.', flag: 'red', explain: 'Gift-giving combined with secrecy is a known grooming pattern. Safe adults do not create secret, exclusive relationships with young people.' },
      { text: 'Your school holds an assembly about digital safety with resources for everyone.', flag: 'green', explain: 'Schools providing safety education openly and for everyone is a positive, protective practice.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Digital Safety Deep Dive Cards ──
  // ══════════════════════════════════════════════════════════════
  var DIGITAL_SAFETY_CARDS = [
    { id: 'ds_passwords', icon: '\uD83D\uDD11', title: 'Password Safety',
      elementary: 'A strong password is like a really good lock on your diary. Use a mix of letters, numbers, and symbols. NEVER share your password with friends \u2014 only a parent or guardian.',
      middle: 'Strong passwords use 12+ characters with uppercase, lowercase, numbers, and symbols. Never reuse passwords across sites. Consider a passphrase like "PurpleTiger$Runs42Fast!" Common mistakes: using your birthday, pet\u2019s name, or "123456."',
      tip_elementary: 'Bad passwords: your name, 1234, "password." Good passwords: a silly sentence only YOU know!',
      tip_middle: 'Use a password manager. Enable two-factor authentication everywhere. Never share login credentials \u2014 not even with a partner.' },
    { id: 'ds_socialmedia', icon: '\uD83D\uDCF1', title: 'Social Media Safety',
      elementary: 'If you use social media or apps, make sure your account is set to private. Only add people you know in REAL life. Never post your school name, address, or phone number.',
      middle: 'Review your privacy settings on every platform. Set accounts to private. Disable location sharing on posts. Think before accepting follow requests from strangers. Your social media creates a permanent record.',
      tip_elementary: 'Ask a grown-up to help you check your privacy settings. If someone you do not know tries to follow you, do not accept!',
      tip_middle: 'Privacy settings checklist: profile set to private, location OFF on posts, limited personal info in bio, friend list hidden from public.' },
    { id: 'ds_thinkpost', icon: '\uD83E\uDD14', title: 'Think Before You Post',
      elementary: 'Before you post ANYTHING online, ask yourself: Would I be okay if my teacher, my parents, and my grandma all saw this? If the answer is no, do not post it!',
      middle: 'The THINK test: Is it True? Is it Helpful? Is it Inspiring? Is it Necessary? Is it Kind? If it does not pass, do not post. Screenshots live forever. College admissions officers and future employers search social media.',
      tip_elementary: 'Once something is posted, you cannot take it back \u2014 even if you delete it! Someone could have already saved it.',
      tip_middle: 'Before posting, imagine it on a billboard outside your school. Still okay? Post. Cringing? Do not post. Your digital reputation starts NOW.' },
    { id: 'ds_cyberbullying', icon: '\uD83D\uDEAB', title: 'Cyberbullying',
      elementary: 'Cyberbullying is when someone uses technology to be mean to you on purpose. It could be mean texts, embarrassing photos, or leaving you out online. It is NEVER your fault, and you should always tell a trusted adult.',
      middle: 'Cyberbullying includes harassing messages, sharing private information (doxxing), creating fake profiles, spreading rumors online, and deliberate exclusion. If you experience it: do NOT respond, screenshot everything, block the person, and report to a trusted adult.',
      tip_elementary: 'If someone is mean to you online: 1) Do not reply. 2) Tell a grown-up. 3) Save what they sent (take a screenshot). You are NOT in trouble!',
      tip_middle: 'How to report: most platforms have a report button. Talk to a school counselor. In serious cases (threats of violence), tell a parent and contact local authorities. You can also report at StopBullying.gov.' },
    { id: 'ds_predators', icon: '\u26A0\uFE0F', title: 'Online Predator Awareness',
      elementary: 'Some people online pretend to be kids but are actually adults with bad intentions. Warning signs: they ask lots of personal questions, want to be your "special" friend, ask you to keep your friendship secret, or want to meet you in person.',
      middle: 'Grooming tactics online include: building trust over time, giving excessive compliments, asking personal questions, gradually introducing inappropriate topics, requesting private chats or moving to different platforms, asking for photos, and creating secrecy. Anyone can be targeted \u2014 it is never the victim\u2019s fault.',
      tip_elementary: 'Remember: A real kid friend would NOT ask you to keep your friendship a secret from your parents. Tell a trusted adult if this happens!',
      tip_middle: 'Red flags: someone much older wanting to be your "best friend," asking you to move conversations to private apps, requesting photos, wanting to meet secretly, saying "you are mature for your age." Report to CyberTipline: 1-800-843-5678.' },
    { id: 'ds_footprint', icon: '\uD83D\uDC63', title: 'Your Digital Footprint',
      elementary: 'Everything you do online leaves a trail, like footprints in the sand \u2014 except these footprints NEVER go away. Every post, photo, search, and message becomes part of your digital footprint.',
      middle: 'Your digital footprint includes every post, comment, like, photo, search, purchase, and account you have ever created. Even "deleted" content may exist on servers or in screenshots. Future schools, employers, and scholarship committees may review your digital history.',
      tip_elementary: 'Before doing ANYTHING online, think: "Would I want this following me around forever?" Because it will!',
      tip_middle: 'Real examples: students have lost college admissions and scholarships over old social media posts. Job offers have been rescinded. What you post at 13 can affect you at 23. Build a digital footprint you are proud of.' },
    { id: 'ds_phishing', icon: '\uD83C\uDFA3', title: 'Scams and Phishing',
      elementary: 'Some emails and messages are tricks! They might say "You won a prize!" or "Click here right now!" Do NOT click on links from people you do not know. Ask a grown-up before clicking anything that seems too good to be true.',
      middle: 'Phishing attacks use fake emails, texts, or websites that look real to steal your personal information. Warning signs: urgency ("Act NOW!"), spelling errors, suspicious links, requests for passwords. Never click links in unexpected messages. Verify by going directly to the official website.',
      tip_elementary: 'If a message says you won something you did not enter, or asks you to click a link RIGHT NOW \u2014 it is a trick! Tell a grown-up.',
      tip_middle: 'Check the sender\u2019s actual email address (hover over it). Look for "https" and a lock icon on websites. When in doubt, do not click \u2014 go directly to the website by typing the address yourself.' },
    { id: 'ds_screentime', icon: '\u23F0', title: 'Healthy Screen Habits',
      elementary: 'Screens are fun, but your brain and body also need time to play outside, read books, and talk to people face-to-face! It is healthy to take breaks. If screens are making you feel sad, anxious, or tired, that is your body telling you to take a break.',
      middle: 'Research shows excessive screen time impacts sleep, mental health, and relationships. Set boundaries: no screens before bed (blue light disrupts sleep), take breaks every 30 minutes, be mindful of how social media makes you feel. Doomscrolling and constant comparison can increase anxiety and depression.',
      tip_elementary: 'Try the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds. Your eyes will thank you!',
      tip_middle: 'Track your screen time for a week. Notice how you feel after different types of screen use. Social media that makes you feel bad is not worth your time. Curate your feed to include positive, inspiring content.' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Assertiveness Training Scenarios ──
  // ══════════════════════════════════════════════════════════════
  var ASSERTIVENESS_SCENARIOS = {
    elementary: [
      { id: 'ae1', title: 'The Candy Theft',
        setup: 'A friend at school says, "Go take some candy from the teacher\u2019s desk when she is not looking. I dare you!" They start calling you a scaredy-cat.',
        responses: [
          { label: 'Okay, fine... I will do it.', style: 'passive', stars: 1, feedback: 'Giving in to pressure means someone else is making your decisions. You have the right to say no, even when it is hard. You are not a scaredy-cat \u2014 you are smart.' },
          { label: 'No, that is stealing. I am not doing that. If you want candy, ask the teacher.', style: 'assertive', stars: 3, feedback: 'That is assertive! You said no clearly, named why it was wrong, and even offered a better option. You stood your ground without being mean. That takes real courage.' },
          { label: 'You are so stupid for even asking me that! Get away from me!', style: 'aggressive', stars: 1, feedback: 'It is good that you said no, but calling someone stupid is aggressive. You can be firm without being mean. Try: "No, I am not doing that. That is stealing."' }
        ] },
      { id: 'ae2', title: 'The Mean Command',
        setup: 'An older kid at recess tells you, "Go push that first grader off the swing, or I will not let you play with us anymore."',
        responses: [
          { label: '(Push the smaller kid because you are scared of the older kid.)', style: 'passive', stars: 1, feedback: 'Being scared of an older kid is understandable. But hurting someone else because of pressure is not okay. A trusted adult can help you handle this safely.' },
          { label: 'No. Pushing someone is wrong, and I do not want to play if that is the rule. I will find other friends to play with.', style: 'assertive', stars: 3, feedback: 'Incredible! You said no, explained why, and made a plan. Walking away from people who pressure you to hurt others is one of the bravest things you can do.' },
          { label: 'Why do you not push them yourself, you big bully!', style: 'aggressive', stars: 1, feedback: 'Standing up to bullies is good, but challenging them aggressively can escalate the situation and put you in danger. Saying no and walking away \u2014 then telling an adult \u2014 is the safest choice.' }
        ] },
      { id: 'ae3', title: 'The Private Parts Question',
        setup: 'An older person asks you to show them your private parts. They say it is a "game" and that "everyone does it."',
        responses: [
          { label: '(Do it because they said everyone does it, even though it feels wrong.)', style: 'passive', stars: 1, feedback: 'When something feels wrong, that feeling is telling you something important. NO ONE has the right to see or touch your private parts. This is NEVER okay, and it is NEVER your fault.' },
          { label: 'NO! My body is MY body. I am going to tell my parent/trusted adult RIGHT NOW.', style: 'assertive', stars: 3, feedback: 'You are SO brave. Saying NO loudly and clearly, and immediately telling a trusted adult, is exactly the right thing to do. Remember: this is NOT a game, NOT normal, and NOT your fault. You will NOT get in trouble for telling.' },
          { label: '(Run away but do not tell anyone because you feel ashamed.)', style: 'passive', stars: 1, feedback: 'Running away is a good instinct \u2014 getting away is important. But please tell a trusted adult. You have NOTHING to be ashamed of. The person who asked you to do this is the one who did something wrong, not you.' }
        ] },
      { id: 'ae4', title: 'The Sharing Pressure',
        setup: 'A kid at school keeps asking to use your tablet and gets mad when you say no. They say, "You are so selfish! Real friends share everything!"',
        responses: [
          { label: '(Give them the tablet even though you do not want to.)', style: 'passive', stars: 1, feedback: 'Your things belong to you. Giving in because someone calls you selfish lets them control you with guilt. You are not selfish for having boundaries about your belongings.' },
          { label: 'My tablet is mine, and I get to decide who uses it. Saying no does not make me selfish \u2014 it means I am taking care of my stuff.', style: 'assertive', stars: 3, feedback: 'Perfect! You named your boundary, stood firm, and corrected the guilt trip. Real friends respect when you say no. Your things are yours to protect.' },
          { label: 'Fine! Take it! I do not even care anymore!', style: 'aggressive', stars: 1, feedback: 'Giving in angrily is still giving in. You end up losing your boundary AND feeling upset. A calm, clear "no" is more powerful than giving in with frustration.' }
        ] },
      { id: 'ae5', title: 'The Unwanted Hug',
        setup: 'A family friend visits and says, "Come give me a big hug!" but you do not feel like hugging them. Your parent looks at you expectantly.',
        responses: [
          { label: '(Hug them even though you do not want to, because you do not want to be rude.)', style: 'passive', stars: 1, feedback: 'It is nice to be polite, but your body belongs to you. You never have to give physical affection when you do not want to \u2014 even to family or family friends.' },
          { label: 'I do not feel like a hug right now, but I would love to give you a high-five or a wave!', style: 'assertive', stars: 3, feedback: 'Wonderful! You respected your own boundary while still being kind and offering an alternative. This is a great example of being assertive without being rude.' },
          { label: 'Ew! No way! Do not touch me!', style: 'aggressive', stars: 1, feedback: 'It is okay to not want a hug, but you can say no without being hurtful. Try offering a high-five or wave instead. You can protect your boundaries AND be respectful.' }
        ] },
      { id: 'ae6', title: 'The Scary Video',
        setup: 'Your friends want to watch a scary video at a sleepover. You know it will give you nightmares, but they are all excited about it.',
        responses: [
          { label: '(Watch it even though you know you will be scared, because you do not want to be left out.)', style: 'passive', stars: 1, feedback: 'Watching something that upsets you just to fit in is not worth the nightmares and anxiety. Good friends will find something everyone can enjoy.' },
          { label: 'Scary movies are not really my thing. Can we pick something we all enjoy? Or I can do something else while you watch.', style: 'assertive', stars: 3, feedback: 'Great job! You were honest about your feelings and offered alternatives. There is nothing wrong with not liking scary content. Standing up for your comfort is always okay.' },
          { label: 'That movie is so dumb! Only babies watch that!', style: 'aggressive', stars: 1, feedback: 'Putting down what others enjoy is not the same as standing up for yourself. It is better to simply say what you prefer without insulting their choice.' }
        ] },
      { id: 'ae7', title: 'The Homework Cheating',
        setup: 'A classmate says, "Just let me copy your homework. It will only take a second. No one will know!" They seem desperate.',
        responses: [
          { label: '(Let them copy because you feel bad for them.)', style: 'passive', stars: 1, feedback: 'It is kind to want to help, but letting someone copy your work is not really helping them learn. It also puts you at risk of getting in trouble for cheating.' },
          { label: 'I worked hard on this and I cannot let you copy it. But I can help you understand it so you can do it yourself!', style: 'assertive', stars: 3, feedback: 'This is such a mature response. You protected your work, set a clear boundary, and offered genuine help. That is being a real friend.' },
          { label: 'No way! Do your own work, you lazy cheater!', style: 'aggressive', stars: 1, feedback: 'Saying no to cheating is right, but calling someone lazy or a cheater is hurtful. A firm but kind refusal is more effective and keeps the friendship intact.' }
        ] },
      { id: 'ae8', title: 'The Peer Exclusion',
        setup: 'A group of friends says, "You cannot sit with us unless you stop being friends with [another kid\u2019s name]. You have to choose."',
        responses: [
          { label: '(Drop the other friend to keep this group happy.)', style: 'passive', stars: 1, feedback: 'Friends who make you drop other friends are being controlling. Real friendship does not come with conditions like this. You deserve friends who accept all of you.' },
          { label: 'I get to choose my own friends, and I am not going to stop being friends with someone just because you say so. That is not how friendship works.', style: 'assertive', stars: 3, feedback: 'That is incredibly brave! You stood up for yourself and your other friend. People who give ultimatums about friendships are showing you a red flag about how they treat people.' },
          { label: 'Fine! You are all terrible anyway! I do not need any of you!', style: 'aggressive', stars: 1, feedback: 'It makes sense to be hurt and angry. But lashing out burns bridges. A calm, firm statement about your right to choose your friends is more powerful than angry words.' }
        ] }
    ],
    middle: [
      { id: 'am1', title: 'The Photo Pressure',
        setup: 'A friend pressures you to send a private photo of yourself. They say, "Come on, everyone does it. Do not you trust me? I would never share it."',
        responses: [
          { label: '(Send the photo because you do not want them to think you do not trust them.)', style: 'passive', stars: 1, feedback: 'Trust is shown through respect, not through pressuring someone to do something uncomfortable. Once a photo is sent, you lose ALL control over it. This is a red flag, not a trust test.' },
          { label: 'I do trust you, but I am not comfortable sending photos like that. If you respect me, you will understand my decision. This is a boundary I will not change.', style: 'assertive', stars: 3, feedback: 'That is a powerful, assertive response. You acknowledged the relationship while making your boundary crystal clear. Someone who truly respects you will accept your no without guilt-tripping.' },
          { label: 'You are disgusting for even asking! I am telling everyone what kind of person you are!', style: 'aggressive', stars: 1, feedback: 'Your anger is valid \u2014 being pressured like this is wrong. But threatening to publicly expose them could escalate the situation. A clear no and talking to a trusted adult is the safest approach.' }
        ] },
      { id: 'am2', title: 'The Substance Offer',
        setup: 'At a party, someone offers you a vape or a drink. They say, "Just try it once. It is not a big deal. Everyone here is doing it."',
        responses: [
          { label: '(Take it because you do not want to be the only one not doing it.)', style: 'passive', stars: 1, feedback: 'Doing something risky just because "everyone is doing it" puts your health and safety in someone else\u2019s hands. You always have the right to make your own choices about your body.' },
          { label: 'No thanks, I am good. I do not need to try it to have a good time. (Change the subject or find something else to do.)', style: 'assertive', stars: 3, feedback: 'Confident and clear! You said no without being preachy, and you moved on. Most people will respect a casual, firm refusal more than you think. You do not owe anyone an explanation.' },
          { label: 'That stuff is so stupid! Anyone who does that is an idiot!', style: 'aggressive', stars: 1, feedback: 'While choosing not to use substances is smart, insulting people who do will not help the situation and may cause conflict. A simple, confident "no thanks" is all you need.' }
        ] },
      { id: 'am3', title: 'The Boundary Pusher',
        setup: 'Someone you are dating keeps pushing past your physical boundaries. When you say you are not comfortable, they say, "If you really cared about me, you would want to do this."',
        responses: [
          { label: '(Go along with it because you do not want to lose the relationship.)', style: 'passive', stars: 1, feedback: 'A relationship where you have to ignore your own comfort to keep someone happy is NOT healthy. Love never requires you to cross your own boundaries. This is manipulation.' },
          { label: 'I DO care about you, but caring about someone does not mean ignoring my own boundaries. If you care about ME, you will respect my no. This is not negotiable.', style: 'assertive', stars: 3, feedback: 'That is a strong, clear boundary. You called out the manipulation while standing firm. Remember: someone who respects you will NEVER pressure you past your limits. If they keep pushing, that is a sign to reconsider the relationship.' },
          { label: 'You are so selfish! All you care about is yourself! We are done!', style: 'aggressive', stars: 1, feedback: 'Your frustration is completely valid. But ending a relationship in anger can be complicated. A calm, firm boundary \u2014 and talking to a trusted adult if the pressure continues \u2014 is the healthiest path.' }
        ] },
      { id: 'am4', title: 'The Group Chat Pressure',
        setup: 'A group chat you are in starts sharing mean rumors about a classmate. People are tagging you and saying, "Add something! It is just jokes." You know it is hurtful.',
        responses: [
          { label: '(Stay silent and hope no one notices you did not participate.)', style: 'passive', stars: 1, feedback: 'Silence in the face of bullying can feel like agreement to the person being targeted. While it is better than participating, speaking up or leaving the chat sends a stronger message.' },
          { label: 'I am not participating in this. Making fun of someone behind their back is not funny \u2014 it is bullying. I am leaving this chat. (Screenshot evidence and report to a trusted adult.)', style: 'assertive', stars: 3, feedback: 'Outstanding! You named the behavior, refused to participate, documented evidence, and reported it. That is assertive bystander action. Your courage could change the group\u2019s behavior and protect the person being targeted.' },
          { label: 'You are all horrible people! I am screenshotting this and sending it to everyone!', style: 'aggressive', stars: 1, feedback: 'Your instinct to stand up for the targeted person is admirable. But threatening to spread the screenshots could make things worse. Report to a trusted adult who can handle it properly.' }
        ] },
      { id: 'am5', title: 'The Ride Home',
        setup: 'You are at a friend\u2019s house and realize the person who is supposed to drive you home has been drinking. They insist they are "totally fine to drive."',
        responses: [
          { label: '(Get in the car because you do not want to make a scene or bother your parents.)', style: 'passive', stars: 1, feedback: 'Getting into a car with an impaired driver puts your life at serious risk. No amount of awkwardness is worth your safety. There is ALWAYS another option.' },
          { label: 'I am not comfortable riding with someone who has been drinking. I am going to call my parent/trusted adult for a ride. (Use your code word if needed.)', style: 'assertive', stars: 3, feedback: 'This could literally save your life. Calling for a ride is always the right choice. Many families have a "no questions asked" policy for situations like this. Your safety ALWAYS comes first.' },
          { label: 'You are drunk! I am calling the police on you right now!', style: 'aggressive', stars: 1, feedback: 'Your concern is right, and impaired driving is dangerous and illegal. But the priority is getting yourself to safety first. Call your parent or trusted adult for a ride, and let the adults handle the impaired driver.' }
        ] },
      { id: 'am6', title: 'The Identity Disclosure',
        setup: 'A classmate finds out something personal about you (your religion, sexuality, family situation, etc.) and threatens to "out" you to the whole school unless you do what they say.',
        responses: [
          { label: '(Do what they say to keep your secret safe.)', style: 'passive', stars: 1, feedback: 'Giving in to blackmail never makes it stop \u2014 the demands will only grow. Your personal information is yours to share when and how YOU choose. What this person is doing is wrong.' },
          { label: 'What you are doing is blackmail, and it is wrong. I am going to talk to a school counselor about this. My personal life is mine to share on my own terms.', style: 'assertive', stars: 3, feedback: 'Naming the behavior and involving a trusted adult is exactly right. No one has the right to weaponize your personal information. A school counselor can help protect you and address the blackmail.' },
          { label: 'If you tell anyone, I will make your life miserable! You will regret this!', style: 'aggressive', stars: 1, feedback: 'Counter-threats can escalate the situation and put you at more risk. The strongest move is to take away their power by involving a trusted adult who can help protect you.' }
        ] },
      { id: 'am7', title: 'The Social Media Dare',
        setup: 'A social media challenge is going around that involves doing something physically dangerous. Your friends are all posting videos and pressuring you to join. "You will be the only one who did not do it!"',
        responses: [
          { label: '(Do the challenge because the fear of being left out is worse than the risk.)', style: 'passive', stars: 1, feedback: 'Social media challenges have caused serious injuries and even deaths. The temporary feeling of fitting in is NEVER worth risking your safety or your life.' },
          { label: 'I do not need to do something dangerous to prove I am cool. I am sitting this one out. My safety matters more than views or likes.', style: 'assertive', stars: 3, feedback: 'That is real confidence. Knowing that your worth is not measured in likes or viral videos is incredibly mature. Real friends will respect your decision.' },
          { label: 'That challenge is so dumb! Anyone who does it deserves to get hurt!', style: 'aggressive', stars: 1, feedback: 'No one deserves to get hurt, even if they make risky choices. A better approach is to calmly explain your decision and maybe even share information about why the challenge is dangerous.' }
        ] },
      { id: 'am8', title: 'The Unwanted Advance',
        setup: 'At a school event, someone keeps touching your arm, standing too close, and making flirty comments even though you have shown you are not interested. They say, "I am just being friendly!"',
        responses: [
          { label: '(Put up with it because you do not want to cause a scene at the event.)', style: 'passive', stars: 1, feedback: 'Your comfort matters more than avoiding awkwardness. Unwanted physical contact does not become okay just because someone calls it "friendly." You have the right to set boundaries anywhere.' },
          { label: 'I have noticed you touching me and standing really close. I am not comfortable with that. Please stop. (Move away, and if it continues, tell an adult or event supervisor.)', style: 'assertive', stars: 3, feedback: 'You named the specific behavior, stated your boundary clearly, and had a plan for escalation. That is textbook assertiveness. You do not have to accept unwanted contact from anyone, ever.' },
          { label: 'Get your hands OFF me! What is WRONG with you?!', style: 'aggressive', stars: 1, feedback: 'Your anger is justified \u2014 unwanted touching is not okay. But shouting can escalate the situation. A firm, direct statement followed by creating distance and telling an adult is safer and more effective.' }
        ] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Emergency Preparedness Topics ──
  // ══════════════════════════════════════════════════════════════
  var EMERGENCY_TOPICS = [
    { id: 'em_address', icon: '\uD83C\uDFE0', title: 'Know Your Information',
      elementary: 'It is really important to know your home address and phone number by heart! Practice saying them out loud until you can remember them without help. This way, if you ever need help, you can tell a grown-up where you live.',
      middle: 'Memorize your full home address, parent/guardian phone numbers, and at least one other emergency contact. In a crisis, your phone might be dead or unavailable. Having this information memorized could be critical.',
      practice: 'Practice right now: Can you say your address and a parent\u2019s phone number without looking? If not, practice until you can!' },
    { id: 'em_911', icon: '\uD83D\uDCDE', title: 'How to Call 911',
      elementary: 'When to call 911: When someone is badly hurt, when there is a fire, when someone is in danger, or when you see a crime happening. When you call: stay calm, tell them your name, say what is happening, and tell them your address. Stay on the line \u2014 do NOT hang up!',
      middle: 'Call 911 for life-threatening emergencies: medical emergencies, fires, crimes in progress, someone in immediate danger. What to say: your location (address or landmarks), what happened, how many people are involved, if anyone is injured. Stay on the line. Follow the dispatcher\u2019s instructions. You will NOT get in trouble for calling in a real emergency.',
      practice: 'Practice what you would say: "My name is ___. I am at ___. Someone needs help because ___. Please send help."' },
    { id: 'em_fire', icon: '\uD83D\uDD25', title: 'Fire Safety',
      elementary: 'If your clothes catch fire: STOP, DROP, and ROLL! If there is a fire in your building: GET LOW (crawl under smoke), GET OUT (use your escape route), STAY OUT (never go back inside). Feel doors before opening them \u2014 if a door is hot, do NOT open it!',
      middle: 'Have a fire escape plan with TWO ways out of every room. Practice it with your family. If you smell smoke or hear a fire alarm: do not stop to grab anything. Crawl low under smoke. Feel doors with the back of your hand before opening. Meet at your designated meeting spot outside. Call 911 from outside.',
      practice: 'Do you know two ways out of your bedroom? Do you have a family meeting spot outside your home? If not, make a plan today!' },
    { id: 'em_lockdown', icon: '\uD83D\uDD12', title: 'Lockdown Safety',
      elementary: 'If your school goes into lockdown, listen carefully to your teacher. Move quickly and quietly to the safe area your teacher shows you. Stay silent, stay hidden, and stay calm. Your teacher is trained to keep you safe.',
      middle: 'In a lockdown: follow your school\u2019s protocol. Typically: move away from doors and windows, silence your phone, stay quiet, do not open the door for anyone (authorities will identify themselves and have keys). If you are in a hallway, go to the nearest room. Know your school\u2019s emergency procedures. In an active threat situation, remember: Run (if safe), Hide (if you cannot run), as a last resort, act to protect yourself.',
      practice: 'Do you know your school\u2019s lockdown procedure? Where is the safe spot in your classroom? Knowing this ahead of time helps you act quickly.' },
    { id: 'em_weather', icon: '\u26C8\uFE0F', title: 'Severe Weather Safety',
      elementary: 'Tornado: Go to the lowest level of your building, away from windows. Get under something sturdy and cover your head. Earthquake: DROP to the ground, take COVER under a desk or table, and HOLD ON until the shaking stops.',
      middle: 'Tornado: go to an interior room on the lowest floor, away from windows. Protect your head. Earthquake: Drop, Cover, Hold On. Do NOT run outside during shaking. After shaking stops, check for injuries and damage. Hurricane: follow evacuation orders. Flood: NEVER walk or drive through flood water. Know your area\u2019s most common severe weather threats.',
      practice: 'What type of severe weather is most common where you live? Do you know where to go in your home during that kind of emergency?' },
    { id: 'em_firstaid', icon: '\u2764\uFE0F\u200D\uD83E\uDE79', title: 'Basic First Aid',
      elementary: 'If someone is hurt: 1) Stay calm. 2) Get a grown-up right away. 3) If there is bleeding, press a clean cloth on the wound firmly. 4) Stay with the person until help comes. You do not need to fix everything \u2014 getting help IS helping.',
      middle: 'Basic first aid everyone should know: For bleeding, apply direct pressure with a clean cloth. For burns, run cool (not cold) water over the area. For choking, learn the Heimlich maneuver. For someone who is unconscious, check for breathing and call 911 immediately. Consider taking a first aid or CPR course through the Red Cross.',
      practice: 'Do you know where the first aid kit is at home? At school? Knowing where supplies are BEFORE an emergency saves critical time.' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('safety', {
    icon: '\uD83D\uDEE1\uFE0F',
    label: 'Safety & Boundaries',
    desc: 'Learn about body safety, trusted adults, consent, digital safety, and how to get help when you need it.',
    color: 'red',
    category: 'responsible-decision-making',
    render: function(ctx) {
      return (function() {
        var React = ctx.React;
        var h = React.createElement;
        var Sparkles = ctx.icons && ctx.icons.Sparkles;
        var addToast = ctx.addToast;
        var awardXP = ctx.awardXP;
        var announceToSR = ctx.announceToSR;
        var a11yClick = ctx.a11yClick;
        var celebrate = ctx.celebrate;
        var callGemini = ctx.callGemini;
        var callTTS = ctx.callTTS;
        var band = ctx.gradeBand || 'elementary';
        if (band === 'high') band = 'middle'; // K-8 tool: map high school to middle

        // ── Tool-scoped state ──
        var d = (ctx.toolData && ctx.toolData.safety) || {};
        var upd = function(key, val) {
          if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('safety', key); }
          else { if (ctx.update) ctx.update('safety', key, val); }
        };

        // Navigation
        var activeTab     = d.activeTab || 'learn';
        var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

        // Learn tab state
        var viewedTopics  = d.viewedTopics || {};
        var expandedTopic = d.expandedTopic || null;

        // My Circle tab state
        var trustedAdults  = d.trustedAdults || [];
        var newAdultName   = d.newAdultName || '';
        var newAdultRole   = d.newAdultRole || '';
        var newAdultCat    = d.newAdultCat || 'family';
        var circleReflect  = d.circleReflect || '';
        var circleSaved    = d.circleSaved || false;
        var crisisViewed   = d.crisisViewed || false;

        // Scenarios tab state
        var scenIdx        = d.scenIdx || 0;
        var scenChoice     = d.scenChoice != null ? d.scenChoice : null;
        var scenCompleted  = d.scenCompleted || {};
        var scenTopRatings = d.scenTopRatings || 0;

        // Badges
        var earnedBadges    = d.earnedBadges || {};
        var showBadgePopup  = d.showBadgePopup || null;
        var showBadgesPanel = d.showBadgesPanel || false;

        // Quiz tab state
        var quizIdx         = d.quizIdx != null ? d.quizIdx : 0;
        var quizAnswer      = d.quizAnswer != null ? d.quizAnswer : null;
        var quizAnswered    = d.quizAnswered || {};
        var quizScore       = d.quizScore || 0;
        var quizBest        = d.quizBest || 0;
        var quizDone        = d.quizDone || false;

        // Boundary types state
        var viewedBoundaryTypes = d.viewedBoundaryTypes || {};
        var expandedBoundary    = d.expandedBoundary || null;

        // Safety plan state
        var safetyPlanStep1  = d.safetyPlanStep1 || '';
        var safetyPlanStep2  = d.safetyPlanStep2 || '';
        var safetyPlanStep3  = d.safetyPlanStep3 || '';
        var safetyPlanPlace  = d.safetyPlanPlace || '';
        var safetyPlanCode   = d.safetyPlanCode || '';
        var safetyPlanNums   = d.safetyPlanNums || '';
        var safetyPlanSaved  = d.safetyPlanSaved || false;

        // Red/Green flag state
        var flagIdx          = d.flagIdx != null ? d.flagIdx : 0;
        var flagChoice       = d.flagChoice || null;
        var flagAnswered     = d.flagAnswered || {};
        var flagCorrect      = d.flagCorrect || 0;
        var flagDone         = d.flagDone || false;

        // Digital safety deep dive state
        var dsViewed         = d.dsViewed || {};
        var dsExpanded       = d.dsExpanded || null;
        var dsKnewCount      = d.dsKnewCount || 0;
        var dsLearnedCount   = d.dsLearnedCount || 0;
        var dsTracked        = d.dsTracked || {};

        // Assertiveness training state
        var assertIdx        = d.assertIdx != null ? d.assertIdx : 0;
        var assertChoice     = d.assertChoice != null ? d.assertChoice : null;
        var assertCompleted  = d.assertCompleted || {};
        var assertTopCount   = d.assertTopCount || 0;

        // Emergency preparedness state
        var emViewed         = d.emViewed || {};
        var emExpanded       = d.emExpanded || null;

        // Tab visits tracking for Safety Educator badge
        var tabsVisited      = d.tabsVisited || {};

        // ── Helpers ──
        var ACCENT = '#ef4444';
        var ACCENT_DIM = '#ef444422';
        var ACCENT_MED = '#ef444444';

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
          // Check safety champion (7+ badges)
          if (badgeId !== 'safety_champion') {
            var count = Object.keys(newBadges).length;
            if (count >= 7 && !newBadges.safety_champion) {
              setTimeout(function() { tryAwardBadge('safety_champion'); }, 3200);
            }
          }
        }

        function speak(text) {
          if (callTTS) callTTS(text);
        }

        // ══════════════════════════════════════════════════════════
        // ── Tab Bar ──
        // ══════════════════════════════════════════════════════════
        var tabs = [
          { id: 'learn',     label: '\uD83D\uDCDA Learn' },
          { id: 'digital',   label: '\uD83D\uDD10 Digital' },
          { id: 'circle',    label: '\uD83D\uDC9A My Circle' },
          { id: 'scenarios', label: '\uD83C\uDFAD Scenarios' },
          { id: 'assertive', label: '\uD83D\uDCAA Assertive' },
          { id: 'quiz',      label: '\uD83E\uDDE0 Quiz' },
          { id: 'flags',     label: '\uD83D\uDEA9 Flags' },
          { id: 'emergency', label: '\uD83D\uDE92 Emergency' },
          { id: 'plan',      label: '\uD83D\uDCCB Plan' },
          { id: 'badges',    label: '\uD83C\uDFC5 Badges' }
        ];

        var tabBar = h('div', {
          role: 'tablist', 'aria-label': 'Safety & Wellbeing tabs',
          style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
        },
          tabs.map(function(t) {
            var isActive = activeTab === t.id;
            return h('button', { 'aria-label': 'Toggle sound',
              key: t.id,
              onClick: function() {
                upd('activeTab', t.id);
                if (soundEnabled) sfxClick();
                // Track tab visits for Safety Educator badge
                if (!tabsVisited[t.id]) {
                  var newVisited = Object.assign({}, tabsVisited);
                  newVisited[t.id] = true;
                  upd('tabsVisited', newVisited);
                  // All 10 tabs visited?
                  if (Object.keys(newVisited).length >= 10) tryAwardBadge('safety_educator');
                }
              },
              'aria-selected': isActive,
              role: 'tab',
              style: {
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
                background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : '#94a3b8',
                transition: 'all 0.15s'
              }
            }, t.label);
          }),
          // Sound toggle
          h('button', { 'aria-label': popBadge.icon,
            onClick: function() { upd('soundEnabled', !soundEnabled); },
            style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#9ca3af' },
            title: soundEnabled ? 'Mute sounds' : 'Enable sounds'
          }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        );

        // ── Badge Popup ──
        var badgePopup = null;
        if (showBadgePopup) {
          var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
          if (popBadge) {
            badgePopup = h('div', {
              style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)' },
              onKeyDown: function(e) { if (e.key === 'Escape') e.currentTarget.click(); }, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Badge details', tabIndex: -1, onClick: function() { upd('showBadgePopup', null); }
            },
              h('div', {
                style: { background: '#1e293b', border: '2px solid ' + ACCENT, borderRadius: 20, padding: '32px 40px', textAlign: 'center', animation: 'fadeIn 0.3s', maxWidth: 300 }
              },
                h('div', { style: { fontSize: 56, marginBottom: 10 } }, popBadge.icon),
                h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 } }, popBadge.name),
                h('div', { style: { fontSize: 12, color: '#cbd5e1' } }, popBadge.desc)
              )
            );
          }
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Learn ──
        // ══════════════════════════════════════════════════════════
        var learnContent = null;
        if (activeTab === 'learn') {
          var topics = LEARN_TOPICS[band] || LEARN_TOPICS.elementary;

          var crisisBanner = h('div', {
            style: { margin: '12px 16px', padding: '14px 16px', borderRadius: 12, background: '#7f1d1d', border: '1px solid #dc2626' }
          },
            h('div', { style: { fontWeight: 700, color: '#fca5a5', fontSize: 13, marginBottom: 6 } }, '\uD83D\uDCDE If you need help RIGHT NOW:'),
            CRISIS_RESOURCES.map(function(cr, i) {
              return h('div', { key: i, style: { padding: '4px 0', fontSize: 12, color: '#fde2e2' } },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),
                h('span', { style: { fontWeight: 600 } }, cr.icon + ' ' + cr.name + ': '),
                h('span', null, cr.contact)
              );
            }),
            h('div', { style: { marginTop: 8, fontSize: 11, color: '#fca5a5', fontStyle: 'italic' } }, 'You can ALWAYS tell a trusted adult. You will NOT get in trouble.')
          );

          var topicCards = topics.map(function(topic) {
            var isExpanded = expandedTopic === topic.id;
            var isViewed = !!viewedTopics[topic.id];
            return h('div', {
              key: topic.id,
              onClick: function() {
                upd('expandedTopic', isExpanded ? null : topic.id);
                if (!isViewed) {
                  var newViewed = Object.assign({}, viewedTopics);
                  newViewed[topic.id] = true;
                  upd('viewedTopics', newViewed);
                  if (soundEnabled) sfxReveal();
                  // Check safety scholar badge
                  var viewedCount = Object.keys(newViewed).length;
                  if (viewedCount >= topics.length) tryAwardBadge('safety_scholar');
                  // Check safe online badge
                  if (band === 'elementary' && (topic.id === 'online_safety' || newViewed.online_safety)) tryAwardBadge('safe_online');
                  if (band === 'middle' && (topic.id === 'digital_safety' || newViewed.digital_safety)) tryAwardBadge('safe_online');
                }
              },
              style: {
                margin: '0 16px 10px', padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                background: isExpanded ? '#1e293b' : '#0f172a', border: '1px solid ' + (isExpanded ? ACCENT_MED : '#1e293b'),
                transition: 'all 0.2s'
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { style: { fontSize: 24 } }, topic.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 14 } }, topic.title),
                  !isExpanded && h('div', { style: { fontSize: 11, color: '#9ca3af', marginTop: 2 } }, isViewed ? '\u2705 Read' : 'Tap to learn')
                )
              ),
              isExpanded && h('div', { style: { marginTop: 12 } },
                h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 10px' } }, topic.desc),
                h('div', { style: { padding: '10px 12px', borderRadius: 8, background: ACCENT_DIM, border: '1px solid ' + ACCENT_MED } },
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: ACCENT, marginBottom: 4 } }, '\uD83D\uDCA1 ' + topic.tip)
                ),
                callTTS && h('button', { 'aria-label': 'Read aloud',
                  onClick: function(e) { e.stopPropagation(); speak(topic.title + '. ' + topic.desc + '. ' + topic.tip); },
                  style: { marginTop: 8, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }
                }, '\uD83D\uDD0A Read aloud')
              )
            );
          });

          // ── Boundary Types Lesson Section ──
          var boundarySection = h('div', { style: { margin: '16px 0 0' } },
            h('div', { style: { padding: '0 16px 10px' } },
              h('div', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 4 } }, '\uD83D\uDEE1\uFE0F Types of Boundaries'),
              h('div', { style: { fontSize: 12, color: '#cbd5e1' } },
                band === 'elementary'
                  ? 'Boundaries are like invisible fences that help keep you safe and comfortable. There are different kinds!'
                  : 'Understanding different types of boundaries helps you protect yourself in all areas of your life.'
              )
            ),
            BOUNDARY_TYPES.map(function(bt) {
              var isExpanded = expandedBoundary === bt.id;
              var isViewed = !!viewedBoundaryTypes[bt.id];
              return h('div', {
                key: bt.id,
                onClick: function() {
                  upd('expandedBoundary', isExpanded ? null : bt.id);
                  if (!isViewed) {
                    var newViewed = Object.assign({}, viewedBoundaryTypes);
                    newViewed[bt.id] = true;
                    upd('viewedBoundaryTypes', newViewed);
                    if (soundEnabled) sfxReveal();
                    // Check boundary expert badge
                    if (Object.keys(newViewed).length >= BOUNDARY_TYPES.length) {
                      tryAwardBadge('boundary_expert');
                      // Check topics explorer: all learn topics + all boundary types
                      var allLearnViewed = Object.keys(viewedTopics).length >= topics.length;
                      if (allLearnViewed) tryAwardBadge('topics_explorer');
                    }
                  }
                },
                style: {
                  margin: '0 16px 10px', padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                  background: isExpanded ? '#1e293b' : '#0f172a', border: '1px solid ' + (isExpanded ? '#6366f155' : '#1e293b'),
                  transition: 'all 0.2s'
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                  h('span', { style: { fontSize: 24 } }, bt.icon),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 14 } }, bt.title),
                    !isExpanded && h('div', { style: { fontSize: 11, color: '#9ca3af', marginTop: 2 } }, isViewed ? '\u2705 Read' : 'Tap to learn')
                  )
                ),
                isExpanded && h('div', { style: { marginTop: 12 } },
                  h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 10px' } }, bt.desc),
                  h('div', { style: { padding: '10px 12px', borderRadius: 8, background: '#6366f115', border: '1px solid #6366f133', marginBottom: 8 } },
                    h('div', { style: { fontSize: 11, fontWeight: 600, color: '#818cf8', marginBottom: 4 } }, '\uD83D\uDCA1 Example:'),
                    h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: '1.5' } }, band === 'elementary' ? bt.elementary_example : bt.middle_example)
                  ),
                  h('div', { style: { padding: '10px 12px', borderRadius: 8, background: '#22c55e15', border: '1px solid #22c55e33' } },
                    h('div', { style: { fontSize: 11, fontWeight: 600, color: '#4ade80', marginBottom: 4 } }, '\uD83D\uDDE3\uFE0F ' + bt.practice)
                  ),
                  callTTS && h('button', { 'aria-label': 'Read aloud',
                    onClick: function(e) { e.stopPropagation(); speak(bt.title + '. ' + bt.desc + '. ' + (band === 'elementary' ? bt.elementary_example : bt.middle_example) + '. ' + bt.practice); },
                    style: { marginTop: 8, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }
                  }, '\uD83D\uDD0A Read aloud')
                )
              );
            })
          );

          learnContent = h('div', { style: { padding: '8px 0 16px' } },
            h('div', { style: { padding: '0 16px 8px', fontSize: 13, color: '#cbd5e1' } },
              band === 'elementary'
                ? 'These are important things every kid should know. Tap each card to learn more.'
                : 'Explore these key safety and boundary concepts. Tap each card for details.'
            ),
            crisisBanner,
            topicCards,
            boundarySection
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Digital Safety Deep Dive ──
        // ══════════════════════════════════════════════════════════
        var digitalContent = null;
        if (activeTab === 'digital') {
          var dsCards = DIGITAL_SAFETY_CARDS;
          var dsViewedCount = Object.keys(dsViewed).length;

          var dsBanner = h('div', {
            style: { margin: '0 16px 12px', padding: '12px 14px', borderRadius: 10, background: '#1e3a5f', border: '1px solid #3b82f6' }
          },
            h('div', { style: { fontWeight: 700, color: '#93c5fd', fontSize: 13, marginBottom: 4 } },
              band === 'elementary'
                ? '\uD83D\uDD10 The internet can be fun AND safe \u2014 when you know the rules!'
                : '\uD83D\uDD10 Your digital life is real life. What you do online matters.'
            ),
            h('div', { style: { fontSize: 11, color: '#93c5fd88' } },
              'Read all 8 cards and track what you already knew vs. what is new. ' + dsViewedCount + '/8 explored.')
          );

          var dsProgress = h('div', {
            style: { margin: '0 16px 12px' }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', marginBottom: 4 } },
              h('span', null, '\uD83E\uDDE0 Already knew: ' + dsKnewCount),
              h('span', null, '\uD83D\uDCA1 Learned something new: ' + dsLearnedCount)
            ),
            h('div', { style: { height: 6, borderRadius: 3, background: '#1e293b' } },
              h('div', { style: { height: '100%', borderRadius: 3, background: '#3b82f6', width: Math.round((dsViewedCount / 8) * 100) + '%', transition: 'width 0.3s' } })
            )
          );

          var dsCardList = dsCards.map(function(card) {
            var isExpanded = dsExpanded === card.id;
            var isViewed = !!dsViewed[card.id];
            var isTracked = !!dsTracked[card.id];
            return h('div', {
              key: card.id,
              onClick: function() {
                upd('dsExpanded', isExpanded ? null : card.id);
                if (!isViewed) {
                  var newViewed = Object.assign({}, dsViewed);
                  newViewed[card.id] = true;
                  upd('dsViewed', newViewed);
                  if (soundEnabled) sfxReveal();
                  // Check badge: all 8 cards read
                  if (Object.keys(newViewed).length >= 8) tryAwardBadge('digital_safety_pro');
                }
              },
              style: {
                margin: '0 16px 10px', padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                background: isExpanded ? '#1e293b' : '#0f172a', border: '1px solid ' + (isExpanded ? '#3b82f655' : '#1e293b'),
                transition: 'all 0.2s'
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { style: { fontSize: 24 } }, card.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 14 } }, card.title),
                  !isExpanded && h('div', { style: { fontSize: 11, color: '#9ca3af', marginTop: 2 } }, isViewed ? '\u2705 Read' : 'Tap to learn')
                )
              ),
              isExpanded && h('div', { style: { marginTop: 12 } },
                h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 10px' } },
                  band === 'elementary' ? card.elementary : card.middle
                ),
                h('div', { style: { padding: '10px 12px', borderRadius: 8, background: '#3b82f615', border: '1px solid #3b82f633', marginBottom: 10 } },
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: '#60a5fa', marginBottom: 4 } }, '\uD83D\uDCA1 ' + (band === 'elementary' ? card.tip_elementary : card.tip_middle))
                ),
                // "I knew this" / "I learned something new" tracking
                !isTracked && h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
                  h('button', { 'aria-label': 'Toggle sound',
                    onClick: function(e) {
                      e.stopPropagation();
                      var newTracked = Object.assign({}, dsTracked);
                      newTracked[card.id] = 'knew';
                      upd({ dsTracked: newTracked, dsKnewCount: dsKnewCount + 1 });
                      if (soundEnabled) sfxClick();
                    },
                    style: { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#cbd5e1', fontSize: 12, cursor: 'pointer' }
                  }, '\uD83E\uDDE0 I already knew this'),
                  h('button', { 'aria-label': 'Read aloud',
                    onClick: function(e) {
                      e.stopPropagation();
                      var newTracked = Object.assign({}, dsTracked);
                      newTracked[card.id] = 'learned';
                      upd({ dsTracked: newTracked, dsLearnedCount: dsLearnedCount + 1 });
                      if (soundEnabled) sfxCorrect();
                      awardXP(5);
                    },
                    style: { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #3b82f644', background: '#3b82f615', color: '#60a5fa', fontSize: 12, cursor: 'pointer' }
                  }, '\uD83D\uDCA1 I learned something new')
                ),
                isTracked && h('div', { style: { marginTop: 8, fontSize: 11, color: '#4ade80' } },
                  dsTracked[card.id] === 'knew' ? '\u2705 You already knew this \u2014 great awareness!' : '\u2705 New learning unlocked!'
                ),
                callTTS && h('button', { 'aria-label': 'Read aloud',
                  onClick: function(e) { e.stopPropagation(); speak(card.title + '. ' + (band === 'elementary' ? card.elementary : card.middle) + '. ' + (band === 'elementary' ? card.tip_elementary : card.tip_middle)); },
                  style: { marginTop: 8, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }
                }, '\uD83D\uDD0A Read aloud')
              )
            );
          });

          var dsCrisis = h('div', {
            style: { margin: '12px 16px 16px', padding: '10px 14px', borderRadius: 8, background: '#7f1d1d', fontSize: 11, color: '#fca5a5' }
          },
            '\uD83D\uDCDE Need help? 988 (call/text) \u2022 Text HOME to 741741 \u2022 CyberTipline: 1-800-843-5678'
          );

          var dsAffirm = h('div', {
            style: { margin: '12px 16px', padding: '12px 14px', borderRadius: 10, background: '#3b82f615', textAlign: 'center', fontSize: 12, color: '#60a5fa', fontWeight: 500, lineHeight: '1.5' }
          },
            band === 'elementary'
              ? 'You are learning how to be safe online. That is really smart! Share what you learn with a friend or family member.'
              : 'Digital literacy is a superpower. The more you know about online safety, the better you can protect yourself and your community.'
          );

          digitalContent = h('div', { style: { padding: '8px 0 16px' } },
            dsBanner,
            dsProgress,
            dsCardList,
            dsAffirm,
            dsCrisis
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: My Circle ──
        // ══════════════════════════════════════════════════════════
        var circleContent = null;
        if (activeTab === 'circle') {
          var catLabels = { family: '\uD83C\uDFE0 Family', school: '\uD83C\uDFEB School', community: '\uD83C\uDF0D Community', hotline: '\uD83D\uDCDE Hotlines' };
          var categories = ['family', 'school', 'community', 'hotline'];

          // Crisis resources section
          var crisisSection = h('div', {
            style: { margin: '0 16px 14px', padding: '14px 16px', borderRadius: 12, background: '#7f1d1d', border: '1px solid #dc2626' }
          },
            h('div', { style: { fontWeight: 700, color: '#fca5a5', fontSize: 13, marginBottom: 8 } }, '\uD83D\uDCDE Crisis Resources \u2014 Always Available'),
            CRISIS_RESOURCES.map(function(cr, i) {
              return h('div', { key: i, style: { padding: '6px 0', borderBottom: i < CRISIS_RESOURCES.length - 1 ? '1px solid #991b1b' : 'none' } },
                h('div', { style: { fontWeight: 600, fontSize: 13, color: '#fde2e2' } }, cr.icon + ' ' + cr.name),
                h('div', { style: { fontSize: 12, color: '#fca5a5' } }, cr.contact),
                h('div', { style: { fontSize: 11, color: '#fca5a588' } }, cr.desc)
              );
            }),
            !crisisViewed && h('button', { 'aria-label': 'I have seen these resources',
              onClick: function() {
                upd('crisisViewed', true);
                tryAwardBadge('help_seeker');
                if (soundEnabled) sfxResolve();
              },
              style: { marginTop: 10, padding: '6px 14px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
            }, '\u2764\uFE0F I have seen these resources'),
            crisisViewed && h('div', { style: { marginTop: 8, fontSize: 11, color: '#fca5a5', fontStyle: 'italic' } }, '\u2705 You have these resources. You are never alone.')
          );

          // Add trusted adult form
          var addForm = h('div', {
            style: { margin: '0 16px 14px', padding: '14px 16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
          },
            h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 14, marginBottom: 10 } }, '\u2795 Add a Trusted Adult'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
              h('input', {
                type: 'text', placeholder: 'Name', value: newAdultName,
                'aria-label': 'Trusted adult name',
                onChange: function(e) { upd('newAdultName', e.target.value); },
                style: { flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13 }
              }),
              h('input', {
                type: 'text', placeholder: 'Role (teacher, aunt, etc.)', value: newAdultRole,
                'aria-label': 'Trusted adult role',
                onChange: function(e) { upd('newAdultRole', e.target.value); },
                style: { flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13 }
              })
            ),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
              categories.filter(function(c) { return c !== 'hotline'; }).map(function(cat) {
                var isActive = newAdultCat === cat;
                return h('button', { 'aria-label': 'Add to My Circle',
                  key: cat,
                  onClick: function() { upd('newAdultCat', cat); },
                  style: {
                    padding: '4px 10px', borderRadius: 6, border: '1px solid ' + (isActive ? ACCENT : '#334155'), fontSize: 11, cursor: 'pointer',
                    background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : '#94a3b8'
                  }
                }, catLabels[cat]);
              })
            ),
            h('button', { 'aria-label': 'Add to My Circle',
              onClick: function() {
                if (!newAdultName.trim()) return;
                var entry = { name: newAdultName.trim(), role: newAdultRole.trim(), category: newAdultCat, timestamp: Date.now() };
                var updated = trustedAdults.concat([entry]);
                upd({ trustedAdults: updated, newAdultName: '', newAdultRole: '' });
                if (soundEnabled) sfxCorrect();
                addToast('\uD83D\uDC9A Added ' + entry.name + ' to your Circle of Trust!', 'success');
                awardXP(10);
                // Circle of Trust badge
                if (updated.length >= 3) tryAwardBadge('circle_trust');
              },
              style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
            }, 'Add to My Circle')
          );

          // Display trusted adults by category
          var circleDisplay = categories.map(function(cat) {
            var inCat = trustedAdults.filter(function(a) { return a.category === cat; });
            if (cat === 'hotline') {
              // Pre-filled hotlines
              return h('div', { key: cat, style: { margin: '0 16px 10px' } },
                h('div', { style: { fontWeight: 600, color: '#cbd5e1', fontSize: 12, marginBottom: 6 } }, catLabels[cat]),
                CRISIS_RESOURCES.map(function(cr, i) {
                  return h('div', { key: i, style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', marginBottom: 4, fontSize: 12, color: '#cbd5e1' } },
                    cr.icon + ' ' + cr.name + ' \u2014 ' + cr.contact
                  );
                })
              );
            }
            if (inCat.length === 0) return null;
            return h('div', { key: cat, style: { margin: '0 16px 10px' } },
              h('div', { style: { fontWeight: 600, color: '#cbd5e1', fontSize: 12, marginBottom: 6 } }, catLabels[cat]),
              inCat.map(function(adult, i) {
                return h('div', { key: i, style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', { style: { fontSize: 12, color: '#f1f5f9', fontWeight: 500 } }, adult.name),
                  adult.role && h('span', { style: { fontSize: 11, color: '#9ca3af' } }, '(' + adult.role + ')'),
                  h('button', { 'aria-label': 'elementary',
                    onClick: function() {
                      var filtered = trustedAdults.filter(function(_, idx) { return idx !== trustedAdults.indexOf(adult); });
                      upd('trustedAdults', filtered);
                    },
                    style: { marginLeft: 'auto', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 12 }
                  }, '\u2716')
                );
              })
            );
          });

          // Reflection
          var reflectionSection = h('div', {
            style: { margin: '14px 16px', padding: '14px 16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
          },
            h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 14, marginBottom: 8 } },
              band === 'elementary'
                ? '\uD83D\uDCDD If I needed help, I would talk to ___'
                : '\uD83D\uDCDD Reflection: Who would you turn to, and why?'
            ),
            h('textarea', {
              value: circleReflect,
              'aria-label': 'Circle of trust reflection',
              onChange: function(e) { upd('circleReflect', e.target.value); },
              placeholder: band === 'elementary'
                ? 'Write the name of someone you trust and why you trust them...'
                : 'Reflect on who you would turn to in different situations and what makes them trustworthy...',
              style: { width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }
            }),
            !circleSaved && circleReflect.trim().length > 10 && h('button', { 'aria-label': 'Save Reflection',
              onClick: function() {
                upd('circleSaved', true);
                if (soundEnabled) sfxResolve();
                addToast('\uD83D\uDC9A Reflection saved!', 'success');
                awardXP(15);
                tryAwardBadge('boundary_builder');
              },
              style: { marginTop: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
            }, 'Save Reflection'),
            circleSaved && h('div', { style: { marginTop: 8, fontSize: 12, color: '#4ade80' } }, '\u2705 Reflection saved')
          );

          // Affirming message
          var affirmation = h('div', {
            style: { margin: '0 16px 16px', padding: '12px 14px', borderRadius: 10, background: ACCENT_DIM, textAlign: 'center', fontSize: 12, color: ACCENT, fontWeight: 500 }
          }, '\uD83D\uDEE1\uFE0F You deserve to feel safe. Building your circle is a powerful step.');

          circleContent = h('div', { style: { padding: '8px 0 16px' } },
            h('div', { style: { padding: '0 16px 10px', fontSize: 13, color: '#cbd5e1' } },
              band === 'elementary'
                ? 'Your Circle of Trust is a group of safe grown-ups you can talk to about anything \u2014 especially when something feels wrong.'
                : 'Your Circle of Trust includes the people you can rely on. Mapping them out means you know exactly who to turn to.'
            ),
            crisisSection,
            addForm,
            circleDisplay,
            reflectionSection,
            affirmation
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Scenarios ──
        // ══════════════════════════════════════════════════════════
        var scenariosContent = null;
        if (activeTab === 'scenarios') {
          var scenarios = SAFETY_SCENARIOS[band] || SAFETY_SCENARIOS.elementary;
          var scen = scenarios[scenIdx];
          var completedCount = Object.keys(scenCompleted).length;

          var scenNav = h('div', {
            style: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 10px' }
          },
            h('button', { 'aria-label': 'Prev',
              onClick: function() { upd({ scenIdx: Math.max(0, scenIdx - 1), scenChoice: null }); if (soundEnabled) sfxClick(); },
              disabled: scenIdx === 0,
              style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: scenIdx === 0 ? '#334155' : '#94a3b8', cursor: scenIdx === 0 ? 'default' : 'pointer', fontSize: 12 }
            }, '\u25C0 Prev'),
            h('span', { style: { fontSize: 12, color: '#cbd5e1' } }, (scenIdx + 1) + ' / ' + scenarios.length),
            h('button', { 'aria-label': 'Next',
              onClick: function() { upd({ scenIdx: Math.min(scenarios.length - 1, scenIdx + 1), scenChoice: null }); if (soundEnabled) sfxClick(); },
              disabled: scenIdx === scenarios.length - 1,
              style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: scenIdx === scenarios.length - 1 ? '#334155' : '#94a3b8', cursor: scenIdx === scenarios.length - 1 ? 'default' : 'pointer', fontSize: 12 }
            }, 'Next \u25B6'),
            h('span', { style: { marginLeft: 'auto', fontSize: 11, color: '#9ca3af' } }, '\u2705 ' + completedCount + '/' + scenarios.length + ' completed')
          );

          var scenCard = h('div', {
            style: { margin: '0 16px', padding: '16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
          },
            h('div', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 4 } }, scen.title),
            h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: '1.6', margin: '8px 0 14px' } }, scen.setup),
            callTTS && h('button', { 'aria-label': 'Read aloud',
              onClick: function() { speak(scen.title + '. ' + scen.setup); },
              style: { marginBottom: 12, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }
            }, '\uD83D\uDD0A Read aloud'),
            h('div', { style: { fontWeight: 600, color: '#cbd5e1', fontSize: 12, marginBottom: 8 } }, 'What would you do?'),
            scen.choices.map(function(choice, i) {
              var isSelected = scenChoice === i;
              var isCompleted = scenCompleted[scen.id] != null;
              var ratingColors = { 1: '#ef4444', 2: '#f59e0b', 3: '#22c55e' };
              return h('div', { key: i },
                h('button', { 'aria-label': 'Toggle sound',
                  onClick: function() {
                    if (isCompleted) return;
                    upd('scenChoice', i);
                    if (soundEnabled) { choice.rating === 3 ? sfxCorrect() : sfxReveal(); }
                    // Mark completed
                    var newCompleted = Object.assign({}, scenCompleted);
                    newCompleted[scen.id] = { choice: i, rating: choice.rating };
                    upd('scenCompleted', newCompleted);
                    awardXP(choice.rating === 3 ? 20 : 10);
                    // Badge: scenario star (first completion)
                    if (Object.keys(newCompleted).length === 1) tryAwardBadge('scenario_star');
                    // Badge: quick thinker (all 5 completed)
                    if (Object.keys(newCompleted).length >= scenarios.length) tryAwardBadge('quick_thinker');
                    // Track top ratings
                    var topCount = 0;
                    Object.keys(newCompleted).forEach(function(k) { if (newCompleted[k].rating === 3) topCount++; });
                    upd('scenTopRatings', topCount);
                    // Badge: brave voice (3 top ratings)
                    if (topCount >= 3) tryAwardBadge('brave_voice');
                    // Badge: ally (bystander/advocacy scenarios)
                    var allyIds = ['ms3', 'es2', 'ms5', 'ms7', 'ms8'];
                    var hasAlly = allyIds.some(function(aid) { return newCompleted[aid] && newCompleted[aid].rating >= 2; });
                    if (hasAlly) tryAwardBadge('ally');
                  },
                  style: {
                    width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: isCompleted ? 'default' : 'pointer',
                    border: '1px solid ' + (isSelected ? ratingColors[choice.rating] + '66' : '#334155'),
                    background: isSelected ? ratingColors[choice.rating] + '15' : '#0f172a',
                    color: '#e2e8f0', fontSize: 13, lineHeight: '1.4',
                    transition: 'all 0.2s'
                  }
                }, choice.label),
                isSelected && h('div', {
                  style: { padding: '10px 14px', marginBottom: 8, borderRadius: 8, background: ratingColors[choice.rating] + '15', border: '1px solid ' + ratingColors[choice.rating] + '44' }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
                    h('span', { style: { fontSize: 11, fontWeight: 700, color: ratingColors[choice.rating] } },
                      choice.rating === 3 ? '\u2B50 Great choice!' : choice.rating === 2 ? '\uD83D\uDCA1 Good thinking, but...' : '\u26A0\uFE0F Let\u2019s think about this...'
                    )
                  ),
                  h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: '1.5', margin: 0 } }, choice.feedback),
                  callTTS && h('button', { 'aria-label': 'Read feedback aloud',
                    onClick: function() { speak(choice.feedback); },
                    style: { marginTop: 6, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 10, cursor: 'pointer' }
                  }, '\uD83D\uDD0A Read feedback aloud')
                )
              );
            })
          );

          // Affirming footer
          var scenFooter = h('div', {
            style: { margin: '14px 16px', padding: '12px 14px', borderRadius: 10, background: ACCENT_DIM, textAlign: 'center', fontSize: 12, color: ACCENT, fontWeight: 500, lineHeight: '1.5' }
          },
            band === 'elementary'
              ? 'Remember: You can ALWAYS tell a trusted adult. It is NEVER your fault. You will NOT get in trouble for telling the truth.'
              : 'Remember: Your safety always comes first. Trust your instincts. No one has the right to make you feel unsafe. You are never alone.'
          );

          // Crisis resources mini-banner
          var scenCrisis = h('div', {
            style: { margin: '0 16px 16px', padding: '10px 14px', borderRadius: 8, background: '#7f1d1d', fontSize: 11, color: '#fca5a5' }
          },
            '\uD83D\uDCDE Need help? 988 (call/text) \u2022 Text HOME to 741741 \u2022 1-800-422-4453'
          );

          scenariosContent = h('div', { style: { padding: '12px 0 16px' } },
            h('div', { style: { padding: '0 16px 10px', fontSize: 13, color: '#cbd5e1' } },
              band === 'elementary'
                ? 'Read each situation carefully. Choose what you would do. There are no wrong feelings \u2014 only safer choices.'
                : 'These scenarios help you practice making safe decisions. Read carefully and choose your response.'
            ),
            scenNav,
            scenCard,
            scenFooter,
            scenCrisis
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Assertiveness Training ──
        // ══════════════════════════════════════════════════════════
        var assertiveContent = null;
        if (activeTab === 'assertive') {
          var assertScenarios = ASSERTIVENESS_SCENARIOS[band] || ASSERTIVENESS_SCENARIOS.elementary;
          var assertScen = assertScenarios[assertIdx];
          var assertCompletedCount = Object.keys(assertCompleted).length;

          // Passive / Assertive / Aggressive lesson header
          var assertLesson = h('div', {
            style: { margin: '0 16px 14px', padding: '14px 16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
          },
            h('div', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 8 } },
              band === 'elementary'
                ? '\uD83D\uDCAA Three Ways to Respond'
                : '\uD83D\uDCAA Passive vs. Assertive vs. Aggressive'
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('div', { style: { flex: 1, minWidth: 100, padding: '10px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444433' } },
                h('div', { style: { fontSize: 12, fontWeight: 600, color: '#f87171', marginBottom: 4 } }, '\u2B50 Passive (1 star)'),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: '1.4' } },
                  band === 'elementary'
                    ? 'Going along with it even though it feels wrong. Letting others make choices for you.'
                    : 'Giving in to avoid conflict. Not expressing your true feelings or needs. Others\u2019 wants override your boundaries.'
                )
              ),
              h('div', { style: { flex: 1, minWidth: 100, padding: '10px', borderRadius: 8, background: '#22c55e15', border: '1px solid #22c55e33' } },
                h('div', { style: { fontSize: 12, fontWeight: 600, color: '#4ade80', marginBottom: 4 } }, '\u2B50\u2B50\u2B50 Assertive (3 stars)'),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: '1.4' } },
                  band === 'elementary'
                    ? 'Saying how you feel clearly and calmly. Standing up for yourself without being mean.'
                    : 'Expressing your needs clearly and respectfully. Setting firm boundaries while acknowledging others\u2019 feelings. The healthiest response.'
                )
              ),
              h('div', { style: { flex: 1, minWidth: 100, padding: '10px', borderRadius: 8, background: '#f59e0b15', border: '1px solid #f59e0b33' } },
                h('div', { style: { fontSize: 12, fontWeight: 600, color: '#fbbf24', marginBottom: 4 } }, '\u2B50 Aggressive (1 star)'),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: '1.4' } },
                  band === 'elementary'
                    ? 'Yelling, name-calling, or being mean back. Fighting back in a way that could make things worse.'
                    : 'Expressing anger through insults, threats, or hostility. May escalate the situation and damage relationships.'
                )
              )
            )
          );

          var assertNav = h('div', {
            style: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 10px' }
          },
            h('button', { 'aria-label': 'Prev',
              onClick: function() { upd({ assertIdx: Math.max(0, assertIdx - 1), assertChoice: null }); if (soundEnabled) sfxClick(); },
              disabled: assertIdx === 0,
              style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: assertIdx === 0 ? '#334155' : '#94a3b8', cursor: assertIdx === 0 ? 'default' : 'pointer', fontSize: 12 }
            }, '\u25C0 Prev'),
            h('span', { style: { fontSize: 12, color: '#cbd5e1' } }, (assertIdx + 1) + ' / ' + assertScenarios.length),
            h('button', { 'aria-label': 'Next',
              onClick: function() { upd({ assertIdx: Math.min(assertScenarios.length - 1, assertIdx + 1), assertChoice: null }); if (soundEnabled) sfxClick(); },
              disabled: assertIdx === assertScenarios.length - 1,
              style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: assertIdx === assertScenarios.length - 1 ? '#334155' : '#94a3b8', cursor: assertIdx === assertScenarios.length - 1 ? 'default' : 'pointer', fontSize: 12 }
            }, 'Next \u25B6'),
            h('span', { style: { marginLeft: 'auto', fontSize: 11, color: '#9ca3af' } }, '\u2705 ' + assertCompletedCount + '/' + assertScenarios.length + ' completed')
          );

          var assertCard = h('div', {
            style: { margin: '0 16px', padding: '16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
          },
            h('div', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 4 } }, assertScen.title),
            h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: '1.6', margin: '8px 0 14px' } }, assertScen.setup),
            callTTS && h('button', { 'aria-label': 'Read aloud',
              onClick: function() { speak(assertScen.title + '. ' + assertScen.setup); },
              style: { marginBottom: 12, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }
            }, '\uD83D\uDD0A Read aloud'),
            h('div', { style: { fontWeight: 600, color: '#cbd5e1', fontSize: 12, marginBottom: 8 } }, 'How would you respond?'),
            assertScen.responses.map(function(resp, i) {
              var isSelected = assertChoice === i;
              var isCompleted = assertCompleted[assertScen.id] != null;
              var styleColors = { passive: '#ef4444', assertive: '#22c55e', aggressive: '#f59e0b' };
              var rColor = styleColors[resp.style] || '#64748b';
              var starStr = '';
              for (var si = 0; si < resp.stars; si++) starStr += '\u2B50';
              return h('div', { key: i },
                h('button', { 'aria-label': 'Toggle sound',
                  onClick: function() {
                    if (isCompleted) return;
                    upd('assertChoice', i);
                    if (soundEnabled) { resp.stars === 3 ? sfxCorrect() : sfxReveal(); }
                    var newCompleted = Object.assign({}, assertCompleted);
                    newCompleted[assertScen.id] = { choice: i, stars: resp.stars, style: resp.style };
                    upd('assertCompleted', newCompleted);
                    awardXP(resp.stars === 3 ? 20 : 10);
                    // Track assertive top choices
                    var topCount = 0;
                    Object.keys(newCompleted).forEach(function(k) { if (newCompleted[k].stars === 3) topCount++; });
                    upd('assertTopCount', topCount);
                    // Assertiveness Master badge: 6 assertive responses
                    if (topCount >= 6) tryAwardBadge('assertiveness_master');
                  },
                  style: {
                    width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: isCompleted ? 'default' : 'pointer',
                    border: '1px solid ' + (isSelected ? rColor + '66' : '#334155'),
                    background: isSelected ? rColor + '15' : '#0f172a',
                    color: '#e2e8f0', fontSize: 13, lineHeight: '1.4',
                    transition: 'all 0.2s'
                  }
                },
                  h('span', { style: { fontSize: 10, color: rColor, marginRight: 6 } },
                    resp.style.charAt(0).toUpperCase() + resp.style.slice(1)
                  ),
                  resp.label
                ),
                isSelected && h('div', {
                  style: { padding: '10px 14px', marginBottom: 8, borderRadius: 8, background: rColor + '15', border: '1px solid ' + rColor + '44' }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
                    h('span', { style: { fontSize: 11, fontWeight: 700, color: rColor } },
                      starStr + ' ' + (resp.stars === 3 ? 'Assertive \u2014 Great choice!' : resp.style === 'passive' ? 'Passive \u2014 Let\u2019s think about this...' : 'Aggressive \u2014 There is a better way...')
                    )
                  ),
                  h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: '1.5', margin: 0 } }, resp.feedback),
                  callTTS && h('button', { 'aria-label': 'Read feedback aloud',
                    onClick: function() { speak(resp.feedback); },
                    style: { marginTop: 6, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 10, cursor: 'pointer' }
                  }, '\uD83D\uDD0A Read feedback aloud')
                )
              );
            })
          );

          var assertFooter = h('div', {
            style: { margin: '14px 16px', padding: '12px 14px', borderRadius: 10, background: '#22c55e15', textAlign: 'center', fontSize: 12, color: '#4ade80', fontWeight: 500, lineHeight: '1.5' }
          },
            band === 'elementary'
              ? 'Being assertive means standing up for yourself in a kind, strong way. It gets easier with practice! You are doing great.'
              : 'Assertiveness is a skill that takes practice. The more you use it, the more natural it becomes. You have the right to stand up for yourself \u2014 always.'
          );

          var assertCrisis = h('div', {
            style: { margin: '0 16px 16px', padding: '10px 14px', borderRadius: 8, background: '#7f1d1d', fontSize: 11, color: '#fca5a5' }
          },
            '\uD83D\uDCDE Need help? 988 (call/text) \u2022 Text HOME to 741741 \u2022 1-800-422-4453'
          );

          assertiveContent = h('div', { style: { padding: '12px 0 16px' } },
            h('div', { style: { padding: '0 16px 10px', fontSize: 13, color: '#cbd5e1' } },
              band === 'elementary'
                ? 'Practice saying "no" firmly and respectfully. Read each situation and choose the best way to respond.'
                : 'Practice assertive communication. Learn the difference between passive, assertive, and aggressive responses.'
            ),
            assertLesson,
            assertNav,
            assertCard,
            assertFooter,
            assertCrisis
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Safety Quiz ──
        // ══════════════════════════════════════════════════════════
        var quizContent = null;
        if (activeTab === 'quiz') {
          var questions = QUIZ_QUESTIONS[band] || QUIZ_QUESTIONS.elementary;
          var currentQ = questions[quizIdx];
          var totalQ = questions.length;
          var isAnsweredQ = quizAnswered[quizIdx] != null;

          // Quiz header with score tracking
          var quizHeader = h('div', {
            style: { padding: '0 16px 12px' }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
              h('div', { style: { fontSize: 13, color: '#cbd5e1' } },
                band === 'elementary'
                  ? 'Test what you know about staying safe! Answer each question.'
                  : 'Challenge your safety knowledge. Choose the best answer for each question.'
              ),
              h('div', { style: { fontSize: 11, color: '#9ca3af' } },
                quizBest > 0 ? '\uD83C\uDFC6 Best: ' + quizBest + '/' + totalQ : ''
              )
            ),
            !quizDone && h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('div', { style: { flex: 1, height: 6, borderRadius: 3, background: '#1e293b' } },
                h('div', { style: { height: '100%', borderRadius: 3, background: ACCENT, width: Math.round((Object.keys(quizAnswered).length / totalQ) * 100) + '%', transition: 'width 0.3s' } })
              ),
              h('span', { style: { fontSize: 11, color: '#cbd5e1' } }, Object.keys(quizAnswered).length + '/' + totalQ)
            )
          );

          // Quiz card (question)
          var quizCard = null;
          if (!quizDone) {
            var choiceButtons = [];
            if (currentQ.type === 'tf') {
              choiceButtons = [true, false].map(function(val, i) {
                var isSelected = quizAnswered[quizIdx] != null && quizAnswered[quizIdx].picked === val;
                var isCorrectAnswer = val === currentQ.answer;
                var showResult = isAnsweredQ;
                var btnColor = showResult ? (isCorrectAnswer ? '#22c55e' : (isSelected && !isCorrectAnswer ? '#ef4444' : '#334155')) : '#334155';
                return h('button', { 'aria-label': 'Select answer',
                  key: i,
                  onClick: function() {
                    if (isAnsweredQ) return;
                    var correct = val === currentQ.answer;
                    var newAnswered = Object.assign({}, quizAnswered);
                    newAnswered[quizIdx] = { picked: val, correct: correct };
                    var newScore = quizScore + (correct ? 1 : 0);
                    upd({ quizAnswered: newAnswered, quizAnswer: val, quizScore: newScore });
                    if (soundEnabled) { correct ? sfxCorrect() : sfxReveal(); }
                    awardXP(correct ? 10 : 3);
                    // Check if all questions answered
                    if (Object.keys(newAnswered).length >= totalQ) {
                      upd('quizDone', true);
                      var newBest = Math.max(quizBest, newScore);
                      upd('quizBest', newBest);
                      if (newScore >= 8) tryAwardBadge('quiz_master');
                    }
                  },
                  style: {
                    flex: 1, padding: '12px 16px', borderRadius: 10, cursor: isAnsweredQ ? 'default' : 'pointer',
                    border: '2px solid ' + btnColor,
                    background: isSelected ? btnColor + '22' : '#0f172a',
                    color: showResult && isCorrectAnswer ? '#22c55e' : (showResult && isSelected && !isCorrectAnswer ? '#ef4444' : '#e2e8f0'),
                    fontSize: 14, fontWeight: 600, transition: 'all 0.2s'
                  }
                }, val ? '\u2705 TRUE' : '\u274C FALSE');
              });
            } else {
              // Multiple choice
              choiceButtons = currentQ.choices.map(function(ch, i) {
                var isSelected = quizAnswered[quizIdx] != null && quizAnswered[quizIdx].picked === i;
                var isCorrectAnswer = i === currentQ.answer;
                var showResult = isAnsweredQ;
                var btnColor = showResult ? (isCorrectAnswer ? '#22c55e' : (isSelected && !isCorrectAnswer ? '#ef4444' : '#334155')) : '#334155';
                return h('button', { 'aria-label': 'Select answer',
                  key: i,
                  onClick: function() {
                    if (isAnsweredQ) return;
                    var correct = i === currentQ.answer;
                    var newAnswered = Object.assign({}, quizAnswered);
                    newAnswered[quizIdx] = { picked: i, correct: correct };
                    var newScore = quizScore + (correct ? 1 : 0);
                    upd({ quizAnswered: newAnswered, quizAnswer: i, quizScore: newScore });
                    if (soundEnabled) { correct ? sfxCorrect() : sfxReveal(); }
                    awardXP(correct ? 10 : 3);
                    if (Object.keys(newAnswered).length >= totalQ) {
                      upd('quizDone', true);
                      var newBest = Math.max(quizBest, newScore);
                      upd('quizBest', newBest);
                      if (newScore >= 8) tryAwardBadge('quiz_master');
                    }
                  },
                  style: {
                    width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: isAnsweredQ ? 'default' : 'pointer',
                    border: '1px solid ' + btnColor,
                    background: isSelected ? btnColor + '22' : '#0f172a',
                    color: showResult && isCorrectAnswer ? '#22c55e' : (showResult && isSelected && !isCorrectAnswer ? '#ef4444' : '#e2e8f0'),
                    fontSize: 13, fontWeight: isSelected ? 600 : 400, transition: 'all 0.2s'
                  }
                }, ch);
              });
            }

            quizCard = h('div', {
              style: { margin: '0 16px', padding: '16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
            },
              h('div', { style: { fontSize: 11, color: '#9ca3af', marginBottom: 4 } }, 'Question ' + (quizIdx + 1) + ' of ' + totalQ),
              h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 15, marginBottom: 14, lineHeight: '1.5' } }, currentQ.q),
              callTTS && h('button', { 'aria-label': 'Read aloud',
                onClick: function() { speak(currentQ.q); },
                style: { marginBottom: 10, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }
              }, '\uD83D\uDD0A Read aloud'),
              currentQ.type === 'tf'
                ? h('div', { style: { display: 'flex', gap: 10 } }, choiceButtons)
                : h('div', null, choiceButtons),
              // Explanation after answering
              isAnsweredQ && h('div', {
                style: { marginTop: 12, padding: '12px 14px', borderRadius: 8, background: quizAnswered[quizIdx].correct ? '#22c55e15' : '#ef444415', border: '1px solid ' + (quizAnswered[quizIdx].correct ? '#22c55e44' : '#ef444444') }
              },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: quizAnswered[quizIdx].correct ? '#4ade80' : '#f87171', marginBottom: 4 } },
                  quizAnswered[quizIdx].correct ? '\u2B50 Correct!' : '\uD83D\uDCA1 Not quite \u2014 here is why:'
                ),
                h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: '1.5', margin: 0 } }, currentQ.explain)
              ),
              // Navigation
              isAnsweredQ && h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 12 } },
                quizIdx < totalQ - 1 && h('button', { 'aria-label': 'Next Question',
                  onClick: function() { upd({ quizIdx: quizIdx + 1, quizAnswer: null }); if (soundEnabled) sfxClick(); },
                  style: { padding: '8px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
                }, 'Next Question \u25B6')
              )
            );
          }

          // Quiz results screen
          var quizResults = null;
          if (quizDone) {
            var pct = Math.round((quizScore / totalQ) * 100);
            var msg = pct >= 80 ? 'Outstanding! You really know your stuff!' : pct >= 60 ? 'Great job! You are learning important safety skills.' : 'Every question is a chance to learn. You are getting stronger!';
            quizResults = h('div', {
              style: { margin: '0 16px', padding: '20px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155', textAlign: 'center' }
            },
              h('div', { style: { fontSize: 48, marginBottom: 8 } }, pct >= 80 ? '\uD83C\uDFC6' : pct >= 60 ? '\u2B50' : '\uD83D\uDCAA'),
              h('div', { style: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 } }, 'Score: ' + quizScore + ' / ' + totalQ),
              h('div', { style: { fontSize: 14, color: '#cbd5e1', marginBottom: 4 } }, pct + '% correct'),
              quizBest > 0 && h('div', { style: { fontSize: 12, color: '#9ca3af', marginBottom: 10 } }, '\uD83C\uDFC6 Personal best: ' + quizBest + '/' + totalQ),
              h('div', { style: { fontSize: 13, color: '#cbd5e1', marginBottom: 16, lineHeight: '1.5' } }, msg),
              h('button', { 'aria-label': 'Try Again',
                onClick: function() { upd({ quizIdx: 0, quizAnswer: null, quizAnswered: {}, quizScore: 0, quizDone: false }); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
              }, '\uD83D\uDD04 Try Again'),
              h('div', {
                style: { marginTop: 14, padding: '10px 12px', borderRadius: 8, background: ACCENT_DIM, fontSize: 12, color: ACCENT, fontWeight: 500, lineHeight: '1.4' }
              }, 'Remember: Getting questions wrong is part of learning. What matters is that you now know the right answers \u2014 and you can use that knowledge to stay safe.')
            );
          }

          // Crisis mini-banner
          var quizCrisis = h('div', {
            style: { margin: '14px 16px 16px', padding: '10px 14px', borderRadius: 8, background: '#7f1d1d', fontSize: 11, color: '#fca5a5' }
          },
            '\uD83D\uDCDE Need help? 988 (call/text) \u2022 Text HOME to 741741 \u2022 1-800-422-4453'
          );

          quizContent = h('div', { style: { padding: '12px 0 16px' } },
            quizHeader,
            quizDone ? quizResults : quizCard,
            quizCrisis
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Red Flag / Green Flag ──
        // ══════════════════════════════════════════════════════════
        var flagsContent = null;
        if (activeTab === 'flags') {
          var flagItems = FLAG_ITEMS[band] || FLAG_ITEMS.elementary;
          var totalFlags = flagItems.length;
          var currentFlag = flagItems[flagIdx];
          var isFlagAnswered = !!flagAnswered[flagIdx];

          var flagHeader = h('div', {
            style: { padding: '0 16px 12px' }
          },
            h('div', { style: { fontSize: 13, color: '#cbd5e1', marginBottom: 8 } },
              band === 'elementary'
                ? 'Is this behavior a safe (green flag) or an unsafe (red flag) thing? Sort each card!'
                : 'Identify whether each behavior is a safe (green flag) or an unsafe (red flag). Trust your instincts.'
            ),
            !flagDone && h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('div', { style: { flex: 1, height: 6, borderRadius: 3, background: '#1e293b' } },
                h('div', { style: { height: '100%', borderRadius: 3, background: ACCENT, width: Math.round((Object.keys(flagAnswered).length / totalFlags) * 100) + '%', transition: 'width 0.3s' } })
              ),
              h('span', { style: { fontSize: 11, color: '#cbd5e1' } }, Object.keys(flagAnswered).length + '/' + totalFlags)
            )
          );

          var flagCard = null;
          if (!flagDone) {
            flagCard = h('div', {
              style: { margin: '0 16px', padding: '16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
            },
              h('div', { style: { fontSize: 11, color: '#9ca3af', marginBottom: 4 } }, 'Card ' + (flagIdx + 1) + ' of ' + totalFlags),
              h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 14, marginBottom: 14, lineHeight: '1.5', padding: '8px 0' } }, currentFlag.text),
              callTTS && h('button', { 'aria-label': 'Read aloud',
                onClick: function() { speak(currentFlag.text); },
                style: { marginBottom: 10, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }
              }, '\uD83D\uDD0A Read aloud'),
              h('div', { style: { display: 'flex', gap: 10 } },
                ['green', 'red'].map(function(flag) {
                  var isSelected = isFlagAnswered && flagAnswered[flagIdx].picked === flag;
                  var isCorrectAnswer = flag === currentFlag.flag;
                  var showResult = isFlagAnswered;
                  var bgColor = flag === 'green' ? '#22c55e' : '#ef4444';
                  var borderColor = showResult ? (isCorrectAnswer ? bgColor : (isSelected && !isCorrectAnswer ? '#f59e0b' : '#334155')) : '#334155';
                  return h('button', { 'aria-label': 'Toggle sound',
                    key: flag,
                    onClick: function() {
                      if (isFlagAnswered) return;
                      var correct = flag === currentFlag.flag;
                      var newAnswered = Object.assign({}, flagAnswered);
                      newAnswered[flagIdx] = { picked: flag, correct: correct };
                      var newCorrect = flagCorrect + (correct ? 1 : 0);
                      upd({ flagAnswered: newAnswered, flagChoice: flag, flagCorrect: newCorrect });
                      if (soundEnabled) { correct ? sfxCorrect() : sfxReveal(); }
                      awardXP(correct ? 10 : 3);
                      if (Object.keys(newAnswered).length >= totalFlags) {
                        upd('flagDone', true);
                        tryAwardBadge('flag_sorter');
                      }
                    },
                    style: {
                      flex: 1, padding: '14px 16px', borderRadius: 10, cursor: isFlagAnswered ? 'default' : 'pointer',
                      border: '2px solid ' + borderColor,
                      background: isSelected ? bgColor + '22' : '#0f172a',
                      color: showResult && isCorrectAnswer ? bgColor : '#e2e8f0',
                      fontSize: 14, fontWeight: 600, transition: 'all 0.2s'
                    }
                  }, flag === 'green' ? '\uD83D\uDFE2 Safe' : '\uD83D\uDD34 Unsafe');
                })
              ),
              // Explanation
              isFlagAnswered && h('div', {
                style: {
                  marginTop: 12, padding: '12px 14px', borderRadius: 8,
                  background: flagAnswered[flagIdx].correct ? '#22c55e15' : '#f59e0b15',
                  border: '1px solid ' + (flagAnswered[flagIdx].correct ? '#22c55e44' : '#f59e0b44')
                }
              },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: flagAnswered[flagIdx].correct ? '#4ade80' : '#fbbf24', marginBottom: 4 } },
                  flagAnswered[flagIdx].correct ? '\u2705 You got it!' : '\uD83D\uDCA1 Actually, this is a ' + (currentFlag.flag === 'red' ? 'RED flag (unsafe)' : 'GREEN flag (safe)') + ':'
                ),
                h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: '1.5', margin: 0 } }, currentFlag.explain)
              ),
              // Next button
              isFlagAnswered && flagIdx < totalFlags - 1 && h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 12 } },
                h('button', { 'aria-label': 'Next Card',
                  onClick: function() { upd({ flagIdx: flagIdx + 1, flagChoice: null }); if (soundEnabled) sfxClick(); },
                  style: { padding: '8px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
                }, 'Next Card \u25B6')
              )
            );
          }

          // Flag results
          var flagResults = null;
          if (flagDone) {
            var flagPct = Math.round((flagCorrect / totalFlags) * 100);
            flagResults = h('div', {
              style: { margin: '0 16px', padding: '20px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155', textAlign: 'center' }
            },
              h('div', { style: { fontSize: 48, marginBottom: 8 } }, flagPct >= 80 ? '\uD83C\uDFC6' : '\uD83D\uDCAA'),
              h('div', { style: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 } }, flagCorrect + ' / ' + totalFlags + ' correct'),
              h('div', { style: { fontSize: 13, color: '#cbd5e1', marginBottom: 16, lineHeight: '1.5' } },
                flagPct >= 80
                  ? 'Excellent instincts! You can spot safe and unsafe behaviors clearly.'
                  : 'You are building important skills. Keep practicing \u2014 your instincts are getting sharper!'
              ),
              h('button', { 'aria-label': 'Play Again',
                onClick: function() { upd({ flagIdx: 0, flagChoice: null, flagAnswered: {}, flagCorrect: 0, flagDone: false }); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
              }, '\uD83D\uDD04 Play Again'),
              h('div', {
                style: { marginTop: 14, padding: '10px 12px', borderRadius: 8, background: ACCENT_DIM, fontSize: 12, color: ACCENT, fontWeight: 500, lineHeight: '1.4' }
              }, 'Trust your gut feelings. When something feels wrong, it probably is. You always have the right to speak up.')
            );
          }

          var flagCrisis = h('div', {
            style: { margin: '14px 16px 16px', padding: '10px 14px', borderRadius: 8, background: '#7f1d1d', fontSize: 11, color: '#fca5a5' }
          },
            '\uD83D\uDCDE Need help? 988 (call/text) \u2022 Text HOME to 741741 \u2022 1-800-422-4453'
          );

          flagsContent = h('div', { style: { padding: '12px 0 16px' } },
            flagHeader,
            flagDone ? flagResults : flagCard,
            flagCrisis
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Emergency Preparedness ──
        // ══════════════════════════════════════════════════════════
        var emergencyContent = null;
        if (activeTab === 'emergency') {
          var emTopics = EMERGENCY_TOPICS;
          var emViewedCount = Object.keys(emViewed).length;

          var emHeader = h('div', {
            style: { margin: '0 16px 12px', padding: '14px 16px', borderRadius: 12, background: '#7f1d1d22', border: '1px solid #dc262644' }
          },
            h('div', { style: { fontWeight: 700, color: '#fca5a5', fontSize: 14, marginBottom: 6 } },
              '\uD83D\uDE92 ' + (band === 'elementary'
                ? 'Being prepared means knowing what to do BEFORE an emergency happens!'
                : 'Emergency preparedness is not about fear \u2014 it is about confidence. When you know what to do, you can act quickly and calmly.'
              )
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 } },
              h('div', { style: { flex: 1, height: 6, borderRadius: 3, background: '#1e293b' } },
                h('div', { style: { height: '100%', borderRadius: 3, background: '#dc2626', width: Math.round((emViewedCount / emTopics.length) * 100) + '%', transition: 'width 0.3s' } })
              ),
              h('span', { style: { fontSize: 11, color: '#fca5a5' } }, emViewedCount + '/' + emTopics.length + ' topics')
            )
          );

          var emCardList = emTopics.map(function(topic) {
            var isExpanded = emExpanded === topic.id;
            var isViewed = !!emViewed[topic.id];
            return h('div', {
              key: topic.id,
              onClick: function() {
                upd('emExpanded', isExpanded ? null : topic.id);
                if (!isViewed) {
                  var newViewed = Object.assign({}, emViewed);
                  newViewed[topic.id] = true;
                  upd('emViewed', newViewed);
                  if (soundEnabled) sfxReveal();
                  awardXP(10);
                  // Emergency Ready badge: all topics viewed
                  if (Object.keys(newViewed).length >= emTopics.length) tryAwardBadge('emergency_ready');
                }
              },
              style: {
                margin: '0 16px 10px', padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                background: isExpanded ? '#1e293b' : '#0f172a', border: '1px solid ' + (isExpanded ? '#dc262644' : '#1e293b'),
                transition: 'all 0.2s'
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { style: { fontSize: 24 } }, topic.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 14 } }, topic.title),
                  !isExpanded && h('div', { style: { fontSize: 11, color: '#9ca3af', marginTop: 2 } }, isViewed ? '\u2705 Read' : 'Tap to learn')
                )
              ),
              isExpanded && h('div', { style: { marginTop: 12 } },
                h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 10px' } },
                  band === 'elementary' ? topic.elementary : topic.middle
                ),
                h('div', { style: { padding: '10px 12px', borderRadius: 8, background: '#22c55e15', border: '1px solid #22c55e33' } },
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: '#4ade80', marginBottom: 4 } }, '\u270D\uFE0F Practice:'),
                  h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: '1.5' } }, topic.practice)
                ),
                callTTS && h('button', { 'aria-label': 'Read aloud',
                  onClick: function(e) { e.stopPropagation(); speak(topic.title + '. ' + (band === 'elementary' ? topic.elementary : topic.middle) + '. ' + topic.practice); },
                  style: { marginTop: 8, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }
                }, '\uD83D\uDD0A Read aloud')
              )
            );
          });

          var emAffirm = h('div', {
            style: { margin: '12px 16px', padding: '12px 14px', borderRadius: 10, background: '#dc262615', textAlign: 'center', fontSize: 12, color: '#fca5a5', fontWeight: 500, lineHeight: '1.5' }
          },
            band === 'elementary'
              ? 'You are learning how to be ready for emergencies. That makes you a real-life hero! Talk to your family about making a plan together.'
              : 'Being prepared is not about worrying. It is about having a plan so you can stay calm and help yourself and others when it matters most.'
          );

          var emCrisis = h('div', {
            style: { margin: '0 16px 16px', padding: '10px 14px', borderRadius: 8, background: '#7f1d1d', fontSize: 11, color: '#fca5a5' }
          },
            '\uD83D\uDCDE Emergency: 911 \u2022 Crisis Line: 988 \u2022 Text HOME to 741741'
          );

          emergencyContent = h('div', { style: { padding: '8px 0 16px' } },
            h('div', { style: { padding: '0 16px 10px', fontSize: 13, color: '#cbd5e1' } },
              band === 'elementary'
                ? 'Learn what to do in an emergency. Knowing this stuff can keep you and your family safe!'
                : 'Emergency preparedness is a life skill everyone needs. Explore each topic to build your readiness.'
            ),
            emHeader,
            emCardList,
            emAffirm,
            emCrisis
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Safety Plan Builder ──
        // ══════════════════════════════════════════════════════════
        var planContent = null;
        if (activeTab === 'plan') {
          var planLabelStyle = { fontWeight: 600, color: '#f1f5f9', fontSize: 13, marginBottom: 6 };
          var planInputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' };

          var planForm = h('div', {
            style: { margin: '0 16px', padding: '16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
          },
            h('div', { style: { textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 32, marginBottom: 4 } }, '\uD83D\uDCCB'),
              h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' } }, 'My Personal Safety Plan'),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 4 } },
                band === 'elementary'
                  ? 'Fill in your plan so you know what to do if you ever feel unsafe.'
                  : 'Having a plan means you do not have to think under pressure. Fill this out when you are calm and ready.'
              )
            ),

            // Step 1
            h('div', { style: { marginBottom: 14 } },
              h('div', { style: planLabelStyle }, '\u0031\uFE0F\u20E3 If I feel unsafe, the first thing I will do is:'),
              h('input', {
                type: 'text', value: safetyPlanStep1,
                'aria-label': 'Safety plan step 1',
                onChange: function(e) { upd('safetyPlanStep1', e.target.value); },
                placeholder: band === 'elementary' ? 'Example: Run to a safe grown-up' : 'Example: Remove myself from the situation',
                style: planInputStyle
              })
            ),

            // Step 2
            h('div', { style: { marginBottom: 14 } },
              h('div', { style: planLabelStyle }, '\u0032\uFE0F\u20E3 Then I will:'),
              h('input', {
                type: 'text', value: safetyPlanStep2,
                'aria-label': 'Safety plan step 2',
                onChange: function(e) { upd('safetyPlanStep2', e.target.value); },
                placeholder: band === 'elementary' ? 'Example: Tell them what happened' : 'Example: Contact my trusted adult',
                style: planInputStyle
              })
            ),

            // Step 3
            h('div', { style: { marginBottom: 14 } },
              h('div', { style: planLabelStyle }, '\u0033\uFE0F\u20E3 If that does not work, I will:'),
              h('input', {
                type: 'text', value: safetyPlanStep3,
                'aria-label': 'Safety plan step 3',
                onChange: function(e) { upd('safetyPlanStep3', e.target.value); },
                placeholder: band === 'elementary' ? 'Example: Call 911 or another trusted adult' : 'Example: Call 988 or go to a safe location',
                style: planInputStyle
              })
            ),

            // Safe place
            h('div', { style: { marginBottom: 14 } },
              h('div', { style: planLabelStyle }, '\uD83C\uDFE0 My safe place is:'),
              h('input', {
                type: 'text', value: safetyPlanPlace,
                'aria-label': 'Safe place',
                onChange: function(e) { upd('safetyPlanPlace', e.target.value); },
                placeholder: band === 'elementary' ? 'Example: My house, the school office, the library' : 'Example: Home, school counselor office, friend\'s house',
                style: planInputStyle
              })
            ),

            // Code word
            h('div', { style: { marginBottom: 14 } },
              h('div', { style: planLabelStyle }, '\uD83D\uDD10 My code word with my trusted adult is:'),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6, fontStyle: 'italic' } },
                band === 'elementary'
                  ? 'A code word is a special secret word you and your trusted adult agree on. If you use it, they know you need help right away!'
                  : 'A code word is a discreet way to signal that you need help without others knowing. Agree on one with a parent or trusted adult.'
              ),
              h('input', {
                type: 'text', value: safetyPlanCode,
                'aria-label': 'Code word',
                onChange: function(e) { upd('safetyPlanCode', e.target.value); },
                placeholder: 'Example: Pineapple, Red balloon, etc.',
                style: planInputStyle
              })
            ),

            // Emergency numbers
            h('div', { style: { marginBottom: 14 } },
              h('div', { style: planLabelStyle }, '\uD83D\uDCDE Emergency numbers I know by heart:'),
              h('textarea', {
                value: safetyPlanNums,
                'aria-label': 'Emergency phone numbers',
                onChange: function(e) { upd('safetyPlanNums', e.target.value); },
                placeholder: 'Example:\n911\nMom: 555-0123\nDad: 555-0456\n988 (crisis line)',
                style: Object.assign({}, planInputStyle, { minHeight: 70, resize: 'vertical' })
              })
            ),

            // Save and export
            h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
              !safetyPlanSaved && safetyPlanStep1.trim() && h('button', { 'aria-label': 'Save My Plan',
                onClick: function() {
                  upd('safetyPlanSaved', true);
                  if (soundEnabled) sfxResolve();
                  addToast('\uD83D\uDCCB Safety Plan saved! You are prepared.', 'success');
                  awardXP(25);
                  tryAwardBadge('safety_planner');
                },
                style: { padding: '10px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
              }, '\uD83D\uDCBE Save My Plan'),
              safetyPlanSaved && h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { fontSize: 12, color: '#4ade80' } }, '\u2705 Plan saved!'),
                h('button', { 'aria-label': 'Edit',
                  onClick: function() { upd('safetyPlanSaved', false); },
                  style: { background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }
                }, 'Edit')
              ),
              (safetyPlanStep1.trim() || safetyPlanPlace.trim()) && h('button', { 'aria-label': 'Safety resources',
                onClick: function() {
                  var planText = 'MY SAFETY PLAN\n' +
                    '==============\n\n' +
                    '1. If I feel unsafe, I will: ' + (safetyPlanStep1 || '(not filled in)') + '\n' +
                    '2. Then I will: ' + (safetyPlanStep2 || '(not filled in)') + '\n' +
                    '3. If that does not work: ' + (safetyPlanStep3 || '(not filled in)') + '\n\n' +
                    'My safe place: ' + (safetyPlanPlace || '(not filled in)') + '\n' +
                    'My code word: ' + (safetyPlanCode || '(not filled in)') + '\n\n' +
                    'Emergency numbers:\n' + (safetyPlanNums || '(not filled in)') + '\n\n' +
                    '---\n' +
                    'CRISIS RESOURCES (available 24/7):\n' +
                    '988 Suicide & Crisis Lifeline: Call or text 988\n' +
                    'Crisis Text Line: Text HOME to 741741\n' +
                    'Childhelp Hotline: 1-800-422-4453\n\n' +
                    'Remember: You are NEVER alone. It is NEVER your fault.\n';
                  try {
                    var blob = new Blob([planText], { type: 'text/plain' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url; a.download = 'My_Safety_Plan.txt';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    addToast('\uD83D\uDCBE Safety Plan downloaded!', 'success');
                  } catch(e) {
                    // Fallback: copy to clipboard
                    try {
                      navigator.clipboard.writeText(planText);
                      addToast('\uD83D\uDCCB Safety Plan copied to clipboard!', 'success');
                    } catch(e2) {
                      addToast('Could not export. Try copying your plan manually.', 'error');
                    }
                  }
                },
                style: { padding: '10px 20px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
              }, '\uD83D\uDDA8\uFE0F Export / Print')
            )
          );

          var planAffirm = h('div', {
            style: { margin: '14px 16px', padding: '12px 14px', borderRadius: 10, background: ACCENT_DIM, textAlign: 'center', fontSize: 12, color: ACCENT, fontWeight: 500, lineHeight: '1.5' }
          },
            band === 'elementary'
              ? 'Having a safety plan means you are ready \u2014 even if you never need to use it. That is really smart and brave!'
              : 'A safety plan is not about expecting the worst \u2014 it is about being prepared so you can act confidently if you ever need to.'
          );

          var planCrisis = h('div', {
            style: { margin: '0 16px 16px', padding: '10px 14px', borderRadius: 8, background: '#7f1d1d', fontSize: 11, color: '#fca5a5' }
          },
            '\uD83D\uDCDE Need help? 988 (call/text) \u2022 Text HOME to 741741 \u2022 1-800-422-4453'
          );

          planContent = h('div', { style: { padding: '12px 0 16px' } },
            h('div', { style: { padding: '0 16px 10px', fontSize: 13, color: '#cbd5e1' } },
              band === 'elementary'
                ? 'Create your very own safety plan. Fill in each section so you always know what to do.'
                : 'Build your personal safety plan. When you are prepared, you do not have to figure things out under stress.'
            ),
            planForm,
            planAffirm,
            planCrisis
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Badges ──
        // ══════════════════════════════════════════════════════════
        var badgesContent = null;
        if (activeTab === 'badges') {
          var earnedCount = Object.keys(earnedBadges).length;

          badgesContent = h('div', { style: { padding: '12px 16px' } },
            h('div', { style: { textAlign: 'center', marginBottom: 16 } },
              h('div', { style: { fontSize: 32, marginBottom: 4 } }, '\uD83C\uDFC5'),
              h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9' } }, earnedCount + ' / ' + BADGES.length + ' Badges'),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 4 } }, earnedCount === 0 ? 'Start exploring to earn badges!' : earnedCount >= 7 ? 'You are a Safety Champion!' : 'Keep going \u2014 you are doing great!')
            ),
            // Progress bar
            h('div', { style: { height: 6, borderRadius: 3, background: '#1e293b', marginBottom: 20 } },
              h('div', { style: { height: '100%', borderRadius: 3, background: ACCENT, width: Math.round((earnedCount / BADGES.length) * 100) + '%', transition: 'width 0.3s' } })
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              BADGES.map(function(b) {
                var earned = !!earnedBadges[b.id];
                return h('div', {
                  key: b.id,
                  style: { padding: 14, borderRadius: 12, background: earned ? '#0f172a' : '#0f172a88', border: '1px solid ' + (earned ? ACCENT_MED : '#1e293b'), textAlign: 'center', opacity: earned ? 1 : 0.5, transition: 'all 0.2s' }
                },
                  h('div', { style: { fontSize: 30 } }, earned ? b.icon : '\uD83D\uDD12'),
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: earned ? '#f1f5f9' : '#64748b', marginTop: 6 } }, b.name),
                  h('div', { style: { fontSize: 10, color: '#cbd5e1', marginTop: 3 } }, b.desc),
                  earned && h('div', { style: { fontSize: 11, color: '#4ade80', marginTop: 4 } }, '\u2705 Earned ' + new Date(earnedBadges[b.id]).toLocaleDateString())
                );
              })
            ),
            // Affirming footer
            h('div', {
              style: { marginTop: 20, padding: '12px 14px', borderRadius: 10, background: ACCENT_DIM, textAlign: 'center', fontSize: 12, color: ACCENT, fontWeight: 500, lineHeight: '1.5' }
            }, '\uD83D\uDEE1\uFE0F Learning about safety is one of the most important things you can do. Every badge represents knowledge that helps protect you and others.')
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── AI Safety Coach ──
        // ══════════════════════════════════════════════════════════
        // (Integrated into Learn tab via callGemini when available)

        // ══════════════════════════════════════════════════════════
        // ── Final Render ──
        // ══════════════════════════════════════════════════════════
        var content = learnContent || digitalContent || circleContent || scenariosContent || assertiveContent || quizContent || flagsContent || emergencyContent || planContent || badgesContent;

        return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
          tabBar,
          badgePopup,
          h('div', { style: { flex: 1, overflow: 'auto' } }, content)
        );
      })();
    }
  });
})();

console.log('[SelHub] sel_tool_safety.js loaded');
