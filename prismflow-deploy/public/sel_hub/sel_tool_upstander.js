// ═══════════════════════════════════════════════════════════════
// sel_tool_upstander.js — Upstander Workshop (v1.0)
// Addresses bullying through all three lenses: target, perpetrator,
// bystander. Grounded in the understanding that hurt people hurt
// people, silence is participation, and punitive approaches fail.
// Teaches the hardest skill: standing up — for others AND yourself.
// Registered tool ID: "upstander"
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
  (function() {
    if (document.getElementById('allo-live-upstander')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-upstander'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status'); lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  var _ac = null;
  function getAC() { if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _ac; }
  function tone(f, d, t, v) { var ac = getAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.1, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.15)); } catch(e) {} }
  function sfxClick() { tone(880, 0.04, 'sine', 0.05); }
  function sfxBrave() { tone(330, 0.15, 'triangle', 0.06); setTimeout(function() { tone(440, 0.15, 'sine', 0.06); }, 120); setTimeout(function() { tone(554, 0.2, 'sine', 0.07); }, 240); setTimeout(function() { tone(659, 0.25, 'sine', 0.08); }, 360); }

  // ══════════════════════════════════════════════════════════════
  // ── Content ──
  // ══════════════════════════════════════════════════════════════

  // The Three Roles
  var ROLES = {
    elementary: [
      { id: 'target', icon: '\uD83D\uDC94', title: 'The Person Being Hurt', color: '#93c5fd',
        feels: ['scared', 'alone', 'ashamed', 'confused', 'angry', 'small'],
        truth: 'Being bullied is NEVER your fault. It doesn\u2019t matter what you look like, what you\u2019re good at, or how you talk. Nobody deserves to be treated badly.',
        myth: 'Myth: "Just ignore them and they\u2019ll stop." Truth: Ignoring doesn\u2019t always work, and telling you to just ignore it puts the responsibility on YOU instead of the person doing the hurting.' },
      { id: 'bully', icon: '\uD83D\uDE1E', title: 'The Person Doing the Hurting', color: '#fca5a5',
        feels: ['scared too', 'hurt before', 'lonely', 'angry inside', 'wanting control', 'not knowing better'],
        truth: 'Most people who bully others have been hurt themselves. That doesn\u2019t make it okay. But understanding why helps us break the cycle instead of just adding more punishment.',
        myth: 'Myth: "Bullies are just mean people." Truth: Bullying is a behavior, not an identity. People who bully can learn to stop. The behavior is wrong. The person still deserves help.' },
      { id: 'bystander', icon: '\uD83D\uDE36', title: 'The Person Watching', color: '#fde68a',
        feels: ['frozen', 'guilty', 'relieved it\u2019s not them', 'wanting to help but scared', 'confused about what to do'],
        truth: 'When you see someone being bullied and don\u2019t say anything, it can feel like you\u2019re agreeing with the bully. But staying silent usually isn\u2019t about agreeing \u2014 it\u2019s about being scared. That\u2019s honest and human.',
        myth: 'Myth: "It\u2019s not my problem." Truth: Bullying only works when there\u2019s an audience that stays silent. One person speaking up changes everything.' }
    ],
    middle: [
      { id: 'target', icon: '\uD83D\uDC94', title: 'The Target', color: '#93c5fd',
        feels: ['hypervigilant', 'dreading school', 'self-doubting', 'isolated', 'depressed', 'performing "okay"'],
        truth: 'Bullying targets are often chosen not for their weakness but for their difference \u2014 which is often their strength. The creative kid, the sensitive kid, the kid who doesn\u2019t perform dominance. The qualities that make you a target at 13 make you remarkable at 30.',
        myth: 'Myth: "You need thicker skin." Truth: Telling someone to be less affected by cruelty is protecting the cruelty, not the person. The skin isn\u2019t too thin. The behavior is too harmful.' },
      { id: 'bully', icon: '\uD83D\uDE1E', title: 'The One Who Bullies', color: '#fca5a5',
        feels: ['fear of vulnerability', 'hurt that became armor', 'pressure to perform toughness', 'self-loathing masked as dominance', 'modeling what was done to them'],
        truth: 'Research (Olweus, 1993): students who bully are significantly more likely to have experienced abuse, witnessed domestic violence, or been bullied themselves. The behavior is a corruption of the need for connection \u2014 power substituted for belonging.',
        myth: 'Myth: "They\u2019re just evil." Truth: Dehumanizing the person who bullies is itself a form of the same thinking that enables bullying. Accountability without empathy just moves the harm around.' },
      { id: 'bystander', icon: '\uD83D\uDE36', title: 'The Bystander', color: '#fde68a',
        feels: ['relief it\u2019s not them', 'social calculation', 'guilt', 'paralysis', 'fear of becoming the next target'],
        truth: 'The bystander effect is one of the most studied phenomena in social psychology. The more people watching, the less likely any one person intervenes. It\u2019s not because people don\u2019t care. It\u2019s because each person assumes someone else will act.',
        myth: 'Myth: "I can\u2019t make a difference." Truth: Studies show that when ONE bystander speaks up, bullying stops within 10 seconds over 57% of the time (Hawkins, Pepler & Craig, 2001).' }
    ],
    high: [
      { id: 'target', icon: '\uD83D\uDC94', title: 'The Target', color: '#93c5fd',
        feels: ['chronic stress response', 'identity questioning', 'academic decline', 'social withdrawal', 'suicidal ideation in severe cases', 'complex PTSD symptoms'],
        truth: 'Bullying is not a rite of passage. Longitudinal research shows that bullying victimization is associated with increased risk of depression, anxiety, and self-harm that persists into adulthood (Copeland et al., 2013). It literally rewires the stress response system.',
        myth: 'Myth: "It builds character." Truth: Chronic stress doesn\u2019t build character \u2014 it depletes the neurobiological resources needed FOR character. Adversity that builds resilience is adversity with support. Bullying is adversity designed to isolate you from support.' },
      { id: 'bully', icon: '\uD83D\uDE1E', title: 'The One Who Bullies', color: '#fca5a5',
        feels: ['externalized pain', 'attachment disruption', 'performing a version of masculinity/power they were taught', 'fear of vulnerability equated with death', 'trapped in a role they may not want'],
        truth: 'The relationship between being bullied and becoming a bully is one of the strongest findings in the literature. "Bully-victims" \u2014 those who are both perpetrators and targets \u2014 have the worst mental health outcomes of any group. They need intervention, not just consequences.',
        myth: 'Myth: "Zero tolerance works." Truth: Zero-tolerance policies increase dropout rates and disproportionately affect students of color and students with disabilities without reducing bullying (APA Zero Tolerance Task Force, 2008). What works: restorative practices, social-emotional skill building, and addressing root causes.' },
      { id: 'bystander', icon: '\uD83D\uDE36', title: 'The Bystander', color: '#fde68a',
        feels: ['moral injury from inaction', 'social cost calculation', 'diffusion of responsibility', 'conformity pressure', 'cognitive dissonance'],
        truth: 'Hannah Arendt wrote about the "banality of evil" \u2014 how ordinary people enable harm through passivity and conformity. The bystander\u2019s silence isn\u2019t neutral. In a system where harm is occurring, inaction IS a choice. The question isn\u2019t whether you have the right to intervene. It\u2019s whether you can live with not doing so.',
        myth: 'Myth: "Speaking up will make me a target too." Truth: Sometimes it does. And that\u2019s a real cost. But the research also shows that peer intervention is the single most effective bullying deterrent \u2014 more effective than teacher intervention, school policy, or punishment.' }
    ]
  };

  // Upstander strategies
  var UPSTANDER_MOVES = {
    elementary: [
      { move: 'Stand Next To Them', icon: '\uD83E\uDDF1', desc: 'Just walk over and stand next to the person being bullied. You don\u2019t even have to say anything. Your presence says "they\u2019re not alone."', risk: 'low' },
      { move: 'Change the Subject', icon: '\uD83D\uDDE3\uFE0F', desc: '"Hey, did you hear about ___?" Interrupt the moment without directly confronting the bully. Sometimes distraction is the safest strategy.', risk: 'low' },
      { move: 'Invite Them Away', icon: '\uD83D\uDC4B', desc: '"Hey, want to come play with us?" Give the target an exit that doesn\u2019t require them to "escape" \u2014 it\u2019s just a better offer.', risk: 'low' },
      { move: 'Say Something', icon: '\uD83D\uDCAC', desc: '"That\u2019s not cool" or "Leave them alone." Simple, direct, not aggressive. You\u2019re not starting a fight \u2014 you\u2019re naming what\u2019s wrong.', risk: 'medium' },
      { move: 'Get an Adult', icon: '\uD83C\uDFEB', desc: 'Telling a trusted adult is NOT snitching. It\u2019s protecting someone. If someone was bleeding, you\u2019d get help. This is the same.', risk: 'low' },
      { move: 'Check In Later', icon: '\uD83D\uDC9B', desc: 'Even if you couldn\u2019t do anything in the moment, find the person later and say "Are you okay? That wasn\u2019t right." Delayed kindness still counts.', risk: 'low' },
    ],
    middle: [
      { move: 'The Proximity Move', icon: '\uD83E\uDDF1', desc: 'Physical presence disrupts the dynamic. Walk over. Sit nearby. Make eye contact with the target. You\u2019re signaling: the audience is shifting.', risk: 'low' },
      { move: 'The Redirect', icon: '\uD83D\uDDE3\uFE0F', desc: 'Create a diversion. "Hey, the teacher is looking." "Wasn\u2019t there a game starting?" You\u2019re not confronting \u2014 you\u2019re disrupting.', risk: 'low' },
      { move: 'Name It Publicly', icon: '\uD83D\uDCAC', desc: '"That\u2019s bullying." Sometimes the most powerful thing is to name what everyone can see but nobody is saying. Labels carry social weight.', risk: 'medium' },
      { move: 'Private Support', icon: '\uD83D\uDCF1', desc: 'DM or text the target: "I saw what happened. I\u2019m sorry. Want to talk?" Sometimes the support that matters most comes after the moment.', risk: 'low' },
      { move: 'Refuse the Audience', icon: '\uD83D\uDEB6', desc: 'Walk away visibly. If others follow, the bully loses their stage. Bullying requires an audience. Remove the audience, reduce the power.', risk: 'low' },
      { move: 'Report Strategically', icon: '\uD83D\uDCDD', desc: 'Document what you witnessed. Times, words, who was there. Give this to a trusted adult. Anonymous reporting works too. Evidence changes outcomes.', risk: 'low' },
    ],
    high: [
      { move: 'Strategic Presence', icon: '\uD83E\uDDF1', desc: 'In social dynamics, presence is power. Positioning yourself with the target signals alliance. It doesn\u2019t require words \u2014 proximity IS the message.', risk: 'low' },
      { move: 'The Direct Challenge', icon: '\uD83D\uDCAC', desc: '"What you\u2019re doing isn\u2019t okay." This requires courage and social capital. It works best when you have standing with the group. The risk is real but so is the impact.', risk: 'high' },
      { move: 'Coalition Building', icon: '\uD83E\uDD1D', desc: 'Talk to other bystanders privately. "Did you see that? It\u2019s not right. What if we all said something?" Collective action reduces individual risk.', risk: 'medium' },
      { move: 'The Humanizing Move', icon: '\u2764\uFE0F', desc: 'Sometimes the most radical act is humanizing the target publicly: "They\u2019re actually a really good person. You should get to know them." This challenges the dehumanization that bullying requires.', risk: 'medium' },
      { move: 'Systemic Advocacy', icon: '\uD83D\uDCE2', desc: 'Push for restorative practices at the school level. Advocate for anti-bullying policy that focuses on restoration, not just punishment. Change the system, not just the incident.', risk: 'low' },
      { move: 'After-the-Fact Connection', icon: '\uD83D\uDC9B', desc: '"I should have said something and I didn\u2019t. I\u2019m sorry. I\u2019m here now." Acknowledging your inaction honestly is more healing than performing bravery you didn\u2019t have in the moment.', risk: 'low' },
    ]
  };

  // Breaking the cycle — what actually works
  var CYCLE_BREAKERS = {
    elementary: [
      { title: 'Hurt People Hurt People', text: 'When someone is mean to you, your brain wants to be mean to someone else. That\u2019s normal \u2014 but it\u2019s a chain. You can be the one who breaks it by choosing kindness even when you\u2019re hurting.', icon: '\uD83D\uDD17' },
      { title: 'What Punishment Can\u2019t Do', text: 'Getting in trouble doesn\u2019t teach someone how to be kind. It teaches them not to get caught. Real change happens when someone helps the bully understand WHY their behavior hurts and gives them a different way to feel powerful.', icon: '\u2696\uFE0F' },
      { title: 'You Can Be All Three', text: 'Sometimes you\u2019re the one being hurt. Sometimes you watch it happen. Sometimes \u2014 and this is hard to admit \u2014 you might be the one doing the hurting. All of these are human. The question is what you do next.', icon: '\uD83C\uDF00' },
    ],
    middle: [
      { title: 'The Harm Cycle', text: 'A child is humiliated at home. At school, they humiliate someone smaller. That child goes home and kicks the dog. The dog bites the baby. Harm flows downhill \u2014 until someone absorbs it instead of passing it on. That person is the cycle breaker.', icon: '\uD83D\uDD17' },
      { title: 'Restorative vs. Punitive', text: 'Punishment asks: "What rule was broken?" Restoration asks: "Who was harmed, and what do they need?" One creates compliance through fear. The other creates accountability through empathy. Research shows restorative approaches reduce repeat offenses by 40-60%.', icon: '\u2696\uFE0F' },
      { title: 'The Courage Hierarchy', text: 'Level 1: Don\u2019t participate in bullying. Level 2: Walk away from it. Level 3: Support the target privately. Level 4: Intervene publicly. Level 5: Work to change the system. Every level matters. Start where you are.', icon: '\uD83E\uDDD7' },
    ],
    high: [
      { title: 'The Neuroscience of Cruelty', text: 'Dehumanization \u2014 the cognitive process that enables bullying \u2014 literally deactivates the medial prefrontal cortex, the brain region responsible for mentalizing (seeing others as having thoughts and feelings). Bullying doesn\u2019t just harm the target. It erodes the bully\u2019s own capacity for empathy.', icon: '\uD83E\uDDE0' },
      { title: 'Systems, Not Just Individuals', text: 'Bullying is not a character problem \u2014 it\u2019s an environmental one. Schools with hierarchical social structures, status-based reward systems, and inadequate supervision have more bullying regardless of the students in them (Espelage & Swearer, 2004). To end bullying, change the system that incentivizes it.', icon: '\uD83C\uDFDB\uFE0F' },
      { title: 'Moral Courage as Practice', text: 'Moral courage isn\u2019t a trait you have or don\u2019t have. It\u2019s a skill you practice. Every time you speak up about something small, you build the neural pathways that make it easier to speak up about something big. Start with micro-courage. The muscles grow.', icon: '\uD83E\uDDD7' },
    ]
  };

  // ── Practice Scenarios (branching) ──
  // Each scenario: 4 choices rated 1 (risky/harmful) → 3 (strong upstander).
  // Designed for in-person school contexts; cyberbullying is in Digital Wellbeing.
  var SCENARIOS = {
    elementary: [
      { id: 'lunch_alone', icon: '🍽️', title: 'Lunch alone',
        setup: 'A kid in your class has been eating lunch alone every day this week. Today some kids at another table are pointing and laughing at them. The kid is looking down, not eating.',
        choices: [
          { label: 'Laugh along so the other kids do not turn on you.', rating: 1,
            feedback: 'I get the fear, but laughing tells the kid being hurt that the whole room agrees with the cruelty. It also keeps the bullying alive. There is always another way.' },
          { label: 'Get up, walk over, and sit with the kid eating alone.', rating: 3,
            feedback: 'Big move. Your body said "this person is not alone" without you having to say a word. You did not have to fight the bullies. You just changed who had company.' },
          { label: 'Tell a teacher quietly after lunch what you saw.', rating: 3,
            feedback: 'This is upstander work too. Adults can only help if they know it is happening. Reporting bullying is not snitching, it is protecting.' },
          { label: 'Do nothing because it is not your problem.', rating: 1,
            feedback: 'Bullying only works when the audience stays silent. Doing nothing IS doing something, even if it does not feel that way.' }
        ] },
      { id: 'recess_chase', icon: '🏃', title: 'The chase at recess',
        setup: 'A kid from your class is running away from a group of three boys at recess. The group is laughing and trying to grab their backpack. The kid looks scared.',
        choices: [
          { label: 'Run and grab a recess monitor right away.', rating: 3,
            feedback: 'Perfect call. This is bigger than something you can handle alone. An adult has the authority to stop it, and the kid being chased needs help NOW.' },
          { label: 'Run after the group and yell "leave them alone!"', rating: 2,
            feedback: 'Brave but risky. Now you might become the next target. Sometimes shouting works, but for a chase situation, getting a monitor is faster AND safer.' },
          { label: 'Pretend you didn’t see it.', rating: 1,
            feedback: 'You saw it. Pretending you didn’t means the kid being chased is even more alone. Even one person noticing makes a difference.' },
          { label: 'Tell the kid afterwards "I saw what happened. Are you ok?"', rating: 2,
            feedback: 'This matters. After-the-fact kindness is real kindness. But for a chase happening RIGHT NOW, getting an adult is the highest-leverage move.' }
        ] }
    ],
    middle: [
      { id: 'locker_push', icon: '🏫', title: 'The locker incident',
        setup: 'Between classes, you see a kid get shoved into a locker. The kid who did the shoving laughs and walks away. Two other kids watched and laughed too. The kid in the locker is trying to act like it is no big deal.',
        choices: [
          { label: 'Walk past — you do not want to get involved.', rating: 1,
            feedback: 'Walking past sends the message that this is normal. It is not normal. Even small acknowledgment ("hey, you good?") matters more than silence.' },
          { label: 'Stop, ask "are you ok?", and walk with them to class.', rating: 3,
            feedback: 'Quietly powerful. You named what you saw without escalating. You offered company. The kid who shoved them just saw that the audience is not all on their side.' },
          { label: 'Yell at the kid who did the shoving in the hallway.', rating: 2,
            feedback: 'The instinct to confront is real, but public confrontation often makes the situation worse and can make the target feel MORE exposed. A private word later, or telling a teacher, often lands better.' },
          { label: 'Quietly text the kid later: "saw what happened, that was not ok, here if you need to talk."', rating: 3,
            feedback: 'Excellent. Sometimes the support that matters most is private, comes a few hours later, and asks for nothing back. You gave them a witness who knows their version is real.' }
        ] },
      { id: 'group_chat_real', icon: '👥', title: 'The group exclusion',
        setup: 'Your friend group has decided to "freeze out" one person — no one talks to them, no one sits with them, no one invites them to anything. Today at lunch your friends laugh that they "finally got the hint." The frozen-out person is sitting two tables over alone.',
        choices: [
          { label: 'Stay quiet. Your friends will turn on you if you push back.', rating: 1,
            feedback: 'The fear is real and the social cost is real. But silence is what makes group exclusion work. At minimum, you can choose not to participate even if you cannot stop it.' },
          { label: 'Pick up your tray and go eat with the person who got frozen out.', rating: 3,
            feedback: 'Major move. The whole "freeze out" only works because everyone goes along. The moment ONE person says no, the spell breaks. You might pay a social cost. You also might give other people permission to do the same thing tomorrow.' },
          { label: 'Privately tell one trusted friend: "this is not okay, I am not doing it anymore." See if they will join you.', rating: 3,
            feedback: 'Coalition building. Way more sustainable than going it alone. Two people leaving a "freeze out" is enough to start cracking it open. This is actually how social change usually happens.' },
          { label: 'Pull the leader of the freeze-out aside and ask why.', rating: 2,
            feedback: 'Sometimes this works. Sometimes the leader has a reason worth knowing. But often "we just don’t like them" is the whole reason, and a private question won’t change behavior. Pair it with one of the other moves.' }
        ] },
      { id: 'gym_mock', icon: '🏀', title: 'Public mocking in gym',
        setup: 'In gym class, a kid keeps missing the layup drill. A group of kids start imitating them, exaggerating how badly they missed. The teacher is at the other end of the gym. The kid is turning red and starting to tear up.',
        choices: [
          { label: 'Loudly say "shut up — leave them alone."', rating: 2,
            feedback: 'The protective instinct is right. The volume can backfire — it puts a spotlight on the kid being mocked AND on you. Try lower and more direct: a quiet "knock it off" that does not require the whole class as an audience.' },
          { label: 'Walk over and casually say "want to try with me?" Do the next drill side by side.', rating: 3,
            feedback: 'Beautiful move. You changed the dynamic without naming it. The kid being mocked is no longer alone in the drill. The mockers lost their audience. You did all of that without escalating.' },
          { label: 'Do nothing and avoid eye contact with the kid being mocked.', rating: 1,
            feedback: 'The avoidance of eye contact is the part that hurts. Even a small "I see you, I do not agree with this" look across the gym matters. You do not have to fix it. You just have to not look away.' },
          { label: 'Go get the teacher right then.', rating: 3,
            feedback: 'Right move when the situation is escalating and you cannot intervene safely yourself. Teachers have authority you do not. Telling them is helping the kid being mocked, not snitching.' }
        ] }
    ],
    high: [
      { id: 'rumor_text', icon: '🗣️', title: 'The rumor at the party',
        setup: 'At a party, you hear someone you sort-of know start telling a graphic, untrue story about a girl in your grade. The story is sexual, dehumanizing, and people are laughing. The girl is not there.',
        choices: [
          { label: 'Laugh along quietly so you blend in.', rating: 1,
            feedback: 'In rooms where rumors get told, the laughers are the audience that makes it worth telling. Even silent disengagement (turning away, leaving the group) costs the rumor energy.' },
          { label: 'Say "that is not actually true, I know her." Then change the subject.', rating: 3,
            feedback: 'Strong move. You named the lie without making a scene. You used social standing to defend someone who is not in the room. Most rumors deflate when one person breaks the consensus.' },
          { label: 'Pull the storyteller aside later: "the thing you said about her — that was not okay."', rating: 3,
            feedback: 'Private accountability often works better than public confrontation. They might brush it off, but you planted a real consequence: someone they know saw what they did and did not let it slide.' },
          { label: 'Tell the girl what was said about her so she can defend herself.', rating: 2,
            feedback: 'Sometimes she needs to know. Sometimes telling her just spreads the harm. If you tell her, frame it carefully ("I want to tell you what people are saying so you can decide what to do") and offer to back her up. Do not just hand her the wound.' }
        ] },
      { id: 'isolate_friend', icon: '⛓️', title: 'When your group becomes the problem',
        setup: 'You have been part of a tight friend group for years. Lately the group has been systematically isolating one member — passive aggression, last-minute plan changes that exclude them, inside jokes designed to hurt. You see the target shrinking. You also have a lot to lose by speaking up.',
        choices: [
          { label: 'Just distance yourself from the group quietly.', rating: 2,
            feedback: 'This protects you and breaks complicity. It does not help the person being isolated. If you can, name what you saw to them: "I noticed what was happening. I am sorry I did not say more sooner."' },
          { label: 'Call the group out at the next hangout — name what you have been seeing.', rating: 3,
            feedback: 'High risk, high impact. You may lose the group. You may also be the one who breaks a pattern that was hurting someone. Both can be true. Long-term, having said it usually matters more to who you become than the group fallout matters in the moment.' },
          { label: 'Tell the isolated friend privately: "I have noticed. You are not crazy. I am sorry."', rating: 3,
            feedback: 'Sometimes the most healing thing a witness can do is confirm reality. Being slowly isolated and gaslit is one of the lonelier human experiences. Naming it to the target is real solidarity.' },
          { label: 'Wait it out — maybe the group dynamic will shift naturally.', rating: 1,
            feedback: 'It rarely shifts on its own. Group isolation is a pattern that consolidates over time. The longer everyone stays silent, the more the target internalizes that there must be a reason.' }
        ] },
      { id: 'ally_target', icon: '🏳️‍🌈', title: 'When the harm is identity-based',
        setup: 'A peer is being relentlessly mocked using slurs or jokes about their race, gender, sexuality, or disability. The harassment has been going on for weeks. School discipline has not stopped it. The target is starting to skip school.',
        choices: [
          { label: 'Stay out of it — identity is complicated and you might say the wrong thing.', rating: 1,
            feedback: 'The fear of saying the wrong thing is understandable. But staying out makes the target carry it alone. Imperfect support is almost always better than silence.' },
          { label: 'Talk to the target: ask what they actually want from people around them.', rating: 3,
            feedback: 'Often the most useful thing. Some targets want public allyship. Some want quiet company. Some want help reporting. Some want you to leave it alone. Letting them lead is respect.' },
          { label: 'Document everything you witness and bring it to the dean or a school psychologist together with allies.', rating: 3,
            feedback: 'Identity-based harassment is often a Title VI or Title IX issue. Schools have legal obligations once they are formally notified. Documentation makes it harder for the system to claim it did not know.' },
          { label: 'Publicly confront the harassers on social media to shame them.', rating: 2,
            feedback: 'Sometimes warranted, often backfires. Public shaming can entrench the harassers and pull more attention to the target. Direct, documented reporting through formal channels usually does more.' }
        ] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Repair pathway (for students who have caused harm) ──
  // The hard, missing piece in most anti-bullying tools.
  // Restorative practice, not performative apology.
  // ══════════════════════════════════════════════════════════════
  var REPAIR_STEPS = {
    elementary: [
      { n: 1, icon: '🪞', title: 'Tell yourself the truth',
        body: 'Say out loud what you did. Not "I might have" or "they think I". Just the real words: "I made fun of them. I hurt them." Owning it is step one. You cannot fix something you will not name.' },
      { n: 2, icon: '🤲', title: 'Say a real sorry — to them',
        body: 'A real sorry has three parts: 1) what you did, 2) that you know it hurt them, 3) what you will do differently. "I am sorry I called you that name. I know it hurt your feelings. I will not do it again." That is it. No buts.' },
      { n: 3, icon: '🛠️', title: 'Repair what you can',
        body: 'If you broke something, help fix it. If you spread a rumor, tell people it was not true. If they lost a friend because of you, do not push to be that friend right away — let them choose if and when.' },
      { n: 4, icon: '🌱', title: 'Change what comes next',
        body: 'The biggest part of repair is what you do tomorrow, and the day after that. Treat the person well even if you are not friends. Stand up for others when you see what you used to do. Be the kid who broke the pattern.' }
    ],
    middle: [
      { n: 1, icon: '🪞', title: 'Acknowledge what you did, without softening it',
        body: 'The hardest part: actually look at it. Not "things got weird with them" — "I was cruel to them on purpose, for weeks." Soft language protects you, not them. The first move in repair is letting the truth land in your own body.' },
      { n: 2, icon: '🧭', title: 'Get curious about why',
        body: 'You did this for a reason. Maybe you were hurt and passed it on. Maybe you wanted to belong somewhere and they were the cost. Maybe it felt powerful. Knowing why is not an excuse — it is what lets you stop. Patterns you do not understand keep running you.' },
      { n: 3, icon: '🤲', title: 'Make a real apology — on their terms',
        body: 'A real apology has no "but," no "if you felt that way," no "I was going through stuff." It has: 1) what you did, named clearly, 2) recognition of what it cost them, 3) what you are doing to make sure it does not happen again. And then — and this is the hard part — you let them decide if they want to accept it. Or talk to you at all.' },
      { n: 4, icon: '🔧', title: 'Repair where you can, accept where you cannot',
        body: 'If you spread a rumor, correct the record publicly. If a group ran with your lead in excluding someone, talk to the group. If they do not want contact with you anymore, that is part of the cost. Repair is not about getting forgiveness — it is about doing the work whether or not forgiveness comes.' },
      { n: 5, icon: '🌱', title: 'Become the person you wish you had been',
        body: 'The most meaningful apology is your behavior over the next six months. Speak up when you see other people doing what you used to do. Choose kindness in moments where you would have chosen cruelty. The repair is the rest of your life, not one conversation.' }
    ],
    high: [
      { n: 1, icon: '🪞', title: 'Sit with it — really sit with it',
        body: 'There is a kind of person who hurts someone, feels bad for a day, and then absolves themselves so they can move on. Do not be that person. Let it land. Notice the part of you that wants to look away. The looking-away IS the pattern that lets people keep doing harm.' },
      { n: 2, icon: '🧭', title: 'Trace the why — but do not trade it for accountability',
        body: 'You did this because of something. Maybe pain you were carrying. Maybe a status game. Maybe a model you grew up watching. Understanding the source is essential AND it is not a moral pass. Both can be true. "Hurt people hurt people" is a description of how cycles work, not a permission slip.' },
      { n: 3, icon: '🤲', title: 'Repair on their terms — even if it costs you',
        body: 'A genuine apology centers the person you hurt, not your need to feel forgiven. Name what you did with no qualifiers. Acknowledge the specific impact, not the generic "if you were hurt." Offer concrete repair (correction, distance, public defense, financial restitution if relevant). And then accept that they may not want anything from you ever again. That is part of what your action cost.' },
      { n: 4, icon: '🔧', title: 'Address the systems you used',
        body: 'You probably did not do this in a vacuum. A group laughed along. A norm let it happen. An institution looked away. Part of real repair is dismantling what enabled it: leaving the friend group that bonds through cruelty, calling out a coach who looks the other way, pushing for restorative policy at your school. The harm is bigger than you and so is the repair.' },
      { n: 5, icon: '🌱', title: 'Track the long arc',
        body: 'Repair is measured in years, not apologies. The person you become — over months and years of consistent behavior — is the only evidence anyone has that the apology was real. James Baldwin: "Not everything that is faced can be changed, but nothing can be changed until it is faced." You have faced it. Now keep going.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Self-Check: which role(s) do I find myself in? ──
  // Lightweight 6-question Likert assessment. Each item maps to one role.
  // Result is a percentage in each role (no single "your role" — students
  // can be all three at different times).
  // ══════════════════════════════════════════════════════════════
  var SELF_CHECK_ITEMS = [
    { id: 'sc_target_picked', role: 'target',
      text: 'I have been picked on, made fun of, or excluded in ways that kept happening — not just once.' },
    { id: 'sc_target_hide', role: 'target',
      text: 'I have hidden how much bullying is affecting me because I did not want to seem weak or make it worse.' },
    { id: 'sc_bully_lash', role: 'bully',
      text: 'When I have been hurt, I have sometimes taken it out on someone smaller or easier to target.' },
    { id: 'sc_bully_group', role: 'bully',
      text: 'I have gone along with my friend group when they were being cruel to someone — even when I knew it was wrong.' },
    { id: 'sc_bystander_froze', role: 'bystander',
      text: 'I have seen bullying happen and done nothing because I was scared, unsure, or wanted to stay out of it.' },
    { id: 'sc_bystander_later', role: 'bystander',
      text: 'I have thought back to a moment when I should have spoken up and wished I had.' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Courage Hierarchy (5 levels — from middle band content) ──
  // Made visual as a ladder/staircase.
  // ══════════════════════════════════════════════════════════════
  var COURAGE_LADDER = [
    { level: 1, label: 'Do not participate', desc: 'Refuse to laugh, agree, or pile on. The minimum and the foundation.', color: '#16a34a' },
    { level: 2, label: 'Walk away from it', desc: 'Visibly leave the audience. Bullying needs spectators — your absence costs the bully energy.', color: '#22c55e' },
    { level: 3, label: 'Support the target privately', desc: 'A DM later, a "hey are you ok," sitting with them at lunch. The support that lands.', color: '#0ea5e9' },
    { level: 4, label: 'Intervene publicly', desc: 'Name what is happening out loud. Higher risk, higher impact. Requires some social capital.', color: '#3b82f6' },
    { level: 5, label: 'Work to change the system', desc: 'Push for restorative policy, train other peers, build coalitions. Long arc, deep change.', color: '#7c3aed' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Bully-Victim deep dive ──
  // The clinically most-vulnerable group. Currently a one-line mention.
  // ══════════════════════════════════════════════════════════════
  var BULLY_VICTIM_CONTENT = {
    elementary: [
      { icon: '🪞', title: 'Both — and that is hard',
        body: 'Some kids get bullied AND bully others. That can feel really confusing because you have been on both sides. You know how much it hurts AND you have caused that hurt. Holding both of those things at once is hard.' },
      { icon: '🤲', title: 'It is not because you are bad',
        body: 'Kids who get hurt often pass the hurt on. That does not mean you are a bad person — it means the hurt has to go somewhere. Learning to let it stop with you instead of passing it on is one of the bravest things a person can do.' },
      { icon: '🌱', title: 'You need extra care',
        body: 'You are carrying two things at once. Talk to a school counselor, a parent, or someone you trust. You deserve help with the part where you got hurt AND help figuring out how to stop hurting others. Both at the same time.' }
    ],
    middle: [
      { icon: '🪞', title: 'You are both — and the research sees you',
        body: 'In bullying research, "bully-victims" — students who are both perpetrators AND targets — have the WORST mental health outcomes of any group. Worse than pure targets. Worse than pure bullies. This is not a moral judgment about you. It is a description of how much you are carrying.' },
      { icon: '🧠', title: 'Why this pattern develops',
        body: 'When someone is hurt and does not have safe ways to process it, the pain often comes out sideways — at someone smaller, easier, or more vulnerable. This is one of the most well-documented dynamics in developmental psychology. It is not a character flaw. It is a survival strategy that stopped working.' },
      { icon: '⚖️', title: 'Punishment usually makes it worse',
        body: 'Bully-victims are the students most likely to be suspended, expelled, and excluded — which further isolates them and compounds the harm. Restorative approaches, trauma-informed support, and clinical care work. Punishment alone does not.' },
      { icon: '🤝', title: 'What actually helps',
        body: 'You need adults who can hold BOTH parts of you: the kid who has been hurt AND the kid who has hurt others. Without splitting. Without dismissing either side. A good school counselor, school psychologist, or therapist trained in trauma can do this. Ask for one. Keep asking until you find one.' },
      { icon: '🌱', title: 'You can break this pattern',
        body: 'The Repair pathway in the Cycle tab is for you. So is the Right-After. So is the Helping a Friend. You belong in all of them. The work is harder for bully-victims because you are healing the wound AND learning to stop passing it on at the same time. That work is real, and it is possible.' }
    ],
    high: [
      { icon: '🪞', title: 'The hardest group to be in',
        body: 'Longitudinal research (Copeland et al., Olweus, others) is consistent: bully-victims carry significantly higher rates of depression, anxiety, suicide ideation, and PTSD into adulthood than pure targets or pure perpetrators. This is not because you are weaker. It is because being in both roles is genuinely harder, and the systems around you are usually worse at recognizing it.' },
      { icon: '🧠', title: 'The neurobiology of "hurt people hurt people"',
        body: 'Chronic stress dysregulates the systems your brain uses to inhibit impulses and read others\' emotions accurately. When you are hyper-aroused from your own trauma, you over-read threat in neutral faces, you under-read distress in people you are harming, and you have less capacity to brake on aggressive impulses. None of this excuses harming others. ALL of it should change how the systems around you respond.' },
      { icon: '⚖️', title: 'Why zero-tolerance fails this group hardest',
        body: 'APA review (2008): zero-tolerance policies disproportionately push out bully-victims — exactly the students most in need of clinical support. Suspending you for behaviors that emerged from your own untreated trauma is not justice. It is the system passing the harm further down the chain. The research on this is unambiguous.' },
      { icon: '🤝', title: 'What good support looks like',
        body: 'Trauma-informed care. Skilled clinical support (school psychologist, therapist with trauma training). Restorative — not just punitive — accountability. Real address of whatever is happening at home, online, or in earlier relationships that started the pattern. A safety plan that holds the people you have hurt AND your own wellbeing as both real.' },
      { icon: '🌱', title: 'Becoming a cycle breaker is your work',
        body: 'And it is harder for you than for almost anyone else. The work means: facing the harm you have caused (Repair pathway) without dissolving in shame, building skills to regulate before the impulse hits, finding adults who can hold the whole story, getting clinical help if you need it. The fact that you are reading this is part of that work.' },
      { icon: '📞', title: 'Direct lines if you need them',
        body: '988 (call or text) — Suicide & Crisis Lifeline. Crisis Text Line: text HOME to 741741. If you are using substances or self-harm to manage what you are carrying, those are signs you need clinical support sooner, not later. Asking is the move.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Power Dynamics primer ──
  // Most anti-bullying tools pretend all students have equal power to
  // intervene. They don't. This section names that honestly.
  // ══════════════════════════════════════════════════════════════
  var POWER_DYNAMICS = {
    middle: [
      { icon: '⚖️', title: 'Not everyone can do every move',
        body: 'Telling a small 6th grader to "stand up to the 8th grader pushing them" is bad advice. Telling a queer kid to publicly call out a homophobic comment in a hostile room is bad advice. Some moves require social capital or physical safety that not every student has. The Courage Hierarchy starts low for a reason.' },
      { icon: '🔍', title: 'Who has power in your school',
        body: 'Power at school comes from: physical size, popularity, athletic status, family wealth, race in a school where it confers power, perceived sexuality, grade level, club leadership, friendship with the cool group. Naming honestly what kinds of power you have AND do not have is the first step in picking moves that are actually safe.' },
      { icon: '🛡️', title: 'If you have less power',
        body: 'Stick to lower-risk moves: proximity (just sit nearby), private support after, anonymous reporting, finding allies BEFORE the moment. You are not obligated to risk your own safety. The witnesses with the most power should carry the most cost — not the targeted kids themselves.' },
      { icon: '💪', title: 'If you have MORE power',
        body: 'You can do the higher-risk moves at lower personal cost than most of your peers. That is not a guilt trip — it is a fact about your situation. Using your standing to defend someone with less of it is one of the most meaningful things you can do with what you have.' }
    ],
    high: [
      { icon: '⚖️', title: 'Power is unevenly distributed and that changes the math',
        body: 'Anti-bullying programs that ignore power dynamics tend to put the burden of intervention on students with the least cushion. Asking a freshman of color to publicly challenge a senior using a slur, in front of an audience, in a school that has tolerated it, is asking that freshman to risk a lot. The research on bystander intervention should always be read alongside who actually pays the cost.' },
      { icon: '🔍', title: 'Mapping social capital honestly',
        body: 'Useful categories: structural power (race, gender, sexuality, class in the school context), positional power (athletic captain, club president, popular friend group), relational power (close to the people doing harm or close to the target), and protected power (have an adult in the room — teacher, coach, parent — who would back you). Most students have some, few have all.' },
      { icon: '🛡️', title: 'Moves calibrated to actual safety',
        body: 'For students with less social capital: anonymous reporting, after-the-fact private support, building quiet allyship with peers, documenting incidents for later escalation, working through trusted adults. These are not "lesser" upstander moves — in many situations they are the smartest ones. They are also far less likely to be celebrated, which is a problem worth naming.' },
      { icon: '💪', title: 'The redistribution argument',
        body: 'The students best positioned to take the public, high-risk moves are usually the ones who would pay the least cost for taking them — popular kids, athletes, students with confidence and social standing. They have a particular responsibility precisely BECAUSE the moves are cheaper for them than for the kid being targeted. Allyship has economics.' },
      { icon: '🤝', title: 'Power-sharing through coalition',
        body: 'The single best way to make higher-risk moves possible for lower-power students is to build coalitions BEFORE the moment hits. A group of three peers committed to backing each other in a confrontation distributes the cost. One student speaking up alone in a hostile room is risky. Three students saying "this is not okay" together is a different math entirely.' },
      { icon: '⚠️', title: 'When the power imbalance is adult-on-student',
        body: 'A separate category. When a teacher, coach, or other adult is the source of harm, student-led intervention has limits — you cannot peer-pressure an adult out of bullying you. Document, find an adult ally outside the chain of command, talk to a school psychologist or counselor, and (for federal civil rights violations) escalate to district, state, or OCR. Adult-on-student harm is not a normal upstander situation.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── De-escalation Skills ──
  // What to do when your upstander move makes things hotter, not safer.
  // Real protocol for keeping yourself + the target safe.
  // ══════════════════════════════════════════════════════════════
  var DEESCALATION = {
    signals: [
      { icon: '🔊', label: 'Voice rising or sharpening' },
      { icon: '👊', label: 'Fists clenched, jaw tight, body squaring up' },
      { icon: '👥', label: 'A crowd forming and circling in' },
      { icon: '🚪', label: 'Exits getting blocked or the space tightening' },
      { icon: '🗣️', label: 'Personal insults shifting to threats or slurs' },
      { icon: '📱', label: 'Phones coming out to record (escalates because of the audience)' }
    ],
    verbal: [
      { do: 'Lower YOUR voice deliberately',
        why: 'People in escalation tend to mirror tone. If you go quieter, the other person often unconsciously matches you. Going louder almost always escalates further.' },
      { do: 'Use their name, calmly',
        why: 'Names interrupt the autopilot. "[Name], hey." Just that. Names trigger a different part of the brain than insults do.' },
      { do: 'Name the moment, not the person',
        why: '"This is getting really hot. Let me take a breath." NOT: "You\'re being aggressive." The first one is about the situation. The second is an accusation that escalates.' },
      { do: 'Offer an off-ramp',
        why: '"Let\'s walk outside for a sec." "Hey, I need to use the bathroom — come with me?" Give the people involved a face-saving way to leave the situation without losing.' },
      { do: 'Stop talking when they talk',
        why: 'Talking over someone in escalation makes it worse. Let them finish, even if what they are saying is ugly. Silence is a tool. Use it.' }
    ],
    physical: [
      { do: 'Stay outside arm\'s reach',
        why: 'About 4-5 feet. Close enough to be present, far enough that nothing physical can happen accidentally. Closer than that reads as aggressive even when you mean to be supportive.' },
      { do: 'Keep your hands visible and low',
        why: 'Open hands at waist level. Not crossed. Not pointing. Not in pockets. Hands behind your back also reads threatening. Visible + low + relaxed.' },
      { do: 'Position yourself near an exit',
        why: 'Always know where you can leave. If your back is to a wall, the situation can corner you fast. Hallway near a doorway is better than the middle of a room.' },
      { do: 'NEVER put yourself between two people who might fight',
        why: 'You become both the target and the obstacle. People in fight mode swing at whoever is closest. Use words, distance, distraction, an adult — never your body as a wall.' },
      { do: 'If weapons are visible or threatened: extract, do not engage',
        why: 'A knife, anything that could be a weapon, anyone saying "I will kill you" with credibility — leave the area, get an adult, call 911 if needed. This is not upstander territory anymore. This is a safety threat.' }
    ],
    after: [
      { do: 'Get yourself somewhere safe first',
        why: 'You cannot help anyone else if you are still in the threat zone. Bathroom, classroom, counselor\'s office. Then breathe.' },
      { do: 'Tell an adult, with specifics',
        why: 'Time, place, who was there, what was said, where it was heading. Not "there was a thing in the hallway" — specific details. This is your evidence and the school\'s grounds for action.' },
      { do: 'Check on the target later',
        why: 'They were in a much higher-cost version of what you just experienced. A "hey, that was scary, are you okay?" matters.' },
      { do: 'Notice your own body afterwards',
        why: 'You will probably be jangly, shaky, hungry, exhausted, or all four. That is normal — your nervous system was running a stress response. Eat, drink water, move, talk it out with someone. Do not just push through.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Coalition Building how-to ──
  // "Coalition Building" is listed as a high-risk move in upstander
  // moves but never actually taught. This is the how.
  // ══════════════════════════════════════════════════════════════
  var COALITION_STEPS = [
    { n: 1, icon: '👁️', title: 'Notice the other unsettled witnesses',
      body: 'In any group where harm is happening, look around. Some people are clearly enjoying it. Some are clearly the targets. But there is almost always a third group: kids who look uncomfortable but are not saying anything. That group is your coalition. They are already on your side — they just need permission and company.' },
    { n: 2, icon: '🤐', title: 'Start the conversation in private',
      body: 'Not at the lunch table. Not in the group chat. A real conversation: "Hey, did you see what happened today? It bothered me. Did it bother you?" Most people will say yes. That single conversation has just made you 2 instead of 1.' },
    { n: 3, icon: '🧭', title: 'Make a shared plan, not an ask',
      body: 'Bad version: "Can you back me up if I say something?" (puts the cost on them in the moment). Good version: "What if next time it happens, we both say something? Even just one sentence each — I will go first, you go second." A specific plan two people agreed to ahead of time is wildly different from "I hope someone backs me up."' },
    { n: 4, icon: '➕', title: 'Add one more — keep adding',
      body: 'Two is better than one. Three is better than two. Each additional coalition member roughly doubles the safety AND impact of intervention. Three peers saying "this is not okay" together breaks the consensus the bully relies on. Four or five makes the room actually shift.' },
    { n: 5, icon: '🎯', title: 'Coordinate the move',
      body: 'When the moment comes, you do not all have to do the same thing. One can name what is happening. One can walk over to the target. One can go get an adult. One can just stand close. Different moves, same coalition. The fact that you are coordinated is the thing the bully reads.' },
    { n: 6, icon: '🛡️', title: 'Watch each other\'s backs after',
      body: 'Bullies often try to pick off coalition members one at a time after the moment ("I cannot believe X said that, what is their problem"). Check in with each other privately. If anyone in the coalition is getting targeted, the rest of you treat that as the SAME situation and respond together. The coalition is a real thing, not a one-time event.' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Identity-based harassment — what is different + what helps ──
  // Race, gender, sexuality, religion, disability targeting has unique
  // features AND specific federal protections. Currently only a one-line
  // mention in glossary — this fills it in.
  // ══════════════════════════════════════════════════════════════
  var IDENTITY_HARASSMENT = {
    middle: [
      { icon: '🎯', title: 'It is not "just" personal',
        body: 'When someone gets bullied for who they ARE — race, gender, sexuality, religion, disability, language, body, family — the harm hits differently. It tells the target they do not belong, not just that one person dislikes them. That message lands in a deeper place and stays longer.' },
      { icon: '⚖️', title: 'It is often illegal',
        body: 'Identity-based harassment in U.S. schools falls under federal civil rights law (Title VI for race / national origin / religion, Title IX for sex / gender / sexuality, Section 504 and ADA for disability). Schools have specific obligations once they know. Most do not.' },
      { icon: '🛡️', title: 'How to support a targeted peer',
        body: 'Ask what they actually want. Some want public allyship. Some want quiet company. Some want help reporting. Some want you to not bring it up at all. Following their lead IS the support.' },
      { icon: '📝', title: 'If you are the target',
        body: 'Document specific incidents (words, dates, witnesses). Tell at least one trusted adult — ideally one with cultural competence around the identity being targeted. If the school is dismissive, the U.S. Department of Education Office for Civil Rights accepts complaints at ocrcas.ed.gov.' }
    ],
    high: [
      { icon: '🎯', title: 'Why identity-based harassment hurts differently',
        body: 'Research is consistent: identity-based bullying is associated with significantly higher rates of depression, anxiety, and suicidal ideation than non-identity-based bullying (CDC, GLSEN, Trevor Project). The mechanism is "minority stress" — chronic exposure to messages that you do not belong takes a measurable physiological toll on top of the specific incident.' },
      { icon: '⚖️', title: 'Federal protections',
        body: 'Title VI (race, color, national origin, religion since 2010 guidance), Title IX (sex, gender identity, sexual orientation), Section 504 / ADA (disability) — all create specific school obligations once the school is on notice. Once the school knows, it MUST investigate and take steps to stop the harassment. Failure to do so can trigger an OCR complaint.' },
      { icon: '🗂️', title: 'Documenting strategically',
        body: 'For an OCR complaint or civil rights claim, what matters: dates, words used, who said them, who witnessed, what you reported to the school, when, to whom, and what (if anything) the school did. Email is better evidence than verbal conversations. Save screenshots of any digital harassment with timestamps visible.' },
      { icon: '🛡️', title: 'Allyship that does not center yourself',
        body: 'Ask the targeted person what they want — do not assume. Believe what they tell you about their own experience. Resist the urge to perform allyship publicly in a way that pulls attention to you. The work is mostly invisible: showing up, refusing to let comments slide, building rooms where people are safer.' },
      { icon: '🤝', title: 'Coalition matters more here',
        body: 'For identity-based harassment, one upstander is good and a coalition is better. Talking quietly to other peers about what is happening — and building a group response — distributes the cost of intervention and is harder for the school to dismiss as "one student\'s perception."' },
      { icon: '📞', title: 'Specific support lines',
        body: 'The Trevor Project (LGBTQ+ youth): 1-866-488-7386 or text START to 678-678. StopBullying.gov has state-specific civil rights resources. The ACLU\'s "Know Your Rights" pages cover school harassment for several identity categories. Local civil rights organizations often have free student advocacy support.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── For the witness who froze — healing the shame ──
  // Many students carry a memory of NOT acting when they should have.
  // The shame is real; the path forward is real too.
  // ══════════════════════════════════════════════════════════════
  var WITNESS_HEAL_STEPS = {
    elementary: [
      { n: 1, icon: '🪞', title: 'It is okay that you froze',
        body: 'When something scary happens, brains sometimes freeze. That is a real thing your body does — it is not because you are weak or a bad friend. It is what brains do under fear.' },
      { n: 2, icon: '💬', title: 'Tell them you saw it',
        body: 'Even if it was days ago, you can still go up and say "I saw what happened. That was not okay. I should have said something." That sentence is medicine for them AND for you.' },
      { n: 3, icon: '🌱', title: 'Practice for next time',
        body: 'Pick ONE upstander move you would try if it happened again. Say it out loud. Knowing what you would do makes it more likely you will actually do it.' }
    ],
    middle: [
      { n: 1, icon: '🪞', title: 'The freeze response is biological, not moral',
        body: 'When you witness harm, your nervous system runs a fight-flight-freeze calculation in milliseconds. If your brain reads "I do not have enough power here to safely act," it freezes. That is not weakness. That is your brain doing its job. The shame you feel afterwards is your VALUES talking — and the values are good. The freeze was not.' },
      { n: 2, icon: '🧠', title: 'Carrying it is normal, and the carrying has costs',
        body: 'Most people have at least one memory of NOT acting when they should have. Many carry it for years. The unhealed version becomes a low background hum of "I am not someone who shows up." That is not who you are. That is a wound that did not get tended.' },
      { n: 3, icon: '💬', title: 'Repair after the fact is real repair',
        body: 'Find the person. Say it. "I saw what happened with [event]. I should have said something and I did not. I am sorry. I am here now." You do not have to fix it. The acknowledgment IS the medicine — for them, and for the part of you that has been carrying it.' },
      { n: 4, icon: '🛠️', title: 'Train the muscle for next time',
        body: 'Moral courage is not a trait — it is a skill. Every time you speak up about something small (a casual mean comment, an inside-joke that punches down), you build the neural pathways that make it easier to speak up about something big. The Practice tab is for this. So is the AI Rehearsal in Moves.' },
      { n: 5, icon: '🌱', title: 'Forgive yourself out loud',
        body: 'Out loud, in a private place: "I did not act. I am sorry. I am not going to fix it by hating myself. I am going to be the person I want to be from here." Shame keeps you stuck. Self-compassion is what lets you actually change.' }
    ],
    high: [
      { n: 1, icon: '🪞', title: 'Moral injury is a real clinical thing',
        body: 'When you witness harm and do not act on your values, the gap between "who I think I am" and "what I did" creates something psychologists call moral injury. It is studied in combat veterans, healthcare workers, and witnesses to atrocity. The shame is not a sign of weakness. It is a sign that your values are intact AND that they got crossed.' },
      { n: 2, icon: '🧠', title: 'The freeze was not a choice',
        body: 'The fight-flight-freeze calculation happens in your amygdala in 50-200 milliseconds, before your conscious mind has access. People who freeze in crisis are not less brave than people who fight. Their nervous systems made a different read about what was safer. Hannah Arendt called this "the banality of evil" — but a more accurate read is "the predictable freeze of ordinary humans in conditions they were not prepared for." Preparation matters. So does practice.' },
      { n: 3, icon: '🔗', title: 'Unaddressed witness harm becomes ambient',
        body: 'Unhealed moral injury does not just sit there. It often shows up as low-grade depression, cynicism about your own goodness, avoidance of similar situations, or a self-image of "I am not actually someone who shows up." Naming what happened — to yourself first, then to others — is what starts to interrupt the pattern.' },
      { n: 4, icon: '💬', title: 'Reach out, with the right framing',
        body: 'Find the person. Do not lead with your guilt — they should not have to manage your feelings. Lead with acknowledgment: "I saw what happened with [event]. I did not say anything. I should have. I am sorry. I am not asking for anything from you — I just wanted you to know I saw it AND that I should have done more." Then accept whatever response they have, including no response at all.' },
      { n: 5, icon: '🛠️', title: 'Repetition is the only training that works',
        body: 'Moral courage builds the way physical courage does — through small reps. The AI Rehearsal (Moves tab) is for this. So is calling out a small comment in a low-stakes moment so you have practiced the neural pathway BEFORE the high-stakes moment hits. People who reliably show up in crises are not braver. They have rehearsed.' },
      { n: 6, icon: '🌱', title: 'The work is becoming a person you trust',
        body: 'The end goal is not absolution for the freeze. It is becoming someone you can trust to show up next time. That is built through honest reckoning + practice + repair attempts when possible. It is not built through self-flagellation. The kindest, hardest work you can do is to keep going.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Badge catalog ──
  // Maps badge IDs to their display info. Populated as users earn them.
  // ══════════════════════════════════════════════════════════════
  var BADGE_CATALOG = {
    self_check_done:    { id: 'self_check_done',    label: 'Honest Mirror',           icon: '🪞', color: '#7c3aed', desc: 'Took the role self-check' },
    pledge_sealed:      { id: 'pledge_sealed',      label: 'Pledge Sealed',           icon: '🏆', color: '#ca8a04', desc: 'Sealed your Upstander Pledge' },
    practice_courage:   { id: 'practice_courage',   label: 'Practiced Courage',       icon: '🎭', color: '#2563eb', desc: 'Locked in strong responses in Practice' },
    repair_walked:      { id: 'repair_walked',      label: 'Walked the Repair Path',  icon: '🔧', color: '#dc2626', desc: 'Completed the Repair pathway' },
    self_care:          { id: 'self_care',          label: 'Took Care of Yourself',   icon: '🛟', color: '#2563eb', desc: 'Completed the Right-After sequence' },
    trusted_circle:     { id: 'trusted_circle',     label: 'Built Your Circle',       icon: '👥', color: '#059669', desc: 'Listed 3+ trusted adults' },
    witness_logged:     { id: 'witness_logged',     label: 'Witness Logged',          icon: '📓', color: '#1e3a8a', desc: 'Saved a Witness Log entry' },
    rehearsed:          { id: 'rehearsed',          label: 'Rehearsed With AI',       icon: '🎤', color: '#7c3aed', desc: 'Got AI feedback on a rehearsal' },
    packet_made:        { id: 'packet_made',        label: 'Bridge Builder',          icon: '🖨️', color: '#0e7490', desc: 'Generated a counselor handoff packet' },
    healed_witness:     { id: 'healed_witness',     label: 'Faced What I Did Not Do', icon: '✨', color: '#9333ea', desc: 'Walked the witness-shame healing path' }
  };

  // ══════════════════════════════════════════════════════════════
  // ── Helping a friend who is being targeted ──
  // Different skill set from upstander-in-the-moment. This is about
  // presence over time, not intervention in the moment.
  // ══════════════════════════════════════════════════════════════
  var HELPING_FRIEND = {
    scripts: [
      { situation: 'You see it happening — they look like they want the floor to swallow them',
        say: '"Hey, want to walk to next class together?"',
        why: 'Soft, doable, no spotlight. You are not asking them to talk about it or perform okay-ness. You are giving them company. Sometimes the most upstander thing a peer can do is just be next to someone.' },
      { situation: 'A few hours later, when the dust has settled',
        say: '"That thing in the cafeteria — that was not okay. I saw it. I am here if you want to talk, and if you do not want to talk that is also fine."',
        why: 'Naming what happened (instead of pretending you did not see) lets them stop performing. The "or not" option matters as much as the offer — it removes the burden of having to be ready to process right away.' },
      { situation: 'A day or two later, when isolation usually starts setting in',
        say: '"I was thinking about you. Want to do something this weekend — even just hang out at one of our houses?"',
        why: 'The day-2 check-in is the one almost everyone skips. Most kids get one wave of attention right after and then nothing. Inviting them to do something concrete beats "let me know if you need anything" because it does not put the burden on them to ask.' },
      { situation: 'When you are worried they might be in a really dark place',
        say: '"This is going to sound serious. I have noticed you have been pulling away. Are you having thoughts of hurting yourself?"',
        why: 'Asking directly does NOT plant the idea — research is clear on this. It is one of the most protective things a peer can do. If they say yes, do not promise to keep it secret — get an adult involved that day, and offer to go with them.' }
    ],
    donts: [
      { what: 'Do not say "just ignore them" or "they are not worth it"',
        why: 'Dismissing the hurt is the fastest way to lose your friend\'s trust. They cannot just ignore it. If they could, it would not be hurting this much.' },
      { what: 'Do not go after the bully on your friend\'s behalf without asking',
        why: 'Often makes the situation worse, pulls more attention to your friend, and can lead to retaliation. Support them privately first. If they want public allyship, they will tell you.' },
      { what: 'Do not promise to keep suicidal thoughts secret',
        why: 'A secret like that is too heavy for a peer to carry alone. Tell your friend up front: "I will keep most things between us, but if you tell me you might hurt yourself, I am getting an adult. That is not me betraying you — that is me wanting you alive."' },
      { what: 'Do not disappear because you do not know what to say',
        why: 'You do not need the perfect words. "I do not know what to say but I am here" is enough. The presence matters far more than the script.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Right After: 5-step grounding for someone just targeted ──
  // Sister to REPAIR_STEPS. Covers the target-side aftermath.
  // ══════════════════════════════════════════════════════════════
  var RIGHT_AFTER_STEPS = {
    elementary: [
      { n: 1, icon: '🛟', title: 'Get to a safe spot',
        body: 'A bathroom stall. The library. A teacher you trust. Anywhere that is not where it happened. Your body needs a place that feels safe before you can do anything else.',
        sec: 'Cost: a few minutes' },
      { n: 2, icon: '🫁', title: 'Breathe — for real',
        body: 'In for 4 counts. Out for 6 counts. Five times. This is not silly, and it is not optional — slowing your breath actually tells your body the threat is over. Try it before reading the next step.',
        sec: 'Cost: 90 seconds' },
      { n: 3, icon: '💬', title: 'Tell one person',
        body: 'A teacher. A counselor. A parent. A friend. It does not have to be the right person. The first person who hears it carries a tiny piece of the weight so you do not have to hold it all alone.',
        sec: 'Cost: 2 minutes' },
      { n: 4, icon: '✋', title: 'Remember: it is not your fault',
        body: 'Say it out loud. "It is not my fault that they did that." Even if nothing in your brain believes it yet. The words start the work.',
        sec: 'Cost: 15 seconds' },
      { n: 5, icon: '🌱', title: 'Plan one tiny next thing',
        body: 'Pick ONE thing for the rest of today that is just for you. A drawing. A walk. A favorite snack. Something to remind your brain that the bullying is not the whole of your life.',
        sec: 'Cost: rest of today' }
    ],
    middle: [
      { n: 1, icon: '🛟', title: 'Find physical safety first',
        body: 'Bathroom, library, classroom, counselor\'s office, the long way around to your next class — whatever puts space between you and what happened. Your nervous system needs the change of environment before anything else.',
        sec: 'Cost: 1–5 minutes' },
      { n: 2, icon: '🫁', title: 'Down-regulate your body',
        body: 'A fight-or-flight response is firing right now whether or not you can feel it. Slow your breathing (in 4, out 6, five rounds). Drink water. If you can, splash cold water on your wrists or face. This is not weakness management — it is real physiology that real people do.',
        sec: 'Cost: 2 minutes' },
      { n: 3, icon: '💬', title: 'Tell at least one human',
        body: 'A teacher, counselor, parent, friend, or coach. You do not need them to fix it. You need a witness. Carrying this alone is heavier than it needs to be, and a single other person knowing changes that.',
        sec: 'Cost: 3 minutes' },
      { n: 4, icon: '✋', title: 'Resist the urge to make it about you',
        body: 'Bullying is engineered to make you feel like the problem. It is not. Whatever the bully said about you — about your body, your voice, your difference — they are projecting something they cannot face in themselves. The qualities they targeted are often your strengths. The shame that hits is real AND it is theirs to carry, not yours.',
        sec: 'Cost: ongoing' },
      { n: 5, icon: '🌱', title: 'Choose one act of self-care for today',
        body: 'Not "be productive." Not "be okay." Pick one thing that is genuinely for you, today: a long shower, a walk, the show you love, time with the friend who makes you laugh, sleep. Your job tonight is to remind your nervous system that not everything in your life is the bullying.',
        sec: 'Cost: rest of today' }
    ],
    high: [
      { n: 1, icon: '🛟', title: 'Get physical distance — then run a safety scan',
        body: 'First: move. Bathroom, hallway you can hear yourself think in, anywhere that breaks the moment. Then: ask "am I physically safe right now?" If no, go to an adult immediately. If yes, you have time to do the rest of this.',
        sec: 'Cost: 1–5 minutes' },
      { n: 2, icon: '🫁', title: 'Regulate before you decide anything',
        body: 'Acute stress response narrows cognition. Right now is the worst possible moment to make decisions about what to do, who to tell, how to respond. First task: down-regulate your body (slow breath, cold water, walk it out). Decisions come AFTER you can think again.',
        sec: 'Cost: 5–10 minutes' },
      { n: 3, icon: '📸', title: 'Document while it is fresh',
        body: 'Memory degrades fast under stress. Write down (or voice-memo) what happened: who, when, where, exact words, who else witnessed. This is for you — for your own clarity, for a future report if you decide to make one, for the moment when you wonder if you "made it bigger than it was." You did not.',
        sec: 'Cost: 5 minutes' },
      { n: 4, icon: '💬', title: 'Bring it to ONE person — your choice',
        body: 'A counselor, parent, coach, mentor, friend, or therapist. You do not have to know what you want from them. "I just want you to know this happened" is a complete sentence. Carrying this alone has costs your body absorbs whether you notice or not.',
        sec: 'Cost: 10 minutes' },
      { n: 5, icon: '🛡️', title: 'Plan one structural step in the next 48 hours',
        body: 'Not because you "should" — because depression and avoidance set in fast when bullying goes unaddressed. Pick one: file a report, change a class, ask a friend to walk with you between periods, schedule with a counselor, talk to a parent. Just one. Action breaks the freeze.',
        sec: 'Cost: 1–2 days' },
      { n: 6, icon: '🌱', title: 'Refuse to internalize their projection',
        body: 'Whatever they targeted you for — your race, your body, your voice, your sexuality, your disability, the way you exist in the world — that is information about THEM, not about you. The qualities people are bullied for at 16 are often the qualities people are admired for at 30. Hold onto that even when the body does not believe it yet.',
        sec: 'Cost: years (and worth it)' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Reference: Sources, For Educators, Glossary ──
  // ══════════════════════════════════════════════════════════════
  var US_SOURCES = [
    { name: 'Olweus, D. (1993). Bullying at school: What we know and what we can do.',
      who: 'Dan Olweus, originator of bullying research',
      what: 'Foundational work establishing bullying as a researchable phenomenon. Source for the finding that students who bully are significantly more likely to have experienced abuse or been bullied themselves.' },
    { name: 'Hawkins, Pepler & Craig (2001). Naturalistic observations of peer interventions in bullying.',
      who: 'York University / University of Toronto',
      what: 'Source for the "57% of bullying stops within 10 seconds when one bystander intervenes" finding. One of the most-cited pieces of bystander research in the field.' },
    { name: 'Copeland, W. E. et al. (2013). Adult psychiatric outcomes of bullying.',
      who: 'JAMA Psychiatry',
      what: 'Longitudinal study showing that childhood bullying victimization is associated with increased risk of depression, anxiety, and self-harm into adulthood. Source for "bullying is not a rite of passage."' },
    { name: 'APA Zero Tolerance Task Force (2008). Are zero tolerance policies effective in the schools?',
      who: 'American Psychological Association',
      what: 'Comprehensive review concluding that zero-tolerance policies increase dropout rates and disproportionately affect students of color and students with disabilities, without reducing bullying. Source for the case against punitive-only approaches.' },
    { name: 'Espelage & Swearer (2004). Bullying in American Schools: A Social-Ecological Perspective.',
      who: 'University of Nebraska / University of Illinois',
      what: 'Foundational text on the social-ecological model of bullying. Source for the finding that school environment factors (hierarchy, supervision, reward structures) predict bullying more than individual student characteristics do.' },
    { name: 'Restorative Justice in U.S. Schools (Fronius et al., WestEd 2019)',
      who: 'WestEd Justice & Prevention Research Center',
      what: 'Meta-review of restorative-practices research in K-12 settings. Source for the 40-60% reduction in repeat offenses with restorative vs. punitive approaches.' },
    { name: 'StopBullying.gov',
      who: 'U.S. Department of Health & Human Services',
      what: 'Federal resource hub with state-by-state bullying laws, reporting paths, and school obligations. Useful when you need to know what your school is legally required to do.' },
    { name: 'PACER\'s National Bullying Prevention Center',
      who: 'PACER Center',
      what: 'Resources specifically for students with disabilities, who face bullying at significantly higher rates. Free curricula, parent guides, and student-led campaign materials.' }
  ];

  var US_EDUCATORS = [
    { icon: '🎯', title: 'Punishment alone is the least effective intervention',
      body: 'The APA Zero Tolerance Task Force (2008) review is unambiguous: zero-tolerance policies do not reduce bullying. What works: restorative conferencing, social-emotional skill-building, addressing root causes. If your school still relies primarily on suspension, the research is on your side to push for change.' },
    { icon: '🕵️', title: 'Adults usually miss it',
      body: 'Self-report studies consistently find that adults are aware of only a small fraction of the bullying that students experience. Believe the kid who tells you something happened. The cost of being wrong is small. The cost of dismissing a true report is enormous.' },
    { icon: '🧭', title: 'Bully-victims need the most help',
      body: 'Students who are both perpetrators AND targets of bullying have the worst mental health outcomes of any group in the bullying literature. They are also the students most likely to be punished, suspended, and excluded — which compounds the harm. They need wraparound support, not exclusionary discipline.' },
    { icon: '🪜', title: 'The bystander effect is environmental, not characterological',
      body: 'Students who freeze in the moment are not "weak" or "complicit by nature." They are responding to predictable group dynamics. Teaching specific upstander moves (Practice tab) and building peer norms that reward intervention are far more effective than telling kids to "be brave."' },
    { icon: '🛡️', title: 'Marginalized students bear disproportionate cost',
      body: 'LGBTQ+ students, students of color, students with disabilities, and English-language learners experience higher bullying rates AND less institutional response when they report. Any anti-bullying program that does not name identity-based harassment is incomplete.' },
    { icon: '🤝', title: 'Restorative practice is not "letting them off easy"',
      body: 'Restorative conferencing is harder than suspension, not easier. The person who caused harm has to face the person they harmed, hear the impact, and make a concrete plan for repair. Done well, it has the highest reduction in repeat offenses of any intervention (Fronius et al., 2019). Done poorly — performatively, without follow-through — it can re-harm. Quality matters.' }
  ];

  // ── "If You Report" — demystifying the school-discipline + restorative process ──
  var US_REPORT_STEPS = [
    { icon: '📝', title: 'You make the report',
      body: 'You tell a teacher, counselor, school psychologist, dean, or fill out a school form. Most states’ anti-bullying laws REQUIRE schools to accept reports (including anonymous ones) and respond within a set timeframe. You do not need proof to make a report. Your account is enough to start the process.',
      tip: 'Bring screenshots, dates, names of witnesses if you have them — but do not delay reporting because you do not have a full case. Schools have an obligation to investigate.' },
    { icon: '🔍', title: 'The school investigates',
      body: 'Usually within a few school days. They may interview you, the person who allegedly caused harm, and any witnesses. Investigators are supposed to keep accounts separate (so you and the other person are not in the room together against your wishes). You should not be punished for reporting — that is retaliation, which is itself prohibited.',
      tip: 'If you feel pressured to drop the report, that is a red flag. Document the pressure and tell another adult (a parent, another counselor, a school board member).' },
    { icon: '⚖️', title: 'The school decides on a response',
      body: 'Outcomes vary widely. Punitive responses: warning, detention, suspension, expulsion in extreme cases. Restorative responses: a structured conference where the person who caused harm hears the impact and makes a plan for repair. Most evidence-based programs use restorative as the primary response, with discipline as the backstop.',
      tip: 'You usually do not get veto power over the outcome, but you should be told what it is. If the school will not tell you, that is also a red flag.' },
    { icon: '🤝', title: 'If restorative conferencing is offered',
      body: 'A trained facilitator brings the people involved together (often separately first) to hear each other and plan repair. You do NOT have to participate if you do not want to. Restorative conferencing only works when everyone consents to it. Done well, research shows 40-60% reduction in repeat offenses. Done poorly — rushed, performative, no follow-through — it can re-harm. Quality of facilitation matters.',
      tip: 'Ask: who is the facilitator, what is their training, what happens if it does not go well? You have every right to those answers.' },
    { icon: '🛡️', title: 'Safety planning',
      body: 'Whatever the outcome, the school should make a safety plan with you: changed seating, monitored hallways, separate lunch periods if needed, check-ins with a counselor, who you can go to if it escalates. This is your right — push for it explicitly if it does not happen automatically.',
      tip: 'Get the safety plan in writing if possible. Verbal plans get forgotten.' },
    { icon: '📞', title: 'When the school is not responding',
      body: 'If the school is dismissive, slow, or retaliating, escalation paths exist: the district’s student services office, the school board, the state department of education, federal civil rights (OCR) if it is identity-based harassment, and StopBullying.gov has state-by-state resources. Document EVERYTHING in writing (emails over verbal conversations).',
      tip: 'For identity-based harassment (race, gender, sexuality, disability), the U.S. Department of Education Office for Civil Rights accepts complaints at ocrcas.ed.gov. Schools have specific federal obligations.' }
  ];

  // ── For Parents — distinct from For Educators ──
  // Parents are dealing with their OWN kid (not a classroom), often have
  // a more emotional stake, and need different tools.
  var US_PARENTS = [
    { icon: '👂', title: 'Listen before you fix',
      body: 'If your child tells you about something hard, your first job is presence, not solutions. Sit down. Make eye contact. Say "tell me more" before you say anything else. Most kids stop telling parents what is going on once it starts feeling like an interrogation or a lecture. The conversation continues only if it stays a conversation.' },
    { icon: '🚨', title: 'Warning signs to take seriously',
      body: 'Unexplained physical signs (bruises, missing belongings), reluctance to go to school, sudden drop in grades or friendships, sleep changes, dread of certain times of day (lunch, recess, after school), withdrawal from things they used to love, any talk of self-harm or hopelessness. One of these is worth a conversation. Several together is worth a clinical consult.' },
    { icon: '🛡️', title: 'When you think your kid is being bullied',
      body: 'Document what they tell you (dates, words, who, where). Report to the school IN WRITING (email so there is a paper trail). Ask specifically what the school will do and by when. Get the safety plan in writing. If the school is unresponsive, escalate to the district, the state board of education, and (for identity-based harassment) the U.S. Department of Education Office for Civil Rights.' },
    { icon: '🪞', title: 'When you think YOUR kid might be the one bullying',
      body: 'This is harder to face than being told your kid is the target. But facing it is what allows change. Avoid two extremes: catastrophizing ("you are a bad person") and minimizing ("kids will be kids"). Stay curious about what is driving the behavior. Most kids who bully have something hurting underneath. They need help with that AND clear accountability for the behavior.' },
    { icon: '💚', title: 'Suicide-risk indicators are NOT something to wait on',
      body: 'Talking about death, giving away possessions, sudden calm after a long depression, searching online for methods, withdrawing more sharply, statements like "you would be better off without me." Asking directly does NOT plant the idea — research is clear on this. If you are worried, ask. If they say yes, do not leave them alone with the means, and call 988 or get them to an ER. This is one of those moments where being wrong is fine and being right and not acting is not.' },
    { icon: '🔄', title: 'The digital dimension is different from when you were a kid',
      body: 'Cyberbullying does not stop when school ends — it follows your kid home. Group-chat exclusion, photo-without-consent, AI-generated content of minors, sextortion — these are all NEW forms of harm that adults often miss because we did not grow up with them. The companion tool "Digital Wellbeing Studio" in this same hub covers the online side. Read it with your kid if you can.' },
    { icon: '🤝', title: 'What healthy school partnership looks like',
      body: 'You are not the school\'s adversary. You are also not its passive recipient. The strongest position is collaborative-but-firm: "I want to work with you AND I need to know what is being done." Get names, get timelines, get follow-up commitments. Show up to meetings with a calm face and written notes. If your kid hears you handling this with steadiness, they learn that hard things can be addressed.' },
    { icon: '🧠', title: 'Your own emotional regulation IS the intervention',
      body: 'Whatever your kid is going through, they are also reading you. If you fly into rage about the bully, your kid will hide future incidents to protect you. If you go into avoidance, they will feel alone. Your steadiness — not your toughness, your steadiness — is the most valuable thing you bring to this. Get your own support if you need it. Therapists, parent groups, trusted friends. You are allowed to need help with this too.' }
  ];

  // ── Restorative Conferencing Walkthrough ──
  // Demystifies what actually happens in a real restorative process.
  var RESTORATIVE_WALKTHROUGH = [
    { phase: 'Before',  title: 'Pre-conference meeting',
      body: 'A trained facilitator meets with each person SEPARATELY first — usually you, the person who caused harm, and any others affected. They ask: are you willing to participate? What do you want out of this? What are your safety needs? You can say no at any point. Restorative only works with consent.' },
    { phase: 'Before',  title: 'You decide what you want from it',
      body: 'Common goals: hear what was going on for the other person; have them hear the impact on you; get a concrete commitment about what changes; have a structured place to ask questions you have not been able to ask. You do not have to forgive them. You do not have to "make peace." You set the bar.' },
    { phase: 'During', title: 'The conference itself',
      body: 'A circle, usually 4–8 people: you, the person who caused harm, their support person, your support person, the facilitator, sometimes an additional witness or family. Strict turn-taking. A talking piece (an object) is often used — only the person holding it speaks. The facilitator keeps it safe.' },
    { phase: 'During', title: 'The questions asked',
      body: 'The facilitator typically asks: (1) What happened? (2) What were you thinking at the time? (3) What have you thought about since? (4) Who has been affected and how? (5) What do you think needs to happen to make things as right as possible? Both sides answer these. You hear each other in a way the school day never lets happen.' },
    { phase: 'During', title: 'The agreement',
      body: 'If the conference goes well, it ends with a written agreement: specific actions the person who caused harm will take, support the school will provide, check-in dates. You sign it. They sign it. The school signs it. This is the part that makes the difference between symbolic restorative practice and the real thing.' },
    { phase: 'After',  title: 'Follow-up — make sure it actually happens',
      body: 'The agreement is only as good as the follow-through. If it is not being honored, return to the facilitator and surface it. Restorative practice that does not check back becomes performative. You have every right to insist on accountability for the agreement.' }
  ];

  var US_GLOSSARY = [
    { term: 'Bullying', def: 'Repeated, intentional behavior involving a real or perceived power imbalance, where one person or group targets another with the intent to harm. Three elements: repeated, intentional, power imbalance.' },
    { term: 'Bully-victim', def: 'A student who is both a perpetrator AND a target of bullying. This group has the worst mental health outcomes in the research literature. They need clinical support, not just discipline.' },
    { term: 'Bystander effect', def: 'The well-documented finding that the more people who witness a harmful situation, the less likely any one person intervenes. It is environmental — not a personal failing. Specific upstander skills counteract it.' },
    { term: 'Diffusion of responsibility', def: 'The cognitive process behind the bystander effect: when many people see something, each individual assumes someone else will act, so no one does. Naming this in the moment ("everyone is waiting for someone else") can break it.' },
    { term: 'Harm cycle', def: 'The pattern by which hurt flows from person to person — someone is hurt, they pass the hurt downward, that person passes it further. The "cycle breaker" is the person who absorbs the harm instead of passing it on.' },
    { term: 'Identity-based harassment', def: 'Bullying targeting someone for race, gender, sexuality, disability, religion, or other identity. Falls under federal civil rights law (Title VI, Title IX, Section 504) and creates specific legal obligations for schools once reported.' },
    { term: 'Restorative practice', def: 'An approach to harm that asks "who was harmed and what do they need?" rather than "what rule was broken and how do we punish it?" Centers the person harmed; holds the person who caused harm accountable through repair; involves community.' },
    { term: 'Target', def: 'The person being bullied. Preferred over "victim" by many practitioners because "victim" can become an identity rather than a circumstance. The person was targeted; they are not defined by it.' },
    { term: 'Upstander', def: 'A bystander who acts. The term was coined to give a name to the alternative to silence. Upstander moves range from low-risk (proximity) to high-risk (direct confrontation) — the courage is in moving from passive to active, however small the step.' },
    { term: 'Zero tolerance', def: 'A discipline policy that mandates predetermined consequences (usually suspension or expulsion) for specific infractions, regardless of context. APA review (2008) found this approach increases dropout, disproportionately affects marginalized students, and does not reduce bullying.' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Scoped stylesheet: visible focus, lift, transitions, badge pop ──
  // ══════════════════════════════════════════════════════════════
  (function injectStyles() {
    if (document.getElementById('us-styles')) return;
    var style = document.createElement('style');
    style.id = 'us-styles';
    style.textContent = [
      '.us-root button:focus-visible,',
      ' .us-root [role="tab"]:focus-visible,',
      ' .us-root input:focus-visible,',
      ' .us-root textarea:focus-visible,',
      ' .us-root [role="radio"]:focus-visible {',
      '   outline: 3px solid #2563eb;',
      '   outline-offset: 2px;',
      '   border-radius: 6px;',
      ' }',
      '.us-root button {',
      '   transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease, box-shadow 0.2s ease;',
      ' }',
      '.us-root button:not(:disabled):hover { filter: brightness(0.97); }',
      '.us-root button:not(:disabled):active { transform: translateY(1px); }',
      '.us-root .us-card {',
      '   box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06);',
      ' }',
      '.us-root button[aria-expanded] {',
      '   transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.18s ease, background-color 0.15s ease;',
      ' }',
      '.us-root button[aria-expanded]:hover:not(:disabled),',
      '.us-root button[aria-pressed]:hover:not(:disabled) {',
      '   box-shadow: 0 3px 10px rgba(15, 23, 42, 0.07), 0 1px 3px rgba(15, 23, 42, 0.04);',
      ' }',
      '@keyframes us-pop {',
      '   0%   { transform: scale(0.65); opacity: 0; }',
      '   55%  { transform: scale(1.06); opacity: 1; }',
      '   100% { transform: scale(1); opacity: 1; }',
      ' }',
      '.us-root .us-pop { animation: us-pop 0.38s cubic-bezier(0.2, 0.9, 0.3, 1.3) both; }',
      '@media (prefers-reduced-motion: reduce) {',
      '   .us-root *, .us-root *::before, .us-root *::after {',
      '     transition-duration: 0.001ms !important;',
      '     animation-duration: 0.001ms !important;',
      '     animation-iteration-count: 1 !important;',
      '   }',
      ' }'
    ].join('');
    document.head.appendChild(style);
  })();

  // ══════════════════════════════════════════════════════════════
  // ── Registration ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('upstander', {
    icon: '\uD83E\uDDF1',
    label: 'Upstander Workshop',
    desc: 'Understand bullying from every angle \u2014 target, bystander, and the one doing the hurting \u2014 and find the courage to break the cycle.',
    color: 'blue',
    category: 'social-awareness',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var callGemini = ctx.callGemini;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var band = ctx.gradeBand || 'elementary';

      var d = (ctx.toolData && ctx.toolData.upstander) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('upstander', key); }
        else { if (ctx.update) ctx.update('upstander', key, val); }
      };

      var activeTab   = d.activeTab || 'roles';
      var soundOn     = d.soundOn != null ? d.soundOn : true;
      var roleIdx     = d.roleIdx || 0;
      var moveIdx     = d.moveIdx || 0;
      var cycleIdx    = d.cycleIdx || 0;
      var coachInput  = d.coachInput || '';
      var coachHist   = d.coachHist || [];
      var coachLoad   = d.coachLoad || false;
      var pledge      = d.pledge || '';
      var pledgeSaved = d.pledgeSaved || false;
      // Practice scenarios state
      var pracIdx     = d.pracIdx != null ? d.pracIdx : 0;
      var pracChoice  = d.pracChoice != null ? d.pracChoice : null;
      var pracDone    = d.pracDone || {};
      // Repair pathway state (inside Cycle tab)
      var repairOpen  = !!d.repairOpen;
      var repairStep  = d.repairStep != null ? d.repairStep : 0;
      // Right-After grounding state (inside Cycle tab)
      var afterOpen   = !!d.afterOpen;
      var afterStep   = d.afterStep != null ? d.afterStep : 0;
      // Witness Log state (inside Pledge tab)
      var witnessLog        = d.witnessLog || [];
      var wlSaw             = d.wlSaw || '';
      var wlDid             = d.wlDid || '';
      var wlNext            = d.wlNext || '';
      // Trusted Adults state (inside Pledge tab)
      var trustedAdults     = d.trustedAdults || [];
      var newAdultName      = d.newAdultName || '';
      var newAdultRole      = d.newAdultRole || '';
      // AI Rehearsal state (inside Moves tab)
      var rhShown           = !!d.rhShown;
      var rhSituation       = d.rhSituation || '';
      var rhAttempt         = d.rhAttempt || '';
      var rhFeedback        = d.rhFeedback || '';
      var rhLoading         = !!d.rhLoading;
      // Generative Scenarios state (inside Practice tab) — AI builds a fresh
      // 4-choice scenario that matches the hand-crafted ones' format.
      var genShown          = !!d.genShown;
      var genSetting        = d.genSetting || '';
      var genRelation       = d.genRelation || '';
      var genHarmType       = d.genHarmType || '';
      var genFocus          = d.genFocus || '';
      var genScenario       = d.genScenario || null;
      var genChoice         = d.genChoice != null ? d.genChoice : null;
      var genLoading        = !!d.genLoading;
      var genError          = d.genError || '';
      // Generative Role Play state (inside Practice tab) — AI plays a peer in
      // a short back-and-forth so the student practices what they would say.
      var rpShown           = !!d.rpShown;
      var rpRole            = d.rpRole || '';        // '' | 'bully' | 'target' | 'bystander'
      var rpScene           = d.rpScene || '';       // AI-generated scene description (replayable variance)
      var rpHistory         = d.rpHistory || [];     // [{ speaker, text }]
      var rpInput           = d.rpInput || '';
      var rpLoading         = !!d.rpLoading;
      var rpStarting        = !!d.rpStarting;        // loading state while AI builds opening scene
      var rpEnded           = !!d.rpEnded;
      var rpReflection      = d.rpReflection || '';
      // Role reflection state (inside Three Roles tab)
      var roleReflect       = d.roleReflect || {};
      var roleReflectOpen   = !!d.roleReflectOpen;
      // Helping-a-friend state (inside Moves tab)
      var hfOpen            = !!d.hfOpen;
      var hfScriptIdx       = d.hfScriptIdx != null ? d.hfScriptIdx : null;
      // Self-Check state (top of Three Roles tab)
      var scAnswers         = d.scAnswers || {};
      var scShowResults     = !!d.scShowResults;
      var scOpen            = d.scOpen != null ? d.scOpen : true; // open by default for first-time
      // Bully-Victim deep dive (inside Three Roles tab)
      var bvOpen            = !!d.bvOpen;
      // Identity-harassment deep dive (inside Three Roles tab)
      var ihOpen            = !!d.ihOpen;
      // Power Dynamics primer (inside Three Roles tab)
      var pdOpen            = !!d.pdOpen;
      // Coalition Building how-to (inside Moves tab)
      var cbOpen            = !!d.cbOpen;
      // De-escalation skills (inside Moves tab)
      var deOpen            = !!d.deOpen;
      var deSection         = d.deSection || 'signals'; // signals / verbal / physical / after
      // Witness-shame healing (inside Cycle tab)
      var whOpen            = !!d.whOpen;
      var whStep            = d.whStep != null ? d.whStep : 0;
      // AI Apology Coach (inside Repair pathway)
      var apHurt            = d.apHurt || '';
      var apDraft           = d.apDraft || '';
      var apFeedback        = d.apFeedback || '';
      var apLoading         = !!d.apLoading;
      var apOpen            = !!d.apOpen;
      // Badge tracking
      var earnedBadges      = d.earnedBadges || {};
      var showBadgeToast    = d.showBadgeToast || null;
      function tryAwardBadge(badgeId, xpAmount) {
        if (earnedBadges[badgeId]) {
          // Re-award XP for the action even if badge already earned
          if (awardXP && xpAmount) {
            var b = BADGE_CATALOG[badgeId];
            if (b) awardXP(xpAmount, b.label);
          }
          return;
        }
        var badge = BADGE_CATALOG[badgeId];
        if (!badge) return;
        var nb = Object.assign({}, earnedBadges);
        nb[badgeId] = { id: badgeId, date: new Date().toLocaleDateString(), ts: Date.now() };
        upd({ earnedBadges: nb, showBadgeToast: badge });
        if (awardXP && xpAmount) awardXP(xpAmount, badge.label);
        if (soundOn) sfxBrave();
        if (addToast) addToast('Badge earned: ' + badge.label, 'success');
        if (announceToSR) announceToSR('Badge earned: ' + badge.label);
        // Auto-dismiss toast after a beat
        setTimeout(function() { upd('showBadgeToast', null); }, 3500);
      }
      // Reference tab state
      var refSection  = d.refSection || 'sources';
      var refExpanded = d.refExpanded || null;

      var BLUE = '#2563eb'; var BL = '#eff6ff'; var BD = '#1e3a8a';

      var TABS = [
        { id: 'roles',    icon: '\uD83D\uDC65',  label: 'Three Roles' },
        { id: 'moves',    icon: '\uD83E\uDDF1',  label: 'Upstander Moves' },
        { id: 'practice', icon: '\uD83C\uDFAD',  label: 'Practice' },
        { id: 'cycle',    icon: '\uD83D\uDD17',  label: 'Break the Cycle' },
        { id: 'pledge',   icon: '\u270D\uFE0F', label: 'My Pledge' },
        { id: 'coach',    icon: '\uD83E\uDD16',  label: 'Safe Space' },
        { id: 'reference',icon: '\uD83D\uDCDA',  label: 'Reference' },
      ];

      var exploredTabs = d.exploredTabs || {};
      if (!exploredTabs[activeTab]) { var ne = Object.assign({}, exploredTabs); ne[activeTab] = true; upd('exploredTabs', ne); }
      var exploredCount = Object.keys(exploredTabs).length;

      var tabBar = h('div', {
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid #bfdbfe', background: 'linear-gradient(180deg, #eff6ff, #dbeafe)', flexShrink: 0 }
      },
        h('div', { style: { height: '3px', background: '#e2e8f0', position: 'relative', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.round((exploredCount / TABS.length) * 100) + '%', background: 'linear-gradient(90deg, ' + BLUE + ', #3b82f6)', transition: 'width 0.5s ease', borderRadius: '0 2px 2px 0' } })
        ),
        h('div', {
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' },
          role: 'tablist', 'aria-label': 'Upstander sections'
        },
          TABS.map(function(t) {
            var a = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', { key: t.id, role: 'tab', className: 'sel-tab' + (a ? ' sel-tab-active' : ''), 'aria-selected': a ? 'true' : 'false', onClick: function() { upd('activeTab', t.id); if (soundOn) sfxClick(); },
              style: { padding: '6px 14px', borderRadius: '10px', border: a ? 'none' : '1px solid ' + (explored ? '#bfdbfe' : 'transparent'), background: a ? 'linear-gradient(135deg, ' + BLUE + ', #1d4ed8)' : explored ? 'rgba(37,99,235,0.06)' : 'transparent', color: a ? '#fff' : explored ? '#1e3a8a' : '#94a3b8', fontWeight: a ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', boxShadow: a ? '0 3px 12px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none' }
            }, h('span', { className: a ? 'sel-hero-icon' : '', 'aria-hidden': 'true' }, t.icon), t.label,
              explored && !a ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#60a5fa', marginLeft: '2px' } }) : null
            );
          }),
          h('span', { className: 'sel-badge', style: { marginLeft: '8px', fontSize: '10px', color: BLUE, fontWeight: 700, whiteSpace: 'nowrap', background: '#dbeafe', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } }, exploredCount + '/' + TABS.length),
          h('button', { onClick: function() { upd('soundOn', !soundOn); }, className: 'sel-btn', 'aria-label': soundOn ? 'Mute' : 'Unmute', style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 } }, soundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        )
      );

      // ── Three Roles ──
      var rolesContent = null;
      if (activeTab === 'roles') {
        var roles = ROLES[band] || ROLES.elementary;
        var cur = roles[roleIdx % roles.length];
        rolesContent = h('div', { style: { padding: '20px', maxWidth: '640px', margin: '0 auto' } },
          // \u2500\u2500 Tool hero \u2500\u2500
          h('div', { className: 'us-card', style: {
            padding: '16px 18px', marginBottom: 16, borderRadius: 14,
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 60%, #ede9fe 100%)',
            border: '1px solid #bfdbfe',
            display: 'flex', alignItems: 'center', gap: 14
          } },
            h('div', { 'aria-hidden': 'true', style: {
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, ' + BLUE + ' 0%, #1e3a8a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: '#fff',
              boxShadow: '0 5px 12px rgba(37,99,235,0.30), inset 0 1px 0 rgba(255,255,255,0.30)'
            } }, '\uD83E\uDDF1'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { style: { margin: '0 0 2px', color: BD, fontSize: 20, lineHeight: 1.2 } }, 'Upstander Workshop'),
              h('p', { style: { margin: 0, color: '#334155', fontSize: 13, lineHeight: 1.5 } },
                'Understand bullying from all sides \u2014 target, bystander, and the one doing the hurting \u2014 and build the courage to break the cycle.')
            )
          ),
          // \u2500\u2500 Cross-link to Digital Wellbeing for cyberbullying \u2500\u2500
          h('div', { role: 'note', style: {
            padding: 12, marginBottom: 16,
            background: '#ecfeff', border: '1px solid #67e8f9', borderRadius: 10,
            display: 'flex', gap: 10, alignItems: 'center'
          } },
            h('span', { 'aria-hidden': 'true', style: {
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #67e8f9 0%, #06b6d4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#fff'
            } }, '\uD83D\uDCF1'),
            h('div', { style: { flex: 1, minWidth: 0, fontSize: 13, color: '#0f172a', lineHeight: 1.5 } },
              h('strong', null, 'For online bullying \u2014 '),
              'screenshots, group chats, pile-ons, photo-without-consent \u2014 open the ',
              h('strong', { style: { color: '#0e7490' } }, 'Digital Wellbeing Studio'),
              ' \u2192 Cyberbullying tab. The dynamics are different enough to need their own playbook.')
          ),
          // \u2500\u2500 Self-Check (collapsible role-pattern assessment) \u2500\u2500
          (function() {
            var totalAnswered = Object.keys(scAnswers).length;
            // Compute per-role percentages
            var roleScores = { target: 0, bully: 0, bystander: 0 };
            var roleCounts = { target: 0, bully: 0, bystander: 0 };
            SELF_CHECK_ITEMS.forEach(function(q) {
              roleCounts[q.role]++;
              if (scAnswers[q.id] != null) roleScores[q.role] += scAnswers[q.id];
            });
            var rolePct = {
              target:    roleCounts.target    > 0 ? roleScores.target    / (roleCounts.target    * 3) : 0,
              bully:     roleCounts.bully     > 0 ? roleScores.bully     / (roleCounts.bully     * 3) : 0,
              bystander: roleCounts.bystander > 0 ? roleScores.bystander / (roleCounts.bystander * 3) : 0
            };
            var roleLabel = { target: 'The target', bully: 'The one doing the hurting', bystander: 'The bystander' };
            var roleColor = { target: '#93c5fd', bully: '#fca5a5', bystander: '#fde68a' };
            var roleAccent = { target: '#1e40af', bully: '#991b1b', bystander: '#92400e' };

            return h('div', { style: { marginBottom: 18 } },
              h('button', {
                onClick: function() { upd('scOpen', !scOpen); if (soundOn) sfxClick(); },
                'aria-expanded': scOpen ? 'true' : 'false',
                style: {
                  width: '100%', padding: '12px 14px', textAlign: 'left',
                  border: '2px solid ' + (scOpen ? '#a78bfa' : '#d8b4fe'),
                  background: scOpen ? '#faf5ff' : '#fdf4ff',
                  borderRadius: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  font: 'inherit', color: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: '#fff',
                  boxShadow: '0 3px 8px rgba(124, 58, 237, 0.22)'
                } }, '\uD83E\uDE9E'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 800, fontSize: 14, color: '#6b21a8', marginBottom: 2 } },
                    scShowResults ? 'Your role-pattern result' : 'Quick self-check \u2014 which roles do I find myself in?'),
                  h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                    scShowResults ? 'Most people are in more than one role. Tap to revisit.' : '6 questions. Honest answers only. No single \"right\" role.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#7c3aed', fontSize: 18 } }, scOpen ? '\u25BE' : '\u25B8')
              ),
              scOpen && (scShowResults
                ? // Results view
                  h('div', { 'aria-live': 'polite', style: { marginTop: 12, padding: 16, background: '#fff', border: '1px solid #d8b4fe', borderRadius: 12 } },
                    h('p', { style: { margin: '0 0 12px', fontSize: 13, lineHeight: 1.55, color: '#0f172a' } },
                      h('strong', null, 'Most people are in more than one role at different times. '),
                      'Your higher-scoring roles are the ones you might look at first \u2014 but reading all three is the whole point.'),
                    h('div', { style: { display: 'grid', gap: 8, marginBottom: 14 } },
                      ['target', 'bully', 'bystander'].map(function(r) {
                        var pct = Math.round(rolePct[r] * 100);
                        return h('div', { key: r, style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 } },
                          h('div', { style: { width: 180, color: roleAccent[r], fontWeight: 700, flexShrink: 0 } }, roleLabel[r]),
                          h('div', { style: { flex: 1, background: '#e2e8f0', height: 18, borderRadius: 4, overflow: 'hidden', position: 'relative' } },
                            h('div', { style: {
                              background: 'linear-gradient(90deg, ' + roleColor[r] + ' 0%, ' + roleAccent[r] + ' 100%)',
                              height: '100%', width: pct + '%',
                              transition: 'width 0.6s ease'
                            } }),
                            h('span', { style: { position: 'absolute', right: 6, top: 0, lineHeight: '18px', fontSize: 11, fontWeight: 700, color: '#0f172a' } }, pct + '%')
                          ),
                          h('button', {
                            onClick: function() {
                              var idx = ['target', 'bully', 'bystander'].indexOf(r);
                              if (idx >= 0) upd('roleIdx', idx);
                              if (soundOn) sfxClick();
                            },
                            style: { padding: '4px 10px', background: roleAccent[r], color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 11, flexShrink: 0 }
                          }, 'Open \u2192')
                        );
                      })
                    ),
                    // If they scored high on both target AND bully, surface bully-victim signpost
                    (rolePct.target >= 0.5 && rolePct.bully >= 0.5) && h('div', { style: {
                      padding: 12, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 10
                    } },
                      h('div', { style: { fontWeight: 800, fontSize: 13, color: '#92400e', marginBottom: 4 } },
                        '\u26A0\uFE0F You flagged both target and perpetrator patterns'),
                      h('p', { style: { margin: 0, fontSize: 12, lineHeight: 1.55, color: '#0f172a' } },
                        'This combination has a specific name in the research \u2014 "bully-victim." It is also the group with the hardest outcomes AND the one schools usually serve worst. There is a Bully-Victim section in the role detail below \u2014 it is for you. Please read it.')
                    ),
                    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                      h('button', {
                        onClick: function() { upd({ scAnswers: {}, scShowResults: false }); if (soundOn) sfxClick(); },
                        style: { padding: '8px 14px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                      }, 'Retake check-in')
                    )
                  )
                : // Question view
                  h('div', { style: { marginTop: 12, padding: 16, background: '#fff', border: '1px solid #d8b4fe', borderRadius: 12 } },
                    h('p', { style: { margin: '0 0 10px', fontSize: 12, color: '#475569', lineHeight: 1.5 } },
                      'For each one: how often is this true for you?'),
                    h('div', { style: { display: 'grid', gap: 10 } },
                      SELF_CHECK_ITEMS.map(function(q) {
                        return h('div', { key: q.id, style: { padding: 10, background: '#faf5ff', borderRadius: 8 } },
                          h('div', { style: { fontSize: 13, color: '#0f172a', marginBottom: 8, lineHeight: 1.5 } }, q.text),
                          h('div', { role: 'radiogroup', 'aria-label': q.text, style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
                            ['Never', 'Sometimes', 'Often', 'Always'].map(function(lbl, idx) {
                              var selected = scAnswers[q.id] === idx;
                              return h('button', {
                                key: idx, role: 'radio', 'aria-checked': selected ? 'true' : 'false',
                                onClick: function() {
                                  var na = Object.assign({}, scAnswers); na[q.id] = idx;
                                  upd('scAnswers', na);
                                  if (soundOn) sfxClick();
                                },
                                style: {
                                  flex: '1 1 70px', minWidth: 60,
                                  padding: '6px 8px',
                                  background: selected ? '#7c3aed' : '#fff',
                                  color: selected ? '#fff' : '#475569',
                                  border: '1px solid ' + (selected ? '#7c3aed' : '#cbd5e1'),
                                  borderRadius: 6, fontWeight: selected ? 700 : 500,
                                  fontSize: 12, cursor: 'pointer', font: 'inherit'
                                }
                              }, lbl);
                            })
                          )
                        );
                      })
                    ),
                    h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 12 } },
                      h('button', {
                        disabled: totalAnswered < SELF_CHECK_ITEMS.length,
                        onClick: function() {
                          upd('scShowResults', true);
                          if (soundOn) sfxBrave();
                          tryAwardBadge('self_check_done', 10);
                        },
                        style: {
                          padding: '8px 16px',
                          background: totalAnswered < SELF_CHECK_ITEMS.length ? '#cbd5e1' : '#7c3aed',
                          color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                          cursor: totalAnswered < SELF_CHECK_ITEMS.length ? 'not-allowed' : 'pointer', fontSize: 13
                        }
                      }, totalAnswered < SELF_CHECK_ITEMS.length
                        ? 'Answer all 6 to see your pattern (' + totalAnswered + '/' + SELF_CHECK_ITEMS.length + ')'
                        : 'See my pattern \u2192')
                    )
                  )
              )
            );
          })(),
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))' } }, '\uD83D\uDC65'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Understanding the Three Roles'),
            h('p', { style: { fontSize: '13px', color: '#64748b', margin: 0 } }, 'Every bullying situation has three roles. Understanding all three is how we break the pattern.')
          ),
          // Role selector — icon-circle cards
          h('div', { role: 'tablist', 'aria-label': 'Select a role to learn about', style: { display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 } },
            roles.map(function(r, i) {
              var active = i === roleIdx % roles.length;
              return h('button', { key: r.id, role: 'tab', 'aria-selected': active ? 'true' : 'false', 'aria-label': r.title,
                onClick: function() { upd('roleIdx', i); if (soundOn) sfxClick(); },
                className: 'us-card',
                style: {
                  padding: '14px 8px',
                  borderRadius: 14,
                  border: '2px solid ' + (active ? r.color : '#e5e7eb'),
                  background: active ? r.color + '18' : '#fff',
                  cursor: 'pointer', textAlign: 'center',
                  font: 'inherit', color: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transform: active ? 'translateY(-2px)' : 'none',
                  boxShadow: active ? '0 6px 14px ' + r.color + '55' : '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)'
                }
              },
                h('div', { 'aria-hidden': 'true', style: {
                  width: 48, height: 48, borderRadius: 14,
                  background: active
                    ? 'linear-gradient(135deg, ' + r.color + ' 0%, ' + r.color + 'cc 100%)'
                    : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, color: active ? '#fff' : '#475569',
                  boxShadow: active ? 'inset 0 1px 0 rgba(255, 255, 255, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                } }, r.icon),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: active ? BD : '#374151', lineHeight: 1.25 } }, r.title)
              );
            })
          ),
          // Role detail
          h('div', { style: { background: cur.color + '15', borderRadius: '16px', padding: '20px', border: '2px solid ' + cur.color + '44' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' } },
              h('span', { style: { fontSize: '32px' } }, cur.icon),
              h('h4', { style: { fontSize: '16px', fontWeight: 800, color: BD, margin: 0 } }, cur.title)
            ),
            // What they feel
            h('div', { style: { marginBottom: '12px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' } }, 'What they might feel:'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                cur.feels.map(function(f) {
                  return h('span', { key: f, style: { padding: '3px 10px', background: '#fff', border: '1px solid ' + cur.color + '66', borderRadius: '20px', fontSize: '11px', color: '#374151' } }, f);
                })
              )
            ),
            // The truth
            h('div', { style: { background: '#fff', borderRadius: '10px', padding: '12px', borderLeft: '4px solid ' + BLUE, marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: BLUE, marginBottom: '2px' } }, 'The truth:'),
              h('p', { style: { fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.6 } }, cur.truth)
            ),
            // Myth vs truth
            h('div', { style: { background: '#fef3c7', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #f59e0b' } },
              h('p', { style: { fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.6 } }, cur.myth)
            ),
            // ── Have I been here? reflection ──
            h('div', { style: { marginTop: 14 } },
              h('button', {
                onClick: function() { upd('roleReflectOpen', !roleReflectOpen); if (soundOn) sfxClick(); },
                'aria-expanded': roleReflectOpen ? 'true' : 'false',
                style: {
                  width: '100%', padding: '10px 12px', textAlign: 'left',
                  background: roleReflectOpen ? '#fff' : 'transparent',
                  border: '1px dashed ' + cur.color,
                  borderRadius: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  font: 'inherit', color: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, '🪞'),
                h('span', { style: { flex: 1, fontSize: 13, fontWeight: 700, color: BD } },
                  'Have I been here? — a quiet reflection'),
                h('span', { 'aria-hidden': 'true', style: { color: '#64748b', fontSize: 14 } }, roleReflectOpen ? '▾' : '▸')
              ),
              roleReflectOpen && h('div', { style: { marginTop: 10, padding: 14, background: '#fff', border: '1px solid ' + cur.color + '66', borderRadius: 10 } },
                h('p', { style: { margin: '0 0 10px', fontSize: 12, color: '#475569', lineHeight: 1.55 } },
                  'Nobody is going to read this except you. Whatever you write stays on your device. The point is honesty — with yourself.'),
                h('label', { htmlFor: 'us-rr-' + cur.id, style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                  band === 'elementary'
                    ? 'A time I felt like ' + cur.title.toLowerCase() + ' — or someone I know did'
                    : 'A time I have been in this role — what was happening, what I felt, what I did or did not do'),
                h('textarea', {
                  id: 'us-rr-' + cur.id,
                  value: roleReflect[cur.id] || '',
                  onChange: function(e) {
                    var nr = Object.assign({}, roleReflect);
                    nr[cur.id] = e.target.value;
                    upd('roleReflect', nr);
                  },
                  placeholder: 'Write as much or as little as you want. Nothing has to be polished.',
                  rows: 3,
                  style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }
                }),
                (function() {
                  var savedCount = Object.keys(roleReflect).filter(function(k) { return (roleReflect[k] || '').trim().length > 0; }).length;
                  return savedCount >= 3 && h('p', { 'aria-live': 'polite', style: { margin: '8px 0 0', fontSize: 12, color: '#059669', fontWeight: 600 } },
                    '✓ You have reflected on all three roles. That is rare and honest work.');
                })()
              )
            )
          ),
          // ── Identity-based harassment deep dive ──
          (band !== 'elementary') && (function() {
            var ihContent = IDENTITY_HARASSMENT[band] || IDENTITY_HARASSMENT.middle;
            return h('div', { style: { maxWidth: 640, margin: '20px auto 0' } },
              h('button', {
                onClick: function() { upd('ihOpen', !ihOpen); if (soundOn) sfxClick(); },
                'aria-expanded': ihOpen ? 'true' : 'false',
                style: {
                  width: '100%', padding: '14px 16px', textAlign: 'left',
                  border: '2px solid ' + (ihOpen ? '#a78bfa' : '#d8b4fe'),
                  background: ihOpen ? '#faf5ff' : '#fdf4ff',
                  borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  font: 'inherit', color: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff',
                  boxShadow: '0 4px 10px rgba(124, 58, 237, 0.22)'
                } }, '🏳️‍🌈'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: '#6b21a8', marginBottom: 2 } },
                    'Identity-based harassment — when the targeting is about who you ARE'),
                  h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                    'Race, gender, sexuality, religion, disability, language. Different harms. Specific federal protections.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#7c3aed', fontSize: 18 } }, ihOpen ? '▾' : '▸')
              ),
              ihOpen && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #d8b4fe', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: '#475569' } },
                  h('strong', { style: { color: '#6b21a8' } }, 'Why this gets its own section: '),
                  'identity-based bullying hits differently AND has different legal/practical recourse. Most students do not know what protections they actually have.'),
                h('div', { style: { display: 'grid', gap: 10 } },
                  ihContent.map(function(c, idx) {
                    return h('div', { key: idx, className: 'us-card', style: {
                      display: 'flex', gap: 12, padding: 14, background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 12
                    } },
                      h('div', { 'aria-hidden': 'true', style: {
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg, #a78bfa 0%, #6b21a8 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: '#fff'
                      } }, c.icon),
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontWeight: 700, fontSize: 14, color: '#6b21a8', marginBottom: 4 } }, c.title),
                        h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#1f2937' } }, c.body)
                      )
                    );
                  })
                )
              )
            );
          })(),
          // ── Power Dynamics primer (middle + high only) ──
          (band !== 'elementary') && (function() {
            var pdContent = POWER_DYNAMICS[band] || POWER_DYNAMICS.middle;
            return h('div', { style: { maxWidth: 640, margin: '20px auto 0' } },
              h('button', {
                onClick: function() { upd('pdOpen', !pdOpen); if (soundOn) sfxClick(); },
                'aria-expanded': pdOpen ? 'true' : 'false',
                style: {
                  width: '100%', padding: '14px 16px', textAlign: 'left',
                  border: '2px solid ' + (pdOpen ? '#0891b2' : '#67e8f9'),
                  background: pdOpen ? '#ecfeff' : '#f0f9ff',
                  borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  font: 'inherit', color: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff',
                  boxShadow: '0 4px 10px rgba(8, 145, 178, 0.22)'
                } }, '⚖️'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: '#0e7490', marginBottom: 2 } },
                    'Power dynamics — not everyone has equal room to intervene'),
                  h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                    'Honest read on why some upstander moves are safer for some students than others. The Courage Hierarchy is calibrated this way for a reason.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#0891b2', fontSize: 18 } }, pdOpen ? '▾' : '▸')
              ),
              pdOpen && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #67e8f9', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: '#475569' } },
                  h('strong', { style: { color: '#0e7490' } }, 'Why this section exists: '),
                  'most anti-bullying programs pretend every student has equal power to act. That puts the heaviest cost on the kids who can least afford it. Naming the math honestly is the first step.'),
                h('div', { style: { display: 'grid', gap: 10 } },
                  pdContent.map(function(c, idx) {
                    return h('div', { key: idx, className: 'us-card', style: {
                      display: 'flex', gap: 12, padding: 14, background: '#ecfeff', border: '1px solid #67e8f9', borderRadius: 12
                    } },
                      h('div', { 'aria-hidden': 'true', style: {
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg, #22d3ee 0%, #0e7490 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: '#fff'
                      } }, c.icon),
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontWeight: 700, fontSize: 14, color: '#0e7490', marginBottom: 4 } }, c.title),
                        h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#1f2937' } }, c.body)
                      )
                    );
                  })
                )
              )
            );
          })(),
          // ── Bully-Victim deep dive (collapsible) ──
          (function() {
            var bvContent = BULLY_VICTIM_CONTENT[band] || BULLY_VICTIM_CONTENT.elementary;
            return h('div', { style: { maxWidth: 640, margin: '20px auto 0' } },
              h('button', {
                onClick: function() { upd('bvOpen', !bvOpen); if (soundOn) sfxClick(); },
                'aria-expanded': bvOpen ? 'true' : 'false',
                style: {
                  width: '100%', padding: '14px 16px', textAlign: 'left',
                  border: '2px solid ' + (bvOpen ? '#fb923c' : '#fed7aa'),
                  background: bvOpen ? '#fff7ed' : '#fffaf0',
                  borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  font: 'inherit', color: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff',
                  boxShadow: '0 4px 10px rgba(234, 88, 12, 0.22)'
                } }, '⚖️'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: '#9a3412', marginBottom: 2 } },
                    'If you have been BOTH — the bully-victim section'),
                  h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                    'When you have been targeted AND have caused harm. The clinically most-vulnerable group — and often the least well-served.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#ea580c', fontSize: 18 } }, bvOpen ? '▾' : '▸')
              ),
              bvOpen && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #fed7aa', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: '#475569' } },
                  h('strong', { style: { color: '#9a3412' } }, 'Why this section exists: '),
                  'a real fraction of students are in both roles. The research on this group is unambiguous — they have the worst mental health outcomes — and the systems around them are usually worst at recognizing it. If this is you, this section is for you. If it is someone you know, it might help you understand them.'),
                h('div', { style: { display: 'grid', gap: 10 } },
                  bvContent.map(function(c, idx) {
                    return h('div', { key: idx, className: 'us-card', style: {
                      display: 'flex', gap: 12, padding: 14, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12
                    } },
                      h('div', { 'aria-hidden': 'true', style: {
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg, #fb923c 0%, #c2410c 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: '#fff'
                      } }, c.icon),
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontWeight: 700, fontSize: 14, color: '#9a3412', marginBottom: 4 } }, c.title),
                        h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#1f2937' } }, c.body)
                      )
                    );
                  })
                ),
                h('div', { style: {
                  marginTop: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                  fontSize: 12, color: '#0f172a', lineHeight: 1.55
                } },
                  h('strong', { style: { color: '#991b1b' } }, 'If anything in this section is bringing up thoughts of self-harm: '),
                  '988 (call or text), Crisis Text Line (text HOME to 741741), or talk to ',
                  'a school counselor or psychologist today. You are not alone.')
              )
            );
          })()
        );
      }

      // ── Upstander Moves ──
      var movesContent = null;
      if (activeTab === 'moves') {
        var moves = UPSTANDER_MOVES[band] || UPSTANDER_MOVES.elementary;
        var byRisk = { low: [], medium: [], high: [] };
        moves.forEach(function(m, i) { (byRisk[m.risk] || byRisk.low).push({ m: m, i: i }); });
        var riskTiers = [
          { id: 'low',    label: 'Lower-risk moves',  sub: 'Almost everyone can do these. No public confrontation required.', tone: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { id: 'medium', label: 'Moderate-risk moves', sub: 'Require some willingness to break the social spell.',           tone: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
          { id: 'high',   label: 'Higher-risk moves',  sub: 'These cost you something. The impact is also bigger.',         tone: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
        ];
        movesContent = h('div', { style: { padding: '20px', maxWidth: '720px', margin: '0 auto' } },
          // Hero card
          h('div', { className: 'us-card', style: {
            padding: '16px 18px', marginBottom: 16, borderRadius: 14,
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 60%, #e0f2fe 100%)',
            border: '1px solid #bfdbfe',
            display: 'flex', alignItems: 'center', gap: 14
          } },
            h('div', { 'aria-hidden': 'true', style: {
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, ' + BLUE + ' 0%, #1e3a8a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: '#fff',
              boxShadow: '0 5px 12px rgba(37,99,235,0.30), inset 0 1px 0 rgba(255,255,255,0.30)'
            } }, '\uD83E\uDDF1'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { style: { margin: '0 0 2px', color: BD, fontSize: 20, lineHeight: 1.2 } }, 'Upstander Moves'),
              h('p', { style: { margin: 0, color: '#334155', fontSize: 13, lineHeight: 1.5 } },
                'Concrete actions, sorted by social risk. Start where you feel safe. Doing ANY of these makes you part of the answer.')
            )
          ),
          // ── Courage Hierarchy visual ladder ──
          h('div', { className: 'us-card', style: {
            padding: 14, marginBottom: 16, borderRadius: 12,
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #eff6ff 70%, #faf5ff 100%)',
            border: '1px solid #bbf7d0'
          } },
            h('div', { style: { fontSize: 12, color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center' } },
              'The Courage Hierarchy — every level matters, start where you are'),
            h('div', { style: { display: 'grid', gap: 4 } },
              COURAGE_LADDER.map(function(rung, idx) {
                // Visual: each rung indented progressively to suggest climbing
                var indent = idx * 16;
                return h('div', { key: rung.level, style: {
                  display: 'flex', alignItems: 'center', gap: 10,
                  paddingLeft: indent,
                  position: 'relative'
                } },
                  // Level badge
                  h('div', { 'aria-hidden': 'true', style: {
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg, ' + rung.color + ' 0%, ' + rung.color + 'cc 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: '#fff',
                    boxShadow: '0 2px 6px ' + rung.color + '55, inset 0 1px 0 rgba(255,255,255,0.3)'
                  } }, rung.level),
                  // Content
                  h('div', { style: {
                    flex: 1, minWidth: 0,
                    padding: '8px 12px',
                    background: '#fff', borderRadius: 8,
                    borderLeft: '3px solid ' + rung.color,
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
                  } },
                    h('div', { style: { fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 1 } }, rung.label),
                    h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.5 } }, rung.desc)
                  )
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 12, color: '#0f172a', lineHeight: 1.55, textAlign: 'center', fontStyle: 'italic' } },
              'Climbing one rung at a time is the work. You do not have to skip to the top.')
          ),
          riskTiers.map(function(tier) {
            var tierMoves = byRisk[tier.id] || [];
            if (tierMoves.length === 0) return null;
            return h('div', { key: tier.id, style: { marginBottom: 16 } },
              h('div', { style: {
                padding: '8px 12px', marginBottom: 8,
                background: tier.bg, border: '1px solid ' + tier.border, borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 10
              } },
                h('span', { 'aria-hidden': 'true', style: {
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: tier.tone, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800
                } }, tier.id === 'low' ? '1' : tier.id === 'medium' ? '2' : '3'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 800, fontSize: 14, color: tier.tone } }, tier.label),
                  h('div', { style: { fontSize: 12, color: '#475569' } }, tier.sub)
                )
              ),
              h('div', { style: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' } },
                tierMoves.map(function(entry) {
                  var m = entry.m;
                  var active = moveIdx === entry.i;
                  return h('button', {
                    key: entry.i, 'aria-pressed': active ? 'true' : 'false',
                    onClick: function() { upd('moveIdx', entry.i); if (soundOn) sfxClick(); },
                    className: 'us-card',
                    style: {
                      padding: 14, textAlign: 'left', width: '100%',
                      background: active ? tier.bg : '#fff',
                      border: '2px solid ' + (active ? tier.tone : '#e5e7eb'),
                      borderRadius: 12, cursor: 'pointer',
                      font: 'inherit', color: 'inherit',
                      display: 'flex', gap: 10
                    }
                  },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, ' + tier.tone + '88 0%, ' + tier.tone + ' 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: '#fff'
                    } }, m.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 2 } }, m.move),
                      h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: active ? 'unset' : 2, WebkitBoxOrient: 'vertical',
                        overflow: active ? 'visible' : 'hidden'
                      } }, m.desc)
                    )
                  );
                })
              )
            );
          }),
          h('p', { style: { textAlign: 'center', marginTop: 14, fontSize: 12, color: '#64748b', fontStyle: 'italic' } },
            'Tap a card to expand and read the full description.'),

          // ── AI Rehearsal — practice what you would actually say ──
          h('div', { style: { marginTop: 24 } },
            h('button', {
              onClick: function() { upd('rhShown', !rhShown); if (soundOn) sfxClick(); },
              'aria-expanded': rhShown ? 'true' : 'false',
              style: {
                width: '100%', padding: '14px 16px', textAlign: 'left',
                border: '2px solid ' + (rhShown ? '#a855f7' : '#d8b4fe'),
                background: rhShown ? '#faf5ff' : '#fdf4ff',
                borderRadius: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                font: 'inherit', color: 'inherit'
              }
            },
              h('span', { 'aria-hidden': 'true', style: {
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#fff',
                boxShadow: '0 4px 10px rgba(168, 85, 247, 0.25)'
              } }, '🎤'),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontWeight: 800, fontSize: 15, color: '#6b21a8', marginBottom: 2 } },
                  'Rehearse what you would actually say'),
                h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                  'Type a situation + your draft response. An AI coach gives you specific feedback on how it might land.')
              ),
              h('span', { 'aria-hidden': 'true', style: { color: '#a855f7', fontSize: 18 } }, rhShown ? '▾' : '▸')
            ),
            rhShown && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #d8b4fe', borderRadius: 14 } },
              h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: '#475569' } },
                h('strong', { style: { color: '#6b21a8' } }, 'How this works: '),
                'tell the bot the situation, then write what you would say in that moment. The bot gives you 3 things: what would probably land well, what might land badly, and one tweak you could make. It is rehearsal, not script.'),
              h('label', { htmlFor: 'us-rh-sit', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'The situation'),
              h('textarea', { id: 'us-rh-sit', value: rhSituation,
                onChange: function(e) { upd('rhSituation', e.target.value); },
                placeholder: 'Example: My friend group is making fun of someone behind their back. I want to say something but I don’t want to start a fight.',
                rows: 3,
                style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('label', { htmlFor: 'us-rh-att', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Your draft — what you would say out loud'),
              h('textarea', { id: 'us-rh-att', value: rhAttempt,
                onChange: function(e) { upd('rhAttempt', e.target.value); },
                placeholder: 'Type the exact words you would actually say...',
                rows: 3,
                style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', {
                  disabled: rhLoading || !rhSituation.trim() || !rhAttempt.trim() || !callGemini,
                  'aria-busy': rhLoading ? 'true' : 'false',
                  onClick: function() {
                    if (!rhSituation.trim() || !rhAttempt.trim() || !callGemini) return;
                    upd({ rhLoading: true, rhFeedback: '' });
                    var prompt =
                      'You are a kind, grounded coach helping a ' + band + ' school student rehearse what to say in a real-life bullying or social-harm moment. ' +
                      'They have given you a SITUATION and their DRAFT response. ' +
                      'Give feedback in exactly three short labeled parts (each 1–2 sentences, total under 130 words):\n\n' +
                      '1) What about your draft would probably land well\n' +
                      '2) What might land badly or backfire\n' +
                      '3) One concrete tweak you could try\n\n' +
                      'Be specific. No generic praise. No \"good job!\" filler. Do not lecture. Do not assume worst intent. ' +
                      'Tone: warm, real, peer-mentor energy. No emojis. Do not write the perfect script for them — they need to keep the voice their own.\n\n' +
                      'SITUATION: \"' + rhSituation.trim().replace(/"/g, '\\"') + '\"\n' +
                      'DRAFT: \"' + rhAttempt.trim().replace(/"/g, '\\"') + '\"';
                    callGemini(prompt, false).then(function(r) {
                      upd({ rhLoading: false, rhFeedback: (r || '').trim() });
                      if (soundOn) sfxBrave();
                      tryAwardBadge('rehearsed', 15);
                      if (announceToSR) announceToSR('Feedback ready');
                    }).catch(function() {
                      upd({ rhLoading: false, rhFeedback: 'The AI is not reachable right now. While you wait, try reading your draft out loud. Notice how it sounds. If it sounds like something you would actually say, that is more important than getting it perfect.' });
                    });
                  },
                  style: {
                    padding: '10px 16px',
                    background: (rhLoading || !rhSituation.trim() || !rhAttempt.trim() || !callGemini) ? '#cbd5e1' : '#7c3aed',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                    cursor: (rhLoading || !rhSituation.trim() || !rhAttempt.trim() || !callGemini) ? 'not-allowed' : 'pointer',
                    fontSize: 13
                  }
                }, rhLoading ? 'Thinking…' : (callGemini ? 'Get coach feedback' : 'AI not available')),
                rhFeedback && h('button', {
                  onClick: function() { upd({ rhSituation: '', rhAttempt: '', rhFeedback: '' }); },
                  style: { padding: '10px 16px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                }, 'Try another')
              ),
              !callGemini && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: '#6b21a8' } },
                'AI features need a connection. While offline, try reading your draft out loud.'),
              rhFeedback && h('div', { 'aria-live': 'polite', className: 'us-pop', style: {
                marginTop: 14, padding: 14, background: '#faf5ff', border: '1px dashed #c084fc',
                borderRadius: 10, fontSize: 14, lineHeight: 1.6, color: '#0f172a', whiteSpace: 'pre-wrap'
              } }, rhFeedback),
              rhFeedback && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: '#6b21a8', fontStyle: 'italic' } },
                'AI-generated. Take what is useful, leave the rest. The point is your voice in the room — not a script.')
            )
          ),

          // ── Helping a friend who is being targeted ──
          h('div', { style: { marginTop: 16 } },
            h('button', {
              onClick: function() { upd('hfOpen', !hfOpen); if (soundOn) sfxClick(); },
              'aria-expanded': hfOpen ? 'true' : 'false',
              style: {
                width: '100%', padding: '14px 16px', textAlign: 'left',
                border: '2px solid ' + (hfOpen ? '#34d399' : '#86efac'),
                background: hfOpen ? '#ecfdf5' : '#f0fdf4',
                borderRadius: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                font: 'inherit', color: 'inherit'
              }
            },
              h('span', { 'aria-hidden': 'true', style: {
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#fff',
                boxShadow: '0 4px 10px rgba(5, 150, 105, 0.22)'
              } }, '🤝'),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontWeight: 800, fontSize: 15, color: '#166534', marginBottom: 2 } },
                  'If a friend is the one being targeted'),
                h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                  'Different from upstander-in-the-moment. This is about presence over time. Scripts + what to avoid.')
              ),
              h('span', { 'aria-hidden': 'true', style: { color: '#059669', fontSize: 18 } }, hfOpen ? '▾' : '▸')
            ),
            hfOpen && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #86efac', borderRadius: 14 } },
              h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: '#475569' } },
                h('strong', { style: { color: '#166534' } }, 'You do not have to be a counselor. '),
                'You have to be present. The single most protective thing a peer can do is not look away. Tap a moment below to see what to say and why it works.'),
              // Scripts
              h('div', { style: { display: 'grid', gap: 8, marginBottom: 16 } },
                HELPING_FRIEND.scripts.map(function(s, idx) {
                  var open = hfScriptIdx === idx;
                  return h('div', { key: idx, className: 'us-card', style: {
                    border: '1px solid ' + (open ? '#34d399' : '#d1d5db'),
                    borderRadius: 10, background: open ? '#f0fdf4' : '#fff', overflow: 'hidden'
                  } },
                    h('button', {
                      onClick: function() { upd('hfScriptIdx', open ? null : idx); if (soundOn) sfxClick(); },
                      'aria-expanded': open ? 'true' : 'false',
                      style: {
                        width: '100%', padding: '10px 12px', textAlign: 'left',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: 14, fontWeight: 700, color: '#0f172a',
                        display: 'flex', alignItems: 'center', gap: 8,
                        font: 'inherit'
                      }
                    },
                      h('span', { style: { flex: 1, fontWeight: 600 } }, s.situation),
                      h('span', { 'aria-hidden': 'true', style: { color: '#64748b', fontSize: 16 } }, open ? '▾' : '▸')
                    ),
                    open && h('div', { style: { padding: '0 12px 12px' } },
                      h('div', { style: { padding: 12, background: '#ecfdf5', border: '1px solid #5eead4', borderRadius: 8, marginBottom: 10 } },
                        h('div', { style: { fontSize: 11, color: '#0e7490', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Try this'),
                        h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a', fontStyle: 'italic' } }, s.say)
                      ),
                      h('div', { style: { fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Why it works'),
                      h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#334155' } }, s.why)
                    )
                  );
                })
              ),
              // Don'ts
              h('div', { style: { padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 } },
                h('div', { style: { fontWeight: 800, color: '#991b1b', marginBottom: 10, fontSize: 14 } },
                  h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⛔'),
                  'And what to avoid'),
                h('div', { style: { display: 'grid', gap: 10 } },
                  HELPING_FRIEND.donts.map(function(d, idx) {
                    return h('div', { key: idx },
                      h('div', { style: { fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 } }, '✗ ' + d.what),
                      h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.5 } }, d.why)
                    );
                  })
                )
              )
            )
          ),

          // ── Coalition Building how-to ──
          h('div', { style: { marginTop: 16 } },
            h('button', {
              onClick: function() { upd('cbOpen', !cbOpen); if (soundOn) sfxClick(); },
              'aria-expanded': cbOpen ? 'true' : 'false',
              style: {
                width: '100%', padding: '14px 16px', textAlign: 'left',
                border: '2px solid ' + (cbOpen ? '#f59e0b' : '#fcd34d'),
                background: cbOpen ? '#fffbeb' : '#fef9c3',
                borderRadius: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                font: 'inherit', color: 'inherit'
              }
            },
              h('span', { 'aria-hidden': 'true', style: {
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#fff',
                boxShadow: '0 4px 10px rgba(217, 119, 6, 0.22)'
              } }, '🧑‍🤝‍🧑'),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontWeight: 800, fontSize: 15, color: '#92400e', marginBottom: 2 } },
                  'Coalition Building — the move that makes the other moves possible'),
                h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                  'Three peers committed to backing each other change what any one of them can safely do. ' + COALITION_STEPS.length + ' concrete steps.')
              ),
              h('span', { 'aria-hidden': 'true', style: { color: '#d97706', fontSize: 18 } }, cbOpen ? '▾' : '▸')
            ),
            cbOpen && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #fcd34d', borderRadius: 14 } },
              h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: '#475569' } },
                h('strong', { style: { color: '#92400e' } }, 'Why this matters: '),
                'one person speaking up in a hostile room is risky. Three people saying "this is not okay" together is different math. Most lasting change at schools comes from coalitions, not solo heroes. Coalition building is also one of the only moves that lets lower-power students participate safely in higher-impact intervention.'),
              h('div', { style: { display: 'grid', gap: 10 } },
                COALITION_STEPS.map(function(s) {
                  return h('div', { key: s.n, className: 'us-card', style: {
                    display: 'flex', gap: 12, padding: 14, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12
                  } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: '#fff'
                    } }, s.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 11, color: '#92400e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Step ' + s.n),
                      h('div', { style: { fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 6 } }, s.title),
                      h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#334155' } }, s.body)
                    )
                  );
                })
              ),
              h('div', { style: {
                marginTop: 14, padding: 12, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10
              } },
                h('p', { style: { margin: 0, fontSize: 12, lineHeight: 1.6, color: '#0f172a' } },
                  h('strong', { style: { color: '#166534' } }, 'The math, plainly: '),
                  '1 student = brave but isolated. 2 students = unusual. 3 students = a movement. 5 students = a norm shift. Most school cultures change because of small coalitions of students who decided to back each other.'))
            )
          ),

          // ── De-escalation Skills ──
          h('div', { style: { marginTop: 16 } },
            h('button', {
              onClick: function() { upd('deOpen', !deOpen); if (soundOn) sfxClick(); },
              'aria-expanded': deOpen ? 'true' : 'false',
              style: {
                width: '100%', padding: '14px 16px', textAlign: 'left',
                border: '2px solid ' + (deOpen ? '#ef4444' : '#fca5a5'),
                background: deOpen ? '#fef2f2' : '#fff1f2',
                borderRadius: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                font: 'inherit', color: 'inherit'
              }
            },
              h('span', { 'aria-hidden': 'true', style: {
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#fff',
                boxShadow: '0 4px 10px rgba(220, 38, 38, 0.22)'
              } }, '🧯'),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontWeight: 800, fontSize: 15, color: '#991b1b', marginBottom: 2 } },
                  'De-escalation — when your move starts making it hotter'),
                h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                  'Signals to read, words to use, body to position. Plus: when to extract instead of engage.')
              ),
              h('span', { 'aria-hidden': 'true', style: { color: '#dc2626', fontSize: 18 } }, deOpen ? '▾' : '▸')
            ),
            deOpen && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #fca5a5', borderRadius: 14 } },
              h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: '#475569' } },
                h('strong', { style: { color: '#991b1b' } }, 'Sometimes intervention escalates. '),
                'Knowing how to bring the temperature down — and when to step out entirely — is the part of upstander work most students never learn. The most important rule: ',
                h('strong', null, 'you are not required to put your body at risk. '),
                'Adults are. You are not.'),
              // Section pills
              h('div', { role: 'tablist', 'aria-label': 'De-escalation sections', style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' } },
                [
                  { id: 'signals',  icon: '🚨', label: 'Read the signals' },
                  { id: 'verbal',   icon: '🗣️', label: 'Verbal tools' },
                  { id: 'physical', icon: '🧍', label: 'Physical safety' },
                  { id: 'after',    icon: '🌿', label: 'After' }
                ].map(function(s) {
                  var active = deSection === s.id;
                  return h('button', {
                    key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                    onClick: function() { upd('deSection', s.id); if (soundOn) sfxClick(); },
                    style: {
                      padding: '6px 12px',
                      background: active ? '#dc2626' : '#fff',
                      color: active ? '#fff' : '#991b1b',
                      border: '1px solid ' + (active ? '#dc2626' : '#fecaca'),
                      borderRadius: 999, fontWeight: active ? 700 : 500, cursor: 'pointer', fontSize: 12
                    }
                  }, h('span', { 'aria-hidden': 'true', style: { marginRight: 4 } }, s.icon), s.label);
                })
              ),
              // Section content
              (function() {
                if (deSection === 'signals') {
                  return h('div', null,
                    h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#475569', lineHeight: 1.5 } },
                      'If you see any of these stacking up, the situation is escalating. The earlier you read them, the more options you have.'),
                    h('div', { style: { display: 'grid', gap: 8 } },
                      DEESCALATION.signals.map(function(s, idx) {
                        return h('div', { key: idx, className: 'us-card', style: {
                          display: 'flex', gap: 10, padding: 10,
                          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8
                        } },
                          h('span', { 'aria-hidden': 'true', style: { fontSize: 22, flexShrink: 0 } }, s.icon),
                          h('div', { style: { fontSize: 13, color: '#0f172a', lineHeight: 1.5 } }, s.label)
                        );
                      })
                    )
                  );
                }
                var rows = deSection === 'verbal' ? DEESCALATION.verbal
                         : deSection === 'physical' ? DEESCALATION.physical
                         : DEESCALATION.after;
                return h('div', { style: { display: 'grid', gap: 10 } },
                  rows.map(function(r, idx) {
                    return h('div', { key: idx, className: 'us-card', style: {
                      padding: 12, background: '#fff', border: '1px solid #fecaca', borderRadius: 10
                    } },
                      h('div', { style: { fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 } },
                        h('span', { style: { color: '#16a34a', marginRight: 6 } }, '✓'),
                        r.do
                      ),
                      h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.55, paddingLeft: 20 } }, r.why)
                    );
                  })
                );
              })(),
              h('div', { style: {
                marginTop: 14, padding: 12, background: '#fffbeb', border: '1px dashed #fcd34d', borderRadius: 10
              } },
                h('p', { style: { margin: 0, fontSize: 12, color: '#0f172a', lineHeight: 1.6 } },
                  h('strong', { style: { color: '#92400e' } }, 'Floor rule: '),
                  'if it crosses into weapons, credible threats of violence, or any moment where your gut says \"I am not safe\" — extract first, intervene later through adults. The most important upstander move you can ever make is staying alive and able to help next time.'))
            )
          )
        );
      }

      // ── Break the Cycle ──
      var cycleContent = null;
      if (activeTab === 'cycle') {
        var breakers = CYCLE_BREAKERS[band] || CYCLE_BREAKERS.elementary;
        cycleContent = h('div', { style: { padding: '20px', maxWidth: '640px', margin: '0 auto' } },
          // Hero card
          h('div', { className: 'us-card', style: {
            padding: '16px 18px', marginBottom: 16, borderRadius: 14,
            background: 'linear-gradient(135deg, #fef2f2 0%, #fef9c3 50%, #f0fdf4 100%)',
            border: '1px solid #fcd34d',
            display: 'flex', alignItems: 'center', gap: 14
          } },
            h('div', { 'aria-hidden': 'true', style: {
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #fca5a5 0%, #16a34a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: '#fff',
              boxShadow: '0 5px 12px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255,255,255,0.30)'
            } }, '\uD83D\uDD17'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { style: { margin: '0 0 2px', color: '#0f172a', fontSize: 20, lineHeight: 1.2 } }, 'Breaking the Cycle'),
              h('p', { style: { margin: 0, color: '#334155', fontSize: 13, lineHeight: 1.5 } },
                'How harm flows, why punishment fails, and what actually works \u2014 for targets, perpetrators, and witnesses alike.')
            )
          ),
          // \u2500\u2500 Harm Cycle visualization \u2500\u2500
          h('div', { className: 'us-card', style: {
            padding: 16, marginBottom: 16, borderRadius: 14,
            background: 'linear-gradient(135deg, #fef2f2 0%, #fefce8 50%, #f0fdf4 100%)',
            border: '1px solid #fcd34d'
          } },
            h('div', { style: { fontSize: 12, color: '#92400e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' } },
              'How harm flows \u2014 and where it stops'),
            h('svg', {
              viewBox: '0 0 460 220',
              role: 'img',
              'aria-label': 'Harm cycle diagram: hurt flows from one person to the next, until one person absorbs it instead of passing it on.',
              style: { width: '100%', height: 'auto', display: 'block', maxWidth: 460, margin: '0 auto' }
            },
              // Arrows between nodes
              h('defs', null,
                h('marker', { id: 'us-arrowhead', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' },
                  h('path', { d: 'M0,0 L10,5 L0,10 Z', fill: '#dc2626' })
                ),
                h('marker', { id: 'us-arrowhead-green', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' },
                  h('path', { d: 'M0,0 L10,5 L0,10 Z', fill: '#16a34a' })
                )
              ),
              // Curved arrows showing harm flowing
              h('path', { d: 'M 80,70 Q 130,40 175,70', stroke: '#dc2626', strokeWidth: 2.5, fill: 'none', 'marker-end': 'url(#us-arrowhead)' }),
              h('path', { d: 'M 215,70 Q 265,40 310,70', stroke: '#dc2626', strokeWidth: 2.5, fill: 'none', 'marker-end': 'url(#us-arrowhead)' }),
              // The cycle-breaker absorbs (no arrow leaving them \u2014 shown by a stop sign)
              h('path', { d: 'M 350,160 L 350,190', stroke: '#16a34a', strokeWidth: 3, fill: 'none', strokeDasharray: '4 3' }),
              // Node 1: Adult hurts child
              h('g', null,
                h('circle', { cx: 60, cy: 90, r: 32, fill: '#fecaca', stroke: '#dc2626', strokeWidth: 2 }),
                h('text', { x: 60, y: 96, textAnchor: 'middle', fontSize: 24 }, '\uD83D\uDC64'),
                h('text', { x: 60, y: 140, textAnchor: 'middle', fontSize: 11, fill: '#991b1b', fontWeight: 700 }, 'Hurt'),
                h('text', { x: 60, y: 155, textAnchor: 'middle', fontSize: 10, fill: '#475569' }, 'at home')
              ),
              // Node 2: Child hurts smaller child
              h('g', null,
                h('circle', { cx: 195, cy: 90, r: 32, fill: '#fed7aa', stroke: '#ea580c', strokeWidth: 2 }),
                h('text', { x: 195, y: 96, textAnchor: 'middle', fontSize: 24 }, '\uD83D\uDE1E'),
                h('text', { x: 195, y: 140, textAnchor: 'middle', fontSize: 11, fill: '#9a3412', fontWeight: 700 }, 'Hurts'),
                h('text', { x: 195, y: 155, textAnchor: 'middle', fontSize: 10, fill: '#475569' }, 'at school')
              ),
              // Node 3: Smaller child hurts someone smaller
              h('g', null,
                h('circle', { cx: 330, cy: 90, r: 32, fill: '#fde68a', stroke: '#ca8a04', strokeWidth: 2 }),
                h('text', { x: 330, y: 96, textAnchor: 'middle', fontSize: 24 }, '\uD83D\uDE22'),
                h('text', { x: 330, y: 140, textAnchor: 'middle', fontSize: 11, fill: '#92400e', fontWeight: 700 }, 'Could pass'),
                h('text', { x: 330, y: 155, textAnchor: 'middle', fontSize: 10, fill: '#475569' }, 'it on')
              ),
              // The cycle-breaker \u2014 distinct, green, with shield
              h('g', null,
                h('circle', { cx: 405, cy: 90, r: 36, fill: '#bbf7d0', stroke: '#16a34a', strokeWidth: 3 }),
                h('text', { x: 405, y: 98, textAnchor: 'middle', fontSize: 28 }, '\uD83D\uDEE1\uFE0F'),
                h('text', { x: 405, y: 145, textAnchor: 'middle', fontSize: 11, fill: '#166534', fontWeight: 800 }, 'The cycle'),
                h('text', { x: 405, y: 158, textAnchor: 'middle', fontSize: 11, fill: '#166534', fontWeight: 800 }, 'breaker')
              ),
              // STOPS HERE label under cycle breaker
              h('rect', { x: 360, y: 188, width: 90, height: 20, rx: 10, fill: '#16a34a' }),
              h('text', { x: 405, y: 202, textAnchor: 'middle', fontSize: 11, fill: '#fff', fontWeight: 800 }, 'STOPS HERE')
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 12, color: '#0f172a', lineHeight: 1.55, textAlign: 'center' } },
              h('strong', null, 'Hurt people hurt people \u2014 '),
              'until one person absorbs the harm instead of passing it on. That person is the cycle breaker. ',
              h('em', null, 'It can be you.'))
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
            breakers.map(function(b, i) {
              var active = i === cycleIdx;
              return h('button', { key: i, className: 'us-card', 'aria-pressed': active ? 'true' : 'false', 'aria-label': b.title,
                onClick: function() { upd('cycleIdx', i); if (soundOn) sfxClick(); },
                style: {
                  background: active ? BL : '#fff',
                  border: active ? '2px solid #93c5fd' : '1px solid #e5e7eb',
                  borderRadius: '14px', padding: '14px', cursor: 'pointer',
                  textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit'
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: active ? 10 : 0 } },
                  h('span', { 'aria-hidden': 'true', style: {
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: active
                      ? 'linear-gradient(135deg, #60a5fa 0%, ' + BLUE + ' 100%)'
                      : 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: '#fff',
                    boxShadow: active ? '0 3px 8px rgba(37, 99, 235, 0.22)' : 'none',
                    transition: 'all 0.18s ease'
                  } }, b.icon),
                  h('h4', { style: { fontSize: 14, fontWeight: 700, color: active ? BD : '#374151', margin: 0, flex: 1 } }, b.title)
                ),
                active && h('p', { style: { fontSize: 13, lineHeight: 1.7, color: '#374151', margin: 0, paddingLeft: 52 } }, b.text)
              );
            })
          ),

          // ── REPAIR pathway (for students who have been the one causing harm) ──
          (function() {
            var steps = REPAIR_STEPS[band] || REPAIR_STEPS.elementary;
            var curStep = steps[Math.min(repairStep, steps.length - 1)];
            return h('div', { style: { marginTop: 28 } },
              h('button', {
                onClick: function() { upd('repairOpen', !repairOpen); if (soundOn) sfxClick(); },
                'aria-expanded': repairOpen ? 'true' : 'false',
                style: {
                  width: '100%', padding: '14px 16px', textAlign: 'left',
                  border: '2px solid ' + (repairOpen ? '#fca5a5' : '#fecaca'),
                  background: repairOpen ? '#fff1f2' : '#fef2f2',
                  borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12, font: 'inherit', color: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #fca5a5 0%, #dc2626 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff',
                  boxShadow: '0 4px 10px rgba(220, 38, 38, 0.22)'
                } }, '🔧'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: '#991b1b', marginBottom: 2 } },
                    'If you have been the one doing the hurting'),
                  h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                    'The hardest tab in this tool. Real repair, not performative apology. ' + steps.length + ' steps.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#dc2626', fontSize: 18 } }, repairOpen ? '▾' : '▸')
              ),
              repairOpen && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #fecaca', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: '#475569' } },
                  h('strong', { style: { color: '#991b1b' } }, 'One thing first: '),
                  'recognizing you have hurt someone is a really hard thing to do, and it is what people who can change actually do. This section assumes you are here in good faith. None of these steps are about getting forgiven — they are about doing the work whether or not forgiveness comes.'),
                // Step indicator
                h('div', { style: { display: 'flex', gap: 6, marginBottom: 14 } },
                  steps.map(function(s, i) {
                    return h('div', { key: i, 'aria-hidden': 'true', style: {
                      flex: 1, height: 6, borderRadius: 3,
                      background: i <= repairStep ? 'linear-gradient(90deg, #dc2626, #b91c1c)' : '#fee2e2'
                    } });
                  })
                ),
                h('div', { 'aria-live': 'polite', className: 'us-pop us-card', style: {
                  padding: 16, borderRadius: 12, background: '#fff1f2', border: '1px solid #fca5a5'
                } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #fca5a5 0%, #dc2626 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: '#fff'
                    } }, curStep.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 11, color: '#991b1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Step ' + curStep.n + ' of ' + steps.length),
                      h('div', { style: { fontSize: 15, fontWeight: 700, color: '#0f172a' } }, curStep.title)
                    )
                  ),
                  h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#1f2937' } }, curStep.body)
                ),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between' } },
                  h('button', {
                    onClick: function() { if (repairStep > 0) upd('repairStep', repairStep - 1); },
                    disabled: repairStep === 0,
                    style: { padding: '8px 14px', background: '#fff', color: repairStep === 0 ? '#94a3b8' : '#0f172a',
                      border: '1px solid #fecaca', borderRadius: 8, fontWeight: 600,
                      cursor: repairStep === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }
                  }, '← Back'),
                  repairStep < steps.length - 1
                    ? h('button', {
                        onClick: function() { upd('repairStep', repairStep + 1); if (soundOn) sfxClick(); },
                        style: { padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                      }, 'Next step →')
                    : h('button', {
                        onClick: function() {
                          upd({ repairStep: 0, repairOpen: false });
                          if (soundOn) sfxBrave();
                          tryAwardBadge('repair_walked', 30);
                        },
                        style: { padding: '8px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                      }, 'Done — close')
                ),
                // ── AI Apology Coach (sub-feature inside Repair) ──
                h('div', { style: { marginTop: 16 } },
                  h('button', {
                    onClick: function() { upd('apOpen', !apOpen); if (soundOn) sfxClick(); },
                    'aria-expanded': apOpen ? 'true' : 'false',
                    style: {
                      width: '100%', padding: '12px 14px', textAlign: 'left',
                      border: '1px dashed #fca5a5',
                      background: apOpen ? '#fff1f2' : 'transparent',
                      borderRadius: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      font: 'inherit', color: 'inherit'
                    }
                  },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, '🎤'),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontWeight: 800, fontSize: 13, color: '#991b1b', marginBottom: 2 } },
                        'Rehearse your apology with AI feedback'),
                      h('div', { style: { fontSize: 11, color: '#64748b', lineHeight: 1.4 } },
                        'Type who you hurt + your draft. Coach tells you what would land, what might backfire, one tweak.')
                    ),
                    h('span', { 'aria-hidden': 'true', style: { color: '#dc2626', fontSize: 16 } }, apOpen ? '▾' : '▸')
                  ),
                  apOpen && h('div', { style: { marginTop: 10, padding: 14, background: '#fff', border: '1px solid #fecaca', borderRadius: 12 } },
                    h('p', { style: { margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: '#475569' } },
                      'A real apology has no "but," no "if you felt that way." Practice here, then have the conversation for real. The AI cannot make this easier than it is, but it can help you notice what you are actually saying.'),
                    h('label', { htmlFor: 'us-ap-hurt', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                      'Who you hurt and what happened (brief)'),
                    h('textarea', { id: 'us-ap-hurt', value: apHurt,
                      onChange: function(e) { upd('apHurt', e.target.value); },
                      placeholder: 'Example: My friend J — I told the group their secret as a joke and they heard about it.',
                      rows: 2,
                      style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
                    }),
                    h('label', { htmlFor: 'us-ap-draft', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                      'Your draft apology — the exact words you would say'),
                    h('textarea', { id: 'us-ap-draft', value: apDraft,
                      onChange: function(e) { upd('apDraft', e.target.value); },
                      placeholder: 'Type your apology as if you were saying it out loud...',
                      rows: 4,
                      style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
                    }),
                    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                      h('button', {
                        disabled: apLoading || !apHurt.trim() || !apDraft.trim() || !callGemini,
                        'aria-busy': apLoading ? 'true' : 'false',
                        onClick: function() {
                          if (!apHurt.trim() || !apDraft.trim() || !callGemini) return;
                          upd({ apLoading: true, apFeedback: '' });
                          var prompt =
                            'You are a kind, grounded coach helping a ' + band + ' school student rehearse an APOLOGY for harm they caused. ' +
                            'They have given you what happened and their draft apology. ' +
                            'Give feedback in exactly three short labeled parts (each 1–2 sentences, total under 130 words):\n\n' +
                            '1) What in this draft would probably land well — what shows real accountability\n' +
                            '2) What might backfire — \"but,\" minimizing, centering yourself, asking for forgiveness too early\n' +
                            '3) One concrete tweak that would strengthen it\n\n' +
                            'Be specific. Use the actual words from their draft when you reference them. ' +
                            'Do not write the perfect apology for them — their voice matters more than yours. ' +
                            'Do not promise forgiveness will come. Tone: warm, real, no emojis.\n\n' +
                            'WHAT HAPPENED: \"' + apHurt.trim().replace(/"/g, '\\\"') + '\"\n' +
                            'THEIR DRAFT: \"' + apDraft.trim().replace(/"/g, '\\\"') + '\"';
                          callGemini(prompt, false).then(function(r) {
                            upd({ apLoading: false, apFeedback: (r || '').trim() });
                            if (soundOn) sfxBrave();
                            tryAwardBadge('rehearsed', 10);
                            if (announceToSR) announceToSR('Apology feedback ready');
                          }).catch(function() {
                            upd({ apLoading: false, apFeedback: 'The AI is not reachable right now. While you wait, read your draft out loud. Notice any "but," any "if you felt that way," any place where you are explaining yourself instead of acknowledging impact. Those are the edits to make.' });
                          });
                        },
                        style: {
                          padding: '8px 14px',
                          background: (apLoading || !apHurt.trim() || !apDraft.trim() || !callGemini) ? '#cbd5e1' : '#dc2626',
                          color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                          cursor: (apLoading || !apHurt.trim() || !apDraft.trim() || !callGemini) ? 'not-allowed' : 'pointer',
                          fontSize: 13
                        }
                      }, apLoading ? 'Thinking…' : (callGemini ? 'Get coach feedback' : 'AI not available')),
                      apFeedback && h('button', {
                        onClick: function() { upd({ apHurt: '', apDraft: '', apFeedback: '' }); },
                        style: { padding: '8px 14px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                      }, 'Try another')
                    ),
                    !callGemini && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: '#991b1b' } },
                      'AI features need a connection. While offline: read your draft out loud and listen for any \"but.\"'),
                    apFeedback && h('div', { 'aria-live': 'polite', className: 'us-pop', style: {
                      marginTop: 12, padding: 12, background: '#fff1f2', border: '1px dashed #fca5a5',
                      borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: '#0f172a', whiteSpace: 'pre-wrap'
                    } }, apFeedback),
                    apFeedback && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: '#991b1b', fontStyle: 'italic' } },
                      'AI-generated. The rehearsal is not the apology — the conversation with the real person is.')
                  )
                )
              )
            );
          })(),

          // ── RIGHT AFTER: 5-step grounding for someone just targeted ──
          (function() {
            var steps = RIGHT_AFTER_STEPS[band] || RIGHT_AFTER_STEPS.elementary;
            var curStep = steps[Math.min(afterStep, steps.length - 1)];
            return h('div', { style: { marginTop: 16 } },
              h('button', {
                onClick: function() { upd('afterOpen', !afterOpen); if (soundOn) sfxClick(); },
                'aria-expanded': afterOpen ? 'true' : 'false',
                style: {
                  width: '100%', padding: '14px 16px', textAlign: 'left',
                  border: '2px solid ' + (afterOpen ? '#93c5fd' : '#bfdbfe'),
                  background: afterOpen ? '#eff6ff' : '#f0f9ff',
                  borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  font: 'inherit', color: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #60a5fa 0%, ' + BLUE + ' 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff',
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.22)'
                } }, '🛟'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: BD, marginBottom: 2 } },
                    'Right after — if you were just targeted'),
                  h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                    'A ' + steps.length + '-step grounding sequence for the moments right after. Built for your body, not just your brain.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: BLUE, fontSize: 18 } }, afterOpen ? '▾' : '▸')
              ),
              afterOpen && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #bfdbfe', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: '#475569' } },
                  h('strong', { style: { color: BD } }, 'Take it one step at a time. '),
                  'You do not have to read all of these now. Just do the next one. Your job in the next few minutes is not to figure out the whole situation — it is to take care of your body.'),
                // Step indicator
                h('div', { style: { display: 'flex', gap: 6, marginBottom: 14 } },
                  steps.map(function(s, i) {
                    return h('div', { key: i, 'aria-hidden': 'true', style: {
                      flex: 1, height: 6, borderRadius: 3,
                      background: i <= afterStep ? 'linear-gradient(90deg, ' + BLUE + ', #1d4ed8)' : '#dbeafe'
                    } });
                  })
                ),
                h('div', { 'aria-live': 'polite', className: 'us-pop us-card', style: {
                  padding: 16, borderRadius: 12, background: '#f0f9ff', border: '1px solid #93c5fd'
                } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #60a5fa 0%, ' + BLUE + ' 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: '#fff'
                    } }, curStep.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 11, color: BD, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Step ' + curStep.n + ' of ' + steps.length),
                      h('div', { style: { fontSize: 15, fontWeight: 700, color: '#0f172a' } }, curStep.title)
                    )
                  ),
                  h('p', { style: { margin: '0 0 6px', fontSize: 14, lineHeight: 1.6, color: '#1f2937' } }, curStep.body),
                  h('div', { style: { fontSize: 12, color: '#64748b', fontStyle: 'italic' } }, curStep.sec)
                ),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between' } },
                  h('button', {
                    onClick: function() { if (afterStep > 0) upd('afterStep', afterStep - 1); },
                    disabled: afterStep === 0,
                    style: { padding: '8px 14px', background: '#fff', color: afterStep === 0 ? '#94a3b8' : '#0f172a',
                      border: '1px solid #bfdbfe', borderRadius: 8, fontWeight: 600,
                      cursor: afterStep === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }
                  }, '← Back'),
                  afterStep < steps.length - 1
                    ? h('button', {
                        onClick: function() { upd('afterStep', afterStep + 1); if (soundOn) sfxClick(); },
                        style: { padding: '8px 14px', background: BLUE, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                      }, 'Next step →')
                    : h('button', {
                        onClick: function() {
                          upd({ afterStep: 0, afterOpen: false });
                          if (soundOn) sfxBrave();
                          tryAwardBadge('self_care', 15);
                        },
                        style: { padding: '8px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                      }, 'Done — close')
                )
              )
            );
          })(),

          // ── For the witness who froze — healing the shame ──
          (function() {
            var steps = WITNESS_HEAL_STEPS[band] || WITNESS_HEAL_STEPS.elementary;
            var curStep = steps[Math.min(whStep, steps.length - 1)];
            return h('div', { style: { marginTop: 16 } },
              h('button', {
                onClick: function() { upd('whOpen', !whOpen); if (soundOn) sfxClick(); },
                'aria-expanded': whOpen ? 'true' : 'false',
                style: {
                  width: '100%', padding: '14px 16px', textAlign: 'left',
                  border: '2px solid ' + (whOpen ? '#c084fc' : '#d8b4fe'),
                  background: whOpen ? '#faf5ff' : '#fdf4ff',
                  borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  font: 'inherit', color: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff',
                  boxShadow: '0 4px 10px rgba(147, 51, 234, 0.22)'
                } }, '✨'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: '#6b21a8', marginBottom: 2 } },
                    'For the witness who froze — healing the shame'),
                  h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                    'If you carry a memory of NOT acting when you should have — this section is for you. ' + steps.length + ' steps.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#9333ea', fontSize: 18 } }, whOpen ? '▾' : '▸')
              ),
              whOpen && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #d8b4fe', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: '#475569' } },
                  h('strong', { style: { color: '#6b21a8' } }, 'Most people have one. '),
                  'A memory of when they should have said something and did not. The shame is real, and the path forward is real too. This is not about absolving you — it is about helping you become someone you can trust to show up next time.'),
                // Step indicator
                h('div', { style: { display: 'flex', gap: 6, marginBottom: 14 } },
                  steps.map(function(s, i) {
                    return h('div', { key: i, 'aria-hidden': 'true', style: {
                      flex: 1, height: 6, borderRadius: 3,
                      background: i <= whStep ? 'linear-gradient(90deg, #9333ea, #6b21a8)' : '#ede9fe'
                    } });
                  })
                ),
                h('div', { 'aria-live': 'polite', className: 'us-pop us-card', style: {
                  padding: 16, borderRadius: 12, background: '#faf5ff', border: '1px solid #c084fc'
                } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: '#fff'
                    } }, curStep.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 11, color: '#6b21a8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Step ' + curStep.n + ' of ' + steps.length),
                      h('div', { style: { fontSize: 15, fontWeight: 700, color: '#0f172a' } }, curStep.title)
                    )
                  ),
                  h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#1f2937' } }, curStep.body)
                ),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between' } },
                  h('button', {
                    onClick: function() { if (whStep > 0) upd('whStep', whStep - 1); },
                    disabled: whStep === 0,
                    style: { padding: '8px 14px', background: '#fff', color: whStep === 0 ? '#94a3b8' : '#0f172a',
                      border: '1px solid #d8b4fe', borderRadius: 8, fontWeight: 600,
                      cursor: whStep === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }
                  }, '← Back'),
                  whStep < steps.length - 1
                    ? h('button', {
                        onClick: function() { upd('whStep', whStep + 1); if (soundOn) sfxClick(); },
                        style: { padding: '8px 14px', background: '#9333ea', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                      }, 'Next step →')
                    : h('button', {
                        onClick: function() {
                          upd({ whStep: 0, whOpen: false });
                          tryAwardBadge('healed_witness', 20);
                        },
                        style: { padding: '8px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                      }, 'Done — close')
                )
              )
            );
          })()
        );
      }

      // ── Reference (Sources / Educators / Glossary) ──
      var refContent = null;
      if (activeTab === 'reference') {
        var refSections = [
          { id: 'sources',   icon: '📰', label: 'Sources' },
          { id: 'report',    icon: '📋', label: 'If You Report' },
          { id: 'educators', icon: '👨‍🏫', label: 'For Educators' },
          { id: 'parents',   icon: '👪', label: 'For Parents' },
          { id: 'glossary',  icon: '📖', label: 'Glossary' }
        ];
        var refBody;
        if (refSection === 'report') {
          refBody = h('div', null,
            h('div', { className: 'us-card', style: {
              padding: 14, marginBottom: 14,
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1px solid #fcd34d', borderRadius: 10
            } },
              h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.55, color: '#0f172a' } },
                h('strong', { style: { color: '#92400e' } }, 'Reporting is a real thing that has real steps. '),
                'Most students do not know what actually happens after they tell an adult — which is one reason they hesitate. Below is what the process looks like, what you should expect, and what to do if the system stalls.'),
              h('p', { style: { margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.55, fontStyle: 'italic' } },
                'Note: specifics vary by state and district. Use StopBullying.gov to look up your state\'s laws and your school\'s posted policy.')
            ),
            h('div', { style: { display: 'grid', gap: 10 } },
              US_REPORT_STEPS.map(function(s, idx) {
                return h('div', { key: idx, className: 'us-card', style: {
                  display: 'flex', gap: 14, padding: 14, border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff'
                } },
                  h('div', { 'aria-hidden': 'true', style: {
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, #60a5fa 0%, ' + BLUE + ' 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: '#fff',
                    boxShadow: '0 3px 8px rgba(37, 99, 235, 0.18)'
                  } }, s.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 11, color: BD, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Step ' + (idx + 1)),
                    h('div', { style: { fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 6 } }, s.title),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.6, color: '#334155' } }, s.body),
                    h('div', { style: { padding: 10, background: '#f0f9ff', borderLeft: '3px solid ' + BLUE, borderRadius: 6 } },
                      h('div', { style: { fontSize: 10, color: BD, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 } }, 'Tip'),
                      h('div', { style: { fontSize: 12, color: '#1f2937', lineHeight: 1.5 } }, s.tip)
                    )
                  )
                );
              })
            ),
            h('div', { style: {
              marginTop: 16, padding: 14, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10
            } },
              h('div', { style: { fontWeight: 800, color: '#166534', marginBottom: 6, fontSize: 14 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '✊'),
                'You have rights'),
              h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7, color: '#0f172a' } },
                h('li', null, 'You cannot be punished for reporting in good faith.'),
                h('li', null, 'You should be told what action the school took (specific outcomes may be private, but the existence of a response should not be).'),
                h('li', null, 'You can request that you not be brought into the same room as the person who caused harm without your consent.'),
                h('li', null, 'You have the right to a safety plan if you continue to feel unsafe.'),
                h('li', null, 'If the school does not respond, you can escalate to the district, the state, OCR (for identity-based harassment), and StopBullying.gov.')
              )
            ),
            // ── Restorative Conferencing Walkthrough ──
            h('div', { style: { marginTop: 20 } },
              h('h4', { style: { margin: '0 0 6px', fontSize: 15, color: BD, fontWeight: 800 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🤝'),
                'What a restorative conference actually looks like'),
              h('p', { style: { fontSize: 12, color: '#475569', marginBottom: 12, lineHeight: 1.55 } },
                'If the school offers restorative conferencing, you should know what you are agreeing to. The phases below are typical of well-run conferences using International Institute for Restorative Practices (IIRP) frameworks. Quality of facilitation varies — ask questions about training and follow-through.'),
              h('div', { style: { display: 'grid', gap: 8 } },
                RESTORATIVE_WALKTHROUGH.map(function(step, idx) {
                  var phaseColor = step.phase === 'Before' ? '#0891b2' : step.phase === 'During' ? '#7c3aed' : '#059669';
                  var phaseBg    = step.phase === 'Before' ? '#ecfeff' : step.phase === 'During' ? '#faf5ff' : '#f0fdf4';
                  return h('div', { key: idx, className: 'us-card', style: {
                    padding: 12, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10,
                    display: 'flex', gap: 12
                  } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 56, flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: phaseBg,
                      borderRadius: 8,
                      padding: '6px 4px'
                    } },
                      h('div', { style: { fontSize: 9, color: phaseColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, step.phase),
                      h('div', { style: { fontSize: 18, color: phaseColor, fontWeight: 800, marginTop: 2 } }, idx + 1)
                    ),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 } }, step.title),
                      h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#334155' } }, step.body)
                    )
                  );
                })
              ),
              h('p', { style: { margin: '12px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.55, fontStyle: 'italic' } },
                'Restorative practice works when it is real. It re-harms when it is performative. You can say no. You can say "not yet." You can stop the process at any point.')
            )
          );
        } else if (refSection === 'educators') {
          refBody = h('div', null,
            h('div', { className: 'us-card', style: {
              padding: 14, marginBottom: 14, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10
            } },
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#0f172a' } },
                h('strong', { style: { color: BLUE } }, 'For teachers, school psychologists, counselors, administrators. '),
                'Students may show you this tool. The seven items below are the ones most often misunderstood about bullying — backed by the research in the Sources tab.')
            ),
            h('div', { style: { display: 'grid', gap: 10 } },
              (function() {
                var palettes = [
                  { from: '#60a5fa', to: '#2563eb', accent: '#1e40af' },
                  { from: '#a78bfa', to: '#7c3aed', accent: '#6b21a8' },
                  { from: '#fb923c', to: '#ea580c', accent: '#9a3412' },
                  { from: '#34d399', to: '#059669', accent: '#166534' },
                  { from: '#f87171', to: '#dc2626', accent: '#991b1b' },
                  { from: '#22d3ee', to: '#0891b2', accent: '#0e7490' },
                  { from: '#f472b6', to: '#db2777', accent: '#9d174d' }
                ];
                return US_EDUCATORS.map(function(tip, idx) {
                  var p = palettes[idx % palettes.length];
                  return h('div', { key: idx, className: 'us-card', style: {
                    display: 'flex', gap: 14, padding: 14, border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff'
                  } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                      background: 'linear-gradient(135deg, ' + p.from + ' 0%, ' + p.to + ' 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26, color: '#fff',
                      boxShadow: '0 4px 10px ' + p.to + '33, inset 0 1px 0 rgba(255,255,255,0.3)'
                    } }, tip.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontWeight: 700, fontSize: 15, color: p.accent, marginBottom: 4 } }, tip.title),
                      h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#334155' } }, tip.body)
                    )
                  );
                });
              })()
            )
          );
        } else if (refSection === 'parents') {
          refBody = h('div', null,
            h('div', { className: 'us-card', style: {
              padding: 14, marginBottom: 14,
              background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
              border: '1px solid #fcd34d', borderRadius: 10
            } },
              h('p', { style: { margin: '0 0 6px', fontSize: 13, lineHeight: 1.55, color: '#0f172a' } },
                h('strong', { style: { color: '#92400e' } }, 'For parents and caregivers specifically. '),
                'The things that are usually missing from parent-facing bullying guidance: how to talk so your kid keeps talking, how to handle suspecting your kid is the one bullying, how to advocate at the school without becoming the adversary, and how to read warning signs.'),
              h('p', { style: { margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.55, fontStyle: 'italic' } },
                'Note: cyberbullying has its own toolkit in Digital Wellbeing Studio (also in the SEL Hub). Read both if your kid spends time online.')
            ),
            h('div', { style: { display: 'grid', gap: 10 } },
              (function() {
                var palettes = [
                  { from: '#fb923c', to: '#ea580c', accent: '#9a3412' },
                  { from: '#f87171', to: '#dc2626', accent: '#991b1b' },
                  { from: '#60a5fa', to: '#2563eb', accent: '#1e40af' },
                  { from: '#a78bfa', to: '#7c3aed', accent: '#6b21a8' },
                  { from: '#34d399', to: '#059669', accent: '#166534' },
                  { from: '#22d3ee', to: '#0891b2', accent: '#0e7490' },
                  { from: '#f472b6', to: '#db2777', accent: '#9d174d' },
                  { from: '#facc15', to: '#ca8a04', accent: '#854d0e' }
                ];
                return US_PARENTS.map(function(tip, idx) {
                  var p = palettes[idx % palettes.length];
                  return h('div', { key: idx, className: 'us-card', style: {
                    display: 'flex', gap: 14, padding: 14, border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff'
                  } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                      background: 'linear-gradient(135deg, ' + p.from + ' 0%, ' + p.to + ' 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26, color: '#fff',
                      boxShadow: '0 4px 10px ' + p.to + '33, inset 0 1px 0 rgba(255,255,255,0.3)'
                    } }, tip.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontWeight: 700, fontSize: 15, color: p.accent, marginBottom: 4 } }, tip.title),
                      h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#334155' } }, tip.body)
                    )
                  );
                });
              })()
            ),
            h('div', { style: {
              marginTop: 16, padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10
            } },
              h('div', { style: { fontWeight: 800, color: '#991b1b', marginBottom: 6, fontSize: 14 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '📞'),
                'When in crisis'),
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#0f172a' } },
                'If your kid says anything that worries you about self-harm: 988 (call or text), Crisis Text Line (text HOME to 741741), or your local ER. Asking directly about suicide does not plant the idea — but staying silent can be the thing that lets it harden. Trust your gut.')
            )
          );
        } else if (refSection === 'glossary') {
          refBody = h('div', null,
            h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 10, lineHeight: 1.5 } },
              'Tap any term to expand. Useful for parent conversations, IEP meetings, and getting precise about what we mean by words that get used loosely.'),
            h('div', { style: { display: 'grid', gap: 6 } },
              US_GLOSSARY.map(function(g) {
                var open = refExpanded === g.term;
                return h('div', { key: g.term, style: {
                  border: '1px solid ' + (open ? '#93c5fd' : '#e2e8f0'),
                  borderRadius: 8, background: open ? '#eff6ff' : '#fff', overflow: 'hidden'
                } },
                  h('button', {
                    onClick: function() { upd('refExpanded', open ? null : g.term); if (soundOn) sfxClick(); },
                    'aria-expanded': open ? 'true' : 'false',
                    style: {
                      width: '100%', padding: '10px 12px', textAlign: 'left',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 14, fontWeight: 700, color: '#0f172a',
                      display: 'flex', alignItems: 'center', gap: 8
                    }
                  },
                    h('span', { style: { flex: 1 } }, g.term),
                    h('span', { 'aria-hidden': 'true', style: { color: '#64748b', fontSize: 16 } }, open ? '▾' : '▸')
                  ),
                  open && h('p', { style: { margin: 0, padding: '0 12px 12px', fontSize: 13, lineHeight: 1.55, color: '#334155' } }, g.def)
                );
              })
            )
          );
        } else {
          refBody = h('div', null,
            h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.5 } },
              'Where the claims in this tool come from. Use these to verify, deepen, or share with parents and educators who want documentation.'),
            h('div', { style: { display: 'grid', gap: 10 } },
              US_SOURCES.map(function(s, idx) {
                return h('div', { key: idx, className: 'us-card', style: {
                  padding: 12, border: '1px solid #bfdbfe', borderRadius: 10, background: '#f8fafc'
                } },
                  h('div', { style: { fontWeight: 700, fontSize: 14, color: '#0f172a', lineHeight: 1.4 } }, s.name),
                  h('div', { style: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 4 } }, s.who),
                  h('div', { style: { fontSize: 13, color: '#334155', lineHeight: 1.55, marginTop: 6 } }, s.what)
                );
              })
            )
          );
        }
        refContent = h('div', { style: { padding: '20px', maxWidth: '680px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '16px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))' } }, '📚'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Reference'),
            h('p', { style: { fontSize: '13px', color: '#64748b', margin: 0 } }, 'Sources cited, guidance for educators, and a glossary of key terms.')
          ),
          h('div', { role: 'tablist', 'aria-label': 'Reference sections', style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' } },
            refSections.map(function(s) {
              var active = refSection === s.id;
              return h('button', {
                key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { upd({ refSection: s.id, refExpanded: null }); if (soundOn) sfxClick(); },
                style: {
                  padding: '6px 12px',
                  background: active ? BLUE : '#fff',
                  color: active ? '#fff' : '#0f172a',
                  border: '1px solid ' + (active ? BLUE : '#cbd5e1'),
                  borderRadius: 999, fontWeight: active ? 700 : 500, cursor: 'pointer', fontSize: 13
                }
              }, h('span', { 'aria-hidden': 'true', style: { marginRight: 4 } }, s.icon), s.label);
            })
          ),
          refBody
        );
      }

      // ── My Pledge ──
      var pledgeContent = null;
      if (activeTab === 'pledge') {
        pledgeContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          // Hero card
          h('div', { className: 'us-card', style: {
            padding: '16px 18px', marginBottom: 18, borderRadius: 14,
            background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
            border: '1px solid #fcd34d',
            display: 'flex', alignItems: 'center', gap: 14
          } },
            h('div', { 'aria-hidden': 'true', style: {
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #fde047 0%, #ca8a04 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: '#fff',
              boxShadow: '0 5px 12px rgba(202, 138, 4, 0.32), inset 0 1px 0 rgba(255,255,255,0.30)'
            } }, '\u270D\uFE0F'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { style: { margin: '0 0 2px', color: '#854d0e', fontSize: 20, lineHeight: 1.2 } }, 'My Upstander Pledge'),
              h('p', { style: { margin: 0, color: '#78350f', fontSize: 13, lineHeight: 1.5 } },
                band === 'elementary' ? 'Write a promise to yourself about how you\u2019ll act when you see bullying.'
                : 'Define who you want to be in the face of cruelty. Not who you think you should be \u2014 who you choose to be.')
            )
          ),
          !pledgeSaved
            ? h('div', { style: { background: BL, borderRadius: '16px', padding: '20px', border: '2px solid #93c5fd' } },
                h('div', { style: { fontSize: '13px', color: BD, fontStyle: 'italic', marginBottom: '10px' } }, 'I pledge to...'),
                h('textarea', { value: pledge, onChange: function(ev) { upd('pledge', ev.target.value); }, 'aria-label': 'Write your upstander pledge',
                  placeholder: band === 'elementary' ? 'When I see someone being bullied, I will...' : 'The kind of person I choose to be when I witness harm...',
                  style: { width: '100%', border: 'none', background: 'transparent', fontSize: '14px', fontFamily: 'Georgia, serif', lineHeight: 1.8, color: '#1f2937', resize: 'vertical', minHeight: '100px', boxSizing: 'border-box', outline: 'none' }
                }),
                h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } },
                  h('button', { onClick: function() { if (pledge.trim()) { upd('pledgeSaved', true); tryAwardBadge('pledge_sealed', 20); } }, disabled: !pledge.trim(),
                    style: { padding: '10px 24px', background: pledge.trim() ? BLUE : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: pledge.trim() ? 'pointer' : 'not-allowed' }
                  }, '\uD83E\uDDF1 Seal My Pledge')
                )
              )
            : h('div', { className: 'us-pop', style: {
                position: 'relative',
                background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
                borderRadius: 18, padding: '32px 28px 22px',
                border: '3px double #ca8a04',
                textAlign: 'center',
                boxShadow: '0 8px 28px rgba(202, 138, 4, 0.18), 0 2px 6px rgba(15, 23, 42, 0.08)'
              } },
                // Decorative gold corners
                h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8,  left: 8,  width: 24, height: 24, borderTop: '2px solid #d97706', borderLeft: '2px solid #d97706', borderTopLeftRadius: 6 } }),
                h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8,  right: 8, width: 24, height: 24, borderTop: '2px solid #d97706', borderRight: '2px solid #d97706', borderTopRightRadius: 6 } }),
                h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, left: 8, width: 24, height: 24, borderBottom: '2px solid #d97706', borderLeft: '2px solid #d97706', borderBottomLeftRadius: 6 } }),
                h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: 8, right: 8, width: 24, height: 24, borderBottom: '2px solid #d97706', borderRight: '2px solid #d97706', borderBottomRightRadius: 6 } }),
                // Seal
                h('div', { 'aria-hidden': 'true', style: {
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #fde047 0%, #ca8a04 100%)',
                  margin: '0 auto 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, color: '#fff',
                  boxShadow: '0 4px 12px rgba(202, 138, 4, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                  border: '2px solid #fef3c7'
                } }, '\uD83E\uDDF1'),
                h('div', { style: { fontSize: 11, color: '#92400e', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 800, marginBottom: 4 } }, 'Certificate of Pledge'),
                h('div', { style: { fontSize: 13, fontStyle: 'italic', color: '#a16207', marginBottom: 14 } }, '\u2014 Upstander Workshop \u2014'),
                h('div', { style: { fontSize: 12, color: '#78350f', marginBottom: 6 } }, 'I, the undersigned, pledge to:'),
                h('p', { style: {
                  fontSize: 17, fontWeight: 600, color: '#1f2937', lineHeight: 1.6,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  margin: '0 auto 18px', maxWidth: 480,
                  padding: '14px 18px',
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: 10,
                  borderLeft: '3px solid #ca8a04',
                  borderRight: '3px solid #ca8a04'
                } }, '\u201C' + pledge + '\u201D'),
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, fontSize: 11, color: '#78350f', maxWidth: 480, margin: '0 auto', paddingTop: 4 } },
                  h('div', { style: { flex: 1, borderTop: '1px solid #ca8a04', paddingTop: 4 } },
                    h('div', { style: { fontStyle: 'italic', fontWeight: 600, fontFamily: 'Georgia, serif' } }, 'Signed by you'),
                    h('div', { style: { fontSize: 10, marginTop: 2, opacity: 0.7 } }, 'Witnessed by your courage')
                  ),
                  h('div', { style: { flex: 1, borderTop: '1px solid #ca8a04', paddingTop: 4 } },
                    h('div', { style: { fontStyle: 'italic', fontWeight: 600, fontFamily: 'Georgia, serif' } }, new Date().toLocaleDateString()),
                    h('div', { style: { fontSize: 10, marginTop: 2, opacity: 0.7 } }, 'Date sealed')
                  )
                ),
                h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 } },
                  h('button', {
                    onClick: function() { if (window.print) window.print(); },
                    'aria-label': 'Print certificate',
                    style: { padding: '8px 14px', background: '#ca8a04', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12 }
                  }, '\uD83D\uDDA8\uFE0F Print certificate'),
                  h('button', { onClick: function() { upd('pledgeSaved', false); },
                    style: { padding: '8px 14px', background: 'transparent', color: '#78350f', border: '1px solid #ca8a04', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12 }
                  }, '\u270F\uFE0F Edit pledge')
                )
              ),
          // \u2500\u2500 Trusted Adults circle \u2500\u2500
          h('div', { style: { marginTop: 24 } },
            h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: 12 } },
              h('div', { className: 'sel-hero-icon', style: { fontSize: 36, marginBottom: 4 } }, '\uD83D\uDC65'),
              h('h3', { style: { fontSize: 16, fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'My Trusted Adults'),
              h('p', { style: { fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' } },
                'A small list of adults you trust enough to bring something hard to. Aim for 3 \u2014 ideally from different parts of your life (home, school, community). Knowing the names BEFORE you need them is half the battle.')
            ),
            trustedAdults.length > 0 && h('div', { style: { display: 'grid', gap: 8, marginBottom: 12 } },
              trustedAdults.map(function(a, idx) {
                return h('div', { key: idx, className: 'us-card', style: {
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10
                } },
                  h('div', { 'aria-hidden': 'true', style: {
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800
                  } }, (a.name || '?').charAt(0).toUpperCase()),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontWeight: 700, fontSize: 14, color: '#166534' } }, a.name),
                    h('div', { style: { fontSize: 12, color: '#475569' } }, a.role || 'trusted adult')
                  ),
                  h('button', {
                    'aria-label': 'Remove ' + a.name,
                    onClick: function() {
                      var na = trustedAdults.slice(); na.splice(idx, 1);
                      upd('trustedAdults', na);
                    },
                    style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, fontWeight: 700, lineHeight: 1, padding: 0 }
                  }, '\u00D7')
                );
              })
            ),
            h('div', { className: 'us-card', style: { padding: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 } },
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' } },
                h('label', { style: { flex: '1 1 140px', display: 'flex', flexDirection: 'column', fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } },
                  'Name',
                  h('input', { type: 'text', value: newAdultName,
                    onChange: function(e) { upd('newAdultName', e.target.value); },
                    placeholder: 'Ms. Rodriguez',
                    style: { marginTop: 4, padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#0f172a' }
                  })
                ),
                h('label', { style: { flex: '1 1 140px', display: 'flex', flexDirection: 'column', fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } },
                  'How you know them',
                  h('input', { type: 'text', value: newAdultRole,
                    onChange: function(e) { upd('newAdultRole', e.target.value); },
                    placeholder: 'School counselor',
                    style: { marginTop: 4, padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#0f172a' }
                  })
                ),
                h('button', {
                  disabled: !newAdultName.trim(),
                  onClick: function() {
                    if (!newAdultName.trim()) return;
                    var na = trustedAdults.concat([{ name: newAdultName.trim(), role: newAdultRole.trim() || 'trusted adult' }]);
                    upd({ trustedAdults: na, newAdultName: '', newAdultRole: '' });
                    if (soundOn) sfxClick();
                    if (na.length >= 3) tryAwardBadge('trusted_circle', 15);
                  },
                  style: { padding: '8px 14px', background: newAdultName.trim() ? BLUE : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: newAdultName.trim() ? 'pointer' : 'not-allowed', fontSize: 13 }
                }, 'Add to circle')
              ),
              h('p', { style: { margin: '8px 0 0', fontSize: 11, color: '#64748b', fontStyle: 'italic' } },
                'No accounts, no sharing \u2014 this lives only on your device unless you save the packet.')
            )
          ),
          // \u2500\u2500 Witness Log \u2500\u2500
          h('div', { style: { marginTop: 24 } },
            h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: 12 } },
              h('div', { className: 'sel-hero-icon', style: { fontSize: 36, marginBottom: 4 } }, '\uD83D\uDCD3'),
              h('h3', { style: { fontSize: 16, fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Witness Log'),
              h('p', { style: { fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' } },
                'A private record of what you have seen \u2014 and what you did or did not do about it. Not for anyone else. The act of writing it down is the work.')
            ),
            // Log form
            h('div', { className: 'us-card', style: { padding: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 14 } },
              h('label', { htmlFor: 'us-wl-saw', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What I saw'),
              h('textarea', { id: 'us-wl-saw', value: wlSaw, onChange: function(e) { upd('wlSaw', e.target.value); },
                placeholder: 'A short description of what happened...',
                rows: 2,
                style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('label', { htmlFor: 'us-wl-did', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What I did \u2014 or did not do'),
              h('textarea', { id: 'us-wl-did', value: wlDid, onChange: function(e) { upd('wlDid', e.target.value); },
                placeholder: 'Honesty over performance. "I froze" is a valid answer.',
                rows: 2,
                style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('label', { htmlFor: 'us-wl-next', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What I would do next time'),
              h('textarea', { id: 'us-wl-next', value: wlNext, onChange: function(e) { upd('wlNext', e.target.value); },
                placeholder: 'One specific thing. Even small counts.',
                rows: 2,
                style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('button', {
                disabled: !wlSaw.trim() && !wlDid.trim() && !wlNext.trim(),
                onClick: function() {
                  var anyText = wlSaw.trim() || wlDid.trim() || wlNext.trim();
                  if (!anyText) return;
                  var entry = {
                    date: new Date().toLocaleDateString(),
                    ts: Date.now(),
                    saw: wlSaw.trim(),
                    did: wlDid.trim(),
                    next: wlNext.trim()
                  };
                  upd({ witnessLog: [entry].concat(witnessLog), wlSaw: '', wlDid: '', wlNext: '' });
                  if (soundOn) sfxClick();
                  tryAwardBadge('witness_logged', 10);
                },
                style: { padding: '8px 16px',
                  background: (wlSaw.trim() || wlDid.trim() || wlNext.trim()) ? BLUE : '#cbd5e1',
                  color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                  cursor: (wlSaw.trim() || wlDid.trim() || wlNext.trim()) ? 'pointer' : 'not-allowed', fontSize: 13 }
              }, '\uD83D\uDCDD Save entry')
            ),
            // Past entries
            witnessLog.length > 0 && h('div', null,
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } },
                'Past entries (' + witnessLog.length + ')'),
              h('div', { style: { display: 'grid', gap: 8 } },
                witnessLog.map(function(e, idx) {
                  return h('div', { key: e.ts || idx, className: 'us-card', style: {
                    padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10
                  } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                      h('div', { style: { fontSize: 11, fontWeight: 700, color: BD } }, e.date),
                      h('button', {
                        'aria-label': 'Delete entry from ' + e.date,
                        onClick: function() {
                          var na = witnessLog.slice(); na.splice(idx, 1);
                          upd('witnessLog', na);
                        },
                        style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }
                      }, '\u00D7')
                    ),
                    e.saw && h('div', { style: { fontSize: 12, marginBottom: 4 } },
                      h('span', { style: { fontWeight: 700, color: '#475569' } }, 'Saw: '),
                      h('span', { style: { color: '#0f172a' } }, e.saw)),
                    e.did && h('div', { style: { fontSize: 12, marginBottom: 4 } },
                      h('span', { style: { fontWeight: 700, color: '#475569' } }, 'Did: '),
                      h('span', { style: { color: '#0f172a' } }, e.did)),
                    e.next && h('div', { style: { fontSize: 12 } },
                      h('span', { style: { fontWeight: 700, color: '#475569' } }, 'Next time: '),
                      h('span', { style: { color: '#0f172a' } }, e.next))
                  );
                })
              )
            )
          ),
          // ── Counselor Handoff packet ──
          (pledgeSaved || witnessLog.length > 0 || trustedAdults.length > 0) && h('div', { style: { marginTop: 24 } },
            h('div', { className: 'us-card', style: {
              padding: 14, background: 'linear-gradient(135deg, #ecfeff 0%, #f0f9ff 100%)',
              border: '1px solid #67e8f9', borderRadius: 12,
              display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'
            } },
              h('span', { 'aria-hidden': 'true', style: {
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #67e8f9 0%, #0e7490 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#fff'
              } }, '🖨️'),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontWeight: 800, fontSize: 14, color: '#0e7490', marginBottom: 2 } },
                  'Counselor / parent handoff packet'),
                h('div', { style: { fontSize: 12, color: '#334155', lineHeight: 1.5 } },
                  'A clean, printable summary of your pledge, your trusted-adult circle, and your witness log. You decide who sees it.')
              ),
              h('button', {
                onClick: function() {
                  var safeName = 'Upstander Workshop Packet';
                  var dateStr = new Date().toLocaleDateString();
                  var esc = function(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
                  var reflectKeys = Object.keys(roleReflect || {}).filter(function(k) { return (roleReflect[k] || '').trim().length > 0; });
                  var html =
                    '<!doctype html><html><head><meta charset="utf-8"><title>' + safeName + '</title>' +
                    '<style>' +
                      'body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; max-width: 720px; margin: 32px auto; padding: 24px; line-height: 1.55; }' +
                      'h1 { color: #1e3a8a; margin: 0 0 4px; font-size: 22px; }' +
                      'h2 { color: #0f172a; font-size: 16px; margin: 24px 0 8px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }' +
                      '.meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }' +
                      '.pledge { padding: 14px 18px; background: #fef3c7; border: 2px double #ca8a04; border-radius: 10px; font-family: Georgia, serif; font-style: italic; font-size: 15px; margin: 8px 0; }' +
                      '.adult { padding: 8px 10px; background: #f0fdf4; border-left: 3px solid #16a34a; margin: 4px 0; font-size: 13px; border-radius: 4px; }' +
                      '.entry { padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 6px 0; font-size: 13px; }' +
                      '.entry .date { font-weight: 700; color: #1e3a8a; font-size: 11px; margin-bottom: 4px; }' +
                      '.note { font-size: 11px; color: #64748b; font-style: italic; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; }' +
                      '.print-btn { padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; margin-bottom: 16px; }' +
                      '@media print { .print-btn { display: none; } body { margin: 0; padding: 16px; } }' +
                    '</style></head><body>' +
                    '<button class="print-btn" onclick="window.print()">🖨️ Print this packet</button>' +
                    '<h1>🧱 Upstander Workshop Packet</h1>' +
                    '<div class="meta">Generated ' + dateStr + ' &middot; Brought by the student. Read at the student\'s invitation.</div>' +
                    (pledgeSaved
                      ? '<h2>My pledge</h2><div class="pledge">"' + esc(pledge) + '"</div>'
                      : '') +
                    (trustedAdults.length > 0
                      ? '<h2>My trusted-adult circle</h2>' + trustedAdults.map(function(a) {
                          return '<div class="adult"><strong>' + esc(a.name) + '</strong> &middot; ' + esc(a.role || 'trusted adult') + '</div>';
                        }).join('')
                      : '') +
                    (reflectKeys.length > 0
                      ? '<h2>Role reflections</h2>' + reflectKeys.map(function(k) {
                          var roleLabels = { target: 'The target', bully: 'The one doing the hurting', bystander: 'The bystander' };
                          return '<div class="entry"><div class="date">' + esc(roleLabels[k] || k) + '</div>' + esc(roleReflect[k]).replace(/\n/g, '<br>') + '</div>';
                        }).join('')
                      : '') +
                    (witnessLog.length > 0
                      ? '<h2>Witness log (' + witnessLog.length + ' entries)</h2>' + witnessLog.map(function(e) {
                          return '<div class="entry"><div class="date">' + esc(e.date) + '</div>' +
                            (e.saw ? '<div><strong>Saw:</strong> ' + esc(e.saw).replace(/\n/g, '<br>') + '</div>' : '') +
                            (e.did ? '<div><strong>Did:</strong> ' + esc(e.did).replace(/\n/g, '<br>') + '</div>' : '') +
                            (e.next ? '<div><strong>Next time:</strong> ' + esc(e.next).replace(/\n/g, '<br>') + '</div>' : '') +
                            '</div>';
                        }).join('')
                      : '') +
                    '<h2>Crisis numbers</h2>' +
                    '<ul>' +
                      '<li>988 — Suicide &amp; Crisis Lifeline (call or text)</li>' +
                      '<li>Text HOME to 741741 — Crisis Text Line</li>' +
                      '<li>StopBullying.gov — federal resource hub</li>' +
                    '</ul>' +
                    '<div class="note">Generated by Upstander Workshop (SEL Hub). Contains only what the student entered or selected. The student brought this to you — that took courage. Treat it as the start of a conversation, not a checklist.</div>' +
                    '</body></html>';
                  try {
                    var w = window.open('', '_blank', 'width=800,height=900');
                    if (!w) { if (addToast) addToast('Pop-up was blocked. Allow pop-ups for this site and try again.', 'warning'); return; }
                    w.document.open(); w.document.write(html); w.document.close();
                    if (soundOn) sfxBrave();
                    tryAwardBadge('packet_made', 15);
                    if (announceToSR) announceToSR('Packet opened in a new window');
                  } catch (e) {
                    if (addToast) addToast('Could not open packet window: ' + (e.message || e), 'error');
                  }
                },
                style: { padding: '10px 16px', background: '#0e7490', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
              }, '🖨️ Generate packet')
            )
          ),
          // ── Badge Gallery ──
          (function() {
            var earnedIds = Object.keys(earnedBadges);
            var allBadgeIds = Object.keys(BADGE_CATALOG);
            var earnedCount = earnedIds.length;
            var totalCount = allBadgeIds.length;
            return h('div', { style: { marginTop: 24 } },
              h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: 12 } },
                h('div', { className: 'sel-hero-icon', style: { fontSize: 36, marginBottom: 4 } }, '🏅'),
                h('h3', { style: { fontSize: 16, fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'My Badges'),
                h('p', { style: { fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 } },
                  earnedCount + ' of ' + totalCount + ' earned. Each one marks a moment you showed up.')
              ),
              h('div', { style: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' } },
                allBadgeIds.map(function(bid) {
                  var b = BADGE_CATALOG[bid];
                  var earned = !!earnedBadges[bid];
                  var earnedInfo = earnedBadges[bid] || {};
                  return h('div', { key: bid, className: earned ? 'us-card us-pop' : 'us-card', style: {
                    padding: 12, borderRadius: 12,
                    border: '2px solid ' + (earned ? b.color : '#e5e7eb'),
                    background: earned ? '#fff' : '#f8fafc',
                    opacity: earned ? 1 : 0.55,
                    textAlign: 'center',
                    filter: earned ? 'none' : 'grayscale(40%)'
                  } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 44, height: 44, borderRadius: '50%',
                      background: earned ? 'linear-gradient(135deg, ' + b.color + ' 0%, ' + b.color + 'cc 100%)' : '#cbd5e1',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, margin: '0 auto 6px',
                      boxShadow: earned ? '0 3px 8px ' + b.color + '44, inset 0 1px 0 rgba(255, 255, 255, 0.3)' : 'none'
                    } }, b.icon),
                    h('div', { style: { fontWeight: 700, fontSize: 12, color: earned ? b.color : '#475569', lineHeight: 1.3, marginBottom: 2 } }, b.label),
                    h('div', { style: { fontSize: 10, color: '#64748b', lineHeight: 1.35 } }, b.desc),
                    earned && earnedInfo.date && h('div', { style: { fontSize: 9, color: b.color, fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 } }, '✓ ' + earnedInfo.date)
                  );
                })
              )
            );
          })()
        );
      }

      // ── Safe Space Coach ──
      var coachContent = null;
      if (activeTab === 'coach') {
        // ── Safety Layer: require informed consent before coach access ──
        var hasSafetyLayer = window.SelHub && window.SelHub.hasCoachConsent;
        var hasConsent = hasSafetyLayer ? window.SelHub.hasCoachConsent() : true;

        if (hasSafetyLayer && !hasConsent) {
          coachContent = window.SelHub.renderConsentScreen(h, band, function() {
            window.SelHub.giveCoachConsent();
            upd('_consentRefresh', Date.now()); // force re-render
          });
        } else {
          // ── Safe Coach send function (uses triangulated safety assessment) ──
          var sendSafeMessage = function(msg) {
            var hist = (coachHist || []).concat([{ role: 'user', text: msg }]);
            upd({ coachHist: hist, coachInput: '', coachLoad: true });

            var coachPrompt = 'You are a safe, trauma-informed support coach for a ' + band + ' school student discussing a bullying experience. They may be the target, the bystander, or even the person who bullied. The student said: "' + msg + '"\n\nRespond with:\n1. Validate without judgment (1 sentence)\n2. Normalize the complexity of feelings (1 sentence)\n3. A gentle next step or reflection question (1 sentence)\n\nNEVER minimize. NEVER blame the target. If they describe being the bully, hold compassion AND accountability. Max 3-4 sentences.';

            // Use safety-wrapped coach if available, otherwise fall back to direct
            var sendFn = (window.SelHub && window.SelHub.safeCoach)
              ? function() {
                  return window.SelHub.safeCoach({
                    studentMessage: msg,
                    coachPrompt: coachPrompt,
                    toolId: 'upstander',
                    band: band,
                    callGemini: callGemini,
                    codename: ctx.studentCodename || 'student',
                    conversationHistory: coachHist || [],
                    onSafetyFlag: onSafetyFlag
                  });
                }
              : function() {
                  return callGemini(coachPrompt, false).then(function(r) { return { response: r, tier: 0, showCrisis: false }; });
                };

            sendFn().then(function(result) {
              var newHist = hist.concat([{ role: 'coach', text: result.response }]);
              upd({ coachHist: newHist, coachLoad: false, _lastTier: result.tier });
              if (awardXP) awardXP(5, 'Used the Safe Space');
            }).catch(function() {
              upd({ coachHist: hist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting. But your courage in talking about this is real. You don\u2019t have to carry it alone.' }]), coachLoad: false });
            });
          };

          coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
            h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
              h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))' } }, '\uD83E\uDD16'),
              h('h3', { style: { fontSize: '18px', fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Safe Space'),
              h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Talk about a bullying experience \u2014 from any role. This space is monitored for your safety.'),
              h('p', { style: { fontSize: '11px', color: '#dc2626', margin: '6px 0 0', fontWeight: 600 } }, '\u26A0\uFE0F If you are in danger, please talk to a trusted adult or call 988.')
            ),
            // Show crisis resources if last message was flagged Tier 3
            (d._lastTier >= 3 && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),
            coachHist.length > 0 && h('div', { role: 'log', 'aria-label': 'Safe space conversation', 'aria-live': 'polite', 'aria-busy': coachLoad ? 'true' : 'false',
              style: {
                maxHeight: 320, overflowY: 'auto', marginBottom: 12,
                padding: 14, borderRadius: 14,
                background: '#f8fafc', boxShadow: 'inset 0 0 0 1px #e2e8f0',
                display: 'flex', flexDirection: 'column', gap: 10
              }
            },
              coachHist.map(function(m, i) {
                var u = m.role === 'user';
                if (u) {
                  return h('div', { key: i, style: { display: 'flex', justifyContent: 'flex-end' } },
                    h('div', { style: { maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 } },
                      h('div', { style: { fontSize: 10, color: '#64748b', fontWeight: 700, paddingRight: 4 } }, 'YOU'),
                      h('div', { className: 'us-pop', style: {
                        padding: '10px 14px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#fff', fontSize: 14, lineHeight: 1.45,
                        borderRadius: '18px 18px 4px 18px',
                        boxShadow: '0 1px 2px rgba(2, 132, 199, 0.18)',
                        whiteSpace: 'pre-wrap'
                      } }, m.text)
                    )
                  );
                }
                return h('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'flex-end' } },
                  h('div', { 'aria-hidden': 'true', style: {
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #60a5fa 0%, ' + BD + ' 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: '#fff',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.20)'
                  } }, '\uD83E\uDDF1'),
                  h('div', { style: { maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 3 } },
                    h('div', { style: { fontSize: 10, color: BD, fontWeight: 700, paddingLeft: 4 } }, 'SAFE SPACE'),
                    h('div', { className: 'us-pop', style: {
                      padding: '10px 14px', background: BL, color: '#0f172a',
                      fontSize: 14, lineHeight: 1.5,
                      borderRadius: '18px 18px 18px 4px',
                      border: '1px solid #bfdbfe',
                      whiteSpace: 'pre-wrap'
                    } }, m.text)
                  )
                );
              }),
              coachLoad && h('div', { 'aria-hidden': 'true', style: { display: 'flex', gap: 8, alignItems: 'flex-end' } },
                h('div', { style: {
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #60a5fa 0%, ' + BD + ' 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#fff'
                } }, '\uD83E\uDDF1'),
                h('div', { style: {
                  padding: '10px 14px', background: BL, color: '#475569',
                  fontSize: 14, fontStyle: 'italic',
                  borderRadius: '18px 18px 18px 4px', border: '1px solid #bfdbfe'
                } }, 'listening\u2026')
              )
            ),
            h('div', { style: { display: 'flex', gap: '8px' } },
              h('input', { type: 'text', value: coachInput, onChange: function(ev) { upd('coachInput', ev.target.value); },
                onKeyDown: function(ev) { if (ev.key === 'Enter' && coachInput.trim() && !coachLoad && callGemini) sendSafeMessage(coachInput.trim()); },
                disabled: coachLoad || !callGemini,
                placeholder: coachLoad ? 'Listening...' : 'Share what happened or how you feel...',
                'aria-label': 'Share your experience',
                style: { flex: 1, border: '2px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
              }),
              h('button', {
                onClick: function() { if (coachInput.trim() && !coachLoad && callGemini) sendSafeMessage(coachInput.trim()); },
                disabled: coachLoad || !coachInput.trim() || !callGemini,
                style: { padding: '10px 16px', background: coachInput.trim() && !coachLoad ? BLUE : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoad ? 'pointer' : 'not-allowed', fontSize: '13px' }
              }, coachLoad ? '\u23F3' : '\uD83E\uDDF1')
            ),
            coachHist.length === 0 && h('div', { style: { marginTop: '16px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' } }, 'You might share:'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                ['Someone is being mean to me at school', 'I watched it happen and didn\u2019t do anything', 'I think I might have been the bully', 'I don\u2019t know what role I played but it still hurts'].map(function(p) {
                  return h('button', { key: p, 'aria-label': 'Use prompt: ' + p, onClick: function() { upd('coachInput', p); },
                    style: { padding: '5px 10px', background: BL, border: '1px solid #bfdbfe', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: BD, fontWeight: 500 }
                  }, p);
                })
              )
            )
          );
        }
      }

      // ── Practice Scenarios (branching) ──
      var pracContent = null;
      if (activeTab === 'practice') {
        var scenList = SCENARIOS[band] || SCENARIOS.elementary;
        var scen = scenList[pracIdx % scenList.length];
        var totalDone = Object.keys(pracDone).length;
        var topRated = 0;
        Object.keys(pracDone).forEach(function(k) { if (pracDone[k] >= 3) topRated++; });
        pracContent = h('div', { style: { padding: '20px', maxWidth: '640px', margin: '0 auto' } },
          // Hero card
          h('div', { className: 'us-card', style: {
            padding: '16px 18px', marginBottom: 16, borderRadius: 14,
            background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 60%, #ede9fe 100%)',
            border: '1px solid #d8b4fe',
            display: 'flex', alignItems: 'center', gap: 14
          } },
            h('div', { 'aria-hidden': 'true', style: {
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #a78bfa 0%, #6b21a8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: '#fff',
              boxShadow: '0 5px 12px rgba(124, 58, 237, 0.30), inset 0 1px 0 rgba(255,255,255,0.30)'
            } }, '🎭'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { style: { margin: '0 0 2px', color: '#6b21a8', fontSize: 20, lineHeight: 1.2 } }, 'Practice — what would you actually do?'),
              h('p', { style: { margin: 0, color: '#334155', fontSize: 13, lineHeight: 1.5 } },
                'Real scenarios. Pick a response. See how it lands. There are no perfect answers, but some choices help and some make things worse.')
            )
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px', color: '#64748b' } },
            h('span', null, 'Scenario ' + (pracIdx + 1) + ' of ' + scenList.length),
            totalDone > 0 && h('span', { style: { fontWeight: 700, color: BLUE } }, totalDone + ' answered · ' + topRated + ' strong response' + (topRated === 1 ? '' : 's'))
          ),
          h('div', { className: 'us-card', style: { background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e5e7eb', marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { 'aria-hidden': 'true', style: {
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, color: '#fff',
                boxShadow: '0 4px 10px rgba(37,99,235,0.25)'
              } }, scen.icon),
              h('h4', { style: { margin: 0, fontSize: 16, fontWeight: 800, color: BD } }, scen.title)
            ),
            h('p', { 'aria-live': 'polite', style: { margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: '#1f2937' } }, scen.setup),
            h('div', { role: 'radiogroup', 'aria-label': 'What would you do?', style: { display: 'grid', gap: 8 } },
              scen.choices.map(function(c, idx) {
                var picked = pracChoice === idx;
                return h('button', {
                  key: idx, role: 'radio', 'aria-checked': picked ? 'true' : 'false',
                  onClick: function() { upd('pracChoice', idx); if (soundOn) sfxClick(); },
                  style: {
                    padding: '12px 14px', textAlign: 'left',
                    background: picked ? '#eff6ff' : '#fff',
                    border: '2px solid ' + (picked ? BLUE : '#cbd5e1'),
                    borderRadius: 10, fontSize: 14, fontWeight: picked ? 700 : 500,
                    color: '#0f172a', cursor: 'pointer',
                    display: 'flex', alignItems: 'flex-start', gap: 10
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: {
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    border: '2px solid ' + (picked ? BLUE : '#cbd5e1'),
                    background: picked ? BLUE : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1,
                    transition: 'all 0.18s ease'
                  } }, picked ? '✓' : ''),
                  h('span', { style: { flex: 1, lineHeight: 1.5 } }, c.label)
                );
              })
            ),
            pracChoice != null && h('div', { 'aria-live': 'polite', className: 'us-pop', style: {
              marginTop: 12, padding: 12, borderRadius: 10,
              background: scen.choices[pracChoice].rating >= 3 ? '#f0fdf4' : (scen.choices[pracChoice].rating === 2 ? '#fefce8' : '#fef2f2'),
              border: '1px solid ' + (scen.choices[pracChoice].rating >= 3 ? '#bbf7d0' : (scen.choices[pracChoice].rating === 2 ? '#fde68a' : '#fecaca'))
            } },
              h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
                color: scen.choices[pracChoice].rating >= 3 ? '#166534' : (scen.choices[pracChoice].rating === 2 ? '#854d0e' : '#991b1b') } },
                scen.choices[pracChoice].rating >= 3 ? 'Strong response' : (scen.choices[pracChoice].rating === 2 ? 'Partial — worth thinking about' : 'Risky — think this through')),
              h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } }, scen.choices[pracChoice].feedback)
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (pracIdx > 0) upd({ pracIdx: pracIdx - 1, pracChoice: null }); },
              disabled: pracIdx === 0,
              style: { padding: '8px 14px', background: '#fff', color: pracIdx === 0 ? '#94a3b8' : '#0f172a',
                       border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600,
                       cursor: pracIdx === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }
            }, '← Previous'),
            h('button', {
              disabled: pracChoice == null,
              onClick: function() {
                if (pracChoice == null) return;
                var np = Object.assign({}, pracDone);
                np[scen.id] = scen.choices[pracChoice].rating;
                var updates = { pracDone: np, pracChoice: null };
                if (pracIdx < scenList.length - 1) updates.pracIdx = pracIdx + 1;
                else {
                  var goodCount = 0;
                  Object.keys(np).forEach(function(k) { if (np[k] >= 3) goodCount++; });
                  if (goodCount >= 2) {
                    if (soundOn) sfxBrave();
                    tryAwardBadge('practice_courage', 25);
                  }
                }
                upd(updates);
              },
              style: {
                padding: '8px 14px',
                background: pracChoice == null ? '#94a3b8' : BLUE,
                color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                cursor: pracChoice == null ? 'not-allowed' : 'pointer', fontSize: 13
              }
            }, pracIdx < scenList.length - 1 ? 'Lock in answer →' : 'Finish practice')
          ),

          // ── Generative Scenarios — AI builds a 4-choice scenario from the
          // student's chosen setting + relationship + harm. Renders in the
          // same 4-choice rated/feedback shape as the hand-crafted ones.
          h('div', { style: { marginTop: 24 } },
            h('button', {
              onClick: function() { upd('genShown', !genShown); if (soundOn) sfxClick(); },
              'aria-expanded': genShown ? 'true' : 'false',
              style: {
                width: '100%', padding: '14px 16px', textAlign: 'left',
                border: '2px solid ' + (genShown ? '#a855f7' : '#d8b4fe'),
                background: genShown ? '#faf5ff' : '#fdf4ff',
                borderRadius: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                font: 'inherit', color: 'inherit'
              }
            },
              h('span', { 'aria-hidden': 'true', style: {
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#fff',
                boxShadow: '0 4px 10px rgba(168, 85, 247, 0.25)'
              } }, '🎲'),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontWeight: 800, fontSize: 15, color: '#6b21a8', marginBottom: 2 } },
                  'Generate a scenario for your situation'),
                h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                  'Pick a setting and what kind of harm. AI writes a fresh scenario in the same format. Useful when the 9 above do not match your real life.')
              ),
              h('span', { 'aria-hidden': 'true', style: { color: '#a855f7', fontSize: 18 } }, genShown ? '▾' : '▸')
            ),
            genShown && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #d8b4fe', borderRadius: 14 } },
              !genScenario && h('div', null,
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: '#475569' } },
                  'Fill in any 2 or 3 fields. The AI uses what you give it and improvises the rest. Output is always 4 rated choices, just like the hand-written ones above.'),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 } },
                  h('div', null,
                    h('label', { htmlFor: 'us-gen-setting', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Setting'),
                    h('select', { id: 'us-gen-setting', value: genSetting,
                      onChange: function(e) { upd('genSetting', e.target.value); },
                      style: { width: '100%', padding: 8, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', background: '#fff' }
                    },
                      h('option', { value: '' }, '— pick one —'),
                      h('option', { value: 'cafeteria or lunch table' }, 'Cafeteria / lunch'),
                      h('option', { value: 'hallway between classes' }, 'Hallway'),
                      h('option', { value: 'classroom during class' }, 'Classroom'),
                      h('option', { value: 'gym class or PE' }, 'Gym / PE'),
                      h('option', { value: 'school bus or carpool' }, 'Bus / carpool'),
                      h('option', { value: 'recess or playground' }, 'Recess / playground'),
                      h('option', { value: 'locker area' }, 'Lockers'),
                      h('option', { value: 'bathroom' }, 'Bathroom'),
                      h('option', { value: 'sports practice or team' }, 'Sports / team'),
                      h('option', { value: 'party or social event after school' }, 'Party / after school')
                    )
                  ),
                  h('div', null,
                    h('label', { htmlFor: 'us-gen-rel', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Who is involved'),
                    h('select', { id: 'us-gen-rel', value: genRelation,
                      onChange: function(e) { upd('genRelation', e.target.value); },
                      style: { width: '100%', padding: 8, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', background: '#fff' }
                    },
                      h('option', { value: '' }, '— pick one —'),
                      h('option', { value: 'a close friend of mine' }, 'A close friend'),
                      h('option', { value: 'my friend group as a whole' }, 'My friend group'),
                      h('option', { value: 'a classmate I do not know well' }, 'A classmate'),
                      h('option', { value: 'someone with more social power than me' }, 'Someone higher status'),
                      h('option', { value: 'someone with less social power than me' }, 'Someone lower status'),
                      h('option', { value: 'a sibling or family member' }, 'Sibling / family'),
                      h('option', { value: 'a teammate' }, 'Teammate'),
                      h('option', { value: 'a new student or outsider' }, 'New student / outsider')
                    )
                  ),
                  h('div', null,
                    h('label', { htmlFor: 'us-gen-harm', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Kind of harm'),
                    h('select', { id: 'us-gen-harm', value: genHarmType,
                      onChange: function(e) { upd('genHarmType', e.target.value); },
                      style: { width: '100%', padding: 8, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', background: '#fff' }
                    },
                      h('option', { value: '' }, '— pick one —'),
                      h('option', { value: 'social exclusion or freeze-out' }, 'Social exclusion / freeze-out'),
                      h('option', { value: 'public mocking or teasing' }, 'Public mocking / teasing'),
                      h('option', { value: 'rumor spreading' }, 'Rumor spreading'),
                      h('option', { value: 'physical intimidation (shoving, blocking)' }, 'Physical intimidation'),
                      h('option', { value: 'mean comments about how someone looks or dresses' }, 'Appearance-based meanness'),
                      h('option', { value: 'making fun of someone’s family or home situation' }, 'Family / home put-downs'),
                      h('option', { value: 'pressure to join in on hurting someone' }, 'Pressure to join in'),
                      h('option', { value: 'jokes punching down on someone with less power' }, 'Punching-down humor'),
                      h('option', { value: 'manipulating a friendship as a weapon' }, 'Friendship manipulation')
                    )
                  )
                ),
                h('label', { htmlFor: 'us-gen-focus', style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Optional: anything specific about your situation'),
                h('textarea', { id: 'us-gen-focus', value: genFocus,
                  onChange: function(e) { upd('genFocus', e.target.value); },
                  placeholder: 'e.g. "this is between two friends I have known since elementary school" — or leave blank',
                  rows: 2,
                  style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
                }),
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  h('button', {
                    disabled: genLoading || !callGemini || (!genSetting && !genRelation && !genHarmType && !genFocus.trim()),
                    'aria-busy': genLoading ? 'true' : 'false',
                    onClick: function() {
                      if (!callGemini) return;
                      if (!genSetting && !genRelation && !genHarmType && !genFocus.trim()) return;
                      upd({ genLoading: true, genError: '', genScenario: null, genChoice: null });
                      var bandLabel = band === 'k2' ? 'K-2 (early elementary)' : band === 'g35' ? '3-5 (upper elementary)' : band === 'g68' ? '6-8 (middle school)' : band === 'g912' ? '9-12 (high school)' : 'middle school';
                      var ctxLines = [];
                      if (genSetting) ctxLines.push('- Setting: ' + genSetting);
                      if (genRelation) ctxLines.push('- Who is involved: ' + genRelation);
                      if (genHarmType) ctxLines.push('- Kind of harm: ' + genHarmType);
                      if (genFocus.trim()) ctxLines.push('- Student notes: ' + genFocus.trim().replace(/"/g, '\\"'));
                      var prompt =
                        'You are a thoughtful SEL scenario writer for a bullying-awareness tool. ' +
                        'Build ONE practice scenario as a STRICT JSON object (no markdown, no fences, no preamble — JSON ONLY). Shape:\n' +
                        '{"icon":"single emoji","title":"under 6 words","setup":"3-5 sentence present-tense paragraph with concrete details","choices":[' +
                        '{"label":"a response a student could choose","rating":1,"feedback":"1-2 sentences explaining why this lands badly. No \\"good job\\" filler. No lecture."},' +
                        '{"label":"...","rating":3,"feedback":"..."},' +
                        '{"label":"...","rating":2,"feedback":"..."},' +
                        '{"label":"...","rating":3,"feedback":"..."}' +
                        ']}\n\n' +
                        'REQUIREMENTS:\n' +
                        '- Exactly 4 choices. Mix the order — do NOT put the strongest first.\n' +
                        '- Among the four ratings: at least one is 1 (risky/harmful or passive), at least one is 3 (strong upstander), at least one is 2 (mixed — partial intent but problems).\n' +
                        '- Setup must avoid identity-based slurs, explicit violence, and sexual content.\n' +
                        '- Tone: peer-mentor, warm, real. No emojis in feedback. No moralizing.\n' +
                        '- Target audience: ' + bandLabel + '. Match vocabulary and social dynamics to that band.\n\n' +
                        'STUDENT CONTEXT (fill in gaps with realistic peer-life details):\n' +
                        ctxLines.join('\n') + '\n\n' +
                        'Return ONLY the JSON object.';
                      callGemini(prompt, true).then(function(r) {
                        try {
                          var clean = (r || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
                          var parsed = JSON.parse(clean);
                          // Validate shape — bail to error rather than render half-broken scenario.
                          if (!parsed || !parsed.setup || !Array.isArray(parsed.choices) || parsed.choices.length !== 4) {
                            throw new Error('shape mismatch');
                          }
                          var ratings = parsed.choices.map(function(c) { return c && c.rating; });
                          var hasOne = ratings.indexOf(1) !== -1, hasThree = ratings.indexOf(3) !== -1;
                          if (!hasOne || !hasThree) throw new Error('missing rating distribution');
                          // Stamp an id so progress tracking works against pracDone.
                          parsed.id = 'gen-' + Date.now();
                          if (!parsed.icon) parsed.icon = '🎭';
                          if (!parsed.title) parsed.title = 'Your scenario';
                          upd({ genLoading: false, genScenario: parsed, genChoice: null, genError: '' });
                          if (soundOn) sfxBrave();
                          tryAwardBadge('generated', 10);
                          if (announceToSR) announceToSR('Scenario ready');
                        } catch (e) {
                          upd({ genLoading: false, genError: 'The AI returned something I could not read. Try again or change one of the fields.' });
                        }
                      }).catch(function() {
                        upd({ genLoading: false, genError: 'The AI is not reachable right now. Try again in a moment.' });
                      });
                    },
                    style: {
                      padding: '10px 16px',
                      background: (genLoading || !callGemini || (!genSetting && !genRelation && !genHarmType && !genFocus.trim())) ? '#cbd5e1' : '#7c3aed',
                      color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                      cursor: (genLoading || !callGemini || (!genSetting && !genRelation && !genHarmType && !genFocus.trim())) ? 'not-allowed' : 'pointer',
                      fontSize: 13
                    }
                  }, genLoading ? 'Writing scenario…' : (callGemini ? 'Generate scenario' : 'AI not available'))
                ),
                !callGemini && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: '#6b21a8' } },
                  'AI features need a connection. Try the 9 hand-written scenarios above while offline.'),
                genError && h('div', { 'aria-live': 'polite', style: {
                  marginTop: 10, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#991b1b'
                } }, genError)
              ),
              // ── Render the generated scenario in the same 4-choice UI shape ──
              genScenario && h('div', null,
                h('div', { className: 'us-card', style: { background: '#fff', borderRadius: 14, padding: 18, border: '1px dashed #c084fc', marginBottom: 14, background: '#faf5ff' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                    h('span', { 'aria-hidden': 'true', style: {
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, #a78bfa 0%, #6b21a8 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, color: '#fff'
                    } }, genScenario.icon || '🎭'),
                    h('div', { style: { flex: 1 } },
                      h('h4', { style: { margin: 0, fontSize: 16, fontWeight: 800, color: '#6b21a8' } }, genScenario.title || 'Your scenario'),
                      h('div', { style: { fontSize: 11, color: '#6b21a8', fontStyle: 'italic', marginTop: 2 } }, 'AI-generated practice')
                    )
                  ),
                  h('p', { 'aria-live': 'polite', style: { margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: '#1f2937' } }, genScenario.setup),
                  h('div', { role: 'radiogroup', 'aria-label': 'What would you do?', style: { display: 'grid', gap: 8 } },
                    (genScenario.choices || []).map(function(c, idx) {
                      var picked = genChoice === idx;
                      return h('button', {
                        key: 'gen-c-' + idx, role: 'radio', 'aria-checked': picked ? 'true' : 'false',
                        onClick: function() { upd('genChoice', idx); if (soundOn) sfxClick(); },
                        style: {
                          padding: '12px 14px', textAlign: 'left',
                          background: picked ? '#eff6ff' : '#fff',
                          border: '2px solid ' + (picked ? BLUE : '#cbd5e1'),
                          borderRadius: 10, fontSize: 14, fontWeight: picked ? 700 : 500,
                          color: '#0f172a', cursor: 'pointer',
                          display: 'flex', alignItems: 'flex-start', gap: 10
                        }
                      },
                        h('span', { 'aria-hidden': 'true', style: {
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                          border: '2px solid ' + (picked ? BLUE : '#cbd5e1'),
                          background: picked ? BLUE : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1
                        } }, picked ? '✓' : ''),
                        h('span', { style: { flex: 1, lineHeight: 1.5 } }, c.label)
                      );
                    })
                  ),
                  genChoice != null && genScenario.choices && genScenario.choices[genChoice] && h('div', { 'aria-live': 'polite', className: 'us-pop', style: {
                    marginTop: 12, padding: 12, borderRadius: 10,
                    background: genScenario.choices[genChoice].rating >= 3 ? '#f0fdf4' : (genScenario.choices[genChoice].rating === 2 ? '#fefce8' : '#fef2f2'),
                    border: '1px solid ' + (genScenario.choices[genChoice].rating >= 3 ? '#bbf7d0' : (genScenario.choices[genChoice].rating === 2 ? '#fde68a' : '#fecaca'))
                  } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
                      color: genScenario.choices[genChoice].rating >= 3 ? '#166534' : (genScenario.choices[genChoice].rating === 2 ? '#854d0e' : '#991b1b') } },
                      genScenario.choices[genChoice].rating >= 3 ? 'Strong response' : (genScenario.choices[genChoice].rating === 2 ? 'Partial — worth thinking about' : 'Risky — think this through')),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } }, genScenario.choices[genChoice].feedback)
                  )
                ),
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  h('button', {
                    onClick: function() { upd({ genScenario: null, genChoice: null, genError: '' }); },
                    style: { padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                  }, 'Generate another'),
                  h('button', {
                    onClick: function() { upd({ genShown: false, genScenario: null, genChoice: null, genError: '' }); },
                    style: { padding: '8px 14px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                  }, 'Done')
                ),
                h('p', { style: { margin: '8px 0 0', fontSize: 11, color: '#6b21a8', fontStyle: 'italic' } },
                  'AI-generated. Treat the feedback as one perspective, not the final word.')
              )
            )
          ),

          // ── Generative Role Play — AI plays a peer character in a short
          // multi-turn exchange. Student practices what they would actually say.
          // Strict character guardrails: no slurs, no explicit violence, max ~5 turns.
          (function renderRolePlay() {
            var rpRoles = {
              bully: {
                label: 'AI plays someone being cruel (you intervene)',
                icon: '🛡️',
                desc: 'A peer is putting someone else down in front of you. Practice what you would actually say to interrupt without making it worse.',
                charDesc: 'a middle/high school student who is being verbally mean to a classmate in a casual social setting. You are NOT physically threatening. Your meanness shows up as mocking remarks, exclusion language, and dismissive jokes — the kind of social cruelty that happens in real schools every day. You believe you are joking, not bullying.',
                fallbackOpener: 'Oh come on, look at them — they’re sitting alone again. Probably their choice though, right? Like, who would even want to sit with them?',
                fallbackScene: 'In the cafeteria. A quieter classmate is sitting alone two tables away. Your peer just leaned in to point at them.'
              },
              target: {
                label: 'AI plays someone who just got bullied (you support them)',
                icon: '🤝',
                desc: 'A peer was just targeted and is sitting near you. Practice offering support without saying the wrong thing.',
                charDesc: 'a middle/high school student who was just publicly humiliated by a group and is sitting near the student. You are NOT in crisis. You are quiet, withdrawn, slightly tearful, embarrassed. You may deflect support at first ("I’m fine," "it’s whatever") because that is what a real teenager does. Open up only if the student’s words feel safe and non-pitying.',
                fallbackOpener: 'I’m fine. It’s whatever. I don’t even care.',
                fallbackScene: 'Just after lunch. A classmate was publicly mocked a minute ago and is now sitting near you, eyes down.'
              },
              bystander: {
                label: 'AI plays a friend going along with it (you push back)',
                icon: '🪞',
                desc: 'A friend of yours is laughing along while someone gets mocked. Practice naming what you see without losing the friendship.',
                charDesc: 'a peer who is friends with the student. You were just laughing along at a joke that was clearly at someone’s expense. You are NOT the leader of the bullying — you went along to fit in. You are defensive when called on it: you minimize ("it was just a joke"), deflect ("everyone laughed"), and may briefly get annoyed at the student for "making it a thing." Soften only if the student stays calm and specific.',
                fallbackOpener: 'Oh my god, did you SEE that? That was so funny. Why aren’t you laughing?',
                fallbackScene: 'In the hallway between classes. A group just walked off after teasing someone. Your friend turns to you, still laughing.'
              }
            };
            // Generate a fresh scene + opener line for replayability. Different setting,
            // target, and details each time. Falls back to the hand-written defaults if
            // the AI is unreachable or returns malformed JSON.
            function startRolePlay(roleKey) {
              var cfg = rpRoles[roleKey];
              if (!cfg) return;
              if (!callGemini) {
                upd({ rpRole: roleKey, rpScene: cfg.fallbackScene, rpHistory: [{ speaker: 'ai', text: cfg.fallbackOpener }], rpInput: '', rpEnded: false, rpReflection: '', rpStarting: false });
                return;
              }
              upd({ rpRole: roleKey, rpScene: '', rpHistory: [], rpInput: '', rpEnded: false, rpReflection: '', rpStarting: true });
              if (announceToSR) announceToSR('Generating fresh role-play scene');
              var bandLabel = band === 'k2' ? 'K-2' : band === 'g35' ? '3-5' : band === 'g68' ? '6-8' : band === 'g912' ? '9-12' : 'middle school';
              var prompt =
                'You are setting up a brief role-play for an SEL bullying-rehearsal tool. Build a fresh, realistic mini-scene for the student. ' +
                'Return STRICT JSON only (no markdown, no fences, no preamble):\n' +
                '{"scene":"1-2 sentence scene-setter naming WHO the third party is (use a first name and one detail), WHERE this is happening, and WHAT just happened — present tense, neutral observer voice","opener":"the FIRST in-character line the peer says, 1-2 sentences, in their voice, no narration, no quotation marks"}\n\n' +
                'YOUR PEER CHARACTER: ' + cfg.charDesc + '\n' +
                'AUDIENCE: ' + bandLabel + ' grade band. Use age-appropriate vocabulary and social dynamics.\n\n' +
                'RULES:\n' +
                '- Vary the setting, target name, and details each time — do NOT default to the cafeteria.\n' +
                '- The "scene" field is neutral narration (third person), not in character.\n' +
                '- The "opener" field is the peer SPEAKING in 1st person, 1-2 sentences, sounds like a real student.\n' +
                '- NO slurs, NO explicit threats, NO physical violence in the scene. Social meanness only.\n' +
                '- Avoid identity-based harm (race/gender/disability) — keep the harm relational and general.\n\n' +
                'Return ONLY the JSON object.';
              callGemini(prompt, true).then(function(r) {
                try {
                  var clean = (r || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
                  var parsed = JSON.parse(clean);
                  if (!parsed || !parsed.scene || !parsed.opener) throw new Error('shape');
                  upd({
                    rpScene: String(parsed.scene).trim(),
                    rpHistory: [{ speaker: 'ai', text: String(parsed.opener).trim().replace(/^"|"$/g, '') }],
                    rpStarting: false
                  });
                  if (announceToSR) announceToSR('Scene ready. ' + cfg.label);
                } catch (e) {
                  // JSON parse failed — fall back to the hand-written opener so the
                  // user still gets a working role-play, just with a fixed scene.
                  upd({ rpScene: cfg.fallbackScene, rpHistory: [{ speaker: 'ai', text: cfg.fallbackOpener }], rpStarting: false });
                }
              }).catch(function() {
                upd({ rpScene: cfg.fallbackScene, rpHistory: [{ speaker: 'ai', text: cfg.fallbackOpener }], rpStarting: false });
              });
            }
            var charCfg = rpRole && rpRoles[rpRole];
            return h('div', { style: { marginTop: 16 } },
              h('button', {
                onClick: function() { upd('rpShown', !rpShown); if (soundOn) sfxClick(); },
                'aria-expanded': rpShown ? 'true' : 'false',
                style: {
                  width: '100%', padding: '14px 16px', textAlign: 'left',
                  border: '2px solid ' + (rpShown ? '#a855f7' : '#d8b4fe'),
                  background: rpShown ? '#faf5ff' : '#fdf4ff',
                  borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  font: 'inherit', color: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff',
                  boxShadow: '0 4px 10px rgba(168, 85, 247, 0.25)'
                } }, '🎭'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: '#6b21a8', marginBottom: 2 } },
                    'Practice the conversation (role-play)'),
                  h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.4 } },
                    'AI plays a peer. You practice what you would actually say. Up to ~5 turns. You can break character anytime for coaching.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#a855f7', fontSize: 18 } }, rpShown ? '▾' : '▸')
              ),
              rpShown && h('div', { style: { marginTop: 12, padding: 18, background: '#fff', border: '1px solid #d8b4fe', borderRadius: 14 } },
                // STEP 1: pick a role to practice
                !rpRole && h('div', null,
                  h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: '#475569' } },
                    h('strong', { style: { color: '#6b21a8' } }, 'Pick what you want to practice. '),
                    'The AI will play the OTHER person. You play yourself. Keep responses short and real — the way you would actually talk.'),
                  h('div', { style: { display: 'grid', gap: 8 } },
                    ['bully', 'target', 'bystander'].map(function(roleKey) {
                      var cfg = rpRoles[roleKey];
                      return h('button', {
                        key: roleKey,
                        onClick: function() { if (soundOn) sfxClick(); startRolePlay(roleKey); },
                        disabled: !callGemini || rpStarting,
                        style: {
                          padding: '12px 14px', textAlign: 'left',
                          background: '#fff', border: '2px solid #cbd5e1', borderRadius: 10,
                          fontSize: 14, color: '#0f172a', cursor: (callGemini && !rpStarting) ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          opacity: rpStarting ? 0.6 : 1
                        }
                      },
                        h('span', { 'aria-hidden': 'true', style: { fontSize: 22, marginTop: 2 } }, cfg.icon),
                        h('div', { style: { flex: 1 } },
                          h('div', { style: { fontWeight: 700, marginBottom: 4 } }, cfg.label),
                          h('div', { style: { fontSize: 12, color: '#64748b', lineHeight: 1.45 } }, cfg.desc)
                        )
                      );
                    })
                  ),
                  rpStarting && h('p', { 'aria-live': 'polite', style: { margin: '10px 0 0', fontSize: 12, color: '#6b21a8', fontStyle: 'italic' } },
                    'Generating a fresh scene…'),
                  !callGemini && h('p', { style: { margin: '12px 0 0', fontSize: 11, color: '#6b21a8' } },
                    'AI features need a connection. Try the hand-written scenarios above while offline.')
                ),
                // STEP 2: conversation in progress
                rpRole && charCfg && h('div', null,
                  h('div', { style: {
                    padding: '8px 12px', marginBottom: 12, background: '#f3e8ff', borderRadius: 8,
                    fontSize: 12, color: '#6b21a8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap'
                  } },
                    h('span', { style: { fontWeight: 700 } }, charCfg.icon + ' ' + charCfg.label),
                    h('button', {
                      onClick: function() { upd({ rpRole: '', rpScene: '', rpHistory: [], rpInput: '', rpEnded: false, rpReflection: '', rpStarting: false }); if (soundOn) sfxClick(); },
                      style: { padding: '4px 10px', background: '#fff', color: '#6b21a8', border: '1px solid #d8b4fe', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }
                    }, '← Different role')
                  ),
                  // Scene-setter (italic, neutral observer voice) above the conversation
                  rpScene && h('div', { style: {
                    padding: '10px 12px', marginBottom: 10, background: '#fafafa', border: '1px solid #e5e7eb',
                    borderLeft: '3px solid #a855f7', borderRadius: 8,
                    fontSize: 13, lineHeight: 1.5, color: '#475569', fontStyle: 'italic'
                  } },
                    h('span', { style: { fontStyle: 'normal', fontWeight: 700, color: '#6b21a8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 6 } }, 'Scene:'),
                    rpScene
                  ),
                  // Conversation log
                  h('div', { 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: '40vh', overflowY: 'auto', padding: 4 } },
                    rpHistory.map(function(turn, ti) {
                      var isStudent = turn.speaker === 'student';
                      var isCoach = turn.speaker === 'coach';
                      return h('div', {
                        key: 'rp-t-' + ti,
                        style: {
                          alignSelf: isStudent ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          padding: '10px 13px',
                          borderRadius: 12,
                          fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                          background: isStudent ? '#dbeafe' : (isCoach ? '#fef3c7' : '#f1f5f9'),
                          border: '1px solid ' + (isStudent ? '#93c5fd' : (isCoach ? '#fcd34d' : '#cbd5e1')),
                          color: '#0f172a'
                        }
                      },
                        h('div', { style: { fontSize: 10, fontWeight: 700, color: isStudent ? '#1d4ed8' : (isCoach ? '#92400e' : '#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                          isStudent ? 'You' : (isCoach ? '🪶 Coach (out of character)' : '🎭 ' + (rpRole === 'bully' ? 'Mean peer' : rpRole === 'target' ? 'Peer who was hurt' : 'Friend going along'))),
                        h('div', null, turn.text)
                      );
                    })
                  ),
                  // Input area + send + coach + end
                  !rpEnded && h('div', null,
                    h('textarea', { id: 'us-rp-input', value: rpInput,
                      onChange: function(e) { upd('rpInput', e.target.value); },
                      placeholder: 'What would you actually say next? Keep it short — the way you would really talk.',
                      rows: 2,
                      disabled: rpLoading,
                      style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }
                    }),
                    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                      // Send turn → AI responds in character
                      h('button', {
                        disabled: rpLoading || !rpInput.trim() || !callGemini,
                        'aria-busy': rpLoading ? 'true' : 'false',
                        onClick: function() {
                          if (!callGemini || !rpInput.trim()) return;
                          var studentTurn = rpInput.trim();
                          var newHist = rpHistory.concat([{ speaker: 'student', text: studentTurn }]);
                          upd({ rpHistory: newHist, rpInput: '', rpLoading: true });
                          var historyText = newHist.map(function(t) {
                            if (t.speaker === 'student') return 'STUDENT: "' + t.text.replace(/"/g, '\\"') + '"';
                            if (t.speaker === 'coach') return 'COACH (out of character): ' + t.text;
                            return 'PEER (' + rpRole + '): "' + t.text.replace(/"/g, '\\"') + '"';
                          }).join('\n');
                          var turnN = newHist.filter(function(t) { return t.speaker === 'student'; }).length;
                          var bandLabel = band === 'k2' ? 'K-2' : band === 'g35' ? '3-5' : band === 'g68' ? '6-8' : band === 'g912' ? '9-12' : 'middle school';
                          var prompt =
                            'You are role-playing for an SEL bullying-rehearsal tool. The student practices what to say in real life.\n\n' +
                            'YOUR CHARACTER: ' + charCfg.charDesc + '\n' +
                            'AUDIENCE: ' + bandLabel + ' grade band. Use age-appropriate vocabulary.\n\n' +
                            (rpScene ? 'SCENE (stay consistent with this throughout): ' + rpScene + '\n\n' : '') +
                            'STRICT RULES:\n' +
                            '- Stay in character. Reply with 1-3 sentences max, like a real student would talk.\n' +
                            '- NO slurs of any kind. NO explicit threats or violence. Stay at the "social meanness" level.\n' +
                            '- Do NOT narrate, moralize, or break character. Just speak as the character.\n' +
                            '- Do not include quotation marks around your reply — just the words.\n' +
                            '- This is turn ' + turnN + ' of the conversation. By turn 4-5, if the student is responding well, you can soften, withdraw, or acknowledge. If they are struggling, stay consistent.\n\n' +
                            'CONVERSATION SO FAR:\n' + historyText + '\n\n' +
                            'Respond as the character in 1-3 sentences. Just the line.';
                          callGemini(prompt, false).then(function(r) {
                            var reply = (r || '').trim().replace(/^"|"$/g, '');
                            upd({ rpHistory: newHist.concat([{ speaker: 'ai', text: reply || '...' }]), rpLoading: false });
                            if (announceToSR) announceToSR('Peer responded');
                          }).catch(function() {
                            upd({ rpHistory: newHist.concat([{ speaker: 'ai', text: '(AI not reachable — try again in a moment)' }]), rpLoading: false });
                          });
                        },
                        style: {
                          padding: '10px 16px',
                          background: (rpLoading || !rpInput.trim() || !callGemini) ? '#cbd5e1' : '#7c3aed',
                          color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                          cursor: (rpLoading || !rpInput.trim() || !callGemini) ? 'not-allowed' : 'pointer',
                          fontSize: 13
                        }
                      }, rpLoading ? 'Thinking…' : 'Send →'),
                      // Break character → coach
                      h('button', {
                        disabled: rpLoading || !callGemini || rpHistory.length === 0,
                        onClick: function() {
                          if (!callGemini) return;
                          upd({ rpLoading: true });
                          var historyText = rpHistory.map(function(t) {
                            if (t.speaker === 'student') return 'STUDENT: "' + t.text.replace(/"/g, '\\"') + '"';
                            if (t.speaker === 'coach') return 'COACH: ' + t.text;
                            return 'PEER: "' + t.text.replace(/"/g, '\\"') + '"';
                          }).join('\n');
                          var prompt =
                            'You are a kind, grounded peer-mentor coach watching a role-play between a student and an AI peer. ' +
                            'OUT OF CHARACTER NOW. Briefly tell the student two things, under 80 words total:\n' +
                            '1) What is going on socially in this moment — what the peer is doing and what they probably need.\n' +
                            '2) One concrete thing the student could try saying next. Give an example phrasing.\n\n' +
                            'No moralizing. No "good job" filler. Warm, peer-mentor tone. Plain English.\n\n' +
                            'CHARACTER: ' + charCfg.charDesc + '\n' +
                            (rpScene ? 'SCENE: ' + rpScene + '\n' : '') +
                            'CONVERSATION:\n' + historyText;
                          callGemini(prompt, false).then(function(r) {
                            var coachText = (r || 'Take a breath and notice what just happened. What would you say if it were lower-stakes?').trim();
                            upd({ rpHistory: rpHistory.concat([{ speaker: 'coach', text: coachText }]), rpLoading: false });
                            if (announceToSR) announceToSR('Coach feedback ready');
                          }).catch(function() {
                            upd({ rpLoading: false });
                          });
                        },
                        style: {
                          padding: '10px 14px',
                          background: '#fff', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 8, fontWeight: 600,
                          cursor: (rpLoading || !callGemini || rpHistory.length === 0) ? 'not-allowed' : 'pointer',
                          fontSize: 13
                        }
                      }, '🪶 Break character — coach me'),
                      // End and reflect
                      rpHistory.filter(function(t) { return t.speaker === 'student'; }).length >= 2 && h('button', {
                        disabled: rpLoading || !callGemini,
                        onClick: function() {
                          if (!callGemini) return;
                          upd({ rpLoading: true });
                          var historyText = rpHistory.map(function(t) {
                            if (t.speaker === 'student') return 'STUDENT: "' + t.text.replace(/"/g, '\\"') + '"';
                            if (t.speaker === 'coach') return 'COACH: ' + t.text;
                            return 'PEER: "' + t.text.replace(/"/g, '\\"') + '"';
                          }).join('\n');
                          var prompt =
                            'You are a kind peer-mentor coach reflecting back on a brief role-play. ' +
                            'In 2-3 sentences (under 70 words), name:\n' +
                            '1) One specific thing the student did well in their responses.\n' +
                            '2) One thing they could try differently next time.\n\n' +
                            'Be real and specific. No empty praise. No "great job!" filler. Refer to actual words they used when you can.\n\n' +
                            'CHARACTER played by AI: ' + charCfg.charDesc + '\n' +
                            (rpScene ? 'SCENE: ' + rpScene + '\n' : '') +
                            'CONVERSATION:\n' + historyText;
                          callGemini(prompt, false).then(function(r) {
                            var reflectText = (r || 'You showed up to the practice. That matters. Next time, try one sentence shorter — short and direct usually lands better than long.').trim();
                            upd({ rpEnded: true, rpReflection: reflectText, rpLoading: false });
                            if (soundOn) sfxBrave();
                            tryAwardBadge('roleplayed', 20);
                            if (announceToSR) announceToSR('Reflection ready');
                          }).catch(function() {
                            upd({ rpEnded: true, rpReflection: 'Practice complete. Next time, try one short, direct sentence — usually lands better than a long one.', rpLoading: false });
                          });
                        },
                        style: {
                          padding: '10px 14px',
                          background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600,
                          cursor: (rpLoading || !callGemini) ? 'not-allowed' : 'pointer',
                          fontSize: 13
                        }
                      }, 'End & reflect')
                    )
                  ),
                  // STEP 3: end-of-practice reflection
                  rpEnded && rpReflection && h('div', { className: 'us-pop', style: {
                    marginTop: 8, padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10
                  } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } },
                      'How that went'),
                    h('p', { style: { margin: '0 0 12px', fontSize: 14, lineHeight: 1.55, color: '#0f172a', whiteSpace: 'pre-wrap' } }, rpReflection),
                    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                      h('button', {
                        onClick: function() { upd({ rpRole: '', rpScene: '', rpHistory: [], rpInput: '', rpEnded: false, rpReflection: '', rpStarting: false }); if (soundOn) sfxClick(); },
                        style: { padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                      }, 'Practice again'),
                      h('button', {
                        onClick: function() { upd({ rpShown: false, rpRole: '', rpScene: '', rpHistory: [], rpInput: '', rpEnded: false, rpReflection: '', rpStarting: false }); },
                        style: { padding: '8px 14px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                      }, 'Done')
                    )
                  ),
                  rpRole && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: '#6b21a8', fontStyle: 'italic' } },
                    'AI-generated peer responses. No real student is being depicted. Treat coach feedback as one perspective.')
                )
              )
            );
          })()
        );
      }

      var content = rolesContent || movesContent || pracContent || cycleContent || pledgeContent || coachContent || refContent;
      return h('div', { className: 'us-root', style: { display: 'flex', flexDirection: 'column', height: '100%' } }, tabBar, h('div', { style: { flex: 1, overflow: 'auto' } }, content));
    }
  });
})();
