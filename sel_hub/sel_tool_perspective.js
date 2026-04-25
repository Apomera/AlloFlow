// ═══════════════════════════════════════════════════════════════
// sel_tool_perspective.js — Perspective-Taking Lab Plugin (v1.0)
// Scenario theater, viewpoint swap, empathy mapping, hidden
// feelings detection, and AI perspective coach.
// Registered tool ID: "perspective"
// Category: social-awareness
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
    if (document.getElementById('allo-live-perspective')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-perspective';
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
  function sfxSwap() { playTone(440, 0.08, 'sine', 0.06); setTimeout(function() { playTone(660, 0.08, 'sine', 0.06); }, 60); setTimeout(function() { playTone(440, 0.12, 'sine', 0.07); }, 140); }

  // ══════════════════════════════════════════════════════════════
  // ── Scenario Theater Data ──
  // Students read a scenario and identify how each character feels
  // ══════════════════════════════════════════════════════════════
  var SCENARIOS = {
    elementary: [
      { id: 'e1', title: 'The New Kid',
        story: 'Maya just moved to a new school. At lunch, she sits at the end of a table by herself. A group of kids nearby are laughing and talking. One of them, James, notices Maya sitting alone.',
        characters: [
          { name: 'Maya', emoji: '\uD83D\uDE1F', question: 'How do you think Maya feels sitting alone?', feelings: ['lonely', 'nervous', 'scared'], best: 'Maya probably feels lonely and nervous. Everything is new and she doesn\'t know anyone yet.' },
          { name: 'James', emoji: '\uD83E\uDD14', question: 'What might James be thinking when he sees Maya?', feelings: ['curious', 'unsure', 'concerned'], best: 'James might feel unsure about what to do. He notices something isn\'t right but has to decide whether to act.' }
        ] },
      { id: 'e2', title: 'The Broken Tower',
        story: 'Liam spent all of free time building a tall block tower. He\'s really proud of it. Then Sofia runs past and accidentally knocks it over. She didn\'t mean to — she was rushing to get her jacket.',
        characters: [
          { name: 'Liam', emoji: '\uD83D\uDE22', question: 'How does Liam feel when his tower falls?', feelings: ['sad', 'frustrated', 'angry'], best: 'Liam feels sad and frustrated because he worked hard on something and it got destroyed. He might also feel angry even though it was an accident.' },
          { name: 'Sofia', emoji: '\uD83D\uDE30', question: 'How does Sofia feel after knocking the tower over?', feelings: ['sorry', 'embarrassed', 'worried'], best: 'Sofia probably feels sorry and embarrassed. She didn\'t mean to do it, and now she\'s worried Liam is upset with her.' }
        ] },
      { id: 'e3', title: 'The Team Captain',
        story: 'The teacher says the class will pick team captains for field day. Everyone votes. Zara gets picked as captain, but her best friend Kai doesn\'t get picked at all.',
        characters: [
          { name: 'Zara', emoji: '\uD83D\uDE04', question: 'How does Zara feel about being captain?', feelings: ['happy', 'proud', 'worried'], best: 'Zara feels happy and proud, but she might also feel worried about her friend Kai\'s feelings.' },
          { name: 'Kai', emoji: '\uD83D\uDE1E', question: 'How does Kai feel about not being picked?', feelings: ['disappointed', 'jealous', 'left out'], best: 'Kai might feel disappointed and left out. He might even feel a little jealous of Zara, even though she\'s his friend.' }
        ] },
      { id: 'e4', title: 'The Wrong Answer',
        story: 'During class, the teacher asks a question. Aiden raises his hand and gives an answer, but it\'s wrong. A few kids giggle. The teacher says "Good try, but let\'s think about it differently."',
        characters: [
          { name: 'Aiden', emoji: '\uD83D\uDE33', question: 'How does Aiden feel after getting the wrong answer?', feelings: ['embarrassed', 'small', 'brave'], best: 'Aiden feels embarrassed that kids laughed. But he was also brave for trying — raising your hand takes courage.' },
          { name: 'The kids who giggled', emoji: '\uD83D\uDE06', question: 'Why did the other kids laugh? How might they feel later?', feelings: ['amused', 'guilty', 'nervous'], best: 'They laughed without thinking. Later they might feel guilty, or nervous about raising their own hands in case the same thing happens to them.' }
        ] },
      { id: 'e5', title: 'The Birthday Party',
        story: 'Emma is handing out birthday party invitations. She gives one to almost everyone in class, but not to Riley. Riley sees everyone else getting invitations.',
        characters: [
          { name: 'Riley', emoji: '\uD83D\uDE22', question: 'How does Riley feel watching everyone get invitations?', feelings: ['hurt', 'confused', 'rejected'], best: 'Riley feels hurt and confused. Being the only one left out sends a strong message, even if Emma didn\'t mean it that way.' },
          { name: 'Emma', emoji: '\uD83D\uDE10', question: 'Do you think Emma realizes how Riley feels?', feelings: ['unaware', 'uncomfortable', 'conflicted'], best: 'Emma might not even realize Riley noticed. Or she might feel uncomfortable because she can only invite a certain number of kids but knows leaving someone out hurts.' }
        ] },
      { id: 'e6', title: 'The Shared Crayon',
        story: 'There\'s only one red crayon left and both Mia and Devon need it for their art project. Devon grabs it first. Mia says, "Hey! I need that!"',
        characters: [
          { name: 'Mia', emoji: '\uD83D\uDE20', question: 'Why is Mia upset?', feelings: ['frustrated', 'helpless', 'rushed'], best: 'Mia feels frustrated because she needs the crayon too and it feels unfair that Devon just grabbed it. She might feel helpless about finishing her project.' },
          { name: 'Devon', emoji: '\uD83D\uDE15', question: 'How might Devon feel when Mia speaks up?', feelings: ['surprised', 'defensive', 'guilty'], best: 'Devon might feel surprised — he didn\'t think about Mia needing it. He might feel defensive ("I got it first!") or guilty about grabbing without asking.' }
        ] },
      { id: 'e7', title: 'The Whisper',
        story: 'During silent reading, Nora sees two classmates whispering and looking in her direction. They stop talking when she looks up. They were actually talking about a surprise party for another friend.',
        characters: [
          { name: 'Nora', emoji: '\uD83D\uDE1F', question: 'What does Nora think is happening?', feelings: ['paranoid', 'excluded', 'self-conscious'], best: 'Nora assumes they\'re talking about her. When people whisper and look, our brains jump to the worst explanation. She feels self-conscious and starts wondering what\'s wrong with her.' },
          { name: 'The whispering friends', emoji: '\uD83E\uDD2B', question: 'Do the friends realize how their whispering looks?', feelings: ['oblivious', 'excited', 'secretive'], best: 'They\'re excited about the surprise party and have no idea how their behavior looks to Nora. Sometimes the most innocent actions can look hurtful from the outside.' }
        ] },
      { id: 'e8', title: 'The Snack Trade',
        story: 'At lunch, everyone is trading snacks. Omar has a homemade dish his mom made. A kid says, "Ew, what IS that? It looks weird." Omar\'s food is a traditional dish from his family\'s culture.',
        characters: [
          { name: 'Omar', emoji: '\uD83D\uDE1E', question: 'How does Omar feel when someone calls his food weird?', feelings: ['ashamed', 'angry', 'protective'], best: 'Omar feels ashamed — the comment insults not just his lunch but his family and culture. He might also feel angry and protective of his mom, who made it with love.' },
          { name: 'The commenting kid', emoji: '\uD83D\uDE2E', question: 'Did the kid mean to be hurtful?', feelings: ['curious', 'thoughtless', 'surprised'], best: 'They probably didn\'t mean to be hurtful — they\'ve just never seen this food before. But impact matters more than intent. Calling someone\'s food "weird" says "your normal isn\'t normal."' }
        ] },
      { id: 'e9', title: 'The Helper',
        story: 'Ms. Chen asks Tyler to help a younger student with reading. Tyler\'s friends tease him: "Ooh, teacher\'s pet!" Tyler actually really enjoys helping younger kids.',
        characters: [
          { name: 'Tyler', emoji: '\uD83D\uDE15', question: 'What conflict is Tyler feeling?', feelings: ['proud', 'embarrassed', 'torn'], best: 'Tyler is proud that the teacher trusts him AND embarrassed by the teasing. He\'s torn between something he enjoys and his friends\' approval. That\'s a hard place to be.' },
          { name: 'The teasing friends', emoji: '\uD83D\uDE04', question: 'Why do the friends tease Tyler?', feelings: ['jealous', 'playful', 'insecure'], best: 'They might be a little jealous that Tyler got special attention, or they might genuinely think it\'s funny. Sometimes teasing covers up insecurity about not being chosen themselves.' }
        ] },
      { id: 'e10', title: 'The Drawing',
        story: 'Lily draws a picture of her family for a class project. Her picture shows two moms. Another student says, "That\'s not a real family." The teacher hasn\'t noticed yet.',
        characters: [
          { name: 'Lily', emoji: '\uD83D\uDE22', question: 'How does Lily feel when her family is questioned?', feelings: ['hurt', 'confused', 'defensive'], best: 'Lily feels deeply hurt because someone just told her that the people she loves most aren\'t "real." She might feel confused about why her family is different, or defensive and angry.' },
          { name: 'The other student', emoji: '\uD83E\uDD28', question: 'Where does the other student\'s comment come from?', feelings: ['confused', 'certain', 'repeating'], best: 'They\'re probably repeating something they\'ve heard at home. They\'re not being intentionally cruel — they genuinely don\'t understand yet that families come in many forms. But the harm is real.' }
        ] }
    ],
    middle: [
      { id: 'm1', title: 'The Group Chat',
        story: 'Alex discovers that several friends have a group chat that he was never added to. He finds out when someone accidentally references a joke from it during lunch. Everyone goes quiet when they realize Alex doesn\'t know what they\'re talking about.',
        characters: [
          { name: 'Alex', emoji: '\uD83D\uDE15', question: 'What goes through Alex\'s mind in that moment?', feelings: ['betrayed', 'confused', 'embarrassed'], best: 'Alex feels a mix of betrayal and embarrassment. The worst part isn\'t just being excluded — it\'s finding out publicly, and realizing everyone else already knew.' },
          { name: 'The friend who slipped', emoji: '\uD83D\uDE2C', question: 'How does the friend who accidentally mentioned it feel?', feelings: ['guilty', 'panicked', 'awkward'], best: 'They feel instant panic and guilt. They didn\'t mean to reveal the secret, and now they\'re caught between loyalty to the group chat and empathy for Alex.' },
          { name: 'The rest of the group', emoji: '\uD83D\uDE36', question: 'Why does the table go silent?', feelings: ['uncomfortable', 'guilty', 'avoidant'], best: 'The silence is collective guilt. They know the exclusion was wrong, and being caught forces them to confront something they\'d been avoiding thinking about.' }
        ] },
      { id: 'm2', title: 'The Copied Homework',
        story: 'Priya worked really hard on her science report. The next day, she sees that Marcus turned in a report that looks almost identical to hers. When she confronts him, Marcus says, "I just used your ideas as a starting point."',
        characters: [
          { name: 'Priya', emoji: '\uD83D\uDE24', question: 'What does Priya feel beyond just being angry?', feelings: ['violated', 'devalued', 'conflicted'], best: 'Priya feels her effort was stolen and devalued. She\'s also conflicted — telling a teacher could get Marcus in real trouble, but staying quiet feels like accepting it.' },
          { name: 'Marcus', emoji: '\uD83D\uDE13', question: 'What might have led Marcus to copy? How does he feel now?', feelings: ['desperate', 'ashamed', 'defensive'], best: 'Marcus might have been struggling or overwhelmed. Now he feels ashamed but is using defensiveness ("just a starting point") to avoid facing what he did.' }
        ] },
      { id: 'm3', title: 'The Tryout Results',
        story: 'Best friends Jordan and Taylor both tried out for the basketball team. Jordan made the team; Taylor didn\'t. Jordan is excited but hesitant to celebrate. Taylor says "Congrats" but her voice is flat.',
        characters: [
          { name: 'Jordan', emoji: '\uD83D\uDE42', question: 'Why can\'t Jordan fully celebrate?', feelings: ['happy', 'guilty', 'torn'], best: 'Jordan is genuinely happy but feels guilty about it. Celebrating feels like rubbing it in. Being torn between joy and loyalty is a uniquely painful position.' },
          { name: 'Taylor', emoji: '\uD83D\uDE14', question: 'What\'s behind Taylor\'s flat "Congrats"?', feelings: ['hurt', 'jealous', 'trying'], best: 'Taylor is genuinely trying to be supportive — saying congrats is real effort. But underneath, she feels hurt and jealous. The flat voice reveals the gap between what she wants to feel and what she actually feels.' }
        ] },
      { id: 'm4', title: 'The Lunch Table Shift',
        story: 'Destiny has sat with the same group at lunch all year. One day she comes to the table and everyone has moved — they\'re sitting with some older kids now. There\'s no seat left. Someone calls out, "Oh hey, we just moved over here!"',
        characters: [
          { name: 'Destiny', emoji: '\uD83D\uDE1F', question: 'What makes this hurt even though nobody said anything mean?', feelings: ['abandoned', 'anxious', 'invisible'], best: 'Nobody was cruel, but the message is clear: she wasn\'t important enough to be told about the move, or to have a seat saved. Being forgotten hurts differently than being rejected.' },
          { name: 'The group', emoji: '\uD83E\uDD37', question: 'Did the group mean to exclude Destiny?', feelings: ['oblivious', 'careless', 'defensive'], best: 'They probably didn\'t think about it at all — which is its own kind of problem. Not intending to hurt someone doesn\'t undo the hurt. Carelessness and cruelty can feel the same from the receiving end.' }
        ] },
      { id: 'm5', title: 'The Rumor',
        story: 'Someone started a rumor about Nate that isn\'t true. By third period, multiple people have asked him about it. His friend Sam heard the rumor but didn\'t start it — and didn\'t correct it either.',
        characters: [
          { name: 'Nate', emoji: '\uD83D\uDE21', question: 'What is Nate experiencing beyond anger?', feelings: ['powerless', 'humiliated', 'distrustful'], best: 'Nate feels powerless — you can\'t un-spread a rumor. The humiliation comes from everyone knowing something about you (even something false). He may start wondering who he can actually trust.' },
          { name: 'Sam', emoji: '\uD83D\uDE16', question: 'Why didn\'t Sam correct the rumor? How does that feel?', feelings: ['cowardly', 'conflicted', 'guilty'], best: 'Sam was probably afraid of social consequences — correcting a rumor means going against the crowd. He knows he should have spoken up, and the guilt of inaction can be heavier than the guilt of action.' }
        ] },
      { id: 'm6', title: 'The Read Receipt',
        story: 'Kayla texted her friend Jada about something important two hours ago. The message shows "Read" but Jada hasn\'t replied. Kayla sends "???". Jada was actually in a family emergency and couldn\'t respond.',
        characters: [
          { name: 'Kayla', emoji: '\uD83D\uDE24', question: 'What is Kayla\'s brain telling her about the silence?', feelings: ['ignored', 'anxious', 'angry'], best: 'Kayla\'s brain fills the silence with the worst interpretation: she\'s being ignored. Read receipts turn normal response delays into perceived rejections. The "???" is anxiety disguised as frustration.' },
          { name: 'Jada', emoji: '\uD83D\uDE16', question: 'How will Jada feel when she sees the "???"?', feelings: ['overwhelmed', 'guilty', 'frustrated'], best: 'Jada is dealing with something real and now has the added pressure of Kayla\'s frustration. She may feel guilty for not responding AND frustrated that she has to manage someone else\'s feelings while handling a crisis.' }
        ] },
      { id: 'm7', title: 'The Accent',
        story: 'New student Mei gives a presentation. She has an accent. Two students in the back mimic her pronunciation and laugh quietly. The teacher doesn\'t hear it, but another student, Jaylen, does.',
        characters: [
          { name: 'Mei', emoji: '\uD83D\uDE14', question: 'Does Mei know they\'re mocking her?', feelings: ['vulnerable', 'humiliated', 'shrinking'], best: 'Mei may not hear the exact mockery but she can feel the energy shift. Presenting in a second language already takes immense courage. Mockery confirms her worst fear: that her difference is a joke.' },
          { name: 'Jaylen (bystander)', emoji: '\uD83D\uDE16', question: 'What is Jaylen weighing in that moment?', feelings: ['angry', 'scared', 'responsible'], best: 'Jaylen sees the injustice and feels angry, but speaking up means potential social backlash. The bystander\'s dilemma: moral clarity vs. social safety. Silence is easier but heavier.' },
          { name: 'The mocking students', emoji: '\uD83D\uDE0F', question: 'What drives the mockery?', feelings: ['entertained', 'insecure', 'bonding'], best: 'Mocking creates in-group bonding at someone else\'s expense. It may come from insecurity — making someone else seem lesser makes you feel higher. The shared cruelty creates a false sense of connection.' }
        ] },
      { id: 'm8', title: 'The Disability Accommodation',
        story: 'Maya gets extra time on tests because of her ADHD. During a hard exam, another student, Derek, sees Maya still working after time is called. He whispers to his friend, "Must be nice to get extra time. Some of us actually have to finish on time."',
        characters: [
          { name: 'Maya', emoji: '\uD83D\uDE14', question: 'What makes this comment especially painful?', feelings: ['self-conscious', 'ashamed', 'frustrated'], best: 'Maya didn\'t ask for ADHD. The accommodation doesn\'t make the test easier — it levels the playing field. Derek\'s comment turns a medical necessity into a privilege, making Maya feel like she\'s cheating at something she\'s already struggling with.' },
          { name: 'Derek', emoji: '\uD83D\uDE12', question: 'Is Derek\'s frustration understandable?', feelings: ['frustrated', 'envious', 'uninformed'], best: 'Derek\'s frustration with a hard test is real. But he\'s directing it at Maya instead of the test itself. He doesn\'t understand that an invisible disability means invisible struggles — the accommodation compensates for something he can\'t see.' }
        ] },
      { id: 'm9', title: 'The Viral Moment',
        story: 'During gym, Zoe trips and falls while trying to do a dance move. Someone films it and posts it with a laughing emoji. By lunchtime, 200 people have seen it. Someone comments "iconic" as a compliment, but Zoe doesn\'t see it that way.',
        characters: [
          { name: 'Zoe', emoji: '\uD83D\uDE2D', question: 'Why is a viral embarrassment different from a regular one?', feelings: ['mortified', 'violated', 'powerless'], best: 'Regular embarrassment fades in a day. A viral moment is preserved forever, seen by people she doesn\'t know, and completely outside her control. She was filmed without consent during her most vulnerable moment. "Iconic" doesn\'t undo the violation.' },
          { name: 'The person who filmed', emoji: '\uD83D\uDCF1', question: 'Did they think they were doing something wrong?', feelings: ['amused', 'thoughtless', 'excited'], best: 'They probably thought it was harmlessly funny. Social media normalizes turning other people\'s moments into content. They didn\'t ask consent, didn\'t consider impact, and didn\'t realize that what\'s entertaining to post can be devastating to live.' }
        ] }
    ],
    high: [
      { id: 'h1', title: 'The College Conversation',
        story: 'In AP English, students are discussing college plans. Vanessa shares she got into her dream school with a full scholarship. Marcus, who can\'t afford to apply to four-year colleges and plans to attend community college, listens quietly. Another student says, "Community college is basically just high school 2.0."',
        characters: [
          { name: 'Marcus', emoji: '\uD83D\uDE10', question: 'What layers of feeling is Marcus navigating?', feelings: ['ashamed', 'angry', 'determined'], best: 'Marcus feels the sting of classism disguised as casual conversation. He\'s angry at the dismissal of his path, ashamed that financial constraints shape his options, and potentially determined to prove the comment wrong — all simultaneously.' },
          { name: 'Vanessa', emoji: '\uD83D\uDE15', question: 'How might Vanessa feel in this moment?', feelings: ['uncomfortable', 'privileged', 'empathetic'], best: 'Vanessa may feel the discomfort of privilege — her achievement suddenly feels tangled with advantages Marcus doesn\'t have. She might want to say something but fears making it worse.' },
          { name: 'The student who commented', emoji: '\uD83E\uDD28', question: 'What does the comment reveal about their perspective?', feelings: ['ignorant', 'insecure', 'entitled'], best: 'The comment reveals an unexamined assumption that one educational path is superior. It may come from genuine ignorance about financial barriers, or from insecurity about their own path masked as superiority.' }
        ] },
      { id: 'h2', title: 'The Coming Out',
        story: 'Jamie comes out to their close friend group. Most are supportive, but one friend, Chris, says "I\'m cool with it, I just don\'t want you to, like, hit on me or anything." Another friend, Dana, says nothing at all.',
        characters: [
          { name: 'Jamie', emoji: '\uD83D\uDE1F', question: 'What does Jamie hear underneath Chris\'s words?', feelings: ['reduced', 'vulnerable', 'exhausted'], best: 'Jamie shared something deeply personal and was immediately reduced to a sexual threat. The vulnerability of coming out was met with a boundary that reveals a stereotype. Even "supportive" responses can carry harm.' },
          { name: 'Chris', emoji: '\uD83E\uDD14', question: 'Is Chris trying to be supportive? What\'s behind his comment?', feelings: ['uncomfortable', 'well-meaning', 'ignorant'], best: 'Chris thinks he\'s being accepting — he said "I\'m cool with it." But the second half reveals discomfort he hasn\'t examined. He\'s centering his own feelings in someone else\'s moment of vulnerability.' },
          { name: 'Dana', emoji: '\uD83D\uDE36', question: 'What might Dana\'s silence mean?', feelings: ['processing', 'conflicted', 'afraid'], best: 'Dana\'s silence could mean many things: processing, internal conflict between personal beliefs and loyalty, fear of saying the wrong thing, or genuine acceptance that doesn\'t need words. Silence is ambiguous — and ambiguity is hard for the person who just made themselves vulnerable.' }
        ] },
      { id: 'h3', title: 'The Accusation',
        story: 'A teacher accuses Amara of cheating because her test score improved dramatically. Amara actually studied for hours with a tutor. The teacher says, "This kind of improvement doesn\'t happen overnight." Amara\'s classmate, who also improved but wasn\'t questioned, watches the exchange.',
        characters: [
          { name: 'Amara', emoji: '\uD83D\uDE24', question: 'What makes this accusation particularly painful?', feelings: ['devalued', 'profiled', 'powerless'], best: 'Amara\'s hard work was erased by an assumption. If she\'s a student of color and the unquestioned classmate isn\'t, the accusation carries the weight of systemic bias — even if the teacher doesn\'t intend it. Her improvement was real; the distrust was a choice.' },
          { name: 'The teacher', emoji: '\uD83D\uDE1F', question: 'What might the teacher believe they\'re doing?', feelings: ['protective', 'biased', 'certain'], best: 'The teacher likely believes they\'re maintaining academic integrity. But the selective questioning reveals implicit bias — whose improvement is "suspicious" and whose is "impressive" is a judgment shaped by assumptions, not evidence.' },
          { name: 'The unquestioned classmate', emoji: '\uD83D\uDE36', question: 'What responsibility does the bystander have?', feelings: ['uncomfortable', 'relieved', 'complicit'], best: 'They benefit from the double standard without earning it. Staying silent is comfortable but complicit. Speaking up — "I improved too and wasn\'t questioned" — could expose the bias, but it requires risking their own standing.' }
        ] },
      { id: 'h4', title: 'The Mental Health Disclosure',
        story: 'In a class discussion about stress, Rowan mentions they take medication for anxiety. Later, a classmate jokes to someone else, "Don\'t stress Rowan out, they might have a breakdown." The joke gets back to Rowan.',
        characters: [
          { name: 'Rowan', emoji: '\uD83D\uDE14', question: 'What does this experience teach Rowan about vulnerability?', feelings: ['regretful', 'stigmatized', 'guarded'], best: 'Rowan shared something real and it was weaponized as a joke. The lesson they\'re learning — that vulnerability gets punished — is exactly the wrong lesson, but it\'s the one this experience teaches. They may never disclose again.' },
          { name: 'The joking classmate', emoji: '\uD83D\uDE0F', question: 'What drives someone to make that joke?', feelings: ['deflecting', 'uncomfortable', 'cruel'], best: 'The joke converts someone else\'s vulnerability into social currency. It may come from discomfort with mental health topics, a need to perform toughness, or simple cruelty. The impact is the same regardless of intent.' }
        ] },
      { id: 'h5', title: 'The Group Project',
        story: 'In a group project, Yusuf does most of the work while two teammates contribute minimally. When the project gets an A, the teacher praises the whole group equally. One teammate posts on social media: "We killed that project!"',
        characters: [
          { name: 'Yusuf', emoji: '\uD83D\uDE12', question: 'What is Yusuf weighing when he decides whether to speak up?', feelings: ['resentful', 'unappreciated', 'calculating'], best: 'Yusuf is weighing fairness against social cost. Speaking up means being labeled "difficult" or "not a team player." Staying silent means swallowing resentment. Both options have a price — he\'s choosing which price he can afford.' },
          { name: 'The teammates', emoji: '\uD83D\uDE0C', question: 'Do the teammates genuinely believe they contributed equally?', feelings: ['self-deceived', 'entitled', 'comfortable'], best: 'People are remarkably good at inflating their own contributions. They may genuinely remember their minimal input as significant — cognitive bias protects the ego. The social media post isn\'t necessarily cynical; it may be sincere self-deception.' }
        ] },
      { id: 'h6', title: 'The Valedictorian Speech',
        story: 'Sofia, the valedictorian, thanks "everyone who helped me get here" in her graduation speech. Her younger brother Miguel, who has a learning disability, sits in the audience knowing that their parents spent most of their time, money, and energy on Sofia\'s academic career. He\'s proud of her — and invisible.',
        characters: [
          { name: 'Sofia', emoji: '\uD83D\uDE0A', question: 'Is Sofia aware of the disparity?', feelings: ['proud', 'oblivious', 'grateful'], best: 'Sofia\'s gratitude is genuine but her awareness may not extend to what her success cost others in the family. Achievement can create a blind spot — when you\'re on the pedestal, it\'s hard to see who\'s in its shadow.' },
          { name: 'Miguel', emoji: '\uD83D\uDE14', question: 'What does Miguel carry that nobody sees?', feelings: ['proud', 'invisible', 'resentful'], best: 'Miguel holds two truths at once: genuine pride in his sister and genuine pain at his own invisibility. His learning disability already makes him feel less-than; the family\'s investment patterns confirm it. Love and resentment coexist.' },
          { name: 'The parents', emoji: '\uD83D\uDE15', question: 'Are the parents aware of the imbalance?', feelings: ['proud', 'guilty', 'justified'], best: 'They may rationalize it as investing where the "return" is highest. Or they may not have realized the imbalance at all — the squeaky wheel gets the grease, and high achievers generate their own momentum. Either way, Miguel\'s needs went under-served.' }
        ] },
      { id: 'h7', title: 'The Internship',
        story: 'Two seniors apply for a prestigious summer internship. Elena got it through her mom\'s professional connection. Darius applied cold, had three interviews, and was rejected. Elena posts about it: "So excited to announce..."',
        characters: [
          { name: 'Darius', emoji: '\uD83D\uDE12', question: 'What does Darius feel beyond disappointment?', feelings: ['cheated', 'systemic-anger', 'self-doubting'], best: 'Darius played by the rules and lost to someone who had a different set of rules. The rejection isn\'t just personal — it\'s a window into how systems reproduce advantage. He may start wondering if merit actually matters.' },
          { name: 'Elena', emoji: '\uD83D\uDE42', question: 'Does Elena owe Darius anything?', feelings: ['excited', 'unaware', 'defensive'], best: 'Elena didn\'t create the system of connections. But benefiting from it without acknowledging it — posting as if she simply "earned" it — erases the structural advantage. She\'s not wrong to be excited. But framing matters.' }
        ] },
      { id: 'h8', title: 'The Teacher\'s Favorite',
        story: 'Ms. Reyes clearly has a favorite student, Isaiah, who gets more patience, better feedback, and second chances on assignments. Other students notice. When Fatima makes the same mistake Isaiah made last week, she gets points deducted. Isaiah notices the double standard.',
        characters: [
          { name: 'Fatima', emoji: '\uD83D\uDE24', question: 'What does differential treatment teach students?', feelings: ['unjustly-treated', 'invisible', 'disillusioned'], best: 'Fatima is learning that fairness is a myth. Worse, she\'s internalizing that she matters less. When authority figures play favorites, it doesn\'t just affect grades — it shapes how students see their own worth.' },
          { name: 'Isaiah', emoji: '\uD83D\uDE13', question: 'What is it like to be the favorite?', feelings: ['uncomfortable', 'guilty', 'trapped'], best: 'Being the favorite sounds good until you realize it isolates you from peers and makes your achievements suspect. Isaiah may wonder: did I earn this, or was it given to me? And if he speaks up, he loses his advantage.' },
          { name: 'Ms. Reyes', emoji: '\uD83E\uDD14', question: 'Is Ms. Reyes aware of her favoritism?', feelings: ['unconscious', 'defensive', 'well-meaning'], best: 'Most favoritism is unconscious — driven by affinity bias, shared personality traits, or cultural familiarity. If confronted, she\'d likely deny it. Acknowledging bias requires self-awareness that most people resist because it threatens their self-concept as fair.' }
        ] },
      { id: 'h9', title: 'The Recovery',
        story: 'After being sober for four months, Lena\'s mom relapses. Lena comes to school the next day acting completely normal. Her best friend Kira has no idea. In English class, they read a story about a family dealing with addiction. Lena asks to go to the bathroom.',
        characters: [
          { name: 'Lena', emoji: '\uD83D\uDE14', question: 'What does "acting normal" cost Lena?', feelings: ['terrified', 'alone', 'performing'], best: 'Every smile is an act. Every "I\'m good" is a lie told out of survival, not deception. Lena can\'t share this because addiction carries stigma, because she doesn\'t want pity, because explaining would make it real. The bathroom escape is the only honest moment she allows herself.' },
          { name: 'Kira', emoji: '\uD83D\uDE42', question: 'What does Kira not know, and what would she want to know?', feelings: ['unaware', 'caring', 'helpless'], best: 'Kira can\'t help with what she doesn\'t know exists. If she did know, she might feel helpless — what do you say to that? But presence doesn\'t require solutions. Sometimes the most important thing is just knowing someone is carrying something heavy.' }
        ] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Viewpoint Swap Data ──
  // Same situation told from two different perspectives
  // ══════════════════════════════════════════════════════════════
  var VIEWPOINT_SWAPS = {
    elementary: [
      { id: 'vs1', title: 'The Swing',
        situation: 'Two kids both want the last open swing at recess.',
        perspectives: [
          { name: 'Aisha', emoji: '\uD83D\uDE20', view: 'I was walking to the swings first! I\'ve been waiting all week to swing because it\'s been raining. This is my turn and it\'s not fair if someone else takes it.' },
          { name: 'Ben', emoji: '\uD83D\uDE22', view: 'I\'m having a really bad day. My mom yelled this morning and I forgot my lunch. All I want is to swing because it makes me feel better. I didn\'t even see Aisha walking over.' }
        ],
        insight: 'Both kids have valid reasons for wanting the swing. Aisha sees fairness (she was first). Ben needs comfort (he\'s having a hard day). Neither is wrong — they just can\'t see each other\'s full picture.' },
      { id: 'vs2', title: 'The Partner Project',
        situation: 'A student picks a different partner than their usual friend.',
        perspectives: [
          { name: 'Leo', emoji: '\uD83D\uDE04', view: 'I picked Marcus for the project because we both love dinosaurs and the project is about animals. I thought it would be really fun! I\'ll still play with Jake at recess.' },
          { name: 'Jake', emoji: '\uD83D\uDE22', view: 'Leo always picks me and I always pick him. We\'re best friends. But today he picked Marcus and I feel like maybe he doesn\'t want to be my friend anymore. What did I do wrong?' }
        ],
        insight: 'Leo made a choice based on the project — it wasn\'t about friendship at all. But Jake interpreted it through the lens of friendship because that\'s what matters most to him right now. The same action meant completely different things to each person.' },
      { id: 'vs3', title: 'The Loud Classroom',
        situation: 'A teacher raises her voice to quiet the class.',
        perspectives: [
          { name: 'Mrs. Garcia', emoji: '\uD83D\uDE23', view: 'I asked them to quiet down three times already. I have a headache and I\'m trying to help the reading group. I didn\'t mean to yell — it just came out because I\'m frustrated and tired.' },
          { name: 'Sophie', emoji: '\uD83D\uDE28', view: 'Mrs. Garcia yelled at us and it scared me. My dad yells at home sometimes and it makes my stomach hurt. I wasn\'t even being loud — I was just whispering to my neighbor about the assignment.' }
        ],
        insight: 'The teacher was frustrated with the whole class, not Sophie specifically. But Sophie has experiences that make raised voices feel scary and personal. What felt like a necessary correction to the teacher felt like a threat to Sophie.' },
      { id: 'vs3b', title: 'The Slow Walker',
        situation: 'An older student is stuck behind a younger student walking slowly in the hallway.',
        perspectives: [
          { name: 'The older student', emoji: '\uD83D\uDE24', view: 'I have 4 minutes between classes and this kid is walking like he has nowhere to be. My locker is at the other end of the building and if I\'m late one more time I get detention. Just MOVE.' },
          { name: 'The younger student', emoji: '\uD83D\uDE28', view: 'This school is so big. There are so many people. Everyone is bigger than me and moving so fast. I\'m trying to find room 204 and I don\'t want to look at my schedule because then everyone will know I\'m new. I just want to be invisible.' }
        ],
        insight: 'The older student sees an obstacle. The younger student is navigating a world that feels overwhelming. Both are dealing with time pressure — one measured in minutes, the other measured in survival.' },
      { id: 'vs3c', title: 'The Report Card',
        situation: 'A student brings home a report card with all B\'s.',
        perspectives: [
          { name: 'The student', emoji: '\uD83D\uDE04', view: 'I worked SO hard this semester! Last time I had two C\'s and a D. I brought everything up to B\'s. This is the best I\'ve ever done. I can\'t wait to show Mom!' },
          { name: 'The parent', emoji: '\uD83D\uDE1E', view: 'All B\'s again. I know my kid is smart enough for A\'s. I don\'t want to seem disappointed but I keep thinking about how competitive college admissions are. I want to celebrate the improvement but I also need to push them to reach their potential.' }
        ],
        insight: 'The student is measuring from where they started (D\'s). The parent is measuring against where they want to end (A\'s). Both reference points are valid, but one produces pride and the other produces pressure. When the reference points don\'t match, celebration and disappointment collide.' }
    ],
    middle: [
      { id: 'vs4', title: 'The Instagram Post',
        situation: 'A group photo is posted online, but one person is cropped out.',
        perspectives: [
          { name: 'Chloe (poster)', emoji: '\uD83D\uDE0A', view: 'I posted the photo because we all looked cute and the lighting was great. I cropped it because my thumb was blocking the edge. I honestly didn\'t even notice Megan was cut off — I was looking at the center of the picture.' },
          { name: 'Megan (cropped)', emoji: '\uD83D\uDE22', view: 'She cropped me out. Out of everyone in that photo, I\'m the one who disappeared. I keep looking at it trying to figure out what she\'s saying — am I not good enough to be in the picture? Does she not want people to know we hang out?' }
        ],
        insight: 'Chloe made a quick, thoughtless editing choice. Megan is reading it as an intentional message about her worth. Social media amplifies these gaps because there\'s no tone of voice, no context, no way to see the harmless reason behind a hurtful-looking action.' },
      { id: 'vs5', title: 'The Substitute Teacher',
        situation: 'A substitute teacher is struggling to manage the class.',
        perspectives: [
          { name: 'Mr. Kim (sub)', emoji: '\uD83D\uDE30', view: 'This is my third day subbing this week and every class has been like this. The lesson plan was confusing, I can\'t find the supplies, and these kids clearly don\'t respect me. I went into teaching because I care about kids. Right now I want to walk out.' },
          { name: 'DeShawn (student)', emoji: '\uD83D\uDE12', view: 'This sub doesn\'t know anything. He put the wrong assignment on the board, he can\'t pronounce anyone\'s name, and he keeps threatening us with detention. Our real teacher would never do this. I\'m not being disrespectful — I just don\'t see why I should follow rules that don\'t make sense.' }
        ],
        insight: 'Both are having a bad experience and both are blaming the other. Mr. Kim sees disrespect; DeShawn sees incompetence. Neither sees the full picture: a nervous adult trying their best, and a student who needs structure to feel safe.' },
      { id: 'vs6', title: 'The Party Invite',
        situation: 'A student decides not to invite their full friend group to a small birthday party.',
        perspectives: [
          { name: 'Jasmine (host)', emoji: '\uD83D\uDE13', view: 'My parents said I can only have 8 people. I have 12 close friends. I spent two days agonizing over who to invite. I didn\'t invite Tanya because she and Grace don\'t get along and I wanted everyone to have fun. I feel terrible about it.' },
          { name: 'Tanya (not invited)', emoji: '\uD83D\uDE1E', view: 'I thought Jasmine and I were close. We text every day. Then I hear about her party from someone else — not even from her. If she had just told me honestly, I would have understood. The secrecy is what hurts most.' }
        ],
        insight: 'Jasmine was trying to protect Tanya from an awkward situation. Tanya would have preferred honesty to silence. The intention was caring; the execution was avoidant. Good intentions don\'t automatically produce good outcomes.' },
      { id: 'vs6b', title: 'The Grade Dispute',
        situation: 'A student argues with a teacher about a grade on an essay.',
        perspectives: [
          { name: 'Aaliyah (student)', emoji: '\uD83D\uDE24', view: 'I put 8 hours into this essay. I followed the rubric exactly. My friend wrote half as much and got a better grade. When I asked why, Mr. Torres said my "analysis wasn\'t deep enough." That\'s completely subjective. How am I supposed to improve if the feedback is vague?' },
          { name: 'Mr. Torres (teacher)', emoji: '\uD83D\uDE23', view: 'I graded 120 essays this weekend. Aaliyah\'s was technically competent but surface-level — she summarized instead of analyzed. She\'s the third student today to challenge a grade, and I know she\'s comparing with her friend, who genuinely did write deeper analysis. I want to help but I\'m exhausted and defensive.' }
        ],
        insight: 'Aaliyah equates effort with quality. Mr. Torres distinguishes between them. Both are frustrated by a system that makes grading feel arbitrary to students and overwhelming to teachers. The real problem isn\'t the grade — it\'s that feedback rarely bridges the gap between what was expected and what was understood.' },
      { id: 'vs6c', title: 'The Foster Kid',
        situation: 'A student in foster care is asked to do a family tree project.',
        perspectives: [
          { name: 'Malik (student)', emoji: '\uD83D\uDE14', view: 'Every class does a family tree project. Every time, I have to decide: do I draw my bio family (who I barely know), my foster family (who might change next month), or just make something up? I asked if I could do a different project and the teacher said, "It\'ll be fun!" She doesn\'t understand that for me, family isn\'t a tree. It\'s a broken map.' },
          { name: 'Ms. Adams (teacher)', emoji: '\uD83D\uDE42', view: 'The family tree project is one of my favorites — kids love it and parents get involved. When Malik asked to do something different, I thought he was just trying to get out of the assignment. I didn\'t think about why he might not want to do it. Now I feel terrible that I dismissed him.' }
        ],
        insight: 'The assignment assumes a stable, knowable, linear family. For many students, family doesn\'t look like that. What feels like a warm, universal activity is actually exclusionary for foster kids, adopted kids, kids with incarcerated parents, kids from non-traditional families. Inclusion means questioning assumptions about what\'s "universal."' }
    ],
    high: [
      { id: 'vs7', title: 'The Scholarship Essay',
        situation: 'Two students apply for the same scholarship — one from a privileged background, one from an underprivileged one.',
        perspectives: [
          { name: 'Claire', emoji: '\uD83D\uDE10', view: 'I worked incredibly hard for my 4.0 GPA. I took 6 AP classes, captained the debate team, and volunteered 200+ hours. People say I had "advantages" but they don\'t see the pressure, the anxiety, the sleepless nights. My achievements are real, even if my starting point was easier.' },
          { name: 'Andre', emoji: '\uD83D\uDE14', view: 'I have a 3.5 GPA while working 25 hours a week to help my mom pay rent. I couldn\'t take AP classes because they conflicted with my work schedule. I didn\'t volunteer — survival isn\'t voluntary. My application looks "weaker" on paper, but the paper doesn\'t show the weight I carry.' }
        ],
        insight: 'Both students worked hard. Both deserve recognition. The system that compares them side by side without accounting for context is the real problem. Claire\'s achievements are genuine; Andre\'s obstacles are invisible on an application form. Understanding both perspectives doesn\'t mean they\'re equally advantaged — it means the comparison itself is incomplete.' },
      { id: 'vs8', title: 'The Pronoun Request',
        situation: 'A student asks a teacher to use they/them pronouns. The teacher makes an effort but keeps making mistakes.',
        perspectives: [
          { name: 'River (student)', emoji: '\uD83D\uDE14', view: 'Every time they say "she" it\'s like a small cut. I know they\'re trying, but after three weeks, it still happens multiple times a day. Correcting them publicly is exhausting and humiliating. I start to wonder if they\'re really trying or if they just say they are.' },
          { name: 'Mrs. Patterson (teacher)', emoji: '\uD83D\uDE23', view: 'I have 150 students and I\'ve been using gendered pronouns for 25 years. I genuinely want to get this right — I practice at home. But in the flow of a lesson, old patterns surface before I can catch them. Every mistake feels like I\'m failing this kid, and the guilt makes me more anxious, which makes me slip more.' }
        ],
        insight: 'River\'s pain is real and cumulative — each mistake adds to a pile. Mrs. Patterson\'s effort is also real — unlearning 25 years of language patterns is genuinely difficult. The gap between intent and impact is where most human suffering lives. Both perspectives need to be held without one canceling the other.' },
      { id: 'vs9', title: 'The Protest',
        situation: 'Students organize a walkout to protest a school policy. Some students participate; others don\'t.',
        perspectives: [
          { name: 'Kai (protesting)', emoji: '\uD83D\uDE24', view: 'This policy is unjust and silence is complicity. Every student who stays in class is choosing comfort over principle. I risk suspension for walking out, and I need to know who actually cares about justice and who just talks about it.' },
          { name: 'Ava (staying)', emoji: '\uD83D\uDE1F', view: 'I agree the policy is wrong. But I have a test today that affects my college applications, and a suspension could cost me my scholarship. I can\'t afford to protest the same way Kai can. My family is counting on me. I\'ll write to the school board tonight, but right now I need to stay.' }
        ],
        insight: 'Kai sees the issue in moral absolutes: you\'re either fighting or complicit. Ava sees it through the lens of competing obligations and unequal stakes. Both care about justice; they disagree about what action looks like when your circumstances constrain your choices. Moral clarity is easier when you have less to lose.' },
      { id: 'vs9b', title: 'The Affirmative Action Debate',
        situation: 'In government class, two students debate whether college admissions should consider race.',
        perspectives: [
          { name: 'Elijah', emoji: '\uD83D\uDE10', view: 'My grandfather couldn\'t attend this state\'s flagship university because of his race. My mother was the first in her family to get a degree. I scored lower than some white classmates on the SAT, but I also worked a job, raised my siblings, and navigated systems they\'ll never see. If the system was built on centuries of exclusion, correction isn\'t unfair — it\'s overdue.' },
          { name: 'Hannah', emoji: '\uD83D\uDE1F', view: 'My family isn\'t wealthy. My dad works two jobs. I studied every day for a year for the SAT. If someone with a lower score gets in over me because of their race, how is that fair to me? I didn\'t cause historical injustice. I\'m just trying to go to college. Shouldn\'t the most qualified person get in, regardless?' }
        ],
        insight: 'Elijah is measuring fairness across generations. Hannah is measuring it within her own life. Both definitions of fairness are internally consistent. The real tension isn\'t between two students — it\'s between two definitions of justice: corrective (repairing historical harm) and distributive (evaluating individuals on current merit). Neither is wrong. Both are incomplete.' },
      { id: 'vs9c', title: 'The Gap Year',
        situation: 'A student announces they\'re taking a gap year instead of going straight to college.',
        perspectives: [
          { name: 'Leo (student)', emoji: '\uD83D\uDE0C', view: 'I\'ve been on the achievement treadmill since kindergarten. I got into a good school but the idea of four more years of classrooms makes me feel nothing. I want to work, travel, figure out what actually matters to me before spending $200,000 on a degree. This is the most intentional decision I\'ve ever made.' },
          { name: 'Leo\'s mother', emoji: '\uD83D\uDE1F', view: 'I didn\'t go to college because I couldn\'t afford to. I worked my whole life so Leo wouldn\'t have to make that choice. Now he\'s choosing not to go? I know he says it\'s temporary, but I\'ve seen "gap years" turn into "gap lives." I\'m terrified he\'s throwing away the opportunity I never had.' }
        ],
        insight: 'Leo is choosing from abundance — he has the option and wants to be intentional. His mother is watching from scarcity — she fought for an opportunity he\'s declining. The same decision looks like wisdom from one vantage point and waste from another. Generational context shapes how we interpret the same choice.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Hidden Feelings Data ──
  // What someone says ≠ what they feel
  // ══════════════════════════════════════════════════════════════
  var HIDDEN_FEELINGS = {
    elementary: [
      { id: 'hf1', situation: 'A kid drops their ice cream cone and their friend asks if they\'re okay.', said: '"It\'s fine. I didn\'t even want it anymore."', realFeeling: 'sad', options: ['happy', 'sad', 'angry', 'bored'], explanation: 'They\'re pretending it doesn\'t matter because they don\'t want to seem like a baby for being upset about ice cream. But losing something you were enjoying really does feel bad.' },
      { id: 'hf2', situation: 'Mom asks how the first day at a new school went.', said: '"It was fine."', realFeeling: 'overwhelmed', options: ['fine', 'overwhelmed', 'excited', 'silly'], explanation: '"Fine" is often a cover word. A first day at a new school is huge and exhausting. They might not have the words for everything they felt, so "fine" is easier than explaining.' },
      { id: 'hf3', situation: 'A student wasn\'t picked for the school play. Their friend got the lead role.', said: '"That\'s awesome! You totally deserve it!"', realFeeling: 'jealous', options: ['happy', 'jealous', 'calm', 'proud'], explanation: 'They genuinely ARE happy for their friend — and also jealous. Both feelings can exist at the same time. Hiding the jealousy is a way to be a good friend, but the feeling is still there.' },
      { id: 'hf4', situation: 'The teacher asks a student to read aloud and they say no.', said: '"I just don\'t feel like it."', realFeeling: 'scared', options: ['lazy', 'scared', 'angry', 'tired'], explanation: 'Saying "I don\'t feel like it" is easier than admitting "I\'m scared I\'ll mess up and everyone will laugh." Fear often hides behind refusal.' },
      { id: 'hf5', situation: 'A kid sees their parent crying.', said: '"I\'m going to go play in my room."', realFeeling: 'worried', options: ['bored', 'happy', 'worried', 'playful'], explanation: 'Children often retreat when they see adults upset — not because they don\'t care, but because they don\'t know how to help and the feelings are too big to sit with.' },
      { id: 'hf5b', situation: 'A student is asked to read their story aloud to the class.', said: '"This story is dumb. I don\'t even like it."', realFeeling: 'afraid', options: ['bored', 'honest', 'afraid', 'angry'], explanation: 'Calling your own work bad before anyone else can is a shield. If you reject it first, nobody else\'s criticism can hurt as much. The real feeling is fear of judgment.' },
      { id: 'hf5c', situation: 'A kid\'s best friend starts playing with someone new at recess.', said: '"I don\'t care. I wanted to play alone anyway."', realFeeling: 'abandoned', options: ['independent', 'happy', 'abandoned', 'calm'], explanation: 'Choosing to be alone and being left alone feel completely different. Saying "I wanted to" turns the pain of being unchosen into a decision, which feels more bearable.' },
      { id: 'hf5d', situation: 'During show and tell, a kid brings something small and plain while others brought fancy toys.', said: '"I was going to bring my tablet but I forgot."', realFeeling: 'embarrassed', options: ['forgetful', 'embarrassed', 'relaxed', 'honest'], explanation: 'The lie protects them from the comparison. They\'re not embarrassed about forgetting — they\'re embarrassed that what they have doesn\'t match what others have. Inventing a better reality is easier than sitting with shame.' }
    ],
    middle: [
      { id: 'hf6', situation: 'After failing a test, a student laughs and shows the grade to friends.', said: '"LOL look how bad I did. I literally didn\'t study at all."', realFeeling: 'ashamed', options: ['amused', 'proud', 'ashamed', 'indifferent'], explanation: 'Making it a joke gives them control over the narrative. If they pretend they didn\'t try, the failure reflects effort, not ability. The laugh protects the part of them that actually cares.' },
      { id: 'hf7', situation: 'A student\'s parents are getting divorced. A friend asks how they\'re doing.', said: '"It\'s whatever. It\'s actually better because they fought all the time."', realFeeling: 'devastated', options: ['relieved', 'indifferent', 'devastated', 'angry'], explanation: 'There might be some truth in it being calmer — AND they can still be devastated. The "whatever" is emotional armor. People rationalize to survive, not because they\'ve actually made peace with it.' },
      { id: 'hf8', situation: 'A student is scrolling through social media seeing everyone at a party they weren\'t invited to.', said: '"I didn\'t even want to go. Those parties are so basic."', realFeeling: 'rejected', options: ['bored', 'superior', 'rejected', 'relieved'], explanation: 'Dismissing something you wanted but couldn\'t have is a classic defense mechanism. Calling it "basic" transforms rejection into superiority, but the sting of being left out is underneath.' },
      { id: 'hf9', situation: 'After being rejected from the team, a student immediately says they\'re going to try a different sport.', said: '"Basketball is kind of boring anyway. I think I\'ll try track."', realFeeling: 'heartbroken', options: ['excited', 'heartbroken', 'bored', 'relieved'], explanation: 'The immediate pivot is a way to skip over the pain. Redirecting to a new goal before processing the loss of the old one is avoidance in action. They might love track — and also still be hurting about basketball.' },
      { id: 'hf10', situation: 'A student who always gets good grades gets a B+ on a paper.', said: '"A B+ is still good. Not everyone can get A\'s all the time."', realFeeling: 'disappointed', options: ['satisfied', 'proud', 'disappointed', 'relaxed'], explanation: 'They\'re coaching themselves with the words they know are "right" — but the perfectionism underneath hasn\'t accepted the B+ yet. Self-talk and self-feeling can be very different.' },
      { id: 'hf10b', situation: 'A student finds out their crush likes someone else.', said: '"Honestly they weren\'t even my type."', realFeeling: 'crushed', options: ['relieved', 'honest', 'crushed', 'indifferent'], explanation: 'Retroactively deciding you didn\'t want what you can\'t have is emotional self-defense. It\'s easier to rewrite the story than to admit you were invested in something that didn\'t choose you back.' },
      { id: 'hf10c', situation: 'A student\'s older sibling leaves for college. Friends ask if they\'ll miss them.', said: '"Nah, I finally get my own room! It\'s gonna be awesome."', realFeeling: 'heartbroken', options: ['excited', 'heartbroken', 'relieved', 'indifferent'], explanation: 'Focusing on the practical benefit (own room) lets them avoid the emotional reality (the person who knows them best is leaving). Excitement about space can coexist with grief about absence, but grief is harder to say out loud.' }
    ],
    high: [
      { id: 'hf11', situation: 'A senior sees their friends celebrating college acceptances while they\'re still waiting.', said: '"I\'m not really stressed about it. Everything works out."', realFeeling: 'terrified', options: ['confident', 'patient', 'terrified', 'apathetic'], explanation: 'Performing calm under uncertainty is exhausting social labor. "Everything works out" is a mantra they\'re using to manage anxiety, not a genuine belief. The distance between the performance and the feeling is where stress accumulates.' },
      { id: 'hf12', situation: 'After a breakup, a student starts posting more on social media and going out every weekend.', said: '"I\'m honestly the happiest I\'ve been. So much freedom!"', realFeeling: 'lonely', options: ['happy', 'relieved', 'lonely', 'free'], explanation: 'Increased social activity after a loss can be genuine growth — or it can be a way to fill the silence where the relationship used to be. "Freedom" and loneliness coexist. The overcorrection reveals the wound.' },
      { id: 'hf13', situation: 'A student\'s family is having financial struggles. Friends suggest an expensive prom plan.', said: '"I\'m just not that into prom. It\'s kind of overrated."', realFeeling: 'ashamed', options: ['indifferent', 'mature', 'ashamed', 'rebellious'], explanation: 'Calling something "overrated" is a way to opt out without revealing the reason. Financial shame is one of the most hidden emotions because it carries stigma. The student is protecting their dignity by performing indifference.' },
      { id: 'hf14', situation: 'A student who has been bullied online starts acting tough and confrontational at school.', said: '"I don\'t care what anyone thinks about me."', realFeeling: 'hurt', options: ['confident', 'hurt', 'angry', 'empowered'], explanation: '"I don\'t care" almost always means "I care so much that I need armor." The toughness is a survival strategy. Aggression is often the outward face of vulnerability that doesn\'t feel safe enough to show itself.' },
      { id: 'hf15', situation: 'A student consistently volunteers to help the teacher, organize events, and tutor others.', said: '"I just like staying busy and helping people!"', realFeeling: 'anxious', options: ['generous', 'happy', 'anxious', 'ambitious'], explanation: 'Compulsive helpfulness can be genuine kindness — or it can be a way to feel worthy and in control. If stopping feels scary, if saying no feels impossible, the helping isn\'t just kindness. It\'s anxiety wearing a service badge.' },
      { id: 'hf15b', situation: 'A graduating senior is asked if they\'re excited about college. They\'ve been waitlisted at their top choice.', said: '"Honestly, I\'m just going wherever the universe takes me."', realFeeling: 'devastated', options: ['spiritual', 'relaxed', 'devastated', 'adventurous'], explanation: 'Cosmic framing ("the universe") outsources control to an abstract force. It sounds enlightened but it\'s actually avoidance — "the universe decides" is easier than "I might not get what I want and I don\'t know how to handle it."' },
      { id: 'hf15c', situation: 'After not being invited to prom by anyone, a student announces they\'re going with a group.', said: '"Going with a group is so much better than going with a date anyway."', realFeeling: 'rejected', options: ['social', 'wise', 'rejected', 'independent'], explanation: 'The group plan might genuinely be fun. But the emphatic "so much better" protests too much. The comparison reveals what they really wanted: to be asked. The group is the consolation prize performing as the first choice.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Empathy Map Prompts ──
  // ══════════════════════════════════════════════════════════════
  var EMPATHY_PROMPTS = {
    elementary: [
      { name: 'A student who just moved from another country', emoji: '\uD83C\uDF0D', context: 'They don\'t speak English well yet and it\'s their first week at your school.' },
      { name: 'A kid whose pet just passed away', emoji: '\uD83D\uDC3E', context: 'Their dog died over the weekend and they\'re back at school on Monday.' },
      { name: 'A student who uses a wheelchair', emoji: '\u267F', context: 'The class is going on a field trip to a place with lots of stairs.' },
      { name: 'A shy student on the first day of school', emoji: '\uD83D\uDE36', context: 'Everyone seems to already know each other and they don\'t know anyone.' },
      { name: 'A student who wears hearing aids', emoji: '\uD83E\uDDBB', context: 'The class is watching a movie without captions and everyone is laughing at jokes they can\'t fully hear.' },
      { name: 'A kid whose parent is deployed in the military', emoji: '\uD83C\uDFD6\uFE0F', context: 'It\'s Parents\' Night at school and everyone else has both parents there.' },
      { name: 'A student who is always picked last for teams', emoji: '\uD83D\uDE14', context: 'It\'s PE class and the captains are choosing teams again.' },
      { name: 'A kid who brings free lunch when others buy hot lunch', emoji: '\uD83C\uDF71', context: 'Their friends are talking about the cool new lunch items they\'re buying and asking what they\'re getting.' }
    ],
    middle: [
      { name: 'A student who stutters', emoji: '\uD83D\uDDE3\uFE0F', context: 'They have to give a class presentation next period and some kids laughed last time.' },
      { name: 'A student whose parents just divorced', emoji: '\uD83C\uDFE0', context: 'They\'re alternating weeks between two houses and forgot their homework at the other house.' },
      { name: 'A student who is the only person of their race in class', emoji: '\uD83C\uDF0D', context: 'The class is studying a historical event related to their racial background and everyone keeps looking at them.' },
      { name: 'A student being cyberbullied', emoji: '\uD83D\uDCF1', context: 'An embarrassing photo of them was shared in a group chat last night. They walk into school knowing everyone has seen it.' },
      { name: 'A student caring for a sick parent', emoji: '\uD83C\uDFE5', context: 'They make dinner for their siblings every night, help their parent with medication, and sometimes miss homework deadlines.' },
      { name: 'A student who was just cut from the team', emoji: '\u26BD', context: 'They\'ve played since they were 5 and their entire friend group made the team. They have to decide whether to go to the games.' },
      { name: 'A student whose best friend just moved away', emoji: '\uD83D\uDE9A', context: 'The friend left last week and today is the first Monday sitting alone at their usual lunch spot.' },
      { name: 'A student with a visible skin condition', emoji: '\uD83E\uDE79', context: 'It\'s the first day warm enough for short sleeves and they know people will stare and ask questions.' }
    ],
    high: [
      { name: 'A first-generation college applicant', emoji: '\uD83C\uDF93', context: 'They\'re navigating applications alone because nobody in their family has been through this process.' },
      { name: 'A student with an invisible disability', emoji: '\uD83E\uDDE0', context: 'They have ADHD and need extra time on tests, but classmates call it "unfair advantage."' },
      { name: 'A student who is their family\'s translator', emoji: '\uD83D\uDCDD', context: 'They miss school to interpret at medical appointments for their parents and teachers mark them absent without context.' },
      { name: 'A student questioning their gender identity', emoji: '\uD83C\uDF08', context: 'They want to ask people to use different pronouns but aren\'t sure how their friends and family will react.' },
      { name: 'A teen who just got their first job', emoji: '\uD83D\uDCBC', context: 'They work evenings and weekends to help with rent, but friends think they\'re just "always busy" and stop inviting them.' },
      { name: 'A student athlete with a career-ending injury', emoji: '\uD83E\uDE7C', context: 'Their entire identity and college plan was built around their sport. The doctor says they can\'t play again.' },
      { name: 'A student whose friend just attempted suicide', emoji: '\uD83D\uDC94', context: 'Their friend is in the hospital and they\'re at school trying to act normal while carrying the heaviest knowledge of their life.' },
      { name: 'An undocumented student applying to college', emoji: '\uD83D\uDCDA', context: 'They have a 4.0 GPA but can\'t fill out the FAFSA, can\'t get federal aid, and live with the constant fear that asking for help means exposure.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Journal Prompts (reflective writing) ──
  // ══════════════════════════════════════════════════════════════
  var JOURNAL_PROMPTS = {
    elementary: [
      { id: 'j1', prompt: 'Think about a time someone was kind to you when you were sad. How did that make you feel? What did they do that helped?' },
      { id: 'j2', prompt: 'Have you ever accidentally hurt someone\'s feelings? What happened and what did you learn?' },
      { id: 'j3', prompt: 'If you could spend a day being someone else at your school, who would you pick? What do you think their day is like?' },
      { id: 'j4', prompt: 'Think about a time you and a friend disagreed. How did you both feel? How did you work it out?' },
      { id: 'j5', prompt: 'What does it feel like when nobody picks you for a team or group? What could someone do to help?' },
      { id: 'j6', prompt: 'Imagine a new kid comes to your class who speaks a different language. What might they be feeling? What could you do to help?' },
      { id: 'j7', prompt: 'Think about someone in your family. What is something that makes them worried or happy that is different from what makes you worried or happy?' },
      { id: 'j8', prompt: 'Describe a time you changed your mind about someone after getting to know them better.' },
      { id: 'j8b', prompt: 'Think about a time someone was brave. What were they afraid of? What made them do it anyway?' },
      { id: 'j8c', prompt: 'If you could give advice to a kid who just moved to a new school, what would you say? What do you wish someone had told you when things were hard?' }
    ],
    middle: [
      { id: 'j9', prompt: 'Think about a time you judged someone before knowing their whole story. What did you learn when you found out more?' },
      { id: 'j10', prompt: 'Has social media ever made you misunderstand someone\'s feelings or intentions? Describe what happened.' },
      { id: 'j11', prompt: 'Write about someone whose life is very different from yours. What challenges do they face that you don\'t? What might you have in common?' },
      { id: 'j12', prompt: 'Describe a conflict between two people you know. Try to explain BOTH sides fairly, even if you agree with one more.' },
      { id: 'j13', prompt: 'Think about a time you stayed silent when someone was being treated unfairly. What held you back? What would you do differently now?' },
      { id: 'j14', prompt: 'Has anyone ever assumed something about you that was wrong? How did it feel? What do you wish they knew?' },
      { id: 'j15', prompt: 'Write about a time when trying to help someone actually made things worse. What did you learn about what people really need?' },
      { id: 'j16', prompt: 'Think about a belief or opinion you hold strongly. Now try to write the best possible argument for the opposite view.' },
      { id: 'j16b', prompt: 'Write about a time you were part of a group that did something you weren\'t proud of. What role did you play? What would you do differently?' },
      { id: 'j16c', prompt: 'Think about someone who annoys you. Now try to write about their day from their perspective — what might they be dealing with that you can\'t see?' }
    ],
    high: [
      { id: 'j17', prompt: 'Reflect on a time you recognized your own privilege in a situation. How did that awareness change your behavior?' },
      { id: 'j18', prompt: 'Write about a social issue where you\'ve changed your perspective. What caused the shift? What does it feel like to update a belief?' },
      { id: 'j19', prompt: 'Think about someone whose values or beliefs are very different from your own. Try to articulate their worldview with genuine empathy — not to agree, but to understand.' },
      { id: 'j20', prompt: 'Describe a situation where good intentions led to harm. What does that reveal about the gap between intent and impact?' },
      { id: 'j21', prompt: 'Reflect on a time you were part of a group that excluded someone. What group dynamics were at play? What would it have cost you to include them?' },
      { id: 'j22', prompt: 'Write about a teacher, parent, or authority figure whose decisions you disagreed with. Now try to reconstruct their reasoning and constraints.' },
      { id: 'j23', prompt: 'Think about how your identity (race, gender, class, ability, etc.) shapes how you experience everyday situations. Describe one specific example.' },
      { id: 'j24', prompt: 'Reflect on the concept of "emotional labor." Who in your life does invisible emotional work? What would it look like to acknowledge it?' },
      { id: 'j24b', prompt: 'Write about a time you witnessed injustice and said nothing. What held you back? What would it have cost you to speak? What did your silence cost someone else?' },
      { id: 'j24c', prompt: 'Think about an aspect of your identity you take for granted — something that makes your life easier without you noticing. Describe how someone without that advantage might experience the same situation differently.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── "What Would You Do?" Scenarios ──
  // ══════════════════════════════════════════════════════════════
  var RESPOND_SCENARIOS = {
    elementary: [
      { id: 'r1', title: 'The Lonely Lunch', situation: 'You see a kid eating lunch all by themselves. They look sad. Your friends want you to stay at your table.', stakeholders: 'the lonely kid, your friend group, you', evalFocus: 'kindness, inclusion, peer pressure' },
      { id: 'r2', title: 'The Mean Joke', situation: 'Your friend makes fun of another kid\'s clothes. Everyone laughs. The kid looks like they might cry.', stakeholders: 'the teased kid, your friend, the group', evalFocus: 'bystander courage, loyalty vs. kindness' },
      { id: 'r3', title: 'The Tattletale Dilemma', situation: 'You see a classmate steal someone\'s snack from their cubby. The person whose snack was taken is looking for it.', stakeholders: 'the victim, the thief, you', evalFocus: 'honesty, fairness, social consequences' },
      { id: 'r4', title: 'The Unfair Teams', situation: 'You\'re a team captain in PE. The best athlete is left, but so is a kid who nobody ever picks and who looks nervous.', stakeholders: 'the nervous kid, your team, you', evalFocus: 'compassion, winning vs. inclusion' },
      { id: 'r5', title: 'The Secret', situation: 'Your best friend tells you a secret about another kid. The secret is embarrassing. Other kids ask you what the secret is.', stakeholders: 'the kid the secret is about, your best friend, the curious kids', evalFocus: 'trustworthiness, privacy, peer pressure' },
      { id: 'r6', title: 'The Broken Rule', situation: 'Your friend accidentally breaks a classroom rule and the teacher blames someone else. Your friend doesn\'t say anything.', stakeholders: 'the blamed student, your friend, the teacher', evalFocus: 'honesty, loyalty, fairness' },
      { id: 'r6b', title: 'The Crying Kid', situation: 'A younger student is crying on the playground. They fell and scraped their knee. Your friends are waiting for you to play. No adults are nearby.', stakeholders: 'the hurt child, your friends, you', evalFocus: 'compassion, responsibility, peer pressure' },
      { id: 'r6c', title: 'The Wrong Name', situation: 'A new student has a name that is hard to pronounce. Some kids keep calling them by a nickname the student didn\'t choose. The student smiles but looks uncomfortable.', stakeholders: 'the new student, the nickname users, you', evalFocus: 'respect, cultural sensitivity, bystander action' },
      { id: 'r6d', title: 'The Unfair Game', situation: 'During a board game, you realize you accidentally cheated. Nobody noticed. You\'re winning by a lot.', stakeholders: 'you, the other players, the fairness of the game', evalFocus: 'integrity, self-honesty, sportsmanship' }
    ],
    middle: [
      { id: 'r7', title: 'The Screenshot', situation: 'A classmate sends you a screenshot of another student\'s private conversation and says "Look at this." The conversation is embarrassing.', stakeholders: 'the exposed student, the sender, you', evalFocus: 'digital ethics, privacy, complicity' },
      { id: 'r8', title: 'The Group Project Freeloader', situation: 'In your group project, one person has done nothing. The deadline is tomorrow. They text "Can I have my name on it? I\'ll do the next one, I promise."', stakeholders: 'the freeloader, the hard-working group members, the teacher', evalFocus: 'fairness, empathy, confrontation' },
      { id: 'r9', title: 'The Party Invite', situation: 'You\'re invited to a party but your close friend isn\'t. Your friend asks what you\'re doing that weekend and you haven\'t told them about the party yet.', stakeholders: 'your uninvited friend, the host, you', evalFocus: 'honesty, loyalty, social navigation' },
      { id: 'r10', title: 'The Hallway Comment', situation: 'You hear an older student make a racist comment to a younger student in the hallway. The younger student freezes and says nothing. Nobody else seems to have heard it.', stakeholders: 'the targeted student, the older student, you', evalFocus: 'moral courage, safety, allyship' },
      { id: 'r11', title: 'The Vape Offer', situation: 'A popular kid offers you a vape in the bathroom. Two other kids are watching to see what you do. You don\'t want to, but saying no feels risky.', stakeholders: 'you, the popular kid, the watching peers', evalFocus: 'self-advocacy, peer pressure, values' },
      { id: 'r12', title: 'The Teacher\'s Mistake', situation: 'Your teacher gives you full marks on an assignment, but you realize they missed a major error you made. It bumps your grade to an A. Nobody would ever know.', stakeholders: 'you, the teacher, classmates with honest grades', evalFocus: 'integrity, temptation, self-respect' },
      { id: 'r12b', title: 'The Left-Out Friend', situation: 'Your friend group is planning a surprise birthday party for someone. They want to exclude one person in the group because "they\'re kind of annoying lately." That person considers all of you close friends.', stakeholders: 'the excluded friend, the birthday person, you, the group', evalFocus: 'inclusion, honesty, group dynamics' },
      { id: 'r12c', title: 'The Overheard Conversation', situation: 'In the bathroom, you overhear two students planning to vandalize a teacher\'s car as "revenge" for a bad grade. They don\'t know you\'re there.', stakeholders: 'the teacher, the plotting students, you', evalFocus: 'safety, moral courage, anonymity' },
      { id: 'r12d', title: 'The Borrowed Essay', situation: 'A friend who has been struggling asks to "just look at" your essay for inspiration. You know they\'ll probably copy sections of it. They seem really stressed.', stakeholders: 'your friend, you, the teacher, other students', evalFocus: 'empathy vs. enabling, boundaries, academic honesty' }
    ],
    high: [
      { id: 'r13', title: 'The College Essay', situation: 'Your friend asks you to "edit" their college essay. When you read it, you realize they want you to basically rewrite it. They say, "My whole future depends on this."', stakeholders: 'your friend, the admissions office, other applicants, you', evalFocus: 'integrity, empathy, boundaries' },
      { id: 'r14', title: 'The Toxic Relationship', situation: 'Your best friend is in a relationship that seems controlling. Their partner monitors their phone and gets upset when they hang out with you. Your friend says, "They just love me a lot."', stakeholders: 'your friend, their partner, you', evalFocus: 'concern vs. respect for autonomy, recognizing abuse' },
      { id: 'r15', title: 'The Whistle-Blow', situation: 'You discover that a student council member used club funds to buy personal items. They\'re popular and well-liked. Reporting it will cause drama and you might be seen as a snitch.', stakeholders: 'the student, the club members, you, school administration', evalFocus: 'accountability, social risk, institutional trust' },
      { id: 'r16', title: 'The Inherited Bias', situation: 'At dinner, a family member makes a derogatory comment about a group of people. You have friends who belong to that group. Other family members laugh or stay silent.', stakeholders: 'the family member, your friends (not present), you, other family', evalFocus: 'moral courage, family dynamics, allyship' },
      { id: 'r17', title: 'The Mental Health Crisis', situation: 'A friend texts you late at night saying they "can\'t do this anymore" and "nobody would care." They ask you not to tell anyone.', stakeholders: 'your friend, their family, a trusted adult, you', evalFocus: 'safety vs. trust, when to break confidentiality' },
      { id: 'r18', title: 'The Opportunity Cost', situation: 'You\'re offered an amazing summer internship, but it means breaking a commitment to volunteer at a camp for kids with disabilities. The camp is counting on you and it\'s too late for them to find a replacement.', stakeholders: 'the campers, the camp organizers, the internship, you', evalFocus: 'commitment, self-interest vs. responsibility' },
      { id: 'r18b', title: 'The Silence of Privilege', situation: 'In a class discussion about systemic racism, a student of color shares a painful personal experience. The room goes quiet. You\'re white and notice some classmates rolling their eyes. The teacher moves on too quickly.', stakeholders: 'the student who shared, the dismissive classmates, the teacher, you', evalFocus: 'allyship, courage, privilege, amplifying voices' },
      { id: 'r18c', title: 'The Codependent Friend', situation: 'Your best friend has been relying on you for ALL emotional support. They text you constantly when anxious, get upset if you\'re busy, and say "You\'re the only person who understands me." It\'s affecting your own mental health.', stakeholders: 'your friend, you, both of your mental health', evalFocus: 'boundaries, compassion fatigue, healthy relationships' },
      { id: 'r18d', title: 'The Graduation Speech', situation: 'You\'re asked to give a graduation speech. You could give a safe, crowd-pleasing speech, or address the real issue: three students attempted suicide this year and the school did nothing about mental health.', stakeholders: 'the affected students and families, administration, graduating class, you', evalFocus: 'truth vs. comfort, platform responsibility, institutional critique' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Empathy Stories Data ──
  // Short narrative vignettes told from different perspectives
  // ══════════════════════════════════════════════════════════════
  var EMPATHY_STORIES = {
    elementary: [
      { id: 'es1', title: 'The New Student',
        intro: 'It is the first day of school after winter break. A new student named Amara walks into Room 12 carrying a brand-new backpack and a nervous stomach.',
        perspectives: [
          { name: 'Amara (the new student)', emoji: '\uD83D\uDE1F',
            text: 'Everyone already has friends. They all know the rules, the jokes, where things go. I don\u2019t even know where the bathroom is. When the teacher told me to sit next to a girl named Harper, Harper just looked at me and then went back to talking to her friend. I smiled but my voice wouldn\u2019t come out. I ate lunch at the end of a table and pretended I was reading so nobody would notice I was alone.' },
          { name: 'Harper (the classmate)', emoji: '\uD83D\uDE10',
            text: 'A new girl sat next to me today. She seemed really quiet and I didn\u2019t know what to say. My friend Jada was telling me something funny so I turned back to her. At lunch I saw the new girl sitting by herself. I thought about going over but I didn\u2019t want to leave Jada. I figured someone else would talk to her. Now I feel a little bad because nobody did.' }
        ],
        reflection: 'Harper wasn\u2019t being mean \u2014 she was just comfortable. Amara wasn\u2019t unfriendly \u2014 she was terrified. Which perspective hadn\u2019t you thought about before?' },
      { id: 'es2', title: 'The Substitute Teacher',
        intro: 'Mrs. Reyes is out sick today. A substitute teacher, Mr. Brooks, is filling in. He doesn\u2019t know the class routines.',
        perspectives: [
          { name: 'Caleb (student)', emoji: '\uD83D\uDE24',
            text: 'This sub doesn\u2019t know anything. He gave us the wrong worksheet, he called me \u201CColin,\u201D and he won\u2019t let us have free reading time even though Mrs. Reyes always does. Why should I listen to someone who doesn\u2019t even know our names? I wasn\u2019t being bad, I just told my friend this was dumb.' },
          { name: 'Mr. Brooks (substitute)', emoji: '\uD83D\uDE30',
            text: 'This is my second day of substitute teaching ever. The lesson plan Mrs. Reyes left was confusing and I couldn\u2019t find the worksheets she mentioned. I\u2019m trying my best but the kids can tell I\u2019m nervous. When that boy said this was dumb, it really stung. I almost became a teacher because I love kids. Right now I\u2019m wondering if I made a mistake.' }
        ],
        reflection: 'Caleb saw an incompetent stranger. Mr. Brooks saw a room full of kids he wanted to help. Neither could see the other\u2019s full picture.' },
      { id: 'es3', title: 'The Playground Argument',
        intro: 'At recess, two kids argue about the rules of a game.',
        perspectives: [
          { name: 'Deshawn', emoji: '\uD83D\uDE20',
            text: 'We always play tag the same way and Lily just changed the rules because she was about to be out. That\u2019s not fair! If you\u2019re losing you can\u2019t just make up new rules. I got mad because I\u2019ve been waiting all morning to play and now she ruined it.' },
          { name: 'Lily', emoji: '\uD83D\uDE22',
            text: 'I wasn\u2019t trying to cheat. I really thought we played that way before. At my old school, you got a free pass if you touched the fence. When Deshawn yelled at me in front of everyone, I felt so embarrassed. I just wanted to play and now everyone thinks I\u2019m a cheater.' }
        ],
        reflection: 'Deshawn saw someone breaking the rules on purpose. Lily was following rules from a different place. The same moment felt like unfairness to one and humiliation to the other.' },
      { id: 'es4', title: 'Moving Day',
        intro: 'Jayden\u2019s family is moving to a different city. His best friend Marco finds out today.',
        perspectives: [
          { name: 'Jayden (the one leaving)', emoji: '\uD83D\uDE14',
            text: 'I didn\u2019t want to tell Marco because I knew he\u2019d be upset. I\u2019ve been sad about it for two weeks but my parents told me not to tell anyone until it was official. Now Marco is mad that I kept a secret. I\u2019m the one who has to start over somewhere with no friends, and he\u2019s making it about himself.' },
          { name: 'Marco (the one staying)', emoji: '\uD83D\uDE22',
            text: 'Jayden is my best friend and he\u2019s been keeping this secret for TWO WEEKS. I had to hear about it from his mom. I feel like our friendship wasn\u2019t real if he couldn\u2019t tell me something this big. Now I\u2019m mad AND sad at the same time. And who am I going to sit with at lunch?' }
        ],
        reflection: 'Jayden was protecting himself from a goodbye he wasn\u2019t ready for. Marco was hurt by the secrecy because it felt like not being trusted. Both were grieving the same loss differently.' },
      { id: 'es5', title: 'The Lost Pet',
        intro: 'A small dog without a collar wanders into a neighborhood. Two families notice it.',
        perspectives: [
          { name: 'Sofia (the pet\u2019s owner)', emoji: '\uD83D\uDE2D',
            text: 'Biscuit got out when my little brother left the gate open. I\u2019ve been looking for three hours. I made posters, I walked every street. Biscuit is old and needs medicine every day. Every minute she\u2019s gone I feel sicker. I can\u2019t eat, I can\u2019t sleep, I just want my dog back.' },
          { name: 'The Chen family (finders)', emoji: '\uD83D\uDE0A',
            text: 'We found this sweet little dog in our yard with no collar. The kids are so excited \u2014 we\u2019ve always wanted a pet. We gave her water and food and made a little bed. My daughter named her Daisy already. We\u2019ll put up \u201Cfound dog\u201D signs tomorrow, but part of me hopes nobody claims her.' }
        ],
        reflection: 'One family\u2019s joy is another family\u2019s agony. The Chens aren\u2019t being selfish \u2014 they just don\u2019t know Sofia exists yet. Once they do, empathy changes everything.' }
    ],
    middle: [
      { id: 'es6', title: 'The Group Project',
        intro: 'Four students are assigned a history presentation due Friday. It\u2019s now Wednesday night.',
        perspectives: [
          { name: 'Keiko (the overachiever)', emoji: '\uD83D\uDE24',
            text: 'I\u2019ve done 80% of this project and I\u2019m exhausted. I texted the group Sunday and only one person replied. Darius still hasn\u2019t sent his section. I don\u2019t want to be the \u201Cbossy\u201D one but if I don\u2019t do everything, we\u2019ll fail. Why do I always end up carrying the group? My grade shouldn\u2019t depend on someone else\u2019s effort.' },
          { name: 'Darius (struggling student)', emoji: '\uD83D\uDE14',
            text: 'I want to do my part but I don\u2019t even understand the topic. When I asked the group for help, Keiko sent me a list of links and said \u201Cjust read these.\u201D I tried but it\u2019s all above my reading level. I haven\u2019t told anyone I\u2019m in reading support. The longer I wait, the worse it gets, and now they probably think I\u2019m lazy.' },
          { name: 'Ms. Rivera (teacher)', emoji: '\uD83E\uDD14',
            text: 'I assigned groups strategically \u2014 mixing strengths. I expect them to learn collaboration, not just content. I know some students will do more, but that\u2019s part of learning to work with different people. What I might not see is when \u201Ccollaboration\u201D becomes \u201Cone person doing everything.\u201D' }
        ],
        reflection: 'Keiko sees laziness. Darius carries invisible struggle. The teacher sees a learning opportunity. All three perspectives reveal a system failure, not a character flaw.' },
      { id: 'es7', title: 'The Social Media Post',
        intro: 'Brianna takes a funny photo of her friend Mia making a weird face at lunch and posts it on social media with a laughing emoji.',
        perspectives: [
          { name: 'Brianna (the poster)', emoji: '\uD83D\uDE02',
            text: 'It was just a silly photo! Mia makes funny faces all the time. I thought she\u2019d laugh. I got like 50 likes in an hour. When she texted me \u201Ctake it down,\u201D I was confused. I didn\u2019t mean any harm. It\u2019s not like I posted something mean. Why is she being so sensitive?' },
          { name: 'Mia (the subject)', emoji: '\uD83D\uDE23',
            text: 'I didn\u2019t even know she took that photo. When I saw it, my stomach dropped. 50 people liked it and some of the comments were not kind. A boy in eighth grade commented \u201CLOL what is that face\u201D and now I\u2019m mortified. Brianna thinks it\u2019s funny but she\u2019s not the one whose face is the joke. She didn\u2019t even ask me.' }
        ],
        reflection: 'Brianna measured impact by her intent (\u201CI was joking\u201D). Mia measured it by her experience (\u201CI\u2019m the punchline\u201D). The gap between how something is meant and how it\u2019s felt is where most social media harm lives.' },
      { id: 'es8', title: 'The School Dance',
        intro: 'The fall formal is Friday. Everyone in the friend group has dates or plans \u2014 except Raul.',
        perspectives: [
          { name: 'Tiana (the popular kid)', emoji: '\uD83D\uDE0A',
            text: 'I\u2019m so excited for the dance! My whole group is going and we\u2019re matching outfits. I asked Raul if he was coming and he said \u201Cprobably not.\u201D I told him it would be fun but he just shrugged. I\u2019m not going to beg someone to come. I\u2019ve got my own night to plan.' },
          { name: 'Raul (the excluded kid)', emoji: '\uD83D\uDE14',
            text: 'Every conversation is about the dance. What they\u2019re wearing, who\u2019s going with who. Nobody asked me to go with them. Tiana asked if I was coming but she didn\u2019t offer to include me \u2014 she asked the way you ask about the weather. I said \u201Cprobably not\u201D because saying \u201CI have nobody to go with\u201D is worse. I\u2019ll stay home and tell everyone Monday that I was \u201Cbusy.\u201D' }
        ],
        reflection: 'Tiana sees someone choosing not to come. Raul sees a world that didn\u2019t choose him. The same shrug can mean independence or isolation \u2014 and most people never ask which one it is.' },
      { id: 'es9', title: 'The Cafeteria Table',
        intro: 'A group of friends have sat at the same lunch table all year. Today, a new student tries to sit with them.',
        perspectives: [
          { name: 'Zara (insider)', emoji: '\uD83D\uDE10',
            text: 'We\u2019ve been this friend group since sixth grade. We have inside jokes, we know each other\u2019s problems, it\u2019s our safe space. When this new kid sat down, nobody was mean \u2014 but nobody really talked to him either. It\u2019s not personal. We\u2019re just comfortable and adding someone changes the dynamic.' },
          { name: 'Isaiah (outsider)', emoji: '\uD83D\uDE1F',
            text: 'I sat at their table because there was an empty seat and they seemed nice. They said hi but then kept talking about stuff I didn\u2019t understand. Nobody explained the jokes or asked me questions. I sat there for twenty minutes feeling invisible. Tomorrow I\u2019ll find a different table and pretend I didn\u2019t care.' }
        ],
        reflection: 'The group didn\u2019t exclude Isaiah on purpose. But comfort for insiders can feel like a wall to outsiders. Inclusion isn\u2019t just the absence of cruelty \u2014 it\u2019s active welcome.' },
      { id: 'es10', title: 'The Coach\u2019s Decision',
        intro: 'Coach Williams has to cut the soccer roster from 18 to 14 players for the tournament team.',
        perspectives: [
          { name: 'Andre (starter)', emoji: '\uD83D\uDE04',
            text: 'I made the tournament team! I worked all summer, went to camps, stayed after every practice. I earned this. When Coach posted the list, I felt relieved and proud. I saw Marcus looking at the list and walking away. I wanted to say something but I didn\u2019t know what.' },
          { name: 'Marcus (cut)', emoji: '\uD83D\uDE22',
            text: 'I didn\u2019t make it. I\u2019ve been on this team for two years. My dad took off work to drive me to every practice. When I saw the list, my vision blurred. Andre made it \u2014 of course he did, his family can afford summer camps. I practice in my driveway with a flat ball. They\u2019ll tell me it\u2019s about \u201Cskill\u201D but it\u2019s also about opportunity.' },
          { name: 'Coach Williams', emoji: '\uD83D\uDE13',
            text: 'Cutting four kids is the worst part of my job. Marcus has heart, and I see how hard he tries. But the tournament is competitive and I have to take the most ready players. I don\u2019t know about his home situation. I wish I could keep everyone. I\u2019ll lose sleep over this list.' }
        ],
        reflection: 'Andre sees merit. Marcus sees unequal access. Coach sees impossible choices. The same list means celebration, devastation, and guilt \u2014 all at once.' }
    ],
    high: [
      { id: 'es11', title: 'The Job Interview',
        intro: 'Two candidates arrive for the same position at a small business.',
        perspectives: [
          { name: 'Eva (the candidate)', emoji: '\uD83D\uDE13',
            text: 'I prepared for days. I researched the company, rehearsed answers, picked my best outfit. I\u2019m the first in my family to finish college. When the interviewer asked where I went to school and I said the community college, I saw something shift in his expression. He spent the rest of the interview looking at his notes instead of at me. I know I\u2019m qualified. I just don\u2019t look like what they expected.' },
          { name: 'Mr. Tanaka (hiring manager)', emoji: '\uD83E\uDD14',
            text: 'I interviewed six people today. Eva was articulate and clearly prepared. But the role requires networking with clients who went to prestigious schools, and I worry she wouldn\u2019t fit the culture. Is that a legitimate concern or a bias? I hired someone from my alma mater last year and they quit in three months. I need to think about what \u201Cfit\u201D really means.' }
        ],
        reflection: 'Eva sees a door closing based on pedigree, not ability. Mr. Tanaka sees a practical concern that might actually be a dressed-up bias. \u201CCulture fit\u201D is sometimes code for \u201Csameness.\u201D' },
      { id: 'es12', title: 'The Protest',
        intro: 'Students organize a protest march that goes through the downtown business district on a Saturday afternoon.',
        perspectives: [
          { name: 'Camila (protester)', emoji: '\uD83D\uDE24',
            text: 'We are marching because the school district cut funding for ESL programs and my mother\u2019s English class was cancelled. This affects hundreds of families. If we don\u2019t make noise, nobody listens. Yes, it\u2019s loud. Yes, it blocks traffic. That\u2019s the point. Comfortable people don\u2019t change unjust systems.' },
          { name: 'David (business owner)', emoji: '\uD83D\uDE23',
            text: 'I support their cause \u2014 honestly, I do. But they blocked my storefront for three hours on my busiest day. I\u2019m a small business owner, not the school board. I barely made rent last month. My employees lost a day\u2019s tips. Why target the people in your own neighborhood instead of the people who made the decision?' },
          { name: 'Officer Reyes (police)', emoji: '\uD83D\uDE10',
            text: 'I\u2019m here to keep everyone safe. I agree the funding cuts were wrong \u2014 my kids go to those schools. But I\u2019m in uniform and that makes me a symbol of the system they\u2019re protesting against. A kid yelled \u201Cpig\u201D at me. I held my composure but it stung. I\u2019m a person too.' }
        ],
        reflection: 'Camila sees disruption as necessary justice. David sees collateral damage on the wrong target. Officer Reyes carries the weight of a symbol. Protest is messy because it affects people beyond its intended audience.' },
      { id: 'es13', title: 'The College Decision',
        intro: 'A high school senior must decide between their dream school far away and the local university near their family.',
        perspectives: [
          { name: 'Priya (the student)', emoji: '\uD83D\uDE1F',
            text: 'I got into Stanford. This is everything I\u2019ve worked for since ninth grade. But my mom cried when I told her. Not from joy \u2014 from fear. My dad is sick and she needs help at home. My little brother looks up to me and he\u2019s already struggling in school. Going to Stanford means choosing my future over my family\u2019s present. Staying means choosing their needs over my dreams. Both choices cost me something I can\u2019t get back.' },
          { name: 'Priya\u2019s mother', emoji: '\uD83D\uDE22',
            text: 'I want Priya to go. I do. I came to this country so my children could have chances I never had. But I am scared. Who will translate at the doctor\u2019s office? Who will help her brother with homework? I cannot tell her to stay because that would be selfish. I cannot tell her to go because I am not brave enough to be alone. So I cry, and she thinks I am trying to stop her, but I am trying to let her go.' }
        ],
        reflection: 'Priya sees an impossible choice between two loves. Her mother sees the same impossible choice from the other side. Love doesn\u2019t simplify decisions \u2014 it complicates them.' },
      { id: 'es14', title: 'The Viral Video',
        intro: 'A video of a confrontation at a store goes viral online. It shows the last 30 seconds of a five-minute interaction.',
        perspectives: [
          { name: 'The person filmed', emoji: '\uD83D\uDE28',
            text: 'In that video I look terrible. I\u2019m yelling at a cashier. What nobody filmed was the twenty minutes before: I was told my insurance card was fake, I was followed around the store by security, and when I asked to speak to a manager, the cashier said \u201Cpeople like you always want a manager.\u201D By the time someone started filming, I was already at my worst. Now two million people know my face and think they know my character.' },
          { name: 'A viewer', emoji: '\uD83D\uDCF1',
            text: 'I saw the video and immediately judged that person. They were screaming at a minimum-wage worker and it looked awful. I shared it with the caption \u201Cpeople are terrible.\u201D I felt righteous. Then someone posted the full context and I realized I had participated in destroying someone\u2019s reputation based on 30 seconds of the worst moment of their life. I deleted my post but the damage was done.' }
        ],
        reflection: 'Thirty seconds of footage created a permanent reputation. The person filmed lost control after provocation. The viewer became a judge, jury, and amplifier without evidence. Viral content rewards speed over context.' },
      { id: 'es15', title: 'The Refugee',
        intro: 'A refugee family from Syria is resettled in a small American town. They move into an apartment on Oak Street.',
        perspectives: [
          { name: 'Yasmin (the refugee)', emoji: '\uD83D\uDE14',
            text: 'People say we should be grateful. I am grateful \u2014 my children are safe. But grateful and grieving can exist in the same body. I was an engineer in Damascus. Here, I clean offices. My daughter is learning English so fast it scares me \u2014 she\u2019s becoming someone I might not be able to talk to in five years. The neighbors brought cookies when we arrived. One of them also signed a petition to block more refugees from coming. Kindness and exclusion from the same hand.' },
          { name: 'Jim (local resident)', emoji: '\uD83D\uDE10',
            text: 'I\u2019m not against refugees. I brought them cookies. But this town has been struggling for years \u2014 factory closed, schools underfunded, opioid crisis nobody talks about. Now the government finds resources for new families but not for mine. I don\u2019t blame Yasmin. I blame a system that makes us compete for scraps. But when I say that out loud, people call me a bigot, so I stopped talking about it.' },
          { name: 'Amira (Yasmin\u2019s daughter)', emoji: '\uD83D\uDE42',
            text: 'I like my new school but I pretend I\u2019m not from Syria because a boy in my class said Syria is where terrorists come from. My teacher was kind about it but she also asked me to \u201Cshare about my culture\u201D in front of everyone, like I\u2019m a museum exhibit. I just want to be normal. I want to be boring. I want nobody to look at me when the news is on.' }
        ],
        reflection: 'Yasmin holds gratitude and grief. Jim holds compassion and resentment. Amira holds two identities she cannot reconcile. None of them are the villain the simple narrative demands.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Perspective-Taking Exercises Data ──
  // Interactive activities: Walk in Their Shoes, Same Event
  // Different Eyes, Before You Judge
  // ══════════════════════════════════════════════════════════════
  var PERSPECTIVE_EXERCISES = {
    walkInShoes: {
      elementary: [
        { id: 'ws1', person: 'A grandparent who lives alone', emoji: '\uD83D\uDC75', prompt: 'Imagine you are a grandparent whose family lives far away. Describe your typical Saturday.' },
        { id: 'ws2', person: 'A child who uses a wheelchair', emoji: '\u267F', prompt: 'Imagine you use a wheelchair. Describe getting to school, going to class, and playing at recess. What is easy? What is hard?' },
        { id: 'ws3', person: 'A kid whose family speaks a different language at home', emoji: '\uD83C\uDF0D', prompt: 'Imagine you speak one language at home and a different one at school. What is your morning like? What confuses you? What are you good at that others don\u2019t see?' }
      ],
      middle: [
        { id: 'ws4', person: 'A single parent working two jobs', emoji: '\uD83D\uDCBC', prompt: 'Imagine you are a single parent. You wake up at 5 AM, work until 3 PM, pick up your kids, start your second job at 5 PM. Describe your evening. What do you miss? What keeps you going?' },
        { id: 'ws5', person: 'A teenager in a developing country', emoji: '\uD83C\uDF0D', prompt: 'Imagine you are 14 but you walk 3 miles to school, carry water for your family, and share one textbook with five classmates. Describe your relationship with education.' },
        { id: 'ws6', person: 'A student who is hard of hearing', emoji: '\uD83E\uDDBB', prompt: 'Imagine you are partially deaf. You wear hearing aids. Describe a typical school day \u2014 classroom discussions, hallway noise, lunch conversations, group work.' }
      ],
      high: [
        { id: 'ws7', person: 'An undocumented immigrant', emoji: '\uD83D\uDCDD', prompt: 'Imagine you came to this country as a child. You\u2019ve lived here 12 years, graduated high school with honors, but have no legal status. Describe your day \u2014 what fears follow you? What doors are closed?' },
        { id: 'ws8', person: 'A homeless veteran', emoji: '\uD83C\uDFD6\uFE0F', prompt: 'Imagine you served your country for 8 years. You came home with PTSD that nobody can see. You lost your apartment, then your family. Describe how people look at you now versus how they looked at you in uniform.' },
        { id: 'ws9', person: 'A first-generation college student from a rural town', emoji: '\uD83C\uDF93', prompt: 'Imagine you\u2019re the first person in your family and your town to attend a university 500 miles away. Everyone back home is proud but doesn\u2019t understand your world anymore. Describe the distance that isn\u2019t about miles.' }
      ]
    },
    sameEvent: [
      { id: 'se1', title: 'The Fire Alarm',
        event: 'The fire alarm goes off during third period. Everyone evacuates to the field.',
        characters: ['A student with anxiety', 'The teacher trying to count heads', 'A student who pulled the alarm as a prank'],
        gradeHint: { elementary: 'Write 2-3 sentences for each person.', middle: 'Write a paragraph for each, focusing on their inner experience.', high: 'Write from each perspective, exploring the emotional and ethical dimensions.' } },
      { id: 'se2', title: 'The Power Outage',
        event: 'The electricity goes out in the whole neighborhood for six hours on a hot summer day.',
        characters: ['An elderly person who lives alone', 'A family with a newborn baby', 'A teenager who was in the middle of an online game'],
        gradeHint: { elementary: 'What would each person be most worried about?', middle: 'Describe each person\u2019s experience and what they need most.', high: 'Explore how the same inconvenience can be a crisis, a hardship, or an annoyance depending on your circumstances.' } },
      { id: 'se3', title: 'The Snow Day',
        event: 'School is cancelled due to heavy snow.',
        characters: ['A student', 'A working parent with no childcare', 'A teacher who was planning to give a test'],
        gradeHint: { elementary: 'How does each person feel when they hear the news?', middle: 'Describe the chain of effects on each person\u2019s day.', high: 'Explore how the same event can be a gift, a crisis, or a relief depending on your role and resources.' } }
    ],
    beforeYouJudge: {
      elementary: [
        { id: 'byj1', surface: 'A student never brings lunch to school and always eats the free lunch.',
          reveal: 'His family can\u2019t afford to buy groceries every week. His parents skip meals so the kids can eat. The free lunch is sometimes his biggest meal of the day.',
          lesson: 'What looks like \u201Cnot caring\u201D can actually be \u201Cnot having.\u201D Never assume you know someone\u2019s situation from what you see on the surface.' },
        { id: 'byj2', surface: 'A girl falls asleep in class almost every day. The teacher keeps waking her up.',
          reveal: 'She shares a one-bedroom apartment with five family members. Her baby brother cries all night and she can\u2019t sleep. She does her homework under a streetlight because there\u2019s not enough space inside.',
          lesson: 'Falling asleep in class isn\u2019t laziness when your home doesn\u2019t allow rest. Behavior is often a symptom, not a choice.' }
      ],
      middle: [
        { id: 'byj3', surface: 'A student is always on his phone in class, even after being told to put it away multiple times.',
          reveal: 'His mother is in the hospital and he is the emergency contact because his father is deployed overseas. Every buzz could be the call that changes his life.',
          lesson: 'The device that looks like a distraction may actually be a lifeline. We judge visible behavior without seeing invisible context.' },
        { id: 'byj4', surface: 'A student never participates in class discussions and has been labeled \u201Cunmotivated\u201D by three teachers.',
          reveal: 'She has selective mutism, an anxiety disorder that makes it physically impossible to speak in certain settings. She writes beautiful essays. She has thoughts she can\u2019t voice. The label \u201Cunmotivated\u201D is the opposite of her truth.',
          lesson: 'Silence is not emptiness. The quietest person in the room might have the most to say and the least ability to say it.' }
      ],
      high: [
        { id: 'byj5', surface: 'A student dropped out of all extracurriculars, stopped hanging out with friends, and barely maintains passing grades.',
          reveal: 'She is the primary caretaker for her father, who has early-onset Alzheimer\u2019s. She bathes him, feeds him, manages his medications, and watches him forget her name a little more each week. She is seventeen.',
          lesson: 'When someone\u2019s life shrinks, the reason might be that their responsibilities have expanded beyond what any teenager should carry. Withdrawal is sometimes the sound of someone holding too much.' },
        { id: 'byj6', surface: 'A student is \u201Calways angry\u201D \u2014 snapping at teachers, getting into arguments, sitting alone at lunch by choice.',
          reveal: 'He was placed in foster care six months ago after his parents\u2019 rights were terminated. He\u2019s been in three homes in six months. Every adult who promised to care for him has either hurt him or left. Anger is the only emotion that feels safe because sadness requires trust.',
          lesson: 'Anger is grief\u2019s bodyguard. The student who pushes everyone away may be the one most terrified of being left.' }
      ]
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ── Cognitive Bias Explorer Data ──
  // Learn about common thinking errors
  // ══════════════════════════════════════════════════════════════
  var COGNITIVE_BIASES = {
    elementary: [
      { id: 'cb1', name: 'Jumping to Conclusions',
        emoji: '\uD83D\uDCA8',
        definition: 'Deciding you know what happened or why someone did something without having all the facts.',
        example: 'You see two friends whispering and think they\u2019re talking about you. Actually, they were planning a surprise for another friend.',
        catchYourself: 'Ask yourself: \u201CDo I actually KNOW this, or am I guessing?\u201D If you\u2019re guessing, check before you react.' },
      { id: 'cb2', name: 'Only Seeing Your Side',
        emoji: '\uD83D\uDE48',
        definition: 'Thinking your way of seeing something is the only way to see it.',
        example: 'You think recess should always be outside. But a kid with bad allergies thinks indoor recess is way better. Neither is wrong \u2014 you just have different experiences.',
        catchYourself: 'When you think \u201Ceveryone knows that\u201D or \u201Cthat\u2019s just obvious,\u201D stop and ask: \u201CWho might see this differently, and why?\u201D' },
      { id: 'cb3', name: 'Thinking Everyone Thinks Like You',
        emoji: '\uD83E\uDDE0',
        definition: 'Assuming other people feel the same way you do about things.',
        example: 'You love surprise parties, so you plan one for your friend. But your friend actually hates being the center of attention and feels ambushed, not celebrated.',
        catchYourself: 'Before you assume someone will like what you like, ask them. \u201CWould YOU want this?\u201D is a powerful question.' }
    ],
    middle: [
      { id: 'cb4', name: 'Confirmation Bias',
        emoji: '\uD83D\uDD0D',
        definition: 'Only noticing information that supports what you already believe and ignoring information that contradicts it.',
        example: 'You think a classmate is mean. So you remember every rude thing they did but forget the time they lent you a pencil or said something nice.',
        catchYourself: 'When you\u2019re sure about someone, actively look for evidence that contradicts your view. If you can\u2019t find any, you might not be looking hard enough.' },
      { id: 'cb5', name: 'Fundamental Attribution Error',
        emoji: '\u26A0\uFE0F',
        definition: 'When someone else does something bad, you blame their character. When YOU do something bad, you blame the situation.',
        example: 'If a classmate is late, you think \u201Cthey\u2019re irresponsible.\u201D If YOU are late, you think \u201Ctraffic was bad.\u201D Same behavior, different explanations.',
        catchYourself: 'When someone does something you don\u2019t like, give them the same generous interpretation you\u2019d give yourself.' },
      { id: 'cb6', name: 'In-Group / Out-Group Bias',
        emoji: '\uD83D\uDC65',
        definition: 'Seeing people in your group as individuals with complex reasons, but seeing people outside your group as all the same.',
        example: 'You know everyone in your friend group is different. But when you think about the \u201Cpopular kids\u201D or the \u201Cnerds,\u201D you imagine them as one thing.',
        catchYourself: 'Whenever you think \u201CTHOSE people always...\u201D replace it with \u201CSome people in that group might...\u201D and see how it changes your thinking.' },
      { id: 'cb7', name: 'Anchoring',
        emoji: '\u2693',
        definition: 'Relying too heavily on the first piece of information you hear about something or someone.',
        example: 'Someone tells you a new student got suspended at their last school. Now every time that student does anything, you see it through that first impression \u2014 even if they\u2019ve changed completely.',
        catchYourself: 'Ask yourself: \u201CIs my opinion based on current evidence, or on the first thing I heard?\u201D First impressions are sticky but not always accurate.' }
    ],
    high: [
      { id: 'cb8', name: 'Dunning-Kruger Effect',
        emoji: '\uD83D\uDCC8',
        definition: 'People who know very little about a topic tend to overestimate their knowledge. People who know a lot tend to underestimate it.',
        example: 'After watching one documentary about climate science, someone feels qualified to debate a climate scientist. Meanwhile, the scientist constantly qualifies their statements because they understand how much they don\u2019t know.',
        catchYourself: 'If you feel absolutely certain about a complex topic, consider that certainty itself might be a sign you don\u2019t know enough. Expertise sounds like \u201Cit depends,\u201D not \u201Cit\u2019s obvious.\u201D' },
      { id: 'cb9', name: 'Availability Heuristic',
        emoji: '\uD83D\uDCF0',
        definition: 'Judging how common something is based on how easily you can remember examples of it, usually because of dramatic or recent events.',
        example: 'After seeing news about a plane crash, you feel flying is dangerous \u2014 even though statistically, you\u2019re far more likely to be hurt in a car on the way to the airport.',
        catchYourself: 'When something feels common or dangerous, ask: \u201CAm I basing this on data or on a vivid memory?\u201D Our brains prioritize drama over statistics.' },
      { id: 'cb10', name: 'Sunk Cost Fallacy',
        emoji: '\uD83D\uDCB8',
        definition: 'Continuing something because you\u2019ve already invested time, money, or effort in it \u2014 even when quitting would be the better choice.',
        example: 'You\u2019ve been in a friendship that makes you miserable for two years. Instead of ending it, you think \u201CBut we\u2019ve been friends so long, I can\u2019t just throw that away.\u201D The time already spent can\u2019t be recovered either way.',
        catchYourself: 'Ask: \u201CIf I were starting fresh today, would I make this same choice?\u201D If the answer is no, the past investment shouldn\u2019t be the reason you continue.' },
      { id: 'cb11', name: 'Spotlight Effect',
        emoji: '\uD83D\uDD26',
        definition: 'Believing that other people notice and care about your appearance, behavior, and mistakes far more than they actually do.',
        example: 'You trip in the hallway and feel like the entire school saw it and will remember it forever. In reality, most people were looking at their phones and forgot about it in ten seconds.',
        catchYourself: 'Remember: you are the main character of YOUR life, but a background character in everyone else\u2019s. People are too busy worrying about themselves to catalog your embarrassments.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Perspective Journal Prompts (extended) ──
  // Guided reflection with specific themes
  // ══════════════════════════════════════════════════════════════
  var GUIDED_JOURNAL_PROMPTS = [
    { id: 'gj1', title: 'A time I changed my mind about someone',
      prompt: 'Think about a person you once judged or misunderstood. What was your first impression? What happened to change it? What did you learn about making assumptions?',
      followUp: 'What would you say to your past self about this person?' },
    { id: 'gj2', title: 'A time someone surprised me',
      prompt: 'Describe a moment when someone did something you never expected. What surprised you? What assumption did it challenge? How did it change how you think about that person?',
      followUp: 'What assumptions might people make about YOU that are wrong?' },
    { id: 'gj3', title: 'A perspective I struggle to understand',
      prompt: 'Honestly describe a viewpoint, belief, or way of living that you find hard to understand. Why is it difficult for you? What might someone with that perspective say if they could explain it to you?',
      followUp: 'Is there a difference between understanding a perspective and agreeing with it?' },
    { id: 'gj4', title: 'The invisible weight someone carries',
      prompt: 'Think about someone in your life who might be carrying a burden others don\u2019t see. What might their daily life be like? What do they never talk about? What would change if people knew?',
      followUp: 'Who in your life might not know about something YOU carry silently?' },
    { id: 'gj5', title: 'When I was the outsider',
      prompt: 'Describe a time you were the new person, the different one, or the one who didn\u2019t belong. What did it feel like in your body? What did you wish someone would do? What did you learn?',
      followUp: 'How has that experience changed how you treat outsiders now?' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_scenario',   icon: '\uD83C\uDFAD', name: 'Perspective Pioneer',     desc: 'Complete your first scenario' },
    { id: 'scenario_5',       icon: '\uD83D\uDD2E', name: 'Mind Reader',             desc: 'Complete 5 scenarios' },
    { id: 'all_characters',   icon: '\uD83D\uDC65', name: 'Every Voice Matters',     desc: 'Explore all characters in a scenario' },
    { id: 'first_swap',       icon: '\uD83D\uDD04', name: 'Viewpoint Explorer',      desc: 'Complete your first viewpoint swap' },
    { id: 'swap_all',         icon: '\uD83C\uDF10', name: 'Viewpoint Virtuoso',      desc: 'Complete all viewpoint swaps' },
    { id: 'empathy_map_1',    icon: '\uD83D\uDDFA\uFE0F', name: 'Empathy Mapper',    desc: 'Complete your first empathy map' },
    { id: 'empathy_map_3',    icon: '\uD83E\uDDE0', name: 'Deep Empath',             desc: 'Complete 3 empathy maps' },
    { id: 'hidden_3',         icon: '\uD83D\uDD0D', name: 'Feelings Detective',      desc: 'Correctly identify 3 hidden feelings' },
    { id: 'hidden_perfect',   icon: '\uD83C\uDFAF', name: 'Master Detective',        desc: 'Get 5 hidden feelings right in a row' },
    { id: 'ai_coach',         icon: '\u2728',        name: 'Perspective Seeker',      desc: 'Use the AI perspective coach' },
    { id: 'total_10',         icon: '\uD83C\uDFC6', name: 'Theory of Mind',           desc: 'Complete 10 activities across all tabs' },
    { id: 'streak_3',         icon: '\uD83D\uDD25', name: 'Practice Streak',          desc: 'Practice 3 days in a row' },
    { id: 'journal_1',        icon: '\uD83D\uDCD4', name: 'Reflective Writer',       desc: 'Complete your first journal reflection' },
    { id: 'journal_3',        icon: '\u270D\uFE0F',  name: 'Deep Thinker',            desc: 'Complete 3 journal reflections' },
    { id: 'respond_1',        icon: '\u2705',        name: 'Action Taker',            desc: 'Complete your first "What Would You Do?"' },
    { id: 'respond_5',        icon: '\uD83E\uDDD7', name: 'Moral Compass',           desc: 'Complete 5 "What Would You Do?" responses' },
    { id: 'respond_empathy',  icon: '\uD83D\uDC9C', name: 'Empathy in Action',       desc: 'Score high empathy on a response' },
    { id: 'story_explorer',   icon: '\uD83D\uDCD6', name: 'Story Explorer',          desc: 'Read 3 empathy stories from multiple perspectives' },
    { id: 'empathy_builder',  icon: '\uD83E\uDDF1', name: 'Empathy Builder',         desc: 'Complete 3 perspective-taking exercises' },
    { id: 'bias_spotter',     icon: '\uD83D\uDCA1', name: 'Bias Spotter',            desc: 'Explore 5 cognitive biases' },
    { id: 'perspective_shift', icon: '\uD83D\uDD00', name: 'Perspective Shifter',    desc: 'Write from 3 different perspectives in Same Event' },
    { id: 'open_mind',        icon: '\uD83C\uDF1F', name: 'Open Mind',               desc: 'Complete a guided journal reflection on a difficult perspective' },
    { id: 'bias_master',      icon: '\uD83E\uDDD0', name: 'Bias Master',             desc: 'Explore all biases in your grade band' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('perspective', {
    icon: '\uD83D\uDD04',
    label: 'Perspective-Taking Lab',
    desc: 'Practice seeing situations through different eyes — build empathy, Theory of Mind, and social awareness.',
    color: 'violet',
    category: 'social-awareness',
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

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.perspective) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('perspective', key); }
        else { if (ctx.update) ctx.update('perspective', key, val); }
      };

      // Navigation
      var activeTab     = d.activeTab || 'scenarios';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Scenario state
      var scenIdx        = d.scenIdx || 0;
      var scenCharIdx    = d.scenCharIdx || null;
      var scenRevealed   = d.scenRevealed || {};
      var scenCompleted  = d.scenCompleted || 0;

      // Viewpoint Swap state
      var swapIdx        = d.swapIdx || 0;
      var swapRevealed   = d.swapRevealed || false;
      var swapViewIdx    = d.swapViewIdx || 0;
      var swapCompleted  = d.swapCompleted || 0;

      // Hidden Feelings state
      var hfIdx          = d.hfIdx || 0;
      var hfChoice       = d.hfChoice || null;
      var hfRevealed     = d.hfRevealed || false;
      var hfCorrect      = d.hfCorrect || 0;
      var hfStreak       = d.hfStreak || 0;
      var hfTotal        = d.hfTotal || 0;

      // Empathy Map state
      var emIdx          = d.emIdx || 0;
      var emThink        = d.emThink || '';
      var emFeel         = d.emFeel || '';
      var emSay          = d.emSay || '';
      var emDo           = d.emDo || '';
      var emCompleted    = d.emCompleted || 0;
      var emSaved        = d.emSaved || false;

      // AI Coach state
      var aiPrompt       = d.aiPrompt || '';
      var aiResponse     = d.aiResponse || null;
      var aiLoading      = d.aiLoading || false;

      // Journal state
      var journalIdx     = d.journalIdx || 0;
      var journalText    = d.journalText || '';
      var journalAiResp  = d.journalAiResp || null;
      var journalAiLoad  = d.journalAiLoad || false;
      var journalSaved   = d.journalSaved || false;
      var journalDone    = d.journalDone || 0;

      // "What Would You Do?" state
      var respondIdx     = d.respondIdx || 0;
      var respondText    = d.respondText || '';
      var respondAiResp  = d.respondAiResp || null;
      var respondAiLoad  = d.respondAiLoad || false;
      var respondDone    = d.respondDone || 0;

      // Empathy Stories state
      var storyIdx       = d.storyIdx || 0;
      var storyPerspIdx  = d.storyPerspIdx || 0;
      var storyReflected = d.storyReflected || false;
      var storyDone      = d.storyDone || 0;

      // Perspective Exercises state
      var exerciseMode   = d.exerciseMode || 'walkInShoes';
      var walkIdx        = d.walkIdx || 0;
      var walkText       = d.walkText || '';
      var walkSaved      = d.walkSaved || false;
      var sameEventIdx   = d.sameEventIdx || 0;
      var sameEventTexts = d.sameEventTexts || {};
      var sameEventDone  = d.sameEventDone || 0;
      var byjIdx         = d.byjIdx || 0;
      var byjRevealed    = d.byjRevealed || false;
      var exerciseDone   = d.exerciseDone || 0;

      // Cognitive Bias state
      var biasIdx        = d.biasIdx || 0;
      var biasExplored   = d.biasExplored || {};
      var biasDone       = d.biasDone || 0;

      // Guided Journal state
      var guidedJIdx     = d.guidedJIdx || 0;
      var guidedJText    = d.guidedJText || '';
      var guidedJSaved   = d.guidedJSaved || false;
      var guidedJShowFU  = d.guidedJShowFU || false;
      var guidedJEntries = d.guidedJEntries || [];
      var guidedJDone    = d.guidedJDone || 0;

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
        var totalActivities = scenCompleted + swapCompleted + emCompleted + hfTotal + journalDone + respondDone + storyDone + exerciseDone + biasDone + guidedJDone;
        if (totalActivities + 1 >= 10) tryAwardBadge('total_10');
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

      var ACCENT = '#8b5cf6';
      var ACCENT_DIM = '#8b5cf622';
      var ACCENT_MED = '#8b5cf644';

      // ══════════════════════════════════════════════════════════
      // ── Tab Bar ──
      // ══════════════════════════════════════════════════════════
      var tabs = [
        { id: 'scenarios', label: '\uD83C\uDFAD Scenarios' },
        { id: 'swap',      label: '\uD83D\uDD04 Viewpoint Swap' },
        { id: 'stories',   label: '\uD83D\uDCD6 Empathy Stories' },
        { id: 'exercises', label: '\uD83D\uDC5F Exercises' },
        { id: 'biases',    label: '\uD83E\uDDD0 Bias Explorer' },
        { id: 'empathy',   label: '\uD83D\uDDFA\uFE0F Empathy Map' },
        { id: 'hidden',    label: '\uD83D\uDD0D Hidden Feelings' },
        { id: 'journal',   label: '\uD83D\uDCD4 Journal' },
        { id: 'guidedJ',   label: '\uD83D\uDCDD Perspective Journal' },
        { id: 'respond',   label: '\u270D\uFE0F What Would You Do?' },
        { id: 'coach',     label: '\u2728 AI Coach' },
        { id: 'progress',  label: '\uD83D\uDCCA Progress' }
      ];

      var tabBar = h('div', {         role: 'tablist', 'aria-label': 'Perspective Taking tabs',
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return h('button', { 'aria-label': tab.label,
            key: tab.id,
            role: 'tab', 'aria-selected': isActive,
            onClick: function() { upd('activeTab', tab.id); if (soundEnabled) sfxClick(); },
            style: {
              padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? ACCENT : 'transparent',
              color: isActive ? '#fff' : '#94a3b8',
              fontWeight: isActive ? 700 : 500, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0
            }
          }, tab.label);
        }),
        h('button', { 'aria-label': '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length,
          onClick: function() { upd('soundEnabled', !soundEnabled); },
          style: { marginLeft: 'auto', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontSize: 14, flexShrink: 0 }
        }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        h('button', { 'aria-label': '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length,
          onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
          style: { padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: showBadgesPanel ? ACCENT_DIM : 'transparent', color: '#94a3b8', fontSize: 14, flexShrink: 0 }
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
            h('div', {               style: { background: 'linear-gradient(135deg, #0c1631 0%, #1e293b 100%)', borderRadius: 20, padding: '32px 40px', textAlign: 'center', border: '2px solid ' + ACCENT, maxWidth: 320 },
              onClick: function(e) { e.stopPropagation(); }
            },
              h('div', { style: { fontSize: 56, marginBottom: 12 } }, popBadge.icon),
              h('p', { style: { fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 } }, 'Badge Earned!'),
              h('h3', { style: { margin: '0 0 8px 0', color: '#f1f5f9', fontSize: 20 } }, popBadge.name),
              h('p', { style: { margin: 0, color: '#94a3b8', fontSize: 13 } }, popBadge.desc),
              h('p', { style: { margin: '12px 0 0 0', color: ACCENT, fontSize: 12, fontWeight: 700 } }, '+25 XP')
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
                  style: { textAlign: 'center', padding: 12, borderRadius: 12, background: earned ? '#0c1631' : '#1e293b', border: '1px solid ' + (earned ? ACCENT : '#334155'), opacity: earned ? 1 : 0.4 }
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
      // ── TAB: Scenario Theater ──
      // ══════════════════════════════════════════════════════════
      var scenContent = null;
      if (activeTab === 'scenarios') {
        var scenList = SCENARIOS[band] || SCENARIOS.elementary;
        var current = scenList[scenIdx % scenList.length];

        var charCards = current.characters.map(function(char, ci) {
          var revKey = current.id + '_' + ci;
          var isRevealed = scenRevealed[revKey];
          return h('div', {
            key: ci,
            style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid ' + (isRevealed ? ACCENT_MED : '#334155'), marginBottom: 10 }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { style: { fontSize: 28 } }, char.emoji),
              h('div', null,
                h('div', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 14 } }, char.name),
                h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, char.question)
              )
            ),
            // Feeling tags
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              char.feelings.map(function(f) {
                return h('span', {                   key: f,
                  style: { padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ACCENT_DIM, color: '#c4b5fd', border: '1px solid ' + ACCENT_MED }
                }, f);
              })
            ),
            // Reveal / show explanation
            !isRevealed ?
              h('button', { 'aria-label': 'Toggle sound',
                onClick: function() {
                  var newRevealed = Object.assign({}, scenRevealed);
                  newRevealed[revKey] = true;
                  upd('scenRevealed', newRevealed);
                  if (soundEnabled) sfxReveal();
                  awardXP(5);
                  // Check if all characters explored
                  var allRevealed = current.characters.every(function(c, i) { return newRevealed[current.id + '_' + i]; });
                  if (allRevealed) tryAwardBadge('all_characters');
                },
                style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
              }, '\uD83D\uDCA1 Reveal Perspective')
            :
              h('div', { style: { padding: 12, borderRadius: 8, background: '#1e293b', border: '1px solid ' + ACCENT_MED, fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } },
                char.best
              )
          );
        });

        scenContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83C\uDFAD How Do They Feel?' : '\uD83C\uDFAD Scenario Theater'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
            band === 'elementary' ? 'Read the story, then explore how each person might feel.' :
            band === 'middle' ? 'Read the scenario and consider each character\'s inner experience.' :
            'Analyze the emotional and social dynamics of each character.'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 16 } },
            'Scenarios completed: ' + scenCompleted
          ),
          // Story card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700, textAlign: 'center' } },
              current.title + ' \u2014 Scenario ' + ((scenIdx % scenList.length) + 1) + ' of ' + scenList.length
            ),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7 } }, current.story)
          ),
          // Character cards
          h('div', null, charCards),
          // Next scenario button
          h('div', { style: { display: 'flex', justifyContent: 'center', marginTop: 16 } },
            h('button', { 'aria-label': 'Next Scenario',
              onClick: function() {
                upd({
                  scenIdx: scenIdx + 1,
                  scenCharIdx: null,
                  scenRevealed: {},
                  scenCompleted: scenCompleted + 1
                });
                logPractice('scenario', current.id);
                if (scenCompleted === 0) tryAwardBadge('first_scenario');
                if (scenCompleted + 1 >= 5) tryAwardBadge('scenario_5');
                if (soundEnabled) sfxClick();
                if (celebrate) celebrate();
                ctx.announceToSR && ctx.announceToSR('Next scenario loaded');
              },
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Scenario \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Viewpoint Swap ──
      // ══════════════════════════════════════════════════════════
      var swapContent = null;
      if (activeTab === 'swap') {
        var swapList = VIEWPOINT_SWAPS[band] || VIEWPOINT_SWAPS.elementary;
        var curSwap = swapList[swapIdx % swapList.length];

        swapContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDD04 Viewpoint Swap'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
            band === 'elementary' ? 'See the same situation through different eyes!' :
            'Same situation, different perspectives. Notice how the same event means different things to different people.'
          ),
          // Situation
          h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16, textAlign: 'center' } },
            h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } },
              curSwap.title + ' \u2014 ' + ((swapIdx % swapList.length) + 1) + ' of ' + swapList.length
            ),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.6 } }, curSwap.situation)
          ),
          // Perspective toggle
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 } },
            curSwap.perspectives.map(function(p, pi) {
              var isActive = swapViewIdx === pi;
              return h('button', { 'aria-label': p.emoji + ' ' + p.name,
                key: pi,
                onClick: function() { upd('swapViewIdx', pi); if (soundEnabled) sfxSwap(); },
                style: {
                  padding: '10px 20px', borderRadius: 10, border: '2px solid ' + (isActive ? ACCENT : '#334155'),
                  background: isActive ? ACCENT_DIM : '#1e293b', color: isActive ? '#c4b5fd' : '#94a3b8',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
                }
              }, p.emoji + ' ' + p.name);
            })
          ),
          // Current perspective
          h('div', { style: { padding: 20, borderRadius: 12, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
              h('span', { style: { fontSize: 32 } }, curSwap.perspectives[swapViewIdx].emoji),
              h('div', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 15 } }, curSwap.perspectives[swapViewIdx].name + '\'s Perspective')
            ),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, fontStyle: 'italic' } },
              '"' + curSwap.perspectives[swapViewIdx].view + '"'
            )
          ),
          // Reveal insight
          !swapRevealed ?
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Reveal the Insight',
                onClick: function() { upd('swapRevealed', true); if (soundEnabled) sfxReveal(); awardXP(10); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\uD83D\uDCA1 Reveal the Insight')
            )
          :
            h('div', null,
              h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #22c55e44', marginBottom: 16 } },
                h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, 'The Insight'),
                h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, curSwap.insight)
              ),
              h('div', { style: { textAlign: 'center' } },
                h('button', { 'aria-label': 'Next Swap',
                  onClick: function() {
                    upd({
                      swapIdx: swapIdx + 1,
                      swapRevealed: false,
                      swapViewIdx: 0,
                      swapCompleted: swapCompleted + 1
                    });
                    logPractice('swap', curSwap.id);
                    if (swapCompleted === 0) tryAwardBadge('first_swap');
                    if (swapCompleted + 1 >= swapList.length) tryAwardBadge('swap_all');
                    if (soundEnabled) sfxClick();
                    if (celebrate) celebrate();
                    ctx.announceToSR && ctx.announceToSR('Next viewpoint swap loaded');
                  },
                  style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, 'Next Swap \u2192')
              )
            )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Empathy Map ──
      // ══════════════════════════════════════════════════════════
      var emContent = null;
      if (activeTab === 'empathy') {
        var emList = EMPATHY_PROMPTS[band] || EMPATHY_PROMPTS.elementary;
        var curEm = emList[emIdx % emList.length];

        emContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDDFA\uFE0F Empathy Map'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
            band === 'elementary' ? 'Imagine you are this person. What might they think, feel, say, and do?' :
            'Step into this person\'s experience. Map their inner world across four dimensions.'
          ),
          // Person card
          h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16, textAlign: 'center' } },
            h('span', { style: { fontSize: 36 } }, curEm.emoji),
            h('h4', { style: { margin: '8px 0 4px 0', color: '#f1f5f9', fontSize: 15 } }, curEm.name),
            h('p', { style: { fontSize: 13, color: '#94a3b8', lineHeight: 1.5 } }, curEm.context)
          ),
          // Empathy map grid
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 } },
            [
              { key: 'emThink', label: '\uD83D\uDCAD Think', placeholder: 'What thoughts are going through their mind?', val: emThink, color: '#3b82f6' },
              { key: 'emFeel', label: '\u2764\uFE0F Feel', placeholder: 'What emotions are they experiencing?', val: emFeel, color: '#ef4444' },
              { key: 'emSay', label: '\uD83D\uDDE3\uFE0F Say', placeholder: 'What might they say out loud (or not say)?', val: emSay, color: '#22c55e' },
              { key: 'emDo', label: '\uD83D\uDCAA Do', placeholder: 'What actions might they take?', val: emDo, color: '#f59e0b' }
            ].map(function(field) {
              return h('div', {
                key: field.key,
                style: { padding: 12, borderRadius: 12, background: '#1e293b', border: '1px solid ' + field.color + '44' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: field.color, marginBottom: 6 } }, field.label),
                h('textarea', {
                  value: field.val,
                  'aria-label': field.label + ' empathy map field',
                  onChange: function(e) { upd(field.key, e.target.value); if (emSaved) upd('emSaved', false); },
                  placeholder: field.placeholder,
                  rows: 3,
                  style: { width: '100%', padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
                })
              );
            })
          ),
          // Save & next buttons
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
            h('button', { 'aria-label': 'Toggle sound',
              onClick: function() {
                if (!emThink && !emFeel && !emSay && !emDo) {
                  addToast('Fill in at least one quadrant first!', 'info');
                  return;
                }
                upd('emSaved', true);
                if (soundEnabled) sfxCorrect();
                awardXP(15);
                var newCompleted = emCompleted + 1;
                upd('emCompleted', newCompleted);
                logPractice('empathy', curEm.name);
                if (newCompleted === 1) tryAwardBadge('empathy_map_1');
                if (newCompleted >= 3) tryAwardBadge('empathy_map_3');
                addToast('Empathy map saved!', 'success');
                ctx.announceToSR && ctx.announceToSR('Empathy map saved');
              },
              disabled: emSaved,
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: emSaved ? '#334155' : ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: emSaved ? 'default' : 'pointer', opacity: emSaved ? 0.5 : 1 }
            }, emSaved ? '\u2705 Saved' : '\uD83D\uDCBE Save Map'),
            h('button', { 'aria-label': 'Next Person',
              onClick: function() {
                upd({
                  emIdx: emIdx + 1,
                  emThink: '', emFeel: '', emSay: '', emDo: '',
                  emSaved: false
                });
                if (soundEnabled) sfxClick();
                ctx.announceToSR && ctx.announceToSR('New empathy map prompt loaded');
              },
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Person \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Hidden Feelings ──
      // ══════════════════════════════════════════════════════════
      var hfContent = null;
      if (activeTab === 'hidden') {
        var hfList = HIDDEN_FEELINGS[band] || HIDDEN_FEELINGS.elementary;
        var curHf = hfList[hfIdx % hfList.length];

        hfContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDD0D Hidden Feelings'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
            band === 'elementary' ? 'Sometimes what people say isn\'t what they really feel. Can you spot the hidden feeling?' :
            'What someone says on the surface often masks what they feel underneath. Decode the real emotion.'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 16 } },
            'Score: ' + hfCorrect + '/' + hfTotal + (hfStreak >= 2 ? '  \uD83D\uDD25 Streak: ' + hfStreak : '')
          ),
          // Situation
          h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700, textAlign: 'center' } },
              'Situation ' + ((hfIdx % hfList.length) + 1) + ' of ' + hfList.length
            ),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 12 } }, curHf.situation),
            h('div', { style: { padding: 14, borderRadius: 10, background: '#1e293b', border: '1px solid #334155' } },
              h('p', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 } }, 'What they said:'),
              h('p', { style: { fontSize: 15, color: '#f1f5f9', fontStyle: 'italic', lineHeight: 1.5 } }, curHf.said)
            )
          ),
          // Options
          h('p', { style: { fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textAlign: 'center' } },
            band === 'elementary' ? 'What are they REALLY feeling?' : 'What\'s the hidden emotion?'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 } },
            curHf.options.map(function(opt) {
              var isChosen = hfChoice === opt;
              var isCorrect = hfRevealed && opt === curHf.realFeeling;
              var isWrong = hfRevealed && isChosen && opt !== curHf.realFeeling;
              var bg = isCorrect ? '#22c55e33' : isWrong ? '#ef444433' : isChosen ? ACCENT_DIM : '#1e293b';
              var bdr = isCorrect ? '#22c55e' : isWrong ? '#ef4444' : isChosen ? ACCENT : '#334155';
              return h('button', { 'aria-label': 'Toggle sound',
                key: opt,
                onClick: function() {
                  if (hfRevealed) return;
                  upd('hfChoice', opt);
                  upd('hfRevealed', true);
                  var correct = opt === curHf.realFeeling;
                  var newTotal = hfTotal + 1;
                  upd('hfTotal', newTotal);
                  if (correct) {
                    var newCorrect = hfCorrect + 1;
                    var newStreak = hfStreak + 1;
                    upd('hfCorrect', newCorrect);
                    upd('hfStreak', newStreak);
                    if (soundEnabled) sfxCorrect();
                    awardXP(10);
                    if (newCorrect >= 3) tryAwardBadge('hidden_3');
                    if (newStreak >= 5) tryAwardBadge('hidden_perfect');
                  } else {
                    upd('hfStreak', 0);
                    if (soundEnabled) sfxWrong();
                  }
                  logPractice('hidden', curHf.id);
                },
                style: {
                  padding: '12px 8px', borderRadius: 10, border: '2px solid ' + bdr,
                  background: bg, color: '#f1f5f9', fontWeight: 600, fontSize: 13,
                  cursor: hfRevealed ? 'default' : 'pointer', textTransform: 'capitalize'
                }
              }, (isCorrect ? '\u2705 ' : isWrong ? '\u274C ' : '') + opt);
            })
          ),
          // Explanation
          hfRevealed && h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #22c55e44', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, 'Why ' + curHf.realFeeling + '?'),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, curHf.explanation)
          ),
          // Next
          hfRevealed && h('div', { style: { textAlign: 'center' } },
            h('button', { 'aria-label': 'Next',
              onClick: function() {
                upd({ hfIdx: hfIdx + 1, hfChoice: null, hfRevealed: false });
                if (soundEnabled) sfxClick();
                ctx.announceToSR && ctx.announceToSR('Next hidden feeling loaded');
              },
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: AI Coach ──
      // ══════════════════════════════════════════════════════════
      var coachContent = null;
      if (activeTab === 'coach') {
        coachContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\u2728 Perspective Coach'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
            'Describe a situation and I\'ll help you see it from different perspectives.'
          ),
          h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('textarea', {
              value: aiPrompt,
              'aria-label': 'Ask the perspective AI coach',
              onChange: function(e) { upd('aiPrompt', e.target.value); },
              placeholder: band === 'elementary'
                ? 'Tell me about a time when someone didn\'t understand how you felt, or you didn\'t understand how they felt...'
                : 'Describe a social situation where people might see things differently — a conflict, a misunderstanding, a moment where perspectives diverged...',
              rows: 4,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }
            }),
            h('button', { 'aria-label': 'thoughtful, nuanced language for ages 15-18',
              onClick: function() {
                if (!aiPrompt.trim()) { addToast('Describe a situation first!', 'info'); return; }
                if (!callGemini) { addToast('AI coach is not available right now.', 'error'); return; }
                upd('aiLoading', true);
                upd('aiResponse', null);
                var systemPrompt = 'You are a perspective-taking coach for ' + band + ' school students. ' +
                  'The student has described a social situation. Respond with:\n' +
                  '1. A brief summary of the situation\n' +
                  '2. TWO different perspectives — name each person and describe what they might be thinking, feeling, and why\n' +
                  '3. A key insight about what both perspectives reveal\n' +
                  '4. One question for the student to reflect on\n\n' +
                  'Use ' + (band === 'elementary' ? 'simple, warm language appropriate for ages 5-10' : band === 'middle' ? 'clear language appropriate for ages 11-14' : 'thoughtful, nuanced language for ages 15-18') + '.\n' +
                  'Keep the response under 300 words.\n\n' +
                  'Student\'s situation: ' + aiPrompt;
                callGemini(systemPrompt).then(function(result) {
                  var text = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                  upd('aiResponse', text);
                  upd('aiLoading', false);
                  tryAwardBadge('ai_coach');
                  awardXP(10);
                  logPractice('coach', 'custom');
                }).catch(function(err) {
                  upd('aiLoading', false);
                  addToast('Coach error: ' + err.message, 'error');
                });
              },
              disabled: aiLoading,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: aiLoading ? '#334155' : ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: aiLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
            },
              aiLoading ? 'Thinking...' : h(Sparkles, { size: 14 }), aiLoading ? null : ' Explore Perspectives'
            )
          ),
          // AI Response
          aiResponse && h('div', { style: { padding: 20, borderRadius: 12, background: '#1e293b', border: '1px solid ' + ACCENT_MED } },
            h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 700 } }, 'Perspective Analysis'),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, aiResponse)
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Perspective Journal ──
      // ══════════════════════════════════════════════════════════
      var journalContent = null;
      if (activeTab === 'journal') {
        var jPrompts = JOURNAL_PROMPTS[band] || JOURNAL_PROMPTS.elementary;
        var curJournal = jPrompts[journalIdx % jPrompts.length];

        journalContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCD4 Perspective Journal'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
            'Reflect on how you see the world — and how others see it differently.'
          ),
          // Prompt counter
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Prompt ' + ((journalIdx % jPrompts.length) + 1) + ' of ' + jPrompts.length +
            (journalDone > 0 ? ' \u00B7 ' + journalDone + ' completed' : '')
          ),
          // Prompt card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, fontStyle: 'italic' } }, '\u201C' + curJournal.prompt + '\u201D'),
            // Skip button
            h('div', { style: { textAlign: 'right', marginTop: 8 } },
              h('button', { 'aria-label': 'Skip to another prompt',
                onClick: function() {
                  upd({ journalIdx: journalIdx + 1, journalText: '', journalAiResp: null, journalSaved: false });
                  if (soundEnabled) sfxClick();
                },
                style: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }
              }, 'Skip to another prompt \u2192')
            )
          ),
          // Writing area
          h('div', { style: { marginBottom: 16 } },
            h('textarea', {
              value: journalText,
              'aria-label': 'Perspective journal entry',
              onChange: function(e) { upd('journalText', e.target.value); upd('journalSaved', false); },
              placeholder: band === 'elementary'
                ? 'Write your thoughts here... Try to use feeling words and tell why you think that way.'
                : band === 'middle'
                ? 'Write your reflection here... Try to consider multiple perspectives and explain your reasoning.'
                : 'Write your reflection here... Push yourself to examine assumptions, consider systemic factors, and articulate nuance.',
              rows: 6,
              style: { width: '100%', padding: 14, borderRadius: 12, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }
            }),
            // Word count
            h('div', { style: { textAlign: 'right', color: '#94a3b8', fontSize: 11, marginTop: 4 } },
              (journalText.trim() ? journalText.trim().split(/\s+/).length : 0) + ' words'
            )
          ),
          // Action buttons
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 } },
            // Get AI feedback
            h('button', { 'aria-label': 'Get AI feedback',
              onClick: function() {
                var text = journalText.trim();
                if (text.split(/\s+/).length < 10) { addToast('Write a bit more first — at least a few sentences!', 'info'); return; }
                if (!callGemini) { addToast('AI feedback is not available right now.', 'error'); return; }
                upd('journalAiLoad', true);
                upd('journalAiResp', null);
                var sysPrompt = 'You are a compassionate perspective-taking coach for ' + band + ' school students. ' +
                  'A student has written a reflective journal entry in response to this prompt:\n\n' +
                  '"' + curJournal.prompt + '"\n\n' +
                  'Their response:\n"' + text + '"\n\n' +
                  'Provide warm, encouraging feedback that:\n' +
                  '1. Acknowledges what they did well (specific empathy, self-awareness, or perspective-taking they showed)\n' +
                  '2. Gently offers ONE deeper question or angle they could explore\n' +
                  '3. Validates their feelings and effort\n\n' +
                  'Use ' + (band === 'elementary' ? 'simple, encouraging language for ages 5-10. Be warm and specific about what they did well.' :
                    band === 'middle' ? 'supportive language for ages 11-14. Recognize emotional complexity.' :
                    'thoughtful, nuanced language for ages 15-18. Recognize sophistication in their thinking.') + '\n' +
                  'Keep it under 150 words. Never be judgmental. Start with something genuine you noticed in their writing.';
                callGemini(sysPrompt).then(function(result) {
                  var resp = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                  upd('journalAiResp', resp);
                  upd('journalAiLoad', false);
                  awardXP(10);
                }).catch(function(err) {
                  upd('journalAiLoad', false);
                  addToast('Feedback error: ' + err.message, 'error');
                });
              },
              disabled: journalAiLoad || journalText.trim().split(/\s+/).length < 10,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: journalAiLoad ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: journalAiLoad ? 'default' : 'pointer' }
            }, journalAiLoad ? 'Reading...' : '\u2728 Get Feedback'),
            // Save & Next
            h('button', { 'aria-label': 'Feedback',
              onClick: function() {
                if (journalText.trim().split(/\s+/).length < 5) { addToast('Write at least a few words first!', 'info'); return; }
                var newDone = journalDone + 1;
                upd({ journalSaved: true, journalDone: newDone });
                logPractice('journal', curJournal.id);
                if (soundEnabled) sfxCorrect();
                addToast('Journal entry saved! \uD83D\uDCD4', 'success');
                awardXP(15);
                tryAwardBadge('journal_1');
                if (newDone >= 3) tryAwardBadge('journal_3');
                ctx.announceToSR && ctx.announceToSR('Journal entry saved');
              },
              disabled: journalSaved,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: journalSaved ? '#22c55e' : ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: journalSaved ? 'default' : 'pointer' }
            }, journalSaved ? '\u2705 Saved!' : '\uD83D\uDCBE Save Entry')
          ),
          // AI Feedback display
          journalAiResp && h('div', { style: { padding: 20, borderRadius: 12, background: '#1e293b', border: '1px solid #6366f144', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 700 } }, '\u2728 Feedback'),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, journalAiResp)
          ),
          // Next prompt (after saving)
          journalSaved && h('div', { style: { textAlign: 'center' } },
            h('button', { 'aria-label': 'Next Prompt',
              onClick: function() {
                upd({ journalIdx: journalIdx + 1, journalText: '', journalAiResp: null, journalSaved: false });
                if (soundEnabled) sfxClick();
                ctx.announceToSR && ctx.announceToSR('New journal prompt loaded');
              },
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Prompt \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: What Would You Do? ──
      // ══════════════════════════════════════════════════════════
      var respondContent = null;
      if (activeTab === 'respond') {
        var rScenarios = RESPOND_SCENARIOS[band] || RESPOND_SCENARIOS.elementary;
        var curRespond = rScenarios[respondIdx % rScenarios.length];

        respondContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\u270D\uFE0F What Would You Do?'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
            'Read the situation, decide your response, and see how it scores on empathy and perspective-awareness.'
          ),
          // Scenario counter
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Scenario ' + ((respondIdx % rScenarios.length) + 1) + ' of ' + rScenarios.length +
            (respondDone > 0 ? ' \u00B7 ' + respondDone + ' completed' : '')
          ),
          // Scenario card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #f59e0b44', marginBottom: 16 } },
            h('h4', { style: { color: '#f59e0b', fontSize: 15, marginBottom: 10, fontWeight: 700 } }, curRespond.title),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 12 } }, curRespond.situation),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 10, color: '#94a3b8', background: '#1e293b', padding: '3px 8px', borderRadius: 6 } }, '\uD83D\uDC65 ' + curRespond.stakeholders)
            ),
            // Skip
            h('div', { style: { textAlign: 'right', marginTop: 8 } },
              h('button', { 'aria-label': 'Skip to another scenario',
                onClick: function() {
                  upd({ respondIdx: respondIdx + 1, respondText: '', respondAiResp: null });
                  if (soundEnabled) sfxClick();
                },
                style: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }
              }, 'Skip to another scenario \u2192')
            )
          ),
          // Response area
          h('div', { style: { marginBottom: 16 } },
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 } },
              band === 'elementary' ? 'What would you do? Why?' : 'What would you do? Explain your reasoning and consider how your choice affects everyone involved.'
            ),
            h('textarea', {
              value: respondText,
              'aria-label': 'Your response to the scenario',
              onChange: function(e) { upd('respondText', e.target.value); },
              placeholder: band === 'elementary'
                ? 'I would... because...'
                : 'I would... My reasoning is... This might affect [the people involved] by...',
              rows: 5,
              style: { width: '100%', padding: 14, borderRadius: 12, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }
            }),
            h('div', { style: { textAlign: 'right', color: '#94a3b8', fontSize: 11, marginTop: 4 } },
              (respondText.trim() ? respondText.trim().split(/\s+/).length : 0) + ' words'
            )
          ),
          // Submit for evaluation
          h('div', { style: { textAlign: 'center', marginBottom: 16 } },
            h('button', { 'aria-label': 'Select perspective',
              onClick: function() {
                var text = respondText.trim();
                if (text.split(/\s+/).length < 8) { addToast('Write a bit more about what you\'d do and why!', 'info'); return; }
                if (!callGemini) { addToast('AI evaluation is not available right now.', 'error'); return; }
                upd('respondAiLoad', true);
                upd('respondAiResp', null);
                var sysPrompt = 'You are an empathy and perspective-taking evaluator for ' + band + ' school students.\n\n' +
                  'SCENARIO: "' + curRespond.title + '"\n' + curRespond.situation + '\n' +
                  'Stakeholders: ' + curRespond.stakeholders + '\n' +
                  'Key evaluation areas: ' + curRespond.evalFocus + '\n\n' +
                  'STUDENT\'S RESPONSE:\n"' + text + '"\n\n' +
                  'Evaluate their response on THREE dimensions. For each, give a rating (1-5 stars) and a brief explanation:\n\n' +
                  '**Empathy** (1-5): Did they show understanding of others\' feelings?\n' +
                  '**Perspective-Awareness** (1-5): Did they consider multiple viewpoints and how their action affects different people?\n' +
                  '**Actionability** (1-5): Is their response realistic and constructive?\n\n' +
                  'Then provide:\n- One thing they did really well\n- One perspective or angle they might have missed\n- A follow-up question to deepen their thinking\n\n' +
                  'Use ' + (band === 'elementary' ? 'simple, warm, encouraging language for ages 5-10.' :
                    band === 'middle' ? 'clear, supportive language for ages 11-14.' :
                    'thoughtful, nuanced language for ages 15-18. Expect more sophisticated reasoning.') + '\n' +
                  'Be encouraging but honest. Keep the total response under 250 words.\n' +
                  'Format the star ratings as emoji stars (e.g., \u2B50\u2B50\u2B50\u2B50 = 4/5).';
                callGemini(sysPrompt).then(function(result) {
                  var resp = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                  upd('respondAiResp', resp);
                  upd('respondAiLoad', false);
                  var newDone = respondDone + 1;
                  upd('respondDone', newDone);
                  logPractice('respond', curRespond.id);
                  awardXP(15);
                  tryAwardBadge('respond_1');
                  if (newDone >= 5) tryAwardBadge('respond_5');
                  // Check for high empathy (rough heuristic: 4+ stars mentioned)
                  if (resp.match(/\u2B50\u2B50\u2B50\u2B50/)) tryAwardBadge('respond_empathy');
                  if (soundEnabled) sfxCorrect();
                }).catch(function(err) {
                  upd('respondAiLoad', false);
                  addToast('Evaluation error: ' + err.message, 'error');
                });
              },
              disabled: respondAiLoad || respondText.trim().split(/\s+/).length < 8,
              style: { padding: '12px 28px', borderRadius: 10, border: 'none', background: respondAiLoad ? '#334155' : '#f59e0b', color: respondAiLoad ? '#94a3b8' : '#0f172a', fontWeight: 700, fontSize: 14, cursor: respondAiLoad ? 'default' : 'pointer' }
            }, respondAiLoad ? 'Evaluating...' : '\uD83C\uDFAF Submit My Response')
          ),
          // Evaluation display
          respondAiResp && h('div', { style: { padding: 20, borderRadius: 14, background: '#1e293b', border: '1px solid #f59e0b44', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, fontWeight: 700 } }, '\uD83C\uDFAF Evaluation'),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, respondAiResp)
          ),
          // Next scenario
          respondAiResp && h('div', { style: { textAlign: 'center' } },
            h('button', { 'aria-label': 'Next Scenario',
              onClick: function() {
                upd({ respondIdx: respondIdx + 1, respondText: '', respondAiResp: null });
                if (soundEnabled) sfxClick();
                ctx.announceToSR && ctx.announceToSR('New scenario loaded');
              },
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Scenario \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Empathy Stories ──
      // ══════════════════════════════════════════════════════════
      var storiesContent = null;
      if (activeTab === 'stories') {
        var storyList = EMPATHY_STORIES[band] || EMPATHY_STORIES.elementary;
        var curStory = storyList[storyIdx % storyList.length];

        storiesContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            '\uD83D\uDCD6 Empathy Stories'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
            band === 'elementary' ? 'Read a story, then see it through different eyes.' :
            band === 'middle' ? 'Every story has more than one side. Explore them all.' :
            'Narrative vignettes told from multiple perspectives. Notice whose story you default to.'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 16 } },
            'Story ' + ((storyIdx % storyList.length) + 1) + ' of ' + storyList.length +
            (storyDone > 0 ? ' \u00B7 ' + storyDone + ' explored' : '')
          ),
          // Story intro
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700, textAlign: 'center' } },
              curStory.title
            ),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7 } }, curStory.intro)
          ),
          // Perspective tabs
          h('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' } },
            curStory.perspectives.map(function(p, pi) {
              var isActive = storyPerspIdx === pi;
              return h('button', { 'aria-label': p.emoji + ' ' + p.name,
                key: pi,
                onClick: function() { upd('storyPerspIdx', pi); if (soundEnabled) sfxSwap(); },
                style: {
                  padding: '8px 16px', borderRadius: 10, border: '2px solid ' + (isActive ? ACCENT : '#334155'),
                  background: isActive ? ACCENT_DIM : '#1e293b', color: isActive ? '#c4b5fd' : '#94a3b8',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s'
                }
              }, p.emoji + ' ' + p.name);
            })
          ),
          // Current perspective text
          h('div', { style: { padding: 20, borderRadius: 12, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
              h('span', { style: { fontSize: 28 } }, curStory.perspectives[storyPerspIdx % curStory.perspectives.length].emoji),
              h('div', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 14 } }, curStory.perspectives[storyPerspIdx % curStory.perspectives.length].name)
            ),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, fontStyle: 'italic' } },
              '\u201C' + curStory.perspectives[storyPerspIdx % curStory.perspectives.length].text + '\u201D'
            )
          ),
          // Reflection reveal
          !storyReflected ?
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Reveal Reflection',
                onClick: function() {
                  upd('storyReflected', true);
                  if (soundEnabled) sfxReveal();
                  awardXP(10);
                },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\uD83D\uDCA1 Reveal Reflection')
            )
          :
            h('div', null,
              h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #22c55e44', marginBottom: 16 } },
                h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, 'Reflection'),
                h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, curStory.reflection)
              ),
              h('div', { style: { textAlign: 'center' } },
                h('button', { 'aria-label': 'Next Story',
                  onClick: function() {
                    var newDone = storyDone + 1;
                    upd({
                      storyIdx: storyIdx + 1,
                      storyPerspIdx: 0,
                      storyReflected: false,
                      storyDone: newDone
                    });
                    logPractice('story', curStory.id);
                    if (newDone >= 3) tryAwardBadge('story_explorer');
                    if (soundEnabled) sfxClick();
                    if (celebrate) celebrate();
                    ctx.announceToSR && ctx.announceToSR('Next empathy story loaded');
                  },
                  style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, 'Next Story \u2192')
              )
            )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Perspective-Taking Exercises ──
      // ══════════════════════════════════════════════════════════
      var exercisesContent = null;
      if (activeTab === 'exercises') {
        var exModes = [
          { id: 'walkInShoes', label: '\uD83D\uDC5F Walk in Their Shoes' },
          { id: 'sameEvent',   label: '\uD83D\uDC41\uFE0F Same Event, Different Eyes' },
          { id: 'beforeJudge', label: '\u2696\uFE0F Before You Judge' }
        ];

        var exModeBar = h('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' } },
          exModes.map(function(m) {
            var isActive = exerciseMode === m.id;
            return h('button', { 'aria-label': m.label,
              key: m.id,
              onClick: function() { upd('exerciseMode', m.id); if (soundEnabled) sfxClick(); },
              style: {
                padding: '7px 14px', borderRadius: 8, border: '2px solid ' + (isActive ? '#22c55e' : '#334155'),
                background: isActive ? '#22c55e22' : '#1e293b', color: isActive ? '#22c55e' : '#94a3b8',
                fontWeight: 600, fontSize: 11, cursor: 'pointer'
              }
            }, m.label);
          })
        );

        var exerciseBody = null;

        // Walk in Their Shoes
        if (exerciseMode === 'walkInShoes') {
          var walkList = PERSPECTIVE_EXERCISES.walkInShoes[band] || PERSPECTIVE_EXERCISES.walkInShoes.elementary;
          var curWalk = walkList[walkIdx % walkList.length];

          exerciseBody = h('div', null,
            h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #22c55e44', marginBottom: 16, textAlign: 'center' } },
              h('span', { style: { fontSize: 36 } }, curWalk.emoji),
              h('h4', { style: { margin: '8px 0 4px 0', color: '#f1f5f9', fontSize: 15 } }, curWalk.person),
              h('p', { style: { fontSize: 13, color: '#94a3b8', lineHeight: 1.6 } }, curWalk.prompt)
            ),
            h('textarea', {
              value: walkText,
              'aria-label': 'Perspective walk reflection',
              onChange: function(e) { upd('walkText', e.target.value); upd('walkSaved', false); },
              placeholder: 'Write from this person\u2019s perspective. Describe their day, their feelings, their challenges...',
              rows: 6,
              style: { width: '100%', padding: 14, borderRadius: 12, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 8 }
            }),
            h('div', { style: { textAlign: 'right', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
              (walkText.trim() ? walkText.trim().split(/\s+/).length : 0) + ' words'
            ),
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
              h('button', { 'aria-label': 'Next Person',
                onClick: function() {
                  if (walkText.trim().split(/\s+/).length < 10) { addToast('Write a bit more \u2014 at least a few sentences!', 'info'); return; }
                  upd('walkSaved', true);
                  var newExDone = exerciseDone + 1;
                  upd('exerciseDone', newExDone);
                  logPractice('exercise', curWalk.id);
                  if (newExDone >= 3) tryAwardBadge('empathy_builder');
                  if (soundEnabled) sfxCorrect();
                  awardXP(15);
                  addToast('Perspective saved!', 'success');
                },
                disabled: walkSaved,
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: walkSaved ? '#22c55e' : ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: walkSaved ? 'default' : 'pointer' }
              }, walkSaved ? '\u2705 Saved!' : '\uD83D\uDCBE Save'),
              h('button', { 'aria-label': 'Next Person',
                onClick: function() {
                  upd({ walkIdx: walkIdx + 1, walkText: '', walkSaved: false });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, 'Next Person \u2192')
            )
          );
        }

        // Same Event, Different Eyes
        if (exerciseMode === 'sameEvent') {
          var seList = PERSPECTIVE_EXERCISES.sameEvent;
          var curSE = seList[sameEventIdx % seList.length];
          var gradeHint = curSE.gradeHint[band] || curSE.gradeHint.elementary;

          exerciseBody = h('div', null,
            h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #3b82f644', marginBottom: 16 } },
              h('h4', { style: { color: '#3b82f6', fontSize: 15, marginBottom: 8, textAlign: 'center' } }, curSE.title),
              h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10, textAlign: 'center' } }, curSE.event),
              h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' } }, gradeHint)
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 } },
              curSE.characters.map(function(charName, ci) {
                var textKey = curSE.id + '_' + ci;
                var charText = (sameEventTexts[textKey]) || '';
                return h('div', {
                  key: ci,
                  style: { padding: 12, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
                },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: '#3b82f6', marginBottom: 6 } }, '\uD83D\uDC64 ' + charName),
                  h('textarea', {
                    value: charText,
                    'aria-label': 'Character perspective response',
                    onChange: function(e) {
                      var newTexts = Object.assign({}, sameEventTexts);
                      newTexts[textKey] = e.target.value;
                      upd('sameEventTexts', newTexts);
                    },
                    placeholder: 'Write from ' + charName + '\u2019s perspective...',
                    rows: 3,
                    style: { width: '100%', padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
                  })
                );
              })
            ),
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
              h('button', { 'aria-label': 'Save All Perspectives',
                onClick: function() {
                  var filled = curSE.characters.filter(function(c, ci) {
                    var k = curSE.id + '_' + ci;
                    return sameEventTexts[k] && sameEventTexts[k].trim().length > 10;
                  }).length;
                  if (filled < 2) { addToast('Write from at least 2 perspectives first!', 'info'); return; }
                  var newSEDone = sameEventDone + 1;
                  var newExDone = exerciseDone + 1;
                  upd('sameEventDone', newSEDone);
                  upd('exerciseDone', newExDone);
                  logPractice('exercise', curSE.id);
                  if (newExDone >= 3) tryAwardBadge('empathy_builder');
                  if (filled >= 3) tryAwardBadge('perspective_shift');
                  if (soundEnabled) sfxCorrect();
                  awardXP(20);
                  addToast('Multi-perspective writing saved!', 'success');
                  if (celebrate) celebrate();
                },
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\uD83D\uDCBE Save All Perspectives'),
              h('button', { 'aria-label': 'Next Event',
                onClick: function() {
                  upd({ sameEventIdx: sameEventIdx + 1, sameEventTexts: {} });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, 'Next Event \u2192')
            )
          );
        }

        // Before You Judge
        if (exerciseMode === 'beforeJudge') {
          var byjList = PERSPECTIVE_EXERCISES.beforeYouJudge[band] || PERSPECTIVE_EXERCISES.beforeYouJudge.elementary;
          var curBYJ = byjList[byjIdx % byjList.length];

          exerciseBody = h('div', null,
            h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #f59e0b44', marginBottom: 16 } },
              h('p', { style: { fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700, textAlign: 'center' } }, 'What You See'),
              h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7 } }, curBYJ.surface)
            ),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12, fontStyle: 'italic' } },
              'What is your first assumption about this person?'
            ),
            !byjRevealed ?
              h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                h('button', { 'aria-label': 'Reveal the Full Story',
                  onClick: function() {
                    upd('byjRevealed', true);
                    if (soundEnabled) sfxReveal();
                    awardXP(10);
                    var newExDone = exerciseDone + 1;
                    upd('exerciseDone', newExDone);
                    logPractice('exercise', curBYJ.id);
                    if (newExDone >= 3) tryAwardBadge('empathy_builder');
                  },
                  style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#0f172a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
                }, '\uD83D\uDD13 Reveal the Full Story')
              )
            :
              h('div', null,
                h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #22c55e44', marginBottom: 12 } },
                  h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700, textAlign: 'center' } }, 'The Full Story'),
                  h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7 } }, curBYJ.reveal)
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
                  h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, 'The Lesson'),
                  h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, curBYJ.lesson)
                ),
                h('div', { style: { textAlign: 'center' } },
                  h('button', { 'aria-label': 'Next Scenario',
                    onClick: function() {
                      upd({ byjIdx: byjIdx + 1, byjRevealed: false });
                      if (soundEnabled) sfxClick();
                    },
                    style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                  }, 'Next Scenario \u2192')
                )
              )
          );
        }

        exercisesContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            '\uD83D\uDC5F Perspective-Taking Exercises'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
            'Practice seeing the world through someone else\u2019s eyes.'
          ),
          exModeBar,
          exerciseBody
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Cognitive Bias Explorer ──
      // ══════════════════════════════════════════════════════════
      var biasContent = null;
      if (activeTab === 'biases') {
        var biasList = COGNITIVE_BIASES[band] || COGNITIVE_BIASES.elementary;
        var curBias = biasList[biasIdx % biasList.length];
        var biasExKey = curBias.id;
        var isBiasExplored = !!biasExplored[biasExKey];

        biasContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            '\uD83E\uDDD0 Cognitive Bias Explorer'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
            band === 'elementary' ? 'Our brains play tricks on us sometimes! Learn to catch common thinking mistakes.' :
            band === 'middle' ? 'Cognitive biases are shortcuts your brain takes that can lead you astray. Learn to spot them.' :
            'Explore the cognitive biases that shape perception, judgment, and decision-making \u2014 often without awareness.'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 16 } },
            'Bias ' + ((biasIdx % biasList.length) + 1) + ' of ' + biasList.length +
            ' \u00B7 ' + Object.keys(biasExplored).length + ' explored'
          ),
          // Bias navigation dots
          h('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' } },
            biasList.map(function(b, bi) {
              var explored = !!biasExplored[b.id];
              var isCur = (biasIdx % biasList.length) === bi;
              return h('button', { 'aria-label': explored ? '\u2713' : String(bi + 1),
                key: bi,
                onClick: function() { upd('biasIdx', bi); if (soundEnabled) sfxClick(); },
                title: b.name,
                style: {
                  width: 28, height: 28, borderRadius: '50%', border: '2px solid ' + (isCur ? ACCENT : explored ? '#22c55e44' : '#334155'),
                  background: explored ? '#22c55e22' : '#1e293b', color: isCur ? '#fff' : '#94a3b8',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                }
              }, explored ? '\u2713' : String(bi + 1));
            })
          ),
          // Bias card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('div', { style: { textAlign: 'center', marginBottom: 12 } },
              h('span', { style: { fontSize: 40 } }, curBias.emoji),
              h('h4', { style: { margin: '8px 0 4px 0', color: '#f1f5f9', fontSize: 17 } }, curBias.name)
            ),
            // Definition
            h('div', { style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', marginBottom: 12 } },
              h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'What Is It?'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, curBias.definition)
            ),
            // Example
            h('div', { style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #3b82f644', marginBottom: 12 } },
              h('p', { style: { fontSize: 10, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'Everyday Example'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, curBias.example)
            ),
            // How to catch yourself
            h('div', { style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #22c55e44' } },
              h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'How to Catch Yourself'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, curBias.catchYourself)
            )
          ),
          // Mark explored & navigate
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
            !isBiasExplored ?
              h('button', { 'aria-label': 'Toggle sound',
                onClick: function() {
                  var newExplored = Object.assign({}, biasExplored);
                  newExplored[biasExKey] = true;
                  var newCount = Object.keys(newExplored).length;
                  upd('biasExplored', newExplored);
                  upd('biasDone', newCount);
                  logPractice('bias', curBias.id);
                  if (soundEnabled) sfxCorrect();
                  awardXP(10);
                  if (newCount >= 5) tryAwardBadge('bias_spotter');
                  if (newCount >= biasList.length) tryAwardBadge('bias_master');
                  addToast('Bias explored! ' + newCount + '/' + biasList.length, 'success');
                },
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\u2705 Mark as Explored')
            :
              h('span', { style: { padding: '10px 20px', borderRadius: 10, background: '#22c55e22', color: '#22c55e', fontWeight: 600, fontSize: 13, border: '1px solid #22c55e44' } }, '\u2713 Explored'),
            h('button', { 'aria-label': 'Next Bias',
              onClick: function() {
                upd('biasIdx', biasIdx + 1);
                if (soundEnabled) sfxClick();
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Bias \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Guided Perspective Journal ──
      // ══════════════════════════════════════════════════════════
      var guidedJContent = null;
      if (activeTab === 'guidedJ') {
        var gjPrompts = GUIDED_JOURNAL_PROMPTS;
        var curGJ = gjPrompts[guidedJIdx % gjPrompts.length];

        guidedJContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            '\uD83D\uDCDD Perspective Journal'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
            'Guided reflections on perspective-taking, assumptions, and empathy. Your entries are saved with timestamps.'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 16 } },
            'Prompt ' + ((guidedJIdx % gjPrompts.length) + 1) + ' of ' + gjPrompts.length +
            (guidedJDone > 0 ? ' \u00B7 ' + guidedJDone + ' entries saved' : '')
          ),
          // Prompt card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #6366f144', marginBottom: 16 } },
            h('h4', { style: { color: '#818cf8', fontSize: 14, marginBottom: 8, fontWeight: 700 } }, curGJ.title),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, fontStyle: 'italic' } }, '\u201C' + curGJ.prompt + '\u201D')
          ),
          // Writing area
          h('textarea', {
            value: guidedJText,
            'aria-label': 'Guided journal reflection',
            onChange: function(e) { upd('guidedJText', e.target.value); upd('guidedJSaved', false); },
            placeholder: 'Write your reflection here. Be honest \u2014 this is for you...',
            rows: 7,
            style: { width: '100%', padding: 14, borderRadius: 12, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 4 }
          }),
          h('div', { style: { textAlign: 'right', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            (guidedJText.trim() ? guidedJText.trim().split(/\s+/).length : 0) + ' words'
          ),
          // Buttons
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' } },
            h('button', { 'aria-label': 'Toggle sound',
              onClick: function() {
                if (guidedJText.trim().split(/\s+/).length < 10) { addToast('Write at least a few sentences first!', 'info'); return; }
                var timestamp = new Date().toISOString();
                var entry = { prompt: curGJ.title, text: guidedJText.trim(), time: timestamp };
                var newEntries = guidedJEntries.concat([entry]);
                var newDone = guidedJDone + 1;
                upd({
                  guidedJSaved: true,
                  guidedJEntries: newEntries,
                  guidedJDone: newDone
                });
                logPractice('guidedJ', curGJ.id);
                if (soundEnabled) sfxCorrect();
                awardXP(15);
                tryAwardBadge('open_mind');
                addToast('Journal entry saved with timestamp!', 'success');
                ctx.announceToSR && ctx.announceToSR('Guided journal entry saved');
              },
              disabled: guidedJSaved,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: guidedJSaved ? '#22c55e' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: guidedJSaved ? 'default' : 'pointer' }
            }, guidedJSaved ? '\u2705 Saved!' : '\uD83D\uDCBE Save Entry'),
            !guidedJShowFU && guidedJSaved ?
              h('button', { 'aria-label': 'Show Follow-Up Question',
                onClick: function() { upd('guidedJShowFU', true); if (soundEnabled) sfxReveal(); },
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\uD83D\uDCA1 Show Follow-Up Question')
            : null
          ),
          // Follow-up question
          guidedJShowFU && h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, 'Follow-Up Question'),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, fontStyle: 'italic' } }, curGJ.followUp)
          ),
          // Next prompt
          guidedJSaved && h('div', { style: { textAlign: 'center', marginBottom: 16 } },
            h('button', { 'aria-label': 'Next Prompt',
              onClick: function() {
                upd({ guidedJIdx: guidedJIdx + 1, guidedJText: '', guidedJSaved: false, guidedJShowFU: false });
                if (soundEnabled) sfxClick();
              },
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Prompt \u2192')
          ),
          // Saved entries list
          guidedJEntries.length > 0 && h('div', { style: { marginTop: 8 } },
            h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 8 } }, '\uD83D\uDCDA Saved Entries (' + guidedJEntries.length + ')'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              guidedJEntries.slice().reverse().slice(0, 5).map(function(entry, i) {
                var dateStr = new Date(entry.time).toLocaleString();
                return h('div', {
                  key: i,
                  style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                    h('span', { style: { fontSize: 12, fontWeight: 700, color: '#818cf8' } }, entry.prompt),
                    h('span', { style: { fontSize: 10, color: '#94a3b8' } }, dateStr)
                  ),
                  h('p', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.5, margin: 0 } },
                    entry.text.length > 120 ? entry.text.slice(0, 120) + '...' : entry.text
                  )
                );
              })
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Progress ──
      // ══════════════════════════════════════════════════════════
      var progressContent = null;
      if (activeTab === 'progress') {
        var totalActs = scenCompleted + swapCompleted + emCompleted + hfTotal + journalDone + respondDone + storyDone + exerciseDone + biasDone + guidedJDone;
        var stats = [
          { label: 'Scenarios Explored', value: scenCompleted, icon: '\uD83C\uDFAD', color: '#8b5cf6' },
          { label: 'Viewpoints Swapped', value: swapCompleted, icon: '\uD83D\uDD04', color: '#3b82f6' },
          { label: 'Empathy Stories', value: storyDone, icon: '\uD83D\uDCD6', color: '#e879f9' },
          { label: 'Exercises Done', value: exerciseDone, icon: '\uD83D\uDC5F', color: '#22d3ee' },
          { label: 'Biases Explored', value: biasDone, icon: '\uD83E\uDDD0', color: '#fb923c' },
          { label: 'Empathy Maps Created', value: emCompleted, icon: '\uD83D\uDDFA\uFE0F', color: '#22c55e' },
          { label: 'Hidden Feelings Found', value: hfCorrect + '/' + hfTotal, icon: '\uD83D\uDD0D', color: '#f59e0b' },
          { label: 'Journal Entries', value: journalDone + guidedJDone, icon: '\uD83D\uDCD4', color: '#6366f1' },
          { label: 'Responses Submitted', value: respondDone, icon: '\u270D\uFE0F', color: '#f59e0b' }
        ];

        progressContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Your Progress'),
          // Total
          h('div', { style: { textAlign: 'center', padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('div', { style: { fontSize: 40, fontWeight: 700, color: ACCENT } }, totalActs),
            h('div', { style: { fontSize: 13, color: '#94a3b8' } }, 'Total Activities Completed')
          ),
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
          // Hidden feelings accuracy
          hfTotal > 0 && h('div', { style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid #f59e0b44', marginBottom: 16 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 } },
              h('span', { style: { fontSize: 12, fontWeight: 700, color: '#f1f5f9' } }, 'Hidden Feelings Accuracy'),
              h('span', { style: { fontSize: 12, fontWeight: 700, color: '#f59e0b' } }, Math.round((hfCorrect / hfTotal) * 100) + '%')
            ),
            h('div', { style: { height: 8, borderRadius: 4, background: '#334155', overflow: 'hidden' } },
              h('div', { style: { height: '100%', borderRadius: 4, background: '#f59e0b', width: Math.round((hfCorrect / hfTotal) * 100) + '%', transition: 'width 0.3s' } })
            )
          ),
          // Recent practice log
          practiceLog.length > 0 && h('div', null,
            h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 8 } }, 'Recent Practice'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              practiceLog.slice(-8).reverse().map(function(entry, i) {
                var icons = { scenario: '\uD83C\uDFAD', swap: '\uD83D\uDD04', empathy: '\uD83D\uDDFA\uFE0F', hidden: '\uD83D\uDD0D', coach: '\u2728', journal: '\uD83D\uDCD4', respond: '\u270D\uFE0F', story: '\uD83D\uDCD6', exercise: '\uD83D\uDC5F', bias: '\uD83E\uDDD0', guidedJ: '\uD83D\uDCDD' };
                var labels = { scenario: 'Scenario', swap: 'Viewpoint Swap', empathy: 'Empathy Map', hidden: 'Hidden Feeling', coach: 'AI Coach', journal: 'Journal Entry', respond: 'What Would You Do?', story: 'Empathy Story', exercise: 'Exercise', bias: 'Bias Explorer', guidedJ: 'Perspective Journal' };
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
      var content = scenContent || swapContent || storiesContent || exercisesContent || biasContent || emContent || hfContent || journalContent || guidedJContent || respondContent || coachContent || progressContent;

      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        tabBar,
        badgePopup,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content)
      );
    }
  });
})();
