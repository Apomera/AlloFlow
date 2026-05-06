// ═══════════════════════════════════════════════════════════════
// sel_tool_conflict.js — Conflict Resolution Lab Plugin (v1.0)
// Branching conflict scenarios, I-statement builder, de-escalation
// techniques, repair & reconciliation, and AI mediator.
// Registered tool ID: "conflict"
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
    if (document.getElementById('allo-live-conflict')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-conflict';
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
  // ── Conflict Theater Scenarios (branching dialogue) ──
  // Each scenario has 2-3 response branches with consequences
  // ══════════════════════════════════════════════════════════════
  var CONFLICT_SCENARIOS = {
    elementary: [
      { id: 'cf1', title: 'The Stolen Seat', setup: 'You come back from the bathroom and someone is sitting in your seat. They say, "I was here first."',
        personA: 'You', personB: 'The seat-taker',
        branches: [
          { label: 'Yell: "That\'s MY seat! Move!"', style: 'aggressive', outcome: 'They yell back. The teacher notices and both of you lose recess. Nobody wins.', rating: 1 },
          { label: 'Say nothing and sit somewhere else, fuming inside.', style: 'passive', outcome: 'You avoid the fight but feel angry all day. The other kid doesn\'t even know there\'s a problem.', rating: 2 },
          { label: 'Say calmly: "I was sitting there. Can we figure this out?"', style: 'assertive', outcome: 'You talk it out. Maybe you share, maybe they move. Either way, nobody gets hurt and the problem gets solved.', rating: 3 }
        ] },
      { id: 'cf2', title: 'The Broken Promise', setup: 'Your friend promised to play with you at recess but then runs off to play with someone else instead.',
        personA: 'You', personB: 'Your friend',
        branches: [
          { label: 'Chase them and say "You PROMISED! You\'re a liar!"', style: 'aggressive', outcome: 'Your friend gets defensive. Now you\'re fighting about WHO is wrong instead of solving the problem. The friendship feels worse.', rating: 1 },
          { label: 'Pretend you don\'t care and play alone.', style: 'passive', outcome: 'You feel hurt and alone. Your friend might not even realize they broke a promise. The hurt grows quietly.', rating: 2 },
          { label: 'Wait until later and say: "It hurt when you didn\'t play with me. Can we make a plan for tomorrow?"', style: 'assertive', outcome: 'Your friend understands how you feel. You make a plan together. The friendship gets stronger because you were honest.', rating: 3 }
        ] },
      { id: 'cf3', title: 'The Art Supply Fight', setup: 'You and another kid both reach for the last bottle of blue paint at the same time.',
        personA: 'You', personB: 'The other kid',
        branches: [
          { label: 'Grab it and say "I had it first!"', style: 'aggressive', outcome: 'They might grab it back. Now it\'s a tug-of-war over paint. Someone might get paint on them. The teacher intervenes.', rating: 1 },
          { label: 'Let go immediately and use a different color.', style: 'passive', outcome: 'You avoid conflict, but you didn\'t get what you needed. You might feel resentful and your project suffers.', rating: 2 },
          { label: '"Hey, we both need blue! Want to share it or take turns?"', style: 'assertive', outcome: 'You find a solution that works for both of you. You might even end up helping each other with your projects.', rating: 3 }
        ] },
      { id: 'cf4', title: 'The Name-Calling', setup: 'A kid calls you a mean name on the playground. Other kids hear it.',
        personA: 'You', personB: 'The name-caller',
        branches: [
          { label: 'Call them a worse name back.', style: 'aggressive', outcome: 'Now it\'s a name-calling battle. Other kids pick sides. Both of you get in trouble. The hurt multiplies.', rating: 1 },
          { label: 'Walk away crying.', style: 'passive', outcome: 'You\'re safe from more conflict, but you feel powerless. The name-caller might think they can do it again.', rating: 2 },
          { label: '"That wasn\'t okay. Don\'t call me that." Then walk away confidently.', style: 'assertive', outcome: 'You stood up for yourself without escalating. The name-caller knows you won\'t accept it. You kept your dignity.', rating: 3 }
        ] },
      { id: 'cf5', title: 'The Group Project', setup: 'In a group project, one person isn\'t doing any work. The rest of you are frustrated.',
        personA: 'The group', personB: 'The non-working member',
        branches: [
          { label: 'Tell the teacher immediately without talking to them first.', style: 'aggressive', outcome: 'The person feels ambushed and betrayed. They might have had a reason (confusion, shyness). The group dynamic gets worse.', rating: 1 },
          { label: 'Just do their part for them and don\'t say anything.', style: 'passive', outcome: 'The project gets done, but resentment builds. They never learn to contribute. You feel used.', rating: 2 },
          { label: 'Ask them privately: "Hey, what part do you want to work on? Do you need help getting started?"', style: 'assertive', outcome: 'You give them a chance to explain and re-engage. Maybe they were confused or felt left out. Inclusion often solves what confrontation can\'t.', rating: 3 }
        ] },
      { id: 'cf6', title: 'The Line Cutter', setup: 'Someone cuts in front of you in the lunch line. They pretend they were always there.',
        personA: 'You', personB: 'The line cutter',
        branches: [
          { label: 'Push them out of line and say "Get to the back!"', style: 'aggressive', outcome: 'Physical conflict. Both of you could get hurt and lose lunch privileges. Teachers get involved.', rating: 1 },
          { label: 'Sigh and let it go, even though it\'s not fair.', style: 'passive', outcome: 'You avoid conflict but feel walked over. If they do it again tomorrow, the frustration compounds.', rating: 2 },
          { label: '"Hey, I was here. The line starts back there. It\'s not fair to the people waiting."', style: 'assertive', outcome: 'You stood up for yourself AND for others in line. Calm firmness is harder to argue with than anger.', rating: 3 }
        ] },
      { id: 'cf19', title: 'The Homework Helper', setup: 'A friend always asks to copy your work. Today they said, "Just let me see your answers, nobody will know."',
        personA: 'You', personB: 'Your friend',
        branches: [
          { label: '"No! Do your own work, you\'re so lazy!"', style: 'aggressive', outcome: 'They feel attacked and the friendship is strained. Name-calling doesn\'t solve the real problem \u2014 they might not understand the work.', rating: 1 },
          { label: 'Hand over your paper without saying anything.', style: 'passive', outcome: 'You feel used, and they never learn the material. This will keep happening because you never said how you felt.', rating: 2 },
          { label: '"I can\'t let you copy, but I can help you figure it out."', style: 'assertive', outcome: 'You kept your integrity AND helped your friend. Teaching someone is the opposite of enabling them.', rating: 3 }
        ] },
      { id: 'cf20', title: 'The Broken Creation', setup: 'Someone accidentally knocked over your art project that you spent all morning building. They say "Oops, sorry" but don\'t seem to care much.',
        personA: 'You', personB: 'The other kid',
        branches: [
          { label: 'Knock over THEIR project in revenge.', style: 'aggressive', outcome: 'Now both projects are ruined. Two wrongs didn\'t make a right. The teacher intervenes and both of you face consequences.', rating: 1 },
          { label: 'Say "It\'s fine" while holding back tears.', style: 'passive', outcome: 'You\'re hiding real hurt. They think it wasn\'t a big deal, but it was. Your sadness turns into quiet resentment.', rating: 2 },
          { label: '"That really upset me. I worked hard on that. Can you help me rebuild it?"', style: 'assertive', outcome: 'You expressed your feelings AND proposed a solution. They understand the impact and can make it right.', rating: 3 }
        ] },
      { id: 'cf21', title: 'The Tattletale', setup: 'A classmate tells the teacher every tiny thing you do \u2014 talking, fidgeting, looking around. You feel like they\'re watching you constantly.',
        personA: 'You', personB: 'The classmate',
        branches: [
          { label: '"Stop being such a snitch! Nobody likes a tattletale!"', style: 'aggressive', outcome: 'Name-calling and social pressure. They might stop telling on you, but now there\'s hostility. The real issue is unaddressed.', rating: 1 },
          { label: 'Try to be absolutely perfect so they have nothing to report.', style: 'passive', outcome: 'You\'re living in fear of one person. Your energy goes to avoiding them instead of learning.', rating: 2 },
          { label: '"When you tell on me for small things, it feels like you\'re watching me. If something really bothers you, can you talk to me first?"', style: 'assertive', outcome: 'You addressed the pattern directly and gave them an alternative. Most kids who tattle just don\'t know another way to handle frustration.', rating: 3 }
        ] },
      { id: 'cf22', title: 'The Unfair Game', setup: 'During PE, the team captains are picking teams. You\'re one of the last picked \u2014 again. Some kids laugh.',
        personA: 'You', personB: 'The captains',
        branches: [
          { label: '"This game is stupid anyway! I don\'t even want to play!"', style: 'aggressive', outcome: 'Lashing out hides the real feeling: hurt. But it pushes people further away and confirms their bias about you.', rating: 1 },
          { label: 'Join the team silently, head down, and barely try.', style: 'passive', outcome: 'You protect yourself from more rejection by withdrawing, but you miss the chance to show what you can do.', rating: 2 },
          { label: 'Play your best regardless. After class, talk to the teacher: "Being picked last every time really hurts. Can we do random teams?"', style: 'assertive', outcome: 'You advocated for a systemic change that helps everyone, not just you. That\'s leadership.', rating: 3 }
        ] },
      { id: 'cf27', title: 'The Whisper Club', setup: 'Two kids are whispering and looking at you during circle time. They stop talking when you look over.',
        personA: 'You', personB: 'The whisperers',
        branches: [
          { label: '"Stop talking about me! I know you are!"', style: 'aggressive', outcome: 'You might be right, but accusing without proof looks like overreacting. They deny it, and now everyone is staring at YOU.', rating: 1 },
          { label: 'Ignore it and pretend you didn\'t notice.', style: 'passive', outcome: 'You avoid confrontation, but the wondering eats at you all day. Were they really talking about you?', rating: 2 },
          { label: 'After circle time, say: "Hey, when you were whispering and looking at me, it felt weird. What was that about?"', style: 'assertive', outcome: 'You addressed it calmly and directly. Maybe they were talking about something unrelated. Now you know instead of guessing.', rating: 3 }
        ] },
      { id: 'cf28', title: 'The Wrong Blame', setup: 'The teacher thinks you pushed someone in the hallway, but it was actually someone behind you. The other kid isn\'t correcting it.',
        personA: 'You', personB: 'The teacher + bystander',
        branches: [
          { label: '"IT WASN\'T ME! You never believe me! This is SO unfair!"', style: 'aggressive', outcome: 'Shouting at a teacher escalates the problem. Even if you\'re right, your tone makes you look guilty.', rating: 1 },
          { label: 'Accept the blame quietly. What\'s the point?', style: 'passive', outcome: 'You avoid the argument but internalize injustice. The real pusher faces no consequences. Your frustration grows.', rating: 2 },
          { label: '"I understand what it looked like, but I didn\'t push anyone. Can we ask the other students what they saw?"', style: 'assertive', outcome: 'You acknowledged the teacher\'s perspective AND advocated for fairness. Asking for witnesses is smart and mature.', rating: 3 }
        ] }
    ],
    middle: [
      { id: 'cf7', title: 'The Group Chat Callout', setup: 'Someone posts something embarrassing about you in a group chat with 30 people. Some people are laughing. Some are quiet.',
        personA: 'You', personB: 'The poster',
        branches: [
          { label: 'Post something embarrassing about them in revenge.', style: 'aggressive', outcome: 'Escalation spiral. Now it\'s a public war. Screenshots spread. Both reputations suffer. The group chat becomes toxic.', rating: 1 },
          { label: 'Leave the group chat and say nothing.', style: 'passive', outcome: 'You remove yourself from harm, but the post is still there. Your silence might look like acceptance. The hurt lingers.', rating: 2 },
          { label: 'DM them: "That post hurt. Can you take it down?" If no response, tell a trusted adult.', style: 'assertive', outcome: 'You addressed it directly and privately first. If they refuse, involving an adult is responsible, not weakness. You maintained your dignity.', rating: 3 }
        ] },
      { id: 'cf8', title: 'The Friendship Shift', setup: 'Your best friend has been hanging out with a new group and barely talks to you anymore. Today they sit with the new group at lunch without telling you.',
        personA: 'You', personB: 'Your changing friend',
        branches: [
          { label: 'Confront them in front of everyone: "So you\'re just replacing me?"', style: 'aggressive', outcome: 'Public confrontation embarrasses both of you. They get defensive. The new group sees drama. You look possessive.', rating: 1 },
          { label: 'Pretend you don\'t care and find a new table.', style: 'passive', outcome: 'You avoid the conversation but the uncertainty eats at you. Is the friendship over? You don\'t know because you never asked.', rating: 2 },
          { label: 'Text them later: "I miss hanging out. Can we talk about what\'s going on with us?"', style: 'assertive', outcome: 'You opened a door for honest conversation. Maybe they didn\'t realize how it looked. Maybe the friendship is evolving. Either way, you know where you stand.', rating: 3 }
        ] },
      { id: 'cf9', title: 'The Rumor Response', setup: 'Someone is spreading a rumor about you that isn\'t true. Multiple people have asked you about it today.',
        personA: 'You', personB: 'The rumor-spreader',
        branches: [
          { label: 'Start a worse rumor about them. Fight fire with fire.', style: 'aggressive', outcome: 'Now two false rumors are circulating. You\'ve become the very thing that hurt you. The school environment gets more toxic for everyone.', rating: 1 },
          { label: 'Ignore it and hope it goes away on its own.', style: 'passive', outcome: 'Sometimes rumors do fade. But sometimes silence is interpreted as confirmation. The uncertainty is painful.', rating: 2 },
          { label: 'Calmly tell people the truth when asked, and confront the source directly or involve a counselor.', style: 'assertive', outcome: 'You set the record straight without stooping to their level. Going to the source directly — or getting adult help — addresses the root, not the symptoms.', rating: 3 }
        ] },
      { id: 'cf10', title: 'The Borrowed-and-Broken', setup: 'You lent a friend your headphones and they returned them broken. They say, "They were already kind of broken."',
        personA: 'You', personB: 'Your friend',
        branches: [
          { label: '"That\'s a LIE. You owe me new ones. Pay up or we\'re done."', style: 'aggressive', outcome: 'They get defensive because you called them a liar. Even if they broke them, the accusation makes them dig in. The friendship AND the headphones are now broken.', rating: 1 },
          { label: '"Whatever, it\'s fine." (It\'s not fine.)', style: 'passive', outcome: 'You avoid conflict but resent them. You\'ll think about this every time they ask to borrow something. The unspoken issue poisons the friendship slowly.', rating: 2 },
          { label: '"They were working fine when I lent them. I\'m not mad, but can we figure out a fair solution?"', style: 'assertive', outcome: 'You stated the facts without attacking. Asking for a "fair solution" opens negotiation. Maybe they pay half, or replace them, or you work it out. The friendship survives the headphones.', rating: 3 }
        ] },
      { id: 'cf11', title: 'The Partner Problem', setup: 'Your lab partner keeps taking over the experiment and won\'t let you do anything. When you try, they say, "I\'ll just do it, it\'s faster."',
        personA: 'You', personB: 'Your partner',
        branches: [
          { label: 'Grab the equipment and say "It\'s MY turn."', style: 'aggressive', outcome: 'Physical conflict near lab equipment is dangerous and gets teacher attention fast. You both look bad.', rating: 1 },
          { label: 'Sit back and let them do everything. Take notes quietly.', style: 'passive', outcome: 'You avoid conflict but don\'t learn the material. You also enable their controlling behavior. Your grade depends on skills you never practiced.', rating: 2 },
          { label: '"I need hands-on practice too. How about we alternate steps? You do step 3, I do step 4."', style: 'assertive', outcome: 'You proposed a specific, fair structure. It\'s hard to argue against alternating. You both learn, and the partnership becomes balanced.', rating: 3 }
        ] },
      { id: 'cf12', title: 'The Loyalty Test', setup: 'Friend A tells you something negative about Friend B. Now Friend B asks you, "What did they say about me?"',
        personA: 'You (caught in the middle)', personB: 'Both friends',
        branches: [
          { label: 'Tell Friend B everything, word for word.', style: 'aggressive', outcome: 'You\'ve now broken Friend A\'s trust and escalated the conflict. You\'re no longer in the middle — you\'ve become the fuse.', rating: 1 },
          { label: '"Nothing, everything\'s fine." (Lie.)', style: 'passive', outcome: 'You\'re protecting the peace but holding a lie. If the truth comes out later, BOTH friends will feel betrayed by you.', rating: 2 },
          { label: '"It sounds like you two have something to work out. I don\'t want to be in the middle. Can you talk to them directly?"', style: 'assertive', outcome: 'You refused to be a messenger AND you pointed them toward direct communication. This is the hardest but healthiest option.', rating: 3 }
        ] },
      { id: 'cf23', title: 'The Screenshot Trap', setup: 'Someone took a screenshot of an embarrassing moment on a video call and shared it in a group chat. People are using it as a meme.',
        personA: 'You', personB: 'The screenshotter',
        branches: [
          { label: 'Find an embarrassing photo of them and spread it. "See how it feels."', style: 'aggressive', outcome: 'Retaliation escalates. Now you\'re both cyber-bullying. Screenshots live forever. You became the thing that hurt you.', rating: 1 },
          { label: 'Delete all social media and stop joining calls.', style: 'passive', outcome: 'You isolated yourself. The bullying won. You lost connections to avoid one person.', rating: 2 },
          { label: 'DM them: "Take that down. It\'s not funny to me." Save screenshots as evidence. If they refuse, report it.', style: 'assertive', outcome: 'You documented, communicated directly, and escalated properly. This is how digital conflict should be handled.', rating: 3 }
        ] },
      { id: 'cf24', title: 'The Excluded Party', setup: 'Your entire friend group got invited to a party except you. You found out when everyone posted about it on their stories.',
        personA: 'You', personB: 'The host',
        branches: [
          { label: 'Post passive-aggressive stories: "Funny how people show you who they really are."', style: 'aggressive', outcome: 'Vague-posting creates more drama without resolution. Everyone knows it\'s about them but nobody addresses it directly.', rating: 1 },
          { label: 'Pretend you knew about it and didn\'t want to go anyway.', style: 'passive', outcome: 'You\'re performing "not caring" while hurting inside. The exclusion stays unaddressed. The pain grows.', rating: 2 },
          { label: 'Ask the host directly: "I noticed I wasn\'t invited. I\'m not demanding an invite \u2014 I just want to understand where we stand."', style: 'assertive', outcome: 'Brave and direct. Maybe it was an oversight. Maybe the friendship has changed. Either way, you deserve clarity.', rating: 3 }
        ] },
      { id: 'cf25', title: 'The False Accusation', setup: 'Your teacher accuses you of cheating because your answers are similar to the person sitting near you. You didn\'t cheat.',
        personA: 'You', personB: 'The teacher',
        branches: [
          { label: '"That\'s ridiculous! You\'re being unfair! I would NEVER cheat!"', style: 'aggressive', outcome: 'Defensiveness and anger, even when justified, often look like guilt. Emotional reactions undermine your credibility with authority.', rating: 1 },
          { label: 'Accept the punishment quietly. "Whatever, it doesn\'t matter."', style: 'passive', outcome: 'You let an injustice stand. Your grade AND your integrity are both affected. Silence can be interpreted as admission.', rating: 2 },
          { label: '"I understand why it might look that way, but I did my own work. Can I explain my thought process for my answers?"', style: 'assertive', outcome: 'You acknowledged their concern without admitting guilt. Offering to explain demonstrates confidence in your own work.', rating: 3 }
        ] },
      { id: 'cf26', title: 'The Cold Shoulder', setup: 'Your close friend suddenly stops responding to texts, avoids you in the hall, and won\'t make eye contact. You have no idea why.',
        personA: 'You', personB: 'Your friend',
        branches: [
          { label: 'Corner them: "What is your PROBLEM? Why are you ignoring me?"', style: 'aggressive', outcome: 'Confrontation without understanding. They might be dealing with something personal. Aggressive demands won\'t open them up.', rating: 1 },
          { label: 'Match their energy \u2014 ignore them right back.', style: 'passive', outcome: 'Two people silently hurting. The friendship dies not from a fight but from silence. Neither of you knows what happened.', rating: 2 },
          { label: 'Send a calm text: "I\'ve noticed distance between us. I care about our friendship. Can we talk when you\'re ready?"', style: 'assertive', outcome: 'You left the door open without pressure. You named the pattern without accusations. You gave them space AND showed you care.', rating: 3 }
        ] },
      { id: 'cf31', title: 'The Plagiarism Panic', setup: 'You and a classmate wrote very similar essays by coincidence. The teacher suspects plagiarism and is questioning both of you separately.',
        personA: 'You', personB: 'The classmate + teacher',
        branches: [
          { label: '"THEY must have copied ME! I wrote mine first!"', style: 'aggressive', outcome: 'Accusing your classmate without evidence makes you look defensive. The teacher is now suspicious of both of you.', rating: 1 },
          { label: 'Stay silent and hope the teacher figures it out.', style: 'passive', outcome: 'Silence looks like guilt. You\'re leaving your fate in someone else\'s hands when you could advocate for yourself.', rating: 2 },
          { label: '"We both studied the same sources. I can show you my notes and drafts to prove my work is original. Can we compare our research process?"', style: 'assertive', outcome: 'You offered proof instead of blame. Showing your process demonstrates honesty. You protected yourself without attacking.', rating: 3 }
        ] },
      { id: 'cf32', title: 'The Pressure to Conform', setup: 'Your friend group wants to skip class. Everyone is going except you. They\'re calling you scared and saying you\'re not a real friend if you don\'t come.',
        personA: 'You', personB: 'The friend group',
        branches: [
          { label: '"Fine, you\'re all losers anyway. I don\'t need friends who do stupid stuff."', style: 'aggressive', outcome: 'You burned the bridge instead of just setting a boundary. They feel attacked. You feel alone.', rating: 1 },
          { label: 'Go along with it even though you don\'t want to.', style: 'passive', outcome: 'You violated your own values to avoid social pressure. If you get caught, you face consequences you never wanted. Resentment builds.', rating: 2 },
          { label: '"I\'m not going, and that doesn\'t make me a bad friend. I don\'t want the consequences. You do you, but I\'m staying."', style: 'assertive', outcome: 'You set a clear boundary without judging their choice. Real friends respect that. If they don\'t, you learned something important about them.', rating: 3 }
        ] }
    ],
    high: [
      { id: 'cf13', title: 'The Political Clash', setup: 'A heated political discussion in class turns personal. A classmate says your political view is "ignorant" and "dangerous." Other students are watching.',
        personA: 'You', personB: 'The classmate',
        branches: [
          { label: 'Attack their intelligence: "That\'s rich coming from someone who gets their news from TikTok."', style: 'aggressive', outcome: 'Ad hominem attack. The debate becomes personal. Learning stops. The classroom becomes a place people fear speaking in.', rating: 1 },
          { label: 'Go silent and stop participating in discussions.', style: 'passive', outcome: 'You protect yourself but lose your voice. The loudest opinions dominate. Your perspective is needed but absent.', rating: 2 },
          { label: '"I disagree with you, but calling my view \'ignorant\' isn\'t engaging with it. Can you respond to the argument instead of labeling it?"', style: 'assertive', outcome: 'You modeled intellectual courage. You challenged the behavior (labeling) without attacking the person. You kept the discussion alive.', rating: 3 }
        ] },
      { id: 'cf14', title: 'The Relationship Boundary', setup: 'Your partner checks your phone when you\'re not looking. When you confront them, they say, "If you have nothing to hide, why do you care?"',
        personA: 'You', personB: 'Your partner',
        branches: [
          { label: 'Check their phone in retaliation. "Two can play this game."', style: 'aggressive', outcome: 'Mutual surveillance. Trust is now dead in both directions. This relationship just became a power struggle, not a partnership.', rating: 1 },
          { label: 'Drop it. "You\'re right, I guess it\'s fine."', style: 'passive', outcome: 'You just normalized boundary violation. "Nothing to hide" is a manipulation tactic. Accepting it sets a precedent for escalating control.', rating: 2 },
          { label: '"Privacy isn\'t about hiding things. It\'s about trust and respect. I need you to respect my boundaries."', style: 'assertive', outcome: 'You named the real issue — trust, not secrecy. This is a boundary that healthy relationships require. If they can\'t accept it, that\'s important information.', rating: 3 }
        ] },
      { id: 'cf15', title: 'The Credit Thief', setup: 'In a team presentation, a teammate presents your idea as their own. The teacher praises them. Your other teammates noticed but say nothing.',
        personA: 'You', personB: 'The credit thief',
        branches: [
          { label: 'Interrupt: "Actually, that was MY idea. They took it from my notes."', style: 'aggressive', outcome: 'You\'re right, but the timing makes it look petty. Public callouts during presentations make everyone uncomfortable. The teacher questions the whole team\'s dynamic.', rating: 1 },
          { label: 'Let it go. "It doesn\'t matter who gets credit."', style: 'passive', outcome: 'But it does matter. Repeatedly swallowing credit theft teaches people they can take from you. It also denies you recognition you earned.', rating: 2 },
          { label: 'After class, talk to them privately. Also email the teacher: "I wanted to mention that the framework in slide 3 came from my research."', style: 'assertive', outcome: 'You addressed it without drama. The private conversation gives them a chance to acknowledge it. The email creates a paper trail without being accusatory.', rating: 3 }
        ] },
      { id: 'cf16', title: 'The Values Clash with Parents', setup: 'Your parents disapprove of your closest friend because of their background/identity. They forbid you from spending time together.',
        personA: 'You', personB: 'Your parents',
        branches: [
          { label: 'Sneak around and see your friend in secret.', style: 'aggressive', outcome: 'You maintain the friendship but build it on deception. If caught, you lose credibility AND the friendship is blamed. You\'re carrying the weight of two worlds.', rating: 1 },
          { label: 'Obey your parents and distance yourself from the friend.', style: 'passive', outcome: 'You comply but betray your own values and a person who did nothing wrong. The guilt and resentment toward your parents grows quietly.', rating: 2 },
          { label: '"I respect you, but I disagree. Can we talk about why this person matters to me and what specifically concerns you?"', style: 'assertive', outcome: 'You opened dialogue without defiance. You honored the relationship with your parents while advocating for your friend. This is adult-level conflict resolution.', rating: 3 }
        ] },
      { id: 'cf17', title: 'The Workplace Harassment', setup: 'At your after-school job, a coworker keeps making inappropriate comments. Your manager is their friend. Other employees look uncomfortable but say nothing.',
        personA: 'You', personB: 'The coworker / the manager',
        branches: [
          { label: 'Match their energy with harsh comebacks.', style: 'aggressive', outcome: 'Now you\'re both creating a hostile environment. Your comebacks could be used against YOU. The power dynamic isn\'t equal.', rating: 1 },
          { label: 'Endure it. "It\'s just a job, I need the money."', style: 'passive', outcome: 'You normalize harassment for yourself and anyone else who works there. Financial need shouldn\'t require dignity sacrifice.', rating: 2 },
          { label: 'Document each incident, tell the coworker clearly to stop, and report to HR or a higher manager. If ignored, contact the labor board.', style: 'assertive', outcome: 'You created a paper trail, gave direct notice, and escalated through proper channels. You protected yourself legally and morally. This is how systems change.', rating: 3 }
        ] },
      { id: 'cf18', title: 'The Roommate Conflict', setup: 'Your college roommate\'s lifestyle (noise, guests, mess) is affecting your sleep and grades. You\'ve hinted but nothing changed. You\'re resentful.',
        personA: 'You', personB: 'Your roommate',
        branches: [
          { label: 'Go to the RA and request a room change without talking to them first.', style: 'aggressive', outcome: 'You solved your problem but blindsided your roommate. They learn about the complaint from someone else. The community sees you as someone who escalates without communicating.', rating: 1 },
          { label: 'Keep hinting and hope they figure it out.', style: 'passive', outcome: 'Hints don\'t work because they\'re deniable. "I didn\'t know!" is an honest response to something you never clearly said. Your resentment grows while they remain oblivious.', rating: 2 },
          { label: 'Schedule a sit-down: "I want us both to be comfortable here. Can we set some agreements about noise, guests, and cleaning?"', style: 'assertive', outcome: 'You framed it as collaborative problem-solving, not blame. Written agreements create accountability. Most roommate conflicts resolve when expectations are made explicit.', rating: 3 }
        ] },
      { id: 'cf27', title: 'The Public Callout', setup: 'Someone posts a thread calling you out for something you said months ago, taken out of context. It\'s getting shared and people are piling on.',
        personA: 'You', personB: 'The poster / the audience',
        branches: [
          { label: 'Fight back in the replies. Challenge everyone. Post their old mistakes too.', style: 'aggressive', outcome: 'Engaging with a mob never works. Every reply feeds the algorithm. You\'re fighting on their terrain with their rules.', rating: 1 },
          { label: 'Go completely silent online. Delete your accounts.', style: 'passive', outcome: 'Self-erasure. The narrative is written without your voice. Going dark can look like an admission of guilt.', rating: 2 },
          { label: 'Post one clear, calm response with full context. Then step away. "Here\'s the full context. I won\'t be engaging further in this format."', style: 'assertive', outcome: 'One statement, full context, then silence. Dignity intact. No feeding the cycle. Let your character speak louder than one post.', rating: 3 }
        ] },
      { id: 'cf28', title: 'The Ethical Shortcut', setup: 'At your internship, your supervisor asks you to backdate a report to cover a missed deadline. "Everyone does it. It\'s not a big deal."',
        personA: 'You', personB: 'Your supervisor',
        branches: [
          { label: '"That\'s fraud and I\'m reporting you."', style: 'aggressive', outcome: 'While morally clear, going nuclear immediately can backfire in a power-imbalanced situation. You might be right but also out of a job with no evidence.', rating: 1 },
          { label: 'Do it. You need this internship and they\'re your boss.', style: 'passive', outcome: 'You compromised your integrity under pressure. If discovered, YOU signed the report. Blame flows downhill.', rating: 2 },
          { label: '"I\'m not comfortable with that. Can we discuss the timeline with the team? I\'d rather find a solution that doesn\'t require falsifying dates."', style: 'assertive', outcome: 'You held your ground without threatening. You offered an alternative. You left a conversational record of objecting. Smart and principled.', rating: 3 }
        ] },
      { id: 'cf29', title: 'The Cultural Clash', setup: 'A classmate makes a dismissive comment about your culture\'s traditions. "That\'s weird. Why would anyone do that?" Other students laugh.',
        personA: 'You', personB: 'The classmate',
        branches: [
          { label: 'Attack their culture back. "At least my culture has actual traditions, unlike your boring\u2014"', style: 'aggressive', outcome: 'Mutual cultural attacks. Both communities are disrespected. Education is replaced by hostility. Nobody learns anything.', rating: 1 },
          { label: 'Laugh along and downplay your own culture. "Yeah, it\'s kind of weird, I guess."', style: 'passive', outcome: 'Self-betrayal. You sacrificed your identity to fit in. The shame compounds over time. Your culture deserves your pride.', rating: 2 },
          { label: '"It\'s not weird \u2014 it\'s meaningful to millions of people, including me. I\'m happy to explain it if you\'re genuinely curious."', style: 'assertive', outcome: 'You stood up for your identity with pride, not aggression. You offered education. Curiosity is the antidote to ignorance.', rating: 3 }
        ] },
      { id: 'cf30', title: 'The Persistent Pressure', setup: 'Someone you\'re dating keeps pressuring you to do things you\'re not comfortable with. When you say no, they say, "If you really loved me, you would."',
        personA: 'You', personB: 'Your partner',
        branches: [
          { label: '"Fine! If you keep pushing, we\'re DONE!"', style: 'aggressive', outcome: 'Ultimatums in the heat of the moment create cycles of threat and reconciliation. The pattern repeats without addressing the core issue.', rating: 1 },
          { label: 'Give in. "I guess... if it means that much to you."', style: 'passive', outcome: 'This is coercion, not consent. Giving in under pressure is not agreement. You deserve to feel safe saying no.', rating: 2 },
          { label: '"If you really loved ME, you\'d respect my no. Love doesn\'t require me to override my own boundaries."', style: 'assertive', outcome: 'You named the manipulation tactic directly. "If you loved me" is a guilt trip, not love. This boundary is non-negotiable. If they can\'t accept it, that tells you everything.', rating: 3 }
        ] },
      { id: 'cf33', title: 'The Reference Letter', setup: 'You asked a teacher for a college recommendation. They wrote something generic and lukewarm. You feel let down and unseen.',
        personA: 'You', personB: 'Your teacher',
        branches: [
          { label: 'Go to another teacher and bad-mouth the first one: "They clearly don\'t care about students."', style: 'aggressive', outcome: 'Gossip travels fast in schools. If it gets back to the teacher, you\'ve burned a bridge AND still don\'t have a good recommendation.', rating: 1 },
          { label: 'Accept the lukewarm letter and submit it. Better than nothing.', style: 'passive', outcome: 'A weak recommendation can hurt your application. You\'re shortchanging yourself because a conversation felt awkward.', rating: 2 },
          { label: '"Thank you for writing this. I was hoping the letter could highlight [specific project/skill]. Would you be open to adding that, or should I ask someone who knows that side of my work?"', style: 'assertive', outcome: 'You gave specific, actionable feedback. You also gave them an out without pressure. Either they improve it or you find a better advocate.', rating: 3 }
        ] },
      { id: 'cf34', title: 'The Overheard Insult', setup: 'You overhear a coworker telling someone else that you "only got the position because of diversity quotas." You know your qualifications are legitimate.',
        personA: 'You', personB: 'The coworker',
        branches: [
          { label: 'Confront them loudly at their desk: "Say that to my FACE if you\'re so brave."', style: 'aggressive', outcome: 'Public confrontation creates a scene. Even though you\'re justified, HR sees two people in conflict. The power dynamic might work against you.', rating: 1 },
          { label: 'Pretend you didn\'t hear it. Keep your head down.', style: 'passive', outcome: 'The comment festers. Your confidence erodes. They face no accountability. Microaggressions gain power from silence.', rating: 2 },
          { label: 'Document what was said, when, and who was present. Then speak to them privately: "I overheard what you said. My qualifications are on my resume. I expect professional respect." If it continues, take it to HR.', style: 'assertive', outcome: 'Documentation first, direct conversation second, escalation if needed. This is the professional playbook for handling workplace discrimination.', rating: 3 }
        ] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── I-Statement Prompts ──
  // Practice converting reactions into I-statements
  // ══════════════════════════════════════════════════════════════
  var I_STATEMENT_PROMPTS = {
    elementary: [
      { id: 'is1', situation: 'Your friend takes your crayon without asking.', youStatement: 'You always take my stuff!', iFeeling: 'frustrated', iBecause: 'I was using that and you didn\'t ask', iNeed: 'Can you please ask before borrowing my things?' },
      { id: 'is2', situation: 'Someone laughs at your drawing.', youStatement: 'You\'re mean! You\'re not even a good artist!', iFeeling: 'embarrassed and hurt', iBecause: 'I worked really hard on that drawing', iNeed: 'I\'d like you to say something kind or say nothing.' },
      { id: 'is3', situation: 'Your brother keeps changing the TV channel during your show.', youStatement: 'You\'re so annoying! Give me the remote!', iFeeling: 'frustrated', iBecause: 'I was watching my show first', iNeed: 'Can we take turns choosing what to watch?' },
      { id: 'is4', situation: 'A friend tells your secret to someone else.', youStatement: 'You\'re a terrible friend! I can\'t trust you!', iFeeling: 'betrayed and sad', iBecause: 'I told you that in private and it was important to me', iNeed: 'I need to know I can trust you with private things.' },
      { id: 'is5', situation: 'Someone cuts in front of you in the lunch line.', youStatement: 'Hey! No cutting! Get to the back!', iFeeling: 'frustrated', iBecause: 'I\'ve been waiting in line', iNeed: 'I need you to wait your turn like everyone else.' },
      { id: 'is6', situation: 'Your teammate blames you when your team loses the game.', youStatement: 'It\'s not MY fault! YOU missed shots too!', iFeeling: 'hurt and angry', iBecause: 'I tried my best and blaming one person isn\'t fair', iNeed: 'I need us to be a team in losing, not just in winning.' },
      { id: 'is7', situation: 'Your parent compares you to your sibling. "Why can\'t you be more like your sister?"', youStatement: 'You always like her more than me!', iFeeling: 'hurt and not good enough', iBecause: 'being compared makes me feel like I\'m not enough as me', iNeed: 'I need you to see what I\'m good at, even if it\'s different.' },
      { id: 'is8', situation: 'A classmate keeps poking you during class even though you asked them to stop.', youStatement: 'STOP IT! I\'m going to hit you!', iFeeling: 'really annoyed and angry', iBecause: 'I already asked you to stop and you didn\'t listen', iNeed: 'I need you to keep your hands to yourself. If you don\'t, I\'ll need to tell the teacher.' },
      { id: 'is25', situation: 'Your teacher gave your special classroom job to someone else without telling you.', youStatement: 'You don\'t care about me! That was MY job!', iFeeling: 'confused and hurt', iBecause: 'I liked that job and losing it without explanation makes me feel like I did something wrong', iNeed: 'Can you tell me why it changed so I understand?' },
      { id: 'is26', situation: 'A friend copies your art style and everyone compliments THEM on it.', youStatement: 'You stole my idea! You can\'t even come up with your own stuff!', iFeeling: 'frustrated and invisible', iBecause: 'I created that style and now someone else gets the credit for it', iNeed: 'I need people to know it was my idea first. Can you tell them where you got the inspiration?' },
      { id: 'is27', situation: 'An older kid keeps calling you a baby in front of your friends.', youStatement: 'Shut up! You\'re just a big bully!', iFeeling: 'embarrassed and small', iBecause: 'being called a baby in front of my friends makes me feel like they\'ll think less of me', iNeed: 'I need you to stop calling me names. It\'s not funny \u2014 it\'s hurtful.' },
      { id: 'is28', situation: 'Your parent checks your backpack every night and you feel like they don\'t trust you.', youStatement: 'You\'re always going through my stuff! You don\'t trust me!', iFeeling: 'frustrated and mistrusted', iBecause: 'having my things checked every night makes me feel like I\'m always in trouble', iNeed: 'Can we talk about what you\'re worried about? Maybe I can show you I\'m responsible.' },
      { id: 'is37', situation: 'Your teacher gives someone else a sticker for the same answer you gave earlier.', youStatement: 'That\'s not fair! I said that first!', iFeeling: 'overlooked and frustrated', iBecause: 'I gave the same answer earlier and wasn\'t recognized', iNeed: 'It would mean a lot if you noticed when I contribute too.' },
      { id: 'is38', situation: 'A kid at recess says you can\'t play because you\'re "not good enough."', youStatement: 'You\'re mean! You don\'t own this game!', iFeeling: 'left out and hurt', iBecause: 'being told I\'m not good enough makes me feel like I don\'t belong', iNeed: 'I need a chance to play and improve. Everyone deserves to be included.' }
    ],
    middle: [
      { id: 'is9', situation: 'Your friend makes fun of you in front of others to get laughs.', youStatement: 'You\'re such a fake friend. You only care about being popular.', iFeeling: 'humiliated and betrayed', iBecause: 'you used something personal to get laughs at my expense', iNeed: 'I need our friendship to be safe — no public roasts with private info.' },
      { id: 'is10', situation: 'Your parent reads your text messages without permission.', youStatement: 'You don\'t trust me! You\'re so controlling!', iFeeling: 'violated and disrespected', iBecause: 'my privacy was invaded without my knowledge', iNeed: 'I need us to agree on boundaries around my phone, ones we both feel okay with.' },
      { id: 'is11', situation: 'A friend cancels plans with you to hang out with someone else.', youStatement: 'You obviously like them more than me. Whatever.', iFeeling: 'rejected and unimportant', iBecause: 'I was looking forward to our plans and being replaced hurts', iNeed: 'I need you to honor commitments or give me honest notice so I can make other plans.' },
      { id: 'is12', situation: 'Your teacher calls on you when you didn\'t raise your hand, and you don\'t know the answer.', youStatement: 'That\'s not fair! I didn\'t raise my hand!', iFeeling: 'embarrassed and put on the spot', iBecause: 'I wasn\'t ready to answer and being singled out felt exposed', iNeed: 'I\'d feel more comfortable volunteering when I\'m ready.' },
      { id: 'is13', situation: 'A teammate takes credit for your idea during a group presentation.', youStatement: 'You stole my idea! That\'s plagiarism!', iFeeling: 'angry and invisible', iBecause: 'I contributed that idea and didn\'t receive acknowledgment', iNeed: 'I need my contributions to be credited accurately.' },
      { id: 'is14', situation: 'Your sibling borrows your clothes without asking and returns them stained.', youStatement: 'You ruin everything you touch! Stay out of my room!', iFeeling: 'disrespected and frustrated', iBecause: 'my belongings were taken and damaged without my permission', iNeed: 'I need you to ask before borrowing and take care of things that aren\'t yours.' },
      { id: 'is15', situation: 'A friend constantly vents to you but never asks how YOU\'RE doing.', youStatement: 'You\'re so selfish. Everything is always about you.', iFeeling: 'invisible and drained', iBecause: 'I support you through your problems but my own feelings never get space', iNeed: 'I need this friendship to go both ways. Can you check in on me sometimes too?' },
      { id: 'is16', situation: 'Your coach benches you for a game without explaining why.', youStatement: 'You\'re playing favorites! This team is rigged!', iFeeling: 'confused and undervalued', iBecause: 'I\'ve been working hard and not knowing why I was benched feels unfair', iNeed: 'I need to understand what I can improve so I know what to work on.' },
      { id: 'is29', situation: 'A friend films you without your knowledge and posts it to their story.', youStatement: 'Delete that NOW! You had no right to record me!', iFeeling: 'violated and exposed', iBecause: 'I was recorded without my knowledge or consent, and now it\'s public', iNeed: 'Take it down and ask me before recording or posting anything with me in it.' },
      { id: 'is30', situation: 'Your teacher singles you out for a dress code violation while others wearing similar things aren\'t mentioned.', youStatement: 'This is so unfair! You\'re targeting me!', iFeeling: 'singled out and confused', iBecause: 'others are wearing similar things and I\'m the only one being called out', iNeed: 'I\'d like to understand the rule clearly and have it applied equally.' },
      { id: 'is31', situation: 'Someone brings up an embarrassing thing you did years ago in front of new friends.', youStatement: 'Why would you bring that up?! You\'re the worst!', iFeeling: 'humiliated and betrayed', iBecause: 'that\'s from my past and I\'ve grown since then \u2014 bringing it up feels like sabotage', iNeed: 'I need my past to stay in the past. Please don\'t use old stories to embarrass me.' },
      { id: 'is32', situation: 'Your parent compares your grades to your cousin\'s during a family dinner.', youStatement: 'I\'m so sick of being compared! You obviously wish I was them!', iFeeling: 'inadequate and hurt', iBecause: 'being compared in front of everyone makes me feel like my best isn\'t good enough', iNeed: 'I need you to see MY progress, not measure me against someone else.' },
      { id: 'is39', situation: 'A friend asks to sit with you at lunch but then spends the whole time on their phone texting other people.', youStatement: 'Why did you even sit here if you\'re just going to be on your phone?!', iFeeling: 'invisible and unimportant', iBecause: 'I was excited to have lunch together but you\'re not really here', iNeed: 'I need our time together to actually feel like being together.' },
      { id: 'is40', situation: 'Your coach yells at you in front of the whole team for making a mistake.', youStatement: 'You always pick on me! Other people make mistakes too!', iFeeling: 'humiliated and targeted', iBecause: 'being called out publicly in front of my teammates made me feel singled out', iNeed: 'I\'d appreciate corrections given privately so I can learn without feeling embarrassed.' }
    ],
    high: [
      { id: 'is17', situation: 'Your partner accuses you of flirting with someone when you were just being friendly.', youStatement: 'You\'re so jealous and insecure. I can\'t even talk to people?', iFeeling: 'controlled and mistrusted', iBecause: 'being accused of something I didn\'t do makes me question the relationship', iNeed: 'I need you to trust me and talk to me about insecurities without accusations.' },
      { id: 'is18', situation: 'A coworker takes credit for your work during a meeting with your boss.', youStatement: 'You\'re a liar and a snake. Everyone will know what you did.', iFeeling: 'furious and exploited', iBecause: 'the work I did was presented as someone else\'s accomplishment', iNeed: 'I need my contributions documented and credited. Let\'s clarify with our supervisor.' },
      { id: 'is19', situation: 'Your parent dismisses your career aspirations as unrealistic.', youStatement: 'You never support me. You just want me to be like you.', iFeeling: 'dismissed and unsupported', iBecause: 'my dreams matter to me and hearing them called unrealistic feels like you don\'t believe in me', iNeed: 'I need your guidance, not dismissal. Can we research this path together?' },
      { id: 'is20', situation: 'A professor gives you a lower grade than you expected with minimal feedback.', youStatement: 'This grade is wrong. You clearly didn\'t read my paper.', iFeeling: 'frustrated and confused', iBecause: 'I put significant effort into this work and need to understand where I fell short', iNeed: 'Can we schedule time to go over specific areas where I can improve?' },
      { id: 'is21', situation: 'Your friend group makes plans right in front of you without including you.', youStatement: 'So I\'m invisible now? Cool. Good to know where I stand.', iFeeling: 'excluded and invisible', iBecause: 'making plans in front of me without inviting me sends a clear message', iNeed: 'I need honesty — if something changed between us, I\'d rather know than guess.' },
      { id: 'is22', situation: 'Someone in your study group isn\'t pulling their weight, and the deadline is tomorrow.', youStatement: 'You\'re lazy and you\'re going to tank everyone\'s grade.', iFeeling: 'anxious and resentful', iBecause: 'the deadline pressure falls on those of us who did the work', iNeed: 'I need you to complete your section by tonight, or we need to discuss telling the professor.' },
      { id: 'is23', situation: 'A friend shares your personal struggle with others "because they were worried about you."', youStatement: 'You had no right to tell anyone. That was private!', iFeeling: 'exposed and betrayed', iBecause: 'I trusted you with something vulnerable and lost control of my own story', iNeed: 'I need to be the one who decides when and how my story is shared. Even good intentions don\'t override my consent.' },
      { id: 'is24', situation: 'Your manager schedules you during a time you said you were unavailable.', youStatement: 'You never listen to me. This job doesn\'t respect my time.', iFeeling: 'disrespected and frustrated', iBecause: 'I communicated my availability clearly and it was ignored', iNeed: 'I need my stated availability to be honored. If there\'s a conflict, can we discuss it in advance?' },
      { id: 'is33', situation: 'Your boss regularly asks you to stay late without extra pay.', youStatement: 'You\'re taking advantage of me! This isn\'t what I agreed to!', iFeeling: 'exploited and undervalued', iBecause: 'my time is being taken without fair compensation and I can\'t keep absorbing this', iNeed: 'I need my scheduled hours respected, or compensation for overtime work.' },
      { id: 'is34', situation: 'Your friend group pressures you to drink at a party.', youStatement: 'Get off my back! I don\'t need to drink to have fun!', iFeeling: 'pressured and disrespected', iBecause: 'my choice not to drink keeps being questioned instead of accepted', iNeed: 'I need my decision to be respected without having to justify it every time.' },
      { id: 'is35', situation: 'Your partner questions why you\'re spending time with a specific friend.', youStatement: 'You\'re so jealous and controlling! I can have friends!', iFeeling: 'suffocated and mistrusted', iBecause: 'having to justify my friendships makes me feel like my autonomy isn\'t respected', iNeed: 'I need you to trust me and talk about your insecurities without trying to control who I see.' },
      { id: 'is36', situation: 'A professor dismisses your perspective during a class discussion.', youStatement: 'You just shut down anyone who disagrees with you!', iFeeling: 'silenced and disrespected', iBecause: 'I shared a thoughtful perspective and it was dismissed without engagement', iNeed: 'I need my viewpoint to be considered on its merits, even if you ultimately disagree.' },
      { id: 'is41', situation: 'A friend shares a meme mocking a group you belong to and says "it\'s just a joke."', youStatement: 'That\'s not funny! You\'re being ignorant!', iFeeling: 'hurt and alienated', iBecause: 'that meme targets my identity and sharing it publicly normalizes mockery of people like me', iNeed: 'I need you to understand that jokes about identity hit differently when you\'re the target. Can we talk about why this matters?' },
      { id: 'is42', situation: 'Your roommate uses your expensive shampoo without replacing it.', youStatement: 'Stop using my stuff! You\'re so inconsiderate!', iFeeling: 'taken advantage of', iBecause: 'I buy quality products for myself and using them without contributing isn\'t fair', iNeed: 'I need us to establish clear boundaries about shared vs. personal items, or split the cost.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── De-Escalation Techniques ──
  // ══════════════════════════════════════════════════════════════
  var DEESCALATION = {
    elementary: [
      { id: 'de1', name: 'Stop, Breathe, Think', icon: '\uD83D\uDEAB', steps: ['STOP: Freeze your body. Don\'t react yet.', 'BREATHE: Take 3 big belly breaths.', 'THINK: Ask yourself "What do I want to happen?"', 'CHOOSE: Pick the response that gets you closer to that.'], when: 'When you feel your body getting hot or tight — that\'s the sign to STOP.' },
      { id: 'de2', name: 'Walk Away & Return', icon: '\uD83D\uDEB6', steps: ['Say "I need a minute" or "I\'m too upset to talk right now."', 'Walk to a calm spot (not storming off — leaving with purpose).', 'Do something calming (count, breathe, draw).', 'Come back when you\'re ready and say "Okay, I\'m ready to talk."'], when: 'When you\'re so angry you might say something you\'ll regret.' },
      { id: 'de3', name: 'The Feelings Check', icon: '\u2764\uFE0F', steps: ['Put your hand on your chest.', 'Name what you\'re feeling: "I feel ___."', 'Name what you need: "I need ___."', 'Ask the other person: "How do you feel?"'], when: 'When a conflict feels confusing and nobody understands each other.' },
      { id: 'de4', name: 'The Volume Dial', icon: '\uD83D\uDD0A', steps: ['Notice if your voice is getting louder.', 'Imagine a volume dial in your hand.', 'Slowly turn it down to a 3 out of 10.', 'The quieter you get, the more people listen.'], when: 'When a conversation is turning into a shouting match.' },
      { id: 'de5', name: 'Find the Want', icon: '\uD83C\uDFAF', steps: ['Ask yourself: "What do I really want here?"', 'Ask the other person: "What do you want?"', 'Look for what\'s the same in both answers.', 'Build a solution from the shared want.'], when: 'When it seems like you\'re fighting about everything but really it\'s about one thing.' },
      { id: 'de6', name: 'The Peace Pause', icon: '\u270B', steps: ['Hold up your hand (palm out, fingers spread).', 'Say: "Peace pause. Can we start over?"', 'Both people take a breath.', 'Try again from the beginning, calmer this time.'], when: 'When a conversation went wrong in the first 10 seconds and needs a reset.' },
      { id: 'de19', name: 'The Body Scan', icon: '\uD83E\uDEC0', steps: ['Close your eyes or look down.', 'Start at your toes \u2014 are they clenched? Relax them.', 'Move up: legs, belly, hands, shoulders, jaw, forehead.', 'Wherever you find tightness, breathe into it and let it soften.'], when: 'When your body feels like a clenched fist but your brain can\'t figure out why. Your body knows before your mind does.' },
      { id: 'de20', name: 'The Kindness Surprise', icon: '\uD83D\uDC9D', steps: ['When things are getting tense, say one TRUE nice thing about the other person.', '"I know you\'re fair" or "You\'re usually really nice" or "I like playing with you."', 'Watch them soften. Kindness disarms defensiveness.', 'Then say what you need: "And that\'s why I know we can work this out."'], when: 'When the other person\'s walls are going up and logic isn\'t getting through. A genuine compliment cracks the armor.' }
    ],
    middle: [
      { id: 'de7', name: 'Name the Pattern', icon: '\uD83D\uDD04', steps: ['Recognize the escalation cycle: trigger → reaction → counter-reaction → blow-up.', 'Name it out loud: "I think we\'re escalating."', 'Suggest a pause: "Can we take 5 minutes and come back?"', 'Use the pause to identify what you actually need vs. what you\'re reacting to.'], when: 'When you notice the conversation is going in circles and getting louder each round.' },
      { id: 'de8', name: 'Validate Before Responding', icon: '\uD83D\uDC42', steps: ['Listen without planning your response.', 'Say back what you heard: "It sounds like you\'re upset because ___."', 'Ask: "Am I getting that right?"', 'THEN share your perspective: "Here\'s how I see it..."'], when: 'When the other person doesn\'t feel heard and keeps repeating themselves louder.' },
      { id: 'de9', name: 'The Text Pause', icon: '\uD83D\uDCF1', steps: ['If the conflict is over text, STOP TYPING.', 'Write your response in Notes, not in the chat.', 'Wait 10 minutes and re-read it.', 'Ask: "Will this make things better or worse?" Edit accordingly.'], when: 'When you\'re typing angry texts. Digital conflicts escalate faster because you can\'t hear tone.' },
      { id: 'de10', name: 'Separate Person from Problem', icon: '\u2702\uFE0F', steps: ['Remind yourself: "This person is not the enemy. The PROBLEM is the enemy."', 'Shift from "You vs. Me" to "Us vs. The Problem."', 'Say: "We both want ___ to be resolved. How can we work on this together?"', 'Focus on interests (what people need) not positions (what people demand).'], when: 'When you\'re starting to see the other person as the problem instead of as a partner in solving it.' },
      { id: 'de11', name: 'The Cool-Down Contract', icon: '\uD83E\uDD1D', steps: ['Before conflict escalates, agree on rules: "When things get heated, we both take a break."', 'Define the break: 10 minutes, separate spaces, no texting.', 'Define the return: "We come back and start with what we need, not what they did wrong."', 'Practice this when things are CALM so it\'s automatic when things aren\'t.'], when: 'For relationships where conflicts keep repeating. Build the system before you need it.' },
      { id: 'de12', name: 'The 5-5-5 Rule', icon: '\u23F3', steps: ['Ask: "Will this matter in 5 minutes?"', 'Ask: "Will this matter in 5 months?"', 'Ask: "Will this matter in 5 years?"', 'Match your response intensity to the actual stakes.'], when: 'When you\'re reacting to something small as if it\'s something huge. Perspective is a de-escalation tool.' },
      { id: 'de21', name: 'The Perspective Flip', icon: '\uD83D\uDD04', steps: ['Pause the argument and say: "Let me try to say YOUR side."', 'Argue THEIR position as well as you can.', 'Ask them to do the same for yours.', 'When you can argue each other\'s side, you\'re finally understanding \u2014 not just debating.'], when: 'When you realize you\'ve been rehearsing your counterargument instead of listening. This forces real empathy.' },
      { id: 'de22', name: 'The Written Pause', icon: '\uD83D\uDCDD', steps: ['When emotions are high, say: "I want to get this right. Can I write it down first?"', 'Write what you\'re feeling and what you need (pen and paper, not a text).', 'Read it aloud to them \u2014 reading forces you to slow down.', 'Ask them to do the same if they\'re willing.'], when: 'When conversations keep derailing because emotions override words. Writing forces organization and honesty.' }
    ],
    high: [
      { id: 'de13', name: 'Tactical Empathy', icon: '\uD83C\uDFAF', steps: ['Listen for the emotion underneath the words, not just the words.', 'Label it: "It seems like you feel ___ about this."', 'Don\'t say "I understand" (they\'ll say "No you don\'t"). Say "I can see why that would feel ___."', 'Once they feel heard, they\'re more open to hearing you.'], when: 'When someone is deeply emotional and rational arguments aren\'t working. Meet them where they are emotionally first.' },
      { id: 'de14', name: 'The Accountability Opening', icon: '\uD83D\uDD13', steps: ['Start with what YOU contributed to the problem: "Here\'s what I could have done better..."', 'This disarms defensiveness immediately.', 'Then address the issue: "And here\'s what I need from you..."', 'Vulnerability creates space for vulnerability.'], when: 'When both sides are blaming each other. Someone has to go first. Let it be you.' },
      { id: 'de15', name: 'Boundaries Without Walls', icon: '\uD83E\uDDF1', steps: ['A boundary: "I won\'t continue this conversation if there\'s yelling."', 'Not a wall: "I\'m done talking to you forever."', 'State the boundary calmly and follow through consistently.', 'When the boundary is respected, re-engage warmly.'], when: 'When someone\'s behavior is crossing a line. Boundaries protect the relationship by protecting both people.' },
      { id: 'de16', name: 'Seek to Understand', icon: '\uD83D\uDD0D', steps: ['Replace "Why would you DO that?" with "Help me understand what happened from your side."', '"Why" triggers defensiveness. "Help me understand" invites openness.', 'Ask clarifying questions: "When you say ___, do you mean ___?"', 'Restate until they say "Yes, exactly."'], when: 'When you genuinely don\'t understand the other person\'s reasoning and are tempted to judge instead of learn.' },
      { id: 'de17', name: 'The Meta-Conversation', icon: '\uD83D\uDDE3\uFE0F', steps: ['Stop talking ABOUT the issue and talk about HOW you\'re talking.', '"I notice we keep interrupting each other. Can we try one person at a time?"', '"I feel like we\'re arguing to win, not to solve. Can we shift?"', 'Rules for the conversation become the conversation.'], when: 'When the process of arguing is itself the problem — not just the content.' },
      { id: 'de18', name: 'Know When to Walk Away', icon: '\uD83D\uDEAA', steps: ['Some conflicts cannot be resolved right now. Recognize the signs: circular arguments, personal attacks, emotional flooding.', 'Say: "I care about resolving this, but right now we\'re hurting each other. I need to pause."', 'Set a concrete time to return: "Can we talk about this tomorrow at 4?"', 'Walking away with a plan to return is maturity, not avoidance.'], when: 'When continuing would cause more damage than pausing. This is one of the hardest and most important skills.' },
      { id: 'de23', name: 'The Power Audit', icon: '\u26A1', steps: ['Before engaging, ask: "Is the power balance equal here?" (age, authority, social status)', 'If you have MORE power: lower your volume, ask questions, validate first.', 'If you have LESS power: choose your timing, document interactions, find allies.', 'If equal: engage directly. Fair fights require fair footing.'], when: 'When the conflict involves a boss/employee, teacher/student, or significant social power gap. Strategy must account for power dynamics.' },
      { id: 'de24', name: 'The 24-Hour Draft', icon: '\u23F3', steps: ['Write the email, the text, the letter \u2014 say everything you want to say.', 'Do NOT send it.', 'Wait 24 hours. Re-read it with fresh eyes.', 'Edit for truth, not revenge. Send the version you\'d be okay seeing screenshotted.'], when: 'When you\'re composing a message that could permanently alter a relationship. The difference between honest and brutal is usually 24 hours.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Repair & Reconciliation Prompts ──
  // ══════════════════════════════════════════════════════════════
  var REPAIR_PROMPTS = {
    elementary: [
      { id: 'rp1', title: 'The Real Apology', situation: 'You said something hurtful to a friend and they\'re avoiding you.', steps: ['Say exactly what you did: "I said ___ and that was wrong."', 'Say how they probably felt: "That probably made you feel ___."', 'Say what you\'ll do differently: "Next time I\'ll ___."', 'Ask: "Is there anything else I can do to make it better?"'], avoid: '"I\'m sorry IF you were offended" — that\'s not an apology, it\'s blame.' },
      { id: 'rp2', title: 'Rebuilding Trust', situation: 'You broke a promise and your friend doesn\'t trust you anymore.', steps: ['Acknowledge what you did without excuses.', 'Don\'t expect forgiveness right away — trust takes time to rebuild.', 'Make small promises and KEEP them. Consistency heals.', 'Show through actions, not just words.'], avoid: '"Get over it, I already said sorry" — demanding forgiveness makes it worse.' },
      { id: 'rp3', title: 'Making Up After a Fight', situation: 'You and a friend had a big argument and haven\'t talked in days.', steps: ['Write down what you\'re feeling (for yourself, not to send).', 'Think about your part — what did YOU do or say that wasn\'t great?', 'Approach them: "I miss being friends. Can we talk about what happened?"', 'Listen to their side FIRST. Then share yours.'], avoid: '"I\'ll talk to them when THEY apologize first" — someone has to be brave enough to go first.' },
      { id: 'rp4', title: 'Forgiving Someone', situation: 'Someone hurt your feelings and said sorry. You\'re still upset.', steps: ['It\'s okay to still feel hurt even after someone apologizes.', 'Forgiveness doesn\'t mean pretending it never happened.', 'You can say: "I accept your apology. I\'m still a little hurt but I want to move forward."', 'Forgiveness is a gift you give yourself — holding on to anger hurts YOU.'], avoid: '"I forgive you but I\'ll never forget" — said as a threat, not as healing.' },
      { id: 'rp13', title: 'When You Were the Mean One', situation: 'You realize that YOU were the one being mean to someone \u2014 excluding them, laughing at them, or being bossy. They didn\'t tell you, but you can see they\'re hurting.',
        steps: ['Recognize that THEY didn\'t come to you \u2014 you noticed on your own. That takes awareness.', 'Approach them kindly: "I think I\'ve been mean to you, and I\'m sorry."', 'Be specific about what you did. Vague apologies don\'t land.', 'Ask: "What can I do to make our class feel safer for you?"'], avoid: '"I was just joking" \u2014 if they\'re not laughing, it\'s not a joke.' },
      { id: 'rp14', title: 'When the Group Left Someone Out', situation: 'Your friend group keeps leaving the same person out of activities \u2014 not on purpose, but it keeps happening. You notice the pattern.',
        steps: ['Name the pattern to your group: "Have you noticed we keep forgetting to include them?"', 'Don\'t blame anyone. Exclusion is often accidental but still hurts.', 'Take action: personally invite them next time. Lead by example.', 'Check in: "I\'m sorry if you\'ve felt left out. You\'re welcome with us."'], avoid: '"They should just join us" \u2014 when someone has been excluded repeatedly, THEY need to be invited IN.' }
    ],
    middle: [
      { id: 'rp5', title: 'Repairing After Gossip', situation: 'You talked about a friend behind their back and they found out.', steps: ['Don\'t deny it or minimize it. Own what you said.', 'Apologize specifically: "I said ___ about you and that was wrong. I shouldn\'t have talked about you to other people."', 'Explain without excusing: "I was frustrated but that doesn\'t make it okay."', 'Ask what they need: "What do you need from me to feel safe in this friendship again?"'], avoid: '"Everyone talks about everyone" — normalizing harm isn\'t an apology.' },
      { id: 'rp6', title: 'Recovering from a Betrayal', situation: 'A friend shared your secret and you\'re devastated.', steps: ['Feel your feelings. Betrayal is grief — you lost something (trust) that mattered.', 'Decide if you WANT to repair. Not all relationships should be saved.', 'If yes: be specific about what would need to change for you to trust again.', 'Accept that the friendship may look different. That\'s not failure — it\'s evolution.'], avoid: 'Pretending you\'re fine when you\'re not. Burying hurt doesn\'t heal it.' },
      { id: 'rp7', title: 'Apologizing When You Were Partially Right', situation: 'You and a friend argued. You were right about the facts but handled it badly.',
        steps: ['Separate the WHAT from the HOW.', 'Apologize for the HOW: "I was harsh / I shouldn\'t have said it that way / I hurt you."', 'You can be right about the issue AND wrong about the delivery.', 'Ask: "Can we talk about the actual issue now that we\'re calm?"'], avoid: '"I\'m sorry you\'re upset but I was right" — this isn\'t an apology, it\'s a victory lap.' },
      { id: 'rp8', title: 'Repairing Group Dynamics', situation: 'Your friend group had a major falling out and people are taking sides.', steps: ['Refuse to take sides. Say: "I care about all of you."', 'Don\'t be a messenger. Tell people to talk directly.', 'Suggest: "Can we all sit down and clear the air? No ganging up, just listening."', 'Model the behavior: be honest, kind, and direct in YOUR relationships.'], avoid: 'Creating a group chat to "discuss" someone who isn\'t in it.' },
      { id: 'rp15', title: 'Repairing After Exclusion', situation: 'You were part of a group that deliberately excluded someone from a hangout. You went along with it even though it didn\'t feel right.',
        steps: ['Separate yourself from the group decision: "I went along with it, and that was wrong."', 'Reach out privately: "I should have spoken up. I\'m sorry I didn\'t."', 'Be honest: "The group decided not to invite you, and I didn\'t push back."', 'Going forward: if you can\'t change the group, be the person who includes.'], avoid: 'Blaming the group leader. "They decided" doesn\'t erase "you agreed."' },
      { id: 'rp16', title: 'Repairing Digital Harm', situation: 'You posted, shared, or liked something online that hurt someone. The internet made it bigger than you intended.',
        steps: ['Delete what you can. But acknowledge that screenshots exist \u2014 deleting doesn\'t erase impact.', 'Apologize publicly if the harm was public: "I posted something hurtful. I was wrong."', 'Apologize privately AND publicly \u2014 the person deserves both.', 'Before posting, apply the "Would I say this to their face?" test.'], avoid: '"It was just a post" \u2014 digital harm IS real harm. The medium doesn\'t reduce the impact.' }
    ],
    high: [
      { id: 'rp9', title: 'Repairing After Harm', situation: 'You said or did something racist, homophobic, or deeply hurtful — even unintentionally.',
        steps: ['Don\'t say "I\'m not racist/homophobic." Center their experience, not your identity.', 'Say: "What I said/did was harmful. I\'m sorry. I want to understand and do better."', 'Educate yourself — don\'t ask the person you hurt to teach you why it hurt.', 'Change the behavior. Apologies without changed behavior are just performances.'], avoid: '"I didn\'t mean it that way" — intent doesn\'t erase impact. Focus on what it DID, not what you MEANT.' },
      { id: 'rp10', title: 'Reconciling with a Parent', situation: 'You had a major conflict with a parent and things have been tense for weeks.',
        steps: ['Write a letter (even if you never send it) to organize your thoughts.', 'Request a structured conversation: "Can we talk this weekend? Just the two of us, no distractions?"', 'Lead with: "I love you. This distance is hard for me. Here\'s what I need you to understand..."', 'Ask: "What do YOU need me to understand?"'], avoid: 'Waiting for them to go first. Parents are people too — they get scared, proud, and stuck.' },
      { id: 'rp11', title: 'Moving On from a Friendship', situation: 'A friendship has become toxic but ending it feels like failure.',
        steps: ['Recognize: some relationships end and that\'s not failure — it\'s growth.', 'Grieve the friendship that was, not the one it became.', 'If possible, close with honesty: "I care about you, but this friendship isn\'t healthy for either of us right now."', 'You don\'t owe anyone access to you. Boundaries are not cruelty.'], avoid: 'Ghosting without explanation. Even difficult endings deserve honesty.' },
      { id: 'rp12', title: 'Forgiving Yourself', situation: 'You did something you deeply regret and can\'t stop beating yourself up about it.',
        steps: ['Acknowledge what you did fully — no minimizing, no catastrophizing.', 'Ask: "Have I apologized? Have I tried to repair? Have I changed the behavior?" If yes, you\'ve done the work.', 'Self-forgiveness isn\'t saying it was okay. It\'s saying "I am more than my worst moment."', 'Channel guilt into growth: volunteer, mentor, become the person who prevents what you caused.'], avoid: 'Eternal self-punishment. Guilt that never transforms into growth becomes self-indulgence.' },
      { id: 'rp17', title: 'Repairing Professional Trust', situation: 'You missed a major deadline, dropped the ball on a commitment, or let down a team that was depending on you.',
        steps: ['Don\'t make excuses. Even valid reasons sound like excuses when trust is broken.', 'Own the impact: "Because I dropped this, the team had to [consequence]. I\'m accountable."', 'Present a concrete recovery plan \u2014 not "I\'ll do better" but "here\'s exactly what I\'m doing differently."', 'Over-deliver for a while. Trust is rebuilt through consistent small actions, not grand gestures.'], avoid: 'Expecting one apology to fix it. Professional trust is rebuilt over months, not minutes.' },
      { id: 'rp18', title: 'Letting Go Without Closure', situation: 'Someone wronged you and you\'ll never get an apology. They moved, ghosted, or refuse to acknowledge what they did.',
        steps: ['Accept that closure is something you create, not something they give you.', 'Write the letter you\'ll never send. Say everything you need to say \u2014 on paper.', 'Forgiveness is not about them deserving it. It\'s about you deserving peace.', 'Channel the pain: what did this teach you? How does it make you a better friend, partner, person?'], avoid: 'Waiting for an apology that may never come. Your healing can\'t depend on their growth.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Conflict Style Quiz (Thomas-Kilmann inspired) ──
  // Identify your default conflict resolution style
  // ══════════════════════════════════════════════════════════════
  var STYLE_QUIZ = {
    elementary: [
      { id: 'sq1', scenario: 'Two kids want to play the same game at recess, but there\'s only enough players for one game.', options: [
        { text: 'Insist on YOUR game since your idea was better.', style: 'competing' },
        { text: 'Go play by yourself instead of arguing.', style: 'avoiding' },
        { text: 'Let them pick — keeping peace is more important.', style: 'accommodating' },
        { text: '"Let\'s play your game first, then mine after."', style: 'compromising' },
        { text: 'Invent a NEW game that combines both ideas!', style: 'collaborating' }
      ]},
      { id: 'sq2', scenario: 'Your group can\'t agree on what to build for a class project. You have a different idea than everyone else.', options: [
        { text: 'Argue until they agree — your idea is clearly best.', style: 'competing' },
        { text: 'Don\'t say anything and go with what they want.', style: 'avoiding' },
        { text: '"Okay, your idea is fine" even though you prefer yours.', style: 'accommodating' },
        { text: 'Suggest using some ideas from each person.', style: 'compromising' },
        { text: 'Ask everyone to explain their ideas and find what works best from ALL of them.', style: 'collaborating' }
      ]},
      { id: 'sq3', scenario: 'You and your sibling both want the last cookie.', options: [
        { text: 'Grab it before they can — first come, first served!', style: 'competing' },
        { text: 'Walk away. It\'s just a cookie.', style: 'avoiding' },
        { text: 'Let them have it. You don\'t want to fight.', style: 'accommodating' },
        { text: 'Split the cookie in half.', style: 'compromising' },
        { text: 'Suggest you both bake MORE cookies together!', style: 'collaborating' }
      ]},
      { id: 'sq4', scenario: 'A friend wants to copy your homework. You don\'t think that\'s right.', options: [
        { text: '"No way" and don\'t discuss it further.', style: 'competing' },
        { text: 'Pretend you didn\'t hear and change the subject.', style: 'avoiding' },
        { text: 'Let them copy — you don\'t want to lose the friendship.', style: 'accommodating' },
        { text: 'Let them see answers but they must write in their own words.', style: 'compromising' },
        { text: 'Offer to study together so they learn it too.', style: 'collaborating' }
      ]},
      { id: 'sq5', scenario: 'Two teams argue about whether a goal counted in a soccer game at recess.', options: [
        { text: 'Insist it counted (or didn\'t) and refuse to back down.', style: 'competing' },
        { text: '"Let\'s just skip it" and move on without deciding.', style: 'avoiding' },
        { text: 'Let the other team have their way to stop the argument.', style: 'accommodating' },
        { text: 'Agree to redo the play — fair for both sides.', style: 'compromising' },
        { text: 'Choose a referee for the rest of the game so this doesn\'t happen again.', style: 'collaborating' }
      ]},
      { id: 'sq16', scenario: 'You and a friend both want to bring a treat for the class party, but the teacher says only one person can.', options: [
        { text: 'Insist yours is better and you should be the one.', style: 'competing' },
        { text: '"Never mind, I\'ll just eat mine at home."', style: 'avoiding' },
        { text: 'Let them bring their treat. It\'s not that big of a deal.', style: 'accommodating' },
        { text: 'Flip a coin — fair and quick.', style: 'compromising' },
        { text: 'Ask the teacher if you can both bring treats and combine them into a bigger party!', style: 'collaborating' }
      ]}
    ],
    middle: [
      { id: 'sq6', scenario: 'Your friend group can\'t agree on weekend plans — half want movies, half want the park.', options: [
        { text: 'Push hard for your preference and rally others to your side.', style: 'competing' },
        { text: '"I\'ll just stay home" to avoid the whole debate.', style: 'avoiding' },
        { text: 'Go along with whatever the majority wants.', style: 'accommodating' },
        { text: '"Movie this weekend, park next weekend."', style: 'compromising' },
        { text: 'Research if there\'s an outdoor movie screening that combines both!', style: 'collaborating' }
      ]},
      { id: 'sq7', scenario: 'You and a classmate disagree about how to divide work on a major project.', options: [
        { text: 'Insist on your method — it\'s obviously more efficient.', style: 'competing' },
        { text: 'Drop it. Not worth the argument.', style: 'avoiding' },
        { text: 'Accept their plan to keep things smooth.', style: 'accommodating' },
        { text: 'Split some parts by strength and some parts evenly.', style: 'compromising' },
        { text: 'Map out everyone\'s strengths AND the work needed, then design roles together.', style: 'collaborating' }
      ]},
      { id: 'sq8', scenario: 'Your sibling keeps using your stuff without asking. Your parent says to "just share."', options: [
        { text: 'Put a lock on your room and refuse to share anything.', style: 'competing' },
        { text: 'Move your important stuff to your locker at school.', style: 'avoiding' },
        { text: 'Accept that sharing is easier than fighting.', style: 'accommodating' },
        { text: 'Make a deal: they can use certain things if they ask first.', style: 'compromising' },
        { text: 'Sit down as a family and create a borrowing agreement everyone writes.', style: 'collaborating' }
      ]},
      { id: 'sq9', scenario: 'In a group chat, two friends argue and both DM you asking you to take their side.', options: [
        { text: 'Take the side of whoever you agree with and defend them.', style: 'competing' },
        { text: 'Mute the chat and pretend you didn\'t see anything.', style: 'avoiding' },
        { text: 'Tell each of them they\'re right to avoid hurting anyone.', style: 'accommodating' },
        { text: '"You both have valid points. Meet in the middle."', style: 'compromising' },
        { text: 'Suggest a three-way call to talk it out directly.', style: 'collaborating' }
      ]},
      { id: 'sq10', scenario: 'You made the basketball team but your best friend got cut. They\'re icing you out.', options: [
        { text: 'Enjoy your spot — you earned it. They need to deal.', style: 'competing' },
        { text: 'Avoid bringing up basketball and hope the awkwardness fades.', style: 'avoiding' },
        { text: 'Consider quitting the team to save the friendship.', style: 'accommodating' },
        { text: 'Offer to practice with them for next season\'s tryouts.', style: 'compromising' },
        { text: 'Acknowledge their pain, share your feelings honestly, and figure out how to navigate it together.', style: 'collaborating' }
      ]},
      { id: 'sq17', scenario: 'Your lab partner wants to do the experiment differently than what the instructions say. You\'re worried about getting a bad grade.', options: [
        { text: 'Take over and do it the right way yourself.', style: 'competing' },
        { text: 'Let them do whatever and just take notes.', style: 'avoiding' },
        { text: 'Go with their method even though you disagree.', style: 'accommodating' },
        { text: 'Try both methods and pick whichever works better.', style: 'compromising' },
        { text: 'Re-read the instructions together and create a plan that follows the rubric but includes their creative ideas.', style: 'collaborating' }
      ]}
    ],
    high: [
      { id: 'sq11', scenario: 'Your roommate wants to have friends over on a night you planned to study for a huge exam.', options: [
        { text: '"No. I have to study. They can\'t come."', style: 'competing' },
        { text: 'Pack up and go to the library without saying anything.', style: 'avoiding' },
        { text: '"It\'s fine" and try to study with headphones.', style: 'accommodating' },
        { text: '"Can they come but leave by 10 PM?"', style: 'compromising' },
        { text: 'Plan together: "I\'ll study at the library until 9, you host until then, quiet after."', style: 'collaborating' }
      ]},
      { id: 'sq12', scenario: 'At your job, you and a coworker are both up for a promotion. They start undermining you in meetings.', options: [
        { text: 'Play their game — start undermining them too.', style: 'competing' },
        { text: 'Ignore it and focus on your own work.', style: 'avoiding' },
        { text: 'Back off and let them have the promotion.', style: 'accommodating' },
        { text: 'Confront them: "Let\'s agree to compete fairly."', style: 'compromising' },
        { text: 'Talk to your manager about how your different strengths can both be valued.', style: 'collaborating' }
      ]},
      { id: 'sq13', scenario: 'You and your partner disagree on how to spend summer — they want travel, you want to work and save.', options: [
        { text: 'Tell them travel is irresponsible and they need to grow up.', style: 'competing' },
        { text: 'Avoid the conversation. Summer is months away.', style: 'avoiding' },
        { text: 'Agree to travel even though it stresses you financially.', style: 'accommodating' },
        { text: 'Take one short trip and work the rest of the summer.', style: 'compromising' },
        { text: 'Budget together: find ways to travel cheaply AND save — road trips, house-sitting, remote work.', style: 'collaborating' }
      ]},
      { id: 'sq14', scenario: 'In a group project, you believe the approach is wrong but the entire group disagrees.', options: [
        { text: 'Insist on your approach and threaten to work alone.', style: 'competing' },
        { text: 'Drop it. Just do your section and let them fail.', style: 'avoiding' },
        { text: 'Go along with the group — maybe you\'re wrong.', style: 'accommodating' },
        { text: '"Let\'s test both approaches on a small section and compare."', style: 'compromising' },
        { text: 'Present concerns with evidence and ask: "What if we combine strengths of both approaches?"', style: 'collaborating' }
      ]},
      { id: 'sq15', scenario: 'A friend in crisis constantly calls you at all hours. You care but it\'s affecting your mental health.', options: [
        { text: 'Tell them bluntly to stop calling so much.', style: 'competing' },
        { text: 'Start ignoring their calls and hope they find someone else.', style: 'avoiding' },
        { text: 'Always answer, no matter what. They need you.', style: 'accommodating' },
        { text: '"I\'m available 6-10 PM. Other times, text and I\'ll respond when I can."', style: 'compromising' },
        { text: '"I want to support you. Let\'s also find professional help and build a support network so neither of us burns out."', style: 'collaborating' }
      ]},
      { id: 'sq18', scenario: 'You and a colleague are assigned to co-lead a presentation. You both want to present the conclusion (the most visible part).', options: [
        { text: 'Volunteer first and make it clear you\'re doing the conclusion.', style: 'competing' },
        { text: 'Let them have it. It\'s not worth the drama.', style: 'avoiding' },
        { text: 'Give it to them since they seem to want it more.', style: 'accommodating' },
        { text: 'Each present half the conclusion.', style: 'compromising' },
        { text: 'Discuss what each person does best, then divide the entire presentation by strength — not just the one section.', style: 'collaborating' }
      ]}
    ]
  };

  var STYLE_DESCRIPTIONS = {
    competing: { name: 'Competing', icon: '\u2694\uFE0F', color: '#ef4444',
      desc: 'You pursue your own concerns assertively, sometimes at others\' expense. You stand up for your position and fight for what you believe.',
      strength: 'Decisive in emergencies. Good at defending important principles.',
      watchFor: 'Can damage relationships. Not every conflict needs a winner.' },
    avoiding: { name: 'Avoiding', icon: '\uD83D\uDEAA', color: '#94a3b8',
      desc: 'You tend to sidestep conflict, postpone issues, or withdraw from threatening situations.',
      strength: 'Good at knowing when an issue isn\'t worth the fight. Prevents unnecessary drama.',
      watchFor: 'Unaddressed issues build up. Others may feel like their concerns don\'t matter.' },
    accommodating: { name: 'Accommodating', icon: '\uD83D\uDD4A\uFE0F', color: '#3b82f6',
      desc: 'You put others\' needs before your own. You prioritize harmony and maintaining relationships.',
      strength: 'Great at preserving relationships. Generous and selfless. Creates goodwill.',
      watchFor: 'You might sacrifice your own needs too often. People may take advantage.' },
    compromising: { name: 'Compromising', icon: '\u2696\uFE0F', color: '#f59e0b',
      desc: 'You look for middle ground \u2014 solutions where each person gives up something to find a workable answer.',
      strength: 'Practical and fair. Good at finding quick solutions when time is limited.',
      watchFor: 'Compromise sometimes means nobody gets what they really need.' },
    collaborating: { name: 'Collaborating', icon: '\uD83E\uDD1D', color: '#10b981',
      desc: 'You try to find win-win solutions that fully satisfy everyone\'s concerns. You dig deep to understand what people really need.',
      strength: 'Creates the best long-term solutions. Builds trust and strong relationships.',
      watchFor: 'Takes more time and energy. Not every conflict warrants this level of effort.' }
  };

  // ══════════════════════════════════════════════════════════════
  // ── Apology Workshop Scenarios ──
  // Practice structured, meaningful apologies
  // ══════════════════════════════════════════════════════════════
  var APOLOGY_SCENARIOS = {
    elementary: [
      { id: 'ap1', title: 'The Broken Promise', situation: 'You promised to save a seat for your friend at lunch, but when your other friends sat down first, you didn\'t say anything. Now your friend has nowhere to sit and looks hurt.',
        acknowledge: 'I didn\'t save you a seat like I promised.',
        responsibility: 'That was my fault. I should have spoken up when others sat down.',
        empathy: 'You probably felt forgotten and like our friendship doesn\'t matter.',
        repair: 'Can I save you a seat tomorrow and make sure no one takes it?',
        promise: 'Next time I make a promise, I\'ll follow through even if it feels awkward.' },
      { id: 'ap2', title: 'The Harsh Words', situation: 'During a game, you got frustrated and yelled "You\'re terrible at this!" at a teammate. They stopped playing and went to sit alone.',
        acknowledge: 'I yelled at you and said something really hurtful during the game.',
        responsibility: 'I was frustrated, but that\'s no excuse. I shouldn\'t have said that.',
        empathy: 'That probably made you feel embarrassed in front of everyone and like you\'re not good enough.',
        repair: 'I want you on my team. Can I tell the group I was wrong?',
        promise: 'When I get frustrated, I\'ll take a breath instead of yelling at someone.' },
      { id: 'ap3', title: 'The Excluded Friend', situation: 'You had a birthday party and didn\'t invite one friend from your group. They found out from the photos you posted.',
        acknowledge: 'I had a party and didn\'t invite you, and you had to find out from photos.',
        responsibility: 'That was my choice and it was hurtful. I should have talked to you.',
        empathy: 'Seeing those photos must have felt terrible \u2014 like you were left out on purpose.',
        repair: 'Can we do something special together, just the two of us?',
        promise: 'I\'ll be more thoughtful about how my choices affect people I care about.' },
      { id: 'ap4', title: 'The Lie That Grew', situation: 'You told a small lie about why you couldn\'t come to your friend\'s house. They found out you just didn\'t feel like going and now they\'re upset.',
        acknowledge: 'I lied to you about why I couldn\'t come over.',
        responsibility: 'I chose to lie instead of being honest. That was wrong.',
        empathy: 'Finding out I lied probably makes you wonder what else I haven\'t been honest about.',
        repair: 'From now on, I\'ll tell you the truth, even if it\'s just "I need a quiet day."',
        promise: 'It\'s okay to need space \u2014 I\'ll be honest about it instead of making up stories.' },
      { id: 'ap13', title: 'The Left-Out Friend', situation: 'You and two friends were playing a game that only has room for three players. A fourth friend came over and you said "Sorry, there\'s no room" without trying to include them.',
        acknowledge: 'I turned you away without trying to find a way to include you.',
        responsibility: 'I could have tried to adjust the game or taken turns, but I chose the easy option.',
        empathy: 'Walking up to your friends and being told there\'s no room for you probably felt like being rejected.',
        repair: 'Next time, let\'s play something everyone can do. And today — do you want to join the next round?',
        promise: 'I\'ll think about how it feels to be left out before I tell someone there\'s no space for them.' }
    ],
    middle: [
      { id: 'ap5', title: 'The Public Roast', situation: 'You made a joke about your friend in the group chat. Everyone laughed, but your friend went quiet. You realize the joke was about something they\'re insecure about.',
        acknowledge: 'I made a joke about something you\'re sensitive about in front of everyone.',
        responsibility: 'I knew it was personal and went for the laugh anyway. That was selfish.',
        empathy: 'Being laughed at about something you\'re insecure about is humiliating. I made an unsafe space for you.',
        repair: 'I\'ll message the group that I went too far. What else do you need from me?',
        promise: 'Your insecurities are not my material. I\'ll never use personal stuff for laughs.' },
      { id: 'ap6', title: 'The Shared Secret', situation: 'Your friend told you they had a crush on someone. You told one person "in confidence" and now the whole grade knows.',
        acknowledge: 'I told someone your secret even though you trusted me with it.',
        responsibility: 'There\'s no excuse. You trusted me and I broke that trust.',
        empathy: 'Having your crush announced to everyone probably felt like a complete betrayal.',
        repair: 'I can\'t undo it, but I\'ll shut down any gossip about it that I hear.',
        promise: 'When someone trusts me with something private, it stays private. Period.' },
      { id: 'ap7', title: 'The Two-Faced Text', situation: 'You texted negative things about a friend while being nice to their face. A screenshot got shared and they saw everything.',
        acknowledge: 'I said things about you behind your back that I would never say to your face.',
        responsibility: 'I was being fake and cowardly. The things I texted were cruel and unfair.',
        empathy: 'Seeing those texts must have made you question every nice thing I\'ve ever said.',
        repair: 'I need to earn your trust back. Can we talk about what I said so I can own all of it?',
        promise: 'If I have a problem with someone, I\'ll talk TO them, not ABOUT them.' },
      { id: 'ap8', title: 'The Ditched Plans', situation: 'You committed to a project with your partner this weekend, then bailed last minute to hang out with someone else. They did the whole thing alone.',
        acknowledge: 'I ditched our project plans at the last minute to do something else.',
        responsibility: 'I prioritized fun over a commitment I made to you. That was disrespectful.',
        empathy: 'You probably felt used and unimportant, doing my share because I was unreliable.',
        repair: 'I\'ll talk to the teacher about what happened so you get full credit.',
        promise: 'A commitment is a commitment. If I need to cancel, I\'ll give real notice.' },
      { id: 'ap14', title: 'The Pile-On', situation: 'When someone was being teased in the group chat, you added a laughing emoji and a snarky comment. Later you realized the person was genuinely hurt and went offline for days.',
        acknowledge: 'I added to the pile-on when you were being teased. My emoji and comment made it worse.',
        responsibility: 'I chose to join in instead of standing up for you or staying neutral.',
        empathy: 'Seeing people you trust laughing at you \u2014 and then going silent \u2014 must have felt like nobody had your back.',
        repair: 'I want to message the group and say that wasn\'t cool. I\'m also here to talk whenever you want.',
        promise: 'Next time I see someone being dogpiled, I\'ll speak up or DM them privately. Silence is participation.' }
    ],
    high: [
      { id: 'ap9', title: 'The Microaggression', situation: 'You made a comment about a classmate\'s accent that you thought was funny. They told you it was hurtful and something they hear constantly.',
        acknowledge: 'I made a comment about your accent that was hurtful.',
        responsibility: 'I thought it was harmless, but my intent doesn\'t change the impact.',
        empathy: 'Hearing comments about your accent constantly must be exhausting. My "joke" added to that pile.',
        repair: 'I\'m educating myself about microaggressions. If I do this again, please tell me \u2014 I\'ll listen without being defensive.',
        promise: 'I\'ll think about the weight of my words, especially about things tied to identity.' },
      { id: 'ap10', title: 'The Emotional Neglect', situation: 'Your partner has been saying they feel emotionally neglected. You\'ve been dismissive, calling them "too needy." They finally broke down crying.',
        acknowledge: 'I\'ve been dismissing your feelings and calling you needy when you were asking for basic connection.',
        responsibility: 'I was being defensive because facing your pain meant facing my shortcomings.',
        empathy: 'Being told you\'re "too much" by someone who\'s supposed to be your safe person must feel incredibly lonely.',
        repair: 'Can we set aside time each day to actually talk? I\'d also like to look into counseling together.',
        promise: 'Your needs are not a burden. I\'ll see your requests as invitations to connect, not criticisms.' },
      { id: 'ap11', title: 'The Credit Theft', situation: 'In a team presentation, you presented a classmate\'s framework as your own idea. The professor praised "your" insight. They confronted you after class.',
        acknowledge: 'I presented your framework as my own during the presentation.',
        responsibility: 'There\'s no gray area. I took credit for your intellectual work.',
        empathy: 'Watching someone get praised for YOUR idea while you sit there must have been infuriating.',
        repair: 'I\'m emailing the professor today to clarify the attribution. I\'ll CC you.',
        promise: 'Going forward, I will credit ideas to their source. Always.' },
      { id: 'ap12', title: 'The Boundary Violation', situation: 'You shared a friend\'s personal struggle with others because you were "worried." They didn\'t ask you to involve anyone and feel exposed.',
        acknowledge: 'I shared your personal information with others without your consent.',
        responsibility: 'Even though I was worried, it wasn\'t my story to share. I took away your control over your own narrative.',
        empathy: 'Having something so personal spread without your knowledge must feel like a violation of trust.',
        repair: 'I\'ll tell everyone I spoke to that I shouldn\'t have shared that, and ask them to respect your privacy.',
        promise: 'If I\'m worried about you, I\'ll talk TO you about it. If I think you need help, I\'ll ask YOU first.' },
      { id: 'ap15', title: 'The Ghosting', situation: 'You ended a close friendship by simply stopping all communication. No explanation, no closure. Months later, they reach out asking what happened.',
        acknowledge: 'I disappeared from your life without any explanation.',
        responsibility: 'I chose silence because it was easier for me. But ghosting isn\'t a breakup strategy \u2014 it\'s abandonment.',
        empathy: 'You probably spent months wondering what you did wrong. The uncertainty is often worse than any honest conversation would have been.',
        repair: 'I owe you the truth about what happened, even if it\'s late. Can we talk about it?',
        promise: 'I\'ll have the uncomfortable conversation instead of vanishing. People deserve closure, even when the conversation is hard.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Role-Play Scenarios (AI-powered 1-on-1 practice) ──
  // Student practices resolving a conflict with an AI character
  // ══════════════════════════════════════════════════════════════
  var ROLEPLAY_SCENARIOS = {
    elementary: [
      { id: 'rp1', band: 'elementary', title: 'The Playground Swing',
        desc: 'You\'ve been waiting for the swing and someone jumps on it right before your turn.',
        character: { name: 'Jordan', emoji: '😤', personality: 'Impatient and defensive, but fair deep down. Responds well to kindness.', openingLine: 'I got here first! You were too slow. It\'s MY turn now.' },
        initialRapport: 25, resolveThreshold: 70 },
      { id: 'rp2', band: 'elementary', title: 'The Missing Lunch',
        desc: 'Your lunchbox snack is missing. You see the kid next to you eating the same kind of snack.',
        character: { name: 'Alex', emoji: '😟', personality: 'Nervous and easily upset. Gets defensive when accused. Brought their own snack from home.', openingLine: 'Why are you looking at me like that? This is MY snack. My mom packed it!' },
        initialRapport: 30, resolveThreshold: 65 },
      { id: 'rp3', band: 'elementary', title: 'The Project Partner',
        desc: 'Your partner in a group project isn\'t doing any work and you\'re frustrated.',
        character: { name: 'Sam', emoji: '😔', personality: 'Quiet and shy. Actually confused about what to do but too embarrassed to ask for help.', openingLine: 'I... I don\'t know what you want me to do. Everyone\'s already doing stuff and I just...' },
        initialRapport: 40, resolveThreshold: 65 },
      { id: 'rp4', band: 'elementary', title: 'The Game Rules',
        desc: 'During a recess game, someone keeps changing the rules so their team always wins.',
        character: { name: 'Casey', emoji: '😠', personality: 'Competitive and bossy. Wants to win but also wants friends. Responds to fairness arguments.', openingLine: 'Those ARE the rules! I should know, I made up this game! If you don\'t like it, go play something else!' },
        initialRapport: 20, resolveThreshold: 70 }
    ],
    middle: [
      { id: 'rp5', band: 'middle', title: 'The Social Media Rumor',
        desc: 'Someone posted something untrue about you in a group chat. You\'re confronting them.',
        character: { name: 'Riley', emoji: '😒', personality: 'Sarcastic and image-conscious. Posted it to be funny, didn\'t think about consequences. Feels embarrassed when called out.', openingLine: 'Relax, it was just a joke. Everyone knew it wasn\'t real. You\'re being so dramatic about this.' },
        initialRapport: 20, resolveThreshold: 70 },
      { id: 'rp6', band: 'middle', title: 'The Group Exclusion',
        desc: 'Your friend group went to the movies without inviting you. You\'re talking to one of them about it.',
        character: { name: 'Morgan', emoji: '😬', personality: 'Feels guilty but defensive. Didn\'t organize it but didn\'t speak up either. Cares about the friendship.', openingLine: 'Look, I didn\'t plan it. Someone just texted and we all went. It wasn\'t like we were trying to leave you out...' },
        initialRapport: 35, resolveThreshold: 65 },
      { id: 'rp7', band: 'middle', title: 'The Borrowed-and-Broken',
        desc: 'You lent a friend your favorite book and they returned it damaged. They\'re minimizing it.',
        character: { name: 'Taylor', emoji: '🙄', personality: 'Dismissive at first but genuinely didn\'t mean to damage it. Responds to calm, clear communication about why it matters.', openingLine: 'It\'s just a little bent, it\'s not like I ripped it in half. You can still read it. Why are you making this a huge deal?' },
        initialRapport: 30, resolveThreshold: 70 }
    ],
    high: [
      { id: 'rp8', band: 'high', title: 'The Credit Dispute',
        desc: 'Your project partner presented your research as their own idea in front of the class. You\'re confronting them after.',
        character: { name: 'Cameron', emoji: '😤', personality: 'Ambitious and stressed about grades. Genuinely thought they contributed equally. Defensive about being called a cheater.', openingLine: 'Okay, I used your research, but I built the whole presentation. We\'re a TEAM. I didn\'t steal anything.' },
        initialRapport: 20, resolveThreshold: 75 },
      { id: 'rp9', band: 'high', title: 'The Scheduling Clash',
        desc: 'Your coworker keeps scheduling shifts that conflict with your commitments, then acts like you\'re the problem.',
        character: { name: 'Avery', emoji: '😑', personality: 'Stressed about their own schedule. Doesn\'t realize the impact. Responds to collaborative problem-solving over accusations.', openingLine: 'Look, I have classes too. I can\'t always work around YOUR schedule. We all have to make sacrifices here.' },
        initialRapport: 30, resolveThreshold: 70 },
      { id: 'rp10', band: 'high', title: 'The Loyalty Test',
        desc: 'Your best friend is angry because you\'re spending time with someone they don\'t like.',
        character: { name: 'Quinn', emoji: '😢', personality: 'Deeply insecure underneath the anger. Afraid of losing the friendship. Responds to reassurance and honesty.', openingLine: 'I just don\'t get why you want to hang out with THEM. After what they did to me? It feels like you\'re choosing them over me.' },
        initialRapport: 35, resolveThreshold: 65 },
      { id: 'rp11', band: 'high', title: 'The Team Leader Clash',
        desc: 'You and another student both want to lead the team project. The tension is affecting the whole group.',
        character: { name: 'Drew', emoji: '💪', personality: 'Natural leader, strong opinions. Respects competence and good ideas. Will collaborate if treated as an equal, not a rival.', openingLine: 'No offense, but I\'ve led three projects this semester. I know what I\'m doing. Why don\'t you just handle the research part?' },
        initialRapport: 25, resolveThreshold: 75 }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Mediation Scenarios (AI-powered 2-party mediation) ──
  // Student mediates between 2 AI characters in conflict
  // ══════════════════════════════════════════════════════════════
  var MEDIATION_SCENARIOS = {
    elementary: [
      { id: 'med1', band: 'elementary', title: 'The Art Table War',
        desc: 'Two classmates both want to use the same art supplies, and they\'ve stopped sharing.',
        charA: { name: 'Mia', emoji: '🎨', personality: 'Creative and passionate about art. Feels like the other person is ruining her project.', position: 'I was using the markers first! She keeps grabbing them without asking!' },
        charB: { name: 'Leo', emoji: '✏️', personality: 'Quiet but stubborn. Thinks sharing means equal access at all times.', position: 'There\'s no rule that says she gets ALL the markers. I need them too. She\'s being selfish.' },
        initialHarmony: 25, resolveThreshold: 75 },
      { id: 'med2', band: 'elementary', title: 'The Recess Rivalry',
        desc: 'Two friends both want to be team captain and are arguing in front of everyone.',
        charA: { name: 'Kai', emoji: '⚽', personality: 'Loud and enthusiastic. Good at sports but not great at sharing leadership.', position: 'I\'m always captain! Everyone picks me! Why are they suddenly trying to take over?' },
        charB: { name: 'Zara', emoji: '🏀', personality: 'Athletic and fair-minded. Tired of the same person always being in charge.', position: 'It\'s not fair that Kai is ALWAYS captain. Other people should get a turn too. I\'m good at sports too!' },
        initialHarmony: 30, resolveThreshold: 70 },
      { id: 'med3', band: 'elementary', title: 'The Lunch Table Trouble',
        desc: 'Two kids are arguing because one saved a seat but the other sat there.',
        charA: { name: 'Eli', emoji: '😠', personality: 'Loyal and protective of routines. Saved the seat for a specific friend.', position: 'I put my lunchbox there to save it! That\'s the rule! You can\'t just move it and sit down!' },
        charB: { name: 'Noor', emoji: '😢', personality: 'New to the school. Just wants to sit with people and feel included.', position: 'I didn\'t see any lunchbox. I just wanted to sit somewhere. Nobody ever lets me sit with them...' },
        initialHarmony: 30, resolveThreshold: 65 }
    ],
    middle: [
      { id: 'med4', band: 'middle', title: 'The Friend Triangle',
        desc: 'Two friends are fighting because one feels replaced by a new friendship.',
        charA: { name: 'Jade', emoji: '💔', personality: 'Possessive of friendships. Scared of being abandoned. Acts angry but feels hurt.', position: 'We were best friends for THREE years and now she barely talks to me. She\'d rather hang out with her new cool friends.' },
        charB: { name: 'Priya', emoji: '😣', personality: 'Growing and changing. Still cares about old friendships but wants space to make new ones.', position: 'I\'m not replacing her! I\'m just making new friends. She wants to control who I hang out with and it\'s suffocating.' },
        initialHarmony: 20, resolveThreshold: 70 },
      { id: 'med5', band: 'middle', title: 'The Project Power Struggle',
        desc: 'Two students in a group project have completely different visions and neither will compromise.',
        charA: { name: 'Marcus', emoji: '📊', personality: 'Organized and data-driven. Values structure and planning. Frustrated by what he sees as chaos.', position: 'We need to follow the rubric point by point. Her "creative" approach is going to tank our grade. This isn\'t art class.' },
        charB: { name: 'Luna', emoji: '🎭', personality: 'Creative and big-picture thinker. Values originality. Feels stifled by rigid planning.', position: 'His way is SO boring. The teacher said be creative! Nobody wants to see another basic PowerPoint with bullet points.' },
        initialHarmony: 25, resolveThreshold: 70 },
      { id: 'med6', band: 'middle', title: 'The Screenshot Betrayal',
        desc: 'One friend screenshotted a private conversation and shared it. Trust is broken.',
        charA: { name: 'Bea', emoji: '😡', personality: 'Feels deeply betrayed. Trusted this person with vulnerable information. Wants accountability.', position: 'She PROMISED that conversation was private. I told her things I\'ve never told anyone. And she sent screenshots to people!' },
        charB: { name: 'Chloe', emoji: '😰', personality: 'Panicked and regretful. Shared it in a moment of gossip. Knows it was wrong but defensive.', position: 'I only sent it to ONE person and I told them not to share it! I know I messed up but she\'s acting like I\'m the worst person alive.' },
        initialHarmony: 15, resolveThreshold: 70 }
    ],
    high: [
      { id: 'med7', band: 'high', title: 'The Academic Integrity Clash',
        desc: 'Two lab partners disagree about whether sharing notes crosses the line into academic dishonesty.',
        charA: { name: 'Ethan', emoji: '📝', personality: 'Rule-follower and anxious about consequences. Fears being implicated in cheating.', position: 'We can\'t share our lab write-ups, period. If they find similar wording, we BOTH get zeros. I\'m not risking my GPA for this.' },
        charB: { name: 'Aisha', emoji: '🤝', personality: 'Collaborative learner. Sees academic work as communal. Doesn\'t understand rigid boundaries.', position: 'Collaboration is how learning works! We did the experiment TOGETHER. Why should we pretend we came to different conclusions?' },
        initialHarmony: 30, resolveThreshold: 70 },
      { id: 'med8', band: 'high', title: 'The Identity Tension',
        desc: 'Two friends from different backgrounds said things that hurt each other. Cultural misunderstandings have piled up.',
        charA: { name: 'Deshawn', emoji: '🙁', personality: 'Thoughtful but exhausted from educating people. Recent comments felt like microaggressions.', position: 'Every time I bring up how something feels, they say I\'m overreacting. I\'m tired of having to explain why comments about my hair or music taste are actually about race.' },
        charB: { name: 'Liam', emoji: '😔', personality: 'Well-meaning but unaware. Genuinely confused about what he did wrong. Wants to learn but feels attacked.', position: 'I genuinely didn\'t mean anything by it. But every conversation feels like a minefield now. I\'m afraid to say anything at all.' },
        initialHarmony: 20, resolveThreshold: 75 },
      { id: 'med9', band: 'high', title: 'The Relationship Boundary',
        desc: 'Two friends are in conflict because one started dating the other\'s ex. Trust and loyalty feel broken.',
        charA: { name: 'Skylar', emoji: '💔', personality: 'Feels betrayed by the unwritten rules of friendship. The breakup was still fresh.', position: 'I can\'t believe they\'re dating my ex. We broke up TWO WEEKS ago. There are billions of people and they picked the ONE person they knew would hurt me?' },
        charB: { name: 'Raven', emoji: '😥', personality: 'Caught between genuine feelings and friendship loyalty. Didn\'t plan for this to happen.', position: 'Feelings aren\'t something you can control. I didn\'t plan this. I tried to fight it. But am I supposed to be miserable to make them comfortable?' },
        initialHarmony: 15, resolveThreshold: 75 }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_conflict',   icon: '\uD83C\uDFAD', name: 'Conflict Navigator',    desc: 'Complete your first conflict scenario' },
    { id: 'conflict_5',       icon: '\uD83E\uDD1D', name: 'Peacemaker',            desc: 'Complete 5 conflict scenarios' },
    { id: 'assertive_streak', icon: '\uD83D\uDCAA', name: 'Assertive Communicator',desc: 'Choose the assertive option 3 times in a row' },
    { id: 'first_istatement', icon: '\uD83D\uDDE3\uFE0F', name: 'I-Statement Pro', desc: 'Complete your first I-statement conversion' },
    { id: 'istatement_5',     icon: '\uD83C\uDFAF', name: 'Communication Master',  desc: 'Complete 5 I-statement conversions' },
    { id: 'first_deescalate', icon: '\u270B',        name: 'Cool Head',             desc: 'Study your first de-escalation technique' },
    { id: 'deescalate_all',   icon: '\u2744\uFE0F',  name: 'De-Escalation Expert',  desc: 'Study all techniques in your grade band' },
    { id: 'first_repair',     icon: '\uD83D\uDC9A', name: 'Bridge Builder',        desc: 'Complete your first repair scenario' },
    { id: 'repair_3',         icon: '\u2764\uFE0F\u200D\uD83E\uDE79', name: 'Healer', desc: 'Complete 3 repair scenarios' },
    { id: 'ai_mediator',      icon: '\u2728',        name: 'Mediation Seeker',      desc: 'Use the AI mediator' },
    { id: 'style_quiz',       icon: '\uD83E\uDDE9', name: 'Self-Aware',            desc: 'Complete the conflict styles quiz' },
    { id: 'style_collab',     icon: '\uD83C\uDF1F', name: 'Collaborator',          desc: 'Score highest in Collaborating style' },
    { id: 'first_apology',    icon: '\uD83D\uDC8C', name: 'Brave Apologizer',      desc: 'Complete your first structured apology' },
    { id: 'apology_3',        icon: '\uD83D\uDC96', name: 'Repair Artist',         desc: 'Complete 3 structured apologies' },
    { id: 'first_cooldown',   icon: '\uD83E\uDDD8', name: 'Cool & Collected',      desc: 'Use a cool-down exercise' },
    { id: 'conflict_10',     icon: '\uD83C\uDFAF', name: 'Conflict Veteran',      desc: 'Complete 10 conflict scenarios' },
    { id: 'istatement_10',   icon: '\uD83D\uDCAC', name: 'Voice of Reason',       desc: 'Complete 10 I-statement conversions' },
    { id: 'total_10',         icon: '\uD83C\uDFC6', name: 'Resolution Master',     desc: 'Complete 10 activities across all tabs' },
    { id: 'total_20',         icon: '\uD83D\uDC8E', name: 'Conflict Sage',         desc: 'Complete 20 activities across all tabs' },
    { id: 'streak_3',         icon: '\uD83D\uDD25', name: 'Practice Streak',       desc: 'Practice 3 days in a row' },
    { id: 'first_roleplay',   icon: '\uD83C\uDFAD', name: 'Role-Player',           desc: 'Complete your first role-play conversation' },
    { id: 'roleplay_5',       icon: '\uD83C\uDF1F', name: 'Conversation Pro',      desc: 'Complete 5 role-play conversations' },
    { id: 'roleplay_resolved',icon: '\uD83C\uDF89', name: 'Peace Maker',           desc: 'Reach resolution in a role-play' },
    { id: 'first_mediation2', icon: '\u2696\uFE0F', name: 'First Mediator',        desc: 'Complete your first AI mediation session' },
    { id: 'mediation_harmony',icon: '\uD83D\uDD4A\uFE0F', name: 'Harmony Builder', desc: 'Reach harmony > 80 in mediation' },
    { id: 'mediation_5',      icon: '\uD83E\uDD1D', name: 'Master Mediator',       desc: 'Complete 5 mediation sessions' },
    { id: 'roleplay_streak',  icon: '\u26A1',        name: 'Resolution Streak',     desc: 'Resolve 3 scenarios in a row' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('conflict', {
    icon: '\uD83E\uDD1D',
    label: 'Conflict Resolution Lab',
    desc: 'Practice resolving conflicts with branching scenarios, I-statements, de-escalation techniques, and repair strategies.',
    color: 'emerald',
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
      var band = ctx.gradeBand || 'elementary';

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.conflict) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('conflict', key); }
        else { if (ctx.update) ctx.update('conflict', key, val); }
      };

      // Navigation
      var activeTab     = d.activeTab || 'theater';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Conflict Theater state
      var cfIdx          = d.cfIdx || 0;
      var cfChoice       = d.cfChoice != null ? d.cfChoice : null;
      var cfCompleted    = d.cfCompleted || 0;
      var cfAssertive    = d.cfAssertive || 0; // assertive streak

      // I-Statement state
      var isIdx          = d.isIdx || 0;
      var isFeeling      = d.isFeeling || '';
      var isBecause      = d.isBecause || '';
      var isNeed         = d.isNeed || '';
      var isRevealed     = d.isRevealed || false;
      var isCompleted    = d.isCompleted || 0;

      // De-Escalation state
      var deIdx          = d.deIdx || 0;
      var deRevealed     = d.deRevealed || false;
      var deViewed       = d.deViewed || 0;

      // Repair state
      var rpIdx          = d.rpIdx || 0;
      var rpReflection   = d.rpReflection || '';
      var rpSaved        = d.rpSaved || false;
      var rpCompleted    = d.rpCompleted || 0;

      // AI Mediator state
      var medPrompt      = d.medPrompt || '';
      var medResponse    = d.medResponse || null;
      var medLoading     = d.medLoading || false;

      // Conflict Styles Quiz state
      var sqIdx          = d.sqIdx || 0;
      var sqAnswers      = d.sqAnswers || {};
      var sqDone         = d.sqDone || false;

      // Cool-Down Corner state
      var cdMode         = d.cdMode || 'menu';
      var cdBreathPhase  = d.cdBreathPhase || 0;
      var cdGroundStep   = d.cdGroundStep || 0;
      var cdUsed         = d.cdUsed || false;

      // Apology Workshop state
      var apIdx          = d.apIdx || 0;
      var apAcknowledge  = d.apAcknowledge || '';
      var apResponsibility = d.apResponsibility || '';
      var apEmpathy      = d.apEmpathy || '';
      var apRepair       = d.apRepair || '';
      var apPromise      = d.apPromise || '';
      var apRevealed     = d.apRevealed || false;
      var apCompleted    = d.apCompleted || 0;

      // Role-Play state (Practice Mode)
      var rpModeRP       = d.rpModeRP || null; // null | 'practice' | 'mediation'
      var rpSubMode      = d.rpSubMode || null; // null | 'select' | 'chat' | 'resolved'
      var rpScenarioIdx  = d.rpScenarioIdx || 0;
      var rpChatHistory  = d.rpChatHistory || [];
      var rpRapport      = d.rpRapport != null ? d.rpRapport : 50;
      var rpTurnCount    = d.rpTurnCount || 0;
      var rpLoadingRP    = d.rpLoadingRP || false;
      var rpHintUsed     = d.rpHintUsed || false;
      var rpPracticeCompleted = d.rpPracticeCompleted || 0;
      var rpResolveStreak = d.rpResolveStreak || 0;
      var rpInputText    = d.rpInputText || '';

      // Role-Play state (Mediation Mode)
      var medScenarioIdx = d.medScenarioIdx || 0;
      var medChatHistory2 = d.medChatHistory2 || [];
      var medHarmony     = d.medHarmony != null ? d.medHarmony : 30;
      var medTurnCount   = d.medTurnCount || 0;
      var medLoadingRP   = d.medLoadingRP || false;
      var medInputText   = d.medInputText || '';
      var medMediationCompleted = d.medMediationCompleted || 0;

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
        var totalActivities = cfCompleted + isCompleted + deViewed + rpCompleted + apCompleted;
        if (totalActivities + 1 >= 10) tryAwardBadge('total_10');
        if (totalActivities + 1 >= 20) tryAwardBadge('total_20');
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

      var ACCENT = '#10b981';
      var ACCENT_DIM = '#10b98122';
      var ACCENT_MED = '#10b98144';

      // ══════════════════════════════════════════════════════════
      // ── Tab Bar ──
      // ══════════════════════════════════════════════════════════
      var tabs = [
        { id: 'theater',  label: '\uD83C\uDFAD Conflict Theater' },
        { id: 'istate',   label: '\uD83D\uDDE3\uFE0F I-Statements' },
        { id: 'deescalate', label: '\u270B De-Escalation' },
        { id: 'repair',   label: '\uD83D\uDC9A Repair' },
        { id: 'styles',   label: '\uD83E\uDDE9 My Style' },
        { id: 'apology',  label: '\uD83D\uDC8C Apology Lab' },
        { id: 'cooldown', label: '\uD83E\uDDD8 Cool Down' },
        { id: 'mediator', label: '\u2728 AI Mediator' },
        { id: 'roleplay', label: '\uD83C\uDFAD Role-Play' },
        { id: 'progress', label: '\uD83D\uDCCA Progress' }
      ];

      var tabBar = h('div', {         role: 'tablist', 'aria-label': 'Conflict Resolution tabs',
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

      // ── Badge Popup ──
      var badgePopup = null;
      if (showBadgePopup) {
        var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
        if (popBadge) {
          badgePopup = h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Badge earned: ' + popBadge.name, style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)' }, onClick: function() { upd('showBadgePopup', null); } },
            h('div', { onClick: function(e) { e.stopPropagation(); }, style: { position: 'relative', background: '#1e293b', border: '2px solid ' + ACCENT, borderRadius: 20, padding: '32px 40px', textAlign: 'center', maxWidth: 300 } },
              h('button', { 'aria-label': 'Close', onClick: function() { upd('showBadgePopup', null); }, style: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, background: '#334155', color: '#cbd5e1', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '×'),
              h('div', { style: { fontSize: 56, marginBottom: 10 }, 'aria-hidden': 'true' }, popBadge.icon),
              h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 } }, popBadge.name),
              h('div', { style: { fontSize: 12, color: '#94a3b8' } }, popBadge.desc)
            )
          );
        }
      }
      if (showBadgesPanel) {
        badgePopup = h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Badges panel', style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, background: 'rgba(0,0,0,0.5)' }, onClick: function() { upd('showBadgesPanel', false); } },
          h('div', { onClick: function(e) { e.stopPropagation(); }, style: { position: 'relative', background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, maxHeight: '70vh', overflow: 'auto' } },
            h('button', { 'aria-label': 'Close badges panel', onClick: function() { upd('showBadgesPanel', false); }, style: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, background: '#334155', color: '#cbd5e1', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '×'),
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
      // ── TAB: Conflict Theater ──
      // Branching dialogue scenarios
      // ══════════════════════════════════════════════════════════
      var cfContent = null;
      if (activeTab === 'theater') {
        var cfScenarios = CONFLICT_SCENARIOS[band] || CONFLICT_SCENARIOS.elementary;
        var curCf = cfScenarios[cfIdx % cfScenarios.length];
        var styleColors = { aggressive: '#ef4444', passive: '#f59e0b', assertive: '#22c55e' };
        var styleLabels = { aggressive: 'Aggressive', passive: 'Passive', assertive: 'Assertive' };

        cfContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFAD Conflict Theater'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Read the scenario, choose a response, and see what happens.'),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Scenario ' + ((cfIdx % cfScenarios.length) + 1) + ' of ' + cfScenarios.length + (cfCompleted > 0 ? ' \u00B7 ' + cfCompleted + ' completed' : '')
          ),
          // Scenario card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 15, marginBottom: 8, fontWeight: 700 } }, curCf.title),
            h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
              h('span', { style: { fontSize: 10, background: '#1e293b', padding: '3px 8px', borderRadius: 6, color: '#94a3b8' } }, '\uD83D\uDC64 ' + curCf.personA),
              h('span', { style: { fontSize: 10, color: '#94a3b8' } }, 'vs'),
              h('span', { style: { fontSize: 10, background: '#1e293b', padding: '3px 8px', borderRadius: 6, color: '#94a3b8' } }, '\uD83D\uDC64 ' + curCf.personB)
            ),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7 } }, curCf.setup)
          ),
          // Response choices
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } },
            curCf.branches.map(function(br, i) {
              var isChosen = cfChoice === i;
              var showResult = isChosen;
              return h('div', { key: i },
                h('button', { 'aria-label': br.label,
                  onClick: function() {
                    upd('cfChoice', i);
                    if (soundEnabled) { if (br.style === 'assertive') sfxCorrect(); else if (br.style === 'aggressive') sfxWrong(); else sfxClick(); }
                  },
                  style: {
                    width: '100%', padding: '12px 16px', borderRadius: 10, border: '2px solid ' + (isChosen ? styleColors[br.style] : '#334155'),
                    background: isChosen ? styleColors[br.style] + '15' : '#1e293b', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', textAlign: 'left'
                  }
                }, br.label),
                showResult && h('div', { style: { margin: '8px 0 0 16px', padding: 12, borderRadius: 10, borderLeft: '3px solid ' + styleColors[br.style], background: '#0f172a' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
                    h('span', { style: { fontSize: 10, fontWeight: 700, color: styleColors[br.style], textTransform: 'uppercase', letterSpacing: '0.05em' } }, styleLabels[br.style]),
                    h('span', { style: { color: '#94a3b8' } }, '\u2B50'.repeat(br.rating))
                  ),
                  h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, br.outcome)
                )
              );
            })
          ),
          // Next scenario
          cfChoice != null && h('div', { style: { textAlign: 'center' } },
            h('button', { 'aria-label': 'Next Scenario',
              onClick: function() {
                var newDone = cfCompleted + 1;
                var branch = curCf.branches[cfChoice];
                var newStreak = branch.style === 'assertive' ? cfAssertive + 1 : 0;
                upd({ cfCompleted: newDone, cfAssertive: newStreak, cfIdx: cfIdx + 1, cfChoice: null });
                logPractice('conflict', curCf.id);
                awardXP(15);
                tryAwardBadge('first_conflict');
                if (newDone >= 5) tryAwardBadge('conflict_5');
                if (newDone >= 10) tryAwardBadge('conflict_10');
                if (newStreak >= 3) tryAwardBadge('assertive_streak');
                if (soundEnabled) sfxResolve();
                ctx.announceToSR && ctx.announceToSR('Next conflict scenario loaded');
              },
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Scenario \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: I-Statement Builder ──
      // ══════════════════════════════════════════════════════════
      var isContent = null;
      if (activeTab === 'istate') {
        var isPrompts = I_STATEMENT_PROMPTS[band] || I_STATEMENT_PROMPTS.elementary;
        var curIs = isPrompts[isIdx % isPrompts.length];

        isContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDDE3\uFE0F I-Statement Builder'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Convert "YOU" attacks into "I" statements that communicate without escalating.'),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Prompt ' + ((isIdx % isPrompts.length) + 1) + ' of ' + isPrompts.length + (isCompleted > 0 ? ' \u00B7 ' + isCompleted + ' completed' : '')
          ),
          // Situation
          h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 12 } },
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 10 } }, curIs.situation),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#ef444415', border: '1px solid #ef444433' } },
              h('p', { style: { fontSize: 10, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, fontWeight: 700 } }, '"You" statement'),
              h('p', { style: { fontSize: 13, color: '#fca5a5', fontStyle: 'italic' } }, curIs.youStatement)
            )
          ),
          // Build the I-statement
          h('div', { style: { padding: 16, borderRadius: 14, background: '#22c55e08', border: '1px solid #22c55e33', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 700 } }, 'Build your I-Statement'),
            h('div', { style: { marginBottom: 10 } },
              h('label', { style: { display: 'block', fontSize: 12, color: '#e2e8f0', marginBottom: 4, fontWeight: 600 } }, 'I feel...'),
              h('input', { type: 'text', value: isFeeling, 'aria-label': 'I feel...', onChange: function(e) { upd('isFeeling', e.target.value); }, placeholder: 'Name the feeling (frustrated, hurt, scared...)', style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' } })
            ),
            h('div', { style: { marginBottom: 10 } },
              h('label', { style: { display: 'block', fontSize: 12, color: '#e2e8f0', marginBottom: 4, fontWeight: 600 } }, 'Because...'),
              h('input', { type: 'text', value: isBecause, 'aria-label': 'Because...', onChange: function(e) { upd('isBecause', e.target.value); }, placeholder: 'What happened that caused the feeling?', style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' } })
            ),
            h('div', null,
              h('label', { style: { display: 'block', fontSize: 12, color: '#e2e8f0', marginBottom: 4, fontWeight: 600 } }, 'I need...'),
              h('input', { type: 'text', value: isNeed, 'aria-label': 'I need...', onChange: function(e) { upd('isNeed', e.target.value); }, placeholder: 'What would help? What do you need from them?', style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' } })
            )
          ),
          // Preview
          (isFeeling || isBecause || isNeed) && h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 12 } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'Your I-Statement'),
            h('p', { style: { fontSize: 14, color: '#f1f5f9', lineHeight: 1.6 } },
              '"I feel ' + (isFeeling || '___') + ' because ' + (isBecause || '___') + '. ' + (isNeed || 'I need ___') + '"'
            )
          ),
          // Actions
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 } },
            h('button', { 'aria-label': 'Complete & Next',
              onClick: function() { upd('isRevealed', true); if (soundEnabled) sfxReveal(); },
              disabled: isRevealed,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: isRevealed ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: isRevealed ? 'default' : 'pointer' }
            }, isRevealed ? 'Example shown \u2193' : '\uD83D\uDCA1 Show Example'),
            h('button', { 'aria-label': 'Complete & Next',
              onClick: function() {
                if (!isFeeling.trim()) { addToast('Fill in at least the "I feel" part!', 'info'); return; }
                var newDone = isCompleted + 1;
                upd('isCompleted', newDone);
                logPractice('istatement', curIs.id);
                awardXP(15);
                tryAwardBadge('first_istatement');
                if (newDone >= 5) tryAwardBadge('istatement_5');
                if (newDone >= 10) tryAwardBadge('istatement_10');
                if (soundEnabled) sfxCorrect();
                addToast('I-Statement saved!', 'success');
                upd({ isIdx: isIdx + 1, isFeeling: '', isBecause: '', isNeed: '', isRevealed: false });
                ctx.announceToSR && ctx.announceToSR('Next I-statement prompt loaded');
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, '\u2705 Complete & Next')
          ),
          // Example reveal
          isRevealed && h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #22c55e44' } },
            h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Example I-Statement'),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } },
              '"I feel ' + curIs.iFeeling + ' because ' + curIs.iBecause + '. ' + curIs.iNeed + '"'
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: De-Escalation ──
      // ══════════════════════════════════════════════════════════
      var deContent = null;
      if (activeTab === 'deescalate') {
        var deTechniques = DEESCALATION[band] || DEESCALATION.elementary;
        var curDe = deTechniques[deIdx % deTechniques.length];

        deContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\u270B De-Escalation Toolkit'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Learn techniques to cool down conflicts before they explode.'),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Technique ' + ((deIdx % deTechniques.length) + 1) + ' of ' + deTechniques.length + (deViewed > 0 ? ' \u00B7 ' + deViewed + ' studied' : '')
          ),
          // Technique card (tap to reveal)
          !deRevealed && h('div', { onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
            onClick: function() {
              upd('deRevealed', true);
              var newViewed = deViewed + 1;
              upd('deViewed', newViewed);
              logPractice('deescalate', curDe.id);
              awardXP(10);
              tryAwardBadge('first_deescalate');
              if (newViewed >= deTechniques.length) tryAwardBadge('deescalate_all');
              if (soundEnabled) sfxReveal();
            },
            style: { padding: 30, borderRadius: 14, background: '#0f172a', border: '2px dashed ' + ACCENT_MED, cursor: 'pointer', textAlign: 'center', marginBottom: 16 },
            role: 'button', tabIndex: 0
          },
            h('div', { style: { fontSize: 40, marginBottom: 8 } }, curDe.icon),
            h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 } }, curDe.name),
            h('div', { style: { fontSize: 12, color: '#94a3b8' } }, 'Tap to learn this technique')
          ),
          // Revealed detail
          deRevealed && h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
              h('span', { style: { fontSize: 32 } }, curDe.icon),
              h('span', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' } }, curDe.name)
            ),
            // Steps
            h('div', { style: { marginBottom: 14 } },
              curDe.steps.map(function(step, i) {
                return h('div', { key: i, style: { display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' } },
                  h('div', { style: { width: 24, height: 24, borderRadius: '50%', background: ACCENT_DIM, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 } }, i + 1),
                  h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, margin: 0 } }, step)
                );
              })
            ),
            // When to use
            h('div', { style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155' } },
              h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'When to use this'),
              h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6, fontStyle: 'italic' } }, curDe.when)
            )
          ),
          // Next
          deRevealed && h('div', { style: { textAlign: 'center' } },
            h('button', { 'aria-label': 'Next Technique',
              onClick: function() { upd({ deIdx: deIdx + 1, deRevealed: false }); if (soundEnabled) sfxClick(); ctx.announceToSR && ctx.announceToSR('Next technique loaded'); },
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Technique \u2192')
          ),
          !deRevealed && h('div', { style: { textAlign: 'center', marginTop: 4 } },
            h('button', { 'aria-label': 'Skip', onClick: function() { upd({ deIdx: deIdx + 1, deRevealed: false }); if (soundEnabled) sfxClick(); }, style: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' } }, 'Skip \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Repair & Reconciliation ──
      // ══════════════════════════════════════════════════════════
      var rpContent = null;
      if (activeTab === 'repair') {
        var rpPrompts = REPAIR_PROMPTS[band] || REPAIR_PROMPTS.elementary;
        var curRp = rpPrompts[rpIdx % rpPrompts.length];

        rpContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDC9A Repair & Reconciliation'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Learn how to heal relationships after conflict.'),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Scenario ' + ((rpIdx % rpPrompts.length) + 1) + ' of ' + rpPrompts.length + (rpCompleted > 0 ? ' \u00B7 ' + rpCompleted + ' completed' : '')
          ),
          // Situation
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 15, marginBottom: 8, fontWeight: 700 } }, curRp.title),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 14 } }, curRp.situation),
            // Steps
            h('div', { style: { marginBottom: 14 } },
              h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Steps to Repair'),
              curRp.steps.map(function(step, i) {
                return h('div', { key: i, style: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' } },
                  h('span', { style: { color: '#22c55e', fontWeight: 700, fontSize: 13 } }, (i + 1) + '.'),
                  h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6, margin: 0 } }, step)
                );
              })
            ),
            // Avoid
            h('div', { style: { padding: 10, borderRadius: 8, background: '#ef444415', border: '1px solid #ef444433' } },
              h('p', { style: { fontSize: 10, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, fontWeight: 700 } }, '\u26A0\uFE0F Avoid'),
              h('p', { style: { fontSize: 12, color: '#fca5a5', fontStyle: 'italic' } }, curRp.avoid)
            )
          ),
          // Reflection
          h('div', { style: { marginBottom: 16 } },
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 } }, 'Your reflection: How would you apply this in your life?'),
            h('textarea', {
              value: rpReflection, 'aria-label': 'Repair reflection', onChange: function(e) { upd('rpReflection', e.target.value); },
              placeholder: 'Think of a time this approach could have helped...',
              rows: 3,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
            })
          ),
          // Actions
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
            h('button', { 'aria-label': 'Next',
              onClick: function() {
                var newDone = rpCompleted + 1;
                upd({ rpSaved: true, rpCompleted: newDone });
                logPractice('repair', curRp.id);
                awardXP(15);
                tryAwardBadge('first_repair');
                if (newDone >= 3) tryAwardBadge('repair_3');
                if (soundEnabled) sfxResolve();
                addToast('Repair scenario completed!', 'success');
                ctx.announceToSR && ctx.announceToSR('Repair scenario saved');
              },
              disabled: rpSaved,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: rpSaved ? '#22c55e' : ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: rpSaved ? 'default' : 'pointer' }
            }, rpSaved ? '\u2705 Saved!' : '\uD83D\uDCBE Save'),
            rpSaved && h('button', { 'aria-label': 'Next',
              onClick: function() { upd({ rpIdx: rpIdx + 1, rpReflection: '', rpSaved: false }); if (soundEnabled) sfxClick(); },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Conflict Styles Quiz ──
      // ══════════════════════════════════════════════════════════
      var stylesContent = null;
      if (activeTab === 'styles') {
        var sqQuestions = STYLE_QUIZ[band] || STYLE_QUIZ.elementary;
        var sqTotal = sqQuestions.length;
        var sqAnswerCount = Object.keys(sqAnswers).length;
        var quizComplete = sqAnswerCount >= sqTotal;

        // Compute results
        var styleCounts = { competing: 0, avoiding: 0, accommodating: 0, compromising: 0, collaborating: 0 };
        if (quizComplete) {
          Object.keys(sqAnswers).forEach(function(qId) {
            var s = sqAnswers[qId];
            if (styleCounts[s] !== undefined) styleCounts[s]++;
          });
        }
        var maxStyle = 'collaborating';
        var maxCount = 0;
        if (quizComplete) {
          Object.keys(styleCounts).forEach(function(s) {
            if (styleCounts[s] > maxCount) { maxCount = styleCounts[s]; maxStyle = s; }
          });
        }

        stylesContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83E\uDDE9 What\'s Your Conflict Style?'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } }, 'Answer honestly \u2014 there are no wrong answers! Discover how you naturally handle disagreements.'),

          // Quiz in progress
          !quizComplete && !sqDone && h('div', null,
            h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
              'Question ' + (sqAnswerCount + 1) + ' of ' + sqTotal
            ),
            // Progress bar
            h('div', { style: { height: 6, borderRadius: 3, background: '#1e293b', marginBottom: 16 } },
              h('div', { style: { height: '100%', borderRadius: 3, background: ACCENT, width: Math.round((sqAnswerCount / sqTotal) * 100) + '%', transition: 'width 0.3s' } })
            ),
            // Current question
            (function() {
              var unanswered = sqQuestions.filter(function(q) { return !sqAnswers[q.id]; });
              if (unanswered.length === 0) return null;
              var curQ = unanswered[0];
              return h('div', null,
                h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 14 } },
                  h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7 } }, curQ.scenario)
                ),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                  curQ.options.map(function(opt, oi) {
                    var styleColors = { competing: '#ef4444', avoiding: '#94a3b8', accommodating: '#3b82f6', compromising: '#f59e0b', collaborating: '#10b981' };
                    return h('button', { 'aria-label': 'Toggle sound',
                      key: oi,
                      onClick: function() {
                        var newAnswers = Object.assign({}, sqAnswers);
                        newAnswers[curQ.id] = opt.style;
                        upd('sqAnswers', newAnswers);
                        if (soundEnabled) sfxClick();
                        // Check if done
                        if (Object.keys(newAnswers).length >= sqTotal) {
                          upd('sqDone', true);
                          logPractice('styles', 'quiz');
                          awardXP(20);
                          tryAwardBadge('style_quiz');
                          // Check for collaborating top score
                          var counts = { competing: 0, avoiding: 0, accommodating: 0, compromising: 0, collaborating: 0 };
                          Object.keys(newAnswers).forEach(function(k) { counts[newAnswers[k]]++; });
                          var topStyle = 'competing'; var topVal = 0;
                          Object.keys(counts).forEach(function(s) { if (counts[s] > topVal) { topVal = counts[s]; topStyle = s; } });
                          if (topStyle === 'collaborating') tryAwardBadge('style_collab');
                          if (soundEnabled) sfxResolve();
                          celebrate && celebrate();
                        }
                      },
                      style: { padding: '12px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }
                    }, opt.text);
                  })
                )
              );
            })()
          ),

          // Results
          (quizComplete || sqDone) && h('div', null,
            h('div', { style: { textAlign: 'center', marginBottom: 16 } },
              h('div', { style: { fontSize: 40, marginBottom: 4 } }, STYLE_DESCRIPTIONS[maxStyle].icon),
              h('div', { style: { fontSize: 18, fontWeight: 700, color: STYLE_DESCRIPTIONS[maxStyle].color, marginBottom: 4 } }, 'Your Primary Style: ' + STYLE_DESCRIPTIONS[maxStyle].name),
              h('p', { style: { fontSize: 13, color: '#94a3b8', maxWidth: 400, margin: '0 auto' } }, STYLE_DESCRIPTIONS[maxStyle].desc)
            ),
            // Style bars
            h('div', { style: { marginBottom: 20 } },
              ['collaborating', 'compromising', 'accommodating', 'avoiding', 'competing'].map(function(s) {
                var info = STYLE_DESCRIPTIONS[s];
                var pct = sqTotal > 0 ? Math.round((styleCounts[s] / sqTotal) * 100) : 0;
                return h('div', { key: s, style: { marginBottom: 10 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                    h('span', { style: { fontSize: 12, color: '#e2e8f0', fontWeight: 600 } }, info.icon + ' ' + info.name),
                    h('span', { style: { fontSize: 12, color: info.color, fontWeight: 700 } }, pct + '%')
                  ),
                  h('div', { style: { height: 8, borderRadius: 4, background: '#1e293b' } },
                    h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', style: { height: '100%', borderRadius: 4, background: info.color, width: pct + '%', transition: 'width 0.5s' } })
                  )
                );
              })
            ),
            // Style details cards
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 } },
              ['collaborating', 'compromising', 'accommodating', 'avoiding', 'competing'].map(function(s) {
                var info = STYLE_DESCRIPTIONS[s];
                var isTop = s === maxStyle;
                return h('div', { key: s, style: { padding: 14, borderRadius: 12, background: isTop ? info.color + '15' : '#0f172a', border: '1px solid ' + (isTop ? info.color + '66' : '#334155') } },
                  h('div', { style: { fontSize: 13, fontWeight: 700, color: info.color, marginBottom: 4 } }, info.icon + ' ' + info.name + (isTop ? ' \u2B50' : '')),
                  h('div', { style: { fontSize: 11, color: '#22c55e', marginBottom: 2 } }, '\u2714 Strength: ' + info.strength),
                  h('div', { style: { fontSize: 11, color: '#f59e0b' } }, '\u26A0 Watch for: ' + info.watchFor)
                );
              })
            ),
            // Retake
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Retake Quiz',
                onClick: function() { upd({ sqAnswers: {}, sqDone: false, sqIdx: 0 }); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\uD83D\uDD04 Retake Quiz')
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Apology Workshop ──
      // ══════════════════════════════════════════════════════════
      var apologyContent = null;
      if (activeTab === 'apology') {
        var apScenarios = APOLOGY_SCENARIOS[band] || APOLOGY_SCENARIOS.elementary;
        var curAp = apScenarios[apIdx % apScenarios.length];
        var apParts = [
          { key: 'apAcknowledge', label: 'Acknowledge', prompt: 'What exactly did you do? Name the specific action.', val: apAcknowledge, icon: '\uD83D\uDC41\uFE0F', color: '#ef4444' },
          { key: 'apResponsibility', label: 'Take Responsibility', prompt: 'Own it. No "but" or "if" \u2014 just responsibility.', val: apResponsibility, icon: '\u270B', color: '#f59e0b' },
          { key: 'apEmpathy', label: 'Show Empathy', prompt: 'How did your action make THEM feel? (Not how YOU feel about it.)', val: apEmpathy, icon: '\u2764\uFE0F', color: '#ec4899' },
          { key: 'apRepair', label: 'Offer Repair', prompt: 'What specific action will you take to make it right?', val: apRepair, icon: '\uD83D\uDD27', color: '#3b82f6' },
          { key: 'apPromise', label: 'Promise Change', prompt: 'What will you do differently next time?', val: apPromise, icon: '\uD83C\uDF1F', color: '#10b981' }
        ];

        apologyContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDC8C Apology Workshop'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Learn the 5 parts of a real apology \u2014 not just "sorry."'),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Scenario ' + ((apIdx % apScenarios.length) + 1) + ' of ' + apScenarios.length + (apCompleted > 0 ? ' \u00B7 ' + apCompleted + ' completed' : '')
          ),
          // Scenario card
          h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 15, marginBottom: 8, fontWeight: 700 } }, curAp.title),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, curAp.situation)
          ),
          // 5-part apology builder
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 } },
            apParts.map(function(part, pi) {
              return h('div', { key: pi, style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid ' + part.color + '33' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('div', { style: { width: 24, height: 24, borderRadius: '50%', background: part.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 } }, part.icon),
                  h('span', { style: { fontSize: 12, fontWeight: 700, color: part.color } }, (pi + 1) + '. ' + part.label)
                ),
                h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic' } }, part.prompt),
                h('textarea', {
                  value: part.val,
                  'aria-label': part.label + ' apology section',
                  onChange: function(e) { upd(part.key, e.target.value); },
                  placeholder: band === 'elementary' ? 'Write your words here...' : 'Write your response...',
                  rows: 2,
                  style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
                })
              );
            })
          ),
          // Full apology preview
          (apAcknowledge || apResponsibility || apEmpathy) && h('div', { style: { padding: 14, borderRadius: 12, background: '#22c55e08', border: '1px solid #22c55e33', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, 'Your Full Apology'),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8 } },
              (apAcknowledge ? apAcknowledge + ' ' : '') +
              (apResponsibility ? apResponsibility + ' ' : '') +
              (apEmpathy ? apEmpathy + ' ' : '') +
              (apRepair ? apRepair + ' ' : '') +
              (apPromise || '')
            )
          ),
          // Actions
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 } },
            h('button', { 'aria-label': 'Complete & Next',
              onClick: function() { upd('apRevealed', true); if (soundEnabled) sfxReveal(); },
              disabled: apRevealed,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: apRevealed ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: apRevealed ? 'default' : 'pointer' }
            }, apRevealed ? 'Example shown \u2193' : '\uD83D\uDCA1 Show Example'),
            h('button', { 'aria-label': 'Complete & Next',
              onClick: function() {
                if (!apAcknowledge.trim() || !apResponsibility.trim()) { addToast('Fill in at least Acknowledge and Responsibility!', 'info'); return; }
                var newDone = apCompleted + 1;
                upd('apCompleted', newDone);
                logPractice('apology', curAp.id);
                awardXP(20);
                tryAwardBadge('first_apology');
                if (newDone >= 3) tryAwardBadge('apology_3');
                if (soundEnabled) sfxResolve();
                addToast('Apology completed! Well done.', 'success');
                upd({ apIdx: apIdx + 1, apAcknowledge: '', apResponsibility: '', apEmpathy: '', apRepair: '', apPromise: '', apRevealed: false });
                ctx.announceToSR && ctx.announceToSR('Next apology scenario loaded');
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, '\u2705 Complete & Next')
          ),
          // Example reveal
          apRevealed && h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid ' + ACCENT_MED } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 700 } }, 'Example Apology'),
            [
              { label: '1. Acknowledge', text: curAp.acknowledge, color: '#ef4444' },
              { label: '2. Responsibility', text: curAp.responsibility, color: '#f59e0b' },
              { label: '3. Empathy', text: curAp.empathy, color: '#ec4899' },
              { label: '4. Repair', text: curAp.repair, color: '#3b82f6' },
              { label: '5. Promise', text: curAp.promise, color: '#10b981' }
            ].map(function(ex, ei) {
              return h('div', { key: ei, style: { marginBottom: 8 } },
                h('span', { style: { fontSize: 10, fontWeight: 700, color: ex.color, marginRight: 6 } }, ex.label + ':'),
                h('span', { style: { fontSize: 12, color: '#e2e8f0' } }, '"' + ex.text + '"')
              );
            })
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Cool-Down Corner ──
      // Interactive calming exercises for mid-conflict regulation
      // ══════════════════════════════════════════════════════════
      var cooldownContent = null;
      if (activeTab === 'cooldown') {
        var breathSteps = [
          { label: 'Breathe In', seconds: 4, color: '#3b82f6' },
          { label: 'Hold', seconds: 7, color: '#8b5cf6' },
          { label: 'Breathe Out', seconds: 8, color: '#10b981' }
        ];
        var groundSenses = [
          { count: 5, sense: 'SEE', prompt: band === 'elementary' ? 'Look around. Name 5 things you can see right now.' : 'Name 5 things you can see. Focus on details \u2014 colors, textures, shapes.', icon: '\uD83D\uDC41\uFE0F', color: '#3b82f6' },
          { count: 4, sense: 'TOUCH', prompt: band === 'elementary' ? 'Touch 4 things near you. How do they feel?' : 'Touch 4 different textures. Focus on the sensation \u2014 smooth, rough, warm, cool.', icon: '\u270B', color: '#10b981' },
          { count: 3, sense: 'HEAR', prompt: band === 'elementary' ? 'Close your eyes. What 3 sounds do you hear?' : 'Listen carefully. Identify 3 distinct sounds \u2014 near and far.', icon: '\uD83D\uDC42', color: '#f59e0b' },
          { count: 2, sense: 'SMELL', prompt: band === 'elementary' ? 'Sniff! Can you smell 2 things?' : 'Notice 2 scents. Even subtle ones \u2014 your clothes, the air, the room.', icon: '\uD83D\uDC43', color: '#ec4899' },
          { count: 1, sense: 'TASTE', prompt: band === 'elementary' ? 'What 1 thing can you taste right now?' : 'Notice 1 taste. Even the taste of your own mouth. You\'re here. You\'re present.', icon: '\uD83D\uDC45', color: '#ef4444' }
        ];
        var affirmations = band === 'elementary'
          ? ['I am safe right now.', 'I can handle this.', 'It\'s okay to feel upset.', 'I can choose what to do next.', 'My feelings are real, but they will pass.', 'I am enough exactly as I am.', 'I can ask for help.', 'Taking a break is smart, not weak.']
          : band === 'middle'
          ? ['This feeling is temporary. I am not my worst moment.', 'I can be angry and still make good choices.', 'I don\'t have to solve this right now.', 'My worth isn\'t defined by this conflict.', 'I can disagree and still be kind.', 'It\'s brave to walk away when I need to.', 'I am learning to handle hard things.', 'Needing space is not the same as giving up.']
          : ['I am allowed to set boundaries without guilt.', 'My peace is not negotiable.', 'I can hold space for someone else\'s pain without abandoning my own needs.', 'Conflict is not failure \u2014 it\'s friction between two realities.', 'I don\'t owe anyone my emotional labor when I\'m depleted.', 'Growth is uncomfortable. That doesn\'t mean it\'s wrong.', 'I choose how I respond. Nobody else controls that.', 'Rest is a form of resistance against burnout.'];

        cooldownContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83E\uDDD8 Cool-Down Corner'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } }, band === 'elementary' ? 'Feeling big feelings? These exercises help your body and brain calm down.' : 'Use these when you need to regulate before, during, or after a conflict.'),

          // Menu
          cdMode === 'menu' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            [
              { mode: 'breathe', icon: '\uD83C\uDF2C\uFE0F', title: '4-7-8 Breathing', desc: 'Calm your nervous system with guided breathing' },
              { mode: 'ground', icon: '\uD83C\uDF0D', title: '5-4-3-2-1 Grounding', desc: 'Come back to the present using your senses' },
              { mode: 'affirm', icon: '\uD83D\uDCAB', title: 'Affirmations', desc: 'Remind yourself of what\'s true when emotions lie' },
              { mode: 'scan', icon: '\uD83E\uDEC0', title: 'Body Scan', desc: 'Find and release tension in your body' }
            ].map(function(item) {
              return h('button', { 'aria-label': item.icon,
                key: item.mode,
                onClick: function() {
                  upd('cdMode', item.mode);
                  if (!cdUsed) {
                    upd('cdUsed', true);
                    logPractice('cooldown', item.mode);
                    awardXP(10);
                    tryAwardBadge('first_cooldown');
                  }
                  if (soundEnabled) sfxClick();
                },
                style: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, border: '1px solid #334155', background: '#1e293b', cursor: 'pointer', textAlign: 'left' }
              },
                h('span', { style: { fontSize: 28, flexShrink: 0 } }, item.icon),
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 } }, item.title),
                  h('div', { style: { fontSize: 11, color: '#94a3b8' } }, item.desc)
                )
              );
            })
          ),

          // 4-7-8 Breathing
          cdMode === 'breathe' && h('div', { style: { textAlign: 'center' } },
            h('div', { style: { marginBottom: 20 } },
              h('div', { style: {
                width: 160, height: 160, borderRadius: '50%', margin: '0 auto',
                background: breathSteps[cdBreathPhase % 3].color + '22',
                border: '3px solid ' + breathSteps[cdBreathPhase % 3].color,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.5s',
                transform: cdBreathPhase % 3 === 0 ? 'scale(1.15)' : cdBreathPhase % 3 === 1 ? 'scale(1.15)' : 'scale(0.9)'
              } },
                h('div', { style: { fontSize: 14, fontWeight: 700, color: breathSteps[cdBreathPhase % 3].color, marginBottom: 4 } }, breathSteps[cdBreathPhase % 3].label),
                h('div', { style: { fontSize: 28, fontWeight: 700, color: '#f1f5f9' } }, breathSteps[cdBreathPhase % 3].seconds + 's')
              )
            ),
            h('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 } },
              breathSteps.map(function(bs, i) {
                return h('div', { key: i, style: { padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: cdBreathPhase % 3 === i ? bs.color + '33' : '#0f172a', color: cdBreathPhase % 3 === i ? bs.color : '#94a3b8', border: '1px solid ' + (cdBreathPhase % 3 === i ? bs.color : '#334155') } }, bs.label + ' (' + bs.seconds + 's)');
              })
            ),
            h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 } },
              band === 'elementary'
                ? 'Breathe in through your nose like smelling flowers. Hold it. Breathe out through your mouth like blowing out candles.'
                : 'Inhale through your nose (4s), hold your breath (7s), exhale slowly through your mouth (8s). Repeat 3-4 times.'
            ),
            h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
              h('button', { 'aria-label': 'Next Phase',
                onClick: function() { upd('cdBreathPhase', (cdBreathPhase + 1)); if (soundEnabled) playTone(220 + (cdBreathPhase % 3) * 110, 0.3, 'sine', 0.06); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, 'Next Phase \u2192'),
              h('button', { 'aria-label': 'Back',
                onClick: function() { upd({ cdMode: 'menu', cdBreathPhase: 0 }); },
                style: { padding: '10px 16px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\u2190 Back')
            )
          ),

          // 5-4-3-2-1 Grounding
          cdMode === 'ground' && h('div', null,
            h('div', { style: { textAlign: 'center', marginBottom: 16 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, 'Step ' + (cdGroundStep + 1) + ' of 5'),
              h('div', { style: { height: 6, borderRadius: 3, background: '#1e293b', maxWidth: 200, margin: '0 auto' } },
                h('div', { style: { height: '100%', borderRadius: 3, background: groundSenses[cdGroundStep].color, width: ((cdGroundStep + 1) / 5 * 100) + '%', transition: 'width 0.3s' } })
              )
            ),
            h('div', { style: { padding: 24, borderRadius: 16, background: '#0f172a', border: '2px solid ' + groundSenses[cdGroundStep].color + '66', textAlign: 'center', marginBottom: 16 } },
              h('div', { style: { fontSize: 40, marginBottom: 8 } }, groundSenses[cdGroundStep].icon),
              h('div', { style: { fontSize: 32, fontWeight: 700, color: groundSenses[cdGroundStep].color, marginBottom: 4 } }, groundSenses[cdGroundStep].count),
              h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' } }, 'Things you can ' + groundSenses[cdGroundStep].sense),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } }, groundSenses[cdGroundStep].prompt)
            ),
            h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
              h('button', { 'aria-label': 'Back',
                onClick: function() {
                  if (cdGroundStep < 4) {
                    upd('cdGroundStep', cdGroundStep + 1);
                    if (soundEnabled) sfxReveal();
                  } else {
                    upd({ cdMode: 'menu', cdGroundStep: 0 });
                    addToast('Grounding complete. You\'re here. You\'re present.', 'success');
                    if (soundEnabled) sfxResolve();
                    awardXP(10);
                  }
                },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: cdGroundStep < 4 ? groundSenses[cdGroundStep].color : '#22c55e', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, cdGroundStep < 4 ? 'Next Sense \u2192' : '\u2705 Complete'),
              h('button', { 'aria-label': 'Back',
                onClick: function() { upd({ cdMode: 'menu', cdGroundStep: 0 }); },
                style: { padding: '10px 16px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\u2190 Back')
            )
          ),

          // Affirmations
          cdMode === 'affirm' && h('div', null,
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 } },
              affirmations.map(function(aff, i) {
                return h('div', { key: i, style: { padding: '14px 18px', borderRadius: 12, background: i % 2 === 0 ? '#0f172a' : '#1e293b', border: '1px solid #334155' } },
                  h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, fontStyle: 'italic', margin: 0 } }, '\u201C' + aff + '\u201D')
                );
              })
            ),
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Back',
                onClick: function() { upd('cdMode', 'menu'); },
                style: { padding: '10px 16px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\u2190 Back')
            )
          ),

          // Body Scan
          cdMode === 'scan' && (function() {
            var bodyParts = band === 'elementary'
              ? [
                { part: 'Feet & Toes', prompt: 'Wiggle your toes. Are they scrunched up tight? Let them relax.', icon: '\uD83E\uDDB6' },
                { part: 'Legs', prompt: 'Are your legs tense? Let them feel heavy, like they\'re sinking into the chair.', icon: '\uD83E\uDDB5' },
                { part: 'Belly', prompt: 'Put your hand on your belly. Take a big breath and feel it puff up like a balloon.', icon: '\uD83C\uDF88' },
                { part: 'Hands', prompt: 'Are your fists clenched? Open them up. Spread your fingers wide, then let them relax.', icon: '\u270B' },
                { part: 'Shoulders', prompt: 'Scrunch your shoulders up to your ears, hold for 3 seconds, then drop them down.', icon: '\uD83E\uDDD1' },
                { part: 'Face', prompt: 'Scrunch up your whole face tight like a raisin. Now relax everything. Ahhhh.', icon: '\uD83D\uDE0C' }
              ]
              : [
                { part: 'Feet & Legs', prompt: 'Notice any tension in your feet, calves, or thighs. Consciously release it. Feel the ground beneath you.', icon: '\uD83E\uDDB6' },
                { part: 'Core & Stomach', prompt: 'Stress often lives in the gut. Breathe deeply and let your abdomen soften completely.', icon: '\uD83C\uDF00' },
                { part: 'Hands & Arms', prompt: 'Unclench your fists. Let your arms hang heavy. Release the tension you\'re carrying in your grip.', icon: '\u270B' },
                { part: 'Shoulders & Neck', prompt: 'Roll your shoulders back and down. Tilt your head gently side to side. These hold the weight of stress.', icon: '\uD83E\uDDD1' },
                { part: 'Jaw & Face', prompt: 'Unclench your jaw. Let your tongue drop from the roof of your mouth. Soften your forehead.', icon: '\uD83D\uDE0C' },
                { part: 'Full Body', prompt: 'Take one final breath. As you exhale, imagine tension flowing out through your fingertips and toes. You are here. You are safe.', icon: '\u2728' }
              ];
            var scanStep = d.cdScanStep || 0;
            return h('div', null,
              h('div', { style: { textAlign: 'center', marginBottom: 12 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, 'Area ' + (scanStep + 1) + ' of ' + bodyParts.length),
                h('div', { style: { height: 6, borderRadius: 3, background: '#1e293b', maxWidth: 200, margin: '0 auto' } },
                  h('div', { style: { height: '100%', borderRadius: 3, background: '#8b5cf6', width: ((scanStep + 1) / bodyParts.length * 100) + '%', transition: 'width 0.3s' } })
                )
              ),
              h('div', { style: { padding: 24, borderRadius: 16, background: '#0f172a', border: '1px solid #8b5cf644', textAlign: 'center', marginBottom: 16 } },
                h('div', { style: { fontSize: 40, marginBottom: 8 } }, bodyParts[scanStep].icon),
                h('div', { style: { fontSize: 16, fontWeight: 700, color: '#8b5cf6', marginBottom: 10 } }, bodyParts[scanStep].part),
                h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7 } }, bodyParts[scanStep].prompt)
              ),
              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
                h('button', { 'aria-label': scanStep < bodyParts.length - 1 ? 'Next Area \u2192' : '\u2705 Complete',
                  onClick: function() {
                    if (scanStep < bodyParts.length - 1) {
                      upd('cdScanStep', scanStep + 1);
                      if (soundEnabled) playTone(262 + scanStep * 44, 0.2, 'sine', 0.06);
                    } else {
                      upd({ cdMode: 'menu', cdScanStep: 0 });
                      addToast('Body scan complete. You\'re relaxed and ready.', 'success');
                      if (soundEnabled) sfxResolve();
                      awardXP(10);
                    }
                  },
                  style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: scanStep < bodyParts.length - 1 ? '#8b5cf6' : '#22c55e', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, scanStep < bodyParts.length - 1 ? 'Next Area \u2192' : '\u2705 Complete'),
                h('button', { 'aria-label': 'Back',
                  onClick: function() { upd({ cdMode: 'menu', cdScanStep: 0 }); },
                  style: { padding: '10px 16px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, '\u2190 Back')
              )
            );
          })()
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: AI Mediator ──
      // ══════════════════════════════════════════════════════════
      var medContent = null;
      if (activeTab === 'mediator') {
        medContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\u2728 AI Mediator'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } }, 'Describe a real conflict you\'re dealing with and get structured help.'),
          h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('textarea', {
              value: medPrompt, 'aria-label': 'Describe your conflict for AI mediator', onChange: function(e) { upd('medPrompt', e.target.value); },
              placeholder: band === 'elementary'
                ? 'Tell me about a fight or disagreement you\'re having. Who is it with? What happened?'
                : 'Describe the conflict: Who\'s involved? What happened? How do you feel? What have you tried so far?',
              rows: 5,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }
            }),
            h('button', { 'aria-label': 'nuanced, respectful language for ages 15-18.',
              onClick: function() {
                if (!medPrompt.trim()) { addToast('Describe the conflict first!', 'info'); return; }
                if (!callGemini) { addToast('AI mediator not available.', 'error'); return; }
                upd('medLoading', true); upd('medResponse', null);
                var sysPrompt = 'You are a compassionate conflict resolution mediator for ' + band + ' school students.\n\n' +
                  'A student has described a conflict they\'re experiencing.\n\n' +
                  'Help them with this structure:\n' +
                  '**1. Mirror:** Reflect back what you heard — show you understand both sides\n' +
                  '**2. Feelings:** Name the likely feelings for EACH person involved\n' +
                  '**3. Needs:** Identify what each person probably NEEDS (beneath what they\'re demanding)\n' +
                  '**4. I-Statement:** Write a specific I-statement they could use\n' +
                  '**5. Action Plan:** Give 2-3 concrete steps they can take today\n\n' +
                  'Use ' + (band === 'elementary' ? 'simple, warm language for ages 5-10.' : band === 'middle' ? 'supportive language for ages 11-14.' : 'nuanced, respectful language for ages 15-18.') + '\n' +
                  'Never take sides. Help them see all perspectives. Keep it under 300 words.\n\n' +
                  'Student\'s conflict: ' + medPrompt;
                callGemini(sysPrompt).then(function(result) {
                  var text = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                  upd('medResponse', text); upd('medLoading', false);
                  tryAwardBadge('ai_mediator'); awardXP(10);
                  logPractice('mediator', 'custom');
                }).catch(function(err) { upd('medLoading', false); addToast('Error: ' + err.message, 'error'); });
              },
              disabled: medLoading,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: medLoading ? '#334155' : ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: medLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
            }, medLoading ? 'Mediating...' : h(Sparkles, { size: 14 }), medLoading ? null : ' Help Me Resolve This')
          ),
          medResponse && h('div', { style: { padding: 20, borderRadius: 12, background: '#1e293b', border: '1px solid ' + ACCENT_MED } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 700 } }, 'Mediation Plan'),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, medResponse)
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Role-Play (AI-powered practice & mediation) ──
      // ══════════════════════════════════════════════════════════
      var roleplayContent = null;
      if (activeTab === 'roleplay') {
        var rpScenarios = ROLEPLAY_SCENARIOS[band] || ROLEPLAY_SCENARIOS.elementary;
        var medScenarios2 = MEDIATION_SCENARIOS[band] || MEDIATION_SCENARIOS.elementary;

        // Helper: build rapport bar
        function rapportBar(val, label, colorLow, colorHigh) {
          var pct = Math.max(0, Math.min(100, val));
          var color = pct < 30 ? colorLow : pct < 60 ? '#f59e0b' : colorHigh;
          return h('div', { style: { marginBottom: 12 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
              h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600 } }, label),
              h('span', { style: { fontSize: 11, color: color, fontWeight: 700 } }, pct + '/100')
            ),
            h('div', { style: { height: 8, borderRadius: 4, background: '#1e293b' } },
              h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', style: { height: '100%', borderRadius: 4, background: color, width: pct + '%', transition: 'width 0.4s' } })
            )
          );
        }

        // Helper: chat bubble
        function chatBubble(msg, isUser, emoji) {
          return h('div', { style: { display: 'flex', gap: 8, marginBottom: 10, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' } },
            h('div', { style: { width: 32, height: 32, borderRadius: '50%', background: isUser ? ACCENT + '33' : '#33415533', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 } }, isUser ? '🧑' : (emoji || '🤖')),
            h('div', { style: { maxWidth: '75%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isUser ? ACCENT + '22' : '#1e293b', border: '1px solid ' + (isUser ? ACCENT + '44' : '#334155') } },
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, margin: 0 } }, msg)
            )
          );
        }

        // ── Mode Menu ──
        if (!rpModeRP) {
          roleplayContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFAD Role-Play Lab'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } }, 'Practice conflict resolution with AI-powered conversations.'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
              h('button', { 'aria-label': 'Practice Mode',
                onClick: function() { upd('rpModeRP', 'practice'); if (soundEnabled) sfxClick(); },
                style: { display: 'flex', alignItems: 'center', gap: 14, padding: '20px 18px', borderRadius: 14, border: '2px solid ' + ACCENT + '44', background: ACCENT + '08', cursor: 'pointer', textAlign: 'left' }
              },
                h('span', { style: { fontSize: 36, flexShrink: 0 } }, '\uD83C\uDFAF'),
                h('div', null,
                  h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 } }, 'Practice Mode'),
                  h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.5 } }, 'Talk 1-on-1 with an AI character to practice resolving a conflict. Build rapport through good communication.'),
                  rpPracticeCompleted > 0 && h('div', { style: { fontSize: 11, color: ACCENT, marginTop: 4 } }, rpPracticeCompleted + ' completed')
                )
              ),
              h('button', { 'aria-label': 'Mediation Mode',
                onClick: function() { upd('rpModeRP', 'mediation'); if (soundEnabled) sfxClick(); },
                style: { display: 'flex', alignItems: 'center', gap: 14, padding: '20px 18px', borderRadius: 14, border: '2px solid #8b5cf644', background: '#8b5cf608', cursor: 'pointer', textAlign: 'left' }
              },
                h('span', { style: { fontSize: 36, flexShrink: 0 } }, '\u2696\uFE0F'),
                h('div', null,
                  h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 } }, 'Mediation Mode'),
                  h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.5 } }, 'Mediate a conflict between two AI characters. Guide them toward resolution and build harmony.'),
                  medMediationCompleted > 0 && h('div', { style: { fontSize: 11, color: '#8b5cf6', marginTop: 4 } }, medMediationCompleted + ' completed')
                )
              )
            )
          );
        }

        // ══════════════════════════════════════════════
        // ── PRACTICE MODE ──
        // ══════════════════════════════════════════════
        if (rpModeRP === 'practice') {
          var curRPScenario = rpScenarios[rpScenarioIdx % rpScenarios.length];

          // Scenario Selection
          if (!rpSubMode || rpSubMode === 'select') {
            roleplayContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 } },
                h('button', { 'aria-label': 'Choose a Scenario', onClick: function() { upd('rpModeRP', null); }, style: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 4 } }, '\u2190'),
                h('h3', { style: { color: '#f1f5f9', fontSize: 18, margin: 0 } }, '\uD83C\uDFAF Choose a Scenario')
              ),
              h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 16 } }, 'Pick a conflict to practice. Talk to the character and try to resolve it peacefully.'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                rpScenarios.map(function(sc, si) {
                  return h('button', { 'aria-label': sc.character.emoji,
                    key: sc.id,
                    onClick: function() {
                      upd({ rpScenarioIdx: si, rpSubMode: 'chat', rpChatHistory: [{ role: 'character', text: sc.character.openingLine }], rpRapport: sc.initialRapport, rpTurnCount: 0, rpHintUsed: false, rpInputText: '' });
                      if (soundEnabled) sfxClick();
                    },
                    style: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: '1px solid #334155', background: '#1e293b', cursor: 'pointer', textAlign: 'left' }
                  },
                    h('span', { style: { fontSize: 28, flexShrink: 0 } }, sc.character.emoji),
                    h('div', null,
                      h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 } }, sc.title),
                      h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.4 } }, sc.desc),
                      h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } }, 'Talk to: ' + sc.character.name + ' ' + sc.character.emoji)
                    )
                  );
                })
              )
            );
          }

          // Chat Interface
          if (rpSubMode === 'chat') {
            roleplayContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' } },
              // Header
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                h('button', { 'aria-label': curRPScenario.character.emoji, onClick: function() { upd({ rpSubMode: 'select', rpChatHistory: [], rpRapport: 50, rpTurnCount: 0, rpInputText: '' }); }, style: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 4 } }, '\u2190'),
                h('span', { style: { fontSize: 20 } }, curRPScenario.character.emoji),
                h('span', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9' } }, curRPScenario.character.name),
                h('span', { style: { fontSize: 11, color: '#94a3b8', marginLeft: 'auto' } }, 'Turn ' + rpTurnCount + '/20')
              ),
              // Rapport bar
              rapportBar(rpRapport, 'Rapport', '#ef4444', '#22c55e'),
              // Scenario context
              h('div', { style: { padding: 10, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', marginBottom: 12, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } }, curRPScenario.desc),
              // Chat messages
              h('div', { style: { flex: 1, overflow: 'auto', marginBottom: 12, maxHeight: 300 } },
                rpChatHistory.map(function(msg, mi) {
                  return h('div', { key: mi }, chatBubble(msg.text, msg.role === 'user', curRPScenario.character.emoji));
                })
              ),
              // Hint button
              !rpHintUsed && rpTurnCount > 0 && h('div', { style: { textAlign: 'center', marginBottom: 8 } },
                h('button', { 'aria-label': 'Get a Hint',
                  onClick: function() {
                    upd('rpHintUsed', true);
                    var hints = band === 'elementary'
                      ? ['Try using an I-statement!', 'Ask them how they feel.', 'Suggest a fair solution for both of you.', 'Acknowledge their feelings first.']
                      : band === 'middle'
                      ? ['Validate their perspective before sharing yours.', 'Use "I feel... because..." to express yourself.', 'Ask what they need to feel better.', 'Look for common ground.']
                      : ['Acknowledge the power dynamic at play.', 'Separate the person from the problem.', 'Ask an open-ended question to understand their needs.', 'Propose a collaborative solution.'];
                    var hint = hints[Math.floor(Math.random() * hints.length)];
                    addToast('\uD83D\uDCA1 Hint: ' + hint, 'info');
                  },
                  style: { background: 'none', border: '1px dashed #33415577', color: '#94a3b8', fontSize: 11, padding: '4px 12px', borderRadius: 8, cursor: 'pointer' }
                }, '\uD83D\uDCA1 Get a Hint')
              ),
              // Max turns reached
              rpTurnCount >= 20 && h('div', { style: { textAlign: 'center', padding: 16, background: '#f59e0b15', borderRadius: 12, border: '1px solid #f59e0b33', marginBottom: 12 } },
                h('p', { style: { fontSize: 13, color: '#f59e0b', fontWeight: 600 } }, 'Conversation limit reached (20 turns).'),
                h('p', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, rpRapport >= curRPScenario.resolveThreshold ? 'Great progress! You built strong rapport.' : 'Keep practicing — conflict resolution is a skill that grows with time.'),
                h('button', { 'aria-label': 'Try Another Scenario',
                  onClick: function() {
                    var newDone = rpPracticeCompleted + 1;
                    upd({ rpSubMode: 'select', rpChatHistory: [], rpRapport: 50, rpTurnCount: 0, rpPracticeCompleted: newDone, rpInputText: '' });
                    logPractice('roleplay', curRPScenario.id);
                    awardXP(rpHintUsed ? 15 : 20);
                    tryAwardBadge('first_roleplay');
                    if (newDone >= 5) tryAwardBadge('roleplay_5');
                  },
                  style: { marginTop: 10, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, 'Try Another Scenario')
              ),
              // Input area
              rpTurnCount < 20 && h('div', { style: { display: 'flex', gap: 8 } },
                h('input', {
                  type: 'text', value: rpInputText,
                  'aria-label': 'Role-play message',
                  onChange: function(e) { upd('rpInputText', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && rpInputText.trim() && !rpLoadingRP) { sendRPMessage(); } },
                  placeholder: band === 'elementary' ? 'What do you want to say?' : 'Type your response...',
                  disabled: rpLoadingRP,
                  style: { flex: 1, padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit' }
                }),
                h('button', { 'aria-label': rpLoadingRP ? '...' : '\u2191',
                  onClick: function() { if (rpInputText.trim() && !rpLoadingRP) sendRPMessage(); },
                  disabled: rpLoadingRP || !rpInputText.trim(),
                  style: { padding: '10px 16px', borderRadius: 10, border: 'none', background: rpLoadingRP ? '#334155' : ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: rpLoadingRP ? 'default' : 'pointer' }
                }, rpLoadingRP ? '...' : '\u2191')
              )
            );

            // Send message handler
            function sendRPMessage() {
              var userMsg = rpInputText.trim();
              if (!userMsg || rpLoadingRP) return;
              var newHistory = rpChatHistory.concat([{ role: 'user', text: userMsg }]);
              upd({ rpChatHistory: newHistory, rpLoadingRP: true, rpTurnCount: rpTurnCount + 1, rpInputText: '' });

              // Build conversation history string (last 10 exchanges)
              var historyStr = '';
              var recent = newHistory.slice(-20);
              recent.forEach(function(m) {
                historyStr += (m.role === 'user' ? 'Student' : curRPScenario.character.name) + ': ' + m.text + '\n';
              });

              var gradeLabel = band === 'elementary' ? 'elementary school (ages 5-10)' : band === 'middle' ? 'middle school (ages 11-14)' : 'high school (ages 15-18)';
              var prompt = 'You are ' + curRPScenario.character.name + ', a ' + gradeLabel + ' student in a conflict scenario.\n' +
                'Personality: ' + curRPScenario.character.personality + '\n' +
                'Situation: ' + curRPScenario.desc + '\n\n' +
                'Current rapport with the student: ' + rpRapport + '/100.\n' +
                'Behavior based on rapport:\n' +
                '- Below 30: You are defensive, hostile, and dismissive\n' +
                '- 30-50: You are guarded but willing to listen if approached respectfully\n' +
                '- 50-70: You are open, engaged, and starting to see their perspective\n' +
                '- Above 70: You are cooperative, empathetic, and ready to find a resolution\n\n' +
                'Conversation so far:\n' + historyStr + '\n' +
                'Respond as ' + curRPScenario.character.name + ' in 2-3 sentences appropriate for ' + gradeLabel + '.\n' +
                'Also evaluate how well the student communicated.\n\n' +
                'Return ONLY valid JSON: {"reply":"your response","rapportChange":number_between_-15_and_15,"resolved":boolean}\n' +
                'rapportChange should be positive for empathetic, calm, I-statement responses. Negative for aggressive, blaming, or dismissive responses. resolved=true only when rapport is above ' + curRPScenario.resolveThreshold + ' AND the student has demonstrated understanding.';

              callGemini(prompt).then(function(resp) {
                var text = typeof resp === 'string' ? resp : (resp && resp.text ? resp.text : String(resp));
                try {
                  var jsonMatch = text.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    var parsed = JSON.parse(jsonMatch[0]);
                    var reply = parsed.reply || 'Hmm, I need to think about that.';
                    var change = typeof parsed.rapportChange === 'number' ? parsed.rapportChange : 0;
                    var resolved = !!parsed.resolved;
                    var newRapport = Math.max(0, Math.min(100, rpRapport + change));

                    var updatedHistory = newHistory.concat([{ role: 'character', text: reply }]);
                    if (change > 5 && soundEnabled) sfxCorrect();
                    if (change < -5 && soundEnabled) sfxWrong();

                    if (resolved && newRapport >= curRPScenario.resolveThreshold) {
                      var newDone = rpPracticeCompleted + 1;
                      var newStreak = rpResolveStreak + 1;
                      upd({ rpChatHistory: updatedHistory, rpRapport: newRapport, rpLoadingRP: false, rpSubMode: 'resolved', rpPracticeCompleted: newDone, rpResolveStreak: newStreak });
                      logPractice('roleplay', curRPScenario.id);
                      awardXP(rpHintUsed ? 20 : 30);
                      tryAwardBadge('first_roleplay');
                      tryAwardBadge('roleplay_resolved');
                      if (newDone >= 5) tryAwardBadge('roleplay_5');
                      if (newStreak >= 3) tryAwardBadge('roleplay_streak');
                      if (soundEnabled) sfxResolve();
                      celebrate && celebrate();
                    } else {
                      upd({ rpChatHistory: updatedHistory, rpRapport: newRapport, rpLoadingRP: false });
                    }
                  } else {
                    // Fallback: use raw text as reply
                    upd({ rpChatHistory: newHistory.concat([{ role: 'character', text: text.slice(0, 300) }]), rpLoadingRP: false });
                  }
                } catch(e) {
                  upd({ rpChatHistory: newHistory.concat([{ role: 'character', text: text.slice(0, 300) }]), rpLoadingRP: false });
                }
              }).catch(function(err) {
                upd('rpLoadingRP', false);
                addToast('AI error: ' + err.message, 'error');
              });
            }
          }

          // Resolution Screen
          if (rpSubMode === 'resolved') {
            roleplayContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto', textAlign: 'center' } },
              h('div', { style: { fontSize: 56, marginBottom: 12 } }, '\uD83C\uDF89'),
              h('h3', { style: { color: '#22c55e', fontSize: 20, marginBottom: 8 } }, 'Conflict Resolved!'),
              h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 4 } }, 'You reached resolution with ' + curRPScenario.character.name + '!'),
              rapportBar(rpRapport, 'Final Rapport', '#ef4444', '#22c55e'),
              h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16, textAlign: 'left' } },
                h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Conversation Replay'),
                h('div', { style: { maxHeight: 200, overflow: 'auto' } },
                  rpChatHistory.map(function(msg, mi) {
                    return h('div', { key: mi }, chatBubble(msg.text, msg.role === 'user', curRPScenario.character.emoji));
                  })
                )
              ),
              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
                h('button', { 'aria-label': 'Try Another',
                  onClick: function() { upd({ rpSubMode: 'select', rpChatHistory: [], rpRapport: 50, rpTurnCount: 0, rpInputText: '' }); if (soundEnabled) sfxClick(); },
                  style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, 'Try Another \u2192'),
                h('button', { 'aria-label': 'Back to Menu',
                  onClick: function() { upd({ rpModeRP: null, rpSubMode: null, rpChatHistory: [], rpRapport: 50, rpTurnCount: 0, rpInputText: '' }); },
                  style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, 'Back to Menu')
              )
            );
          }
        }

        // ══════════════════════════════════════════════
        // ── MEDIATION MODE ──
        // ══════════════════════════════════════════════
        if (rpModeRP === 'mediation') {
          var curMedScenario = medScenarios2[medScenarioIdx % medScenarios2.length];

          // Scenario Selection
          if (!rpSubMode || rpSubMode === 'select') {
            roleplayContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 } },
                h('button', { 'aria-label': 'Choose a Mediation', onClick: function() { upd('rpModeRP', null); }, style: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 4 } }, '\u2190'),
                h('h3', { style: { color: '#f1f5f9', fontSize: 18, margin: 0 } }, '\u2696\uFE0F Choose a Mediation')
              ),
              h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 16 } }, 'Help two people resolve their conflict. Guide them toward understanding and harmony.'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                medScenarios2.map(function(sc, si) {
                  return h('button', { 'aria-label': sc.title,
                    key: sc.id,
                    onClick: function() {
                      upd({
                        medScenarioIdx: si, rpSubMode: 'chat',
                        medChatHistory2: [
                          { role: 'charA', text: sc.charA.position },
                          { role: 'charB', text: sc.charB.position }
                        ],
                        medHarmony: sc.initialHarmony, medTurnCount: 0, medInputText: ''
                      });
                      if (soundEnabled) sfxClick();
                    },
                    style: { padding: '14px 16px', borderRadius: 12, border: '1px solid #334155', background: '#1e293b', cursor: 'pointer', textAlign: 'left' }
                  },
                    h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 } }, sc.title),
                    h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.4, marginBottom: 6 } }, sc.desc),
                    h('div', { style: { display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' } },
                      h('span', null, sc.charA.emoji + ' ' + sc.charA.name),
                      h('span', null, 'vs'),
                      h('span', null, sc.charB.emoji + ' ' + sc.charB.name)
                    )
                  );
                })
              )
            );
          }

          // Mediation Chat Interface
          if (rpSubMode === 'chat') {
            roleplayContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' } },
              // Header
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
                h('button', { 'aria-label': curMedScenario.charA.emoji, onClick: function() { upd({ rpSubMode: 'select', medChatHistory2: [], medHarmony: 30, medTurnCount: 0, medInputText: '' }); }, style: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 4 } }, '\u2190'),
                h('span', { style: { fontSize: 16 } }, curMedScenario.charA.emoji),
                h('span', { style: { fontSize: 12, color: '#94a3b8' } }, 'vs'),
                h('span', { style: { fontSize: 16 } }, curMedScenario.charB.emoji),
                h('span', { style: { fontSize: 12, fontWeight: 600, color: '#f1f5f9' } }, 'You are the mediator'),
                h('span', { style: { fontSize: 11, color: '#94a3b8', marginLeft: 'auto' } }, 'Turn ' + medTurnCount + '/20')
              ),
              // Harmony bar
              rapportBar(medHarmony, 'Harmony', '#ef4444', '#8b5cf6'),
              // Scenario context
              h('div', { style: { padding: 10, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', marginBottom: 12, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } }, curMedScenario.desc),
              // Chat messages
              h('div', { style: { flex: 1, overflow: 'auto', marginBottom: 12, maxHeight: 300 } },
                medChatHistory2.map(function(msg, mi) {
                  var isUser = msg.role === 'mediator';
                  var emoji = msg.role === 'charA' ? curMedScenario.charA.emoji : msg.role === 'charB' ? curMedScenario.charB.emoji : '🧑';
                  var bgColor = msg.role === 'charA' ? '#3b82f615' : msg.role === 'charB' ? '#ec489915' : ACCENT + '22';
                  var borderColor = msg.role === 'charA' ? '#3b82f644' : msg.role === 'charB' ? '#ec489944' : ACCENT + '44';
                  var nameLabel = msg.role === 'charA' ? curMedScenario.charA.name : msg.role === 'charB' ? curMedScenario.charB.name : 'You (Mediator)';
                  return h('div', { key: mi, style: { marginBottom: 10 } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 2, marginLeft: isUser ? 0 : 40, textAlign: isUser ? 'right' : 'left' } }, nameLabel),
                    h('div', { style: { display: 'flex', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' } },
                      h('div', { style: { width: 32, height: 32, borderRadius: '50%', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, border: '1px solid ' + borderColor } }, emoji),
                      h('div', { style: { maxWidth: '75%', padding: '10px 14px', borderRadius: 14, background: bgColor, border: '1px solid ' + borderColor } },
                        h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, margin: 0 } }, msg.text)
                      )
                    )
                  );
                })
              ),
              // Max turns
              medTurnCount >= 20 && h('div', { style: { textAlign: 'center', padding: 16, background: '#f59e0b15', borderRadius: 12, border: '1px solid #f59e0b33', marginBottom: 12 } },
                h('p', { style: { fontSize: 13, color: '#f59e0b', fontWeight: 600 } }, 'Mediation session ended (20 turns).'),
                h('button', { 'aria-label': 'Try Another',
                  onClick: function() {
                    var newDone = medMediationCompleted + 1;
                    upd({ rpSubMode: 'select', medChatHistory2: [], medHarmony: 30, medTurnCount: 0, medMediationCompleted: newDone, medInputText: '' });
                    logPractice('mediation', curMedScenario.id);
                    awardXP(20);
                    tryAwardBadge('first_mediation2');
                    if (newDone >= 5) tryAwardBadge('mediation_5');
                  },
                  style: { marginTop: 10, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, 'Try Another')
              ),
              // Input area
              medTurnCount < 20 && h('div', { style: { display: 'flex', gap: 8 } },
                h('input', {
                  type: 'text', value: medInputText,
                  'aria-label': 'Mediation message',
                  onChange: function(e) { upd('medInputText', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && medInputText.trim() && !medLoadingRP) { sendMedMessage(); } },
                  placeholder: 'What do you say as the mediator?',
                  disabled: medLoadingRP,
                  style: { flex: 1, padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit' }
                }),
                h('button', { 'aria-label': medLoadingRP ? '...' : '\u2191',
                  onClick: function() { if (medInputText.trim() && !medLoadingRP) sendMedMessage(); },
                  disabled: medLoadingRP || !medInputText.trim(),
                  style: { padding: '10px 16px', borderRadius: 10, border: 'none', background: medLoadingRP ? '#334155' : '#8b5cf6', color: '#fff', fontWeight: 600, fontSize: 13, cursor: medLoadingRP ? 'default' : 'pointer' }
                }, medLoadingRP ? '...' : '\u2191')
              )
            );

            // Send mediation message handler
            function sendMedMessage() {
              var userMsg = medInputText.trim();
              if (!userMsg || medLoadingRP) return;
              var newHistory = medChatHistory2.concat([{ role: 'mediator', text: userMsg }]);
              upd({ medChatHistory2: newHistory, medLoadingRP: true, medTurnCount: medTurnCount + 1, medInputText: '' });

              var historyStr = '';
              var recent = newHistory.slice(-20);
              recent.forEach(function(m) {
                var name = m.role === 'mediator' ? 'Mediator' : m.role === 'charA' ? curMedScenario.charA.name : curMedScenario.charB.name;
                historyStr += name + ': ' + m.text + '\n';
              });

              var gradeLabel = band === 'elementary' ? 'elementary school (ages 5-10)' : band === 'middle' ? 'middle school (ages 11-14)' : 'high school (ages 15-18)';
              var prompt = 'Two ' + gradeLabel + ' students are in conflict. A student mediator is helping them resolve it.\n\n' +
                curMedScenario.charA.name + ' (' + curMedScenario.charA.personality + ')\nPosition: ' + curMedScenario.charA.position + '\n\n' +
                curMedScenario.charB.name + ' (' + curMedScenario.charB.personality + ')\nPosition: ' + curMedScenario.charB.position + '\n\n' +
                'Current harmony level: ' + medHarmony + '/100.\n' +
                'Higher harmony means both parties are more willing to listen and compromise.\n\n' +
                'Conversation so far:\n' + historyStr + '\n' +
                'Both characters respond to the mediator. Each should speak in 1-2 sentences appropriate for ' + gradeLabel + '.\n\n' +
                'Return ONLY valid JSON: {"replyA":"' + curMedScenario.charA.name + ' says...","replyB":"' + curMedScenario.charB.name + ' says...","harmonyChange":number_between_-10_and_15,"resolved":boolean}\n' +
                'harmonyChange positive when mediator validates feelings, finds common ground, or proposes fair solutions. Negative when mediator takes sides or dismisses feelings. resolved=true only when harmony > ' + curMedScenario.resolveThreshold + ' AND both sides show willingness to compromise.';

              callGemini(prompt).then(function(resp) {
                var text = typeof resp === 'string' ? resp : (resp && resp.text ? resp.text : String(resp));
                try {
                  var jsonMatch = text.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    var parsed = JSON.parse(jsonMatch[0]);
                    var replyA = parsed.replyA || 'Hmm...';
                    var replyB = parsed.replyB || 'I\'m not sure...';
                    var change = typeof parsed.harmonyChange === 'number' ? parsed.harmonyChange : 0;
                    var resolved = !!parsed.resolved;
                    var newHarmony = Math.max(0, Math.min(100, medHarmony + change));

                    var updatedHistory = newHistory.concat([
                      { role: 'charA', text: replyA },
                      { role: 'charB', text: replyB }
                    ]);

                    if (change > 5 && soundEnabled) sfxCorrect();
                    if (change < -5 && soundEnabled) sfxWrong();

                    if (resolved && newHarmony >= curMedScenario.resolveThreshold) {
                      var newDone = medMediationCompleted + 1;
                      upd({ medChatHistory2: updatedHistory, medHarmony: newHarmony, medLoadingRP: false, rpSubMode: 'resolved', medMediationCompleted: newDone });
                      logPractice('mediation', curMedScenario.id);
                      awardXP(30);
                      tryAwardBadge('first_mediation2');
                      if (newDone >= 5) tryAwardBadge('mediation_5');
                      if (newHarmony > 80) tryAwardBadge('mediation_harmony');
                      if (soundEnabled) sfxResolve();
                      celebrate && celebrate();
                    } else {
                      upd({ medChatHistory2: updatedHistory, medHarmony: newHarmony, medLoadingRP: false });
                    }
                  } else {
                    upd({ medChatHistory2: newHistory.concat([{ role: 'charA', text: text.slice(0, 200) }]), medLoadingRP: false });
                  }
                } catch(e) {
                  upd({ medChatHistory2: newHistory.concat([{ role: 'charA', text: text.slice(0, 200) }]), medLoadingRP: false });
                }
              }).catch(function(err) {
                upd('medLoadingRP', false);
                addToast('AI error: ' + err.message, 'error');
              });
            }
          }

          // Mediation Resolution Screen
          if (rpSubMode === 'resolved' && rpModeRP === 'mediation') {
            roleplayContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto', textAlign: 'center' } },
              h('div', { style: { fontSize: 56, marginBottom: 12 } }, '\u2696\uFE0F'),
              h('h3', { style: { color: '#8b5cf6', fontSize: 20, marginBottom: 8 } }, 'Mediation Successful!'),
              h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 4 } }, 'You helped ' + curMedScenario.charA.name + ' and ' + curMedScenario.charB.name + ' find common ground!'),
              rapportBar(medHarmony, 'Final Harmony', '#ef4444', '#8b5cf6'),
              h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid #8b5cf644', marginBottom: 16, textAlign: 'left' } },
                h('p', { style: { fontSize: 10, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Mediation Replay'),
                h('div', { style: { maxHeight: 200, overflow: 'auto' } },
                  medChatHistory2.slice(-6).map(function(msg, mi) {
                    var nameLabel = msg.role === 'charA' ? curMedScenario.charA.name : msg.role === 'charB' ? curMedScenario.charB.name : 'You';
                    var emoji = msg.role === 'charA' ? curMedScenario.charA.emoji : msg.role === 'charB' ? curMedScenario.charB.emoji : '🧑';
                    return h('div', { key: mi, style: { fontSize: 12, color: '#e2e8f0', marginBottom: 6, lineHeight: 1.5 } },
                      h('span', { style: { fontWeight: 700, color: msg.role === 'mediator' ? ACCENT : '#94a3b8' } }, emoji + ' ' + nameLabel + ': '),
                      msg.text
                    );
                  })
                )
              ),
              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
                h('button', { 'aria-label': 'Mediate Another',
                  onClick: function() { upd({ rpSubMode: 'select', medChatHistory2: [], medHarmony: 30, medTurnCount: 0, medInputText: '' }); if (soundEnabled) sfxClick(); },
                  style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, 'Mediate Another \u2192'),
                h('button', { 'aria-label': 'Back to Menu',
                  onClick: function() { upd({ rpModeRP: null, rpSubMode: null, medChatHistory2: [], medHarmony: 30, medTurnCount: 0, medInputText: '' }); },
                  style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
                }, 'Back to Menu')
              )
            );
          }
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Progress ──
      // ══════════════════════════════════════════════════════════
      var progressContent = null;
      if (activeTab === 'progress') {
        var totalActs = cfCompleted + isCompleted + deViewed + rpCompleted + apCompleted + rpPracticeCompleted + medMediationCompleted;
        var stats = [
          { label: 'Conflicts Navigated', value: cfCompleted, icon: '\uD83C\uDFAD', color: '#10b981' },
          { label: 'I-Statements Built', value: isCompleted, icon: '\uD83D\uDDE3\uFE0F', color: '#8b5cf6' },
          { label: 'Techniques Learned', value: deViewed, icon: '\u270B', color: '#3b82f6' },
          { label: 'Repairs Practiced', value: rpCompleted, icon: '\uD83D\uDC9A', color: '#f59e0b' },
          { label: 'Apologies Crafted', value: apCompleted, icon: '\uD83D\uDC8C', color: '#ec4899' },
          { label: 'Role-Plays Done', value: rpPracticeCompleted, icon: '\uD83C\uDFAF', color: '#22c55e' },
          { label: 'Mediations Done', value: medMediationCompleted, icon: '\u2696\uFE0F', color: '#8b5cf6' },
          { label: 'Style Quiz', value: sqDone ? 'Done' : '\u2014', icon: '\uD83E\uDDE9', color: '#6366f1' },
          { label: 'Cool-Downs Used', value: cdUsed ? '\u2705' : '\u2014', icon: '\uD83E\uDDD8', color: '#8b5cf6' }
        ];

        progressContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Your Progress'),
          h('div', { style: { textAlign: 'center', padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('div', { style: { fontSize: 40, fontWeight: 700, color: ACCENT } }, totalActs),
            h('div', { style: { fontSize: 13, color: '#94a3b8' } }, 'Total Activities Completed')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 } },
            stats.map(function(s) {
              return h('div', { key: s.label, style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid ' + s.color + '44', textAlign: 'center' } },
                h('div', { style: { fontSize: 24 } }, s.icon),
                h('div', { style: { fontSize: 22, fontWeight: 700, color: s.color, margin: '4px 0' } }, s.value),
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, s.label)
              );
            })
          ),
          practiceLog.length > 0 && h('div', null,
            h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 8 } }, 'Recent Practice'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              practiceLog.slice(-8).reverse().map(function(entry, i) {
                var icons = { conflict: '\uD83C\uDFAD', istatement: '\uD83D\uDDE3\uFE0F', deescalate: '\u270B', repair: '\uD83D\uDC9A', styles: '\uD83E\uDDE9', apology: '\uD83D\uDC8C', cooldown: '\uD83E\uDDD8', mediator: '\u2728', roleplay: '\uD83C\uDFAF', mediation: '\u2696\uFE0F' };
                var labels = { conflict: 'Conflict Theater', istatement: 'I-Statement', deescalate: 'De-Escalation', repair: 'Repair', styles: 'Style Quiz', apology: 'Apology Lab', cooldown: 'Cool-Down', mediator: 'AI Mediator', roleplay: 'Role-Play', mediation: 'Mediation' };
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
      var content = cfContent || isContent || deContent || rpContent || stylesContent || apologyContent || cooldownContent || medContent || roleplayContent || progressContent;

      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        tabBar,
        badgePopup,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content)
      );
    }
  });
})();
