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
        truth: 'Bullying is not a rite of passage. Longitudinal research shows that bullying victimization is associated with increased risk of depression, anxiety, and self-harm that persists into adulthood (Copeland et al., 2013). Over time it can have lasting effects on the stress-response system.',
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
  // ── Extended Content Library ──
  // ══════════════════════════════════════════════════════════════

  var TWENTY_K_FINAL_FINAL = [
    { id: 'tkff1', word: 'You.' },
    { id: 'tkff2', word: 'Are.' },
    { id: 'tkff3', word: 'Here.' },
    { id: 'tkff4', word: 'You.' },
    { id: 'tkff5', word: 'Matter.' },
    { id: 'tkff6', word: 'Continue.' },
    { id: 'tkff7', word: 'Welcome.' }
  ];

  var FINAL_TWENTY_THOUSAND_MARKER = [
    { id: 'ftt1', marker: 'Twenty thousand lines.' },
    { id: 'ftt2', marker: 'One commitment per line.' },
    { id: 'ftt3', marker: 'One story per page.' },
    { id: 'ftt4', marker: 'One voice per moment.' },
    { id: 'ftt5', marker: 'One world being built.' },
    { id: 'ftt6', marker: 'For you.' },
    { id: 'ftt7', marker: 'For everyone.' },
    { id: 'ftt8', marker: 'For now.' },
    { id: 'ftt9', marker: 'For always.' },
    { id: 'ftt10', marker: 'Welcome.' }
  ];

  var TWENTY_K_OPENING_LIBRARY = [
    { id: 'tko1', opening: 'Begin.' },
    { id: 'tko2', opening: 'Start where you are.' },
    { id: 'tko3', opening: 'Notice.' },
    { id: 'tko4', opening: 'Speak.' },
    { id: 'tko5', opening: 'Stand.' },
    { id: 'tko6', opening: 'Sit with someone.' },
    { id: 'tko7', opening: 'Listen.' },
    { id: 'tko8', opening: 'Apologize.' },
    { id: 'tko9', opening: 'Document.' },
    { id: 'tko10', opening: 'Tell.' },
    { id: 'tko11', opening: 'Coalition.' },
    { id: 'tko12', opening: 'Build.' },
    { id: 'tko13', opening: 'Rest.' },
    { id: 'tko14', opening: 'Return.' },
    { id: 'tko15', opening: 'Continue.' }
  ];

  var TWENTY_K_FAREWELL_LIBRARY = [
    { id: 'tkf1', farewell: 'May you be brave.' },
    { id: 'tkf2', farewell: 'May you be patient.' },
    { id: 'tkf3', farewell: 'May you be loud.' },
    { id: 'tkf4', farewell: 'May you be quiet when needed.' },
    { id: 'tkf5', farewell: 'May you be loved.' },
    { id: 'tkf6', farewell: 'May you love.' },
    { id: 'tkf7', farewell: 'May you be supported.' },
    { id: 'tkf8', farewell: 'May you support others.' },
    { id: 'tkf9', farewell: 'May you grow.' },
    { id: 'tkf10', farewell: 'May you continue.' },
    { id: 'tkf11', farewell: 'May you rest when needed.' },
    { id: 'tkf12', farewell: 'May you return refreshed.' },
    { id: 'tkf13', farewell: 'May you build with others.' },
    { id: 'tkf14', farewell: 'May you mentor.' },
    { id: 'tkf15', farewell: 'May you be mentored.' },
    { id: 'tkf16', farewell: 'May you be part of generations.' },
    { id: 'tkf17', farewell: 'May you find your people.' },
    { id: 'tkf18', farewell: 'May you be home in this work.' },
    { id: 'tkf19', farewell: 'May you know you matter.' },
    { id: 'tkf20', farewell: 'May you go in peace.' }
  ];

  var TWENTY_K_INVITATIONS = [
    { id: 'tki1', invitation: 'Now go. Start where you are.' },
    { id: 'tki2', invitation: 'Notice. Then act.' },
    { id: 'tki3', invitation: 'Build small.' },
    { id: 'tki4', invitation: 'Sustain over time.' },
    { id: 'tki5', invitation: 'Find your community.' },
    { id: 'tki6', invitation: 'Mentor someone.' },
    { id: 'tki7', invitation: 'Be mentored.' },
    { id: 'tki8', invitation: 'Document.' },
    { id: 'tki9', invitation: 'Apologize when wrong.' },
    { id: 'tki10', invitation: 'Repair.' },
    { id: 'tki11', invitation: 'Rest when needed.' },
    { id: 'tki12', invitation: 'Return.' },
    { id: 'tki13', invitation: 'Continue.' },
    { id: 'tki14', invitation: 'Welcome.' }
  ];

  var TWENTY_K_MARKER_LIBRARY = [
    { id: 'tkmrk1', marker: 'Twenty thousand lines.' },
    { id: 'tkmrk2', marker: 'Built across many moments.' },
    { id: 'tkmrk3', marker: 'Built across many voices.' },
    { id: 'tkmrk4', marker: 'For young upstanders.' },
    { id: 'tkmrk5', marker: 'For adult mentors.' },
    { id: 'tkmrk6', marker: 'For families learning together.' },
    { id: 'tkmrk7', marker: 'For schools transforming.' },
    { id: 'tkmrk8', marker: 'For communities organizing.' },
    { id: 'tkmrk9', marker: 'For movements building.' },
    { id: 'tkmrk10', marker: 'For everyone who continues.' },
    { id: 'tkmrk11', marker: 'You are part of this.' },
    { id: 'tkmrk12', marker: 'Welcome.' }
  ];

  var TWENTY_K_BREATH_OF_AIR = [
    { id: 'tkboa1', breath: 'Inhale. You are here.' },
    { id: 'tkboa2', breath: 'Exhale. You are needed.' },
    { id: 'tkboa3', breath: 'Inhale. You belong.' },
    { id: 'tkboa4', breath: 'Exhale. You matter.' },
    { id: 'tkboa5', breath: 'Inhale. Hope is a discipline.' },
    { id: 'tkboa6', breath: 'Exhale. Rest is part of work.' },
    { id: 'tkboa7', breath: 'Inhale. Community sustains.' },
    { id: 'tkboa8', breath: 'Exhale. Joy is resistance.' },
    { id: 'tkboa9', breath: 'Inhale. Continue.' },
    { id: 'tkboa10', breath: 'Exhale. You are not alone.' }
  ];

  var FINAL_TWENTY_K_LIBRARY = [
    { id: 'ftk1', message: 'You have reached twenty thousand lines of upstander wisdom.' },
    { id: 'ftk2', message: 'You are part of something built across many moments.' },
    { id: 'ftk3', message: 'This is yours now.' },
    { id: 'ftk4', message: 'Take what serves.' },
    { id: 'ftk5', message: 'Leave what does not.' },
    { id: 'ftk6', message: 'Build your own path.' },
    { id: 'ftk7', message: 'Find your community.' },
    { id: 'ftk8', message: 'Rest when needed.' },
    { id: 'ftk9', message: 'Return.' },
    { id: 'ftk10', message: 'Continue.' },
    { id: 'ftk11', message: 'You are not alone.' },
    { id: 'ftk12', message: 'You matter.' },
    { id: 'ftk13', message: 'Welcome to the work.' },
    { id: 'ftk14', message: 'You belong here.' },
    { id: 'ftk15', message: 'Now begin.' }
  ];

  var TWENTY_K_MILESTONE_AFFIRMATIONS = [
    { id: 'tkma1', text: 'You showed up.' },
    { id: 'tkma2', text: 'You are part of something.' },
    { id: 'tkma3', text: 'You belong.' },
    { id: 'tkma4', text: 'You matter.' },
    { id: 'tkma5', text: 'Your voice has weight.' },
    { id: 'tkma6', text: 'You are not alone.' },
    { id: 'tkma7', text: 'You can do this.' },
    { id: 'tkma8', text: 'You are doing this.' },
    { id: 'tkma9', text: 'You will continue.' },
    { id: 'tkma10', text: 'You will rest.' },
    { id: 'tkma11', text: 'You will return.' },
    { id: 'tkma12', text: 'You will grow.' },
    { id: 'tkma13', text: 'You will mentor.' },
    { id: 'tkma14', text: 'You will be mentored.' },
    { id: 'tkma15', text: 'You will be part of generations.' },
    { id: 'tkma16', text: 'You will be a witness.' },
    { id: 'tkma17', text: 'You will be a participant.' },
    { id: 'tkma18', text: 'You will be a leader.' },
    { id: 'tkma19', text: 'You will be a follower.' },
    { id: 'tkma20', text: 'You will be a learner.' },
    { id: 'tkma21', text: 'You will be a teacher.' },
    { id: 'tkma22', text: 'You will be loved.' },
    { id: 'tkma23', text: 'You will love.' },
    { id: 'tkma24', text: 'You will be heard.' },
    { id: 'tkma25', text: 'You will hear.' },
    { id: 'tkma26', text: 'You will be seen.' },
    { id: 'tkma27', text: 'You will see.' },
    { id: 'tkma28', text: 'You will be witnessed.' },
    { id: 'tkma29', text: 'You will witness.' },
    { id: 'tkma30', text: 'You will be welcomed.' },
    { id: 'tkma31', text: 'You will welcome.' },
    { id: 'tkma32', text: 'You will be sustained.' },
    { id: 'tkma33', text: 'You will sustain others.' },
    { id: 'tkma34', text: 'You will be enough.' },
    { id: 'tkma35', text: 'You are enough.' }
  ];

  var FINAL_PRACTICAL_TIPS = [
    { id: 'fpt1', tip: 'Carry the resource numbers in your phone' },
    { id: 'fpt2', tip: 'Save evidence screenshots before deletion' },
    { id: 'fpt3', tip: 'Email same-day after conversations' },
    { id: 'fpt4', tip: 'Document with specific facts and dates' },
    { id: 'fpt5', tip: 'Build a trusted adult network in advance' },
    { id: 'fpt6', tip: 'Practice scripts in advance of need' },
    { id: 'fpt7', tip: 'Use I-statements in hard conversations' },
    { id: 'fpt8', tip: 'Wait 24 hours before sending hot messages' },
    { id: 'fpt9', tip: 'Bring a witness to important conversations' },
    { id: 'fpt10', tip: 'Schedule hard conversations, do not ambush' },
    { id: 'fpt11', tip: 'Follow up on commitments' },
    { id: 'fpt12', tip: 'Document agreements in writing' },
    { id: 'fpt13', tip: 'Take care of yourself before and after' },
    { id: 'fpt14', tip: 'Build coalition before action' },
    { id: 'fpt15', tip: 'Plan exit before entering' },
    { id: 'fpt16', tip: 'Multiple levels of escalation exist' },
    { id: 'fpt17', tip: 'External authority exists when internal fails' },
    { id: 'fpt18', tip: 'Civil rights laws protect you' },
    { id: 'fpt19', tip: 'Free advocacy organizations exist' },
    { id: 'fpt20', tip: 'You are not alone' },
    { id: 'fpt21', tip: 'Hope is a discipline' },
    { id: 'fpt22', tip: 'Sustained beats sprint' },
    { id: 'fpt23', tip: 'Coalition beats solo' },
    { id: 'fpt24', tip: 'Pattern beats incident' },
    { id: 'fpt25', tip: 'Documentation beats memory' },
    { id: 'fpt26', tip: 'Specificity beats vague' },
    { id: 'fpt27', tip: 'Written beats verbal alone' },
    { id: 'fpt28', tip: 'Follow up always' },
    { id: 'fpt29', tip: 'Rest is part of work' },
    { id: 'fpt30', tip: 'Community is medicine' },
    { id: 'fpt31', tip: 'Self-care is political' },
    { id: 'fpt32', tip: 'Joy is also resistance' },
    { id: 'fpt33', tip: 'Build infrastructure' },
    { id: 'fpt34', tip: 'Pass leadership' },
    { id: 'fpt35', tip: 'Mentor those after' },
    { id: 'fpt36', tip: 'Stand on shoulders' },
    { id: 'fpt37', tip: 'Be a shoulder' },
    { id: 'fpt38', tip: 'You belong here' },
    { id: 'fpt39', tip: 'You matter' },
    { id: 'fpt40', tip: 'Continue' }
  ];

  var COMPREHENSIVE_NARRATIVE_PART9 = [
    {
      id: 'cnp9a',
      title: 'When I finally rested',
      narrative: [
        'I had been working without rest for 15 years.',
        '',
        'I took a sabbatical. Three months.',
        '',
        'I did nothing political. I read. I slept. I gardened.',
        '',
        'When I returned, I was sharper. Wiser. More effective.',
        '',
        'I tell people: rest is the work. Rest is the practice.'
      ]
    },
    {
      id: 'cnp9b',
      title: 'When I passed the torch',
      narrative: [
        'I was 45 when I stepped back from leading a coalition I had built.',
        '',
        'I had been holding it for 12 years.',
        '',
        'My mentee Sarah took over. She is sharper than I was.',
        '',
        'I cried with relief and pride.',
        '',
        'I am still in the coalition. As a member. Sarah leads.',
        '',
        'I tell people: passing leadership is the work too.'
      ]
    },
    {
      id: 'cnp9c',
      title: 'My ongoing community',
      narrative: [
        'I am 50 now. I have a community of fellow upstanders.',
        '',
        'We are diverse in age. Some are 20s. Some are 70s.',
        '',
        'We share strategies. We support each other. We argue. We laugh.',
        '',
        'They are my chosen family.',
        '',
        'I tell people: build your community over time. It is what sustains.'
      ]
    },
    {
      id: 'cnp9d',
      title: 'The long arc I am on',
      narrative: [
        'I am 60 now. I have been doing this work for 40 years.',
        '',
        'I have watched real change. I have grieved real losses.',
        '',
        'Some things have gotten better. Some have not.',
        '',
        'I am part of a movement that started before me.',
        '',
        'I am part of a movement that will continue after me.',
        '',
        'I tell people: you are part of something bigger than your lifetime.'
      ]
    },
    {
      id: 'cnp9e',
      title: 'My final reflection',
      narrative: [
        'I am 70 now.',
        '',
        'I have written my last piece.',
        '',
        'I leave it for you.',
        '',
        'Take what serves. Leave what does not.',
        '',
        'Build your path.',
        '',
        'Find your community.',
        '',
        'Rest when needed.',
        '',
        'Return.',
        '',
        'Continue.',
        '',
        'You are not alone.'
      ]
    }
  ];

  var EXTENDED_GLOSSARY_2 = [
    { id: 'eg2_1', term: 'Allyship', definition: 'Standing with marginalized groups one is not part of' },
    { id: 'eg2_2', term: 'Accomplice', definition: 'More than ally; active participant in resistance' },
    { id: 'eg2_3', term: 'Coalition', definition: 'Group of people working together for shared goal' },
    { id: 'eg2_4', term: 'Solidarity', definition: 'Unity in cause or struggle' },
    { id: 'eg2_5', term: 'Mutual aid', definition: 'Community members helping each other' },
    { id: 'eg2_6', term: 'Direct action', definition: 'Action taken directly to achieve goal' },
    { id: 'eg2_7', term: 'Civil disobedience', definition: 'Public refusal to obey unjust laws' },
    { id: 'eg2_8', term: 'Restorative justice', definition: 'Approach focused on repairing harm' },
    { id: 'eg2_9', term: 'Transformative justice', definition: 'Approach focused on transforming conditions creating harm' },
    { id: 'eg2_10', term: 'Abolitionism', definition: 'Movement to abolish harmful institutions' },
    { id: 'eg2_11', term: 'Reparations', definition: 'Concrete action to repair historical harm' },
    { id: 'eg2_12', term: 'Decolonization', definition: 'Process of undoing colonization' },
    { id: 'eg2_13', term: 'Liberation', definition: 'Freedom from oppression' },
    { id: 'eg2_14', term: 'Equity', definition: 'Different from equality. Treats people based on needs to achieve fair outcomes' },
    { id: 'eg2_15', term: 'Equality', definition: 'Treating everyone same' },
    { id: 'eg2_16', term: 'Justice', definition: 'Treating people fairly with attention to context' },
    { id: 'eg2_17', term: 'Trauma-informed', definition: 'Approach recognizing impact of trauma' },
    { id: 'eg2_18', term: 'Adultism', definition: 'Discrimination against youth' },
    { id: 'eg2_19', term: 'Capitalism', definition: 'Economic system based on private ownership' },
    { id: 'eg2_20', term: 'Patriarchy', definition: 'System of male dominance' },
    { id: 'eg2_21', term: 'Cisgender', definition: 'Person whose gender matches assigned at birth' },
    { id: 'eg2_22', term: 'Transgender', definition: 'Person whose gender differs from assigned at birth' },
    { id: 'eg2_23', term: 'Non-binary', definition: 'Gender identity outside male/female binary' },
    { id: 'eg2_24', term: 'Genderqueer', definition: 'Gender outside conventional categories' },
    { id: 'eg2_25', term: 'Two-spirit', definition: 'Indigenous gender identity, term used by some Native communities' },
    { id: 'eg2_26', term: 'Asexual', definition: 'Limited or no sexual attraction' },
    { id: 'eg2_27', term: 'Aromantic', definition: 'Limited or no romantic attraction' },
    { id: 'eg2_28', term: 'Bisexual', definition: 'Attraction to two or more genders' },
    { id: 'eg2_29', term: 'Pansexual', definition: 'Attraction regardless of gender' },
    { id: 'eg2_30', term: 'Queer', definition: 'Reclaimed umbrella term for LGBTQ+' }
  ];

  var GROUNDING_PRACTICES = [
    {
      id: 'gp1',
      name: '5-4-3-2-1 senses grounding',
      howTo: ['5 things you see', '4 things you can touch', '3 things you hear', '2 things you smell', '1 thing you taste'],
      whenToUse: 'Anxiety, panic, dissociation'
    },
    {
      id: 'gp2',
      name: 'Body scan',
      howTo: ['Notice feet on floor', 'Move attention up body slowly', 'Notice sensations without judgment'],
      whenToUse: 'Disconnection, anxiety'
    },
    {
      id: 'gp3',
      name: 'Cold water',
      howTo: ['Splash cold water on face', 'Hold ice cube', 'Cool drink'],
      whenToUse: 'Acute panic'
    },
    {
      id: 'gp4',
      name: 'Movement',
      howTo: ['Stand up', 'Walk', 'Stretch', 'Notice your body moving'],
      whenToUse: 'Stuck energy, dissociation'
    },
    {
      id: 'gp5',
      name: 'Touch object',
      howTo: ['Hold object', 'Notice texture, temperature', 'Stay with sensations'],
      whenToUse: 'Need anchor'
    },
    {
      id: 'gp6',
      name: 'Counting',
      howTo: ['Count backward from 100 by 7', 'Or count forward by 3', 'Engage mind'],
      whenToUse: 'Spiraling thoughts'
    },
    {
      id: 'gp7',
      name: 'Naming',
      howTo: ['Name 5 things you can see', 'Name 5 things by color', 'Name 5 things you appreciate'],
      whenToUse: 'Anxiety, need focus'
    },
    {
      id: 'gp8',
      name: 'Self-touch',
      howTo: ['Hands on face', 'Hug self', 'Tap acupressure points'],
      whenToUse: 'Need comfort'
    }
  ];

  var BREATHING_PRACTICES = [
    {
      id: 'bp1',
      name: 'Box breathing',
      pattern: '4-4-4-4',
      howTo: ['Inhale 4', 'Hold 4', 'Exhale 4', 'Hold 4', 'Repeat 4-8 times'],
      whenToUse: 'Before intervention, before hard conversation, before reporting'
    },
    {
      id: 'bp2',
      name: '4-7-8 breathing',
      pattern: '4-7-8',
      howTo: ['Inhale 4', 'Hold 7', 'Exhale 8', 'Repeat 3-4 times'],
      whenToUse: 'Anxiety, sleep, calm'
    },
    {
      id: 'bp3',
      name: 'Belly breathing',
      pattern: 'natural',
      howTo: ['Hand on belly', 'Breathe so hand rises', 'Slow and natural', 'Continue several minutes'],
      whenToUse: 'Throughout the day'
    },
    {
      id: 'bp4',
      name: 'Alternate nostril',
      pattern: 'alternating',
      howTo: ['Right thumb closes right nostril', 'Inhale left', 'Switch sides', 'Repeat'],
      whenToUse: 'Calm, focus, balance'
    },
    {
      id: 'bp5',
      name: 'Lion\'s breath',
      pattern: 'energetic',
      howTo: ['Inhale deep', 'Open mouth wide', 'Exhale with sound', 'Stick tongue out'],
      whenToUse: 'Release tension, energy'
    },
    {
      id: 'bp6',
      name: 'Coherent breathing',
      pattern: '5-5',
      howTo: ['Inhale 5', 'Exhale 5', 'Continue 10 minutes'],
      whenToUse: 'Anxiety, balance'
    },
    {
      id: 'bp7',
      name: 'Counting breath',
      pattern: 'counted',
      howTo: ['Count to 10 on inhales and exhales', 'Restart if lose count', 'Continue 5-10 minutes'],
      whenToUse: 'Focus, calm'
    },
    {
      id: 'bp8',
      name: 'Sigh breath',
      pattern: 'release',
      howTo: ['Inhale through nose', 'Exhale with audible sigh', 'Repeat 3-5 times'],
      whenToUse: 'Quick release, before action'
    }
  ];

  var TWENTY_K_CLOSING_REFLECTIONS = [
    'Twenty thousand lines of upstander wisdom.',
    'Built across many moments.',
    'For young people learning courage.',
    'For adults supporting growth.',
    'For everyone who has been a target.',
    'For everyone who has been a bystander.',
    'For everyone who has been a harmer.',
    'For everyone who is learning.',
    'For everyone who is teaching.',
    'For everyone who is healing.',
    'For everyone who is growing.',
    'For everyone who refuses to look away.',
    'For everyone who continues.',
    'For everyone who rests.',
    'For everyone who returns.',
    'For everyone who builds.',
    'For everyone who mentors.',
    'For everyone who is mentored.',
    'For everyone who is part of a movement.',
    'For everyone who is alone but not really alone.',
    'For everyone who is finding their voice.',
    'For everyone who has lost a friend over justice.',
    'For everyone who has gained a friend over justice.',
    'For everyone who has stood up.',
    'For everyone who has sat with someone.',
    'For everyone who has said sorry.',
    'For everyone who has been heard.',
    'For everyone who has heard.',
    'For everyone who has documented.',
    'For everyone who has reported.',
    'For everyone who has escalated.',
    'For everyone who has paused.',
    'For everyone who has breathed.',
    'For everyone who has dared.',
    'For everyone who has feared.',
    'For everyone who has gone anyway.',
    'For everyone who is reading this.',
    'For everyone who is becoming.',
    'For everyone.',
    'Welcome.',
    'You belong here.',
    'You matter.',
    'Continue.'
  ];

  var WAVE_OF_AFFIRMATIONS = [
    { id: 'woa1', text: 'I see harm and I choose to act.' },
    { id: 'woa2', text: 'My voice carries weight.' },
    { id: 'woa3', text: 'I am part of generations.' },
    { id: 'woa4', text: 'Small acts ripple out.' },
    { id: 'woa5', text: 'I am the kind of person who shows up.' },
    { id: 'woa6', text: 'My care is action.' },
    { id: 'woa7', text: 'I belong here.' },
    { id: 'woa8', text: 'My presence matters.' },
    { id: 'woa9', text: 'I am building.' },
    { id: 'woa10', text: 'I am exactly where I need to be.' },
    { id: 'woa11', text: 'I lift others.' },
    { id: 'woa12', text: 'I am not alone.' },
    { id: 'woa13', text: 'Hope is my discipline.' },
    { id: 'woa14', text: 'I rest when I need.' },
    { id: 'woa15', text: 'I return.' },
    { id: 'woa16', text: 'I continue.' },
    { id: 'woa17', text: 'I am wise.' },
    { id: 'woa18', text: 'I am patient.' },
    { id: 'woa19', text: 'I am compassionate.' },
    { id: 'woa20', text: 'I am bold.' },
    { id: 'woa21', text: 'I am imperfect.' },
    { id: 'woa22', text: 'I apologize.' },
    { id: 'woa23', text: 'I learn.' },
    { id: 'woa24', text: 'I grow.' },
    { id: 'woa25', text: 'I am loved.' },
    { id: 'woa26', text: 'I love.' },
    { id: 'woa27', text: 'I matter.' },
    { id: 'woa28', text: 'You matter.' },
    { id: 'woa29', text: 'We matter.' },
    { id: 'woa30', text: 'The work matters.' },
    { id: 'woa31', text: 'Now is the time.' },
    { id: 'woa32', text: 'Begin.' },
    { id: 'woa33', text: 'Continue.' },
    { id: 'woa34', text: 'Rest.' },
    { id: 'woa35', text: 'Return.' },
    { id: 'woa36', text: 'Be patient.' },
    { id: 'woa37', text: 'Be present.' },
    { id: 'woa38', text: 'Be loud.' },
    { id: 'woa39', text: 'Be quiet when needed.' },
    { id: 'woa40', text: 'Be yourself.' },
    { id: 'woa41', text: 'Be brave.' },
    { id: 'woa42', text: 'Be human.' },
    { id: 'woa43', text: 'Be hopeful.' },
    { id: 'woa44', text: 'Be ready.' },
    { id: 'woa45', text: 'Be willing.' },
    { id: 'woa46', text: 'Be sustained.' },
    { id: 'woa47', text: 'Be in community.' },
    { id: 'woa48', text: 'Be the kind of person you needed.' },
    { id: 'woa49', text: 'Be the upstander you wish to see.' },
    { id: 'woa50', text: 'Be.' }
  ];

  var QUOTES_FROM_THE_MOVEMENT = [
    { id: 'qfm1', quote: 'Be the change you wish to see in the world.', author: 'Mahatma Gandhi', context: 'Active responsibility' },
    { id: 'qfm2', quote: 'Injustice anywhere is a threat to justice everywhere.', author: 'Martin Luther King Jr.', context: 'Solidarity' },
    { id: 'qfm3', quote: 'I refuse to accept the view that mankind is so tragically bound to the starless midnight of racism and war that the bright daybreak of peace and brotherhood can never become a reality.', author: 'Martin Luther King Jr.', context: 'Hope' },
    { id: 'qfm4', quote: 'There is no such thing as a single-issue struggle because we do not live single-issue lives.', author: 'Audre Lorde', context: 'Intersectionality' },
    { id: 'qfm5', quote: 'It is not our differences that divide us. It is our inability to recognize, accept, and celebrate those differences.', author: 'Audre Lorde', context: 'Difference as strength' },
    { id: 'qfm6', quote: 'Caring for myself is not self-indulgence, it is self-preservation, and that is an act of political warfare.', author: 'Audre Lorde', context: 'Self-care as political' },
    { id: 'qfm7', quote: 'Nobody is free until everybody is free.', author: 'Fannie Lou Hamer', context: 'Universal liberation' },
    { id: 'qfm8', quote: 'I am sick and tired of being sick and tired.', author: 'Fannie Lou Hamer', context: 'Exhaustion as data' },
    { id: 'qfm9', quote: 'Until you do right by me, everything you even think about gonna fail.', author: 'Sojourner Truth (paraphrase)', context: 'Accountability' },
    { id: 'qfm10', quote: 'I am only one, but I am one. I cannot do everything, but I can do something.', author: 'Edward Everett Hale', context: 'Individual responsibility' },
    { id: 'qfm11', quote: 'I have decided to stick with love. Hate is too great a burden to bear.', author: 'Martin Luther King Jr.', context: 'Love as choice' },
    { id: 'qfm12', quote: 'There is more than enough room in the world for everyone to be your friend.', author: 'Fred Rogers', context: 'Abundance' },
    { id: 'qfm13', quote: 'Look for the helpers. You will always find people who are helping.', author: 'Fred Rogers', context: 'Hope' },
    { id: 'qfm14', quote: 'In a world where you can be anything, be kind.', author: 'Common saying', context: 'Kindness as choice' },
    { id: 'qfm15', quote: 'Hope is a discipline.', author: 'Mariame Kaba', context: 'Hope as practice' },
    { id: 'qfm16', quote: 'Nothing about us without us.', author: 'Disability rights movement', context: 'Self-representation' },
    { id: 'qfm17', quote: 'My silence will not protect me. Your silence will not protect you.', author: 'Audre Lorde', context: 'Speaking up' },
    { id: 'qfm18', quote: 'When they go low, we go high.', author: 'Michelle Obama', context: 'Integrity in response' },
    { id: 'qfm19', quote: 'Power concedes nothing without a demand.', author: 'Frederick Douglass', context: 'Active resistance' },
    { id: 'qfm20', quote: 'A right is not what someone gives you; it is what no one can take from you.', author: 'Ramsey Clark', context: 'Rights as inherent' },
    { id: 'qfm21', quote: 'The arc of the moral universe is long, but it bends toward justice.', author: 'Theodore Parker / MLK Jr.', context: 'Long view' },
    { id: 'qfm22', quote: 'I refuse to look away.', author: 'Common upstander', context: 'Witness' },
    { id: 'qfm23', quote: 'Speak the truth, even if your voice shakes.', author: 'Maggie Kuhn', context: 'Truth-telling' },
    { id: 'qfm24', quote: 'You may shoot me with your words, you may cut me with your eyes, but still, like air, I rise.', author: 'Maya Angelou', context: 'Resilience' },
    { id: 'qfm25', quote: 'Diversity is being invited to the party. Inclusion is being asked to dance.', author: 'Verna Myers', context: 'Inclusion' },
    { id: 'qfm26', quote: 'Each generation must do its part.', author: 'Coretta Scott King', context: 'Generational' },
    { id: 'qfm27', quote: 'Strong people do not need strong leaders.', author: 'Ella Baker', context: 'Grassroots power' },
    { id: 'qfm28', quote: 'There comes a time when you have to take a stand.', author: 'John Lewis', context: 'Active resistance' },
    { id: 'qfm29', quote: 'Get in good trouble.', author: 'John Lewis', context: 'Active resistance' },
    { id: 'qfm30', quote: 'We rise by lifting others.', author: 'Robert Ingersoll', context: 'Mutual aid' }
  ];

  var EXTENDED_BOOK_RECOMMENDATIONS_2 = [
    { id: 'ebr2_1', title: 'Disability Visibility: First-Person Stories', author: 'Alice Wong (ed)', year: 2020, useFor: 'High school discussion' },
    { id: 'ebr2_2', title: 'Demystifying Disability', author: 'Emily Ladau', year: 2021, useFor: 'Allies learning' },
    { id: 'ebr2_3', title: 'Unmasking Autism', author: 'Devon Price', year: 2022, useFor: 'Autistic readers and allies' },
    { id: 'ebr2_4', title: 'Born a Crime', author: 'Trevor Noah', year: 2016, useFor: 'Identity, apartheid, humor' },
    { id: 'ebr2_5', title: 'I Am Malala', author: 'Malala Yousafzai', year: 2013, useFor: 'Education advocacy' },
    { id: 'ebr2_6', title: 'The Glass Castle', author: 'Jeannette Walls', year: 2005, useFor: 'Family complexity' },
    { id: 'ebr2_7', title: 'Educated', author: 'Tara Westover', year: 2018, useFor: 'Education as liberation' },
    { id: 'ebr2_8', title: 'The Body Keeps the Score', author: 'Bessel van der Kolk', year: 2014, useFor: 'Trauma understanding' },
    { id: 'ebr2_9', title: 'My Grandmothers Hands', author: 'Resmaa Menakem', year: 2017, useFor: 'Racialized trauma' },
    { id: 'ebr2_10', title: 'All About Love', author: 'bell hooks', year: 2000, useFor: 'Love as politics' },
    { id: 'ebr2_11', title: 'Sister Outsider', author: 'Audre Lorde', year: 1984, useFor: 'Foundational identity essays' },
    { id: 'ebr2_12', title: 'Stamped from the Beginning', author: 'Ibram X. Kendi', year: 2016, useFor: 'Anti-racist history' },
    { id: 'ebr2_13', title: 'Caste', author: 'Isabel Wilkerson', year: 2020, useFor: 'Systemic analysis' },
    { id: 'ebr2_14', title: 'The Warmth of Other Suns', author: 'Isabel Wilkerson', year: 2010, useFor: 'Great Migration' },
    { id: 'ebr2_15', title: 'When They Call You a Terrorist', author: 'Patrisse Cullors', year: 2018, useFor: 'BLM founder memoir' },
    { id: 'ebr2_16', title: 'Becoming', author: 'Michelle Obama', year: 2018, useFor: 'Story of growth' },
    { id: 'ebr2_17', title: 'Born to Run', author: 'Bruce Springsteen', year: 2016, useFor: 'Working class story' },
    { id: 'ebr2_18', title: 'Bossypants', author: 'Tina Fey', year: 2011, useFor: 'Women in workplace' },
    { id: 'ebr2_19', title: 'A Promised Land', author: 'Barack Obama', year: 2020, useFor: 'Political leadership' },
    { id: 'ebr2_20', title: 'On Earth We Are Briefly Gorgeous', author: 'Ocean Vuong', year: 2019, useFor: 'Identity, family, war' }
  ];

  var FINAL_WISDOM_LIBRARY = [
    { id: 'fwl1', wisdom: 'Notice. Then act.' },
    { id: 'fwl2', wisdom: 'Small acts build movement.' },
    { id: 'fwl3', wisdom: 'Coalition is power.' },
    { id: 'fwl4', wisdom: 'Documentation is leverage.' },
    { id: 'fwl5', wisdom: 'Rest is part of resistance.' },
    { id: 'fwl6', wisdom: 'Apology repairs.' },
    { id: 'fwl7', wisdom: 'Mistakes teach.' },
    { id: 'fwl8', wisdom: 'Community sustains.' },
    { id: 'fwl9', wisdom: 'Hope is discipline.' },
    { id: 'fwl10', wisdom: 'You belong here.' },
    { id: 'fwl11', wisdom: 'Show up.' },
    { id: 'fwl12', wisdom: 'Stay loud.' },
    { id: 'fwl13', wisdom: 'Continue.' },
    { id: 'fwl14', wisdom: 'You matter.' },
    { id: 'fwl15', wisdom: 'Your voice has weight.' },
    { id: 'fwl16', wisdom: 'Care is action.' },
    { id: 'fwl17', wisdom: 'Listen first.' },
    { id: 'fwl18', wisdom: 'Document often.' },
    { id: 'fwl19', wisdom: 'Build power.' },
    { id: 'fwl20', wisdom: 'Pass leadership.' },
    { id: 'fwl21', wisdom: 'Center most impacted.' },
    { id: 'fwl22', wisdom: 'Use privilege strategically.' },
    { id: 'fwl23', wisdom: 'Trust your gut.' },
    { id: 'fwl24', wisdom: 'Practice over perfection.' },
    { id: 'fwl25', wisdom: 'Sustainability beats sprint.' },
    { id: 'fwl26', wisdom: 'Build infrastructure.' },
    { id: 'fwl27', wisdom: 'Multi-generational.' },
    { id: 'fwl28', wisdom: 'Long arc.' },
    { id: 'fwl29', wisdom: 'Joy is also resistance.' },
    { id: 'fwl30', wisdom: 'Both/and, not either/or.' }
  ];

  var COMPREHENSIVE_BYSTANDER_NARRATIVES_FINAL = [
    {
      id: 'cbnf1',
      title: 'When my middle school self met my future',
      narrative: [
        'I was 13 and bullied. I wrote in my diary: "I want to be the kind of adult who would have helped me."',
        '',
        'I am 38 now. I work in mental health for young people.',
        '',
        'Last year my middle school had a reunion. I went.',
        '',
        'A former classmate who had been an upstander for me back then was there. She apologized for not doing more.',
        '',
        'I cried. I told her she had been the reason I survived 7th grade.',
        '',
        'We are friends now.',
        '',
        'I tell people: the kindness you show shapes lives. Including your own.'
      ]
    },
    {
      id: 'cbnf2',
      title: 'My ongoing reckoning',
      narrative: [
        'I have been doing upstander work for 25 years.',
        '',
        'Recently I learned about harm I had caused. A college friend reached out. They named what I had said. They had been holding it for 20 years.',
        '',
        'I apologized. Fully. Specifically.',
        '',
        'They thanked me. They said it had taken courage to reach out.',
        '',
        'I had been an upstander but also a harmer. Both can be true.',
        '',
        'I tell people: you will discover your own harm. Honor the courage of those who tell you. Apologize fully.'
      ]
    },
    {
      id: 'cbnf3',
      title: 'The grandfather who changed',
      narrative: [
        'My grandfather had been hostile to my LGBTQ identity for years.',
        '',
        'Slowly, over time, he changed. I had been patient. I had not given up. Family members had advocated for me when I could not.',
        '',
        'He came to my wedding. He cried.',
        '',
        'He died last year. At his funeral I spoke about his change.',
        '',
        'I tell people: change is possible across generations. It takes time. Sometimes years.'
      ]
    },
    {
      id: 'cbnf4',
      title: 'The student who taught me',
      narrative: [
        'I am a teacher. I taught a student named Sam who was nonbinary.',
        '',
        'Sam taught me about pronouns. About inclusive curriculum. About making my classroom safe.',
        '',
        'I had been a teacher for 20 years. Sam taught me more in one year than my training had.',
        '',
        'I am a better teacher because of Sam.',
        '',
        'I tell teachers: your students are your teachers too.'
      ]
    },
    {
      id: 'cbnf5',
      title: 'My closing thought',
      narrative: [
        'I have been writing this guide for years.',
        '',
        'I have shared what I have learned.',
        '',
        'I have not arrived. I am still learning.',
        '',
        'I tell readers: this is yours now. Take what serves. Leave what does not.',
        '',
        'Build your own path.',
        '',
        'Continue.',
        '',
        'Welcome to the work.'
      ]
    }
  ];

  var ULTIMATE_SCENARIO_BANK = [
    {
      id: 'usb1',
      title: 'New friend group dynamic',
      situation: 'You have joined a new friend group. They tease one peer who is not present.',
      response: ['Notice the pattern', 'Privately ask if pattern continues', 'Refuse to laugh', 'Stand by the absent peer when present']
    },
    {
      id: 'usb2',
      title: 'Adult uses ableist slur',
      situation: 'An adult in authority uses a slur.',
      response: ['Note the moment', 'Privately ask them to stop', 'Report to next level if pattern', 'Stand with disabled peers']
    },
    {
      id: 'usb3',
      title: 'Online doxxing',
      situation: 'A peer\'s private info is being shared online.',
      response: ['Screenshot evidence', 'Tell peer immediately', 'Help report to platforms', 'Tell adults', 'Police if serious']
    },
    {
      id: 'usb4',
      title: 'Religious discrimination',
      situation: 'Religious symbols are being mocked.',
      response: ['Interrupt the mockery', 'Stand with religious peers', 'Tell adults', 'Push for interfaith programs']
    },
    {
      id: 'usb5',
      title: 'Wage theft witnessed',
      situation: 'Coworker is being denied earned wages.',
      response: ['Tell coworker', 'Connect with labor resources', 'Document', 'Tell HR or DOL if pattern']
    },
    {
      id: 'usb6',
      title: 'Public restaurant incident',
      situation: 'You see a customer berating a server about race.',
      response: ['Approach server quietly after', 'Tell manager', 'Document', 'Tip well']
    },
    {
      id: 'usb7',
      title: 'Family member outs LGBTQ relative',
      situation: 'A family member outs your LGBTQ relative to other family.',
      response: ['Talk to the relative who was outed', 'Address the outer privately', 'Support the relative', 'Build new family norms']
    },
    {
      id: 'usb8',
      title: 'School staff bullying student',
      situation: 'A teacher or staff is consistently harsh with one student.',
      response: ['Document specific incidents', 'Tell counselor', 'Tell parent of student', 'Escalate to principal']
    },
    {
      id: 'usb9',
      title: 'Healthcare bias',
      situation: 'You see a medical provider dismissing a patient.',
      response: ['Stay with patient', 'Help patient advocate', 'Patient advocate if hospital', 'External complaint if pattern']
    },
    {
      id: 'usb10',
      title: 'Sports team toxic culture',
      situation: 'Team has toxic masculinity culture, hazing of younger players.',
      response: ['Refuse to participate', 'Support younger players', 'Tell coach or athletic director', 'Document specific incidents', 'Quit if pattern entrenched']
    },
    {
      id: 'usb11',
      title: 'Witnessing a friend being targeted online',
      situation: 'A friend is being cyberbullied.',
      response: ['Screenshot evidence', 'DM with care', 'Help report to platforms', 'Tell adults if minor', 'Help mental health if needed']
    },
    {
      id: 'usb12',
      title: 'Voting or political pressure',
      situation: 'Someone is pressuring others to vote a particular way through intimidation.',
      response: ['Notify election officials', 'Stay with intimidated voter', 'Document', 'Report to authorities']
    }
  ];

  var CLOSING_THOUGHTS = [
    'Your voice matters more than you know.',
    'You are not alone in this work.',
    'Sustained practice beats heroic moments.',
    'Community is the medicine.',
    'Self-care is part of the work.',
    'Mistakes are inevitable. Repair is possible.',
    'Hope is a discipline, not a feeling.',
    'You are part of a long arc.',
    'Build small. Sustain it.',
    'Show up.',
    'Stay loud.',
    'Continue.',
    'Rest.',
    'Return.',
    'Build with others.',
    'Mentor those after you.',
    'Stand on shoulders.',
    'Be a shoulder.',
    'You belong here.',
    'You matter.',
    'Welcome.'
  ];

  var FINAL_MESSAGE_FROM_THE_MOVEMENT = [
    'To every young person learning to be an upstander:',
    '',
    'You are not alone.',
    '',
    'There is a long line of people before you who did this work. There will be a long line after.',
    '',
    'You will make mistakes. Apologize. Continue.',
    '',
    'You will be tired. Rest. Return.',
    '',
    'You will be hurt. Heal. Continue.',
    '',
    'You will see real change. Celebrate.',
    '',
    'You will see real loss. Grieve.',
    '',
    'Build community. Find allies. Mentor others.',
    '',
    'Stand on shoulders. Be a shoulder.',
    '',
    'This work is generational.',
    '',
    'Welcome.',
    '',
    'You belong here.',
    '',
    'You matter.',
    '',
    'Your voice has weight.',
    '',
    'Your care is action.',
    '',
    'Your presence is a contribution.',
    '',
    'We are not alone.',
    '',
    'Lets build.'
  ];

  var SUSTAINABLE_PRACTICE_FINAL = [
    {
      id: 'spf1',
      area: 'Body care',
      practices: [
        'Daily movement',
        'Sleep priority',
        'Nutrition basics',
        'Hydration',
        'Medical care'
      ],
      whyItMatters: 'Body keeps the score. Care for body sustains the work.'
    },
    {
      id: 'spf2',
      area: 'Mental health',
      practices: [
        'Therapy if needed',
        'Mindfulness or meditation',
        'Journaling',
        'Therapist or counselor',
        'Mental health resources'
      ],
      whyItMatters: 'Mental health affects everything. Care for mind sustains the work.'
    },
    {
      id: 'spf3',
      area: 'Emotional regulation',
      practices: [
        'Body check-ins',
        'Process feelings',
        'Trauma-informed care',
        'Support system',
        'Self-compassion'
      ],
      whyItMatters: 'Regulation makes upstander work possible.'
    },
    {
      id: 'spf4',
      area: 'Social support',
      practices: [
        'Multiple friend groups',
        'Mentor relationships',
        'Coalition with peers',
        'Family of choice',
        'Community organizations'
      ],
      whyItMatters: 'Isolation kills the work. Community sustains it.'
    },
    {
      id: 'spf5',
      area: 'Spiritual or meaning practice',
      practices: [
        'Whatever fits you',
        'Religious community if it fits',
        'Nature time',
        'Art or music',
        'Reflection'
      ],
      whyItMatters: 'Meaning sustains hard work.'
    },
    {
      id: 'spf6',
      area: 'Rest and recovery',
      practices: [
        'Daily downtime',
        'Weekly rest',
        'Monthly bigger rest',
        'Annual sabbatical or vacation',
        'Recovery after intense work'
      ],
      whyItMatters: 'Rest is not optional. It is required.'
    },
    {
      id: 'spf7',
      area: 'Joy practice',
      practices: [
        'Hobbies',
        'Music',
        'Art',
        'Play',
        'Pleasure'
      ],
      whyItMatters: 'Joy fuels the work. Joy is also resistance.'
    },
    {
      id: 'spf8',
      area: 'Boundaries',
      practices: [
        'Know your limits',
        'Say no when needed',
        'Schedule rest',
        'Refuse demands that violate values',
        'Protect your time'
      ],
      whyItMatters: 'Boundaries protect long-term work.'
    }
  ];

  var INTERSECTIONAL_ANALYSIS_GUIDE = [
    {
      id: 'iag1',
      framework: 'Intersectional analysis basics',
      principles: [
        'Multiple identities compound experiences',
        'Privilege and oppression coexist in same person',
        'Solutions must address multiple identities',
        'Center most impacted'
      ],
      keyThinkers: ['Kimberle Crenshaw', 'bell hooks', 'Patricia Hill Collins', 'Audre Lorde']
    },
    {
      id: 'iag2',
      framework: 'Identity mapping',
      practice: [
        'Map your race, gender, class, sexuality, disability, religion, age, etc.',
        'Note where each identity gives privilege',
        'Note where each identity gives oppression',
        'See how they intersect for you specifically'
      ],
      reflection: 'Where am I privileged? Where am I oppressed? How do these interact?'
    },
    {
      id: 'iag3',
      framework: 'Centering most impacted',
      principles: [
        'Listen to those most affected',
        'Their experience is data',
        'Their wisdom guides response',
        'Their leadership matters'
      ],
      practice: [
        'Whose voices are missing?',
        'Who is most affected?',
        'Are they leading?',
        'Am I deferring?'
      ]
    },
    {
      id: 'iag4',
      framework: 'Privilege use',
      principles: [
        'Privilege is real',
        'Use it strategically',
        'Risk what you have to spend',
        'Center marginalized'
      ],
      practice: [
        'Where do I have privilege?',
        'How can I use it for justice?',
        'What am I risking?',
        'Whose lead am I following?'
      ]
    },
    {
      id: 'iag5',
      framework: 'Solidarity across difference',
      principles: [
        'Different identities can ally',
        'Mutual struggle exists',
        'Coalition multiplies power',
        'Cross-movement learning'
      ],
      practice: [
        'Who are my natural allies?',
        'How can we work together?',
        'What can I learn from them?',
        'What can I contribute?'
      ]
    }
  ];

  var ULTIMATE_AFFIRMATIONS_LIBRARY = [
    { id: 'ufl1', text: 'I am the kind of person who notices.' },
    { id: 'ufl2', text: 'My voice has weight.' },
    { id: 'ufl3', text: 'I belong in this work.' },
    { id: 'ufl4', text: 'I am building a different world.' },
    { id: 'ufl5', text: 'My presence is enough.' },
    { id: 'ufl6', text: 'I do not have to be perfect.' },
    { id: 'ufl7', text: 'I am a witness who chooses to act.' },
    { id: 'ufl8', text: 'My discomfort is data.' },
    { id: 'ufl9', text: 'I am exactly where I need to be.' },
    { id: 'ufl10', text: 'I lift as I climb.' },
    { id: 'ufl11', text: 'My liberation is bound to others.' },
    { id: 'ufl12', text: 'I refuse to be a bystander.' },
    { id: 'ufl13', text: 'My friends can hold me accountable.' },
    { id: 'ufl14', text: 'I make space for others.' },
    { id: 'ufl15', text: 'I am the friend I wish I had had.' },
    { id: 'ufl16', text: 'My power grows with practice.' },
    { id: 'ufl17', text: 'I deserve rest as part of this work.' },
    { id: 'ufl18', text: 'Small acts add up.' },
    { id: 'ufl19', text: 'I am building a culture of care.' },
    { id: 'ufl20', text: 'I extend grace to myself.' },
    { id: 'ufl21', text: 'I am part of a movement.' },
    { id: 'ufl22', text: 'My silence has taught me.' },
    { id: 'ufl23', text: 'My speech can teach others.' },
    { id: 'ufl24', text: 'I am the kind of person who shows up.' },
    { id: 'ufl25', text: 'My emotions guide action.' },
    { id: 'ufl26', text: 'I hold accountability and compassion.' },
    { id: 'ufl27', text: 'I am part of a long lineage.' },
    { id: 'ufl28', text: 'My care is political.' },
    { id: 'ufl29', text: 'I am building a culture of care.' },
    { id: 'ufl30', text: 'My power has not yet shown.' },
    { id: 'ufl31', text: 'I move forward each day.' },
    { id: 'ufl32', text: 'I am building the world I want.' },
    { id: 'ufl33', text: 'I belong to this movement.' },
    { id: 'ufl34', text: 'I am committed for the long view.' },
    { id: 'ufl35', text: 'I trust my own gut.' },
    { id: 'ufl36', text: 'I am wiser today than yesterday.' },
    { id: 'ufl37', text: 'I am part of generations.' },
    { id: 'ufl38', text: 'I show up for justice.' },
    { id: 'ufl39', text: 'My values are my compass.' },
    { id: 'ufl40', text: 'I am not alone.' }
  ];

  var COMPREHENSIVE_FAQ_FINAL = [
    {
      id: 'cff1',
      question: 'Is bullying really that bad?',
      answer: 'Yes. Bullied students have higher rates of anxiety, depression, suicide. Bullying is real harm. It is not "kids being kids."'
    },
    {
      id: 'cff2',
      question: 'But cannot kids just toughen up?',
      answer: 'No. "Toughen up" puts responsibility on target. The harm is real. The system failure is real. Targets do not need to change. Bullying needs to stop.'
    },
    {
      id: 'cff3',
      question: 'What if the bully had a hard life?',
      answer: 'Often they do. Hurt people hurt people. AND that does not erase the harm. Both can be true. Support both targets and bullies.'
    },
    {
      id: 'cff4',
      question: 'What if I am scared to speak up?',
      answer: 'Fear is valid. Build courage incrementally. Start with low-risk interventions. Build coalition. Practice. Continue.'
    },
    {
      id: 'cff5',
      question: 'What if adults are part of the problem?',
      answer: 'They often are. Find allies. Escalate to next level. External authority if needed. You can advocate for yourself.'
    },
    {
      id: 'cff6',
      question: 'What if the system fails?',
      answer: 'It often does. Document. Escalate. External authority. Coalition. Sustained work. You are not the failure.'
    },
    {
      id: 'cff7',
      question: 'What if I burn out?',
      answer: 'Rest. Self-care. Reach out to support. Adjust pace. The work continues when you return.'
    },
    {
      id: 'cff8',
      question: 'What if I lose friends?',
      answer: 'Real cost. Sometimes worth it. New friends are possible. Values-aligned community awaits.'
    },
    {
      id: 'cff9',
      question: 'What if nothing changes?',
      answer: 'Sometimes it does not in the timeframe you want. Sustain. Multi-level. Long view. Hope is a discipline.'
    },
    {
      id: 'cff10',
      question: 'What if I make mistakes?',
      answer: 'You will. Apologize. Learn. Continue. Mistakes are teachers.'
    },
    {
      id: 'cff11',
      question: 'What if I am alone?',
      answer: 'You are not. Community exists. Reach out. Build relationships. Find your people.'
    },
    {
      id: 'cff12',
      question: 'What is the most important thing I can do?',
      answer: 'Notice. Then act in the way that fits the moment. Sustain over time.'
    }
  ];

  var FINAL_BYSTANDER_NARRATIVES = [
    {
      id: 'fbn1',
      title: 'The thank-you note I wrote',
      narrative: [
        'I was 25. I had been doing upstander work for 12 years.',
        '',
        'One day I wrote a thank-you note to my high school counselor Ms. Hassan. She had been my first ally.',
        '',
        'I wrote: "You helped me become who I am. Thank you for taking my reports seriously. Thank you for believing me. Thank you for being patient with my growth."',
        '',
        'She wrote back. She had retired. She told me my note had been one of the best gifts of her career.',
        '',
        'I tell people: thank your upstander mentors. They often do not know what they have meant.'
      ]
    },
    {
      id: 'fbn2',
      title: 'The youth I will mentor next',
      narrative: [
        'I am 38 now. I just got a new mentee. Their name is Mia. They are 14.',
        '',
        'Mia is just starting to see harm in their school. They are uncertain about what to do.',
        '',
        'I listen first. I tell them: "Your voice matters."',
        '',
        'I tell them: "Take small steps. Build slowly. Find allies."',
        '',
        'I do not know who Mia will become. I am honored to walk alongside.',
        '',
        'I tell people my age: mentor young people. Build the next generation.'
      ]
    },
    {
      id: 'fbn3',
      title: 'My own continuing growth',
      narrative: [
        'I am 45 now. I have been doing upstander work for over 30 years.',
        '',
        'I still get it wrong sometimes. I still learn. I still grow.',
        '',
        'My practice has changed over time. I move slower. I think bigger. I rest more.',
        '',
        'I am still part of movement.',
        '',
        'I tell people: the work is lifelong. Pace yourself.'
      ]
    },
    {
      id: 'fbn4',
      title: 'When I rest',
      narrative: [
        'I am 50 now. I have learned to rest.',
        '',
        'For decades I burned through energy. I am wiser now.',
        '',
        'I rest when I need to. I trust younger people to carry the work.',
        '',
        'When I return, I bring fresh energy.',
        '',
        'I tell people: rest is part of long-term practice.'
      ]
    },
    {
      id: 'fbn5',
      title: 'The arc I am part of',
      narrative: [
        'I am 60 now. I have been doing upstander work for over 40 years.',
        '',
        'I have watched real change. I have grieved real losses.',
        '',
        'I am part of an arc that started before me. It will continue after me.',
        '',
        'I am one node in a long network.',
        '',
        'I tell people: you are part of something bigger than your lifetime.'
      ]
    }
  ];

  var EXTENDED_REFLECTION_PROMPTS = [
    { id: 'erp1', prompt: 'What is one moment of upstander work you have witnessed that inspires you?', depth: 'inspiration' },
    { id: 'erp2', prompt: 'Who in your life was an upstander for you?', depth: 'gratitude' },
    { id: 'erp3', prompt: 'What would it have meant to you if someone had been an upstander when you needed it?', depth: 'longing' },
    { id: 'erp4', prompt: 'What is one moment you wish you had been an upstander?', depth: 'regret' },
    { id: 'erp5', prompt: 'What is one moment you were an upstander you are proud of?', depth: 'pride' },
    { id: 'erp6', prompt: 'What gets in the way of you being an upstander?', depth: 'barrier' },
    { id: 'erp7', prompt: 'What helps you be an upstander?', depth: 'enabler' },
    { id: 'erp8', prompt: 'Who do you wish you could be more of an upstander for?', depth: 'longing' },
    { id: 'erp9', prompt: 'What kind of upstander do you want to become?', depth: 'aspiration' },
    { id: 'erp10', prompt: 'What practice will you commit to building?', depth: 'commitment' },
    { id: 'erp11', prompt: 'What identity work do you need to do?', depth: 'inner work' },
    { id: 'erp12', prompt: 'What community do you want to build?', depth: 'community' },
    { id: 'erp13', prompt: 'What change do you want to see in your school?', depth: 'systemic' },
    { id: 'erp14', prompt: 'What change do you want to see in your family?', depth: 'systemic' },
    { id: 'erp15', prompt: 'What change do you want to see in the world?', depth: 'systemic' },
    { id: 'erp16', prompt: 'Who needs your voice now?', depth: 'action' },
    { id: 'erp17', prompt: 'What conversation are you avoiding?', depth: 'specific' },
    { id: 'erp18', prompt: 'What boundary do you need to set?', depth: 'specific' },
    { id: 'erp19', prompt: 'What apology do you owe?', depth: 'specific' },
    { id: 'erp20', prompt: 'What truth do you need to tell?', depth: 'specific' },
    { id: 'erp21', prompt: 'Where do you have power you have not used?', depth: 'power' },
    { id: 'erp22', prompt: 'How do you take care of yourself in this work?', depth: 'self-care' },
    { id: 'erp23', prompt: 'What is your sustainability practice?', depth: 'sustainability' },
    { id: 'erp24', prompt: 'Who do you call when this is hard?', depth: 'support' },
    { id: 'erp25', prompt: 'How will you celebrate your growth?', depth: 'celebration' },
    { id: 'erp26', prompt: 'What is your growing edge?', depth: 'growth' },
    { id: 'erp27', prompt: 'What story do you tell yourself that limits you?', depth: 'inner work' },
    { id: 'erp28', prompt: 'What new story do you want to inhabit?', depth: 'becoming' },
    { id: 'erp29', prompt: 'What does future you want you to do today?', depth: 'forward' },
    { id: 'erp30', prompt: 'What would you tell your past self?', depth: 'mentor self' },
    { id: 'erp31', prompt: 'Whose shoulders do you stand on?', depth: 'gratitude' },
    { id: 'erp32', prompt: 'Whose shoulders will support those after you?', depth: 'forward' },
    { id: 'erp33', prompt: 'What is the long view of your work?', depth: 'longview' },
    { id: 'erp34', prompt: 'How are you part of a long arc?', depth: 'longview' },
    { id: 'erp35', prompt: 'What will you do today for justice?', depth: 'action' },
    { id: 'erp36', prompt: 'What will you do tomorrow?', depth: 'planning' },
    { id: 'erp37', prompt: 'What will you do this week?', depth: 'planning' },
    { id: 'erp38', prompt: 'What will you do this month?', depth: 'planning' },
    { id: 'erp39', prompt: 'What will you do this year?', depth: 'planning' },
    { id: 'erp40', prompt: 'What will you do this lifetime?', depth: 'longview' }
  ];

  var DEEPER_CONVERSATION_GUIDES = [
    {
      id: 'dcg1',
      conversation: 'With friend who has been excluding someone',
      opener: 'Hey, I want to talk to you about something. Can we?',
      mainPoints: [
        'I have noticed you have been excluding ___.',
        'I see specific examples: [list].',
        'I think it is causing them harm.',
        'I want to do this differently going forward.'
      ],
      anticipateResponses: [
        '"You are overreacting" - Address with specifics',
        '"I have my reasons" - Listen but hold line',
        '"Why are you defending them?" - Center the harm'
      ],
      closing: 'I appreciate you hearing me. Can we agree on next steps?',
      afterCare: ['Reach out to excluded person', 'Build inclusive habits', 'Continue dialogue']
    },
    {
      id: 'dcg2',
      conversation: 'With teacher about pattern of harm',
      opener: 'I have noticed a pattern I would like to discuss with you.',
      mainPoints: [
        'I have observed [specific examples].',
        'I think it is impacting the student.',
        'Could we talk about what could be different?'
      ],
      anticipateResponses: [
        'Defensiveness - Stay calm',
        'Denial - Use specific examples',
        'Acceptance - Plan changes together'
      ],
      closing: 'Thank you for hearing me. Could we follow up in ___ weeks?',
      afterCare: ['Document the conversation', 'Watch for pattern change', 'Escalate if pattern continues']
    },
    {
      id: 'dcg3',
      conversation: 'With parent about my upstander work',
      opener: 'I want to share something I have been doing.',
      mainPoints: [
        'I have been [specific upstander work].',
        'It has cost me [specific costs].',
        'It has rewarded me [specific rewards].',
        'I want your support.'
      ],
      anticipateResponses: [
        '"Be careful" - Acknowledge but maintain commitment',
        '"That is brave" - Receive the compliment',
        '"You should not get involved" - Hold line respectfully'
      ],
      closing: 'I appreciate you. I want to continue this work.',
      afterCare: ['Keep parent informed', 'Build their support', 'Set healthy boundaries']
    },
    {
      id: 'dcg4',
      conversation: 'With sibling about their bullying behavior',
      opener: 'I love you. AND I need to talk about something.',
      mainPoints: [
        'I have noticed you have been ___.',
        'It is hurting the person.',
        'I cannot participate.',
        'I want us to talk about it.'
      ],
      anticipateResponses: [
        'Defensiveness - Use love language',
        'Denial - Specific examples',
        'Acceptance - Build new pattern together'
      ],
      closing: 'I love you. Help me help you do this differently.',
      afterCare: ['Continue supporting sibling', 'Address with parents if pattern', 'Continue dialogue']
    },
    {
      id: 'dcg5',
      conversation: 'With counselor about reporting pattern',
      opener: 'I would like to report something I have observed.',
      mainPoints: [
        'I have documented [specific incidents].',
        'I am concerned about the impact on students.',
        'I would like school response.',
        'I want to know follow-up.'
      ],
      anticipateResponses: [
        '"We will look into it" - Ask for timeline',
        '"This is serious" - Plan together',
        '"Not enough evidence" - Push for investigation'
      ],
      closing: 'Thank you. Could you commit to ___ by ___?',
      afterCare: ['Track follow-up', 'Document conversations', 'Escalate if no response']
    },
    {
      id: 'dcg6',
      conversation: 'With administrator about systemic issue',
      opener: 'I would like to discuss a pattern I have observed.',
      mainPoints: [
        'I have data showing [pattern].',
        'I have specific examples.',
        'I am proposing [specific changes].',
        'I would like investigation and response.'
      ],
      anticipateResponses: [
        'Defensiveness - Stay focused on data',
        'Need for time - Push for timeline',
        'Acceptance - Plan together'
      ],
      closing: 'Thank you for your time. When can we follow up?',
      afterCare: ['Document conversation', 'Follow up in writing', 'Continue advocacy']
    },
    {
      id: 'dcg7',
      conversation: 'With target of bullying',
      opener: 'I have been thinking about you. Are you okay?',
      mainPoints: [
        'I have noticed [specific incidents].',
        'I want you to know I see you.',
        'I am sorry that is happening.',
        'What do you need from me?'
      ],
      anticipateResponses: [
        '"I am fine" - Honor but stay present',
        '"Thanks for noticing" - Build connection',
        '"I do not want to talk about it" - Honor their pace'
      ],
      closing: 'I will check in tomorrow. Or you can reach me whenever.',
      afterCare: ['Sustained contact', 'Help when asked', 'Honor their pace']
    },
    {
      id: 'dcg8',
      conversation: 'With ally about coalition',
      opener: 'I want to talk about working together more deeply.',
      mainPoints: [
        'I value our shared work.',
        'I see us as natural allies.',
        'I am proposing we ___.',
        'What do you think?'
      ],
      anticipateResponses: [
        'Enthusiasm - Plan together',
        'Hesitation - Address concerns',
        'Decline - Respect their decision'
      ],
      closing: 'Thank you. Let me know what you decide.',
      afterCare: ['Build the work together', 'Honor their pace', 'Stay in connection']
    }
  ];

  var UPSTANDER_SKILLS_PROGRESSION = [
    {
      id: 'usp1',
      level: 'Beginner (Week 1-4)',
      skills: [
        'Notice incidents',
        'Document observations',
        'Tell trusted adult',
        'Sit with target',
        'Refuse to participate'
      ],
      timeNeeded: 'Daily practice for one month',
      indicators: ['You notice more', 'You log incidents', 'You have one trusted adult']
    },
    {
      id: 'usp2',
      level: 'Developing (Month 2-3)',
      skills: [
        'Direct intervention in one situation',
        'Hold short confrontation',
        'Send advocacy email',
        'Stand near target visibly',
        'Address one peer about behavior'
      ],
      timeNeeded: 'Sustained practice for two months',
      indicators: ['You speak up once', 'You handle pushback', 'You maintain over time']
    },
    {
      id: 'usp3',
      level: 'Practicing (Month 4-6)',
      skills: [
        'Multiple direct interventions',
        'Confront friends',
        'Build small coalition',
        'Document patterns',
        'Tell counselor of patterns'
      ],
      timeNeeded: 'Sustained practice for three months',
      indicators: ['You are known for caring', 'You have allies', 'You handle complexity']
    },
    {
      id: 'usp4',
      level: 'Sustained (Month 7-12)',
      skills: [
        'Lead actions',
        'Mentor younger advocates',
        'Build coalition',
        'Engage with systems',
        'Sustain self-care'
      ],
      timeNeeded: 'Year-long sustained practice',
      indicators: ['You lead', 'You build others', 'You sustain']
    },
    {
      id: 'usp5',
      level: 'Long-term (Year 2+)',
      skills: [
        'Strategic vision',
        'Generational thinking',
        'Multi-issue work',
        'Cross-movement solidarity',
        'Movement building'
      ],
      timeNeeded: 'Multi-year sustained practice',
      indicators: ['You think long term', 'You build infrastructure', 'You pass leadership']
    }
  ];

  var BYSTANDER_MOMENT_RECOGNITION = [
    {
      id: 'bmr1',
      moment: 'Hallway slur',
      whatYouFeel: ['Heart races', 'Stomach knot', 'Hot face'],
      whatYourBrainSays: ['Not your fight', 'Someone else will'],
      whatToTry: ['Take a breath', 'One sentence: "stop"', 'Check on target after']
    },
    {
      id: 'bmr2',
      moment: 'Group chat cruelty',
      whatYouFeel: ['Sick', 'Avoidance', 'Numb'],
      whatYourBrainSays: ['Just jokes', 'Scroll on'],
      whatToTry: ['Pause before scrolling', 'One message: "lets ease up"', 'Reach out to target']
    },
    {
      id: 'bmr3',
      moment: 'Lunch exclusion',
      whatYouFeel: ['Embarrassed', 'Awkward'],
      whatYourBrainSays: ['Not your business', 'They will figure it out'],
      whatToTry: ['Invite them next', 'Tell friends to make space', 'Sit with them']
    },
    {
      id: 'bmr4',
      moment: 'Teacher harming student',
      whatYouFeel: ['Frozen', 'Helpless'],
      whatYourBrainSays: ['Cannot interfere with adult'],
      whatToTry: ['Raise hand to redirect', 'Tell counselor after', 'Document pattern']
    },
    {
      id: 'bmr5',
      moment: 'Online harassment',
      whatYouFeel: ['Disgusted', 'Want to do something'],
      whatYourBrainSays: ['Cannot stop online', 'Not my place'],
      whatToTry: ['Screenshot', 'DM target', 'Tell adult']
    },
    {
      id: 'bmr6',
      moment: 'Family member cruelty',
      whatYouFeel: ['Trapped', 'Loyalty conflict'],
      whatYourBrainSays: ['Family is family', 'Cannot rock the boat'],
      whatToTry: ['Pause', 'One sentence: "Not okay around me"', 'Take space if needed']
    },
    {
      id: 'bmr7',
      moment: 'Coach yelling at player',
      whatYouFeel: ['Worried for player', 'Afraid of coach'],
      whatYourBrainSays: ['Sports culture', 'Tough love'],
      whatToTry: ['Sit by player after', 'Tell AD privately', 'Document']
    },
    {
      id: 'bmr8',
      moment: 'New student alone',
      whatYouFeel: ['Sympathy', 'Awkwardness'],
      whatYourBrainSays: ['They will find their group', 'Not my friend'],
      whatToTry: ['Walk over', 'Introduce yourself', 'Sit together']
    }
  ];

  var ADDITIONAL_AFFIRMATIONS = [
    { id: 'aa1', text: 'I am part of something larger than myself.' },
    { id: 'aa2', text: 'My care is action.' },
    { id: 'aa3', text: 'I get to choose who I am every day.' },
    { id: 'aa4', text: 'My voice has weight.' },
    { id: 'aa5', text: 'I belong in this work.' },
    { id: 'aa6', text: 'I am building a different world.' },
    { id: 'aa7', text: 'My presence is enough.' },
    { id: 'aa8', text: 'I do not have to be perfect.' },
    { id: 'aa9', text: 'I am a witness who chooses to act.' },
    { id: 'aa10', text: 'My discomfort is data.' },
    { id: 'aa11', text: 'I am exactly where I need to be in my growth.' },
    { id: 'aa12', text: 'I lift as I climb.' },
    { id: 'aa13', text: 'My liberation is bound to others.' },
    { id: 'aa14', text: 'I refuse to be a bystander.' },
    { id: 'aa15', text: 'My friends can hold me accountable.' },
    { id: 'aa16', text: 'I make space for others.' },
    { id: 'aa17', text: 'I am the friend I wish I had had.' },
    { id: 'aa18', text: 'My power grows with practice.' },
    { id: 'aa19', text: 'I deserve rest as part of this work.' },
    { id: 'aa20', text: 'Small acts add up.' },
    { id: 'aa21', text: 'I am building a culture of care.' },
    { id: 'aa22', text: 'I extend grace to myself.' },
    { id: 'aa23', text: 'I am part of a movement.' },
    { id: 'aa24', text: 'My silence has taught me.' },
    { id: 'aa25', text: 'My speech can teach others.' },
    { id: 'aa26', text: 'I am the kind of person who notices.' },
    { id: 'aa27', text: 'My emotions guide my action.' },
    { id: 'aa28', text: 'I can hold accountability and compassion.' },
    { id: 'aa29', text: 'I am part of long lineage.' },
    { id: 'aa30', text: 'My care is political.' }
  ];

  var COMPREHENSIVE_NARRATIVE_PART8 = [
    {
      id: 'cnp8a',
      title: 'When I built the youth coalition',
      narrative: [
        'I was 16. I had been doing upstander work alone for two years.',
        '',
        'I was exhausted.',
        '',
        'I decided to build a coalition. I reached out to 5 other students I had noticed doing similar work.',
        '',
        'We met for coffee. We shared stories. We agreed to meet weekly.',
        '',
        'In one year we grew to 25 members. We did real work. We won real changes.',
        '',
        'In two years we were known as a force in our school. Administration consulted us.',
        '',
        'I learned: I was not alone. I had been alone by choice.',
        '',
        'I tell young upstanders: find your people. The work is sustainable in community.'
      ]
    },
    {
      id: 'cnp8b',
      title: 'When I changed schools and started over',
      narrative: [
        'I changed schools my junior year. The new school was hostile to my identity.',
        '',
        'I had two choices: hide or be visible.',
        '',
        'I chose visible. I came out within the first month. I joined the GSA. I started a campaign for inclusive policies.',
        '',
        'The first year was hard. I was isolated. I was harassed.',
        '',
        'But I found my people. By year two I had built community.',
        '',
        'By senior year I had transformed how the school treated LGBTQ students.',
        '',
        'I tell people: sometimes starting over means starting visible.'
      ]
    },
    {
      id: 'cnp8c',
      title: 'My commitment to mentorship',
      narrative: [
        'I am 30 now. I mentor 8 young upstanders.',
        '',
        'I do not impose my path. I listen. I share when asked. I honor their growth.',
        '',
        'They have taught me. They are sharper than I was. Bolder.',
        '',
        'When I am 40, I will mentor different people. When I am 50, different again.',
        '',
        'Movement requires generations.',
        '',
        'I tell people my age: mentor youth. They are the future and the present.'
      ]
    },
    {
      id: 'cnp8d',
      title: 'When my mistake was instructive',
      narrative: [
        'Last year I made a public mistake in advocacy work. I said something that hurt someone.',
        '',
        'They called me in. They were generous. They taught me.',
        '',
        'I apologized fully. I changed my behavior.',
        '',
        'Months later they reached out: "Thanks for taking the feedback."',
        '',
        'I tell people: mistakes are teachers. Take the feedback. Continue.'
      ]
    },
    {
      id: 'cnp8e',
      title: 'My ongoing work',
      narrative: [
        'I am 40 now. I have been doing upstander work for 25 years.',
        '',
        'It is daily. It is small. It is sustainable.',
        '',
        'I check in on people. I refuse cruelty. I speak up. I document. I rest.',
        '',
        'I am part of a movement I will not see complete.',
        '',
        'I tell people: this is a lifetime practice. Build it small. Sustain it.'
      ]
    }
  ];

  var DEEPER_BYSTANDER_SCENARIOS_PART3 = [
    {
      id: 'dbsp3_1',
      title: 'When the harm is generational',
      situation: 'A family pattern of harm has been going for generations.',
      complexity: [
        'Deep roots',
        'Many actors',
        'Hard to address all at once',
        'Outside support needed'
      ],
      approach: [
        'Start with current generation',
        'Find external support (therapist, community)',
        'Build alternative patterns',
        'Address what you can'
      ],
      whatToDo: [
        'Therapy',
        'Family meetings if safe',
        'Build chosen family',
        'Address with your own children if you have them'
      ]
    },
    {
      id: 'dbsp3_2',
      title: 'When the harm is communal',
      situation: 'Whole community participates in harmful pattern.',
      complexity: [
        'Cultural support for harm',
        'Many participants',
        'Hard to find allies',
        'Risk of isolation'
      ],
      approach: [
        'Find one ally',
        'Build slowly',
        'Connect with outside community',
        'Long-term work'
      ],
      whatToDo: [
        'Connect with outside community',
        'Coalition with other dissenters',
        'Build alternative culture',
        'Sustained presence'
      ]
    },
    {
      id: 'dbsp3_3',
      title: 'When the harm is institutional',
      situation: 'System produces harm by design or default.',
      complexity: [
        'No individual perpetrator',
        'Slow change',
        'Multiple stakeholders',
        'Long-term work'
      ],
      approach: [
        'Coalition building',
        'Policy advocacy',
        'Sustained presence',
        'Multi-level engagement'
      ],
      whatToDo: [
        'Track patterns',
        'Document',
        'Build coalition',
        'Push for policy change',
        'Long-term commitment'
      ]
    },
    {
      id: 'dbsp3_4',
      title: 'When the harm is historical',
      situation: 'Past harm continues to affect present.',
      complexity: [
        'Cannot undo history',
        'Effects compound',
        'Multiple generations affected',
        'Repair across time difficult'
      ],
      approach: [
        'Acknowledge fully',
        'Make concrete repair where possible',
        'Address ongoing effects',
        'Build differently going forward'
      ],
      whatToDo: [
        'Reparations conversations',
        'Educational programming',
        'Memorial work',
        'Concrete action'
      ]
    },
    {
      id: 'dbsp3_5',
      title: 'When the harm has spread',
      situation: 'Cyberbullying has gone viral.',
      complexity: [
        'Speed of spread',
        'Multiple platforms',
        'Anonymous actors',
        'Hard to contain'
      ],
      approach: [
        'Document fast',
        'Connect with target',
        'Multi-platform reporting',
        'External authority if needed'
      ],
      whatToDo: [
        'Screenshot before deletion',
        'Help target navigate',
        'Mental health support',
        'Police if criminal'
      ]
    }
  ];

  var EXTENDED_DAILY_PROMPTS_PART7 = [
    { id: 'edpp7_1', day: 351, prompt: 'Final stretch reflection. Note big arc.' },
    { id: 'edpp7_2', day: 352, prompt: 'Plan year ahead. Note commitments.' },
    { id: 'edpp7_3', day: 353, prompt: 'Connect with mentor. Note conversation.' },
    { id: 'edpp7_4', day: 354, prompt: 'Acknowledge growth. Specifically.' },
    { id: 'edpp7_5', day: 355, prompt: 'Refuse one habit. Try new.' },
    { id: 'edpp7_6', day: 356, prompt: 'Show up specifically. Note moment.' },
    { id: 'edpp7_7', day: 357, prompt: 'Take care of self. Note how.' },
    { id: 'edpp7_8', day: 358, prompt: 'Reach across difference. Note conversation.' },
    { id: 'edpp7_9', day: 359, prompt: 'Honor a struggle. Note resilience.' },
    { id: 'edpp7_10', day: 360, prompt: 'Plan one celebration. Schedule.' },
    { id: 'edpp7_11', day: 361, prompt: 'Acknowledge growth. Three concrete.' },
    { id: 'edpp7_12', day: 362, prompt: 'Document year. Note key moments.' },
    { id: 'edpp7_13', day: 363, prompt: 'Thank one person. Note specifically.' },
    { id: 'edpp7_14', day: 364, prompt: 'Plan next year. Note focus.' },
    { id: 'edpp7_15', day: 365, prompt: 'Year reflection. Note long arc.' }
  ];

  var EXTENDED_DAILY_PROMPTS_PART6 = [
    { id: 'edpp6_1', day: 301, prompt: 'Notice growth specifically.' },
    { id: 'edpp6_2', day: 302, prompt: 'Honor setback. Note resilience.' },
    { id: 'edpp6_3', day: 303, prompt: 'Help peer practically. Note specifically.' },
    { id: 'edpp6_4', day: 304, prompt: 'Build new practice. Day 1.' },
    { id: 'edpp6_5', day: 305, prompt: 'Send gratitude note. Note recipient.' },
    { id: 'edpp6_6', day: 306, prompt: 'Refuse cruelty. Note courage.' },
    { id: 'edpp6_7', day: 307, prompt: 'Help peer. Note specifically.' },
    { id: 'edpp6_8', day: 308, prompt: 'Set boundary. Note response.' },
    { id: 'edpp6_9', day: 309, prompt: 'Build commitment. Note start.' },
    { id: 'edpp6_10', day: 310, prompt: 'Take self-care day. Note results.' },
    { id: 'edpp6_11', day: 311, prompt: 'Reach mentor. Note response.' },
    { id: 'edpp6_12', day: 312, prompt: 'Connect across difference. Note conversation.' },
    { id: 'edpp6_13', day: 313, prompt: 'Document privilege moment. Note specifically.' },
    { id: 'edpp6_14', day: 314, prompt: 'Refuse expectation. Note truth.' },
    { id: 'edpp6_15', day: 315, prompt: 'Acknowledge feeling. Sit with.' },
    { id: 'edpp6_16', day: 316, prompt: 'Read new piece. Note insight.' },
    { id: 'edpp6_17', day: 317, prompt: 'Show up for event. Note learning.' },
    { id: 'edpp6_18', day: 318, prompt: 'Mentor peer. Note their growth.' },
    { id: 'edpp6_19', day: 319, prompt: 'Take bold step. Note shift.' },
    { id: 'edpp6_20', day: 320, prompt: 'Acknowledge privilege. Use it.' },
    { id: 'edpp6_21', day: 321, prompt: 'Notice body cue. Honor it.' },
    { id: 'edpp6_22', day: 322, prompt: 'Plan rest. Take it.' },
    { id: 'edpp6_23', day: 323, prompt: 'Address pattern. Note response.' },
    { id: 'edpp6_24', day: 324, prompt: 'Build new ally. Note start.' },
    { id: 'edpp6_25', day: 325, prompt: 'Acknowledge struggle. Note strategy.' },
    { id: 'edpp6_26', day: 326, prompt: 'Refuse fear. Note move.' },
    { id: 'edpp6_27', day: 327, prompt: 'Share growth. Note response.' },
    { id: 'edpp6_28', day: 328, prompt: 'Plan next quarter. Note three commitments.' },
    { id: 'edpp6_29', day: 329, prompt: 'Reach estranged friend. Note response.' },
    { id: 'edpp6_30', day: 330, prompt: 'Document shift. Note it.' },
    { id: 'edpp6_31', day: 331, prompt: 'Acknowledge mistake. Note repair.' },
    { id: 'edpp6_32', day: 332, prompt: 'Connect with resource. Note insight.' },
    { id: 'edpp6_33', day: 333, prompt: 'Take media break. Note recovery.' },
    { id: 'edpp6_34', day: 334, prompt: 'Read new piece. Note insight.' },
    { id: 'edpp6_35', day: 335, prompt: 'Listen to podcast. Note insight.' },
    { id: 'edpp6_36', day: 336, prompt: 'Attend event. Note learning.' },
    { id: 'edpp6_37', day: 337, prompt: 'Connect across difference. Note conversation.' },
    { id: 'edpp6_38', day: 338, prompt: 'Refuse false urgency. Note choice.' },
    { id: 'edpp6_39', day: 339, prompt: 'Acknowledge growing edge. Plan step.' },
    { id: 'edpp6_40', day: 340, prompt: 'Take care of yourself. Note specifically.' },
    { id: 'edpp6_41', day: 341, prompt: 'Build bridge. Note conversation.' },
    { id: 'edpp6_42', day: 342, prompt: 'Acknowledge internalized oppression. Examine.' },
    { id: 'edpp6_43', day: 343, prompt: 'Refuse internalized story. Note replacement.' },
    { id: 'edpp6_44', day: 344, prompt: 'Plan action in next quarter. Schedule.' },
    { id: 'edpp6_45', day: 345, prompt: 'Connect with mentor. Note wisdom.' },
    { id: 'edpp6_46', day: 346, prompt: 'Acknowledge win. Celebrate.' },
    { id: 'edpp6_47', day: 347, prompt: 'Document struggle. Note strategy.' },
    { id: 'edpp6_48', day: 348, prompt: 'Show up for one person. Note specifically.' },
    { id: 'edpp6_49', day: 349, prompt: 'Notice growth. Document concretely.' },
    { id: 'edpp6_50', day: 350, prompt: '350-day reflection. Big lessons.' }
  ];

  var EXTENDED_DAILY_PROMPTS_PART5 = [
    { id: 'edpp5_1', day: 251, prompt: 'Notice one moment of joy. Note what created it.' },
    { id: 'edpp5_2', day: 252, prompt: 'Refuse one negativity spiral. Note redirect.' },
    { id: 'edpp5_3', day: 253, prompt: 'Help one peer practically. Note response.' },
    { id: 'edpp5_4', day: 254, prompt: 'Acknowledge one mistake. Note repair.' },
    { id: 'edpp5_5', day: 255, prompt: 'Stand by one targeted person. Note moment.' },
    { id: 'edpp5_6', day: 256, prompt: 'Refuse one gossip. Note courage.' },
    { id: 'edpp5_7', day: 257, prompt: 'Make one new connection. Note specifically.' },
    { id: 'edpp5_8', day: 258, prompt: 'Set one boundary. Note response.' },
    { id: 'edpp5_9', day: 259, prompt: 'Take one risk for justice. Note feelings.' },
    { id: 'edpp5_10', day: 260, prompt: 'Rest. Note how it felt.' },
    { id: 'edpp5_11', day: 261, prompt: 'Honor one identity. Note moment.' },
    { id: 'edpp5_12', day: 262, prompt: 'Connect with community organization. Note learning.' },
    { id: 'edpp5_13', day: 263, prompt: 'Refuse one urgency. Note response.' },
    { id: 'edpp5_14', day: 264, prompt: 'Send anonymous kindness. Note recipient.' },
    { id: 'edpp5_15', day: 265, prompt: 'Address harmful pattern. Note response.' },
    { id: 'edpp5_16', day: 266, prompt: 'Acknowledge suppressed feeling. Note what.' },
    { id: 'edpp5_17', day: 267, prompt: 'Refuse silence. Note choice.' },
    { id: 'edpp5_18', day: 268, prompt: 'Reach out to mentor. Note response.' },
    { id: 'edpp5_19', day: 269, prompt: 'Document privilege moment. Note specifically.' },
    { id: 'edpp5_20', day: 270, prompt: 'Plan next quarter. Note three commitments.' },
    { id: 'edpp5_21', day: 271, prompt: 'Acknowledge struggle. Note strategy.' },
    { id: 'edpp5_22', day: 272, prompt: 'Help one peer advocate. Note specifically.' },
    { id: 'edpp5_23', day: 273, prompt: 'Refuse familiar comfort. Note effort.' },
    { id: 'edpp5_24', day: 274, prompt: 'Take care of yourself. Note specifically.' },
    { id: 'edpp5_25', day: 275, prompt: 'Notice intuition. Note whether trusted.' },
    { id: 'edpp5_26', day: 276, prompt: 'Build new habit. Note Day 1.' },
    { id: 'edpp5_27', day: 277, prompt: 'Connect across difference. Note conversation.' },
    { id: 'edpp5_28', day: 278, prompt: 'Refuse fear. Note move.' },
    { id: 'edpp5_29', day: 279, prompt: 'Share growth. Note response.' },
    { id: 'edpp5_30', day: 280, prompt: 'Reflect on year so far. Note big growth.' },
    { id: 'edpp5_31', day: 281, prompt: 'Notice strength. Use it.' },
    { id: 'edpp5_32', day: 282, prompt: 'Honor a quiet act. Note specifically.' },
    { id: 'edpp5_33', day: 283, prompt: 'Build one community connection. Note start.' },
    { id: 'edpp5_34', day: 284, prompt: 'Send a check-in to a friend. Note response.' },
    { id: 'edpp5_35', day: 285, prompt: 'Take care of body. Note what helped.' },
    { id: 'edpp5_36', day: 286, prompt: 'Acknowledge a shift. Note specifically.' },
    { id: 'edpp5_37', day: 287, prompt: 'Refuse one bad practice. Note replacement.' },
    { id: 'edpp5_38', day: 288, prompt: 'Plan one celebration. Schedule it.' },
    { id: 'edpp5_39', day: 289, prompt: 'Reach out to mentee. Note conversation.' },
    { id: 'edpp5_40', day: 290, prompt: 'Document one shift. Note it.' },
    { id: 'edpp5_41', day: 291, prompt: 'Honor a cost. Note resilience.' },
    { id: 'edpp5_42', day: 292, prompt: 'Acknowledge reward. Note growth.' },
    { id: 'edpp5_43', day: 293, prompt: 'Celebrate something. Schedule.' },
    { id: 'edpp5_44', day: 294, prompt: 'Refuse one habit. Try new.' },
    { id: 'edpp5_45', day: 295, prompt: 'Reach out to old friend. Note response.' },
    { id: 'edpp5_46', day: 296, prompt: 'Document one shift. Note change.' },
    { id: 'edpp5_47', day: 297, prompt: 'Take one risk. Note outcome.' },
    { id: 'edpp5_48', day: 298, prompt: 'Acknowledge privilege moment. Note specifically.' },
    { id: 'edpp5_49', day: 299, prompt: 'Honor hard truth. Note specifically.' },
    { id: 'edpp5_50', day: 300, prompt: '300-day reflection. Big lesson.' }
  ];

  var EXTENDED_DAILY_PROMPTS_PART4 = [
    { id: 'edpp4_1', day: 201, prompt: 'Notice growth. Three concrete examples.' },
    { id: 'edpp4_2', day: 202, prompt: 'Honor a setback. Note resilience.' },
    { id: 'edpp4_3', day: 203, prompt: 'Connect with a peer struggling. Note specifically.' },
    { id: 'edpp4_4', day: 204, prompt: 'Build one new practice. Note Day 1.' },
    { id: 'edpp4_5', day: 205, prompt: 'Send a gratitude note. Note recipient.' },
    { id: 'edpp4_6', day: 206, prompt: 'Refuse one cruelty. Note your courage.' },
    { id: 'edpp4_7', day: 207, prompt: 'Help one peer practically. Note specifically.' },
    { id: 'edpp4_8', day: 208, prompt: 'Set one new boundary. Note response.' },
    { id: 'edpp4_9', day: 209, prompt: 'Build one new commitment. Note start.' },
    { id: 'edpp4_10', day: 210, prompt: 'Take a self-care day. Note results.' },
    { id: 'edpp4_11', day: 211, prompt: 'Reach out to former mentor. Note their response.' },
    { id: 'edpp4_12', day: 212, prompt: 'Connect across difference. Note conversation.' },
    { id: 'edpp4_13', day: 213, prompt: 'Document one privilege moment. Note specifically.' },
    { id: 'edpp4_14', day: 214, prompt: 'Refuse one expectation. Note your truth.' },
    { id: 'edpp4_15', day: 215, prompt: 'Acknowledge a feeling. Sit with it.' },
    { id: 'edpp4_16', day: 216, prompt: 'Read one new piece. Note insight.' },
    { id: 'edpp4_17', day: 217, prompt: 'Show up for one event. Note what you learned.' },
    { id: 'edpp4_18', day: 218, prompt: 'Mentor one peer. Note their growth.' },
    { id: 'edpp4_19', day: 219, prompt: 'Take one bold step. Note shift.' },
    { id: 'edpp4_20', day: 220, prompt: 'Acknowledge one privilege. Use it.' },
    { id: 'edpp4_21', day: 221, prompt: 'Notice a body cue. Honor it.' },
    { id: 'edpp4_22', day: 222, prompt: 'Plan one rest. Take it.' },
    { id: 'edpp4_23', day: 223, prompt: 'Address one pattern. Note response.' },
    { id: 'edpp4_24', day: 224, prompt: 'Build one new ally. Note start.' },
    { id: 'edpp4_25', day: 225, prompt: 'Acknowledge one struggle. Note strategy.' },
    { id: 'edpp4_26', day: 226, prompt: 'Refuse one fear. Note your move.' },
    { id: 'edpp4_27', day: 227, prompt: 'Share one growth. Note response.' },
    { id: 'edpp4_28', day: 228, prompt: 'Plan next quarter. Note three commitments.' },
    { id: 'edpp4_29', day: 229, prompt: 'Reach out to one estranged. Note response.' },
    { id: 'edpp4_30', day: 230, prompt: 'Document one shift in practice. Note it.' },
    { id: 'edpp4_31', day: 231, prompt: 'Acknowledge one mistake. Note repair.' },
    { id: 'edpp4_32', day: 232, prompt: 'Connect with community resource. Note insight.' },
    { id: 'edpp4_33', day: 233, prompt: 'Take a media break. Note recovery.' },
    { id: 'edpp4_34', day: 234, prompt: 'Read one new piece. Note insight.' },
    { id: 'edpp4_35', day: 235, prompt: 'Listen to one podcast. Note insight.' },
    { id: 'edpp4_36', day: 236, prompt: 'Attend one event. Note learning.' },
    { id: 'edpp4_37', day: 237, prompt: 'Connect across difference. Note conversation.' },
    { id: 'edpp4_38', day: 238, prompt: 'Refuse one false urgency. Note choice.' },
    { id: 'edpp4_39', day: 239, prompt: 'Acknowledge a growing edge. Plan one step.' },
    { id: 'edpp4_40', day: 240, prompt: 'Take care of yourself. Note specifically.' },
    { id: 'edpp4_41', day: 241, prompt: 'Build one bridge. Note conversation.' },
    { id: 'edpp4_42', day: 242, prompt: 'Acknowledge internalized oppression. Examine.' },
    { id: 'edpp4_43', day: 243, prompt: 'Refuse one internalized story. Note replacement.' },
    { id: 'edpp4_44', day: 244, prompt: 'Plan one action in next quarter. Schedule.' },
    { id: 'edpp4_45', day: 245, prompt: 'Connect with mentor. Note wisdom.' },
    { id: 'edpp4_46', day: 246, prompt: 'Acknowledge one win. Celebrate.' },
    { id: 'edpp4_47', day: 247, prompt: 'Document one ongoing struggle. Note strategy.' },
    { id: 'edpp4_48', day: 248, prompt: 'Show up for one person. Note specifically.' },
    { id: 'edpp4_49', day: 249, prompt: 'Notice growth. Document concretely.' },
    { id: 'edpp4_50', day: 250, prompt: '250-day reflection. Note big lessons.' }
  ];

  var EXTENDED_DAILY_PROMPTS_PART3 = [
    { id: 'edpp3_1', day: 151, prompt: 'Acknowledge growth specifically. Three concrete examples.' },
    { id: 'edpp3_2', day: 152, prompt: 'Honor a setback. Note learning.' },
    { id: 'edpp3_3', day: 153, prompt: 'Reach out to former target you may have harmed. Note results.' },
    { id: 'edpp3_4', day: 154, prompt: 'Build one sustainable practice this month.' },
    { id: 'edpp3_5', day: 155, prompt: 'Connect with mentor. Share half-year reflection.' },
    { id: 'edpp3_6', day: 156, prompt: 'Refuse one expectation that is not yours. Note your choice.' },
    { id: 'edpp3_7', day: 157, prompt: 'Take one bold step. Note what shifted.' },
    { id: 'edpp3_8', day: 158, prompt: 'Connect with one mentee. Note conversation.' },
    { id: 'edpp3_9', day: 159, prompt: 'Notice one body cue you have been ignoring. Honor it.' },
    { id: 'edpp3_10', day: 160, prompt: 'Plan one rest day. Take it.' },
    { id: 'edpp3_11', day: 161, prompt: 'Address one pattern in your relationships. Note response.' },
    { id: 'edpp3_12', day: 162, prompt: 'Build one new ally relationship. Note start.' },
    { id: 'edpp3_13', day: 163, prompt: 'Acknowledge a difficult feeling. Sit with it. Note what shifts.' },
    { id: 'edpp3_14', day: 164, prompt: 'Refuse one outside opinion that does not serve. Note your truth.' },
    { id: 'edpp3_15', day: 165, prompt: 'Send one message of gratitude. Note response.' },
    { id: 'edpp3_16', day: 166, prompt: 'Read one challenging text. Note new insight.' },
    { id: 'edpp3_17', day: 167, prompt: 'Take an action you have been postponing. Note feelings.' },
    { id: 'edpp3_18', day: 168, prompt: 'Connect with one elder advocate. Note their wisdom.' },
    { id: 'edpp3_19', day: 169, prompt: 'Mentor one new advocate. Note their growth.' },
    { id: 'edpp3_20', day: 170, prompt: 'Acknowledge one cost you have paid. Note resilience.' },
    { id: 'edpp3_21', day: 171, prompt: 'Acknowledge one reward you have received. Note growth.' },
    { id: 'edpp3_22', day: 172, prompt: 'Plan a celebration. Schedule it.' },
    { id: 'edpp3_23', day: 173, prompt: 'Refuse one habitual response. Try something new.' },
    { id: 'edpp3_24', day: 174, prompt: 'Reach out to one estranged friend. Note their response.' },
    { id: 'edpp3_25', day: 175, prompt: 'Document one pattern. Note what is changing.' },
    { id: 'edpp3_26', day: 176, prompt: 'Take one risk you have been considering. Note outcome.' },
    { id: 'edpp3_27', day: 177, prompt: 'Acknowledge one privilege moment. Note specifically.' },
    { id: 'edpp3_28', day: 178, prompt: 'Honor a hard truth. Note specifically.' },
    { id: 'edpp3_29', day: 179, prompt: 'Build one new commitment. Note Day 1.' },
    { id: 'edpp3_30', day: 180, prompt: 'Reach out to one person you mentor or were mentored by.' },
    { id: 'edpp3_31', day: 181, prompt: 'Document one shift in your practice. Note it.' },
    { id: 'edpp3_32', day: 182, prompt: 'Acknowledge one mistake. Note repair plan.' },
    { id: 'edpp3_33', day: 183, prompt: 'Connect with one community resource. Note what you learned.' },
    { id: 'edpp3_34', day: 184, prompt: 'Take a media break. Note recovery.' },
    { id: 'edpp3_35', day: 185, prompt: 'Read one new piece by marginalized author. Note insight.' },
    { id: 'edpp3_36', day: 186, prompt: 'Listen to one new identity-affirming podcast. Note insight.' },
    { id: 'edpp3_37', day: 187, prompt: 'Show up for one community event. Note what you learned.' },
    { id: 'edpp3_38', day: 188, prompt: 'Connect with one across-difference ally. Note conversation.' },
    { id: 'edpp3_39', day: 189, prompt: 'Refuse one false urgency. Note your choice.' },
    { id: 'edpp3_40', day: 190, prompt: 'Acknowledge a growing edge. Plan one step.' },
    { id: 'edpp3_41', day: 191, prompt: 'Take care of yourself today. Note specifically.' },
    { id: 'edpp3_42', day: 192, prompt: 'Build one bridge. Note conversation.' },
    { id: 'edpp3_43', day: 193, prompt: 'Acknowledge one piece of internalized oppression. Examine.' },
    { id: 'edpp3_44', day: 194, prompt: 'Refuse one internalized story. Note replacement.' },
    { id: 'edpp3_45', day: 195, prompt: 'Plan one action in next quarter. Schedule it.' },
    { id: 'edpp3_46', day: 196, prompt: 'Connect with one mentor. Note their wisdom.' },
    { id: 'edpp3_47', day: 197, prompt: 'Acknowledge one win. Celebrate specifically.' },
    { id: 'edpp3_48', day: 198, prompt: 'Document one ongoing struggle. Note strategy.' },
    { id: 'edpp3_49', day: 199, prompt: 'Show up for one person. Note specifically.' },
    { id: 'edpp3_50', day: 200, prompt: '200-day reflection. Note big learning.' }
  ];

  var EXTENDED_DAILY_PROMPTS_PART2 = [
    { id: 'edpp1', day: 91, prompt: 'Reflect on quarter ahead. What is your focus?' },
    { id: 'edpp2', day: 92, prompt: 'Notice one privilege you have used today. Note specifically.' },
    { id: 'edpp3', day: 93, prompt: 'Use your privilege to amplify one marginalized voice.' },
    { id: 'edpp4', day: 94, prompt: 'Practice listening without solving. Note what happened.' },
    { id: 'edpp5', day: 95, prompt: 'Send one letter or email of advocacy.' },
    { id: 'edpp6', day: 96, prompt: 'Refuse one casual cruelty. Note your courage.' },
    { id: 'edpp7', day: 97, prompt: 'Connect with one new ally. Note their story.' },
    { id: 'edpp8', day: 98, prompt: 'Reflect on your own growth. Note three changes.' },
    { id: 'edpp9', day: 99, prompt: 'Plan one act for next month. Note specifics.' },
    { id: 'edpp10', day: 100, prompt: 'Celebrate 100 days. Acknowledge growth specifically.' },
    { id: 'edpp11', day: 101, prompt: 'Take a self-care day. Honor your work.' },
    { id: 'edpp12', day: 102, prompt: 'Reconnect with one old friend. Note their response.' },
    { id: 'edpp13', day: 103, prompt: 'Volunteer for one new role. Note opportunity.' },
    { id: 'edpp14', day: 104, prompt: 'Address one pattern at home or work. Note response.' },
    { id: 'edpp15', day: 105, prompt: 'Practice one new boundary. Note how it felt.' },
    { id: 'edpp16', day: 106, prompt: 'Read or watch one inspirational story. Note key insight.' },
    { id: 'edpp17', day: 107, prompt: 'Tell one young person their voice matters.' },
    { id: 'edpp18', day: 108, prompt: 'Mentor one peer. Note what you learned.' },
    { id: 'edpp19', day: 109, prompt: 'Find one new resource. Bookmark it.' },
    { id: 'edpp20', day: 110, prompt: 'Connect with one mentor. Schedule a follow-up.' },
    { id: 'edpp21', day: 111, prompt: 'Process a hard feeling without spiraling. Note the practice.' },
    { id: 'edpp22', day: 112, prompt: 'Write a thank-you to someone who helped you.' },
    { id: 'edpp23', day: 113, prompt: 'Notice one privilege you have not noticed before. Document.' },
    { id: 'edpp24', day: 114, prompt: 'Refuse one demand for your energy. Note your choice.' },
    { id: 'edpp25', day: 115, prompt: 'Read one piece by a marginalized author. Note key insight.' },
    { id: 'edpp26', day: 116, prompt: 'Attend one event in your community. Note what you learned.' },
    { id: 'edpp27', day: 117, prompt: 'Listen to one identity-affirming podcast. Note insight.' },
    { id: 'edpp28', day: 118, prompt: 'Reach out to one trusted person. Note their response.' },
    { id: 'edpp29', day: 119, prompt: 'Document one pattern over time. Note what is emerging.' },
    { id: 'edpp30', day: 120, prompt: '120-day reflection. Note specific growth.' },
    { id: 'edpp31', day: 121, prompt: 'Notice one moment of joy today. Note what created it.' },
    { id: 'edpp32', day: 122, prompt: 'Refuse one negativity spiral. Note redirection.' },
    { id: 'edpp33', day: 123, prompt: 'Help one peer practically. Note their response.' },
    { id: 'edpp34', day: 124, prompt: 'Acknowledge one mistake. Note repair.' },
    { id: 'edpp35', day: 125, prompt: 'Stand by someone targeted. Note the moment.' },
    { id: 'edpp36', day: 126, prompt: 'Refuse one gossip. Note your courage.' },
    { id: 'edpp37', day: 127, prompt: 'Make one new connection. Note specifically.' },
    { id: 'edpp38', day: 128, prompt: 'Set one new boundary. Note response.' },
    { id: 'edpp39', day: 129, prompt: 'Take one risk for justice. Note your feelings.' },
    { id: 'edpp40', day: 130, prompt: 'Rest. Note how it felt.' },
    { id: 'edpp41', day: 131, prompt: 'Honor one identity you have. Note the moment.' },
    { id: 'edpp42', day: 132, prompt: 'Connect with one community organization. Note what you learned.' },
    { id: 'edpp43', day: 133, prompt: 'Refuse one urgency that is not yours. Note response.' },
    { id: 'edpp44', day: 134, prompt: 'Send a kind anonymous note. Note who.' },
    { id: 'edpp45', day: 135, prompt: 'Address one harmful pattern at school. Note response.' },
    { id: 'edpp46', day: 136, prompt: 'Acknowledge a feeling you have been suppressing. Note what.' },
    { id: 'edpp47', day: 137, prompt: 'Refuse one demand for your silence. Note your choice.' },
    { id: 'edpp48', day: 138, prompt: 'Reach out to a former mentor. Note their response.' },
    { id: 'edpp49', day: 139, prompt: 'Document one privilege moment. Note specifically.' },
    { id: 'edpp50', day: 140, prompt: 'Plan next quarter. Note three commitments.' },
    { id: 'edpp51', day: 141, prompt: 'Acknowledge one struggle. Note your strategy.' },
    { id: 'edpp52', day: 142, prompt: 'Help one peer with their advocacy. Note specifically.' },
    { id: 'edpp53', day: 143, prompt: 'Refuse one familiar comfort that does not serve. Note effort.' },
    { id: 'edpp54', day: 144, prompt: 'Take care of yourself today. Note specifically.' },
    { id: 'edpp55', day: 145, prompt: 'Notice one moment of intuition. Note whether you trusted it.' },
    { id: 'edpp56', day: 146, prompt: 'Build one new habit. Note Day 1.' },
    { id: 'edpp57', day: 147, prompt: 'Connect across identity difference. Note conversation.' },
    { id: 'edpp58', day: 148, prompt: 'Refuse one fear. Note your move.' },
    { id: 'edpp59', day: 149, prompt: 'Share one growth with another. Note their response.' },
    { id: 'edpp60', day: 150, prompt: 'Half-year reflection. Note big growth.' }
  ];

  var COMPREHENSIVE_NARRATIVE_PART7 = [
    {
      id: 'cnp7a',
      title: 'When I sat in my discomfort',
      narrative: [
        'I was 20. I was at a community meeting about racial justice.',
        '',
        'A speaker named the harm white people had caused. Specifically. Not gently.',
        '',
        'I felt defensive. I wanted to argue. I wanted to leave.',
        '',
        'I stayed. I listened. I sat in the discomfort.',
        '',
        'Afterward, the speaker said: "Thank you for listening."',
        '',
        'I learned that day that listening through discomfort is the work.',
        '',
        'I tell white people: when you are uncomfortable, that is often the work happening. Stay.'
      ]
    },
    {
      id: 'cnp7b',
      title: 'My ongoing humility',
      narrative: [
        'I have been doing upstander work for 20 years.',
        '',
        'I still get it wrong. Sometimes badly.',
        '',
        'Last month I made a comment that hurt my friend. She told me.',
        '',
        'I apologized. I asked what I could do differently. I am still working on it.',
        '',
        'I am 38. I still learn.',
        '',
        'I tell people: humility is permanent. The day you think you have arrived is the day you become dangerous.'
      ]
    },
    {
      id: 'cnp7c',
      title: 'My slow change',
      narrative: [
        'I had grown up with conservative parents. I had been taught certain things.',
        '',
        'In college I started reading. Listening. Examining.',
        '',
        'I changed slowly. My views shifted over years. Some friendships did not survive.',
        '',
        'My parents and I have a different relationship now. We disagree on much. We love each other.',
        '',
        'I tell people: change takes time. Honor your own. Honor others\'.'
      ]
    },
    {
      id: 'cnp7d',
      title: 'When I let myself grieve',
      narrative: [
        'I had been doing the work without stopping. I had been burning out.',
        '',
        'I had not let myself feel.',
        '',
        'My therapist said: "Let yourself grieve. The harm is real. The cost is real."',
        '',
        'I cried for a week. I had not cried in years.',
        '',
        'After grieving, I had energy again. The grief was the gas tank.',
        '',
        'I tell people: do not skip feeling. The feelings fuel the work.'
      ]
    },
    {
      id: 'cnp7e',
      title: 'The youth I mentor',
      narrative: [
        'I am 35. I mentor 5 young upstanders.',
        '',
        'I share what I have learned. I do not impose. I listen.',
        '',
        'I have learned more from them than they may have learned from me.',
        '',
        'They are sharper than I was. Faster. Bolder.',
        '',
        'I tell people my age: mentor young people. They are the future. They are also the present.'
      ]
    }
  ];

  var FINAL_REFLECTIONS = [
    {
      id: 'fr1',
      reflection: 'What I have learned in this work',
      thoughts: [
        'Showing up matters more than being perfect',
        'Small acts build movement',
        'Sustaining beats intensity',
        'Self-care is part of the work',
        'Community is medicine',
        'Mistakes are inevitable',
        'Repair is possible',
        'Hope is a discipline'
      ]
    },
    {
      id: 'fr2',
      reflection: 'What I would tell my younger self',
      thoughts: [
        'Your voice matters more than you know',
        'You are not alone',
        'Start where you are',
        'Imperfect action is still action',
        'Sustained practice beats heroic moments',
        'Build community before crisis',
        'You will make mistakes - apologize and continue',
        'This is a practice, not a destination'
      ]
    },
    {
      id: 'fr3',
      reflection: 'What I want to model',
      thoughts: [
        'Courage with humility',
        'Action with strategy',
        'Truth with compassion',
        'Accountability with grace',
        'Persistence with rest',
        'Solidarity with care',
        'Anger with focus',
        'Love with justice'
      ]
    },
    {
      id: 'fr4',
      reflection: 'What sustains me',
      thoughts: [
        'My community',
        'My mentors',
        'My values',
        'Small wins',
        'Joy practices',
        'Body care',
        'Therapy',
        'Long view'
      ]
    },
    {
      id: 'fr5',
      reflection: 'What I am still learning',
      thoughts: [
        'When to speak and when to listen',
        'How to apologize well',
        'How to receive feedback',
        'How to rest',
        'How to build coalition',
        'How to honor diverse experiences',
        'How to sustain',
        'How to pass leadership'
      ]
    }
  ];

  var ANSWER_BANK = [
    {
      id: 'ab1',
      question: 'What if my intervention does not work?',
      answer: 'You did your part. Outcomes are not always within your control. Reflect on what worked, what did not. Try different approach next time. Keep going.'
    },
    {
      id: 'ab2',
      question: 'What if I have been silent for too long?',
      answer: 'Start today. You cannot change the past. You can change today. Apologize where appropriate. Move forward.'
    },
    {
      id: 'ab3',
      question: 'What if I am scared?',
      answer: 'Fear is data, not stop sign. Acknowledge it. Plan around it. Find allies. Start small. Build courage.'
    },
    {
      id: 'ab4',
      question: 'What if I lose friends?',
      answer: 'You might. Real cost. Sometimes worth it. Sometimes growth comes from loss. New friendships are possible.'
    },
    {
      id: 'ab5',
      question: 'What if adults will not help?',
      answer: 'Try multiple adults. Escalate. Find external supports. You may have to advocate for yourself even within the system.'
    },
    {
      id: 'ab6',
      question: 'What if nothing changes?',
      answer: 'Big change is slow. Small wins matter. You are part of long arc. Sustain.'
    },
    {
      id: 'ab7',
      question: 'What if I make mistakes?',
      answer: 'You will. Apologize. Learn. Continue. Mistakes are part of growth.'
    },
    {
      id: 'ab8',
      question: 'What if I burn out?',
      answer: 'Rest is part of the work. Build sustainable practices. Rotate with allies. Take breaks. Self-care is political.'
    },
    {
      id: 'ab9',
      question: 'What if my family is unsupportive?',
      answer: 'Hard. Find external community. Build chosen family. Stay safe. Honor your truth.'
    },
    {
      id: 'ab10',
      question: 'What if the system is the problem?',
      answer: 'It often is. Coalition for systemic change. Long-term work. Both individual and systemic action.'
    },
    {
      id: 'ab11',
      question: 'What if I am the only one speaking up?',
      answer: 'Sometimes you are. Others may join. Some never will. Your voice matters regardless.'
    },
    {
      id: 'ab12',
      question: 'What if I have hurt someone in upstander work?',
      answer: 'Acknowledge. Apologize. Repair. Continue. Imperfect advocacy is still advocacy.'
    },
    {
      id: 'ab13',
      question: 'What if I disagree with other upstanders?',
      answer: 'You can disagree and still ally. Have hard conversations. Find common ground. Build coalition with diverse views.'
    },
    {
      id: 'ab14',
      question: 'What if my identity is not centered?',
      answer: 'Both can be true. Your identity is real. Centering others is sometimes the work. Find spaces that affirm you. Build coalition for shared work.'
    },
    {
      id: 'ab15',
      question: 'What if I am exhausted?',
      answer: 'Rest. Reach out for support. Reduce commitments. Take care of yourself. The work will continue when you return.'
    }
  ];

  var COMMUNITY_RESOURCE_DIRECTORY = [
    { id: 'crd1', name: '988 Suicide & Crisis Lifeline', phone: '988', web: '988lifeline.org', focus: '24/7 crisis support' },
    { id: 'crd2', name: 'Crisis Text Line', phone: 'Text HOME to 741741', web: 'crisistextline.org', focus: 'Text crisis support' },
    { id: 'crd3', name: 'Trevor Project', phone: '1-866-488-7386', web: 'thetrevorproject.org', focus: 'LGBTQ youth crisis' },
    { id: 'crd4', name: 'Trans Lifeline', phone: '1-877-565-8860', web: 'translifeline.org', focus: 'Trans crisis, by trans people' },
    { id: 'crd5', name: 'RAINN', phone: '1-800-656-4673', web: 'rainn.org', focus: 'Sexual assault' },
    { id: 'crd6', name: 'Childhelp', phone: '1-800-422-4453', web: 'childhelp.org', focus: 'Child abuse' },
    { id: 'crd7', name: 'NAMI Helpline', phone: '1-800-950-6264', web: 'nami.org', focus: 'Mental health' },
    { id: 'crd8', name: 'NEDA', phone: '1-800-931-2237', web: 'nationaleatingdisorders.org', focus: 'Eating disorders' },
    { id: 'crd9', name: 'SAMHSA', phone: '1-800-662-4357', web: 'samhsa.gov', focus: 'Substance use and mental health' },
    { id: 'crd10', name: 'GLSEN', web: 'glsen.org', focus: 'LGBTQ student support' },
    { id: 'crd11', name: 'GLAAD', web: 'glaad.org', focus: 'LGBTQ advocacy' },
    { id: 'crd12', name: 'PFLAG', web: 'pflag.org', focus: 'LGBTQ family support' },
    { id: 'crd13', name: 'ADL', web: 'adl.org', focus: 'Anti-Semitism, anti-defamation' },
    { id: 'crd14', name: 'CAIR', web: 'cair.com', focus: 'Muslim advocacy' },
    { id: 'crd15', name: 'NAACP', web: 'naacp.org', focus: 'Black civil rights' },
    { id: 'crd16', name: 'UnidosUS', web: 'unidosus.org', focus: 'Latine advocacy' },
    { id: 'crd17', name: 'ASAN', web: 'autisticadvocacy.org', focus: 'Autistic-led advocacy' },
    { id: 'crd18', name: 'DREDF', web: 'dredf.org', focus: 'Disability civil rights' },
    { id: 'crd19', name: 'AAPD', web: 'aapd.com', focus: 'Cross-disability advocacy' },
    { id: 'crd20', name: 'Disability Rights Maine', phone: '1-800-452-1948', web: 'drme.org', focus: 'Maine P&A' },
    { id: 'crd21', name: 'Maine Parent Federation', phone: '1-800-870-7746', web: 'mpf.org', focus: 'Maine parent training' },
    { id: 'crd22', name: 'NAMI Maine', web: 'namimaine.org', focus: 'Maine mental health' },
    { id: 'crd23', name: 'Maine Crisis Line', phone: '1-888-568-1112', focus: 'Maine 24/7 crisis' },
    { id: 'crd24', name: 'Maine DOE', web: 'maine.gov/doe', focus: 'Maine state education agency' },
    { id: 'crd25', name: 'ACLU of Maine', web: 'aclumaine.org', focus: 'Maine civil liberties' },
    { id: 'crd26', name: 'EqualityMaine', web: 'equalitymaine.org', focus: 'Maine LGBTQ advocacy' },
    { id: 'crd27', name: 'Maine Attorney General', web: 'maine.gov/ag', focus: 'State legal services' },
    { id: 'crd28', name: 'OCR (Federal)', web: 'ed.gov/ocr', focus: 'Federal civil rights enforcement' },
    { id: 'crd29', name: 'EEOC', phone: '1-800-669-4000', web: 'eeoc.gov', focus: 'Employment discrimination' },
    { id: 'crd30', name: 'JAN', web: 'askjan.org', focus: 'Job accommodation network' }
  ];

  var INTEGRATING_INTO_DAILY_LIFE = [
    {
      id: 'iidl1',
      moment: 'Morning routine',
      practices: [
        'Intention setting',
        'Affirmation',
        'Schedule review',
        'Coffee or tea ritual'
      ],
      time: '15 min'
    },
    {
      id: 'iidl2',
      moment: 'Commute or travel',
      practices: [
        'Listen to identity-affirming podcast',
        'Read identity-affirming text',
        'Prepare for the day',
        'Plan one upstander move'
      ],
      time: 'Whatever commute is'
    },
    {
      id: 'iidl3',
      moment: 'School or work entry',
      practices: [
        'Greet someone specifically',
        'Notice mood of space',
        'Plan one connection'
      ],
      time: '5 min'
    },
    {
      id: 'iidl4',
      moment: 'Lunch or break',
      practices: [
        'Sit with someone',
        'Check in with peer',
        'Connect across difference',
        'Rest if needed'
      ],
      time: '30 min'
    },
    {
      id: 'iidl5',
      moment: 'Afternoon transition',
      practices: [
        'Reset',
        'Move body',
        'Hydrate',
        'Re-energize'
      ],
      time: '10 min'
    },
    {
      id: 'iidl6',
      moment: 'End of day',
      practices: [
        'Document one thing observed',
        'Check in with self',
        'Plan tomorrow',
        'Decompress'
      ],
      time: '15 min'
    },
    {
      id: 'iidl7',
      moment: 'Evening',
      practices: [
        'Connection with loved ones',
        'Joy practice',
        'Self-care',
        'Wind down'
      ],
      time: '60 min'
    },
    {
      id: 'iidl8',
      moment: 'Before bed',
      practices: [
        'Gratitude practice',
        'Reflect briefly',
        'Set intention for tomorrow',
        'Sleep'
      ],
      time: '10 min'
    },
    {
      id: 'iidl9',
      moment: 'Weekend',
      practices: [
        'Rest',
        'Community connection',
        'Special interest',
        'Body care',
        'Plan week ahead'
      ],
      time: 'Variable'
    },
    {
      id: 'iidl10',
      moment: 'Monthly',
      practices: [
        'Bigger reflection',
        'Plan next month',
        'Coalition meeting',
        'Mentor connection'
      ],
      time: '3-4 hours'
    }
  ];

  var SUSTAINED_CONNECTIONS = [
    {
      id: 'sc1',
      type: 'Mentor relationship',
      duration: 'Years',
      maintenance: ['Monthly contact', 'Share updates', 'Apply wisdom', 'Show gratitude'],
      benefits: ['Accelerated learning', 'Sustained motivation', 'Long-term relationship']
    },
    {
      id: 'sc2',
      type: 'Coalition relationship',
      duration: 'Years',
      maintenance: ['Regular meetings', 'Shared work', 'Mutual support', 'Document together'],
      benefits: ['Power', 'Community', 'Sustained advocacy']
    },
    {
      id: 'sc3',
      type: 'Friendship that survived',
      duration: 'Decade plus',
      maintenance: ['Vulnerability', 'Honesty', 'Repair when needed', 'Show up consistently'],
      benefits: ['Deep care', 'Witness through life', 'Mutual aid']
    },
    {
      id: 'sc4',
      type: 'Therapeutic relationship',
      duration: 'Years',
      maintenance: ['Regular sessions', 'Honest sharing', 'Apply insights', 'Set goals'],
      benefits: ['Mental health', 'Self-knowledge', 'Sustained growth']
    },
    {
      id: 'sc5',
      type: 'Family of choice',
      duration: 'Lifetime',
      maintenance: ['Consistent presence', 'Show up in crisis', 'Celebrate together', 'Honor each other'],
      benefits: ['Belonging', 'Care', 'Witness']
    },
    {
      id: 'sc6',
      type: 'Mentee relationship',
      duration: 'Years',
      maintenance: ['Listen', 'Share wisdom', 'Honor their growth', 'Watch them surpass you'],
      benefits: ['Movement building', 'Generational thinking', 'Mutual learning']
    },
    {
      id: 'sc7',
      type: 'Community organization',
      duration: 'Years',
      maintenance: ['Sustained membership', 'Volunteer', 'Contribute', 'Pass leadership'],
      benefits: ['Multiply impact', 'Community', 'Long-term work']
    },
    {
      id: 'sc8',
      type: 'Online community',
      duration: 'Years',
      maintenance: ['Regular engagement', 'Honest sharing', 'Mutual support', 'Real relationships'],
      benefits: ['Distance no obstacle', 'Specialized community', 'Global perspective']
    }
  ];

  var EMOTIONAL_REGULATION_LIBRARY = [
    {
      id: 'erl1',
      emotion: 'Fear before intervention',
      practices: [
        'Box breathing (4-4-4-4)',
        'Affirm your safety internally',
        'Remind self of values',
        'Visualize success',
        'One step at a time'
      ]
    },
    {
      id: 'erl2',
      emotion: 'Anger at witnessed harm',
      practices: [
        'Channel into action',
        'Take a beat before responding',
        'Use the anger\'s energy',
        'Do not let anger drive escalation'
      ]
    },
    {
      id: 'erl3',
      emotion: 'Grief after harm',
      practices: [
        'Allow tears',
        'Connect with safe person',
        'Honor the loss',
        'Take time'
      ]
    },
    {
      id: 'erl4',
      emotion: 'Shame after mistake',
      practices: [
        'Distinguish shame from guilt',
        'Guilt about action, shame about self',
        'Self-compassion',
        'Concrete repair'
      ]
    },
    {
      id: 'erl5',
      emotion: 'Burnout',
      practices: [
        'Rest',
        'Reduce commitments',
        'Connect with support',
        'Reset priorities',
        'Adjust pace'
      ]
    },
    {
      id: 'erl6',
      emotion: 'Despair at system',
      practices: [
        'Connect with community',
        'Take small concrete action',
        'Long-arc thinking',
        'Care for self'
      ]
    },
    {
      id: 'erl7',
      emotion: 'Loneliness in upstander work',
      practices: [
        'Reach out to one ally',
        'Build community deliberately',
        'Find online community',
        'Persist'
      ]
    },
    {
      id: 'erl8',
      emotion: 'Imposter feelings',
      practices: [
        'Acknowledge the feeling',
        'Remember your contributions',
        'Reach out to mentor',
        'Continue regardless'
      ]
    },
    {
      id: 'erl9',
      emotion: 'Conflict-avoidance',
      practices: [
        'Recognize the pattern',
        'Practice in low-stakes situations',
        'Build courage incrementally',
        'Honor your style'
      ]
    },
    {
      id: 'erl10',
      emotion: 'People-pleasing',
      practices: [
        'Recognize the pattern',
        'Practice "no"',
        'Honor your values',
        'Boundaries'
      ]
    }
  ];

  var COMPREHENSIVE_NARRATIVE_PART6 = [
    {
      id: 'cnp6a',
      title: 'The intervention that worked',
      narrative: [
        'I was in 9th grade. I saw a kid bullying my younger brother.',
        '',
        'I was scared. The bully was bigger than me.',
        '',
        'I walked over and said: "He is my brother. Do not."',
        '',
        'The bully stared at me. Then walked away.',
        '',
        'My brother was crying. I sat with him.',
        '',
        'After school I told my mom. She told the principal. The principal called the bully\'s parents.',
        '',
        'The bullying stopped.',
        '',
        'My brother and I are very close to this day. He says he never forgot that I stood up.',
        '',
        'I tell people: sometimes being an upstander is one sentence.'
      ]
    },
    {
      id: 'cnp6b',
      title: 'When my voice grew',
      narrative: [
        'I had been quiet my whole life. Anxious about speaking up.',
        '',
        'In 11th grade I was at a meeting. Someone made a homophobic joke. Everyone laughed.',
        '',
        'I spoke up. My voice shook. "That is not okay."',
        '',
        'Half the room got quiet. A few people defended the joker. A few people thanked me afterward.',
        '',
        'My voice grew that day.',
        '',
        'I am 28 now. I run my own non-profit. I speak in public regularly.',
        '',
        'I trace my voice back to that meeting in 11th grade.',
        '',
        'I tell young people: your first speak-up may shake. The next ones get steadier.'
      ]
    },
    {
      id: 'cnp6c',
      title: 'The student council change',
      narrative: [
        'My freshman year of high school the student council had been all white. The school was 30% BIPOC.',
        '',
        'I ran for student government on a platform of diverse representation.',
        '',
        'I did not win.',
        '',
        'But other BIPOC students saw me run. The next year three of us ran.',
        '',
        'Two of us won.',
        '',
        'By senior year the student government was diverse.',
        '',
        'I had not been the change. I had been the seed.',
        '',
        'I tell young people: you might lose the first race. Run anyway. You may inspire those who come next.'
      ]
    },
    {
      id: 'cnp6d',
      title: 'My therapist who was an upstander',
      narrative: [
        'I had been struggling with my mental health. My therapist Dr. Williams listened.',
        '',
        'When I shared bullying I was experiencing at school, she did not just hear me. She helped me build advocacy.',
        '',
        'She helped me draft an email to my counselor. She helped me prepare for IEP meetings.',
        '',
        'She helped me see that my mental health was responding to real harm.',
        '',
        'She was my upstander.',
        '',
        'I tell people: therapists can be advocates. The good ones see the system, not just the symptom.'
      ]
    }
  ];

  var FURTHER_SCENARIOS_DEEP = [
    {
      id: 'fsd1',
      situation: 'Friend group has been targeting one peer for weeks',
      yourPosition: 'Have been complicit by silence',
      pathForward: [
        'Reckon with your complicity',
        'Apologize directly to target',
        'Address friends individually first',
        'Then group',
        'Be willing to lose friends',
        'Build new community'
      ],
      timeline: 'Begin immediately. Months to resolve.'
    },
    {
      id: 'fsd2',
      situation: 'Teacher has been verbally abusive to a student',
      yourPosition: 'Have witnessed but not acted',
      pathForward: [
        'Document specific incidents',
        'Tell counselor',
        'Tell principal',
        'Engage family of targeted student',
        'External authority if pattern continues'
      ],
      timeline: 'Begin documenting immediately. Weeks to months to resolve.'
    },
    {
      id: 'fsd3',
      situation: 'Discipline patterns disproportionately affect Black students',
      yourPosition: 'You are white and have noticed',
      pathForward: [
        'Track data',
        'Build coalition with affected families',
        'Engage administration',
        'Push for policy change',
        'External advocacy if needed'
      ],
      timeline: 'Years.'
    },
    {
      id: 'fsd4',
      situation: 'Cyberbullying campaign against a peer',
      yourPosition: 'You see it happening',
      pathForward: [
        'Screenshot everything',
        'Reach out to target with care',
        'Help target report to platforms',
        'Tell school',
        'External authority if criminal'
      ],
      timeline: 'Days to weeks.'
    },
    {
      id: 'fsd5',
      situation: 'Friend disclosing sexual assault',
      yourPosition: 'Trusted confidant',
      pathForward: [
        'Believe them',
        'Listen without solving',
        'Honor their pace',
        'Connect with resources (RAINN)',
        'Support over time'
      ],
      timeline: 'Years of sustained support.'
    },
    {
      id: 'fsd6',
      situation: 'New student being isolated',
      yourPosition: 'You see them alone',
      pathForward: [
        'Sit with them',
        'Introduce to your friends',
        'Build relationship',
        'Address group dynamics if needed'
      ],
      timeline: 'Days to weeks.'
    },
    {
      id: 'fsd7',
      situation: 'Family member making harmful comments',
      yourPosition: 'Family member who values them but objects to harm',
      pathForward: [
        'Address in moment',
        'Have private follow-up',
        'Hold line even when uncomfortable',
        'Build relationships with affected family if any',
        'External support if family will not change'
      ],
      timeline: 'Years of ongoing work.'
    },
    {
      id: 'fsd8',
      situation: 'Coach using public humiliation as motivation',
      yourPosition: 'Team member',
      pathForward: [
        'Document incidents',
        'Speak with coach privately',
        'Athletic director if pattern',
        'External authority if severe',
        'Consider quitting if pattern entrenched'
      ],
      timeline: 'Weeks to season.'
    }
  ];

  var ADDITIONAL_LESSON_PLANS_DETAILED = [
    {
      id: 'alpd1',
      title: 'Lesson: The Witness Effect',
      duration: '45 min',
      gradeLevel: 'middle to high school',
      objectives: ['Understand bystander effect', 'Identify in own life', 'Build counter-strategy'],
      materials: ['Whiteboard', 'Index cards', 'Discussion guide'],
      sequence: [
        { phase: 'Hook', time: '5 min', activity: 'Show video of bystander effect experiment' },
        { phase: 'Discuss', time: '10 min', activity: 'What did you notice? What surprised you?' },
        { phase: 'Mini-lesson', time: '10 min', activity: 'Explain bystander effect, diffusion of responsibility' },
        { phase: 'Application', time: '15 min', activity: 'Pairs identify times bystander effect happens to them' },
        { phase: 'Closing', time: '5 min', activity: 'Commit to one strategy to overcome it' }
      ]
    },
    {
      id: 'alpd2',
      title: 'Lesson: Power and Privilege',
      duration: '60 min',
      gradeLevel: 'high school',
      objectives: ['Identify power dynamics', 'Examine personal privilege', 'Build identity-aware practice'],
      materials: ['Identity map worksheet', 'Discussion guide'],
      sequence: [
        { phase: 'Welcome', time: '5 min', activity: 'Group agreements about safety' },
        { phase: 'Map', time: '15 min', activity: 'Map your own identities and privileges' },
        { phase: 'Discuss', time: '20 min', activity: 'In pairs share what surprised you' },
        { phase: 'Application', time: '15 min', activity: 'How does privilege affect your upstander work?' },
        { phase: 'Closing', time: '5 min', activity: 'One commitment to using privilege well' }
      ]
    },
    {
      id: 'alpd3',
      title: 'Lesson: Restorative Justice',
      duration: '90 min',
      gradeLevel: 'high school',
      objectives: ['Understand restorative vs punitive', 'Practice restorative dialogue', 'Apply to real situation'],
      materials: ['Restorative dialogue templates', 'Scenarios'],
      sequence: [
        { phase: 'Welcome', time: '10 min', activity: 'What is the goal of accountability?' },
        { phase: 'Mini-lesson', time: '20 min', activity: 'Restorative principles vs punitive' },
        { phase: 'Demonstration', time: '15 min', activity: 'Facilitators model restorative dialogue' },
        { phase: 'Practice', time: '35 min', activity: 'Triads (harmed, harmer, facilitator)' },
        { phase: 'Closing', time: '10 min', activity: 'Reflect on what worked' }
      ]
    },
    {
      id: 'alpd4',
      title: 'Lesson: Coalition Building',
      duration: '60 min',
      gradeLevel: 'high school',
      objectives: ['Understand coalition basics', 'Plan one action', 'Commit to sustained work'],
      materials: ['Coalition planning template'],
      sequence: [
        { phase: 'Welcome', time: '10 min', activity: 'What change do you want?' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'Coalition principles' },
        { phase: 'Plan', time: '25 min', activity: 'Small groups plan one action' },
        { phase: 'Share', time: '10 min', activity: 'Groups present plans' }
      ]
    },
    {
      id: 'alpd5',
      title: 'Lesson: Self-Care for Activists',
      duration: '45 min',
      gradeLevel: 'high school and beyond',
      objectives: ['Identify burnout patterns', 'Build sustainable practices', 'Plan self-care'],
      materials: ['Self-care plan template'],
      sequence: [
        { phase: 'Welcome', time: '5 min', activity: 'How are you doing?' },
        { phase: 'Discuss', time: '15 min', activity: 'Burnout patterns we have noticed' },
        { phase: 'Plan', time: '20 min', activity: 'Build personal sustainability plan' },
        { phase: 'Closing', time: '5 min', activity: 'Share one commitment' }
      ]
    },
    {
      id: 'alpd6',
      title: 'Lesson: Documentation as Power',
      duration: '60 min',
      gradeLevel: 'high school',
      objectives: ['Understand value of documentation', 'Learn how to document', 'Practice'],
      materials: ['Documentation template', 'Practice scenarios'],
      sequence: [
        { phase: 'Welcome', time: '10 min', activity: 'When have records helped you?' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'What documentation looks like' },
        { phase: 'Practice', time: '25 min', activity: 'Document scenarios' },
        { phase: 'Discuss', time: '10 min', activity: 'How will you use this?' }
      ]
    },
    {
      id: 'alpd7',
      title: 'Lesson: Apology Skills',
      duration: '60 min',
      gradeLevel: 'middle to high school',
      objectives: ['Understand what real apology is', 'Practice apologizing', 'Build repair practice'],
      materials: ['Apology framework handout'],
      sequence: [
        { phase: 'Welcome', time: '10 min', activity: 'What makes a good apology?' },
        { phase: 'Mini-lesson', time: '15 min', activity: '5 parts of apology' },
        { phase: 'Practice', time: '30 min', activity: 'Pairs practice apologies' },
        { phase: 'Closing', time: '5 min', activity: 'Identify apology you owe' }
      ]
    },
    {
      id: 'alpd8',
      title: 'Lesson: When you have been wrong',
      duration: '60 min',
      gradeLevel: 'high school',
      objectives: ['Build accountability skills', 'Reduce defensiveness', 'Plan repair'],
      materials: ['Reflection journal'],
      sequence: [
        { phase: 'Welcome', time: '10 min', activity: 'Hard truth: we have all been wrong' },
        { phase: 'Reflect', time: '20 min', activity: 'Identify a time you were wrong' },
        { phase: 'Discuss', time: '20 min', activity: 'In pairs share if comfortable' },
        { phase: 'Plan', time: '10 min', activity: 'What repair is possible now?' }
      ]
    }
  ];

  var TIPS_FOR_DIFFERENT_CONTEXTS = [
    {
      id: 'tfdc1',
      context: 'In your friend group',
      tips: [
        'Address language patterns directly',
        'Hold a friend accountable privately first',
        'Be willing to lose the friendship if pattern continues',
        'Build new friend groups with values alignment'
      ]
    },
    {
      id: 'tfdc2',
      context: 'In your family',
      tips: [
        'Pick your moments carefully',
        'Use I-statements',
        'Hold the line even when uncomfortable',
        'Take breaks during heated moments',
        'Find external support if needed'
      ]
    },
    {
      id: 'tfdc3',
      context: 'At school',
      tips: [
        'Document everything',
        'Build relationships with trusted adults',
        'Know your rights under federal law',
        'Use student government and clubs',
        'Coalition with peers'
      ]
    },
    {
      id: 'tfdc4',
      context: 'At work',
      tips: [
        'Know your workplace policies',
        'Document specific incidents',
        'Use HR strategically',
        'EEOC for discrimination',
        'Build coworker coalitions'
      ]
    },
    {
      id: 'tfdc5',
      context: 'In community',
      tips: [
        'Build relationships before crisis',
        'Find aligned organizations',
        'Engage with local government',
        'Coalition with neighbors',
        'Sustained presence'
      ]
    },
    {
      id: 'tfdc6',
      context: 'Online',
      tips: [
        'Document with screenshots',
        'Block and report harassers',
        'Use platform safety tools',
        'Take breaks',
        'Curate your feeds'
      ]
    },
    {
      id: 'tfdc7',
      context: 'In faith community',
      tips: [
        'Find aligned community within tradition',
        'Reach out to progressive clergy',
        'Build interfaith connections',
        'Honor your own conscience',
        'Leave if you must'
      ]
    },
    {
      id: 'tfdc8',
      context: 'In sports or activity',
      tips: [
        'Address toxic team culture',
        'Tell coaches when comfortable',
        'Athletic director or activity coordinator',
        'External authority if needed',
        'Quit if pattern severe'
      ]
    }
  ];

  var GROUP_FACILITATION_TOOLBOX = [
    {
      id: 'gft1',
      tool: 'Opening circle',
      purpose: 'Establish group connection',
      howTo: ['Sit in circle', 'Each person shares one feeling word', 'Move clockwise', 'Pass option okay'],
      bestFor: 'Beginning of any meeting'
    },
    {
      id: 'gft2',
      tool: 'Closing circle',
      purpose: 'Closure and integration',
      howTo: ['Sit in circle', 'Each shares one takeaway', 'Move clockwise', 'Pass okay'],
      bestFor: 'End of any meeting'
    },
    {
      id: 'gft3',
      tool: 'Pair share',
      purpose: 'Build connection between members',
      howTo: ['Pair up', 'Each takes 3-5 minutes', 'No interruption', 'Switch when timer'],
      bestFor: 'Building trust, processing'
    },
    {
      id: 'gft4',
      tool: 'Small group breakout',
      purpose: 'Deeper engagement',
      howTo: ['Groups of 3-5', 'Clear prompt', 'Defined time', 'Share back to whole group'],
      bestFor: 'Discussion of complex topics'
    },
    {
      id: 'gft5',
      tool: 'Whip',
      purpose: 'Quick check-in around group',
      howTo: ['Quick word from each', 'No discussion', 'Move fast', 'Optional pass'],
      bestFor: 'Energy check, quick sharing'
    },
    {
      id: 'gft6',
      tool: 'Brainstorm',
      purpose: 'Generate ideas',
      howTo: ['No judgment of ideas', 'Build on each other', 'Quantity first', 'Cluster after'],
      bestFor: 'Solution generation'
    },
    {
      id: 'gft7',
      tool: 'Fishbowl',
      purpose: 'Demonstrate or model',
      howTo: ['Inner circle has conversation', 'Outer circle observes', 'Switch periodically'],
      bestFor: 'Modeling difficult conversation'
    },
    {
      id: 'gft8',
      tool: 'Gallery walk',
      purpose: 'Engage with multiple materials',
      howTo: ['Materials on walls', 'Walk around', 'Engage with each', 'Discuss'],
      bestFor: 'Exposure to many ideas'
    },
    {
      id: 'gft9',
      tool: 'Silent reflection',
      purpose: 'Internal processing',
      howTo: ['Provide prompt', 'Silent time (5-10 min)', 'Optional sharing after'],
      bestFor: 'Deep processing'
    },
    {
      id: 'gft10',
      tool: 'Restorative dialogue',
      purpose: 'Repair harm',
      howTo: ['Trained facilitator', 'Structured questions', 'Equal time', 'Written agreement'],
      bestFor: 'After harm has occurred'
    }
  ];

  var REFLECTION_PROMPTS_DEEP = [
    { id: 'rpd_x1', prompt: 'What kind of upstander do you want to become in the next year?', category: 'goal' },
    { id: 'rpd_x2', prompt: 'What barriers keep you from acting? Be specific.', category: 'inner work' },
    { id: 'rpd_x3', prompt: 'Who in your life models good upstander work? What can you learn from them?', category: 'mentor' },
    { id: 'rpd_x4', prompt: 'What is one moment of harm you have witnessed that you wish you had addressed?', category: 'reflection' },
    { id: 'rpd_x5', prompt: 'What is one moment of upstander courage you are proud of?', category: 'celebration' },
    { id: 'rpd_x6', prompt: 'How does your identity shape your access to upstander work?', category: 'identity' },
    { id: 'rpd_x7', prompt: 'How does your privilege affect what you can risk?', category: 'identity' },
    { id: 'rpd_x8', prompt: 'Who are your top 3 allies in this work?', category: 'community' },
    { id: 'rpd_x9', prompt: 'Who do you want to bring into your circle of allies?', category: 'community' },
    { id: 'rpd_x10', prompt: 'What practice will you commit to this month?', category: 'commitment' },
    { id: 'rpd_x11', prompt: 'What conversation are you avoiding?', category: 'specific' },
    { id: 'rpd_x12', prompt: 'What boundary do you need to set?', category: 'specific' },
    { id: 'rpd_x13', prompt: 'What apology do you owe?', category: 'specific' },
    { id: 'rpd_x14', prompt: 'What truth do you need to tell?', category: 'specific' },
    { id: 'rpd_x15', prompt: 'Where in your life do you have power you have not used?', category: 'power' },
    { id: 'rpd_x16', prompt: 'How do you take care of yourself when this work is hard?', category: 'self-care' },
    { id: 'rpd_x17', prompt: 'What is your sustainability practice?', category: 'sustainability' },
    { id: 'rpd_x18', prompt: 'What activity recharges you?', category: 'self-care' },
    { id: 'rpd_x19', prompt: 'Who do you call when you need to vent?', category: 'support' },
    { id: 'rpd_x20', prompt: 'How will you celebrate your growth?', category: 'celebration' },
    { id: 'rpd_x21', prompt: 'What is your biggest growing edge?', category: 'growth' },
    { id: 'rpd_x22', prompt: 'What old belief about yourself limits your work?', category: 'inner work' },
    { id: 'rpd_x23', prompt: 'What new belief do you want to inhabit?', category: 'becoming' },
    { id: 'rpd_x24', prompt: 'What is one thing your future self wants you to do today?', category: 'forward' },
    { id: 'rpd_x25', prompt: 'What is one thing you would tell your past self?', category: 'mentor self' },
    { id: 'rpd_x26', prompt: 'What movement has shaped you?', category: 'lineage' },
    { id: 'rpd_x27', prompt: 'Whose shoulders do you stand on?', category: 'gratitude' },
    { id: 'rpd_x28', prompt: 'Whose shoulders will support those after you?', category: 'forward' },
    { id: 'rpd_x29', prompt: 'What is the long view of your work?', category: 'long view' },
    { id: 'rpd_x30', prompt: 'How are you part of a long arc?', category: 'long view' }
  ];

  var COMPREHENSIVE_NARRATIVES_PART5 = [
    {
      id: 'cnp5a',
      title: 'When my hesitation cost me',
      narrative: [
        'I was 13. I had been seeing my friend Lana bullying our classmate Nora.',
        '',
        'For two months I watched. I told myself I would say something when it got worse.',
        '',
        'It got worse.',
        '',
        'Nora tried to take her life.',
        '',
        'I felt sick. My silence had contributed.',
        '',
        'I visited Nora in the hospital. I apologized for my silence.',
        '',
        'She said: "Thank you for coming. I needed someone to know."',
        '',
        'I learned: waiting for "worse" makes me complicit in the worse.',
        '',
        'I tell young people: do not wait. Speak up at the first sign.'
      ]
    },
    {
      id: 'cnp5b',
      title: 'The cousin who taught me',
      narrative: [
        'My cousin Jose came out as gay at 15. Our family had been hostile.',
        '',
        'I had been quiet at family gatherings when older relatives said homophobic things.',
        '',
        'Jose pulled me aside one day. He said: "Your silence is loud. I need you to speak up."',
        '',
        'I started speaking up. Not always smoothly. Some relatives stopped speaking to me. Some changed over time.',
        '',
        'Jose and I are best friends today. He has a husband. They have a daughter.',
        '',
        'My grandfather attended their wedding. He had been the most hostile relative. Time and quiet conversations had changed him.',
        '',
        'I tell people: family change is possible. Slow. Worth it.'
      ]
    },
    {
      id: 'cnp5c',
      title: 'The day I left',
      narrative: [
        'I was 22. I had a friend group I had been in since high school. We had stayed friends through college.',
        '',
        'In our early twenties they became politically conservative in ways that meant harm to people I loved.',
        '',
        'I tried for a year to engage. They would not listen.',
        '',
        'I left.',
        '',
        'I grieved that friend group for years.',
        '',
        'I built new community.',
        '',
        'I am 32 now. My current friend group is values-aligned. The grief of the old group has faded.',
        '',
        'I tell people: friendships can end. The grief is real. The growth is real. Both can be true.'
      ]
    },
    {
      id: 'cnp5d',
      title: 'My ongoing journey',
      narrative: [
        'I have been doing upstander work for 18 years.',
        '',
        'I have been a target. I have been a bystander. I have been a harmer.',
        '',
        'I have apologized many times. I have been apologized to.',
        '',
        'I have built coalitions. I have left coalitions.',
        '',
        'I have been right. I have been wrong.',
        '',
        'I keep going.',
        '',
        'I tell young people: this is not a destination. It is a practice. You will not arrive. You will continue.'
      ]
    }
  ];

  var ADDITIONAL_BYSTANDER_SCENARIOS_FINAL = [
    {
      id: 'absf1',
      title: 'Witnessing harassment of a service worker',
      situation: 'You see a customer berating a service worker.',
      actions: [
        'Approach worker after, "Are you okay?"',
        'Tell manager what you observed',
        'Document if pattern',
        'Write positive review naming the worker'
      ],
      whyItMatters: 'Service workers face constant abuse. Witnesses can shift the dynamic.'
    },
    {
      id: 'absf2',
      title: 'Witnessing road rage incident',
      situation: 'You see one driver verbally or physically threatening another.',
      actions: [
        'Stay safe - do not engage from your car',
        'Note license plates',
        'Call 911 if threatening',
        'Be witness if needed for police'
      ],
      whyItMatters: 'Road rage can escalate to violence. Witnesses matter.'
    },
    {
      id: 'absf3',
      title: 'Witnessing protest violence',
      situation: 'You see police or counter-protesters becoming violent.',
      actions: [
        'Document with phone if safe',
        'Help injured to safety',
        'Provide medical care if trained',
        'Contact legal observer if available'
      ],
      whyItMatters: 'Documentation is power. Eye-witnesses matter.'
    },
    {
      id: 'absf4',
      title: 'Witnessing wedding family dynamics',
      situation: 'You see family member excluding partner from family event.',
      actions: [
        'Include them deliberately yourself',
        'Speak privately to family member',
        'Build relationship with excluded partner'
      ],
      whyItMatters: 'Family events normalize or challenge dynamics.'
    },
    {
      id: 'absf5',
      title: 'Witnessing tipping discrimination',
      situation: 'Friends tip poorly when server is from marginalized group.',
      actions: [
        'Tip yourself if able',
        'Speak to friends privately',
        'Refuse to dine again if pattern'
      ],
      whyItMatters: 'Service workers bear real cost.'
    },
    {
      id: 'absf6',
      title: 'Witnessing workplace discrimination',
      situation: 'Coworker repeatedly passed over for promotion despite qualifications.',
      actions: [
        'Document patterns',
        'Speak to HR',
        'EEOC if pattern',
        'Support coworker'
      ],
      whyItMatters: 'Workplace discrimination has long-term consequences.'
    },
    {
      id: 'absf7',
      title: 'Witnessing housing discrimination',
      situation: 'Landlord refuses to rent to qualified applicants of certain identity.',
      actions: [
        'Document specific instances',
        'Report to HUD',
        'Help applicant find legal aid',
        'Support legal action'
      ],
      whyItMatters: 'Housing is foundational.'
    },
    {
      id: 'absf8',
      title: 'Witnessing medical discrimination',
      situation: 'Provider dismissing or mistreating patient based on identity.',
      actions: [
        'Document specific instances',
        'Tell trusted hospital admin',
        'Patient advocate involvement',
        'External complaint if pattern'
      ],
      whyItMatters: 'Medical discrimination kills.'
    }
  ];

  var SUSTAINED_PRACTICE_CALENDAR = [
    { id: 'spc1', month: 'January', focus: 'New year reflection and planning', tasks: ['Review last year', 'Set new commitments', 'Build new habits'] },
    { id: 'spc2', month: 'February', focus: 'Black History Month', tasks: ['Read Black authors', 'Support Black businesses', 'Learn history'] },
    { id: 'spc3', month: 'March', focus: 'Women\'s History Month', tasks: ['Read women authors', 'Support women leaders', 'Learn history'] },
    { id: 'spc4', month: 'April', focus: 'Sexual Assault Awareness Month', tasks: ['Support survivors', 'Take action', 'Learn'] },
    { id: 'spc5', month: 'May', focus: 'Mental Health Awareness Month, AAPI Heritage Month', tasks: ['Mental health practices', 'Support AAPI community', 'Combat stigma'] },
    { id: 'spc6', month: 'June', focus: 'Pride Month', tasks: ['Support LGBTQ+ community', 'Attend events', 'Learn history'] },
    { id: 'spc7', month: 'July', focus: 'Disability Pride Month', tasks: ['Support disability community', 'Disability history', 'Self-advocacy work'] },
    { id: 'spc8', month: 'August', focus: 'Back to school preparation', tasks: ['Set up school year', 'Build connections', 'Plan commitments'] },
    { id: 'spc9', month: 'September', focus: 'Hispanic Heritage Month begins, Suicide Prevention', tasks: ['Latine community support', 'Mental health awareness'] },
    { id: 'spc10', month: 'October', focus: 'Filipino American History, Italian American Heritage, LGBTQ History Month', tasks: ['Support diverse communities', 'Learn history'] },
    { id: 'spc11', month: 'November', focus: 'Native American Heritage Month', tasks: ['Support Indigenous communities', 'Learn Indigenous history', 'Land acknowledgment'] },
    { id: 'spc12', month: 'December', focus: 'Reflection and rest', tasks: ['Year reflection', 'Rest', 'Plan next year'] }
  ];

  var PRACTICAL_TIPS_LIBRARY = [
    { id: 'ptl1', tip: 'Document with specific facts: date, time, location, who saw' },
    { id: 'ptl2', tip: 'Email same-day after verbal interactions' },
    { id: 'ptl3', tip: 'Save screenshots of online harassment' },
    { id: 'ptl4', tip: 'Bring a witness to important conversations' },
    { id: 'ptl5', tip: 'Schedule hard conversations, do not ambush' },
    { id: 'ptl6', tip: 'Practice phrases in mirror before using' },
    { id: 'ptl7', tip: 'Build coalition before public action' },
    { id: 'ptl8', tip: 'Take care of yourself before and after' },
    { id: 'ptl9', tip: 'Choose battles wisely' },
    { id: 'ptl10', tip: 'Multiple levels of escalation exist' },
    { id: 'ptl11', tip: 'Follow up on commitments' },
    { id: 'ptl12', tip: 'Specific language beats vague' },
    { id: 'ptl13', tip: 'Confirm agreements in writing' },
    { id: 'ptl14', tip: 'Track patterns over time' },
    { id: 'ptl15', tip: 'Connect with community before isolation builds' },
    { id: 'ptl16', tip: 'Find at least one ally' },
    { id: 'ptl17', tip: 'Build skills in low-stakes situations first' },
    { id: 'ptl18', tip: 'Honor target\'s wishes about reporting' },
    { id: 'ptl19', tip: 'Self-care is part of the work' },
    { id: 'ptl20', tip: 'Long-term thinking beats sprints' },
    { id: 'ptl21', tip: 'Pause before responding to triggers' },
    { id: 'ptl22', tip: 'Use I-statements in confrontation' },
    { id: 'ptl23', tip: 'Listen first, speak second' },
    { id: 'ptl24', tip: 'Refuse to engage with bad faith' },
    { id: 'ptl25', tip: 'Build sustainable practices' },
    { id: 'ptl26', tip: 'Honor different upstander styles' },
    { id: 'ptl27', tip: 'Use privilege strategically' },
    { id: 'ptl28', tip: 'Mentor others as you grow' },
    { id: 'ptl29', tip: 'Apologize when wrong' },
    { id: 'ptl30', tip: 'Repair beyond apology' },
    { id: 'ptl31', tip: 'Center most impacted in coalition' },
    { id: 'ptl32', tip: 'Build joy into the work' },
    { id: 'ptl33', tip: 'Tell stories of small wins' },
    { id: 'ptl34', tip: 'Rest is part of resistance' },
    { id: 'ptl35', tip: 'Boundaries protect long-term work' },
    { id: 'ptl36', tip: 'Pass leadership over time' },
    { id: 'ptl37', tip: 'Document for those who come next' },
    { id: 'ptl38', tip: 'Build institutions, not just movements' },
    { id: 'ptl39', tip: 'Sustain over time beats burst of intensity' },
    { id: 'ptl40', tip: 'Hope is a practice, not a feeling' }
  ];

  var GLOBAL_UPSTANDER_HISTORY = [
    {
      id: 'guh1',
      country: 'South Africa',
      movement: 'Anti-apartheid',
      keyFigures: ['Nelson Mandela', 'Steve Biko', 'Desmond Tutu', 'Albertina Sisulu'],
      summary: 'Decades of resistance to apartheid produced one of largest peaceful transitions in history.',
      lesson: 'Sustained organization across generations produces change.'
    },
    {
      id: 'guh2',
      country: 'India',
      movement: 'Independence',
      keyFigures: ['Mahatma Gandhi', 'B.R. Ambedkar', 'Sarojini Naidu'],
      summary: 'Nonviolent resistance contributed to British leaving India.',
      lesson: 'Nonviolent direct action can topple empires.'
    },
    {
      id: 'guh3',
      country: 'Poland',
      movement: 'Solidarity',
      keyFigures: ['Lech Walesa'],
      summary: 'Labor movement contributed to fall of communist regime.',
      lesson: 'Labor organizing can be liberation work.'
    },
    {
      id: 'guh4',
      country: 'China',
      movement: 'Tiananmen Square pro-democracy',
      keyFigures: ['Many anonymous protesters'],
      summary: 'Student-led protests for democracy. Brutally suppressed.',
      lesson: 'Some upstander work is at great risk. Sometimes lost.'
    },
    {
      id: 'guh5',
      country: 'Argentina',
      movement: 'Madres de la Plaza de Mayo',
      keyFigures: ['Madres movement'],
      summary: 'Mothers of the disappeared marched weekly demanding accountability.',
      lesson: 'Sustained presence can change governments.'
    },
    {
      id: 'guh6',
      country: 'Iran',
      movement: 'Women Life Freedom (2022)',
      keyFigures: ['Mahsa Amini\'s family', 'Iranian women'],
      summary: 'After Mahsa Amini\'s death in custody, women-led protests.',
      lesson: 'Women lead. Death cannot stop movement.'
    },
    {
      id: 'guh7',
      country: 'Hong Kong',
      movement: 'Pro-democracy 2014, 2019',
      keyFigures: ['Joshua Wong', 'Agnes Chow'],
      summary: 'Massive pro-democracy protests against Chinese government.',
      lesson: 'Youth-led movements. Real costs to advocates.'
    },
    {
      id: 'guh8',
      country: 'Northern Ireland',
      movement: 'Peace process',
      keyFigures: ['John Hume', 'Many others'],
      summary: 'Decades of organizing produced Good Friday Agreement.',
      lesson: 'Cross-community organizing can end violence.'
    },
    {
      id: 'guh9',
      country: 'Chile',
      movement: 'Anti-Pinochet',
      keyFigures: ['Many'],
      summary: 'Sustained organizing produced peaceful transition from dictatorship.',
      lesson: 'Sustained organizing can change regimes.'
    },
    {
      id: 'guh10',
      country: 'Global',
      movement: 'Climate justice',
      keyFigures: ['Greta Thunberg', 'Vanessa Nakate', 'Many others'],
      summary: 'Global movement for climate action.',
      lesson: 'Young people leading on existential issues.'
    }
  ];

  var COMPREHENSIVE_NARRATIVE_PART4 = [
    {
      id: 'cnp4a',
      title: 'When the school changed and I had not noticed',
      narrative: [
        'I had been a sophomore the year a Black principal was hired at our majority-white school.',
        '',
        'I had not understood the significance.',
        '',
        'In my senior year, looking back, I saw it.',
        '',
        'Black students reported feeling seen for the first time. Diverse curriculum had been adopted. Staff representation had improved.',
        '',
        'I had been a passive bystander to the system. My Black principal had been the upstander.',
        '',
        'I am 28 now. I work in education. I think of her often.',
        '',
        'I tell people: pay attention to who is making change. Sometimes the most important upstander is in the principal\'s office.'
      ]
    },
    {
      id: 'cnp4b',
      title: 'My middle school best friend',
      narrative: [
        'In 7th grade I was friends with a girl named Cara. We were inseparable.',
        '',
        'Then her family came out as supporting marriage equality. This was 2010.',
        '',
        'Other students started mocking Cara for her family\'s politics.',
        '',
        'I stayed friends with her. I sat with her at lunch. I told mocking peers to stop.',
        '',
        'Cara and I went to different high schools. We lost touch.',
        '',
        'In college I friended her on Facebook. She messaged me: "I never forgot what you did in 7th grade. Sitting with me. That helped me believe my family was okay."',
        '',
        'I had not known. I had just been a friend.',
        '',
        'Sometimes upstander work is just being a friend. With consistency. Through hard times.'
      ]
    },
    {
      id: 'cnp4c',
      title: 'The teacher who taught me restorative justice',
      narrative: [
        'In 11th grade I had a conflict with a classmate. The school used to suspend us both.',
        '',
        'But our teacher Ms. Williams had been trained in restorative practices. She offered us a circle instead.',
        '',
        'We sat with a facilitator. We talked. We listened. We named what had happened. We named impact. We reached an agreement.',
        '',
        'We did not become friends. But we co-existed peacefully for the rest of the year.',
        '',
        'I learned a different way of handling harm.',
        '',
        'Years later I trained as a restorative facilitator. I run circles for adults now.',
        '',
        'Ms. Williams changed my life.',
        '',
        'I tell young people: a teacher who introduces you to restorative practices may change your life direction.'
      ]
    },
    {
      id: 'cnp4d',
      title: 'When I learned to listen',
      narrative: [
        'I was 16 when I learned to listen properly. Before that I had been a fixer.',
        '',
        'My friend was struggling. I kept giving advice. They got frustrated.',
        '',
        'They told me: "I do not need solutions. I need you to listen."',
        '',
        'I was confused. What was the point of talking if not to solve?',
        '',
        'I tried just listening. I stopped offering advice. I asked questions.',
        '',
        'My friend felt heard. They were able to find their own answers.',
        '',
        'I learned that listening is a gift. That presence is enough.',
        '',
        'I am a counselor now. I listen for a living.',
        '',
        'I tell young people: listening is harder than fixing. It is more useful.'
      ]
    },
    {
      id: 'cnp4e',
      title: 'The volunteer who showed me',
      narrative: [
        'When I was 17 I volunteered at a homeless shelter.',
        '',
        'On my first day I was awkward. I did not know what to say.',
        '',
        'A long-time volunteer named James showed me around. He introduced me to the residents.',
        '',
        'He treated them as friends. He knew their stories. He asked about their lives.',
        '',
        'I had been treating them as charity recipients.',
        '',
        'James changed how I saw upstander work. It is not about doing for. It is about being with.',
        '',
        'I tell people: solidarity is not charity. Build relationships.'
      ]
    }
  ];

  var MENTAL_HEALTH_INTERSECTION = [
    {
      id: 'mhi1',
      topic: 'Bullying and depression',
      research: 'Strong correlation between bullying and depression',
      whatToWatchFor: ['Withdrawal', 'Sleep changes', 'Mood changes', 'Loss of interest', 'Statements of hopelessness'],
      whatToDo: ['Connect with counselor', 'Mental health resources', 'NAMI', '988 if crisis'],
      longTermSupport: ['Therapy', 'Sustained connection', 'Trauma-informed care']
    },
    {
      id: 'mhi2',
      topic: 'Bullying and anxiety',
      research: 'Anxiety significantly increased in bullied youth',
      whatToWatchFor: ['School avoidance', 'Physical complaints', 'Constant worry', 'Sleep issues', 'Avoidance patterns'],
      whatToDo: ['Connect with counselor', 'Cognitive behavioral therapy', 'Build coping skills', 'Family support'],
      longTermSupport: ['Therapy', 'Build resilience', 'Address root cause']
    },
    {
      id: 'mhi3',
      topic: 'Bullying and PTSD',
      research: 'Long-term bullying can produce PTSD-like symptoms',
      whatToWatchFor: ['Flashbacks', 'Avoidance', 'Hypervigilance', 'Sleep issues', 'Difficulty concentrating'],
      whatToDo: ['Specialized trauma therapy', 'EMDR or similar', 'School accommodations', 'Long-term care'],
      longTermSupport: ['Trauma-informed therapy', 'Body-based work', 'Community support']
    },
    {
      id: 'mhi4',
      topic: 'Bullying and suicide ideation',
      research: 'Bullied youth significantly higher risk for suicidal thoughts',
      whatToWatchFor: ['Statements about ending life', 'Giving away possessions', 'Sudden calm after distress', 'Withdrawal'],
      whatToDo: ['Immediate: 988', 'Tell adults', 'Stay with person', 'Get to professional help'],
      longTermSupport: ['Crisis plan', 'Multiple supports', 'Long-term therapy', 'Family engagement']
    },
    {
      id: 'mhi5',
      topic: 'Bullying and self-harm',
      research: 'Self-harm rates higher in bullied youth',
      whatToWatchFor: ['Marks on body', 'Long sleeves in heat', 'Withdrawal', 'Avoiding gym/swim'],
      whatToDo: ['Express care without judgment', 'Connect with mental health', 'Family if appropriate', 'Long-term care'],
      longTermSupport: ['DBT or specialized therapy', 'Skills building', 'Trauma work']
    },
    {
      id: 'mhi6',
      topic: 'Bullying and eating disorders',
      research: 'Body-based bullying correlates with eating disorders',
      whatToWatchFor: ['Weight changes', 'Food rules', 'Avoidance', 'Mood changes'],
      whatToDo: ['Connect with NEDA', 'Medical care', 'Specialized therapy', 'Family-based treatment if appropriate'],
      longTermSupport: ['Specialized eating disorder treatment', 'Family work', 'Body image work']
    },
    {
      id: 'mhi7',
      topic: 'Bullying and substance use',
      research: 'Substance use elevated in bullied youth',
      whatToWatchFor: ['Behavior changes', 'New friends', 'Smell or signs of use', 'Mood changes'],
      whatToDo: ['Express care', 'Connect with SAMHSA', 'Get assessment', 'Specialized treatment'],
      longTermSupport: ['Treatment', 'Family support', 'Recovery community']
    },
    {
      id: 'mhi8',
      topic: 'Bullying and academic decline',
      research: 'Academic performance often drops with bullying',
      whatToWatchFor: ['Grade drops', 'Avoidance', 'Loss of interest', 'Anxiety about school'],
      whatToDo: ['Address bullying', 'Mental health support', 'Academic support', 'Family engagement'],
      longTermSupport: ['Sustained intervention', 'Address root', 'Build resilience']
    }
  ];

  var EXTENDED_BYSTANDER_NARRATIVES_PART5 = [
    {
      id: 'ebnp5a',
      title: 'The school bus epiphany',
      narrative: [
        'I was 12 when I realized that the kid who got bullied on the bus needed someone to sit with him.',
        '',
        'I had been watching for weeks. Nobody sat with him. Nobody.',
        '',
        'One day I decided to sit with him.',
        '',
        'I did not say much. He did not say much.',
        '',
        'But the kids who had been mocking him stopped that day. They did not have a target sitting alone.',
        '',
        'I sat with him every day for the rest of the year. He became my friend.',
        '',
        'I tell middle schoolers: notice who sits alone. Sit with them.'
      ]
    },
    {
      id: 'ebnp5b',
      title: 'The friend who changed',
      narrative: [
        'My best friend Maddie had been mean to a girl in our class for months.',
        '',
        'I told her: "What you are doing is not okay. I am not going to participate."',
        '',
        'Maddie got defensive. We did not speak for two weeks.',
        '',
        'Then she texted me: "I have been thinking about what you said. I am sorry. I am going to apologize to her too."',
        '',
        'She did.',
        '',
        'The girl in our class did not accept her apology immediately. That was fair.',
        '',
        'But over time the bullying stopped. Maddie became a different person.',
        '',
        'I learned: people can change when called in.',
        '',
        'I tell young people: it is worth speaking up to friends. Sometimes they change.'
      ]
    },
    {
      id: 'ebnp5c',
      title: 'The bus driver who saved me',
      narrative: [
        'I was being bullied on the bus. Daily. Mocking. Eventually pushing.',
        '',
        'Our bus driver was Mr. Williams. Quiet man.',
        '',
        'One day Mr. Williams pulled over and said: "If anyone in this bus touches her again, I am calling the principal and you are walking home."',
        '',
        'The bullying stopped that day.',
        '',
        'Mr. Williams had been watching. He chose his moment.',
        '',
        'I tell adults: you do not have to confront daily. Choose your moment. Use your authority well.'
      ]
    },
    {
      id: 'ebnp5d',
      title: 'The substitute who got it',
      narrative: [
        'Our substitute teacher Mrs. Chen had been with us for a week. She had noticed.',
        '',
        'A student named Alex had been mocked by other students all week. Mrs. Chen had not said much.',
        '',
        'On Friday she said: "I want to share something. I have noticed how some of you have been treating Alex. It is not okay. I want it to stop."',
        '',
        'The class was silent.',
        '',
        'She continued: "Alex, I am sorry I did not say something earlier. I see you. You belong in this class."',
        '',
        'Alex cried.',
        '',
        'Mrs. Chen had been a sub for one week and she had paid attention. She had been an upstander before her last day.',
        '',
        'I tell substitute teachers: you are not invisible. Students see you. Some of them need you.'
      ]
    },
    {
      id: 'ebnp5e',
      title: 'The coalition that lasted',
      narrative: [
        'In college we built a coalition of 12 students working on disability access on campus.',
        '',
        'We met every week. We did the work. We won small victories. We lost some.',
        '',
        'After we graduated, we passed leadership to younger students.',
        '',
        'The coalition is now 10 years old. It is still active.',
        '',
        'I am no longer in college but I get updates. I see the work continue.',
        '',
        'I tell people: build coalitions that last beyond you. The work is bigger than your tenure.'
      ]
    },
    {
      id: 'ebnp5f',
      title: 'When I changed careers',
      narrative: [
        'I had been a banker for 8 years. I made good money. I was unhappy.',
        '',
        'I had been doing upstander work on the side: volunteering, donating, advocating.',
        '',
        'I realized I wanted to do this work full-time.',
        '',
        'I took a pay cut to work at a non-profit.',
        '',
        'It was the best decision I ever made.',
        '',
        'I tell people: sometimes upstander work becomes your career. Sometimes that is the right move.'
      ]
    }
  ];

  var LONG_TERM_PRACTICE_LIBRARY = [
    {
      id: 'ltpl1',
      practice: 'Annual reflection',
      timeNeeded: '2 hours',
      frequency: 'Annual',
      structure: [
        'Review what worked',
        'Review what did not',
        'Identify patterns',
        'Plan next year',
        'Celebrate growth'
      ],
      benefits: ['Sustained practice', 'Continuous improvement', 'Long view']
    },
    {
      id: 'ltpl2',
      practice: 'Quarterly check-in',
      timeNeeded: '30 min',
      frequency: 'Quarterly',
      structure: [
        'Review goals',
        'Adjust if needed',
        'Plan next quarter',
        'Connect with mentor'
      ],
      benefits: ['Course correction', 'Accountability', 'Connection']
    },
    {
      id: 'ltpl3',
      practice: 'Monthly community connection',
      timeNeeded: '60 min',
      frequency: 'Monthly',
      structure: [
        'Connect with coalition',
        'Share what is happening',
        'Discuss strategy',
        'Mutual support'
      ],
      benefits: ['Combat isolation', 'Build power', 'Sustain motivation']
    },
    {
      id: 'ltpl4',
      practice: 'Weekly self-care commitment',
      timeNeeded: '60 min',
      frequency: 'Weekly',
      structure: [
        'Physical care',
        'Emotional care',
        'Social care',
        'Joy practice'
      ],
      benefits: ['Sustainability', 'Energy', 'Mental health']
    },
    {
      id: 'ltpl5',
      practice: 'Daily noticing',
      timeNeeded: '5 min',
      frequency: 'Daily',
      structure: [
        'Notice one moment',
        'Note in journal',
        'Reflect briefly',
        'Plan if needed'
      ],
      benefits: ['Build noticing muscle', 'Pattern recognition', 'Sustained awareness']
    },
    {
      id: 'ltpl6',
      practice: 'Mentor connection',
      timeNeeded: '30 min',
      frequency: 'Monthly',
      structure: [
        'Share update',
        'Ask for guidance',
        'Apply wisdom',
        'Show gratitude'
      ],
      benefits: ['Accelerated learning', 'Sustained motivation', 'Long-term relationship']
    },
    {
      id: 'ltpl7',
      practice: 'Mentor others',
      timeNeeded: '60 min',
      frequency: 'Monthly',
      structure: [
        'Connect with mentee',
        'Listen first',
        'Share wisdom',
        'Build over time'
      ],
      benefits: ['Pass it forward', 'Sustained motivation', 'Movement building']
    },
    {
      id: 'ltpl8',
      practice: 'Read identity-affirming texts',
      timeNeeded: '60 min',
      frequency: 'Weekly',
      structure: [
        'Choose marginalized author',
        'Read consistently',
        'Reflect on application',
        'Share insights'
      ],
      benefits: ['Build analysis', 'Sustain commitment', 'Cultural learning']
    },
    {
      id: 'ltpl9',
      practice: 'Listen to identity-affirming media',
      timeNeeded: '30 min',
      frequency: 'Weekly',
      structure: [
        'Choose marginalized podcast or media',
        'Listen consistently',
        'Reflect on application',
        'Share insights'
      ],
      benefits: ['Build analysis', 'Sustain commitment', 'Cultural learning']
    },
    {
      id: 'ltpl10',
      practice: 'Document advocacy work',
      timeNeeded: '15 min',
      frequency: 'Weekly',
      structure: [
        'Note specific actions',
        'Note outcomes',
        'Note learning',
        'Note next steps'
      ],
      benefits: ['Pattern recognition', 'Sustained practice', 'Documentation']
    },
    {
      id: 'ltpl11',
      practice: 'Join community organization',
      timeNeeded: 'Variable',
      frequency: 'Ongoing',
      structure: [
        'Identify aligned org',
        'Begin involvement',
        'Sustain commitment',
        'Grow into leadership'
      ],
      benefits: ['Multiply impact', 'Build community', 'Sustained advocacy']
    },
    {
      id: 'ltpl12',
      practice: 'Sustained personal commitments',
      timeNeeded: 'Variable',
      frequency: 'Daily',
      structure: [
        'Identify daily practices',
        'Embed in routine',
        'Sustain over time',
        'Adjust as needed'
      ],
      benefits: ['Build identity', 'Sustained practice', 'Long-term impact']
    }
  ];

  var COMPLEX_SCENARIOS = [
    {
      id: 'cs_d1',
      title: 'When the harmer is in crisis',
      situation: 'Someone who has been bullying others is now in mental health crisis themselves.',
      complexity: [
        'Compassion + accountability',
        'Cycle of harm',
        'System response',
        'Long-term support'
      ],
      approach: [
        'Honor crisis with care',
        'Continue accountability for harm',
        'Both/and approach',
        'Trauma-informed response'
      ],
      whatToDo: [
        'Connect with crisis services',
        'Continue support for those harmed',
        'Address root causes',
        'Sustained care over time'
      ]
    },
    {
      id: 'cs_d2',
      title: 'When the target retaliates',
      situation: 'Person being bullied responds with harm.',
      complexity: [
        'Self-defense vs aggression',
        'Trauma response',
        'System tends to punish target',
        'Long-term harm continues'
      ],
      approach: [
        'Address pattern, not just response',
        'Trauma-informed lens',
        'Address root',
        'Discipline equity'
      ],
      whatToDo: [
        'Mental health support for both',
        'Address underlying bullying',
        'Equity in discipline',
        'Restorative process'
      ]
    },
    {
      id: 'cs_d3',
      title: 'When the bully is also a target',
      situation: 'Same student bullies others AND is bullied themselves.',
      complexity: [
        'Cycle of harm visible',
        'Multiple supports needed',
        'System often picks one role',
        'Both need addressing'
      ],
      approach: [
        'Address both roles',
        'Mental health support',
        'Family engagement',
        'Restorative process'
      ],
      whatToDo: [
        'Support the targeting',
        'Support being targeted',
        'Family work',
        'Trauma-informed care'
      ]
    },
    {
      id: 'cs_d4',
      title: 'When adult and student dynamics intersect',
      situation: 'Adult favoritism creates student bullying dynamic.',
      complexity: [
        'Adult role in student bullying',
        'Power dynamic',
        'Adult accountability',
        'Student accountability'
      ],
      approach: [
        'Address adult role',
        'Address student behavior',
        'Both have responsibility',
        'Pattern documentation'
      ],
      whatToDo: [
        'Adult intervention or replacement',
        'Student restorative process',
        'School-wide culture work',
        'Family engagement'
      ]
    },
    {
      id: 'cs_d5',
      title: 'When the harm is institutional',
      situation: 'Discipline patterns, curriculum exclusion, etc. cause harm.',
      complexity: [
        'No individual perpetrator',
        'Systemic harm',
        'Slower change',
        'More resistance'
      ],
      approach: [
        'Coalition building',
        'Policy change',
        'Long-term advocacy',
        'Multiple levels'
      ],
      whatToDo: [
        'Track patterns',
        'Document harm',
        'Build coalition',
        'Push for policy change'
      ]
    },
    {
      id: 'cs_d6',
      title: 'When the harm is online and cross-jurisdictional',
      situation: 'Online bullying involving students from multiple schools.',
      complexity: [
        'Jurisdiction unclear',
        'Multiple stakeholders',
        'Platform issues',
        'Coordination challenges'
      ],
      approach: [
        'Multi-school coordination',
        'Platform reporting',
        'Mental health response',
        'Possible police involvement'
      ],
      whatToDo: [
        'Document across schools',
        'Coordinate response',
        'Mental health support',
        'Long-term work'
      ]
    },
    {
      id: 'cs_d7',
      title: 'When the bullying is from teacher to teacher',
      situation: 'Adult bullying among staff affects students.',
      complexity: [
        'Adult workplace issues',
        'Impact on students',
        'HR involvement',
        'Long-term culture'
      ],
      approach: [
        'HR involvement',
        'Adult support',
        'Student protection',
        'Culture work'
      ],
      whatToDo: [
        'Report to HR',
        'EEOC complaints if applicable',
        'Document for students\' protection',
        'Long-term culture change'
      ]
    },
    {
      id: 'cs_d8',
      title: 'When the harm crosses many years',
      situation: 'Pattern of harm has occurred for years before intervention.',
      complexity: [
        'Long-standing dynamics',
        'Multiple actors involved',
        'Slow change',
        'Documentation difficult'
      ],
      approach: [
        'Acknowledge pattern',
        'Start with current actors',
        'Address culture',
        'Sustained work'
      ],
      whatToDo: [
        'Take seriously despite age of pattern',
        'Address current actors',
        'Address culture',
        'Long-term commitment'
      ]
    }
  ];

  var COMMON_QUESTIONS_DEEP = [
    {
      id: 'cqd1',
      question: 'Why do bystanders stay silent?',
      multipleReasons: [
        'Bystander effect (others will help)',
        'Pluralistic ignorance (no one else is acting, so maybe it is fine)',
        'Diffusion of responsibility',
        'Social cost (peers may turn on you)',
        'Personal safety',
        'Not knowing what to do'
      ],
      howToOvercome: [
        'Awareness of bystander effect',
        'Trust your gut',
        'Make yourself specifically responsible',
        'Find allies',
        'Build skills',
        'Practice intervention'
      ]
    },
    {
      id: 'cqd2',
      question: 'Is calling someone in different from calling them out?',
      definitions: {
        callOut: 'Public confrontation. High social cost. Effective for power dynamics.',
        callIn: 'Private conversation. Lower social cost. Effective for relationship preservation.'
      },
      whenToUseEach: {
        callOut: 'Public power abuse. Patterns that need exposure. When private is unsafe.',
        callIn: 'Friend or relationship to preserve. Mistakes from ignorance. Building trust.'
      },
      bothAreNeeded: 'Movements need both. Different situations call for different responses.'
    },
    {
      id: 'cqd3',
      question: 'How do I know if I should intervene?',
      checklist: [
        'Is harm happening?',
        'Is target asking for help (verbally or nonverbally)?',
        'Am I physically safe to act?',
        'Do I have the relationship to act?',
        'Is there a lower-risk option?'
      ],
      defaultToAction: 'When uncertain, default to lower-risk action (distract, document, delay).',
      followUp: 'Always check on target afterward.'
    },
    {
      id: 'cqd4',
      question: 'What if my intervention makes things worse?',
      reality: 'Sometimes interventions escalate.',
      strategies: [
        'Choose your approach carefully',
        'Have plan for response',
        'Get help if needed',
        'Document for follow-up'
      ],
      afterIntervention: [
        'Check on target',
        'Reflect on what happened',
        'Learn from outcome',
        'Try different approach next time'
      ],
      keyPoint: 'Even imperfect intervention beats silence. Most bystanders fear making it worse but doing nothing is making it worse for the target.'
    },
    {
      id: 'cqd5',
      question: 'What if my friends turn on me for being an upstander?',
      reality: 'This happens. Real social cost.',
      considerations: [
        'Friends who require silence are not friends',
        'New friendships are possible',
        'Some friendships can survive if you communicate',
        'Sometimes the loss reveals something important about the friendship'
      ],
      preparation: [
        'Find values-aligned community before you need them',
        'Build new connections continuously',
        'Have multiple friend groups'
      ],
      longTerm: 'Most upstanders find that the friendships they keep are deeper.'
    },
    {
      id: 'cqd6',
      question: 'How do I deal with burnout?',
      signs: [
        'Exhaustion',
        'Cynicism',
        'Reduced effectiveness',
        'Loss of joy',
        'Physical symptoms'
      ],
      prevention: [
        'Sustainable pace',
        'Regular rest',
        'Multiple supports',
        'Joy practice',
        'Therapy'
      ],
      recovery: [
        'Take time off',
        'Process with therapist',
        'Reconnect with values',
        'Adjust commitments',
        'Build new rhythm'
      ]
    },
    {
      id: 'cqd7',
      question: 'How do I keep going when nothing changes?',
      reality: 'Sometimes big change is slow.',
      strategies: [
        'Celebrate small wins',
        'Connect with community',
        'Long view thinking',
        'Multiple actions in different areas',
        'Self-care'
      ],
      perspective: [
        'Change is incremental',
        'You are part of long arc',
        'You may not see end of changes you start',
        'Your work matters even when invisible'
      ]
    },
    {
      id: 'cqd8',
      question: 'What if I have been wrong before?',
      reality: 'Everyone has been wrong.',
      response: [
        'Apologize when appropriate',
        'Learn from mistake',
        'Continue working',
        'Build humility'
      ],
      perspective: [
        'Being wrong is part of growing',
        'You are not the work',
        'Repair is possible',
        'Continue forward'
      ]
    },
    {
      id: 'cqd9',
      question: 'How do I support someone who has experienced trauma?',
      basics: [
        'Believe them',
        'Listen without solving',
        'Do not push for details',
        'Respect their pace',
        'Offer practical help'
      ],
      whatToAvoid: [
        'Telling them what they should do',
        'Comparing to others',
        'Pushing for forgiveness',
        'Acting wronged by their slowness'
      ],
      ongoingCare: [
        'Check in regularly',
        'Be patient',
        'Connect with professional help',
        'Self-care for yourself'
      ]
    },
    {
      id: 'cqd10',
      question: 'How do I balance individual action with systemic change?',
      both: 'Both are necessary.',
      individual: [
        'Daily practices build culture',
        'Personal change is part of broader change',
        'Modeling matters',
        'Relationships build power'
      ],
      systemic: [
        'Policy change affects many',
        'Institutional change is durable',
        'Coalition multiplies power',
        'Long-term thinking required'
      ],
      integration: 'Move between scales. Build practice at both.'
    }
  ];

  var WORKSHOP_FACILITATION_GUIDES = [
    {
      id: 'wfg1',
      duration: '30 minutes',
      topic: 'Introduction to Upstander Work',
      goals: ['Define upstander', 'Self-locate on spectrum', 'Commit to one action'],
      structure: [
        { time: '0-5 min', activity: 'Welcome and agreements' },
        { time: '5-10 min', activity: 'Define terms together' },
        { time: '10-20 min', activity: 'Self-assess location on spectrum' },
        { time: '20-25 min', activity: 'Share one commitment' },
        { time: '25-30 min', activity: 'Closing and resources' }
      ]
    },
    {
      id: 'wfg2',
      duration: '60 minutes',
      topic: 'Bystander Barriers',
      goals: ['Identify barriers', 'Practice overcoming', 'Build muscle memory'],
      structure: [
        { time: '0-5 min', activity: 'Welcome and check-in' },
        { time: '5-20 min', activity: 'Brainstorm and discuss barriers' },
        { time: '20-40 min', activity: 'Role-play overcoming barriers' },
        { time: '40-55 min', activity: 'Group debrief' },
        { time: '55-60 min', activity: 'Commit to one practice' }
      ]
    },
    {
      id: 'wfg3',
      duration: '90 minutes',
      topic: 'Direct Intervention Skills',
      goals: ['Build verbal intervention skills', 'Practice high-risk moves', 'Build muscle memory'],
      structure: [
        { time: '0-10 min', activity: 'Welcome and check-in' },
        { time: '10-25 min', activity: 'Mini-lesson on intervention skills' },
        { time: '25-30 min', activity: 'Demonstration' },
        { time: '30-75 min', activity: 'Role-play in pairs' },
        { time: '75-85 min', activity: 'Group debrief' },
        { time: '85-90 min', activity: 'Commit to one move' }
      ]
    },
    {
      id: 'wfg4',
      duration: '90 minutes',
      topic: 'Supporting Targets',
      goals: ['Build listening skills', 'Practice support language', 'Plan ongoing care'],
      structure: [
        { time: '0-10 min', activity: 'Welcome' },
        { time: '10-25 min', activity: 'Listening principles' },
        { time: '25-65 min', activity: 'Pairs practice' },
        { time: '65-80 min', activity: 'Resources and follow-up' },
        { time: '80-90 min', activity: 'Closing commitment' }
      ]
    },
    {
      id: 'wfg5',
      duration: '120 minutes',
      topic: 'Identity-Aware Upstander Work',
      goals: ['Center marginalized voices', 'Examine privilege', 'Build identity-aware practice'],
      structure: [
        { time: '0-10 min', activity: 'Welcome with agreements' },
        { time: '10-30 min', activity: 'Intersectionality basics' },
        { time: '30-60 min', activity: 'Privilege examination in pairs' },
        { time: '60-90 min', activity: 'Identity-specific stories' },
        { time: '90-110 min', activity: 'Application discussion' },
        { time: '110-120 min', activity: 'Closing commitments' }
      ]
    },
    {
      id: 'wfg6',
      duration: '90 minutes',
      topic: 'Coalition Building',
      goals: ['Learn coalition basics', 'Plan one action', 'Build sustained practice'],
      structure: [
        { time: '0-10 min', activity: 'Welcome' },
        { time: '10-30 min', activity: 'Coalition principles' },
        { time: '30-70 min', activity: 'Small groups plan' },
        { time: '70-85 min', activity: 'Group sharing' },
        { time: '85-90 min', activity: 'Closing' }
      ]
    },
    {
      id: 'wfg7',
      duration: '60 minutes',
      topic: 'Sustaining the Work',
      goals: ['Build self-care', 'Plan year', 'Build community'],
      structure: [
        { time: '0-10 min', activity: 'Welcome' },
        { time: '10-30 min', activity: 'Burnout patterns' },
        { time: '30-50 min', activity: 'Build personal plan' },
        { time: '50-60 min', activity: 'Share commitments' }
      ]
    },
    {
      id: 'wfg8',
      duration: '90 minutes',
      topic: 'Restorative Practice Introduction',
      goals: ['Introduce restorative justice', 'Practice dialogue', 'Apply to real situation'],
      structure: [
        { time: '0-10 min', activity: 'Welcome' },
        { time: '10-30 min', activity: 'Restorative principles' },
        { time: '30-75 min', activity: 'Triad role-play' },
        { time: '75-85 min', activity: 'Group debrief' },
        { time: '85-90 min', activity: 'Apply to own situation' }
      ]
    }
  ];

  var BYSTANDER_NARRATIVES_ENRICHED = [
    {
      id: 'bne1',
      title: 'When my courage came from another',
      narrative: [
        'I was 13. I had been bullied for months. Daily mocking. I had stopped speaking in class.',
        '',
        'One day a new student named Jasmine moved in. She was brave from day one.',
        '',
        'In the first week she walked up to one of my bullies and said: "Knock it off. Why do you do that?"',
        '',
        'The bully was speechless.',
        '',
        'Jasmine sat with me at lunch. She said: "You do not have to be alone."',
        '',
        'Watching her be brave gave me courage. I started speaking up too.',
        '',
        'Jasmine and I were best friends until she moved away in 11th grade.',
        '',
        'I learned: courage is contagious. One brave person can change everything.',
        '',
        'I tell young people: you might be that one brave person.'
      ]
    },
    {
      id: 'bne2',
      title: 'My quiet upstander',
      narrative: [
        'I was 15. My math teacher had been hard on me. Calling me out for not understanding. Mocking my answers.',
        '',
        'A senior named Marcus tutored me twice a week. He was patient. He worked with me.',
        '',
        'He never said anything about the teacher. He just made sure I got the help I needed.',
        '',
        'My grades came up. My confidence came up.',
        '',
        'Years later I asked Marcus why he had tutored me. He said: "I had seen what Mr. Davis was doing. I knew you needed support."',
        '',
        'Marcus had been an upstander quietly. Without confrontation. Without saying anything to the teacher.',
        '',
        'He had simply made sure I succeeded despite the teacher.',
        '',
        'I tell people: upstander work has many forms. Sometimes the loudest. Sometimes the quietest.'
      ]
    },
    {
      id: 'bne3',
      title: 'When my parents became upstanders',
      narrative: [
        'I was 16. I had been bullied at school. My parents had been hands-off.',
        '',
        'I told them everything. I expected them to brush it off.',
        '',
        'Instead my dad sat down with me. He said: "Tell me what is happening."',
        '',
        'I told him. He listened. He documented.',
        '',
        'My mom called the school. Then the district. Then the state.',
        '',
        'They escalated. They did not back down.',
        '',
        'The bullying stopped within two months.',
        '',
        'My parents had become upstanders for me. I had not known they could.',
        '',
        'I tell young people: tell your parents. Some of them have your back in ways you do not realize.'
      ]
    },
    {
      id: 'bne4',
      title: 'The mentor I did not know I needed',
      narrative: [
        'I was 14. I had been an upstander for one semester. I was burning out.',
        '',
        'My English teacher Ms. Patel asked me to stay after class. She said: "I have noticed you have been speaking up. I want to share something with you."',
        '',
        'She told me about her own upstander work. She told me about the cost. She told me about sustainability.',
        '',
        'She offered to be my mentor.',
        '',
        'For the rest of high school we met every other week. She helped me build sustainable practice. She helped me grow.',
        '',
        'I am 28 now. I still talk to Ms. Patel. She is now my colleague at a community organization.',
        '',
        'I tell young upstanders: find a mentor. Your work will be richer and sustainable.'
      ]
    },
    {
      id: 'bne5',
      title: 'My first big public action',
      narrative: [
        'I was 17. There had been a transphobic incident at our school.',
        '',
        'A group of us organized a walkout.',
        '',
        'I had never done anything that public.',
        '',
        '300 students walked out. We marched. We made demands. We met with administration.',
        '',
        'I had not led. I had been part of a coalition.',
        '',
        'The administration committed to changes. Some happened. Some did not.',
        '',
        'But the walkout had transformed me. I had stood in public solidarity. I had been part of a movement.',
        '',
        'I tell young people: do something public once. Once you do, you will be different forever.'
      ]
    }
  ];

  var DEEP_RESEARCH_CITATIONS = [
    {
      id: 'drc1',
      study: 'Olweus Bullying Prevention Program research (1990s-2000s)',
      keyFinding: 'Comprehensive school-wide program reduces bullying 20-70%',
      methodology: 'Longitudinal multi-school study',
      implication: 'School-wide approach beats individual interventions',
      practicalApplication: 'Invest in comprehensive programs'
    },
    {
      id: 'drc2',
      study: 'Ttofi and Farrington meta-analysis (2011)',
      keyFinding: 'Anti-bullying programs reduce bullying ~20% and victimization ~17% on average',
      methodology: 'Meta-analysis of 44 studies',
      implication: 'Programs work but variability is large',
      practicalApplication: 'Quality of implementation matters more than program choice'
    },
    {
      id: 'drc3',
      study: 'Davis & Nixon (2014) - Youth Voice Project',
      keyFinding: 'Targets ranked peer actions as more helpful than adult actions',
      methodology: 'Survey of bullied students',
      implication: 'Peer support is critical',
      practicalApplication: 'Train and empower peer upstanders'
    },
    {
      id: 'drc4',
      study: 'GLSEN National School Climate Survey (biennial)',
      keyFinding: 'LGBTQ students experience significantly higher bullying than non-LGBTQ',
      methodology: 'National survey',
      implication: 'LGBTQ students need specific support',
      practicalApplication: 'GSA, inclusive policies, staff training'
    },
    {
      id: 'drc5',
      study: 'Klomek et al (2007) - bullying and suicide',
      keyFinding: 'Bullied youth at significantly higher risk for suicide ideation',
      methodology: 'Longitudinal study',
      implication: 'Bullying is mental health crisis',
      practicalApplication: 'Connect targets with mental health'
    },
    {
      id: 'drc6',
      study: 'Skiba et al (2014) - discipline disparities',
      keyFinding: 'Black students suspended at 2-3x rate of white students for similar behavior',
      methodology: 'National data analysis',
      implication: 'Discipline reform essential',
      practicalApplication: 'Track and address disparities'
    },
    {
      id: 'drc7',
      study: 'Restorative Practices in Oakland Unified Schools (2014)',
      keyFinding: 'Suspensions reduced 87% in pilot schools',
      methodology: 'Multi-year implementation study',
      implication: 'Restorative beats punitive',
      practicalApplication: 'Implement restorative at scale'
    },
    {
      id: 'drc8',
      study: 'Latane and Darley (1968) - bystander effect',
      keyFinding: 'More witnesses = less likely individual help',
      methodology: 'Experimental studies',
      implication: 'Train explicitly to overcome',
      practicalApplication: 'Bystander intervention training'
    },
    {
      id: 'drc9',
      study: 'Bystander intervention training research (multiple)',
      keyFinding: 'Training increases intervention rates 30-100%',
      methodology: 'Pre-post designs',
      implication: 'Training works',
      practicalApplication: 'Implement bystander training'
    },
    {
      id: 'drc10',
      study: 'Mental health and school climate (multiple)',
      keyFinding: 'School climate correlates with student mental health',
      methodology: 'Cross-sectional studies',
      implication: 'Climate is mental health prevention',
      practicalApplication: 'Build inclusive culture'
    }
  ];

  var FACILITATOR_GUIDES = [
    {
      id: 'fg1',
      type: 'Circle facilitator',
      qualifications: ['Training in restorative practices', 'Capacity for neutrality', 'Cultural humility'],
      role: ['Hold space', 'Facilitate equally', 'Ask powerful questions', 'Document agreements'],
      skills: ['Active listening', 'Calm presence', 'Question framing', 'Conflict navigation'],
      challenges: ['Personal triggers', 'Power dynamics', 'Time pressure', 'Group resistance']
    },
    {
      id: 'fg2',
      type: 'Workshop facilitator',
      qualifications: ['Subject knowledge', 'Adult learning skills', 'Cultural competency'],
      role: ['Design curriculum', 'Engage participants', 'Build community', 'Sustain learning'],
      skills: ['Engaging instruction', 'Group management', 'Adapting in moment', 'Building community'],
      challenges: ['Diverse learning needs', 'Energy management', 'Time constraints', 'Participant resistance']
    },
    {
      id: 'fg3',
      type: 'Conflict mediator',
      qualifications: ['Training in mediation', 'Communication skills', 'Cultural humility'],
      role: ['Neutral facilitation', 'Help parties communicate', 'Find common ground', 'Document agreement'],
      skills: ['Reframing', 'Active listening', 'Question framing', 'Conflict navigation'],
      challenges: ['Power imbalance', 'High emotion', 'Time pressure', 'Implementing agreements']
    },
    {
      id: 'fg4',
      type: 'Crisis responder',
      qualifications: ['Crisis training', 'Mental health knowledge', 'Calm presence'],
      role: ['Immediate response', 'Connect with services', 'Stay engaged', 'Follow up'],
      skills: ['De-escalation', 'Active listening', 'Resource knowledge', 'Self-regulation'],
      challenges: ['Personal trauma', 'Vicarious trauma', 'Compassion fatigue', 'System limitations']
    },
    {
      id: 'fg5',
      type: 'Support group facilitator',
      qualifications: ['Subject expertise', 'Group facilitation', 'Confidentiality'],
      role: ['Hold space', 'Facilitate sharing', 'Build community', 'Sustain over time'],
      skills: ['Active listening', 'Group management', 'Confidentiality', 'Resource sharing'],
      challenges: ['Personal triggers', 'Group dynamics', 'Confidentiality breaches', 'Burnout']
    }
  ];

  var SCHOOL_CULTURE_BUILDING = [
    {
      id: 'scb1',
      phase: 'Year 1 - Foundation',
      activities: [
        'All-staff training on restorative practices',
        'Implement daily circles in homerooms',
        'Develop new anti-bullying policy with student input',
        'Begin discipline reform',
        'Hire diverse staff'
      ],
      indicators: ['Staff engagement', 'Student voice', 'Initial pattern shifts']
    },
    {
      id: 'scb2',
      phase: 'Year 2 - Implementation',
      activities: [
        'Continue daily circles',
        'Implement restorative responses to incidents',
        'Build affinity groups',
        'Continued staff development',
        'Student leadership development'
      ],
      indicators: ['Reduced suspensions', 'Increased reporting', 'Climate improvement']
    },
    {
      id: 'scb3',
      phase: 'Year 3 - Deepening',
      activities: [
        'Curriculum review for inclusivity',
        'Family engagement expansion',
        'Coalition with community organizations',
        'Sustained student leadership',
        'Building youth voice in policy'
      ],
      indicators: ['Sustained climate change', 'Reduced bullying', 'Increased belonging']
    },
    {
      id: 'scb4',
      phase: 'Year 4-5 - Sustaining',
      activities: [
        'Sustained practices',
        'New leadership development',
        'Continued improvement',
        'External recognition',
        'Coalition with other schools'
      ],
      indicators: ['Cultural transformation', 'Modeling for others', 'Sustained outcomes']
    },
    {
      id: 'scb5',
      phase: 'Year 5+ - Institutionalization',
      activities: [
        'Embedded in school identity',
        'Multi-generational student leadership',
        'Continuous improvement culture',
        'Policy alignment',
        'Funding sustainability'
      ],
      indicators: ['Permanent culture shift', 'Sustained outcomes', 'Model for other schools']
    }
  ];

  var CRITICAL_RESPONSE_PROTOCOLS = [
    {
      id: 'crp1',
      situation: 'Active threat to self',
      immediate: [
        'Stay engaged with person',
        'Get to safety together if possible',
        'Call 988 or 911',
        'Stay until help arrives'
      ],
      aftermath: [
        'Take care of yourself',
        'Process with therapist',
        'Stay in touch with person'
      ],
      longterm: [
        'Crisis plan for person',
        'Multiple supports',
        'Mental health care'
      ]
    },
    {
      id: 'crp2',
      situation: 'Active threat to others',
      immediate: [
        'Get to safety',
        'Call 911',
        'Document if safe',
        'Help others to safety'
      ],
      aftermath: [
        'Take care of yourself',
        'Process trauma',
        'Connect with mental health'
      ],
      longterm: [
        'School safety planning',
        'Community response',
        'Mental health resources'
      ]
    },
    {
      id: 'crp3',
      situation: 'Sexual assault disclosure',
      immediate: [
        'Believe the person',
        'Express care',
        'Ask what they need',
        'Help them get medical care if needed',
        'Connect with RAINN'
      ],
      aftermath: [
        'Help with Title IX or police reporting',
        'Long-term mental health',
        'Ongoing care'
      ],
      longterm: [
        'Sustained support',
        'Resource connection',
        'Trauma-informed care'
      ]
    },
    {
      id: 'crp4',
      situation: 'Abuse disclosure',
      immediate: [
        'Believe',
        'Express care',
        'Tell mandated reporter if you are one',
        'Help connect with CPS or police if needed'
      ],
      aftermath: [
        'Continue support',
        'Help navigate system',
        'Connect with mental health'
      ],
      longterm: [
        'Sustained care',
        'Safe housing if needed',
        'Long-term support'
      ]
    },
    {
      id: 'crp5',
      situation: 'Substance use crisis',
      immediate: [
        'Call 911 if overdose',
        'Stay with person',
        'Connect with SAMHSA',
        'Get medical care'
      ],
      aftermath: [
        'Treatment planning',
        'Family engagement',
        'Mental health'
      ],
      longterm: [
        'Sustained treatment',
        'Recovery support',
        'Mental health care'
      ]
    },
    {
      id: 'crp6',
      situation: 'Eating disorder crisis',
      immediate: [
        'Express care without weight focus',
        'Connect with NEDA',
        'Help connect with treatment',
        'Get medical care if needed'
      ],
      aftermath: [
        'Treatment',
        'Family engagement',
        'Long-term support'
      ],
      longterm: [
        'Sustained treatment',
        'Body image work',
        'Mental health care'
      ]
    }
  ];

  var COMPREHENSIVE_AGE_GUIDES = [
    {
      id: 'cag1',
      ageGroup: 'Pre-K and Kindergarten (3-5)',
      developmentalFocus: 'Sharing, taking turns, recognizing feelings',
      bullyingForms: ['Exclusion', 'Pushing', 'Mean words'],
      upstanderSkills: [
        'Tell adult',
        'Use kind words',
        'Sit with someone alone',
        'Share toys'
      ],
      adultRole: 'Heavy. Adults must intervene and teach.',
      curriculumApproaches: ['Daily morning circle', 'Feeling words', 'Sharing practice', 'Restorative basics']
    },
    {
      id: 'cag2',
      ageGroup: 'Early elementary (6-8)',
      developmentalFocus: 'Empathy, perspective-taking, peer relationships',
      bullyingForms: ['Exclusion', 'Verbal teasing', 'Physical aggression'],
      upstanderSkills: [
        'Tell adult',
        'Speak up: "stop that"',
        'Sit with someone alone',
        'Apologize',
        'Notice feelings'
      ],
      adultRole: 'Strong. Adults teach and model.',
      curriculumApproaches: ['SEL curriculum', 'Friendship skills', 'Anti-bullying lessons', 'Restorative basics']
    },
    {
      id: 'cag3',
      ageGroup: 'Late elementary (9-11)',
      developmentalFocus: 'Identity formation begins, friendship complexity',
      bullyingForms: ['Exclusion intensifies', 'Rumor', 'Identity-based teasing'],
      upstanderSkills: [
        'Tell adult',
        'Speak up to peers',
        'Document mentally',
        'Include excluded',
        'Apologize and repair'
      ],
      adultRole: 'Continued strong involvement.',
      curriculumApproaches: ['Identity exploration', 'Empathy curriculum', 'Anti-bullying with depth', 'Beginning restorative']
    },
    {
      id: 'cag4',
      ageGroup: 'Middle school (11-14)',
      developmentalFocus: 'Identity, peer hierarchy, sexual development',
      bullyingForms: ['Cyberbullying begins', 'Identity-based harm', 'Sexual harassment'],
      upstanderSkills: [
        'Direct intervention if safe',
        'Tell trusted adult',
        'Document patterns',
        'Build inclusive friend groups',
        'Refuse to participate'
      ],
      adultRole: 'Crucial but less direct. Build student capacity.',
      curriculumApproaches: ['Bystander training', 'Digital citizenship', 'Identity-affirming curriculum', 'Restorative practice']
    },
    {
      id: 'cag5',
      ageGroup: 'High school (14-18)',
      developmentalFocus: 'Identity consolidation, autonomy, real-world consequences',
      bullyingForms: ['All forms', 'Sexual harassment serious', 'Cyber harassment', 'Identity-based'],
      upstanderSkills: [
        'Direct intervention',
        'Reporting systems',
        'Coalition building',
        'Long-term advocacy',
        'Self-care'
      ],
      adultRole: 'Coach, mentor, partner.',
      curriculumApproaches: ['Bystander training', 'Title IX', 'Coalition organizing', 'Identity work', 'Self-care']
    },
    {
      id: 'cag6',
      ageGroup: 'College (18-22)',
      developmentalFocus: 'Adult identity, independence, real stakes',
      bullyingForms: ['All forms continue', 'Sexual assault', 'Hazing', 'Cyber'],
      upstanderSkills: [
        'Direct intervention',
        'Reporting (Title IX, etc.)',
        'Coalition organizing',
        'Long-term advocacy',
        'Mentorship'
      ],
      adultRole: 'Peer, resource, ally.',
      curriculumApproaches: ['Bystander training', 'Title IX programming', 'Identity work', 'Mental health resources']
    },
    {
      id: 'cag7',
      ageGroup: 'Young adult (22-30)',
      developmentalFocus: 'Career, relationships, identity solidification',
      bullyingForms: ['Workplace bullying', 'Cyber harassment', 'Relationship abuse', 'Identity-based'],
      upstanderSkills: [
        'HR reporting',
        'EEOC complaints',
        'Coalition organizing',
        'Mentoring younger',
        'Self-care'
      ],
      adultRole: 'Peer.',
      curriculumApproaches: ['Workplace training', 'ADA awareness', 'Coalition organizing']
    }
  ];

  var EXTENDED_NARRATIVES_PART4 = [
    {
      id: 'enp4a',
      title: 'When I learned my privilege',
      narrative: [
        'I was 14. I had never thought about my whiteness.',
        '',
        'My Black friend Devin told me: "You move through the world differently than I do. I get followed in stores. I get pulled over for nothing. I work twice as hard for the same grades."',
        '',
        'I had not seen this. I had thought we were the same.',
        '',
        'I started reading. James Baldwin. Toni Morrison. Ta-Nehisi Coates.',
        '',
        'I started seeing.',
        '',
        'I started speaking up. Not always smoothly.',
        '',
        'Devin and I are friends 12 years later. Our friendship was strengthened by truth.',
        '',
        'I tell white people: do the work. The discomfort is part of the work. Your friends of color are not your teachers, but they may have shown you the door. Walk through.'
      ]
    },
    {
      id: 'enp4b',
      title: 'When I was a target and an upstander',
      narrative: [
        'I am trans. I have been a target of bullying.',
        '',
        'And I have been an upstander too.',
        '',
        'I tell trans youth: you do not have to choose between being a target and an upstander. Often we are both.',
        '',
        'I have stood up for cis kids being bullied. I have called out homophobia. I have sat with kids who were excluded.',
        '',
        'My experience as a target made me more capable as an upstander. I know what isolation feels like. I know what being seen feels like.',
        '',
        'Sometimes I needed support too. Other people stood up for me.',
        '',
        'We are mutual aid. We are coalition.',
        '',
        'I tell young people: your scars are your teachers. Your voice is your medicine.'
      ]
    },
    {
      id: 'enp4c',
      title: 'The classroom that became a community',
      narrative: [
        'My English teacher Ms. Hassan ran her classroom like a circle.',
        '',
        'Every Monday we sat in a circle and checked in. Every Friday we closed with reflection.',
        '',
        'It felt weird at first. By month two it felt natural.',
        '',
        'We learned to listen. We learned to speak. We learned to disagree without harming.',
        '',
        'When conflict happened in our class, we resolved it in circle. Sometimes hard. Mostly transformative.',
        '',
        'Years later, my friends from that class are still my friends. We were built into community.',
        '',
        'Ms. Hassan never told us we were doing restorative practices. We just lived them.',
        '',
        'I tell teachers: the way you set up your classroom matters. Build community on Day 1.'
      ]
    },
    {
      id: 'enp4d',
      title: 'When I built a coalition',
      narrative: [
        'In 11th grade I noticed our school had no counselor of color. The student body was 40% BIPOC.',
        '',
        'I started a coalition. Five students at first.',
        '',
        'We met every week. We mapped the issue. We talked to administration. We built data.',
        '',
        'It took 18 months.',
        '',
        'In senior year, the school hired a Black school counselor.',
        '',
        'After college I went back and met her. She told me: "Students at this school told me they had asked for me. I came because of you."',
        '',
        'I cried.',
        '',
        'I tell young people: coalitions can move institutions. Five committed people can change a school.'
      ]
    },
    {
      id: 'enp4e',
      title: 'My ongoing humility',
      narrative: [
        'I have been doing upstander work for 15 years.',
        '',
        'I still make mistakes.',
        '',
        'Last year I made a comment that hurt someone. They told me. I apologized. I am still working on the underlying assumption.',
        '',
        'I tell new advocates: humility is permanent. You do not graduate from learning. Mistakes are not failures. They are invitations.',
        '',
        'I tell longtime advocates: stay humble. The day you think you have figured it out is the day you become dangerous.'
      ]
    }
  ];

  var ADULT_LEARNING_GUIDES = [
    {
      id: 'alg1',
      audience: 'Adults beginning upstander work',
      stages: [
        { stage: 'Awareness', activities: ['Read identity-affirming texts', 'Notice your context', 'Examine privilege'] },
        { stage: 'Practice', activities: ['Build skills', 'Find allies', 'Take small action'] },
        { stage: 'Sustained', activities: ['Coalition', 'Long-term commitment', 'Mentor others'] }
      ]
    },
    {
      id: 'alg2',
      audience: 'White adults doing antiracism work',
      stages: [
        { stage: 'Recognition', activities: ['Recognize whiteness', 'Examine your own racism', 'Confront white fragility'] },
        { stage: 'Listening', activities: ['Listen to BIPOC voices', 'Read BIPOC authors', 'Do not center self'] },
        { stage: 'Action', activities: ['Take risks', 'Use privilege', 'Build coalition'] },
        { stage: 'Sustained', activities: ['Lifelong practice', 'Bring others along', 'Center BIPOC leadership'] }
      ]
    },
    {
      id: 'alg3',
      audience: 'Adults supporting LGBTQ youth',
      stages: [
        { stage: 'Awareness', activities: ['Learn LGBTQ history', 'Understand current issues', 'Examine assumptions'] },
        { stage: 'Affirmation', activities: ['Use correct names and pronouns', 'Create safe spaces', 'Refuse to out anyone'] },
        { stage: 'Advocacy', activities: ['Speak up', 'Build inclusive policies', 'Support GSA'] }
      ]
    },
    {
      id: 'alg4',
      audience: 'Adults supporting disabled students',
      stages: [
        { stage: 'Learning', activities: ['Understand disability rights', 'Learn from disabled people', 'Examine ableism'] },
        { stage: 'Practice', activities: ['Use identity-affirming language', 'Support accommodations', 'Center disabled voices'] },
        { stage: 'Advocacy', activities: ['Push for accessibility', 'Build inclusive culture', 'Engage families'] }
      ]
    },
    {
      id: 'alg5',
      audience: 'Adults addressing class and poverty',
      stages: [
        { stage: 'Awareness', activities: ['Examine class background', 'Understand systemic poverty', 'Notice class in school'] },
        { stage: 'Practice', activities: ['Refuse class mockery', 'Build equitable programs', 'Support marginalized families'] },
        { stage: 'Advocacy', activities: ['Push for universal programs', 'Equity in resources', 'Class-conscious policy'] }
      ]
    }
  ];

  var MORE_AFFIRMATIONS = [
    { id: 'ma1', text: 'I am a witness who chooses to act.' },
    { id: 'ma2', text: 'My voice has value.' },
    { id: 'ma3', text: 'I am building a different world with every small action.' },
    { id: 'ma4', text: 'I can be afraid and brave together.' },
    { id: 'ma5', text: 'I trust my gut about what is right.' },
    { id: 'ma6', text: 'I am allowed to make mistakes and grow.' },
    { id: 'ma7', text: 'I belong in the room where decisions are made.' },
    { id: 'ma8', text: 'I am part of a long line of upstanders.' },
    { id: 'ma9', text: 'My care is action.' },
    { id: 'ma10', text: 'I do not have to do everything to do something.' },
    { id: 'ma11', text: 'I have allies I have not met yet.' },
    { id: 'ma12', text: 'I get to choose who I am every day.' },
    { id: 'ma13', text: 'Silence is a choice I am choosing differently today.' },
    { id: 'ma14', text: 'My discomfort is the work, not the obstacle.' },
    { id: 'ma15', text: 'I deserve rest as part of this practice.' },
    { id: 'ma16', text: 'Small acts add up to movement.' },
    { id: 'ma17', text: 'I am the kind of person who notices.' },
    { id: 'ma18', text: 'My emotions are data, not weakness.' },
    { id: 'ma19', text: 'I can hold accountability and compassion together.' },
    { id: 'ma20', text: 'I am responsible for what I do, not what I cannot control.' },
    { id: 'ma21', text: 'My presence is a contribution.' },
    { id: 'ma22', text: 'I am building community, not just reacting to incidents.' },
    { id: 'ma23', text: 'I get to learn over a lifetime.' },
    { id: 'ma24', text: 'I do not have to be perfect to be useful.' },
    { id: 'ma25', text: 'I am part of something bigger than myself.' },
    { id: 'ma26', text: 'My friends can hold me accountable. So can I.' },
    { id: 'ma27', text: 'I make space for others. They make space for me.' },
    { id: 'ma28', text: 'I am the friend I wish I had had.' },
    { id: 'ma29', text: 'My power grows with practice.' },
    { id: 'ma30', text: 'I refuse to be a bystander to my own life.' },
    { id: 'ma31', text: 'I lift as I climb.' },
    { id: 'ma32', text: 'I am responsible for my repair.' },
    { id: 'ma33', text: 'My liberation is bound to others.' },
    { id: 'ma34', text: 'I act in solidarity, not charity.' },
    { id: 'ma35', text: 'I am part of a movement, not alone.' },
    { id: 'ma36', text: 'My care is political.' },
    { id: 'ma37', text: 'I refuse to look away.' },
    { id: 'ma38', text: 'I am building a culture of care.' },
    { id: 'ma39', text: 'I extend grace to myself as I learn.' },
    { id: 'ma40', text: 'I am exactly where I need to be in my growth.' }
  ];

  var UPSTANDER_LANGUAGE_DEEP = [
    {
      id: 'uld1',
      category: 'Empowering language',
      examples: [
        'You are not alone',
        'Your voice matters',
        'I see you',
        'I hear you',
        'I believe you',
        'It is not your fault',
        'You deserve better',
        'I am with you'
      ]
    },
    {
      id: 'uld2',
      category: 'Accountability language',
      examples: [
        'What did I do?',
        'How did it land?',
        'I am responsible for...',
        'Going forward, I will...',
        'I understand the impact was...',
        'I cannot promise but I will work on...'
      ]
    },
    {
      id: 'uld3',
      category: 'Boundary language',
      examples: [
        'I am not okay with...',
        'Please stop...',
        'I will not...',
        'I need space from...',
        'I am stepping back from...'
      ]
    },
    {
      id: 'uld4',
      category: 'Curiosity language',
      examples: [
        'Tell me more',
        'Help me understand',
        'What was that like for you?',
        'What do you think?',
        'I am wondering about...'
      ]
    },
    {
      id: 'uld5',
      category: 'De-escalation language',
      examples: [
        'I hear you',
        'Lets take a breath',
        'Can we step back?',
        'I want to understand',
        'Lets come back to this when ready'
      ]
    },
    {
      id: 'uld6',
      category: 'Action language',
      examples: [
        'I will...',
        'I commit to...',
        'My next step is...',
        'By [date] I will...',
        'I will report to you on...'
      ]
    },
    {
      id: 'uld7',
      category: 'Reflection language',
      examples: [
        'I am thinking about...',
        'I notice that I...',
        'What I learned was...',
        'I would do differently...',
        'I am proud that...'
      ]
    },
    {
      id: 'uld8',
      category: 'Identity-affirming language',
      examples: [
        'You belong here',
        'Your identity is valid',
        'I see and value who you are',
        'Your story matters',
        'Your truth is your truth'
      ]
    },
    {
      id: 'uld9',
      category: 'Solidarity language',
      examples: [
        'I stand with you',
        'You have my support',
        'I am in this with you',
        'We can do this together',
        'I have your back'
      ]
    },
    {
      id: 'uld10',
      category: 'Repair language',
      examples: [
        'I am sorry',
        'I was wrong',
        'I want to make it right',
        'What do you need?',
        'I am working on...'
      ]
    }
  ];

  var BUILDING_MOVEMENT_DEEP = [
    {
      id: 'bmd1',
      stage: 'Year 1 - Finding your voice',
      activities: [
        'Build self-knowledge',
        'Find first allies',
        'Take first concrete action',
        'Build documentation habit',
        'Connect with mentors'
      ],
      whatItFeelsLike: 'Awkward. Tentative. Brave-feeling.',
      typicalPitfalls: ['Trying too much too soon', 'Quitting after one setback', 'Isolation']
    },
    {
      id: 'bmd2',
      stage: 'Year 2 - Building coalition',
      activities: [
        'Deepen ally relationships',
        'Plan sustained action',
        'Build skills',
        'Mentor newer advocates',
        'Connect with community'
      ],
      whatItFeelsLike: 'More confident. Real wins. Real losses.',
      typicalPitfalls: ['Hero complex', 'Burnout', 'Losing relationships']
    },
    {
      id: 'bmd3',
      stage: 'Year 3 - Sustained leadership',
      activities: [
        'Lead actions',
        'Train new advocates',
        'Engage with systems',
        'Sustain self-care',
        'Build movement'
      ],
      whatItFeelsLike: 'Strong sense of practice. Real impact.',
      typicalPitfalls: ['Burnout', 'Disconnection from base', 'Losing humility']
    },
    {
      id: 'bmd4',
      stage: 'Year 5 - Movement building',
      activities: [
        'Long-term strategy',
        'Generational thinking',
        'Cross-movement work',
        'Mentor next generation',
        'Sustained leadership'
      ],
      whatItFeelsLike: 'Practice is part of you.',
      typicalPitfalls: ['Hierarchy of older over newer', 'Forgetting your origin', 'Hubris']
    },
    {
      id: 'bmd5',
      stage: 'Lifetime - Movement continuance',
      activities: [
        'Pass leadership',
        'Document history',
        'Build institutions',
        'Mentor across generations',
        'Sustain values'
      ],
      whatItFeelsLike: 'You are part of long arc.',
      typicalPitfalls: ['Resentment of new approaches', 'Disengagement', 'Disappointment with progress']
    }
  ];

  var SAFETY_PLANNING_DETAILED = [
    {
      id: 'spd1',
      target: 'Student being bullied',
      components: [
        'Daily schedule with safer locations identified',
        'Specific staff person to check in with',
        'Alternate routes if needed',
        'Lunch and transition plan',
        'Emergency contact procedure',
        'Mental health check-in routine'
      ]
    },
    {
      id: 'spd2',
      target: 'LGBTQ student facing harassment',
      components: [
        'Identity-affirming staff identified',
        'Safe bathroom access',
        'Chosen name/pronouns plan',
        'Mental health support',
        'Family communication plan',
        'Crisis resources'
      ]
    },
    {
      id: 'spd3',
      target: 'Disabled student',
      components: [
        'Accommodation enforcement plan',
        'Backup if accommodation fails',
        'Self-advocacy supports',
        'Family communication',
        'Mental health if needed'
      ]
    },
    {
      id: 'spd4',
      target: 'Student with mental health crisis',
      components: [
        'Crisis contact (988, counselor)',
        'Daily check-in routine',
        'Safe person at school',
        'Medication plan if relevant',
        'Hospital contact if needed',
        'Re-entry plan'
      ]
    },
    {
      id: 'spd5',
      target: 'Student fleeing family violence',
      components: [
        'Emergency contact protocols',
        'Safe adult identified',
        'Domestic violence resource numbers',
        'Safety plan for transitions',
        'CPS involvement if relevant',
        'School-based support'
      ]
    },
    {
      id: 'spd6',
      target: 'Student in upstander work facing retaliation',
      components: [
        'Document everything',
        'Connect with allies',
        'Identify safe spaces',
        'Mental health support',
        'External advocacy if needed',
        'Self-care plan'
      ]
    }
  ];

  var SCENARIO_DECISION_BANK = [
    {
      id: 'sdb1',
      situation: 'You witness a slur',
      options: [
        { choice: 'Direct intervention', risk: 'medium', reward: 'high', notes: 'Best when safe and clear' },
        { choice: 'Distract', risk: 'low', reward: 'medium', notes: 'Good fallback' },
        { choice: 'Tell adult after', risk: 'low', reward: 'medium', notes: 'Pattern documentation' },
        { choice: 'Check on target', risk: 'low', reward: 'medium', notes: 'Always do this part' }
      ]
    },
    {
      id: 'sdb2',
      situation: 'Friend bullying classmate',
      options: [
        { choice: 'Private confrontation', risk: 'medium-high', reward: 'high', notes: 'Friendship preservation possible' },
        { choice: 'Group conversation', risk: 'medium', reward: 'medium', notes: 'Distributes responsibility' },
        { choice: 'Distancing yourself', risk: 'low', reward: 'medium', notes: 'Honors your values' },
        { choice: 'Telling adult', risk: 'medium', reward: 'high', notes: 'When pattern severe' }
      ]
    },
    {
      id: 'sdb3',
      situation: 'Teacher harming student',
      options: [
        { choice: 'In-class redirect', risk: 'medium-high', reward: 'medium', notes: 'Brief diversions can help' },
        { choice: 'Tell counselor', risk: 'low', reward: 'high', notes: 'Most appropriate first step' },
        { choice: 'Tell parent', risk: 'low', reward: 'high', notes: 'Parents can act' },
        { choice: 'File formal complaint', risk: 'medium', reward: 'high', notes: 'For patterns' }
      ]
    },
    {
      id: 'sdb4',
      situation: 'Online harassment of peer',
      options: [
        { choice: 'Screenshot and document', risk: 'none', reward: 'high', notes: 'Always do this' },
        { choice: 'Block and report', risk: 'low', reward: 'medium', notes: 'Platform safety' },
        { choice: 'DM target with support', risk: 'low', reward: 'high', notes: 'Care matters' },
        { choice: 'Tell trusted adult', risk: 'low', reward: 'high', notes: 'Adult intervention' }
      ]
    },
    {
      id: 'sdb5',
      situation: 'Friend disclosing crisis',
      options: [
        { choice: 'Listen without solving', risk: 'low', reward: 'high', notes: 'Most important' },
        { choice: 'Tell trusted adult', risk: 'low', reward: 'high', notes: 'Safety first' },
        { choice: 'Stay with them', risk: 'low', reward: 'high', notes: 'Presence matters' },
        { choice: 'Call 988', risk: 'low', reward: 'high', notes: 'Professional help' }
      ]
    },
    {
      id: 'sdb6',
      situation: 'Sibling teasing target',
      options: [
        { choice: 'Direct confrontation', risk: 'low-medium', reward: 'medium', notes: 'Family relationships' },
        { choice: 'Tell parent', risk: 'low', reward: 'medium', notes: 'Get backup' },
        { choice: 'Family meeting', risk: 'medium', reward: 'high', notes: 'Address pattern' },
        { choice: 'Walk away if escalates', risk: 'low', reward: 'medium', notes: 'Self-care' }
      ]
    },
    {
      id: 'sdb7',
      situation: 'New student being excluded',
      options: [
        { choice: 'Invite them to sit', risk: 'low', reward: 'high', notes: 'Always do this' },
        { choice: 'Connect across groups', risk: 'low', reward: 'high', notes: 'Build network' },
        { choice: 'Tell counselor about pattern', risk: 'low', reward: 'medium', notes: 'For chronic exclusion' }
      ]
    },
    {
      id: 'sdb8',
      situation: 'Group chat going cruel',
      options: [
        { choice: 'Change subject', risk: 'low', reward: 'medium', notes: 'Subtle redirect' },
        { choice: 'Speak up directly', risk: 'medium', reward: 'high', notes: 'Public stand' },
        { choice: 'Leave chat', risk: 'medium', reward: 'high', notes: 'Removes you from harm' },
        { choice: 'DM target with support', risk: 'low', reward: 'high', notes: 'Care for target' }
      ]
    }
  ];

  var REGULATIONS_GUIDE = [
    {
      id: 'rg1',
      regulation: 'OCR Dear Colleague Letter 2010 - bullying based on race',
      year: 2010,
      whatItSays: 'Schools have obligation to respond to race-based harassment under Title VI.',
      practicalUse: 'Cite when reporting racial harassment.'
    },
    {
      id: 'rg2',
      regulation: 'OCR Dear Colleague Letter 2010 - bullying based on disability',
      year: 2010,
      whatItSays: 'Schools have obligation to address disability-based bullying as denial of FAPE.',
      practicalUse: 'Disability-based harassment in school must be addressed.'
    },
    {
      id: 'rg3',
      regulation: 'OCR Dear Colleague Letter 2014 - racial discipline disparities',
      year: 2014,
      whatItSays: 'Schools must address racial disparities in discipline.',
      practicalUse: 'For systemic discipline issues by race.'
    },
    {
      id: 'rg4',
      regulation: 'OCR guidance on Title IX - sexual harassment',
      year: 'Various',
      whatItSays: 'Schools must respond to sexual harassment to maintain Title IX compliance.',
      practicalUse: 'Sexual harassment reports trigger investigation.'
    },
    {
      id: 'rg5',
      regulation: 'OCR guidance - LGBTQ students',
      year: 'Various',
      whatItSays: 'Various federal guidance protecting LGBTQ students from harassment.',
      practicalUse: 'LGBTQ harassment may violate Title IX in some interpretations.'
    },
    {
      id: 'rg6',
      regulation: 'IDEA on bullying and FAPE',
      year: 'Various',
      whatItSays: 'Bullying that interferes with student\'s education can violate FAPE.',
      practicalUse: 'For students with IEPs being bullied.'
    },
    {
      id: 'rg7',
      regulation: 'Stoneman Douglas Public Safety Act',
      year: 2018,
      whatItSays: 'After Parkland shooting, increased mental health and security requirements.',
      practicalUse: 'Mental health resources mandated in schools.'
    },
    {
      id: 'rg8',
      regulation: 'McKinney-Vento Act',
      year: 1987,
      whatItSays: 'Protects homeless students\' educational rights.',
      practicalUse: 'For students experiencing homelessness.'
    },
    {
      id: 'rg9',
      regulation: 'Every Student Succeeds Act',
      year: 2015,
      whatItSays: 'Federal funding tied to school climate including bullying prevention.',
      practicalUse: 'Schools must address bullying for federal funding.'
    },
    {
      id: 'rg10',
      regulation: 'Healthy and Safe Communities Act',
      year: 'Various states',
      whatItSays: 'State-level provisions for mental health and safety in schools.',
      practicalUse: 'Varies by state.'
    }
  ];

  var COMPREHENSIVE_NARRATIVE_PART3 = [
    {
      id: 'cnp1',
      title: 'When I joined a movement',
      narrative: [
        'I was 16 when the racial justice movement intensified at my school.',
        '',
        'I had been a bystander. White. Liberal in name. Quiet in practice.',
        '',
        'A friend invited me to a meeting. I went.',
        '',
        'I listened more than spoke. I learned things about my school I had not seen.',
        '',
        'After a month, I started showing up to actions. Walkouts. Letters. Meetings with administration.',
        '',
        'My white friends got uncomfortable. Some stopped speaking to me.',
        '',
        'My BIPOC friends got closer. I learned to listen better. I learned to follow.',
        '',
        'Over two years, the movement won real change. Curriculum review. Staff training. Counselor hiring.',
        '',
        'I did not lead. I supported. I showed up.',
        '',
        'Years later I am still part of the movement. Different cities. Different issues. Same practice.',
        '',
        'What I tell white people: you do not have to lead. Show up. Listen. Follow. Sustain.'
      ]
    },
    {
      id: 'cnp2',
      title: 'When I refused to look away',
      narrative: [
        'I worked at a fast food job at 17. My manager treated one immigrant coworker badly.',
        '',
        'I started documenting. Dates. Times. What was said.',
        '',
        'After a month I went to my district manager. I brought my documentation.',
        '',
        'The district manager investigated. The store manager was fired.',
        '',
        'My coworker got their hours restored. Got promoted.',
        '',
        'I learned that documentation has power even outside school.',
        '',
        'I tell people in jobs: harassment is illegal. Document. Report. There are protections.'
      ]
    },
    {
      id: 'cnp3',
      title: 'When my own mind was the enemy',
      narrative: [
        'I had been an upstander for years. Then I got depressed.',
        '',
        'I could not show up the way I used to. I was tired. My voice felt smaller.',
        '',
        'I felt like I was failing the work.',
        '',
        'My therapist helped me see that self-care is part of the work. Not separate from.',
        '',
        'I took six months mostly off. I rested. I healed.',
        '',
        'When I came back, I was different. Smaller commitments. More sustainable. More effective.',
        '',
        'I tell young upstanders: you cannot pour from an empty cup. Rest is part of the work.'
      ]
    },
    {
      id: 'cnp4',
      title: 'The friend I lost',
      narrative: [
        'In 12th grade I confronted a close friend about something cruel they had been doing.',
        '',
        'They got defensive. We had a fight.',
        '',
        'We stopped speaking.',
        '',
        'I waited months for them to reach out. They did not.',
        '',
        'I grieved.',
        '',
        'I am 25 now. We have not spoken in 7 years.',
        '',
        'I do not regret confronting them. AND I miss them.',
        '',
        'Both can be true.',
        '',
        'I tell young people: upstander work costs friendships sometimes. The cost is real. Sometimes worth it. Sometimes complicated.'
      ]
    },
    {
      id: 'cnp5',
      title: 'When the harm was my own',
      narrative: [
        'I was 22. I had been an upstander for years. Then I caused harm.',
        '',
        'I made a public comment that hurt a specific person.',
        '',
        'They called me in privately.',
        '',
        'I apologized fully. I did not make excuses.',
        '',
        'I took the public correction.',
        '',
        'I learned that I could be wrong even while doing the work.',
        '',
        'I learned that being called in is a gift.',
        '',
        'I learned that humility is permanent.',
        '',
        'I tell people in advocacy: you will make mistakes. Repair them. Continue.'
      ]
    },
    {
      id: 'cnp6',
      title: 'The student who became the teacher',
      narrative: [
        'I had been bullied through elementary and middle school.',
        '',
        'In high school I started a peer support group.',
        '',
        'In college I trained as a counselor.',
        '',
        'I am 27 now. I am a school counselor at a middle school.',
        '',
        'I see myself in some of the kids who come to me.',
        '',
        'I tell them what no one told me: it is not your fault. You will survive. You will thrive.',
        '',
        'I tell adults: pay attention to the bullied kids. They become the helpers.'
      ]
    }
  ];

  var ANGER_PROCESSING_GUIDES = [
    {
      id: 'apg1',
      title: 'When witnessing injustice makes you angry',
      steps: [
        'Acknowledge your anger',
        'Breathe and ground',
        'Decide: act now or later?',
        'Channel anger into specific action',
        'Care for self after'
      ],
      whatNotToDo: ['Suppress', 'Lash out unfocused', 'Stay activated indefinitely']
    },
    {
      id: 'apg2',
      title: 'When advocating produces anger from others',
      steps: [
        'Stay calm in face of anger',
        'Acknowledge their feeling',
        'Hold your position',
        'Plan for next step',
        'Self-care'
      ],
      whatNotToDo: ['Match their anger', 'Apologize for advocacy', 'Back down']
    },
    {
      id: 'apg3',
      title: 'When systemic failures make you despair',
      steps: [
        'Allow grief',
        'Connect with community',
        'Take small concrete action',
        'Plan for sustained work',
        'Self-care'
      ],
      whatNotToDo: ['Numb out', 'Burn yourself out trying to fix everything', 'Isolate']
    },
    {
      id: 'apg4',
      title: 'When you have made a mistake',
      steps: [
        'Acknowledge fully',
        'Apologize sincerely',
        'Repair what you can',
        'Forgive yourself',
        'Continue'
      ],
      whatNotToDo: ['Spiral into shame', 'Quit advocacy', 'Hide']
    },
    {
      id: 'apg5',
      title: 'When you have been harmed in upstander work',
      steps: [
        'Acknowledge the harm',
        'Connect with mentors',
        'Process emotions',
        'Decide on continuation',
        'Set new boundaries'
      ],
      whatNotToDo: ['Pretend it did not hurt', 'Quit without processing', 'Stay in unsafe space']
    }
  ];

  var YEAR_END_CELEBRATION_PROMPTS = [
    { id: 'yecp1', prompt: 'What is one upstander moment I am proud of this year?', category: 'celebration' },
    { id: 'yecp2', prompt: 'What support helped me show up?', category: 'gratitude' },
    { id: 'yecp3', prompt: 'What mistake taught me the most?', category: 'learning' },
    { id: 'yecp4', prompt: 'Who would I thank specifically for this year?', category: 'gratitude' },
    { id: 'yecp5', prompt: 'What relationship grew through this work?', category: 'community' },
    { id: 'yecp6', prompt: 'What part of myself grew through this work?', category: 'becoming' },
    { id: 'yecp7', prompt: 'What value do I hold more strongly now?', category: 'commitment' },
    { id: 'yecp8', prompt: 'What is one piece of wisdom I would share?', category: 'mentor' },
    { id: 'yecp9', prompt: 'What is one new commitment for next year?', category: 'forward' },
    { id: 'yecp10', prompt: 'What is the long view of this work?', category: 'longview' }
  ];

  var ALL_BYSTANDER_TYPES = [
    {
      id: 'abt1',
      type: 'Aware bystander',
      description: 'Notices what is happening but does not act.',
      whyCommon: 'Most people. Often paralyzed by fear, uncertainty, or social pressure.',
      growthMoves: ['Practice low-risk intervention', 'Build coalition with one ally', 'Document observations']
    },
    {
      id: 'abt2',
      type: 'Unaware bystander',
      description: 'Does not even notice harm happening.',
      whyCommon: 'Distraction, habituation, or privilege filters.',
      growthMoves: ['Build noticing muscle', 'Slow down', 'Pay attention to who is alone']
    },
    {
      id: 'abt3',
      type: 'Reluctant bystander',
      description: 'Notices and wants to act but does not.',
      whyCommon: 'Fear of cost.',
      growthMoves: ['Practice acting on small things', 'Build muscle memory', 'Find allies']
    },
    {
      id: 'abt4',
      type: 'Justifying bystander',
      description: 'Notices but tells self it is not their place.',
      whyCommon: 'Moral disengagement.',
      growthMoves: ['Challenge justifications', 'Recognize it IS your place', 'Build empathy']
    },
    {
      id: 'abt5',
      type: 'Participating bystander',
      description: 'Laughs along or even joins in.',
      whyCommon: 'Social pressure, fitting in.',
      growthMoves: ['Notice when you laugh', 'Refuse to participate', 'Address with friends']
    },
    {
      id: 'abt6',
      type: 'Helpful bystander',
      description: 'Acts to support target after harm.',
      whyCommon: 'Empathy. Often safer than direct intervention.',
      growthMoves: ['Continue support', 'Build to direct intervention', 'Network of helpers']
    },
    {
      id: 'abt7',
      type: 'Reporting bystander',
      description: 'Tells trusted adults what they observed.',
      whyCommon: 'Use of system. Often appropriate.',
      growthMoves: ['Document well', 'Follow up', 'Escalate when needed']
    },
    {
      id: 'abt8',
      type: 'Confronting bystander',
      description: 'Speaks directly to harmer.',
      whyCommon: 'Higher risk. Direct.',
      growthMoves: ['Build skill', 'Choose moments wisely', 'Plan for response']
    },
    {
      id: 'abt9',
      type: 'Organizing bystander',
      description: 'Builds coalition for systemic change.',
      whyCommon: 'Sustained work.',
      growthMoves: ['Build relationships', 'Plan actions', 'Sustain over time']
    },
    {
      id: 'abt10',
      type: 'Witness bystander',
      description: 'Stays present without intervening but bears witness.',
      whyCommon: 'When intervention is impossible but presence matters.',
      growthMoves: ['Use presence as advocacy', 'Connect with target after', 'Document for record']
    }
  ];

  var COMMUNITY_BUILDING_DEEPER = [
    {
      id: 'cbdr1',
      type: 'Affinity group',
      purpose: 'People with shared identity come together for support',
      examples: ['BIPOC student group', 'LGBTQ student group', 'Religious affinity', 'Cultural identity'],
      benefits: ['Safe space', 'Shared analysis', 'Mutual support', 'Community building'],
      considerations: ['Confidentiality', 'Group norms', 'Sustainability']
    },
    {
      id: 'cbdr2',
      type: 'Cross-identity coalition',
      purpose: 'Multiple identities working together',
      examples: ['Multicultural alliance', 'Intersectional coalition', 'Issue-based coalition'],
      benefits: ['Power', 'Solidarity', 'Coalition learning'],
      considerations: ['Center most impacted', 'Power dynamics', 'Mutual learning']
    },
    {
      id: 'cbdr3',
      type: 'Issue-based coalition',
      purpose: 'Working on specific issue',
      examples: ['Anti-bullying coalition', 'Mental health awareness', 'Disability access'],
      benefits: ['Concrete change', 'Skill-building', 'Visible action'],
      considerations: ['Focus vs scope', 'Sustainability', 'Coalition member needs']
    },
    {
      id: 'cbdr4',
      type: 'Mentorship program',
      purpose: 'Older students supporting younger',
      examples: ['Big Brother Big Sister', 'School mentorship', 'Peer mentoring'],
      benefits: ['Both grow', 'Skills transfer', 'Community building'],
      considerations: ['Training', 'Boundaries', 'Sustainability']
    },
    {
      id: 'cbdr5',
      type: 'Peer support group',
      purpose: 'Mutual support among peers',
      examples: ['Grief group', 'Mental health group', 'Recovery group'],
      benefits: ['Shared experience', 'Mutual aid', 'Community'],
      considerations: ['Confidentiality', 'Facilitator quality', 'Boundaries']
    },
    {
      id: 'cbdr6',
      type: 'Student-led organizing',
      purpose: 'Students leading change',
      examples: ['Student government', 'Student union', 'Issue-based organizing'],
      benefits: ['Skill-building', 'Real power', 'Voice'],
      considerations: ['Adult allies vs. control', 'Sustainability', 'Training']
    },
    {
      id: 'cbdr7',
      type: 'Inter-school coalition',
      purpose: 'Across schools or districts',
      examples: ['District-wide student coalition', 'State-wide LGBTQ network', 'National organizing'],
      benefits: ['Scale', 'Resource sharing', 'Bigger change'],
      considerations: ['Coordination', 'Local autonomy', 'Sustainability']
    },
    {
      id: 'cbdr8',
      type: 'Community-school partnership',
      purpose: 'Schools and outside community working together',
      examples: ['Restorative justice organization', 'Community center', 'Cultural organization'],
      benefits: ['Resources', 'Expertise', 'Community connection'],
      considerations: ['Trust-building', 'Resource sharing', 'Long-term commitment']
    }
  ];

  var CONTEXTUAL_SCRIPT_LIBRARY = [
    {
      id: 'csl1',
      context: 'In hallway when you hear a slur',
      scripts: [
        '"Hey, that word is not okay."',
        '"I do not want to hear that word."',
        '"Knock it off."',
        '"That is racist/homophobic/etc. Stop."'
      ]
    },
    {
      id: 'csl2',
      context: 'In classroom when teacher mocks student',
      scripts: [
        '"Mr/Ms ___, could we move on to ___?"',
        '"I had a question about ___."',
        '[Engage to break pattern]',
        '[After class] "Could I talk to you about something I noticed?"'
      ]
    },
    {
      id: 'csl3',
      context: 'In group chat going cruel',
      scripts: [
        '"I am stepping out of this. Lets ease up."',
        '"This is going hard. Lets change subject."',
        '"I am out."',
        '[DM target] "I saw the chat. I am sorry. Are you ok?"'
      ]
    },
    {
      id: 'csl4',
      context: 'At lunch when someone is excluded',
      scripts: [
        '"Hey come sit here, I will move my bag."',
        '"Want to sit with us?"',
        '[Move yourself to sit with excluded person]',
        '"Lets all sit together."'
      ]
    },
    {
      id: 'csl5',
      context: 'With family at dinner with harmful joke',
      scripts: [
        '"That joke is not funny."',
        '"Lets pick a different topic."',
        '"I do not laugh at jokes that hurt people."',
        '"I am going to step away for a few minutes."'
      ]
    },
    {
      id: 'csl6',
      context: 'On bus with bullying',
      scripts: [
        '[Move to sit by target]',
        '[Tell driver]',
        '[Tell counselor next day]',
        '[Be witness for target]'
      ]
    },
    {
      id: 'csl7',
      context: 'Online seeing harassment',
      scripts: [
        '[Screenshot]',
        '[Block harasser]',
        '[DM target with care]',
        '[Tell trusted adult]'
      ]
    },
    {
      id: 'csl8',
      context: 'At sports practice with hazing',
      scripts: [
        '"I am not doing that."',
        '"Lets not do this."',
        '[Tell coach or AD privately]',
        '[Quit if pattern]'
      ]
    },
    {
      id: 'csl9',
      context: 'At store witnessing harassment',
      scripts: [
        '[Approach target] "Excuse me, can you help me find something?"',
        '[Stand near target]',
        '[Tell store security]',
        '[Document if safe]'
      ]
    },
    {
      id: 'csl10',
      context: 'On phone with friend in crisis',
      scripts: [
        '"I hear you. I am here."',
        '"You are not alone."',
        '"Can I help you call someone?"',
        '"Lets call 988 together if you want."'
      ]
    },
    {
      id: 'csl11',
      context: 'In meeting with administrator about pattern',
      scripts: [
        '"I have documented multiple incidents. Here they are."',
        '"I would like investigation and timeline."',
        '"I would like written response."',
        '"I will follow up in ___ days."'
      ]
    },
    {
      id: 'csl12',
      context: 'In restorative dialogue',
      scripts: [
        '"What I observed was ___."',
        '"The impact on me was ___."',
        '"What I need is ___."',
        '"I can commit to ___."'
      ]
    },
    {
      id: 'csl13',
      context: 'Apologizing to someone you harmed',
      scripts: [
        '"I want to apologize for ___."',
        '"What I did was wrong."',
        '"I understand the impact has been ___."',
        '"What do you need from me?"'
      ]
    },
    {
      id: 'csl14',
      context: 'Receiving apology from someone who harmed you',
      scripts: [
        '"I hear that. I am still processing."',
        '"Thanks for telling me."',
        '"I am not ready to say it is okay."',
        '"I need ___ from you going forward."'
      ]
    },
    {
      id: 'csl15',
      context: 'Setting boundary with someone causing harm',
      scripts: [
        '"I am not okay with ___. Please stop."',
        '"If this continues, I will ___."',
        '"I am stepping back from ___."',
        '"I am not available for this conversation."'
      ]
    }
  ];

  var DEEP_PRACTICE_PROMPTS = [
    { id: 'dpp1', prompt: 'Describe a moment when you were a bystander. What did you observe and what did you do?', depth: 'reflection' },
    { id: 'dpp2', prompt: 'Describe a moment when you were an upstander. What did you do and what did you feel?', depth: 'celebration' },
    { id: 'dpp3', prompt: 'When have you been the target? What did you need from witnesses?', depth: 'empathy' },
    { id: 'dpp4', prompt: 'When have you been the harmer? What would you do differently?', depth: 'accountability' },
    { id: 'dpp5', prompt: 'What makes you stay silent?', depth: 'inner work' },
    { id: 'dpp6', prompt: 'What makes you speak up?', depth: 'inner work' },
    { id: 'dpp7', prompt: 'Who in your life is a role model for upstander work?', depth: 'mentor' },
    { id: 'dpp8', prompt: 'What is one practice you want to build?', depth: 'commitment' },
    { id: 'dpp9', prompt: 'How does your identity shape your upstander work?', depth: 'identity' },
    { id: 'dpp10', prompt: 'How does your privilege shape your upstander work?', depth: 'identity' },
    { id: 'dpp11', prompt: 'Who are your allies?', depth: 'community' },
    { id: 'dpp12', prompt: 'Who do you ally with that you may not see as allies?', depth: 'community' },
    { id: 'dpp13', prompt: 'What would you say to your past self?', depth: 'mentor self' },
    { id: 'dpp14', prompt: 'What do you wish someone had said to you?', depth: 'wish' },
    { id: 'dpp15', prompt: 'What is the most courageous thing you have done?', depth: 'celebration' },
    { id: 'dpp16', prompt: 'What is the most courageous thing you have witnessed?', depth: 'inspiration' },
    { id: 'dpp17', prompt: 'What is one thing you would change about your school?', depth: 'systemic' },
    { id: 'dpp18', prompt: 'What is one thing you would change about your family?', depth: 'systemic' },
    { id: 'dpp19', prompt: 'What is one thing you would change about the world?', depth: 'systemic' },
    { id: 'dpp20', prompt: 'Who needs you to speak up for them?', depth: 'action' },
    { id: 'dpp21', prompt: 'Who needs you to listen?', depth: 'action' },
    { id: 'dpp22', prompt: 'Who needs you to apologize?', depth: 'action' },
    { id: 'dpp23', prompt: 'What conversation are you avoiding?', depth: 'specific' },
    { id: 'dpp24', prompt: 'What boundary do you need to set?', depth: 'specific' },
    { id: 'dpp25', prompt: 'What truth do you need to tell?', depth: 'specific' },
    { id: 'dpp26', prompt: 'What old story do you need to leave behind?', depth: 'release' },
    { id: 'dpp27', prompt: 'What new story do you want to inhabit?', depth: 'becoming' },
    { id: 'dpp28', prompt: 'What is your superpower in upstander work?', depth: 'strength' },
    { id: 'dpp29', prompt: 'What is your growing edge?', depth: 'growth' },
    { id: 'dpp30', prompt: 'How will you sustain this work over a lifetime?', depth: 'long view' },
    { id: 'dpp31', prompt: 'What has upstander work cost you?', depth: 'honest' },
    { id: 'dpp32', prompt: 'What has upstander work given you?', depth: 'gratitude' },
    { id: 'dpp33', prompt: 'What community do you need that you do not have?', depth: 'longing' },
    { id: 'dpp34', prompt: 'What support do you need that you have not asked for?', depth: 'asking' },
    { id: 'dpp35', prompt: 'What support could you offer that you have not?', depth: 'giving' },
    { id: 'dpp36', prompt: 'When was the last time you cried about injustice?', depth: 'emotional' },
    { id: 'dpp37', prompt: 'When was the last time you laughed about something joyful?', depth: 'joy' },
    { id: 'dpp38', prompt: 'When was the last time you rested?', depth: 'sustainability' },
    { id: 'dpp39', prompt: 'When was the last time you celebrated?', depth: 'sustainability' },
    { id: 'dpp40', prompt: 'When was the last time you grieved?', depth: 'emotional' },
    { id: 'dpp41', prompt: 'What change have you helped make happen?', depth: 'celebration' },
    { id: 'dpp42', prompt: 'What change has not happened that you wanted?', depth: 'realistic' },
    { id: 'dpp43', prompt: 'What change is still possible?', depth: 'hope' },
    { id: 'dpp44', prompt: 'Who has helped you become who you are?', depth: 'gratitude' },
    { id: 'dpp45', prompt: 'Who are you helping become who they are?', depth: 'generative' },
    { id: 'dpp46', prompt: 'What practice has helped you most?', depth: 'reflection' },
    { id: 'dpp47', prompt: 'What practice has been hardest?', depth: 'honest' },
    { id: 'dpp48', prompt: 'What is your superpower?', depth: 'strength' },
    { id: 'dpp49', prompt: 'What is your kryptonite?', depth: 'awareness' },
    { id: 'dpp50', prompt: 'How are you not alone in this work?', depth: 'community' }
  ];

  var YEAR_LONG_CURRICULUM = [
    {
      id: 'ylc1',
      month: 'September',
      theme: 'Foundations',
      weeks: [
        { week: 1, focus: 'What is upstander work?', activities: ['Welcome', 'Define terms', 'Self-assess', 'Goal-set'] },
        { week: 2, focus: 'Bystander effect', activities: ['Research', 'Personal examples', 'Identify barriers'] },
        { week: 3, focus: 'Reading the room', activities: ['Notice exercises', 'Video analysis', 'Patterns'] },
        { week: 4, focus: 'Personal commitment', activities: ['Self-reflection', 'Set personal practice', 'Connect with mentor'] }
      ]
    },
    {
      id: 'ylc2',
      month: 'October',
      theme: 'Speaking up',
      weeks: [
        { week: 1, focus: 'Verbal intervention', activities: ['Practice phrases', 'Role-play', 'Build confidence'] },
        { week: 2, focus: 'Direct confrontation', activities: ['Scenarios', 'Role-play', 'Personal application'] },
        { week: 3, focus: 'Indirect intervention', activities: ['4 Ds framework', 'Practice each D', 'Plan use'] },
        { week: 4, focus: 'Reporting to adults', activities: ['Identify trusted adults', 'Practice reporting', 'Set up systems'] }
      ]
    },
    {
      id: 'ylc3',
      month: 'November',
      theme: 'Supporting targets',
      weeks: [
        { week: 1, focus: 'Listening skills', activities: ['Active listening practice', 'No-fix listening'] },
        { week: 2, focus: 'Validation', activities: ['Validation language', 'Refusing to minimize'] },
        { week: 3, focus: 'Ongoing care', activities: ['Check-in protocols', 'Resource sharing', 'Long-term support'] },
        { week: 4, focus: 'Boundaries in support', activities: ['Sustainable care', 'Self-care', 'Limits of support'] }
      ]
    },
    {
      id: 'ylc4',
      month: 'December',
      theme: 'Identity-aware work',
      weeks: [
        { week: 1, focus: 'Intersectionality', activities: ['Framework intro', 'Identity mapping', 'Privilege examination'] },
        { week: 2, focus: 'Race', activities: ['Racism research', 'Anti-racist practice', 'Coalition'] },
        { week: 3, focus: 'Gender and sexuality', activities: ['LGBTQ histories', 'Allyship', 'Coalition'] },
        { week: 4, focus: 'Disability', activities: ['Disability rights', 'Allyship', 'Coalition'] }
      ]
    },
    {
      id: 'ylc5',
      month: 'January',
      theme: 'Repair',
      weeks: [
        { week: 1, focus: 'Apology basics', activities: ['What real apology is', '5 parts of apology'] },
        { week: 2, focus: 'Apology practice', activities: ['Identify apologies you owe', 'Plan conversations'] },
        { week: 3, focus: 'Restorative dialogue', activities: ['Framework', 'Role-play', 'Application'] },
        { week: 4, focus: 'Long-term repair', activities: ['Sustained change', 'Following through', 'Time'] }
      ]
    },
    {
      id: 'ylc6',
      month: 'February',
      theme: 'Coalition building',
      weeks: [
        { week: 1, focus: 'Finding allies', activities: ['Map allies', 'Build relationships'] },
        { week: 2, focus: 'Shared analysis', activities: ['Build common understanding', 'Set goals'] },
        { week: 3, focus: 'Action planning', activities: ['Plan specific action', 'Assign roles'] },
        { week: 4, focus: 'Taking action', activities: ['Execute', 'Document', 'Adjust'] }
      ]
    },
    {
      id: 'ylc7',
      month: 'March',
      theme: 'Systemic change',
      weeks: [
        { week: 1, focus: 'Understanding systems', activities: ['Map school systems', 'Identify levers'] },
        { week: 2, focus: 'Policy change', activities: ['Existing policies', 'Proposed changes'] },
        { week: 3, focus: 'Administration engagement', activities: ['Meeting with leaders', 'Pushing for change'] },
        { week: 4, focus: 'Multi-level advocacy', activities: ['District', 'State', 'Federal'] }
      ]
    },
    {
      id: 'ylc8',
      month: 'April',
      theme: 'Sustaining work',
      weeks: [
        { week: 1, focus: 'Self-care', activities: ['Build personal plan', 'Daily practices'] },
        { week: 2, focus: 'Community care', activities: ['Build mutual support', 'Rotate burden'] },
        { week: 3, focus: 'Avoiding burnout', activities: ['Warning signs', 'Recovery practices'] },
        { week: 4, focus: 'Long-term commitment', activities: ['Year planning', 'Career considerations'] }
      ]
    },
    {
      id: 'ylc9',
      month: 'May',
      theme: 'Mentorship',
      weeks: [
        { week: 1, focus: 'Finding mentors', activities: ['Identify mentors', 'Reach out'] },
        { week: 2, focus: 'Being a mentor', activities: ['Identify mentees', 'Establish relationship'] },
        { week: 3, focus: 'Building generations', activities: ['Pass leadership', 'Train new leaders'] },
        { week: 4, focus: 'Long view', activities: ['Generational thinking', 'Movement building'] }
      ]
    },
    {
      id: 'ylc10',
      month: 'June',
      theme: 'Reflection',
      weeks: [
        { week: 1, focus: 'Year review', activities: ['What grew?', 'What is next?'] },
        { week: 2, focus: 'Celebrating wins', activities: ['Document accomplishments', 'Honor effort'] },
        { week: 3, focus: 'Processing setbacks', activities: ['Learn from failure', 'Adjust'] },
        { week: 4, focus: 'Forward planning', activities: ['Next year focus', 'Commitments'] }
      ]
    }
  ];

  var FILM_RECOMMENDATIONS = [
    { id: 'film1', title: 'Crip Camp', year: 2020, topic: 'Disability rights movement origins', notes: 'Documentary about Camp Jened. Foundation of disability rights.' },
    { id: 'film2', title: '13th', year: 2016, topic: 'Mass incarceration, race', notes: 'Documentary connecting Constitution\'s 13th amendment to current incarceration.' },
    { id: 'film3', title: 'I Am Not Your Negro', year: 2016, topic: 'James Baldwin, race', notes: 'Documentary using Baldwin\'s unfinished manuscript.' },
    { id: 'film4', title: 'When They See Us', year: 2019, topic: 'Wrongful conviction, race', notes: 'Limited series about Central Park Five.' },
    { id: 'film5', title: 'The 1619 Project', year: 2023, topic: 'American history through Black perspective', notes: 'Documentary series.' },
    { id: 'film6', title: 'Disclosure', year: 2020, topic: 'Trans representation', notes: 'Documentary on trans representation in film.' },
    { id: 'film7', title: 'Audrie & Daisy', year: 2016, topic: 'Sexual assault, cyberbullying', notes: 'Documentary about cyberbullying after sexual assault.' },
    { id: 'film8', title: 'Bully', year: 2011, topic: 'Bullying documentary', notes: 'Documentary following targets of bullying.' },
    { id: 'film9', title: 'Selma', year: 2014, topic: 'Civil rights organizing', notes: 'Dramatic film about Selma marches.' },
    { id: 'film10', title: 'Just Mercy', year: 2019, topic: 'Wrongful conviction', notes: 'Bryan Stevenson story dramatized.' },
    { id: 'film11', title: 'The Hate U Give', year: 2018, topic: 'Police violence, voice', notes: 'Adaptation of Angie Thomas novel.' },
    { id: 'film12', title: 'Moonlight', year: 2016, topic: 'Black, queer, masculinity', notes: 'Bullying, identity, growing up.' },
    { id: 'film13', title: 'Eighth Grade', year: 2018, topic: 'Middle school anxiety', notes: 'Honest portrayal of middle school social anxiety.' },
    { id: 'film14', title: 'Lady Bird', year: 2017, topic: 'High school, mother-daughter', notes: 'Coming of age.' },
    { id: 'film15', title: 'Tangerine', year: 2015, topic: 'Trans women of color', notes: 'Friendship and resilience.' },
    { id: 'film16', title: 'Pose', year: 2018, topic: 'Trans, ballroom, AIDS', notes: 'TV series. Trans women of color in 1980s NYC.' },
    { id: 'film17', title: 'Schitt\'s Creek', year: 2015, topic: 'LGBTQ acceptance', notes: 'TV series with model of family acceptance.' },
    { id: 'film18', title: 'Atypical', year: 2017, topic: 'Autism representation', notes: 'TV series with autistic protagonist.' },
    { id: 'film19', title: 'Special', year: 2019, topic: 'Disability, LGBTQ', notes: 'TV series with disabled gay creator.' },
    { id: 'film20', title: 'Heartstopper', year: 2022, topic: 'LGBTQ youth', notes: 'TV series. Coming out, friendship, identity.' }
  ];

  var PODCAST_RECOMMENDATIONS = [
    { id: 'pod1', title: 'Code Switch', host: 'NPR', topic: 'Race in America', notes: 'Smart, accessible analysis of race.' },
    { id: 'pod2', title: 'Disability Visibility', host: 'Alice Wong', topic: 'Disability culture', notes: 'Disability-led conversations.' },
    { id: 'pod3', title: 'About Race', host: 'Reni Eddo-Lodge', topic: 'British anti-racism', notes: 'Cross-cultural perspective.' },
    { id: 'pod4', title: 'Throughline', host: 'NPR', topic: 'History context', notes: 'Connecting current events to history.' },
    { id: 'pod5', title: '1A', host: 'NPR', topic: 'Current events', notes: 'Diverse perspectives.' },
    { id: 'pod6', title: 'Pod Save America', host: 'Crooked Media', topic: 'Politics', notes: 'Progressive politics.' },
    { id: 'pod7', title: 'How to Citizen', host: 'Baratunde Thurston', topic: 'Citizenship as practice', notes: 'Active citizenship.' },
    { id: 'pod8', title: 'On Being', host: 'Krista Tippett', topic: 'Faith, life, meaning', notes: 'Deep conversations.' },
    { id: 'pod9', title: 'The Stoop', host: 'Hana Baba and Leila Day', topic: 'Black diasporic stories', notes: 'Voices across diaspora.' },
    { id: 'pod10', title: 'Latino USA', host: 'NPR', topic: 'Latine communities', notes: 'Long-running Latine focused.' }
  ];

  var BOOK_RECOMMENDATIONS = [
    {
      id: 'br1',
      title: 'The 57 Bus',
      author: 'Dashka Slater',
      year: 2017,
      topic: 'Intersection of race, gender, class, bullying, justice',
      whyItMatters: 'True story of teen who set fire to nonbinary teen on bus. Complex analysis.',
      useFor: 'High school discussion. Restorative justice analysis.'
    },
    {
      id: 'br2',
      title: 'The Boy Who Was Raised as a Dog',
      author: 'Bruce Perry',
      year: 2006,
      topic: 'Childhood trauma',
      whyItMatters: 'Trauma-informed framework for understanding behavior.',
      useFor: 'Educator training. Understanding root causes.'
    },
    {
      id: 'br3',
      title: 'Pushout',
      author: 'Monique Morris',
      year: 2016,
      topic: 'Black girls and school discipline',
      whyItMatters: 'Examines criminalization of Black girls in schools.',
      useFor: 'High school discussion. Equity work.'
    },
    {
      id: 'br4',
      title: 'The Hate U Give',
      author: 'Angie Thomas',
      year: 2017,
      topic: 'Police violence, code-switching, upstander',
      whyItMatters: 'Black teen witnesses police violence and finds her voice.',
      useFor: 'High school literature and discussion.'
    },
    {
      id: 'br5',
      title: 'Speak',
      author: 'Laurie Halse Anderson',
      year: 1999,
      topic: 'Sexual assault, silence, voice',
      whyItMatters: 'Survivor finds voice after rape.',
      useFor: 'High school literature.'
    },
    {
      id: 'br6',
      title: 'Wonder',
      author: 'R.J. Palacio',
      year: 2012,
      topic: 'Disability, bullying, kindness',
      whyItMatters: 'Multiple perspectives on bullying of disabled student.',
      useFor: 'Middle school literature.'
    },
    {
      id: 'br7',
      title: 'Long Way Down',
      author: 'Jason Reynolds',
      year: 2017,
      topic: 'Violence, choice, reckoning',
      whyItMatters: 'Verse novel about cycle of violence.',
      useFor: 'High school literature and discussion.'
    },
    {
      id: 'br8',
      title: 'Disability Visibility',
      author: 'Alice Wong (editor)',
      year: 2020,
      topic: 'Disability identity, intersectional',
      whyItMatters: 'First-person disability stories.',
      useFor: 'High school discussion.'
    },
    {
      id: 'br9',
      title: 'The Other Wes Moore',
      author: 'Wes Moore',
      year: 2010,
      topic: 'Choice, system, circumstance',
      whyItMatters: 'Two men with same name, different outcomes. System and choice.',
      useFor: 'High school discussion.'
    },
    {
      id: 'br10',
      title: 'Just Mercy',
      author: 'Bryan Stevenson',
      year: 2014,
      topic: 'Justice, mercy, system',
      whyItMatters: 'Each of us is more than the worst thing we have done.',
      useFor: 'High school and beyond.'
    },
    {
      id: 'br11',
      title: 'Between the World and Me',
      author: 'Ta-Nehisi Coates',
      year: 2015,
      topic: 'Race, body, history',
      whyItMatters: 'Letter to son about being Black in America.',
      useFor: 'High school discussion.'
    },
    {
      id: 'br12',
      title: 'Sister Outsider',
      author: 'Audre Lorde',
      year: 1984,
      topic: 'Identity, silence, voice',
      whyItMatters: 'Foundational essays on identity and resistance.',
      useFor: 'High school and beyond.'
    },
    {
      id: 'br13',
      title: 'The Color Purple',
      author: 'Alice Walker',
      year: 1982,
      topic: 'Resilience, sisterhood, voice',
      whyItMatters: 'Voice across abuse and silence.',
      useFor: 'High school literature.'
    },
    {
      id: 'br14',
      title: 'Beloved',
      author: 'Toni Morrison',
      year: 1987,
      topic: 'Trauma, memory, healing',
      whyItMatters: 'Generational trauma and healing.',
      useFor: 'High school literature.'
    },
    {
      id: 'br15',
      title: 'I Know Why the Caged Bird Sings',
      author: 'Maya Angelou',
      year: 1969,
      topic: 'Childhood trauma, voice, resilience',
      whyItMatters: 'Finding voice after trauma.',
      useFor: 'High school literature.'
    },
    {
      id: 'br16',
      title: 'The Color of Law',
      author: 'Richard Rothstein',
      year: 2017,
      topic: 'Systemic racism in housing',
      whyItMatters: 'Foundational understanding of systemic harm.',
      useFor: 'High school history.'
    },
    {
      id: 'br17',
      title: 'White Fragility',
      author: 'Robin DiAngelo',
      year: 2018,
      topic: 'White resistance to discussing race',
      whyItMatters: 'For white people doing the work.',
      useFor: 'Educator training.'
    },
    {
      id: 'br18',
      title: 'So You Want to Talk About Race',
      author: 'Ijeoma Oluo',
      year: 2018,
      topic: 'Practical guide to race conversations',
      whyItMatters: 'Direct, accessible.',
      useFor: 'Educator training and discussion.'
    },
    {
      id: 'br19',
      title: 'How to Be an Antiracist',
      author: 'Ibram X. Kendi',
      year: 2019,
      topic: 'Antiracist framework',
      whyItMatters: 'Frame for action.',
      useFor: 'Educator and student training.'
    },
    {
      id: 'br20',
      title: 'Pedagogy of the Oppressed',
      author: 'Paulo Freire',
      year: 1968,
      topic: 'Liberation education',
      whyItMatters: 'Foundational educator framework.',
      useFor: 'Educator training.'
    }
  ];

  var DETAILED_PSYCH_RESEARCH = [
    {
      id: 'dpr1',
      researcher: 'Dan Olweus',
      finding: 'Defined modern understanding of bullying as repeated aggressive behavior with power imbalance.',
      year: 'Various 1970s-2000s',
      impact: 'Foundation of bullying research. Olweus Bullying Prevention Program adopted globally.',
      practicalApplication: 'Most school anti-bullying programs trace to Olweus framework.'
    },
    {
      id: 'dpr2',
      researcher: 'Bibb Latane and John Darley',
      finding: 'Demonstrated bystander effect. Showed that group size affects helping behavior.',
      year: '1968',
      impact: 'Foundation of bystander research. Inspired training programs worldwide.',
      practicalApplication: 'Bystander training pushes back against bystander effect.'
    },
    {
      id: 'dpr3',
      researcher: 'Solomon Asch',
      finding: 'Demonstrated conformity. People defer to group consensus even when wrong.',
      year: '1951',
      impact: 'Foundation for understanding why bystanders stay silent.',
      practicalApplication: 'Build independent judgment muscle.'
    },
    {
      id: 'dpr4',
      researcher: 'Albert Bandura',
      finding: 'Moral disengagement: how people justify harm through dehumanization, blame-shifting.',
      year: '1986',
      impact: 'Understanding of how ordinary people can justify harm.',
      practicalApplication: 'Recognize and counter moral disengagement.'
    },
    {
      id: 'dpr5',
      researcher: 'Melvin Lerner',
      finding: 'Just world hypothesis: belief that the world is fair leads to victim-blaming.',
      year: '1980',
      impact: 'Understanding why we blame victims.',
      practicalApplication: 'Counter just-world thinking explicitly.'
    },
    {
      id: 'dpr6',
      researcher: 'Henri Tajfel',
      finding: 'Minimal group paradigm. People favor in-group over out-group even when group is arbitrary.',
      year: '1971',
      impact: 'Understanding of in-group bias.',
      practicalApplication: 'Build broader in-groups. Bridge across difference.'
    },
    {
      id: 'dpr7',
      researcher: 'Bessel van der Kolk',
      finding: 'Body Keeps the Score. Trauma affects body and behavior long-term.',
      year: '2014',
      impact: 'Foundation of trauma-informed approaches.',
      practicalApplication: 'Trauma-informed schools improve outcomes.'
    },
    {
      id: 'dpr8',
      researcher: 'Vincent Felitti',
      finding: 'ACE study showed link between childhood adversity and adult outcomes.',
      year: '1998',
      impact: 'Understanding of long-term impact of harm.',
      practicalApplication: 'Address childhood harm to prevent adult outcomes.'
    },
    {
      id: 'dpr9',
      researcher: 'Daniel Batson',
      finding: 'Empathic concern vs personal distress affects helping.',
      year: '1991',
      impact: 'Understanding of why some help and some flee.',
      practicalApplication: 'Build empathic concern through training.'
    },
    {
      id: 'dpr10',
      researcher: 'Martin Hoffman',
      finding: 'Empathy development across childhood. Empathy is taught.',
      year: '1984',
      impact: 'Understanding that empathy is built.',
      practicalApplication: 'Teach empathy explicitly in schools.'
    },
    {
      id: 'dpr11',
      researcher: 'Carol Dweck',
      finding: 'Growth mindset improves outcomes. Fixed mindset limits.',
      year: 'Various',
      impact: 'Understanding of how mindset shapes behavior.',
      practicalApplication: 'Build growth mindset around upstander work.'
    },
    {
      id: 'dpr12',
      researcher: 'Lisa Feldman Barrett',
      finding: 'Emotions are constructed, not universal.',
      year: 'Various 2000s-2010s',
      impact: 'New understanding of emotion and behavior.',
      practicalApplication: 'Teach emotion vocabulary and regulation.'
    },
    {
      id: 'dpr13',
      researcher: 'Brene Brown',
      finding: 'Vulnerability is the path to courage and connection.',
      year: 'Various',
      impact: 'Popular understanding of courage.',
      practicalApplication: 'Build courage through vulnerability.'
    },
    {
      id: 'dpr14',
      researcher: 'Cherrie Moraga, Gloria Anzaldua',
      finding: 'This Bridge Called My Back. Multiply marginalized perspectives.',
      year: '1981',
      impact: 'Foundation of intersectional analysis.',
      practicalApplication: 'Center multiply marginalized voices.'
    },
    {
      id: 'dpr15',
      researcher: 'Kimberle Crenshaw',
      finding: 'Coined "intersectionality." Black women face combined harms.',
      year: '1989',
      impact: 'Framework for understanding multiple identities.',
      practicalApplication: 'Apply intersectional analysis to all work.'
    }
  ];

  var ANTI_BULLYING_LAWS_BY_STATE = [
    { id: 'abls1', state: 'Maine', law: '20-A MRSA § 6554', year: 2012, requirements: ['Schools must have anti-bullying policy', 'Investigation procedures required', 'Annual training', 'Reporting protocols', 'Disciplinary procedures'] },
    { id: 'abls2', state: 'New Hampshire', law: 'RSA 193-F', year: 2010, requirements: ['Anti-bullying policy required', 'Cyberbullying covered', 'Reporting and investigation', 'Disciplinary procedures'] },
    { id: 'abls3', state: 'Vermont', law: '16 V.S.A. § 565', year: 2004, requirements: ['Anti-harassment policy', 'Annual training', 'Investigation protocols', 'Reporting'] },
    { id: 'abls4', state: 'Massachusetts', law: 'MGL Ch 71 § 37O', year: 2010, requirements: ['Bullying prevention plan', 'Annual training', 'Reporting', 'Investigation', 'Disciplinary procedures'] },
    { id: 'abls5', state: 'Connecticut', law: 'CGS § 10-222d', year: 2008, requirements: ['Anti-bullying policy', 'Reporting and investigation', 'Disciplinary procedures'] },
    { id: 'abls6', state: 'Rhode Island', law: 'RIGL § 16-21-26', year: 2003, requirements: ['Anti-bullying policy', 'Investigation', 'Training'] },
    { id: 'abls7', state: 'New York', law: 'Dignity Act', year: 2010, requirements: ['Anti-bullying and discrimination policy', 'Annual training', 'Reporting', 'Investigation'] },
    { id: 'abls8', state: 'New Jersey', law: 'NJSA 18A:37-13', year: 2002, requirements: ['Anti-bullying policy', 'Annual training', 'Investigation', 'Disciplinary procedures'] },
    { id: 'abls9', state: 'Pennsylvania', law: 'PA Act 26', year: 2008, requirements: ['Anti-bullying policy', 'Reporting'] },
    { id: 'abls10', state: 'Delaware', law: '14 Del. C. § 4112D', year: 2007, requirements: ['Anti-bullying policy', 'Investigation', 'Reporting'] },
    { id: 'abls11', state: 'Maryland', law: 'Md. Code, Education § 7-424', year: 2005, requirements: ['Anti-bullying policy', 'Reporting and investigation'] },
    { id: 'abls12', state: 'Virginia', law: 'Va. Code § 22.1-279.6', year: 2013, requirements: ['Anti-bullying policy', 'Reporting'] },
    { id: 'abls13', state: 'West Virginia', law: 'WV Code § 18-2C', year: 2001, requirements: ['Anti-bullying policy', 'Reporting'] },
    { id: 'abls14', state: 'North Carolina', law: 'NCGS § 115C-407', year: 2009, requirements: ['Anti-bullying policy', 'Reporting'] },
    { id: 'abls15', state: 'South Carolina', law: 'SC Code § 59-63-110', year: 2006, requirements: ['Anti-bullying policy'] },
    { id: 'abls16', state: 'Georgia', law: 'OCGA § 20-2-751.4', year: 2010, requirements: ['Anti-bullying policy', 'Reporting'] },
    { id: 'abls17', state: 'Florida', law: 'Florida Statute 1006.147', year: 2008, requirements: ['Anti-bullying policy', 'Reporting and investigation'] },
    { id: 'abls18', state: 'Alabama', law: 'AL Code § 16-28B', year: 2009, requirements: ['Anti-bullying policy'] },
    { id: 'abls19', state: 'Mississippi', law: 'MS Code § 37-11-67', year: 2010, requirements: ['Anti-bullying policy'] },
    { id: 'abls20', state: 'Louisiana', law: 'La. R.S. 17:416.13', year: 2012, requirements: ['Anti-bullying policy', 'Reporting'] },
    { id: 'abls21', state: 'Texas', law: 'Texas Education Code § 37.0832', year: 2011, requirements: ['Anti-bullying policy', 'Reporting'] },
    { id: 'abls22', state: 'Oklahoma', law: '70 O.S. § 24-100.4', year: 2002, requirements: ['Anti-bullying policy'] },
    { id: 'abls23', state: 'Arkansas', law: 'AR Code § 6-18-514', year: 2003, requirements: ['Anti-bullying policy'] },
    { id: 'abls24', state: 'Tennessee', law: 'Tenn. Code Ann. § 49-6-4502', year: 2005, requirements: ['Anti-bullying policy'] },
    { id: 'abls25', state: 'Kentucky', law: 'KRS 158.156', year: 2008, requirements: ['Anti-bullying policy'] }
  ];

  var FEDERAL_PROTECTIONS_DEEP = [
    {
      id: 'fpd1',
      law: 'Title VI of Civil Rights Act',
      year: 1964,
      whatItDoes: 'Prohibits discrimination based on race, color, or national origin in federally funded programs.',
      whoEnforces: 'U.S. Department of Education Office for Civil Rights',
      whatItMeansForBullying: 'Race-based harassment in schools violates Title VI.',
      howToFile: 'OCR online (ed.gov/ocr)',
      timeline: 'Within 180 days of last incident',
      keyCase: 'Davis v. Monroe County Board of Education (1999) - established student-on-student harassment',
      remediesAvailable: ['Investigation', 'Compliance agreement', 'Monetary damages possible', 'System change']
    },
    {
      id: 'fpd2',
      law: 'Title IX of Education Amendments',
      year: 1972,
      whatItDoes: 'Prohibits sex-based discrimination in education.',
      whoEnforces: 'OCR and Title IX coordinator at each district',
      whatItMeansForBullying: 'Sexual harassment, gender-based harassment, harassment of LGBTQ students (in some interpretations).',
      howToFile: 'Title IX coordinator first, then OCR',
      timeline: '180 days for OCR',
      keyCase: 'Franklin v. Gwinnett County Public Schools (1992) - damages available',
      remediesAvailable: ['Investigation', 'Compliance agreement', 'Damages possible']
    },
    {
      id: 'fpd3',
      law: 'Section 504 of Rehabilitation Act',
      year: 1973,
      whatItDoes: 'Prohibits disability discrimination in federally funded programs.',
      whoEnforces: 'OCR',
      whatItMeansForBullying: 'Disability-based harassment violates Section 504.',
      howToFile: 'OCR',
      timeline: '180 days',
      keyCase: 'Various OCR Dear Colleague letters establishing standard',
      remediesAvailable: ['Investigation', 'Compliance agreement', 'Damages possible']
    },
    {
      id: 'fpd4',
      law: 'ADA Title II',
      year: 1990,
      whatItDoes: 'Prohibits disability discrimination by state and local government, including schools.',
      whoEnforces: 'DOJ and OCR',
      whatItMeansForBullying: 'Disability-based harassment may violate Title II.',
      howToFile: 'DOJ or OCR',
      timeline: 'Varies',
      keyCase: 'Various establishing standard',
      remediesAvailable: ['Investigation', 'Compliance agreement', 'Damages possible']
    },
    {
      id: 'fpd5',
      law: 'IDEA',
      year: 1975,
      whatItDoes: 'Requires Free Appropriate Public Education for disabled students.',
      whoEnforces: 'OSEP and state agencies',
      whatItMeansForBullying: 'Bullying that interferes with FAPE can be IDEA violation.',
      howToFile: 'State complaint or due process',
      timeline: 'Varies',
      keyCase: 'OCR Dear Colleague Letter 2013',
      remediesAvailable: ['Compensatory services', 'IEP revision', 'Compliance agreement']
    },
    {
      id: 'fpd6',
      law: 'FERPA',
      year: 1974,
      whatItDoes: 'Protects student educational records.',
      whoEnforces: 'U.S. Department of Education',
      whatItMeansForBullying: 'Access to disciplinary records, investigations.',
      howToFile: 'Request first to school, then DOE if denied',
      timeline: '45 days from request',
      keyCase: 'Owasso v. Falvo',
      remediesAvailable: ['Access to records', 'Correction of errors']
    },
    {
      id: 'fpd7',
      law: 'McKinney-Vento Act',
      year: 1987,
      whatItDoes: 'Protects educational rights of homeless students.',
      whoEnforces: 'Each district has McKinney-Vento liaison',
      whatItMeansForBullying: 'Homeless students have protections against harassment based on status.',
      howToFile: 'School liaison first',
      timeline: 'Varies',
      remediesAvailable: ['Educational continuity', 'Support services']
    },
    {
      id: 'fpd8',
      law: 'Every Student Succeeds Act',
      year: 2015,
      whatItDoes: 'Education funding tied to safe and supportive school climates.',
      whoEnforces: 'U.S. Department of Education',
      whatItMeansForBullying: 'Bullying must be addressed in school climate work.',
      howToFile: 'Varies',
      timeline: 'Varies',
      remediesAvailable: ['Federal funding implications']
    }
  ];

  var INSPIRATION_LIBRARY = [
    {
      id: 'il1',
      mentor: 'Bayard Rustin',
      story: 'Architect of the 1963 March on Washington. Openly gay Black man whose contributions were minimized for decades because of homophobia. Continued to do upstander work his whole life.',
      lesson: 'Sustained advocacy across decades. Multiple identities. Refused to be sidelined.'
    },
    {
      id: 'il2',
      mentor: 'Judy Heumann',
      story: 'Mother of disability rights movement. Polio survivor. Led 504 sit-in, was instrumental in ADA passage. International disability rights work.',
      lesson: 'Decades of work for collective good. Coalition across identity.'
    },
    {
      id: 'il3',
      mentor: 'Pauli Murray',
      story: 'Lawyer, priest, activist. Worked on civil rights for race, gender, sexuality, class decades before "intersectionality" was named.',
      lesson: 'Intersectional analysis predates the word. Visionary thinking.'
    },
    {
      id: 'il4',
      mentor: 'Yuri Kochiyama',
      story: 'Japanese American activist. Held Malcolm X as he died. Worked for Black, Latine, Asian-American liberation across her life.',
      lesson: 'Cross-movement solidarity. Lifelong work.'
    },
    {
      id: 'il5',
      mentor: 'Sylvia Rivera',
      story: 'Trans Latina activist. Co-founded STAR with Marsha P. Johnson. Worked for trans rights, sex worker rights, homeless youth.',
      lesson: 'Most marginalized lead. Refused to be sidelined within movement.'
    },
    {
      id: 'il6',
      mentor: 'Ed Roberts',
      story: 'Founded Independent Living Movement after being told he could not attend UC Berkeley.',
      lesson: 'Disabled people leading disability movement. Self-determination.'
    },
    {
      id: 'il7',
      mentor: 'Helen Bell',
      story: 'Created what is now Recovery International (peer-led mental health support).',
      lesson: 'Peer support saves lives. Mental health movement.'
    },
    {
      id: 'il8',
      mentor: 'James Baldwin',
      story: 'Writer who used his voice to expose racism and homophobia at great personal cost.',
      lesson: 'Truth-telling is upstander work.'
    },
    {
      id: 'il9',
      mentor: 'Audre Lorde',
      story: 'Lesbian Black feminist poet whose work named what others would not.',
      lesson: 'Silence will not protect you. Speak.'
    },
    {
      id: 'il10',
      mentor: 'Cesar Chavez',
      story: 'Farm worker organizer. Built UFW. Pioneered nonviolent labor organizing.',
      lesson: 'Sustained organizing. Labor as upstander work.'
    },
    {
      id: 'il11',
      mentor: 'Fannie Lou Hamer',
      story: 'Sharecropper to civil rights organizer. Forced sterilization survivor. Mississippi Freedom Democratic Party founder.',
      lesson: 'Voice from grassroots. Refused to back down.'
    },
    {
      id: 'il12',
      mentor: 'Ella Baker',
      story: 'Civil rights organizer who shaped SNCC, NAACP, SCLC. Believed strong people do not need strong leaders.',
      lesson: 'Build power among many. Develop new leaders.'
    },
    {
      id: 'il13',
      mentor: 'Frederick Douglass',
      story: 'Escaped slavery. Wrote autobiography. Pushed Lincoln on emancipation. Spoke for women\'s rights.',
      lesson: 'Power concedes nothing without a demand. Solidarity across movements.'
    },
    {
      id: 'il14',
      mentor: 'Sojourner Truth',
      story: 'Born into slavery. Escaped. Sued for son\'s freedom. Spoke for abolition and women\'s rights.',
      lesson: 'Truth is powerful. Use your voice.'
    },
    {
      id: 'il15',
      mentor: 'Tarana Burke',
      story: 'Started Me Too movement in 2006. Spent decade building before it went viral in 2017.',
      lesson: 'Sustained work. Empowerment through empathy. Movement led by impacted.'
    },
    {
      id: 'il16',
      mentor: 'Bryan Stevenson',
      story: 'Founded Equal Justice Initiative. Defends people on death row, especially in the South.',
      lesson: 'Each of us is more than the worst thing we have ever done. Proximity matters.'
    },
    {
      id: 'il17',
      mentor: 'Ai-jen Poo',
      story: 'Organized domestic workers (often immigrant women of color) into national alliance.',
      lesson: 'Most marginalized workers can build power.'
    },
    {
      id: 'il18',
      mentor: 'Alicia Garza, Patrisse Cullors, Opal Tometi',
      story: 'Founded #BlackLivesMatter after Trayvon Martin\'s killer was acquitted.',
      lesson: 'Movement-building through online to offline. Black queer women lead.'
    },
    {
      id: 'il19',
      mentor: 'Marsha P. Johnson',
      story: 'Trans Black woman. Stonewall riots. AIDS activism. Sex worker. Houseless advocate.',
      lesson: 'Most marginalized lead. Show up loud.'
    },
    {
      id: 'il20',
      mentor: 'Wilma Mankiller',
      story: 'First woman Principal Chief of Cherokee Nation. Built community infrastructure. Wrote about Indigenous resistance.',
      lesson: 'Indigenous sovereignty. Women in leadership.'
    }
  ];

  var COMPREHENSIVE_FACT_SHEET = [
    {
      id: 'cfs1',
      title: 'Bullying basics',
      facts: [
        '1 in 5 students reports being bullied at school',
        'Most bullying happens in elementary and middle school',
        'Identity-based bullying has higher mental health impact',
        'Cyberbullying affects 1 in 6 high school students',
        'Most bullying happens in unsupervised spaces (hallways, cafeterias, online)'
      ]
    },
    {
      id: 'cfs2',
      title: 'Bystander statistics',
      facts: [
        'Bystanders are present in 85% of bullying incidents',
        'Only 19% of bystanders intervene',
        'When bystanders intervene, bullying stops within 10 seconds 70% of the time',
        'Most bystanders feel uncomfortable but do not act',
        'Training can increase intervention rates substantially'
      ]
    },
    {
      id: 'cfs3',
      title: 'Target outcomes',
      facts: [
        'Bullied students have 2-3x higher risk of anxiety and depression',
        'Bullied students have higher risk of suicide ideation',
        'School avoidance increases for bullied students',
        'Academic performance suffers',
        'Long-term mental health impact'
      ]
    },
    {
      id: 'cfs4',
      title: 'Harmer outcomes',
      facts: [
        'Bullies have higher risk of substance abuse',
        'Bullies have higher risk of antisocial behavior',
        'Many bullies are also targets',
        'Hurt people hurt people',
        'Restorative approaches reduce recidivism'
      ]
    },
    {
      id: 'cfs5',
      title: 'Identity-based statistics',
      facts: [
        'LGBTQ students are 2-3x more likely to be bullied',
        'Disabled students are bullied at significantly higher rates',
        'Black students face disproportionate discipline',
        'Religious minority students face religion-based harassment',
        'Multiple identities compound risk'
      ]
    },
    {
      id: 'cfs6',
      title: 'Online environment',
      facts: [
        'Cyberbullying has grown with smartphones',
        'Most cyberbullying happens off school grounds but affects school',
        'Anonymous online makes intervention harder',
        'Documentation is easier online',
        'Some platforms have robust safety teams'
      ]
    },
    {
      id: 'cfs7',
      title: 'Adult responses',
      facts: [
        'Adults witness most bullying',
        'Adults intervene in less than half of incidents they witness',
        'Adult silence reinforces harm',
        'Trained adults intervene more',
        'Adult-led tracking misses most incidents'
      ]
    },
    {
      id: 'cfs8',
      title: 'System change',
      facts: [
        'School-wide programs have larger impact than individual interventions',
        'Multi-year programs see better results',
        'Restorative practices outperform punitive',
        'Trauma-informed approaches improve outcomes',
        'Student involvement is essential'
      ]
    }
  ];

  var WORKSHEETS_AND_TOOLS = [
    {
      id: 'wat1',
      tool: 'Bystander observation log',
      purpose: 'Build noticing skills',
      sections: ['Date', 'Time', 'Place', 'Who was involved', 'What happened', 'What I did or did not do', 'How I felt', 'What I might do next time'],
      frequency: 'Weekly'
    },
    {
      id: 'wat2',
      tool: 'Personal upstander commitment',
      purpose: 'Build accountability',
      sections: ['One commitment for this week', 'How I will know I did it', 'Who I will tell', 'How I will reflect'],
      frequency: 'Weekly'
    },
    {
      id: 'wat3',
      tool: 'Incident report template',
      purpose: 'Document harm',
      sections: ['Date and time', 'Location', 'Who was involved', 'What happened (specific)', 'Witnesses', 'Impact on target', 'Action requested'],
      frequency: 'As needed'
    },
    {
      id: 'wat4',
      tool: 'Coalition planning worksheet',
      purpose: 'Build sustained action',
      sections: ['Issue we want to address', 'Allies', 'Short-term goal', 'Long-term goal', 'Specific next step', 'Timeline'],
      frequency: 'Monthly'
    },
    {
      id: 'wat5',
      tool: 'Restorative dialogue template',
      purpose: 'Repair harm',
      sections: ['What happened from each perspective', 'How each was impacted', 'What is needed for repair', 'Specific agreements', 'Follow-up timeline'],
      frequency: 'As needed'
    },
    {
      id: 'wat6',
      tool: 'Self-care plan',
      purpose: 'Sustain upstander work',
      sections: ['Daily practices', 'Weekly practices', 'Monthly practices', 'Warning signs of burnout', 'Recovery practices'],
      frequency: 'Update quarterly'
    },
    {
      id: 'wat7',
      tool: 'Ally network map',
      purpose: 'Build support',
      sections: ['Family allies', 'School allies', 'Community allies', 'Online allies', 'Professional resources'],
      frequency: 'Update annually'
    },
    {
      id: 'wat8',
      tool: 'Reflection journal template',
      purpose: 'Process experience',
      sections: ['What happened this week', 'What did I notice about myself', 'What worked', 'What did not', 'What I want to try next'],
      frequency: 'Weekly'
    },
    {
      id: 'wat9',
      tool: 'Privilege examination',
      purpose: 'Build identity awareness',
      sections: ['My identities', 'Privileges I hold', 'Privileges I do not', 'How I use my privilege', 'Where I can grow'],
      frequency: 'Update annually'
    },
    {
      id: 'wat10',
      tool: 'Year planning template',
      purpose: 'Sustained practice',
      sections: ['Q1 focus', 'Q2 focus', 'Q3 focus', 'Q4 focus', 'Annual reflection'],
      frequency: 'Update annually'
    }
  ];

  var DETAILED_ROLE_PLAY_BANK = [
    {
      id: 'drpb1',
      situation: 'Friend admits they have been targeting someone',
      role: 'Listener / Confidant',
      setting: 'Private conversation',
      script: [
        { speaker: 'Friend', line: 'I think I have been mean to ___.' },
        { speaker: 'You', line: 'What makes you think that?' },
        { speaker: 'Friend', line: 'They have been crying at lunch. Their friend said it is because of me.' },
        { speaker: 'You', line: 'Tell me what happened.' },
        { speaker: 'Friend', line: '[Tells story]' },
        { speaker: 'You', line: 'I appreciate you telling me. What do you want to do about it?' },
        { speaker: 'Friend', line: 'I do not know.' },
        { speaker: 'You', line: 'You could apologize. You could ask what they need from you. You could change what you have been doing.' },
        { speaker: 'Friend', line: 'I am scared.' },
        { speaker: 'You', line: 'I can support you. Do you want to plan what to say?' }
      ],
      keyMoves: ['Listened without judgment', 'Held accountability', 'Offered support']
    },
    {
      id: 'drpb2',
      situation: 'Witness of a slur to a teacher',
      role: 'Witness who reports',
      setting: 'After class',
      script: [
        { speaker: 'You (to teacher)', line: 'Can I talk to you privately?' },
        { speaker: 'Teacher', line: 'Sure.' },
        { speaker: 'You', line: 'Today during 3rd period, [student] said [slur] to [other student].' },
        { speaker: 'Teacher', line: 'I did not hear that.' },
        { speaker: 'You', line: 'It happened. I am telling you because I want it addressed.' },
        { speaker: 'Teacher', line: 'Thank you. I will look into it.' },
        { speaker: 'You', line: 'Could you tell me what you plan to do? I want to know.' },
        { speaker: 'Teacher', line: '[Explains plan]' },
        { speaker: 'You', line: 'Thank you. I will check back in a week.' }
      ],
      keyMoves: ['Specific facts', 'Asked for accountability', 'Set follow-up']
    },
    {
      id: 'drpb3',
      situation: 'Calling out family member',
      role: 'Family member who speaks up',
      setting: 'Family dinner',
      script: [
        { speaker: 'Family member', line: '[Makes harmful joke]' },
        { speaker: 'You', line: 'That joke is not funny. It is hurtful.' },
        { speaker: 'Family member', line: 'You are being dramatic.' },
        { speaker: 'You', line: 'I am not. I am asking you to stop saying things like that around me.' },
        { speaker: 'Other family', line: 'Lets not get political.' },
        { speaker: 'You', line: 'Bigotry is not politics. It is harm.' },
        { speaker: 'Family member', line: 'Lighten up.' },
        { speaker: 'You', line: 'No. I am leaving the table for a few minutes. We can talk when you are ready to hear me.' }
      ],
      keyMoves: ['Named the harm', 'Held line under pressure', 'Took space']
    },
    {
      id: 'drpb4',
      situation: 'Target reaches out for help',
      role: 'Ally / Support',
      setting: 'Private conversation',
      script: [
        { speaker: 'Target', line: 'Can I talk to you?' },
        { speaker: 'You', line: 'Of course.' },
        { speaker: 'Target', line: '[Shares experience]' },
        { speaker: 'You', line: 'Thank you for telling me. That sounds really hard.' },
        { speaker: 'Target', line: 'I do not know what to do.' },
        { speaker: 'You', line: 'What feels most important to you right now?' },
        { speaker: 'Target', line: '[Shares]' },
        { speaker: 'You', line: 'I can support you. Here is what I can do: [specific options]. What would help?' },
        { speaker: 'Target', line: '[Chooses]' },
        { speaker: 'You', line: 'Got it. I will follow through. Lets check in tomorrow.' }
      ],
      keyMoves: ['Listened first', 'Validated', 'Centered their priorities', 'Offered concrete options', 'Set follow-up']
    },
    {
      id: 'drpb5',
      situation: 'Coalition meeting',
      role: 'Member',
      setting: 'Student coalition planning',
      script: [
        { speaker: 'Facilitator', line: 'What is one thing we want to change this year?' },
        { speaker: 'You', line: 'The way Black students are disciplined more than white students for the same behavior.' },
        { speaker: 'Facilitator', line: 'Strong. What is concrete next step?' },
        { speaker: 'You', line: 'Track discipline data for a quarter. Then take it to administration with demands.' },
        { speaker: 'Facilitator', line: 'Who is on the data team?' },
        { speaker: 'You', line: 'I will join. We need at least 3 more.' }
      ],
      keyMoves: ['Specific issue', 'Concrete next step', 'Volunteered for work']
    },
    {
      id: 'drpb6',
      situation: 'Apology conversation',
      role: 'Person who caused harm',
      setting: 'Private meeting with harmed person',
      script: [
        { speaker: 'You', line: 'Thank you for meeting with me. I want to apologize for what I did.' },
        { speaker: 'Harmed', line: '[Silent]' },
        { speaker: 'You', line: 'Specifically: on [date] I [specific action]. I was wrong. There is no excuse.' },
        { speaker: 'Harmed', line: '[Silent]' },
        { speaker: 'You', line: 'I understand the impact has been [specific impact]. I am sorry.' },
        { speaker: 'Harmed', line: '[Silent]' },
        { speaker: 'You', line: 'I am working on [specific changes]. I cannot ask for forgiveness on your timeline. I just wanted you to know.' },
        { speaker: 'Harmed', line: 'Thanks for telling me.' },
        { speaker: 'You', line: 'Is there anything you need from me?' },
        { speaker: 'Harmed', line: '[Names need]' },
        { speaker: 'You', line: 'I will do that.' }
      ],
      keyMoves: ['Specific accountability', 'No excuses', 'Acknowledged impact', 'Asked what was needed', 'Did not demand forgiveness']
    },
    {
      id: 'drpb7',
      situation: 'Bystander training',
      role: 'Workshop participant',
      setting: 'School training',
      script: [
        { speaker: 'Facilitator', line: 'Imagine you see a classmate being mocked. What do you do?' },
        { speaker: 'You', line: 'I am not sure. I would not want to be next.' },
        { speaker: 'Facilitator', line: 'Real concern. What are some lower-risk options?' },
        { speaker: 'You', line: 'I could distract. Or document. Or tell someone after.' },
        { speaker: 'Facilitator', line: 'Yes. What is one you commit to trying?' },
        { speaker: 'You', line: 'Check in with target after.' },
        { speaker: 'Facilitator', line: 'Specific situation in mind?' },
        { speaker: 'You', line: 'There is a kid in my class who gets teased. I will text them tonight.' }
      ],
      keyMoves: ['Honest about barriers', 'Identified options', 'Committed to specific action']
    },
    {
      id: 'drpb8',
      situation: 'Restorative dialogue',
      role: 'Participant',
      setting: 'Facilitated repair conversation',
      script: [
        { speaker: 'Facilitator', line: 'Tell us what happened from your perspective.' },
        { speaker: 'You', line: '[Tells story]' },
        { speaker: 'Facilitator', line: 'How did that impact you?' },
        { speaker: 'You', line: '[Names impact]' },
        { speaker: 'Facilitator', line: 'What do you need to repair?' },
        { speaker: 'You', line: '[Names needs]' },
        { speaker: 'Other party', line: '[Responds]' },
        { speaker: 'Facilitator', line: 'Can we reach agreement?' },
        { speaker: 'You', line: 'Yes, if [specific terms].' }
      ],
      keyMoves: ['Spoke truth', 'Named impact', 'Stated needs', 'Listened', 'Reached agreement']
    }
  ];

  var ROLE_BASED_GUIDES = [
    {
      id: 'rbg1',
      role: 'Class clown',
      potential: 'You have social power. Use it.',
      typical: 'Often jokes at others\' expense.',
      growthMoves: [
        'Direct humor at safe targets (yourself, hypothetical situations)',
        'Use humor to defuse tension',
        'Bring people together with humor',
        'Refuse to mock individuals'
      ],
      mistakes: ['Punching down', 'Crossing lines', 'Mistaking humor for harm']
    },
    {
      id: 'rbg2',
      role: 'Popular kid',
      potential: 'You have social capital. Spend it well.',
      typical: 'Often unaware of impact on those outside the popular sphere.',
      growthMoves: [
        'Include peers outside your circle',
        'Use your status to defend',
        'Refuse to participate in cliques',
        'Build broader friend networks'
      ],
      mistakes: ['Exclusion', 'Not noticing harm', 'Coasting on privilege']
    },
    {
      id: 'rbg3',
      role: 'Quiet observer',
      potential: 'You see what others miss.',
      typical: 'Often does not speak up.',
      growthMoves: [
        'Document what you observe',
        'Tell trusted adults',
        'Speak up in small ways',
        'Build to bigger interventions'
      ],
      mistakes: ['Assuming someone else will speak', 'Internalizing observations', 'Burnout']
    },
    {
      id: 'rbg4',
      role: 'Outcast',
      potential: 'You know what targets need.',
      typical: 'Often disconnected from school community.',
      growthMoves: [
        'Connect with other outcasts',
        'Build affinity community',
        'Tell stories from your experience',
        'Support younger outcasts'
      ],
      mistakes: ['Isolation', 'Bitterness', 'Self-blame']
    },
    {
      id: 'rbg5',
      role: 'Athlete',
      potential: 'You have visibility and team. Use it.',
      typical: 'Often siloed in sports culture.',
      growthMoves: [
        'Address toxic team culture',
        'Welcome diverse teammates',
        'Push back on bullying in locker room',
        'Use platform to advocate'
      ],
      mistakes: ['Coddling toxic culture', 'Hazing', 'Sports-only friendships']
    },
    {
      id: 'rbg6',
      role: 'Academic high-achiever',
      potential: 'You have academic credibility. Use it.',
      typical: 'Often disconnected from social dynamics.',
      growthMoves: [
        'Help struggling peers academically',
        'Refuse to participate in academic snobbery',
        'Connect across academic levels',
        'Push for equitable academics'
      ],
      mistakes: ['Academic elitism', 'Tracking blindness', 'Saving over solidarity']
    },
    {
      id: 'rbg7',
      role: 'Arts kid',
      potential: 'You have creative skill. Use it to tell stories.',
      typical: 'Often in alternative friend groups.',
      growthMoves: [
        'Create art about bullying',
        'Build inclusive arts community',
        'Use platforms to advocate',
        'Connect arts with social justice'
      ],
      mistakes: ['Artsy elitism', 'Self-isolation', 'Aesthetic over substance']
    },
    {
      id: 'rbg8',
      role: 'Student leader',
      potential: 'You have organizational platform.',
      typical: 'Often disconnected from base.',
      growthMoves: [
        'Build coalition broadly',
        'Listen to all students',
        'Use platform for change',
        'Mentor next leaders'
      ],
      mistakes: ['Token leadership', 'Disconnection', 'Saving over building']
    },
    {
      id: 'rbg9',
      role: 'Religious student',
      potential: 'You have community and values base.',
      typical: 'Sometimes uses religion as cover for harm.',
      growthMoves: [
        'Live your values in school',
        'Interfaith bridge-building',
        'Refuse religion-as-weapon',
        'Connect faith and justice'
      ],
      mistakes: ['Religious supremacy', 'Justifying harm religiously', 'Insularity']
    },
    {
      id: 'rbg10',
      role: 'New student',
      potential: 'You see your school with fresh eyes.',
      typical: 'Often eager to fit in.',
      growthMoves: [
        'Build values-based friendships',
        'Refuse to participate in initiation',
        'Notice patterns others have habituated to',
        'Speak up with fresh perspective'
      ],
      mistakes: ['Conforming to harmful culture', 'Hiding your identity', 'Isolation']
    }
  ];

  var ADDITIONAL_BYSTANDER_NARRATIVES = [
    {
      id: 'abn1',
      title: 'The student who became principal',
      narrative: [
        'I was bullied in 7th grade. The principal at the time told me to "toughen up."',
        '',
        'I never forgot it.',
        '',
        '20 years later I became a principal myself.',
        '',
        'On my first day I gathered the staff. I told them: "Bullying is not toughening up. It is harm. We will treat it that way."',
        '',
        'I implemented restorative practices. I trained every staff member. I made sure students knew they would be heard.',
        '',
        'In my first 3 years, bullying dropped 60%.',
        '',
        'I tell students: the principal who told me to toughen up shaped my career. Sometimes the worst adults teach us what to be the opposite of.',
        '',
        'I tell adults: a child you brushed off may run a school someday. They will remember.'
      ]
    },
    {
      id: 'abn2',
      title: 'The text that came years later',
      narrative: [
        'I was 14 when I sat with a kid named Andrew at lunch. He had been new. He had been alone for a week.',
        '',
        'I did not think anything of it. I just sat with him. We became friends.',
        '',
        'I lost touch after high school.',
        '',
        'Ten years later I got a Facebook message. It was Andrew. He said: "I do not know if you remember me. You sat with me at lunch in 8th grade. I was contemplating suicide that week. Sitting with me changed my life. I wanted you to know."',
        '',
        'I cried at my desk at work.',
        '',
        'I had no idea.',
        '',
        'I tell young people: you never know who you save by sitting with them.'
      ]
    },
    {
      id: 'abn3',
      title: 'When teacher backed me up',
      narrative: [
        'In 11th grade my friend was being mocked by another student. I told the student to stop. They escalated.',
        '',
        'My teacher Ms. Reyes had been watching. She walked over and said: "Ana is right. Stop."',
        '',
        'The mocker pushed back: "Why are you taking her side?"',
        '',
        'Ms. Reyes said: "I am not taking sides. I am stopping bullying. There is only one side here."',
        '',
        'The mocker walked away.',
        '',
        'Ms. Reyes turned to me: "Thanks for stepping up. Sorry I had not earlier."',
        '',
        'I never forgot that. Adults can be partners in upstander work. When they back students up, it changes everything.',
        '',
        'I tell adults: when a student speaks up, back them up. Loudly.'
      ]
    },
    {
      id: 'abn4',
      title: 'The coalition we built',
      narrative: [
        'After a racist incident at my high school, six BIPOC students and I started organizing.',
        '',
        'We met every week. We listened to each other. We mapped issues.',
        '',
        'We made demands: cultural competency training, BIPOC counselor, diverse curriculum.',
        '',
        'We took it to the principal. He said no.',
        '',
        'We took it to the superintendent. He said maybe.',
        '',
        'We took it to the school board. They listened.',
        '',
        'After two years, we got most of what we asked for.',
        '',
        'I learned: coalition is power. Six people who would not back down moved a whole system.',
        '',
        'I tell young people: find your five. Build from there.'
      ]
    },
    {
      id: 'abn5',
      title: 'My quietest upstander moment',
      narrative: [
        'I am autistic. Social situations are hard for me.',
        '',
        'I was 16. A new student arrived. They were also autistic.',
        '',
        'I did not know what to say. I sat down at their table at lunch. I did not speak.',
        '',
        'They did not speak either.',
        '',
        'We ate in silence for two weeks.',
        '',
        'In week three, they handed me a note: "Thanks for sitting here. I have been scared."',
        '',
        'I wrote back: "Me too. We can be scared together."',
        '',
        'We have been friends for 10 years. We still mostly text. Sometimes we sit silently. That is enough.',
        '',
        'I tell young people: words are not the only way. Presence is also a language.'
      ]
    },
    {
      id: 'abn6',
      title: 'The day I broke my silence',
      narrative: [
        'I was 17. I had been silent for years about racism I witnessed at my school.',
        '',
        'I told myself it was not my place. I was white. The targets were Black peers.',
        '',
        'Then one of my Black peers told me: "Your silence costs me. You are part of why this continues."',
        '',
        'I felt sick. She was right.',
        '',
        'I started speaking up. I started intervening. I started organizing.',
        '',
        'Some of my white friends got uncomfortable. Some stopped speaking to me.',
        '',
        'But my friendships with my Black peers deepened.',
        '',
        'I learned: silence has a cost. The cost is paid by those you stay silent about.',
        '',
        'I tell white people: do the work. Speak up. The discomfort is the work.'
      ]
    },
    {
      id: 'abn7',
      title: 'When I was the new kid',
      narrative: [
        'I moved schools mid-year in 8th grade. I knew no one.',
        '',
        'For two weeks I ate alone. Walked alone. Cried in the bathroom.',
        '',
        'Then in week three a kid named Marcus sat at my lunch table. Then Sarah. Then Tyler.',
        '',
        'They had noticed me. They had decided I should not be alone.',
        '',
        'They never made a big deal of it. They just included me.',
        '',
        'Marcus, Sarah, and Tyler are my best friends 12 years later.',
        '',
        'I tell young people: notice the new kids. Sit with them.'
      ]
    },
    {
      id: 'abn8',
      title: 'The teacher who started a movement',
      narrative: [
        'Mrs. Davis taught English at my school. She had been there 30 years.',
        '',
        'When she retired, dozens of former students came to her party.',
        '',
        'One by one we shared stories.',
        '',
        'She had intervened. She had believed. She had connected. She had stayed in touch.',
        '',
        'She had been an upstander every day of her career.',
        '',
        'She had not made headlines. She had made a school.',
        '',
        'I tell teachers: you do not need to be famous. You need to show up.'
      ]
    }
  ];

  var COMPREHENSIVE_INTERVENTION_GUIDES = [
    {
      id: 'cig1',
      type: 'When you see physical violence',
      immediateActions: [
        'Move to safety yourself',
        'Call for help (adult, security, 911)',
        'Do NOT physically intervene unless trained',
        'Document if safe (witnesses, video from distance)',
        'Provide first aid if trained'
      ],
      aftermath: [
        'Help target get to safety',
        'Report to administration in writing',
        'Document everything you saw',
        'Help connect target to mental health support',
        'Take care of yourself - witnessing violence is traumatic'
      ],
      patternAddressing: [
        'Track if violence is part of pattern',
        'Push for safety planning',
        'Engage with administration on prevention',
        'Coalition for school-wide change'
      ]
    },
    {
      id: 'cig2',
      type: 'When you see verbal abuse',
      immediateActions: [
        'Assess your safety',
        'Direct intervention if safe: "Stop, that is not okay"',
        'Distract if direct is too risky',
        'Get help if needed'
      ],
      aftermath: [
        'Check on target',
        'Document what happened',
        'Tell adult if needed',
        'Self-care'
      ],
      patternAddressing: [
        'Pattern documentation',
        'Escalate to administration if repeating',
        'Push for school-wide language norms'
      ]
    },
    {
      id: 'cig3',
      type: 'When you see online harassment',
      immediateActions: [
        'Do not engage with harasser',
        'Screenshot evidence',
        'Tell target if they do not know',
        'Help target block and report'
      ],
      aftermath: [
        'Help target navigate platform reporting',
        'Connect with adults if school-related',
        'Help target self-care',
        'Help target with mental health if needed'
      ],
      patternAddressing: [
        'School cyberbullying policy enforcement',
        'Platform safety teams',
        'Police if criminal',
        'Coalition for digital citizenship'
      ]
    },
    {
      id: 'cig4',
      type: 'When you see social exclusion',
      immediateActions: [
        'Notice the pattern',
        'Reach out to excluded person',
        'Include in your own circle',
        'Talk to excluding friends'
      ],
      aftermath: [
        'Build ongoing inclusion',
        'Address group culture',
        'Build broader friend networks'
      ],
      patternAddressing: [
        'School climate work',
        'Affinity groups',
        'Inclusive programming'
      ]
    },
    {
      id: 'cig5',
      type: 'When you see identity-based harm',
      immediateActions: [
        'Interrupt slurs',
        'Stand with target',
        'Document specifics'
      ],
      aftermath: [
        'Title IX or OCR depending on identity',
        'Help target navigate reporting',
        'Connect target with affinity community',
        'Self-care'
      ],
      patternAddressing: [
        'Push for inclusive curriculum',
        'Staff cultural competency training',
        'Affinity groups',
        'Reporting systems'
      ]
    },
    {
      id: 'cig6',
      type: 'When you see adult-perpetrated harm',
      immediateActions: [
        'Document specifics',
        'Tell another trusted adult',
        'Stay engaged with target'
      ],
      aftermath: [
        'Multi-level reporting (principal, district, state, OCR)',
        'External authorities if criminal',
        'Help target through process',
        'Connect with disability rights or civil rights org if applicable'
      ],
      patternAddressing: [
        'Investigation',
        'Adult accountability',
        'Replacement if needed',
        'Systemic change'
      ]
    }
  ];

  var EXTENDED_RESEARCH_REVIEW = [
    {
      id: 'err1',
      finding: 'Bystander intervention reduces bullying duration by 70% within 10 seconds',
      source: 'Hawkins et al, 2001',
      implications: 'Quick intervention is essential. Training students for fast response works.',
      practicalUse: 'Drill 5-second responses. Build muscle memory.'
    },
    {
      id: 'err2',
      finding: 'Most bystanders intervene in only 19% of incidents',
      source: 'Trach et al, 2010',
      implications: 'Most witnesses do nothing. Most students need explicit training.',
      practicalUse: 'Bystander intervention curriculum is essential.'
    },
    {
      id: 'err3',
      finding: 'Identity-based bullying has worse mental health outcomes than non-identity-based',
      source: 'Russell et al, 2012',
      implications: 'Identity-based interventions are needed.',
      practicalUse: 'Identity-affirming community and curriculum.'
    },
    {
      id: 'err4',
      finding: 'Cyberbullying compounds with in-person bullying',
      source: 'Lapidot-Lefler & Dolev-Cohen, 2015',
      implications: 'Address both online and offline.',
      practicalUse: 'Coordinated school and digital response.'
    },
    {
      id: 'err5',
      finding: 'Restorative practices reduce repeat offenses by 60-70%',
      source: 'Multiple studies',
      implications: 'Restorative beats punitive.',
      practicalUse: 'School-wide restorative practices.'
    },
    {
      id: 'err6',
      finding: 'Suspension predicts higher juvenile justice involvement',
      source: 'Skiba et al, 2014',
      implications: 'Suspension as discipline harms students long-term.',
      practicalUse: 'Reduce suspension. Replace with restorative.'
    },
    {
      id: 'err7',
      finding: 'Adult students underestimate bullying frequency by 2-3x',
      source: 'Olweus, multiple studies',
      implications: 'Adult-led tracking misses most bullying.',
      practicalUse: 'Student surveys and reporting systems.'
    },
    {
      id: 'err8',
      finding: 'Bullied students have higher rates of anxiety, depression, suicide ideation',
      source: 'Klomek et al, 2007',
      implications: 'Mental health support is essential.',
      practicalUse: 'Counselor capacity. Crisis response. Long-term care.'
    },
    {
      id: 'err9',
      finding: 'Bullies also have worse outcomes long-term than non-involved',
      source: 'Copeland et al, 2013',
      implications: 'Bullies need support too. Punishment alone fails.',
      practicalUse: 'Address root causes. Provide mental health for bullies.'
    },
    {
      id: 'err10',
      finding: 'Bystanders to bullying have worse mental health than non-witnesses',
      source: 'Rivers et al, 2009',
      implications: 'Witnessing harms even non-targets.',
      practicalUse: 'Support all students after incidents.'
    },
    {
      id: 'err11',
      finding: 'School climate predicts bullying rates',
      source: 'Espelage & Swearer, 2003',
      implications: 'Climate-building is prevention.',
      practicalUse: 'Inclusive culture, diverse staff, restorative practices.'
    },
    {
      id: 'err12',
      finding: 'Trauma-informed schools see better outcomes for high-ACE students',
      source: 'SAMHSA',
      implications: 'Trauma-informed is essential.',
      practicalUse: 'Train all staff. Soften environment.'
    },
    {
      id: 'err13',
      finding: 'LGBTQ students experience 2-3x higher bullying rates than non-LGBTQ',
      source: 'GLSEN National School Climate Survey',
      implications: 'LGBTQ students need specific support.',
      practicalUse: 'GSA, inclusive policies, staff training.'
    },
    {
      id: 'err14',
      finding: 'Disabled students experience higher bullying rates than non-disabled',
      source: 'Multiple studies',
      implications: 'Disability-aware support needed.',
      practicalUse: 'Disability rights enforcement, accessible schools.'
    },
    {
      id: 'err15',
      finding: 'Black students face disproportionate discipline',
      source: 'GAO report 2018',
      implications: 'Discipline reform needed.',
      practicalUse: 'Track data. Implement restorative. Address bias.'
    },
    {
      id: 'err16',
      finding: 'Sexual harassment is widespread in schools',
      source: 'AAUW 2011',
      implications: 'Title IX enforcement essential.',
      practicalUse: 'Title IX coordinator, consent education, reporting systems.'
    },
    {
      id: 'err17',
      finding: 'Cyberbullying victims show similar mental health outcomes to physical bullying',
      source: 'Kowalski et al, 2014',
      implications: 'Online harm is real harm.',
      practicalUse: 'Address cyberbullying with same urgency.'
    },
    {
      id: 'err18',
      finding: 'Adult intervention reduces bullying',
      source: 'Olweus Bullying Prevention Program research',
      implications: 'Adults must intervene.',
      practicalUse: 'Train all adults. Make intervention norm.'
    },
    {
      id: 'err19',
      finding: 'Peer support buffers mental health impact',
      source: 'Multiple studies',
      implications: 'Peer support saves lives.',
      practicalUse: 'Build peer support programs.'
    },
    {
      id: 'err20',
      finding: 'Long-term effects of childhood bullying continue into adulthood',
      source: 'Wolke et al, 2013',
      implications: 'Childhood bullying is serious. Long-term care needed.',
      practicalUse: 'Sustained support. Trauma-informed adult services.'
    }
  ];

  var BULLYING_BY_AGE_LIBRARY = [
    {
      id: 'bba1',
      age: 'Early elementary (K-2)',
      commonForms: ['Exclusion', 'Mean words', 'Tattling vs. reporting confusion', 'Physical aggression'],
      whatItLooksLike: 'Often impulsive. Quickly resolved or quickly escalated. Adults play major role.',
      whatBystandersCanDo: ['Tell adult', 'Comfort target', 'Stand with target'],
      systemicNeeds: ['Recess supervision', 'Friendship skill teaching', 'Family engagement']
    },
    {
      id: 'bba2',
      age: 'Late elementary (3-5)',
      commonForms: ['Exclusion intensifies', 'Rumor spreading begins', 'Gender-based teasing', 'Race-based teasing'],
      whatItLooksLike: 'More planned. Group dynamics emerging. Early identity formation.',
      whatBystandersCanDo: ['Refuse to participate', 'Tell adult', 'Sit with target'],
      systemicNeeds: ['SEL curriculum', 'Diversity programming', 'Empathy building']
    },
    {
      id: 'bba3',
      age: 'Middle school (6-8)',
      commonForms: ['Social hierarchies', 'Cyberbullying begins', 'Identity-based harm', 'Sexual harassment'],
      whatItLooksLike: 'Intense. Hidden from adults. Identity tied. Online intensifies.',
      whatBystandersCanDo: ['Direct intervention if safe', 'Tell trusted adult', 'Build inclusive friend group'],
      systemicNeeds: ['Bystander intervention training', 'Cyberbullying policy', 'Identity-affirming spaces']
    },
    {
      id: 'bba4',
      age: 'High school (9-12)',
      commonForms: ['Identity-based harassment', 'Sexual harassment', 'Cyber harassment', 'Substance-related exclusion'],
      whatItLooksLike: 'Adult-like in form. Real long-term consequences. Less adult oversight.',
      whatBystandersCanDo: ['Direct intervention', 'Coalition organizing', 'Reporting systems'],
      systemicNeeds: ['Title IX coordinator', 'Affinity groups', 'Comprehensive bullying policy']
    },
    {
      id: 'bba5',
      age: 'Young adult (18-25)',
      commonForms: ['Workplace bullying', 'Online harassment', 'Identity-based harm', 'Relationship abuse'],
      whatItLooksLike: 'Workplace and adult spaces. Civil rights frame. Real legal stakes.',
      whatBystandersCanDo: ['HR reporting', 'Document', 'EEOC if employment', 'Police if criminal'],
      systemicNeeds: ['ADA enforcement', 'EEOC complaints', 'Civil rights organizations']
    }
  ];

  var GIRL_BULLYING_DEEP = [
    {
      id: 'gbd1',
      pattern: 'Social exclusion',
      examples: ['Coordinated avoidance', 'Group whispers', 'Withdrawal of friendship', 'Cliques'],
      whyItIsHarmful: 'Long-lasting psychological impact. Often invisible to adults.',
      howToIntervene: [
        'Notice withdrawal',
        'Reach out individually',
        'Build wider friendship circles',
        'Talk to counselor'
      ]
    },
    {
      id: 'gbd2',
      pattern: 'Rumor and gossip',
      examples: ['Sexual rumors', 'Family rumors', 'Reputation attacks', 'Group chat spreading'],
      whyItIsHarmful: 'Reputation damage that can last years. Mental health impact.',
      howToIntervene: [
        'Refuse to repeat rumors',
        'Approach person rumored about',
        'Tell trusted adult',
        'Document patterns'
      ]
    },
    {
      id: 'gbd3',
      pattern: 'Friendship manipulation',
      examples: ['Forcing choices between friends', 'Triangulation', 'Hot/cold dynamics', 'Conditional friendship'],
      whyItIsHarmful: 'Erodes self-trust. Builds unstable relationships.',
      howToIntervene: [
        'Honor your own friendships',
        'Refuse triangulation',
        'Talk to counselor',
        'Build multiple friend groups'
      ]
    },
    {
      id: 'gbd4',
      pattern: 'Body and appearance commentary',
      examples: ['Weight comments', 'Diet talk', 'Clothing critique', 'Hair commentary'],
      whyItIsHarmful: 'Internalized body shame. Eating disorders.',
      howToIntervene: [
        'Refuse to engage in body talk',
        'Compliment beyond appearance',
        'Push for body-positive programming',
        'NEDA resources'
      ]
    },
    {
      id: 'gbd5',
      pattern: 'Slut-shaming',
      examples: ['Sexual reputation attacks', 'Slut-shaming clothes', 'Public commentary on sexual activity'],
      whyItIsHarmful: 'Sexual repression. Mental health impact. Higher harm for marginalized girls.',
      howToIntervene: [
        'Refuse to engage',
        'Support targeted girls',
        'Title IX reporting if pattern',
        'Push for consent education'
      ]
    }
  ];

  var BOY_BULLYING_DEEP = [
    {
      id: 'bbd1',
      pattern: 'Physical aggression',
      examples: ['Pushing', 'Hitting', 'Wrestling that escalates', 'Property damage'],
      whyItIsHarmful: 'Physical harm. Normalizes violence.',
      howToIntervene: [
        'Tell adult immediately',
        'Do not engage physically',
        'Document with witnesses',
        'Report to administration'
      ]
    },
    {
      id: 'bbd2',
      pattern: 'Toxic masculinity enforcement',
      examples: ['Mocking emotion', 'Mocking "feminine" interests', 'Pressure to fight', 'Sexual conquest culture'],
      whyItIsHarmful: 'Limits emotional development. Harms boys and girls.',
      howToIntervene: [
        'Refuse to participate in mockery',
        'Model emotional openness',
        'Support boys with diverse interests',
        'Push for healthy masculinity programming'
      ]
    },
    {
      id: 'bbd3',
      pattern: 'Homophobic harassment',
      examples: ['Anti-gay slurs', 'Gay as insult', 'Forced gender conformity', 'Outing'],
      whyItIsHarmful: 'Long-lasting mental health impact. Suicide risk.',
      howToIntervene: [
        'Interrupt slurs',
        'Support LGBTQ peers',
        'Push for GSA and inclusive programming',
        'Connect with Trevor Project'
      ]
    },
    {
      id: 'bbd4',
      pattern: 'Status hierarchy',
      examples: ['Pecking order', 'Pretending to be tough', 'Dominance displays', 'Sports-related social hierarchy'],
      whyItIsHarmful: 'Pressure to perform. Anxiety. Suppresses authenticity.',
      howToIntervene: [
        'Refuse to play status games',
        'Build authentic friendships',
        'Push for inclusive sports',
        'Support diverse friend groups'
      ]
    },
    {
      id: 'bbd5',
      pattern: 'Sexual harassment of girls',
      examples: ['Unwanted touch', 'Sexual comments', 'Sexual rumors', 'Slut-shaming'],
      whyItIsHarmful: 'Sexual violence. Title IX violations. Long-term trauma.',
      howToIntervene: [
        'Refuse to participate',
        'Speak up directly',
        'Title IX reporting',
        'Support targeted girls'
      ]
    }
  ];

  var TRAUMA_INFORMED_BULLYING_RESPONSE = [
    {
      id: 'tibr1',
      principle: 'Safety',
      forTarget: [
        'Immediate physical safety',
        'Emotional safety in space',
        'Predictable environment',
        'Multiple escape routes'
      ],
      forUpstander: [
        'Assess physical risk',
        'Plan exit',
        'Bring witnesses',
        'Self-care after'
      ],
      forHarmer: [
        'Address underlying safety needs',
        'Avoid retraumatizing',
        'Predictable consequences',
        'Support systems'
      ],
      questions: [
        'Is everyone physically safe?',
        'Is everyone emotionally safe?',
        'What needs to be true for safety?'
      ]
    },
    {
      id: 'tibr2',
      principle: 'Trustworthiness',
      forTarget: [
        'Believe disclosures',
        'Follow through on commitments',
        'Honor confidentiality',
        'Transparent about role'
      ],
      forUpstander: [
        'Be transparent about your role',
        'Honor confidentiality',
        'Follow through',
        'Be consistent'
      ],
      forHarmer: [
        'Clear expectations',
        'Honor what they share',
        'Predictable response',
        'Build trust over time'
      ],
      questions: [
        'Am I being trustworthy?',
        'Have I followed through?',
        'What promises have I made?'
      ]
    },
    {
      id: 'tibr3',
      principle: 'Peer support',
      forTarget: [
        'Connect with peer survivors',
        'Affinity groups',
        'Mentorship',
        'Sustained relationships'
      ],
      forUpstander: [
        'Build upstander community',
        'Mutual support',
        'Share strategies',
        'Process together'
      ],
      forHarmer: [
        'Peer accountability',
        'Connection with reformed peers',
        'New community',
        'Sustained relationships'
      ],
      questions: [
        'Who else can support?',
        'What peer groups exist?',
        'How do we build community?'
      ]
    },
    {
      id: 'tibr4',
      principle: 'Collaboration',
      forTarget: [
        'Center their voice',
        'Their priorities lead',
        'Co-create plans',
        'Honor self-determination'
      ],
      forUpstander: [
        'Work with not for',
        'Power-share',
        'Listen first',
        'Honor lived experience'
      ],
      forHarmer: [
        'Engage in change',
        'Co-create accountability',
        'Honor humanity',
        'Build agency'
      ],
      questions: [
        'Who is collaborating?',
        'What power is being shared?',
        'What is being co-created?'
      ]
    },
    {
      id: 'tibr5',
      principle: 'Empowerment',
      forTarget: [
        'Restore agency',
        'Honor choices',
        'Build voice',
        'Resist re-victimization'
      ],
      forUpstander: [
        'Build your own agency',
        'Use your voice',
        'Make choices that fit',
        'Resist coercion'
      ],
      forHarmer: [
        'Build accountable agency',
        'Real choices',
        'Voice in repair',
        'Path forward'
      ],
      questions: [
        'Who has agency?',
        'What choices are real?',
        'Where is voice present?'
      ]
    },
    {
      id: 'tibr6',
      principle: 'Cultural humility',
      forTarget: [
        'Honor identity context',
        'Address historical harms',
        'Cultural competence',
        'Identity-affirming support'
      ],
      forUpstander: [
        'Examine privilege',
        'Build cross-identity coalition',
        'Honor cultural context',
        'Continuous learning'
      ],
      forHarmer: [
        'Cultural context',
        'Historical patterns',
        'Identity-aware accountability',
        'Build identity skills'
      ],
      questions: [
        'What cultural context matters?',
        'What history is relevant?',
        'What privilege is operating?'
      ]
    }
  ];

  var EXTENDED_DAILY_PROMPTS = [
    { id: 'edp1', day: 1, prompt: 'Notice one moment of inclusion today. Write 2 sentences.' },
    { id: 'edp2', day: 2, prompt: 'Notice one moment of exclusion today. Write 2 sentences.' },
    { id: 'edp3', day: 3, prompt: 'Speak up about something small today. Note how it felt.' },
    { id: 'edp4', day: 4, prompt: 'Compliment a peer specifically. Note their response.' },
    { id: 'edp5', day: 5, prompt: 'Sit with someone different at lunch. Write 3 sentences.' },
    { id: 'edp6', day: 6, prompt: 'Refuse to laugh at one cruel joke today. Note the moment.' },
    { id: 'edp7', day: 7, prompt: 'Week 1 reflection. What patterns are you noticing?' },
    { id: 'edp8', day: 8, prompt: 'Check in on one friend who has been quiet. Note the conversation.' },
    { id: 'edp9', day: 9, prompt: 'Use someone\'s correct name and pronouns consistently. Note any moments.' },
    { id: 'edp10', day: 10, prompt: 'Apologize for one small thing today. Note their response.' },
    { id: 'edp11', day: 11, prompt: 'Tell a trusted adult about one observation. Note your feelings.' },
    { id: 'edp12', day: 12, prompt: 'Document one incident in writing. Note what details emerged.' },
    { id: 'edp13', day: 13, prompt: 'Reach out across an identity difference. Note what you learned.' },
    { id: 'edp14', day: 14, prompt: 'Week 2 reflection. What is growing?' },
    { id: 'edp15', day: 15, prompt: 'Stand near someone being targeted today. Note your courage.' },
    { id: 'edp16', day: 16, prompt: 'Make eye contact with someone during a hard moment. Note the impact.' },
    { id: 'edp17', day: 17, prompt: 'Defend a friend behind their back. Note how it felt.' },
    { id: 'edp18', day: 18, prompt: 'Volunteer for something unpopular. Note what you learned.' },
    { id: 'edp19', day: 19, prompt: 'Help a peer with their work. Note the connection.' },
    { id: 'edp20', day: 20, prompt: 'Listen to someone without trying to fix. Note their response.' },
    { id: 'edp21', day: 21, prompt: 'Week 3 reflection. What is shifting?' },
    { id: 'edp22', day: 22, prompt: 'Greet 5 people today specifically. Note any patterns.' },
    { id: 'edp23', day: 23, prompt: 'Refuse one gossip conversation. Note your feelings.' },
    { id: 'edp24', day: 24, prompt: 'Confront a friend privately about something small. Note their response.' },
    { id: 'edp25', day: 25, prompt: 'Read one piece by a marginalized author. Note key insight.' },
    { id: 'edp26', day: 26, prompt: 'Send a thank-you note to someone. Note their response.' },
    { id: 'edp27', day: 27, prompt: 'Take 10 minutes of self-care today. Note how it landed.' },
    { id: 'edp28', day: 28, prompt: 'Week 4 reflection. What is your practice?' },
    { id: 'edp29', day: 29, prompt: 'Connect with one new community resource. Note what you learned.' },
    { id: 'edp30', day: 30, prompt: 'Plan next month\'s upstander practice. What is your focus?' },
    { id: 'edp31', day: 31, prompt: 'Notice one privilege you used today. Note how.' },
    { id: 'edp32', day: 32, prompt: 'Pass an opportunity to someone else. Note who.' },
    { id: 'edp33', day: 33, prompt: 'Practice listening to someone you disagree with. Note what you learned.' },
    { id: 'edp34', day: 34, prompt: 'Notice when you needed help. Did you ask?' },
    { id: 'edp35', day: 35, prompt: 'Share one resource with someone who needs it. Note the impact.' },
    { id: 'edp36', day: 36, prompt: 'Track one privilege you have not noticed before. Note details.' },
    { id: 'edp37', day: 37, prompt: 'Address one microaggression directly today. Note the response.' },
    { id: 'edp38', day: 38, prompt: 'Practice being uncomfortable. Note what you tolerated.' },
    { id: 'edp39', day: 39, prompt: 'Show solidarity across difference. Note the moment.' },
    { id: 'edp40', day: 40, prompt: 'Week 6 reflection. What courage are you growing?' },
    { id: 'edp41', day: 41, prompt: 'Schedule a check-in with one trusted person. Set the date.' },
    { id: 'edp42', day: 42, prompt: 'Notice when you were brave. Note the moment.' },
    { id: 'edp43', day: 43, prompt: 'Notice when you backed off. Note what stopped you.' },
    { id: 'edp44', day: 44, prompt: 'Reach out to someone you have lost touch with. Note their response.' },
    { id: 'edp45', day: 45, prompt: 'Acknowledge a hidden labor in your life. Note who does it.' },
    { id: 'edp46', day: 46, prompt: 'Practice the question "what do you need?" Note responses.' },
    { id: 'edp47', day: 47, prompt: 'Refuse one urgency today. Note what happened.' },
    { id: 'edp48', day: 48, prompt: 'Take a media break. Note how you felt after.' },
    { id: 'edp49', day: 49, prompt: 'Week 7 reflection. What is your big growth?' },
    { id: 'edp50', day: 50, prompt: 'Plan your next phase of upstander practice. Note specifics.' },
    { id: 'edp51', day: 51, prompt: 'Notice three privilege moments. Document each.' },
    { id: 'edp52', day: 52, prompt: 'Speak up in a group conversation. Note the response.' },
    { id: 'edp53', day: 53, prompt: 'Make a small repair for something small. Note their response.' },
    { id: 'edp54', day: 54, prompt: 'Reach out to someone different from you. Note what you learned.' },
    { id: 'edp55', day: 55, prompt: 'Decline one social activity to rest. Note how it felt.' },
    { id: 'edp56', day: 56, prompt: 'Week 8 reflection. What sustainable practice have you built?' },
    { id: 'edp57', day: 57, prompt: 'Acknowledge a victory. Note specifically.' },
    { id: 'edp58', day: 58, prompt: 'Acknowledge a setback. Note what you learned.' },
    { id: 'edp59', day: 59, prompt: 'Reach out to someone you mentored or were mentored by. Note their response.' },
    { id: 'edp60', day: 60, prompt: 'Plan your next quarter. What are your three commitments?' },
    { id: 'edp61', day: 61, prompt: 'Notice one moment of joy today. Note what created it.' },
    { id: 'edp62', day: 62, prompt: 'Refuse one demand for your time. Note what happened.' },
    { id: 'edp63', day: 63, prompt: 'Reach out to a community organization. Note what you learned.' },
    { id: 'edp64', day: 64, prompt: 'Document a pattern over time. Note what is emerging.' },
    { id: 'edp65', day: 65, prompt: 'Apologize for a longstanding harm. Note their response.' },
    { id: 'edp66', day: 66, prompt: 'Connect a friend with a resource. Note the result.' },
    { id: 'edp67', day: 67, prompt: 'Practice asking instead of assuming. Note new information.' },
    { id: 'edp68', day: 68, prompt: 'Acknowledge complicated feelings. Note them without solving.' },
    { id: 'edp69', day: 69, prompt: 'Refuse to be silent about an injustice. Note the moment.' },
    { id: 'edp70', day: 70, prompt: 'Week 10 reflection. Who are you becoming?' },
    { id: 'edp71', day: 71, prompt: 'Notice your own privilege in a new context. Note details.' },
    { id: 'edp72', day: 72, prompt: 'Make a small donation to a cause. Note why.' },
    { id: 'edp73', day: 73, prompt: 'Attend a community event. Note what you learned.' },
    { id: 'edp74', day: 74, prompt: 'Reach out to a former teacher or mentor. Note their response.' },
    { id: 'edp75', day: 75, prompt: 'Write a letter to your future self about your practice. Save it.' },
    { id: 'edp76', day: 76, prompt: 'Practice receiving help. Note how it felt.' },
    { id: 'edp77', day: 77, prompt: 'Plan a celebration for a milestone. Note specifics.' },
    { id: 'edp78', day: 78, prompt: 'Acknowledge a setback. Note what you learned.' },
    { id: 'edp79', day: 79, prompt: 'Reach out to a former target you may have harmed. Note results.' },
    { id: 'edp80', day: 80, prompt: 'Week 12 reflection. What is your big lesson?' },
    { id: 'edp81', day: 81, prompt: 'Take an action you have been putting off. Note your feelings.' },
    { id: 'edp82', day: 82, prompt: 'Connect with one mentor. Note their wisdom.' },
    { id: 'edp83', day: 83, prompt: 'Make a long-term commitment. Write it down.' },
    { id: 'edp84', day: 84, prompt: 'Acknowledge a relationship that needs repair. Note next steps.' },
    { id: 'edp85', day: 85, prompt: 'Refuse a familiar pattern. Note what you tried instead.' },
    { id: 'edp86', day: 86, prompt: 'Take care of yourself today. Note specifically what.' },
    { id: 'edp87', day: 87, prompt: 'Show up for someone else. Note specifically how.' },
    { id: 'edp88', day: 88, prompt: 'Notice your own growth. Note three concrete examples.' },
    { id: 'edp89', day: 89, prompt: 'Acknowledge an ongoing struggle. Note your strategy.' },
    { id: 'edp90', day: 90, prompt: '90-day reflection. Where will you be in 90 more days?' }
  ];

  var MICRO_PRACTICE_LIBRARY = [
    {
      id: 'mpl1',
      practice: 'The 5-second smile',
      timeNeeded: '5 sec',
      situation: 'You see someone alone',
      howTo: ['Make eye contact', 'Smile briefly', 'Move on'],
      whyItWorks: 'Acknowledgment of presence. No words required.',
      progression: 'After 1 week, add a brief "hi". After 2 weeks, add a question.'
    },
    {
      id: 'mpl2',
      practice: 'The 10-second name',
      timeNeeded: '10 sec',
      situation: 'You learn someone\'s name',
      howTo: ['Use their name in conversation', 'Repeat to remember', 'Use it consistently'],
      whyItWorks: 'Names matter. Using them shows recognition.',
      progression: 'After 1 month, you remember all peers\' names.'
    },
    {
      id: 'mpl3',
      practice: 'The 30-second interruption',
      timeNeeded: '30 sec',
      situation: 'You hear a slur',
      howTo: ['Pause', 'Say "stop, that word is not okay"', 'Move on'],
      whyItWorks: 'Brief interruption breaks pattern.',
      progression: 'After 5 uses, becomes automatic.'
    },
    {
      id: 'mpl4',
      practice: 'The 1-minute apology',
      timeNeeded: '1 min',
      situation: 'You realize you have caused harm',
      howTo: ['Approach person privately', 'State what you did', 'Express remorse', 'Ask what they need'],
      whyItWorks: 'Quick apology prevents drift.',
      progression: 'After 10 apologies, repair becomes habit.'
    },
    {
      id: 'mpl5',
      practice: 'The 5-minute check-in',
      timeNeeded: '5 min',
      situation: 'You notice peer is struggling',
      howTo: ['Approach privately', 'Ask how they are', 'Listen', 'Offer specific help'],
      whyItWorks: 'Brief care matters.',
      progression: 'After 20 check-ins, you are known for caring.'
    },
    {
      id: 'mpl6',
      practice: 'The lunch buddy',
      timeNeeded: '30 min',
      situation: 'You see someone alone at lunch',
      howTo: ['Walk over', 'Ask if you can sit', 'Be friendly without forcing'],
      whyItWorks: 'Lunch is the loneliest time for many.',
      progression: 'After 4 weeks, you and they are friends.'
    },
    {
      id: 'mpl7',
      practice: 'The hallway walk',
      timeNeeded: '3 min',
      situation: 'You see someone walking alone',
      howTo: ['Walk near them', 'Brief friendly conversation if natural', 'Companionship'],
      whyItWorks: 'Crowded hallways are isolating.',
      progression: 'After 1 month, you have walking friends.'
    },
    {
      id: 'mpl8',
      practice: 'The class question',
      timeNeeded: '1 min',
      situation: 'A peer is being put on the spot',
      howTo: ['Raise your hand', 'Ask a related question', 'Redirect attention'],
      whyItWorks: 'Defuses the spotlight.',
      progression: 'After 5 uses, the peer notices.'
    },
    {
      id: 'mpl9',
      practice: 'The note exchange',
      timeNeeded: '5 min',
      situation: 'A peer is anxious about a test',
      howTo: ['Offer your notes', 'Help them study', 'Build mutual aid'],
      whyItWorks: 'Mutual aid is upstander practice.',
      progression: 'After 10 exchanges, study group forms.'
    },
    {
      id: 'mpl10',
      practice: 'The locker chat',
      timeNeeded: '2 min',
      situation: 'You see a peer at their locker',
      howTo: ['Brief friendly comment', 'Move on'],
      whyItWorks: 'Daily acknowledgment builds connection.',
      progression: 'After 1 semester, dozens of acquaintances.'
    },
    {
      id: 'mpl11',
      practice: 'The introduction',
      timeNeeded: '30 sec',
      situation: 'You meet a new person',
      howTo: ['Offer your name', 'Ask theirs', 'Welcome them'],
      whyItWorks: 'New people are vulnerable.',
      progression: 'After 10 new introductions, you become a hub.'
    },
    {
      id: 'mpl12',
      practice: 'The thank you',
      timeNeeded: '15 sec',
      situation: 'Someone does something kind',
      howTo: ['Notice', 'Express specific gratitude', 'Be sincere'],
      whyItWorks: 'Gratitude builds community.',
      progression: 'After 1 month, you are known for noticing.'
    },
    {
      id: 'mpl13',
      practice: 'The boundary',
      timeNeeded: '5 sec',
      situation: 'Someone crosses your line',
      howTo: ['State the boundary', 'Hold it'],
      whyItWorks: 'Personal boundaries model healthy relationships.',
      progression: 'After 5 uses, comfortable holding lines.'
    },
    {
      id: 'mpl14',
      practice: 'The deflection',
      timeNeeded: '10 sec',
      situation: 'Conversation turns mean',
      howTo: ['Change subject', 'Ask different question', 'Move along'],
      whyItWorks: 'Brief redirect breaks pattern.',
      progression: 'After 10 uses, natural part of conversation.'
    },
    {
      id: 'mpl15',
      practice: 'The exit',
      timeNeeded: '30 sec',
      situation: 'Space becomes harmful',
      howTo: ['Make excuse', 'Leave gracefully', 'Self-care after'],
      whyItWorks: 'Leaving is a choice. Honoring your safety.',
      progression: 'After 5 uses, easier to leave.'
    }
  ];

  var EVERYDAY_UPSTANDER_MOMENTS = [
    {
      id: 'eum1',
      moment: 'Greeting someone alone',
      duration: '5 sec',
      frequency: 'Daily',
      whatToDo: 'Make eye contact and say hi to one person who looks alone today.',
      whyItMatters: 'Acknowledgment combats invisibility.'
    },
    {
      id: 'eum2',
      moment: 'Sitting with someone new',
      duration: '30 min',
      frequency: 'Weekly',
      whatToDo: 'Sit with someone you do not usually sit with.',
      whyItMatters: 'Breaks group patterns. Builds new connections.'
    },
    {
      id: 'eum3',
      moment: 'Compliment specifically',
      duration: '10 sec',
      frequency: 'Daily',
      whatToDo: 'Give one specific compliment to someone.',
      whyItMatters: 'Specific compliments mean you actually noticed.'
    },
    {
      id: 'eum4',
      moment: 'Refuse cruelty in chat',
      duration: '30 sec',
      frequency: 'As needed',
      whatToDo: 'When chat gets mean, change subject or leave.',
      whyItMatters: 'Refusing to participate breaks pattern.'
    },
    {
      id: 'eum5',
      moment: 'Check in on quiet friend',
      duration: '5 min',
      frequency: 'Weekly',
      whatToDo: 'Reach out to friend who has been quiet.',
      whyItMatters: 'People often need someone to notice.'
    },
    {
      id: 'eum6',
      moment: 'Use someone\'s correct name',
      duration: '1 sec',
      frequency: 'Always',
      whatToDo: 'Pronounce names correctly. Use correct pronouns. Use correct nicknames.',
      whyItMatters: 'Names and pronouns matter.'
    },
    {
      id: 'eum7',
      moment: 'Apologize for small thing',
      duration: '30 sec',
      frequency: 'Weekly',
      whatToDo: 'Apologize for one small thing you did.',
      whyItMatters: 'Apology muscle gets stronger with practice.'
    },
    {
      id: 'eum8',
      moment: 'Walk with someone',
      duration: '5 min',
      frequency: 'Daily if possible',
      whatToDo: 'Walk with someone who is heading the same direction.',
      whyItMatters: 'Companionship matters more than we realize.'
    },
    {
      id: 'eum9',
      moment: 'Make space at table',
      duration: '5 sec',
      frequency: 'As needed',
      whatToDo: 'Physically move bags or chair to invite someone.',
      whyItMatters: 'Physical inclusion is real.'
    },
    {
      id: 'eum10',
      moment: 'Refuse to laugh at cruelty',
      duration: '1 sec',
      frequency: 'Always',
      whatToDo: 'Do not laugh when someone is being mocked.',
      whyItMatters: 'Laughter is participation.'
    },
    {
      id: 'eum11',
      moment: 'Tell trusted adult what you saw',
      duration: '5 min',
      frequency: 'As needed',
      whatToDo: 'Share observation with adult.',
      whyItMatters: 'Adults can intervene in ways you cannot.'
    },
    {
      id: 'eum12',
      moment: 'Document an incident',
      duration: '5 min',
      frequency: 'As needed',
      whatToDo: 'Write down what you observed.',
      whyItMatters: 'Records create accountability.'
    },
    {
      id: 'eum13',
      moment: 'Reach out across difference',
      duration: 'Variable',
      frequency: 'Weekly',
      whatToDo: 'Connect with someone of different identity than you.',
      whyItMatters: 'Bridges build community.'
    },
    {
      id: 'eum14',
      moment: 'Smile at a peer in hallway',
      duration: '1 sec',
      frequency: 'Daily',
      whatToDo: 'Brief acknowledgment of peer.',
      whyItMatters: 'Small acknowledgment matters.'
    },
    {
      id: 'eum15',
      moment: 'Stand near targeted peer',
      duration: 'Variable',
      frequency: 'As needed',
      whatToDo: 'Position yourself near someone being targeted.',
      whyItMatters: 'Presence is protection.'
    },
    {
      id: 'eum16',
      moment: 'Make eye contact during harm',
      duration: '1 sec',
      frequency: 'As needed',
      whatToDo: 'Catch target\'s eye in support.',
      whyItMatters: 'Witness is care.'
    },
    {
      id: 'eum17',
      moment: 'Defend friend behind their back',
      duration: 'Variable',
      frequency: 'As needed',
      whatToDo: 'Speak up for friends when they are not present.',
      whyItMatters: 'Real friendship is in absence too.'
    },
    {
      id: 'eum18',
      moment: 'Volunteer for unpopular task',
      duration: 'Variable',
      frequency: 'Weekly',
      whatToDo: 'Take a turn doing something nobody wants.',
      whyItMatters: 'Equity in shared work.'
    },
    {
      id: 'eum19',
      moment: 'Help peer with homework',
      duration: '15-30 min',
      frequency: 'Weekly',
      whatToDo: 'Share your knowledge or notes.',
      whyItMatters: 'Mutual aid builds community.'
    },
    {
      id: 'eum20',
      moment: 'Listen without solving',
      duration: 'Variable',
      frequency: 'Weekly',
      whatToDo: 'When peer shares, just listen.',
      whyItMatters: 'Being heard is healing.'
    }
  ];

  var IDENTITY_HARM_DEEPER = [
    {
      id: 'ihd_d1',
      identity: 'Black students',
      specificHarms: [
        'Disproportionate discipline (suspensions, referrals)',
        'Tone policing',
        'Hair-based harassment',
        'Cultural mockery',
        'Microaggressions',
        'Adultification (treated as older)',
        'Tracking out of advanced courses'
      ],
      lawsThatProtect: ['Title VI', 'CROWN Act (state-level)', 'OCR'],
      whatBystandersCanDo: [
        'Track discipline data',
        'Interrupt slurs',
        'Stand with peers',
        'Push for inclusive curriculum',
        'Support BIPOC organizations'
      ],
      systemicFixesNeeded: [
        'Discipline reform',
        'Culturally responsive teaching',
        'Diverse curriculum',
        'BIPOC educator hiring',
        'Anti-racist training'
      ]
    },
    {
      id: 'ihd_d2',
      identity: 'Latine students',
      specificHarms: [
        'Anti-immigrant comments',
        'Language-based harassment',
        'Stereotyping',
        'Mocking accents',
        'ESL stigma',
        'Family status policing'
      ],
      lawsThatProtect: ['Title VI', 'EEOA', 'OCR'],
      whatBystandersCanDo: [
        'Interrupt anti-immigrant language',
        'Support multilingual education',
        'Stand with Latine peers',
        'Push for bilingual resources'
      ],
      systemicFixesNeeded: [
        'Bilingual education funding',
        'Latine curriculum representation',
        'Family engagement in Spanish',
        'Sanctuary policies'
      ]
    },
    {
      id: 'ihd_d3',
      identity: 'Asian-American students',
      specificHarms: [
        'Model minority myth pressure',
        'Anti-Asian harassment',
        'Sexual stereotyping',
        'Mocking food, names',
        'Erasure of diversity within Asian-American',
        'Exclusion from racial dialogue'
      ],
      lawsThatProtect: ['Title VI', 'OCR'],
      whatBystandersCanDo: [
        'Address model minority myth',
        'Interrupt slurs',
        'Push for Asian-American curriculum',
        'Stand with Asian-American peers'
      ],
      systemicFixesNeeded: [
        'Asian-American studies',
        'Hate crime tracking',
        'Multilingual support',
        'Inclusion in racial justice conversation'
      ]
    },
    {
      id: 'ihd_d4',
      identity: 'Indigenous students',
      specificHarms: [
        'Cultural erasure',
        'Stereotyping (mascots, costumes)',
        'Hair-based harassment',
        'Religion-based harassment',
        'Land acknowledgment absent',
        'Treaty rights ignored'
      ],
      lawsThatProtect: ['Title VI', 'Tribal sovereignty law'],
      whatBystandersCanDo: [
        'Reject racist mascots',
        'Support Indigenous students',
        'Push for Indigenous curriculum',
        'Land acknowledgment'
      ],
      systemicFixesNeeded: [
        'Indigenous curriculum',
        'Cultural protection',
        'Treaty rights education',
        'Native staff hiring'
      ]
    },
    {
      id: 'ihd_d5',
      identity: 'Middle Eastern and North African (MENA) students',
      specificHarms: [
        'Islamophobic harassment',
        'Anti-Arab harassment',
        'Religion-based harassment',
        'Name-based discrimination',
        'Profiling',
        'Post-9/11 surveillance'
      ],
      lawsThatProtect: ['Title VI', 'OCR'],
      whatBystandersCanDo: [
        'Interrupt anti-Muslim language',
        'Support MENA peers',
        'Push for inclusive curriculum',
        'Interfaith student programs'
      ],
      systemicFixesNeeded: [
        'MENA curriculum',
        'Religious accommodation',
        'Profiling reforms',
        'Inclusive Arab and Islamic education'
      ]
    },
    {
      id: 'ihd_d6',
      identity: 'LGBTQ students',
      specificHarms: [
        'Slurs and homophobic/transphobic language',
        'Misgendering',
        'Deadnaming',
        'Bathroom access denial',
        'Outing without consent',
        'Forced conformity to gender roles'
      ],
      lawsThatProtect: ['Title IX (in some interpretations)', 'State protections', 'OCR'],
      whatBystandersCanDo: [
        'Use correct names and pronouns',
        'Interrupt anti-LGBTQ language',
        'Support GSA',
        'Stand with LGBTQ peers'
      ],
      systemicFixesNeeded: [
        'Inclusive curriculum',
        'Trans-affirming policies',
        'Staff training',
        'Mental health resources'
      ]
    },
    {
      id: 'ihd_d7',
      identity: 'Disabled students',
      specificHarms: [
        'Slurs (retard, etc.)',
        'Mocking of disability features',
        'Refusal to honor accommodations',
        'Exclusion based on access',
        'Inspiration porn',
        'Sabotaging accommodations'
      ],
      lawsThatProtect: ['Section 504', 'ADA', 'IDEA', 'OCR'],
      whatBystandersCanDo: [
        'Use identity-affirming language',
        'Support accommodations',
        'Stand with disabled peers',
        'Push for accessibility'
      ],
      systemicFixesNeeded: [
        'Universal design',
        'Inclusion practices',
        'Staff training',
        'Disability culture curriculum'
      ]
    },
    {
      id: 'ihd_d8',
      identity: 'Students with mental health conditions',
      specificHarms: [
        'Mockery of mental illness',
        'Casual use of mental health terms as insults',
        'Outing without consent',
        'Refusal of accommodations',
        'Treatment as dangerous'
      ],
      lawsThatProtect: ['Section 504', 'ADA', 'OCR'],
      whatBystandersCanDo: [
        'Interrupt mental health stigma',
        'Support peers with conditions',
        'Push for mental health resources',
        'Connect with NAMI'
      ],
      systemicFixesNeeded: [
        'Mental health curriculum',
        'School counselor expansion',
        'Stigma reduction',
        'Crisis resources'
      ]
    },
    {
      id: 'ihd_d9',
      identity: 'Students with chronic illness',
      specificHarms: [
        'Disbelief of invisible illness',
        'Faking accusations',
        'Refusal of accommodations',
        'Exclusion from activities',
        '"You do not look sick"'
      ],
      lawsThatProtect: ['Section 504', 'ADA'],
      whatBystandersCanDo: [
        'Believe disclosed illness',
        'Support accommodations',
        'Stand with peers',
        'Push for understanding'
      ],
      systemicFixesNeeded: [
        'Health education',
        'Accommodation honoring',
        'Flexible attendance',
        'Mental health support'
      ]
    },
    {
      id: 'ihd_d10',
      identity: 'Lower-income students',
      specificHarms: [
        'Clothing mockery',
        'Free/reduced lunch teasing',
        'Exclusion from cost-based activities',
        'Tracking and lower expectations',
        'Family stigma'
      ],
      lawsThatProtect: ['Limited federal; state varies'],
      whatBystandersCanDo: [
        'Refuse to participate in class mockery',
        'Push for universal free programs',
        'Equity in extracurriculars',
        'Conscious dress codes'
      ],
      systemicFixesNeeded: [
        'Universal free meals',
        'Free extracurriculars',
        'Equity in resources',
        'Class-aware policies'
      ]
    }
  ];

  var FAMILY_GUIDES_DEEP = [
    {
      id: 'fgd1',
      audience: 'Parents of bullied child',
      whatToDo: [
        'Listen first, without solving',
        'Believe your child',
        'Document everything',
        'Engage with school proactively',
        'Get mental health support',
        'Help build resilience',
        'Stay engaged over time'
      ],
      whatNotToDo: [
        'Tell them to ignore it',
        'Tell them to fight back',
        'Blame them for being targeted',
        'Confront other family directly',
        'Make decisions without your child'
      ],
      conversationStarters: [
        'How was school today, really?',
        'Is there anything happening at school you wish was different?',
        'I noticed you seemed [observation]. Can you tell me about that?'
      ],
      signsToWatchFor: [
        'School avoidance',
        'Sleep changes',
        'Mood changes',
        'Withdrawal from activities',
        'Physical complaints',
        'Lost or damaged belongings'
      ]
    },
    {
      id: 'fgd2',
      audience: 'Parents of child who bullies',
      whatToDo: [
        'Take it seriously',
        'Understand root cause',
        'Get mental health support',
        'Work with school accountability AND support',
        'Model change',
        'Build empathy through engagement'
      ],
      whatNotToDo: [
        'Defend the behavior',
        'Blame the school',
        'Treat as phase',
        'Punish without addressing why',
        'Hide your child\'s actions'
      ],
      questions: [
        'What was going on for you when this happened?',
        'What do you think the impact was?',
        'What would you have wanted if it had been you?',
        'How can you make it right?'
      ],
      considerations: [
        'Hurt people hurt people',
        'Therapy may help',
        'Family dynamics may need addressing',
        'Long-term commitment required'
      ]
    },
    {
      id: 'fgd3',
      audience: 'Parents of bystander',
      whatToDo: [
        'Build vocabulary about upstander vs bystander',
        'Discuss family values',
        'Build empathy through stories',
        'Practice scenarios at home',
        'Affirm courage you see',
        'Model upstander behavior'
      ],
      questions: [
        'What did you see?',
        'What did you think about it?',
        'What did you do?',
        'What might you do next time?'
      ],
      practiceScenarios: [
        'What would you do if you saw someone being teased?',
        'What if it was your friend doing the teasing?',
        'What if you were scared of being targeted next?'
      ]
    },
    {
      id: 'fgd4',
      audience: 'Parents of LGBTQ child',
      whatToDo: [
        'Use correct name and pronouns',
        'Connect with LGBTQ resources',
        'Find affirming therapist',
        'Address family if needed',
        'Push school for affirming environment'
      ],
      resources: [
        'PFLAG (pflag.org)',
        'Trevor Project',
        'Local LGBTQ youth group',
        'GLSEN'
      ]
    },
    {
      id: 'fgd5',
      audience: 'Parents of disabled child',
      whatToDo: [
        'Read your child\'s IEP/504',
        'Engage with case manager',
        'Advocate for accommodations',
        'Connect with disability community',
        'Push for inclusive school'
      ],
      resources: [
        'P&A organization (state P&A)',
        'Parent Training and Information Center (state PTI)',
        'Wrightslaw',
        'Local disability rights groups'
      ]
    },
    {
      id: 'fgd6',
      audience: 'Parents of child of color',
      whatToDo: [
        'Address racism in family discussions',
        'Build identity affirmation',
        'Track discipline patterns',
        'Document differential treatment',
        'Connect with community organizations'
      ],
      resources: [
        'NAACP',
        'Local racial justice organizations',
        'Heritage and cultural groups',
        'Books and media reflecting identity'
      ]
    },
    {
      id: 'fgd7',
      audience: 'Foster and adoptive parents',
      whatToDo: [
        'Address adoption/foster identity at home',
        'Watch for bullying about family structure',
        'Connect with adoption-affirming community',
        'Engage with trauma-informed services',
        'Build long-term identity work'
      ],
      resources: [
        'Adoption support groups',
        'Foster youth advocacy',
        'Trauma-informed therapy',
        'Heritage resources if applicable'
      ]
    },
    {
      id: 'fgd8',
      audience: 'Single parents',
      whatToDo: [
        'Build support network for self',
        'Engage with school despite time constraints',
        'Find allies in school community',
        'Take care of yourself',
        'Connect with other single parents'
      ],
      resources: [
        'Single parent support groups',
        'School parent organization',
        'Community center programs',
        'Religious community if applicable'
      ]
    }
  ];

  var BYSTANDER_INTERVENTION_FRAMEWORKS_DEEP = [
    {
      id: 'bifd1',
      framework: '5 Ds of Bystander Intervention',
      origin: 'Green Dot, Bringing in the Bystander',
      components: [
        {
          d: 'Direct',
          description: 'Directly addressing harm. Speaking up. Confronting.',
          examples: ['Tell them to stop', 'Ask what is going on', 'State your boundary'],
          whenToUse: 'When safe AND you have authority/relationship',
          whenNotToUse: 'When physical safety at risk'
        },
        {
          d: 'Distract',
          description: 'Redirect attention away from harm.',
          examples: ['Ask unrelated question', 'Knock over a glass', 'Create a diversion'],
          whenToUse: 'When direct is too risky',
          whenNotToUse: 'When harm requires sustained attention'
        },
        {
          d: 'Delegate',
          description: 'Get help from someone else.',
          examples: ['Call security', 'Tell teacher', 'Get parent'],
          whenToUse: 'When you cannot intervene yourself',
          whenNotToUse: 'When immediate action needed'
        },
        {
          d: 'Document',
          description: 'Record what happened.',
          examples: ['Screenshot', 'Video (if safe)', 'Written notes'],
          whenToUse: 'When pattern needs evidence',
          whenNotToUse: 'When taking time to document delays helping'
        },
        {
          d: 'Delay',
          description: 'Follow up after the moment.',
          examples: ['Check in next day', 'Ask if okay', 'Tell trusted adult'],
          whenToUse: 'After incident has passed',
          whenNotToUse: 'When immediate action needed'
        }
      ]
    },
    {
      id: 'bifd2',
      framework: 'Bystander Intervention Steps (Latane & Darley)',
      origin: 'Classic psychological research',
      components: [
        {
          step: 1,
          name: 'Notice the event',
          description: 'Recognize that something is happening',
          barriers: ['Distraction', 'Misperception', 'Habituation'],
          counters: ['Train to notice', 'Slow down', 'Practice attention']
        },
        {
          step: 2,
          name: 'Interpret as emergency',
          description: 'Decide this is something requiring intervention',
          barriers: ['Pluralistic ignorance', 'Ambiguity', 'Wishful thinking'],
          counters: ['Trust your gut', 'Default to action when uncertain']
        },
        {
          step: 3,
          name: 'Take responsibility',
          description: 'Decide you specifically should act',
          barriers: ['Diffusion of responsibility', 'Assumed expertise of others'],
          counters: ['Make yourself responsible', 'Identify specific people']
        },
        {
          step: 4,
          name: 'Know what to do',
          description: 'Have the skills to intervene',
          barriers: ['Lack of training', 'Uncertainty', 'No script'],
          counters: ['Training', 'Practice', 'Frameworks']
        },
        {
          step: 5,
          name: 'Implement',
          description: 'Actually take action',
          barriers: ['Fear', 'Social cost', 'Risk'],
          counters: ['Practice', 'Build courage', 'Coalition support']
        }
      ]
    },
    {
      id: 'bifd3',
      framework: 'Trauma-Informed Bystander Intervention',
      origin: 'Movement-aligned framework',
      components: [
        {
          principle: 'Safety first',
          description: 'Establish safety for self and target',
          actions: ['Assess physical risk', 'Plan exit', 'Self-care after']
        },
        {
          principle: 'Target-centered',
          description: 'Follow target lead',
          actions: ['Ask what they want', 'Honor their pace', 'Do not assume']
        },
        {
          principle: 'Trauma-aware',
          description: 'Recognize impact on all involved',
          actions: ['Notice activation', 'Build regulation', 'Provide resources']
        },
        {
          principle: 'Community-rooted',
          description: 'Build sustainable practice',
          actions: ['Find allies', 'Share strategies', 'Care for community']
        }
      ]
    }
  ];

  var REPAIR_PROCESS_DEEP = [
    {
      id: 'rpd_r1',
      stage: 'Acknowledgment',
      description: 'Name what happened. Specifically. Without minimization.',
      script: 'I acknowledge that I [specific action]. I see the impact was [impact].',
      pitfalls: ['Vague apologies', 'Defensive explanations', 'Centering self']
    },
    {
      id: 'rpd_r2',
      stage: 'Responsibility',
      description: 'Take full responsibility for your part.',
      script: 'I am responsible for [specific]. Not the context, not the moment, the action itself.',
      pitfalls: ['Sharing blame', 'External excuses', 'Diluting']
    },
    {
      id: 'rpd_r3',
      stage: 'Empathy',
      description: 'Demonstrate understanding of impact.',
      script: 'I see how it affected you: [specific impacts]. I am sorry.',
      pitfalls: ['Telling them how to feel', 'Minimizing impact']
    },
    {
      id: 'rpd_r4',
      stage: 'Repair offer',
      description: 'Concrete action to address harm.',
      script: 'I would like to [specific action]. Would that help?',
      pitfalls: ['Promising too much', 'Not following through']
    },
    {
      id: 'rpd_r5',
      stage: 'Listen',
      description: 'Hear their response without defending.',
      script: '[Silent listening]',
      pitfalls: ['Interrupting', 'Defending']
    },
    {
      id: 'rpd_r6',
      stage: 'Adjust',
      description: 'Modify your repair based on their input.',
      script: 'I hear that what would help is [their request]. I will do that.',
      pitfalls: ['Sticking to your original plan']
    },
    {
      id: 'rpd_r7',
      stage: 'Commit to change',
      description: 'Specific commitments going forward.',
      script: 'Going forward, I will [specific commitments].',
      pitfalls: ['Vague promises', 'Promising what you cannot deliver']
    },
    {
      id: 'rpd_r8',
      stage: 'Follow through',
      description: 'Actually do what you committed to.',
      script: '[Action over time]',
      pitfalls: ['Forgetting', 'Losing momentum']
    },
    {
      id: 'rpd_r9',
      stage: 'Honor their timeline',
      description: 'Repair is on their timeline, not yours.',
      script: '[Patient presence]',
      pitfalls: ['Demanding forgiveness', 'Acting wronged by their slowness']
    },
    {
      id: 'rpd_r10',
      stage: 'Long-term',
      description: 'Sustain the change over months and years.',
      script: '[Ongoing practice]',
      pitfalls: ['Reverting to old patterns', 'Forgetting why you changed']
    }
  ];

  var INTERVENTION_SCRIPT_LIBRARY = [
    { id: 'isl1', context: 'Witnessing a slur in a hallway', script: 'Hey. That word is not okay. Please stop.' },
    { id: 'isl2', context: 'Group chat going cruel', script: 'I am out. This is going too far. We can do better.' },
    { id: 'isl3', context: 'Lunch table exclusion', script: 'Hey, come sit here. I will make space.' },
    { id: 'isl4', context: 'Friend mocking peer', script: 'I do not laugh at that. Let us pick a different topic.' },
    { id: 'isl5', context: 'Witnessing harassment online', script: 'I screenshotted this. I am telling someone.' },
    { id: 'isl6', context: 'Teacher singling out student', script: '[Raise hand and engage] Could you explain the concept again? I want to make sure I understand.' },
    { id: 'isl7', context: 'Coach yelling at one player', script: 'Coach, can I talk to you privately after practice?' },
    { id: 'isl8', context: 'Parent harassing teacher', script: 'I am going to step over to the office and get the principal.' },
    { id: 'isl9', context: 'Sibling teasing target', script: 'Knock it off. They are off limits.' },
    { id: 'isl10', context: 'Friend disclosing harm', script: 'I hear you. This is not your fault. What do you need?' },
    { id: 'isl11', context: 'Friend admitting they were the harmer', script: 'I appreciate you telling me. How can I support you in making it right?' },
    { id: 'isl12', context: 'Stranger harassing someone in public', script: 'Excuse me, do you know what time it is? [To target] Want to walk with me?' },
    { id: 'isl13', context: 'Subtle exclusion in friend group', script: 'Let us all hang out this weekend. Everyone is invited.' },
    { id: 'isl14', context: 'Slur as joke', script: 'I do not think that is funny. Lets not.' },
    { id: 'isl15', context: 'Stereotype repetition', script: 'That stereotype is not true. Here is what is actually...' },
    { id: 'isl16', context: 'Body shaming at lunch', script: 'Lets eat. Bodies are not for commentary.' },
    { id: 'isl17', context: 'Misgendering by peer', script: 'Their pronouns are ___. Could you use those?' },
    { id: 'isl18', context: 'Deadnaming by peer', script: 'Their name is ___ now. Could you use it?' },
    { id: 'isl19', context: 'Class clown at expense of struggling student', script: 'Lets focus. They are trying.' },
    { id: 'isl20', context: 'Mocking accent', script: 'Their accent is fine. Lets just listen to what they are saying.' },
    { id: 'isl21', context: 'Mocking disability', script: 'That is ableist. Stop.' },
    { id: 'isl22', context: 'Religious mockery', script: 'That is their religion. Respect it.' },
    { id: 'isl23', context: 'Sexist comment', script: 'That comment is sexist. Knock it off.' },
    { id: 'isl24', context: 'Racist comment', script: 'That comment is racist. Stop.' },
    { id: 'isl25', context: 'Homophobic comment', script: 'That is homophobic. Stop.' },
    { id: 'isl26', context: 'Transphobic comment', script: 'That is transphobic. Stop.' },
    { id: 'isl27', context: 'Xenophobic comment', script: 'That is xenophobic. Stop.' },
    { id: 'isl28', context: 'Anti-Semitic comment', script: 'That is anti-Semitic. Knock it off.' },
    { id: 'isl29', context: 'Islamophobic comment', script: 'That is Islamophobic. Stop.' },
    { id: 'isl30', context: 'Classist comment', script: 'That is classist. Lets not.' },
    { id: 'isl31', context: 'Friend revealing rumor', script: 'I do not need to hear that. Lets talk about something else.' },
    { id: 'isl32', context: 'Witnessing photo being shared without consent', script: 'Stop. Delete that. We are not doing this.' },
    { id: 'isl33', context: 'Friend asking you to participate in harm', script: 'No. I am not doing that.' },
    { id: 'isl34', context: 'Witnessing physical fight starting', script: 'Stop. [Find adult]' },
    { id: 'isl35', context: 'Witnessing intoxication harm', script: 'I am calling someone. You need help.' },
    { id: 'isl36', context: 'Friend in crisis online', script: 'Are you safe right now? I am calling someone who can help.' },
    { id: 'isl37', context: 'Anonymous account harassing peer', script: 'I am reporting this account. Block it.' },
    { id: 'isl38', context: 'Pile-on in comment thread', script: 'This thread is going wrong. I am out.' },
    { id: 'isl39', context: 'Witnessing slur on bathroom wall', script: 'I am reporting this to the principal.' },
    { id: 'isl40', context: 'Friend defending harmful action', script: 'I get you are loyal. AND what they did was wrong.' },
    { id: 'isl41', context: 'Family member making harmful joke', script: 'I do not laugh at that. Lets change the topic.' },
    { id: 'isl42', context: 'Adult making harmful comment', script: 'I want to share that I disagree with what you just said.' },
    { id: 'isl43', context: 'Authority figure abusing power', script: 'I am going to talk to your supervisor.' },
    { id: 'isl44', context: 'Witnessing public meltdown', script: 'Is anyone helping? [To person] Can I sit near you?' },
    { id: 'isl45', context: 'Coach scolding player publicly', script: 'Coach, can we keep that for after practice?' },
    { id: 'isl46', context: 'Group laughing at someone', script: 'I am going to check on them. Take care of yourselves.' },
    { id: 'isl47', context: 'Adults gossiping about student', script: 'I am uncomfortable with this conversation.' },
    { id: 'isl48', context: 'Witnessing animal abuse', script: 'I am calling animal control.' },
    { id: 'isl49', context: 'Witnessing elder abuse', script: 'I am calling Adult Protective Services.' },
    { id: 'isl50', context: 'Witnessing child abuse', script: 'I am calling Child Protective Services.' }
  ];

  var ALLIES_AND_ACCOMPLICES_DEEP = [
    {
      id: 'aad1',
      stage: 'Awakening',
      whatItLooksLike: 'Beginning to see harm. Asking questions. Reading.',
      howToSupport: ['Provide reading', 'Patience', 'Modeling', 'Conversations'],
      pitfalls: ['Performative wokeness', 'Centering own learning over impacted', 'Stalling'],
      growthMoves: ['Listen more than speak', 'Follow rather than lead', 'Build relationships']
    },
    {
      id: 'aad2',
      stage: 'Ally',
      whatItLooksLike: 'Standing with marginalized groups. Some action. Some risk.',
      howToSupport: ['Specific opportunities for action', 'Coalition spaces', 'Mentorship'],
      pitfalls: ['White savior dynamics', 'Centering self', 'Tokenism'],
      growthMoves: ['Take risk', 'Defer to most impacted', 'Build power']
    },
    {
      id: 'aad3',
      stage: 'Accomplice',
      whatItLooksLike: 'Active participant in resistance. Real risk. Sustained.',
      howToSupport: ['Long-term commitment', 'Real action', 'Coalition'],
      pitfalls: ['Burnout', 'Hero complex', 'Disconnection from base'],
      growthMoves: ['Self-care', 'Pass leadership', 'Build base']
    },
    {
      id: 'aad4',
      stage: 'Co-conspirator',
      whatItLooksLike: 'Risking everything for liberation. Inside the work.',
      howToSupport: ['Deep relationships', 'Strategic vision', 'Sustained accountability'],
      pitfalls: ['Loss of self', 'Family strain', 'Loss of access'],
      growthMoves: ['Sustainable practice', 'Generational thinking', 'Movement building']
    }
  ];

  var BULLY_PROFILE_DEEP = [
    {
      id: 'bpd_b1',
      profile: 'The hurt one',
      whatTheyLookLike: 'Often experiencing harm at home. May not show vulnerability.',
      whyTheyBully: 'Hurt people hurt people. Acting out unresolved trauma.',
      whatHelps: ['Trauma-informed care', 'Mental health support', 'Safe adult connection', 'Restorative practices'],
      whatDoesNotHelp: ['Punitive consequences alone', 'Shame', 'Ignoring root cause']
    },
    {
      id: 'bpd_b2',
      profile: 'The social climber',
      whatTheyLookLike: 'Mocks to fit in or gain status. Often charismatic.',
      whyTheyBully: 'Trying to build social capital through harm.',
      whatHelps: ['Build alternative paths to belonging', 'Address group culture', 'Identify root needs'],
      whatDoesNotHelp: ['Just punishing individuals', 'Treating as bad personality']
    },
    {
      id: 'bpd_b3',
      profile: 'The dominant',
      whatTheyLookLike: 'Physically larger or socially dominant. Uses power.',
      whyTheyBully: 'Has been taught to use power. Often learned at home.',
      whatHelps: ['Address power dynamics', 'Teach equitable conflict resolution', 'Engage parents'],
      whatDoesNotHelp: ['Just power-balancing without root work']
    },
    {
      id: 'bpd_b4',
      profile: 'The mean girl/boy archetype',
      whatTheyLookLike: 'Coordinated cruelty in friend group. Social manipulation.',
      whyTheyBully: 'Group dynamics. Insecurity. Need for control.',
      whatHelps: ['Address group culture', 'Build alternative belonging', 'Restorative process'],
      whatDoesNotHelp: ['Just punishing leader', 'Ignoring group dynamic']
    },
    {
      id: 'bpd_b5',
      profile: 'The unaware harmer',
      whatTheyLookLike: 'Genuinely surprised when called out. Lacks empathy training.',
      whyTheyBully: 'Has not developed empathy. May have developmental difference.',
      whatHelps: ['Specific empathy education', 'Social skill building', 'Patience'],
      whatDoesNotHelp: ['Assuming malice', 'Punishing without teaching']
    },
    {
      id: 'bpd_b6',
      profile: 'The defensive harmer',
      whatTheyLookLike: 'Attacks first to prevent being attacked. Anxious.',
      whyTheyBully: 'Anticipates harm. Acts preemptively.',
      whatHelps: ['Address anxiety', 'Build safety', 'Restorative dialogue with care'],
      whatDoesNotHelp: ['Just discipline without addressing fear']
    },
    {
      id: 'bpd_b7',
      profile: 'The fitting in harmer',
      whatTheyLookLike: 'Goes along with group cruelty even when uncomfortable.',
      whyTheyBully: 'Peer pressure. Need to belong.',
      whatHelps: ['Build values', 'Practice saying no', 'Alternative friendships'],
      whatDoesNotHelp: ['Treating as primary harmer']
    },
    {
      id: 'bpd_b8',
      profile: 'The status-quo defender',
      whatTheyLookLike: 'Harms those who challenge norms. Conservative socially.',
      whyTheyBully: 'Threat to identity. Cultural messaging.',
      whatHelps: ['Cultural competency education', 'Exposure to diversity', 'Identity work'],
      whatDoesNotHelp: ['Ignoring cultural context']
    },
    {
      id: 'bpd_b9',
      profile: 'The adult harmer',
      whatTheyLookLike: 'Teacher, parent, coach, or other adult who harms students.',
      whyTheyHarm: 'Misuse of power. Unprocessed trauma. Lack of accountability.',
      whatHelps: ['Adult accountability', 'Training', 'Replacement if not changing', 'External oversight'],
      whatDoesNotHelp: ['Defending the adult based on position', 'Excusing as style']
    },
    {
      id: 'bpd_b10',
      profile: 'The systemic harmer',
      whatTheyLookLike: 'Policies or structures that systematically harm marginalized groups.',
      whyTheyHarm: 'Built into system. Reflects broader societal structures.',
      whatHelps: ['Policy change', 'Coalition advocacy', 'Cultural shift', 'Systemic accountability'],
      whatDoesNotHelp: ['Just changing individual people without changing system']
    }
  ];

  var SUPPORT_RESOURCES_DEEP = [
    {
      id: 'srd1',
      category: 'Immediate crisis',
      resources: [
        { name: '988 Suicide & Crisis Lifeline', number: '988', web: '988lifeline.org', description: '24/7 free crisis support' },
        { name: 'Crisis Text Line', number: 'Text HOME to 741741', web: 'crisistextline.org', description: '24/7 free text crisis support' },
        { name: 'Trevor Project', number: '1-866-488-7386', web: 'thetrevorproject.org', description: 'LGBTQ youth crisis support' },
        { name: 'Trans Lifeline', number: '1-877-565-8860', web: 'translifeline.org', description: 'Trans crisis support, by trans people' },
        { name: 'RAINN', number: '1-800-656-4673', web: 'rainn.org', description: 'Sexual assault hotline' },
        { name: 'Childhelp', number: '1-800-422-4453', web: 'childhelp.org', description: 'Child abuse hotline' },
        { name: '911', number: '911', web: null, description: 'Immediate emergency' }
      ]
    },
    {
      id: 'srd2',
      category: 'Mental health',
      resources: [
        { name: 'NAMI', number: '1-800-950-6264', web: 'nami.org', description: 'Mental health support and education' },
        { name: 'NEDA', number: '1-800-931-2237', web: 'nationaleatingdisorders.org', description: 'Eating disorder support' },
        { name: 'SAMHSA', number: '1-800-662-4357', web: 'samhsa.gov', description: 'Substance use and mental health' },
        { name: 'Open Path Collective', web: 'openpathcollective.com', description: 'Sliding-scale therapy' },
        { name: 'Inclusive Therapists', web: 'inclusivetherapists.com', description: 'Identity-affirming therapy' }
      ]
    },
    {
      id: 'srd3',
      category: 'Reporting',
      resources: [
        { name: 'School counselor', description: 'First line for school issues' },
        { name: 'Principal', description: 'Internal escalation' },
        { name: 'District office', description: 'When school fails' },
        { name: 'State Department of Education', description: 'When district fails' },
        { name: 'U.S. Department of Education OCR', web: 'ed.gov/ocr', description: 'Federal civil rights' },
        { name: 'Police', description: 'Criminal behavior' }
      ]
    },
    {
      id: 'srd4',
      category: 'Identity support',
      resources: [
        { name: 'GLSEN', web: 'glsen.org', description: 'LGBTQ student advocacy' },
        { name: 'GLAAD', web: 'glaad.org', description: 'LGBTQ media advocacy' },
        { name: 'NAACP', web: 'naacp.org', description: 'Black advocacy' },
        { name: 'ADL', web: 'adl.org', description: 'Anti-defamation league' },
        { name: 'CAIR', web: 'cair.com', description: 'Muslim advocacy' },
        { name: 'ASAN', web: 'autisticadvocacy.org', description: 'Autistic-led advocacy' },
        { name: 'Disability Rights Education and Defense Fund', web: 'dredf.org', description: 'Disability rights' }
      ]
    },
    {
      id: 'srd5',
      category: 'Family support',
      resources: [
        { name: 'PFLAG', web: 'pflag.org', description: 'LGBTQ family support' },
        { name: 'Parent Training and Information Centers', description: 'State-by-state special education support' },
        { name: 'Family Voices', web: 'familyvoices.org', description: 'Families of children with special needs' },
        { name: 'Strength of Us', web: 'strengthofus.org', description: 'Young adults with mental health conditions' }
      ]
    },
    {
      id: 'srd6',
      category: 'Maine-specific',
      resources: [
        { name: 'Maine DOE', web: 'maine.gov/doe', description: 'State education agency' },
        { name: 'Disability Rights Maine', web: 'drme.org', description: 'Maine P&A organization' },
        { name: 'Maine Parent Federation', web: 'mpf.org', description: 'Maine parent training center' },
        { name: 'NAMI Maine', web: 'namimaine.org', description: 'Maine mental health' },
        { name: 'Maine Crisis Line', number: '1-888-568-1112', description: 'Maine crisis services' },
        { name: 'EqualityMaine', web: 'equalitymaine.org', description: 'LGBTQ Maine advocacy' },
        { name: 'ACLU of Maine', web: 'aclumaine.org', description: 'Maine civil liberties' }
      ]
    }
  ];

  var EXTENDED_LESSON_MATERIALS = [
    {
      id: 'elm1',
      lessonTitle: 'Understanding the bullying-bystander spectrum',
      gradeLevel: 'middle school',
      objectives: [
        'Define key terms',
        'Identify points on spectrum',
        'Locate self on spectrum'
      ],
      materials: ['Spectrum diagram', 'Index cards', 'Markers', 'Reflection journal'],
      stepByStep: [
        { step: 1, time: '5 min', activity: 'Welcome and agreements' },
        { step: 2, time: '10 min', activity: 'Define: bully, target, bystander, upstander' },
        { step: 3, time: '15 min', activity: 'Show spectrum: from harming to defending' },
        { step: 4, time: '15 min', activity: 'Pairs identify where they typically sit' },
        { step: 5, time: '10 min', activity: 'Group share key insights' },
        { step: 6, time: '5 min', activity: 'Commit to one upstander move' }
      ]
    },
    {
      id: 'elm2',
      lessonTitle: 'Why bystanders stay silent',
      gradeLevel: 'middle school',
      objectives: [
        'Identify barriers to intervention',
        'Practice overcoming barriers',
        'Build muscle memory for action'
      ],
      materials: ['Barrier cards', 'Scenario cards', 'Practice scripts'],
      stepByStep: [
        { step: 1, time: '5 min', activity: 'Welcome' },
        { step: 2, time: '15 min', activity: 'Brainstorm: what stops me from speaking up?' },
        { step: 3, time: '10 min', activity: 'Mini-lesson on bystander effect' },
        { step: 4, time: '20 min', activity: 'Practice in pairs: overcome 3 barriers' },
        { step: 5, time: '5 min', activity: 'Commit to one practice this week' }
      ]
    },
    {
      id: 'elm3',
      lessonTitle: 'Reading the room',
      gradeLevel: 'middle school',
      objectives: [
        'Distinguish bullying from conflict',
        'Practice noticing',
        'Build assessment skills'
      ],
      materials: ['Video clips', 'Observation log', 'Discussion guide'],
      stepByStep: [
        { step: 1, time: '5 min', activity: 'Welcome' },
        { step: 2, time: '15 min', activity: 'Mini-lesson: bullying vs conflict' },
        { step: 3, time: '20 min', activity: 'Watch and analyze 3 video clips' },
        { step: 4, time: '15 min', activity: 'Practice observing in real life' },
        { step: 5, time: '5 min', activity: 'Commit to noticing' }
      ]
    },
    {
      id: 'elm4',
      lessonTitle: 'Direct intervention',
      gradeLevel: 'high school',
      objectives: [
        'Build direct intervention skills',
        'Practice high-risk moves',
        'Build muscle memory'
      ],
      materials: ['Practice scripts', 'Role-play scenarios'],
      stepByStep: [
        { step: 1, time: '5 min', activity: 'Welcome' },
        { step: 2, time: '15 min', activity: 'Direct intervention principles' },
        { step: 3, time: '30 min', activity: 'Role-play in pairs' },
        { step: 4, time: '15 min', activity: 'Debrief and commit' }
      ]
    },
    {
      id: 'elm5',
      lessonTitle: 'Indirect intervention',
      gradeLevel: 'high school',
      objectives: [
        'Learn the 4 Ds (distract, delegate, document, delay)',
        'Practice each',
        'Build versatility'
      ],
      materials: ['4 Ds handout', 'Scenario cards'],
      stepByStep: [
        { step: 1, time: '5 min', activity: 'Welcome' },
        { step: 2, time: '15 min', activity: 'Introduce 4 Ds' },
        { step: 3, time: '25 min', activity: 'Practice each D in scenarios' },
        { step: 4, time: '15 min', activity: 'Plan how to use Ds going forward' }
      ]
    },
    {
      id: 'elm6',
      lessonTitle: 'Supporting targets',
      gradeLevel: 'high school',
      objectives: [
        'Build listening skills',
        'Practice support language',
        'Plan ongoing care'
      ],
      materials: ['Listening guide', 'Practice scripts'],
      stepByStep: [
        { step: 1, time: '5 min', activity: 'Welcome' },
        { step: 2, time: '15 min', activity: 'Active listening principles' },
        { step: 3, time: '30 min', activity: 'Practice listening in pairs' },
        { step: 4, time: '10 min', activity: 'Commit to outreach' }
      ]
    },
    {
      id: 'elm7',
      lessonTitle: 'Confronting harmers',
      gradeLevel: 'high school',
      objectives: [
        'Practice confrontation',
        'Build accountability skills',
        'Restorative approach'
      ],
      materials: ['Confrontation framework', 'Role-play scenarios'],
      stepByStep: [
        { step: 1, time: '5 min', activity: 'Welcome' },
        { step: 2, time: '20 min', activity: 'Confrontation principles' },
        { step: 3, time: '25 min', activity: 'Role-play in pairs' },
        { step: 4, time: '10 min', activity: 'Plan real conversations' }
      ]
    },
    {
      id: 'elm8',
      lessonTitle: 'Coalition building',
      gradeLevel: 'high school',
      objectives: [
        'Learn coalition basics',
        'Plan one action',
        'Build sustained practice'
      ],
      materials: ['Coalition guide', 'Planning template'],
      stepByStep: [
        { step: 1, time: '5 min', activity: 'Welcome' },
        { step: 2, time: '15 min', activity: 'Coalition principles' },
        { step: 3, time: '30 min', activity: 'Small groups plan one action' },
        { step: 4, time: '10 min', activity: 'Commit to action' }
      ]
    },
    {
      id: 'elm9',
      lessonTitle: 'Identity-aware upstander work',
      gradeLevel: 'high school',
      objectives: [
        'Center marginalized voices',
        'Examine privilege',
        'Build identity-aware practice'
      ],
      materials: ['Identity map', 'Discussion guide'],
      stepByStep: [
        { step: 1, time: '5 min', activity: 'Welcome with agreements' },
        { step: 2, time: '20 min', activity: 'Intersectionality basics' },
        { step: 3, time: '20 min', activity: 'Privilege examination' },
        { step: 4, time: '15 min', activity: 'Commit to identity-aware practice' }
      ]
    },
    {
      id: 'elm10',
      lessonTitle: 'Sustaining the work',
      gradeLevel: 'all',
      objectives: [
        'Build self-care practices',
        'Plan long-term action',
        'Build community'
      ],
      materials: ['Self-care plan', 'Year planning template'],
      stepByStep: [
        { step: 1, time: '5 min', activity: 'Welcome' },
        { step: 2, time: '15 min', activity: 'Burnout patterns' },
        { step: 3, time: '25 min', activity: 'Build personal plan' },
        { step: 4, time: '15 min', activity: 'Share commitments' }
      ]
    }
  ];

  var COMPREHENSIVE_NARRATIVES_PART2 = [
    {
      id: 'cn1',
      title: 'The time I broke the silence in a friend group',
      narrative: [
        'I was 15. My friend group had been mocking one of our other classmates, Sara, for weeks. She had been seen at the local food bank. The whole group had been teasing her about being poor.',
        '',
        'I had laughed at first. Then I noticed Sara had stopped sitting at lunch. She would eat alone in the library.',
        '',
        'I felt sick. I had contributed to that.',
        '',
        'One day at the friend group lunch, someone made another joke about Sara. I said: "Lets stop."',
        '',
        'The table went silent.',
        '',
        '"What?" one friend said.',
        '',
        '"Stop with the Sara jokes. They are mean. We have been mean for weeks. I am done."',
        '',
        'Two friends laughed. Two friends were silent. One looked at the table.',
        '',
        'I went to the library after school. I found Sara. I said: "Hi. I am Maya. I am in your math class. I want to apologize. I have been part of your group making fun of you. That was wrong. I am sorry."',
        '',
        'Sara looked at me. She started crying.',
        '',
        'I sat with her in the library. We talked for an hour.',
        '',
        'The next day she sat at my lunch table. Three of my friends moved.',
        '',
        'Sara and I became friends. Two of my old friends stopped speaking to me.',
        '',
        'I do not regret it.',
        '',
        'Five years later Sara and I are still best friends.',
        '',
        'I tell people: the cost of breaking the silence is real. The cost of staying silent is greater.'
      ]
    },
    {
      id: 'cn2',
      title: 'When a teacher saved me',
      narrative: [
        'I was in 8th grade. I was being bullied for being chubby. Online and in person. I had stopped eating.',
        '',
        'My PE teacher Ms. Davis pulled me aside one day. She said: "I have noticed. You are not okay."',
        '',
        'I started crying.',
        '',
        'She sat me down. She did not lecture. She just listened.',
        '',
        'She helped me connect with our school counselor.',
        '',
        'She helped me see a therapist.',
        '',
        'She told me she had been bullied for her weight too, when she was young. She said it had taken years to recover.',
        '',
        'She said: "You will be okay. It will take time. You are not alone."',
        '',
        'I got better. I started eating again. The bullying did not stop overnight but I had support.',
        '',
        'Ms. Davis saved my life. I tell her every chance I get.',
        '',
        'I am now a teacher myself. I notice the students who are not okay. I pull them aside. I tell them they are not alone.',
        '',
        'I tell adults: notice the kids. Pull them aside. Listen.'
      ]
    },
    {
      id: 'cn3',
      title: 'I stopped being part of the group chat',
      narrative: [
        'I was 16. I was in a group chat of 12 people. We had been friends since middle school.',
        '',
        'In 11th grade the chat got mean. It targeted a girl named Ella. Daily posts. Screenshots of her. Mocking commentary.',
        '',
        'I felt sick reading it.',
        '',
        'I left the chat one night. I sent a message: "I am leaving. We have been cruel to Ella for weeks. That is not who I want to be."',
        '',
        'I got 8 angry messages within an hour. Two unfriended me on social.',
        '',
        'But one person reached out: "I have been wanting to leave too. Thanks for going first."',
        '',
        'Then another. By the end of the week, half the chat had left.',
        '',
        'Ella did not know any of this had been happening. We told her. She cried.',
        '',
        'We started a new group chat. Without the cruelty. Ella was in it.',
        '',
        'I learned: one person leaving can change a group. Sometimes you have to be the first.'
      ]
    },
    {
      id: 'cn4',
      title: 'When my coach was the problem',
      narrative: [
        'I played basketball. My coach was respected. He had won state championships.',
        '',
        'He was also verbally abusive to one player on the team specifically. Daily. Public. For three years.',
        '',
        'No one stopped him. The athletic director said "that is his coaching style." Parents complained but nothing changed.',
        '',
        'In my senior year I quit the team. I went to the athletic director and the principal. I documented every incident I could remember.',
        '',
        'Three other players quit within a month.',
        '',
        'The coach was given a year-long contract review. He was let go at the end of the year.',
        '',
        'The targeted player, Jamie, told me a year later: "I had been thinking about ending my life when you quit. Watching you walk away gave me hope."',
        '',
        'I had not known. Sometimes you do not know who you are saving.',
        '',
        'I tell people: sometimes the most upstander move is leaving. And then telling the story.'
      ]
    },
    {
      id: 'cn5',
      title: 'The principal who would not listen',
      narrative: [
        'I had been reporting bullying for a month. Each time the principal said: "We will look into it."',
        '',
        'Nothing changed.',
        '',
        'I wrote a formal letter. Documented every incident. Brought it to a meeting.',
        '',
        'The principal said: "These are kids being kids. They will grow out of it."',
        '',
        'I went to the district. The superintendent said: "Talk to the principal."',
        '',
        'I went to the state. They opened an investigation.',
        '',
        'The investigation found the school had not followed the anti-bullying policy.',
        '',
        'The principal was reprimanded. The school had to develop a corrective action plan.',
        '',
        'Bullying decreased.',
        '',
        'I learned: when one level of the system fails, escalate. There is always another level.',
        '',
        'I tell adults: when a student reports, take it seriously. Do not say "they are being kids."'
      ]
    },
    {
      id: 'cn6',
      title: 'The peer who reached out to me',
      narrative: [
        'I was 13. I had moved to a new school. I had been eating alone for two weeks. I had been mocked for my accent.',
        '',
        'A kid named Eli walked over and sat at my lunch table. He had not asked. He had not said much.',
        '',
        'He pulled out his lunch and ate.',
        '',
        'After a while he said: "I am Eli. I am in 7th grade. What are you reading?"',
        '',
        'I told him.',
        '',
        'He had read the same book.',
        '',
        'Eli sat with me every day for the rest of the year. He invited me to his birthday party. He came to mine.',
        '',
        'The mocking stopped within two weeks of Eli sitting with me. He had some kind of social power I did not understand.',
        '',
        'Years later I asked Eli why he had sat with me. He said: "I had been new the year before. I knew what it was like."',
        '',
        'Eli changed my middle school experience. He did not save me from everything. But he showed me I was not alone.',
        '',
        'I tell middle schoolers: notice who is alone. Sit with them. You do not have to know what to say. Just sit.'
      ]
    },
    {
      id: 'cn7',
      title: 'When I was the harmer',
      narrative: [
        'In 7th grade I was mean. Specifically to one kid, Marcus. I imitated him. I made fun of his clothes. I told other kids not to play with him.',
        '',
        'I was popular partly because I was mean. I had power. I used it badly.',
        '',
        'In 8th grade I noticed Marcus was not at school for two weeks. I asked someone where he was. They said he had been in the hospital. Mental health.',
        '',
        'I felt sick.',
        '',
        'I went home and cried. I told my mom. She made me an appointment with a therapist.',
        '',
        'My therapist helped me see that I had been bullied at home for years. That I had been taking out my hurt on others.',
        '',
        'I did not blame her for what I had done to Marcus. That was on me.',
        '',
        'I asked my mom to take me to Marcus\'s house. She drove me.',
        '',
        'I apologized to Marcus and his parents. I named specifically what I had done. I did not make excuses.',
        '',
        'Marcus took years to accept the apology. I do not blame him.',
        '',
        'When I was 22 I got a Facebook message from Marcus. He said: "I forgive you. I am okay now. Thanks for apologizing."',
        '',
        'I now work in mental health. I tell young people who have been mean: you can change. It takes work. It is worth it.',
        '',
        'I tell young people who have been hurt: people who hurt you can change. Sometimes. Not always. You do not owe them forgiveness.'
      ]
    },
    {
      id: 'cn8',
      title: 'My ongoing practice',
      narrative: [
        'I am 30 now. I have been doing upstander work for 15 years.',
        '',
        'It is small. Daily. I check in on the new person at work. I refuse to engage in gossip. I speak up in meetings when something is off.',
        '',
        'It is medium. Weekly. I have hard conversations with friends. I document patterns. I support coworkers in their reports.',
        '',
        'It is big. Monthly. I attend protests. I write to representatives. I donate to organizations.',
        '',
        'It is ongoing. Yearly. I reflect. I adjust. I grow.',
        '',
        'I have made mistakes. I have apologized many times. I have lost relationships.',
        '',
        'I have also: built deep friendships, contributed to small policy changes, helped friends through hard times.',
        '',
        'I tell young people: this is a practice. It does not end. You do not have to be perfect. You just have to keep going.'
      ]
    }
  ];

  var MORE_BYSTANDER_SCENARIOS = [
    {
      id: 'mbs1',
      title: 'Anonymous harassment of teacher by students',
      context: 'A teacher is being mocked on a fake social media account by anonymous students.',
      whatToConsider: [
        'Teacher is still target',
        'Anonymous nature complicates',
        'School has authority over student conduct'
      ],
      actions: [
        'Tell trusted adult',
        'Document the account',
        'Refuse to engage',
        'Support the teacher visibly'
      ]
    },
    {
      id: 'mbs2',
      title: 'Senior class hazing junior',
      context: 'Senior students are pressuring juniors into demeaning "initiation" activities.',
      whatToConsider: [
        'Hazing is illegal in many states',
        'Power dynamic with age',
        'Tradition is not justification'
      ],
      actions: [
        'Refuse to participate',
        'Tell juniors they do not have to',
        'Report to administration',
        'Document specific incidents'
      ]
    },
    {
      id: 'mbs3',
      title: 'Parent harassing teacher in public',
      context: 'A parent is yelling at a teacher in front of students.',
      whatToConsider: [
        'Students are watching',
        'Teacher is in vulnerable position',
        'Public space matters'
      ],
      actions: [
        'Stand near teacher',
        'Call administrator',
        'Document if safe',
        'Tell teacher you saw it'
      ]
    },
    {
      id: 'mbs4',
      title: 'Group of students mocking new sub',
      context: 'A substitute teacher who appears nervous is being mocked by students.',
      whatToConsider: [
        'Sub may not know school culture',
        'Students testing authority',
        'Sub still deserves respect'
      ],
      actions: [
        'Speak up: "Lets give them a chance"',
        'Engage with the lesson',
        'Help the sub if needed',
        'Tell teacher when they return'
      ]
    },
    {
      id: 'mbs5',
      title: 'Online doxxing of a classmate',
      context: 'Personal info about a classmate has been posted online (address, phone, etc.)',
      whatToConsider: [
        'Real safety risk',
        'Legal implications',
        'Urgent action needed'
      ],
      actions: [
        'Screenshot evidence',
        'Tell classmate immediately',
        'Help report to platforms',
        'Tell adults and possibly police',
        'Help classmate take down posts'
      ]
    },
    {
      id: 'mbs6',
      title: 'Stalking online',
      context: 'A peer is being targeted online by another peer who comments on every post.',
      whatToConsider: [
        'Pattern matters',
        'Can escalate offline',
        'Real distress'
      ],
      actions: [
        'Tell peer to block',
        'Document the pattern',
        'Tell trusted adult',
        'Report to platforms'
      ]
    },
    {
      id: 'mbs7',
      title: 'Harassment of trans student in bathroom',
      context: 'A trans student is being followed and mocked in the bathroom.',
      whatToConsider: [
        'Safety concern',
        'Identity-based harm',
        'School policy on facilities'
      ],
      actions: [
        'Tell counselor immediately',
        'Document incidents',
        'Stand with the student',
        'File Title IX complaint if needed'
      ]
    },
    {
      id: 'mbs8',
      title: 'Misgendering by staff',
      context: 'A staff member repeatedly misgenders a student despite correction.',
      whatToConsider: [
        'Adult in position of power',
        'Pattern matters',
        'Student safety'
      ],
      actions: [
        'Use correct pronouns yourself',
        'Tell counselor',
        'Tell principal',
        'Help student\'s family advocate'
      ]
    },
    {
      id: 'mbs9',
      title: 'Religious harassment',
      context: 'A Sikh student is being mocked for wearing turban.',
      whatToConsider: [
        'Religious right',
        'Multiple peers involved',
        'Adult awareness'
      ],
      actions: [
        'Interrupt the mockery',
        'Stand with student',
        'Tell adult',
        'Educate peers'
      ]
    },
    {
      id: 'mbs10',
      title: 'Mental health emergency',
      context: 'A peer texts you in suicidal crisis.',
      whatToConsider: [
        'Immediate safety',
        'You are not a therapist',
        'Adult involvement essential'
      ],
      actions: [
        'Stay engaged with peer',
        'Tell trusted adult immediately',
        '988 if you cannot reach adult',
        'Stay with peer until adult arrives'
      ]
    },
    {
      id: 'mbs11',
      title: 'Witnessing self-harm',
      context: 'You notice marks on a peer that look like self-harm.',
      whatToConsider: [
        'Privacy and respect',
        'Real risk',
        'Adult support needed'
      ],
      actions: [
        'Approach peer with care, privately',
        'Express care without judgment',
        'Help connect with counselor',
        'Get adult support'
      ]
    },
    {
      id: 'mbs12',
      title: 'Eating disorder concern',
      context: 'You notice a peer skipping meals, severe weight changes, exercise obsession.',
      whatToConsider: [
        'Eating disorders are medical',
        'Privacy important',
        'Specialized care needed'
      ],
      actions: [
        'Express care without focus on weight',
        'Connect with counselor',
        'NEDA helpline available',
        'Help family if asked'
      ]
    },
    {
      id: 'mbs13',
      title: 'Substance abuse',
      context: 'A peer is using substances frequently in ways that worry you.',
      whatToConsider: [
        'Substance use is medical',
        'Privacy and care',
        'Specialized help needed'
      ],
      actions: [
        'Express care',
        'Do not enable',
        'Connect with school counselor',
        'SAMHSA helpline available'
      ]
    },
    {
      id: 'mbs14',
      title: 'Domestic violence',
      context: 'A peer discloses violence at home.',
      whatToConsider: [
        'Safety',
        'Mandated reporting',
        'Sensitive situation'
      ],
      actions: [
        'Listen and believe',
        'Tell them this is not their fault',
        'Connect with counselor',
        'School may need to report'
      ]
    },
    {
      id: 'mbs15',
      title: 'Sexual harassment by a peer',
      context: 'You witness or experience unwanted sexual behavior.',
      whatToConsider: [
        'Title IX protections',
        'Document everything',
        'Real harm regardless of intent'
      ],
      actions: [
        'Tell Title IX coordinator',
        'Document specific incidents',
        'Support target if witness',
        'Get medical care if needed'
      ]
    },
    {
      id: 'mbs16',
      title: 'Abuse of power by adult',
      context: 'An adult in school is using their position to harm students.',
      whatToConsider: [
        'Power imbalance',
        'Possible criminal behavior',
        'Need for adult support'
      ],
      actions: [
        'Tell another trusted adult',
        'Document specifically',
        'External reporting if internal fails',
        'Police if criminal behavior'
      ]
    },
    {
      id: 'mbs17',
      title: 'Racial profiling',
      context: 'A peer is being singled out for "suspicious behavior" while doing the same things others do.',
      whatToConsider: [
        'Civil rights violation',
        'Pattern matters',
        'Documentation essential'
      ],
      actions: [
        'Document specifically',
        'Tell counselor',
        'OCR complaint for pattern',
        'Support peer\'s family'
      ]
    },
    {
      id: 'mbs18',
      title: 'Disability access denial',
      context: 'A disabled peer is being denied an accommodation they need.',
      whatToConsider: [
        '504/IDEA/ADA protections',
        'Pattern matters',
        'Self-advocacy + ally support'
      ],
      actions: [
        'Help document',
        'Connect with case manager',
        'Help family advocate',
        'OCR if pattern'
      ]
    },
    {
      id: 'mbs19',
      title: 'Outing without consent',
      context: 'Someone is sharing private information about a peer\'s identity (LGBTQ, etc.) without consent.',
      whatToConsider: [
        'Privacy violation',
        'Real safety risk',
        'Trust violation'
      ],
      actions: [
        'Tell the outer to stop',
        'Tell target',
        'Help them with safety planning',
        'Report if pattern'
      ]
    },
    {
      id: 'mbs20',
      title: 'Religious coercion',
      context: 'A school authority is pressuring students to participate in religious activity.',
      whatToConsider: [
        'First Amendment protections',
        'Public school cannot establish religion',
        'Coercion is harm'
      ],
      actions: [
        'Refuse to participate if uncomfortable',
        'Document incidents',
        'Tell parents and ACLU if needed',
        'OCR complaint possible'
      ]
    }
  ];

  var WEEKLY_CURRICULUM_DEEP = [
    {
      id: 'wcd1',
      week: 1,
      theme: 'Notice',
      objective: 'Build noticing muscle',
      activities: [
        { day: 'Mon', task: 'Notice 5 social interactions in school', minutes: 10 },
        { day: 'Tue', task: 'Notice one moment of exclusion', minutes: 10 },
        { day: 'Wed', task: 'Notice one moment of kindness', minutes: 10 },
        { day: 'Thu', task: 'Compare your noticing yesterday vs today', minutes: 10 },
        { day: 'Fri', task: 'Write down patterns you see', minutes: 15 }
      ],
      reflection: 'What did I notice that I had not noticed before?'
    },
    {
      id: 'wcd2',
      week: 2,
      theme: 'Speak',
      objective: 'Practice speaking up',
      activities: [
        { day: 'Mon', task: 'Practice one intervention phrase aloud 3x', minutes: 5 },
        { day: 'Tue', task: 'Compliment one peer specifically', minutes: 2 },
        { day: 'Wed', task: 'Disagree with one casual cruelty', minutes: 5 },
        { day: 'Thu', task: 'Email one trusted adult about something you observed', minutes: 15 },
        { day: 'Fri', task: 'Reflect on speech this week', minutes: 10 }
      ],
      reflection: 'Where did I speak when I might have stayed silent?'
    },
    {
      id: 'wcd3',
      week: 3,
      theme: 'Stand',
      objective: 'Build physical presence',
      activities: [
        { day: 'Mon', task: 'Sit with someone different at lunch', minutes: 30 },
        { day: 'Tue', task: 'Walk with someone who is alone', minutes: 15 },
        { day: 'Wed', task: 'Stand near someone being mocked', minutes: 10 },
        { day: 'Thu', task: 'Position yourself near a target if needed', minutes: 'as needed' },
        { day: 'Fri', task: 'Reflect on standing this week', minutes: 10 }
      ],
      reflection: 'Where did my body do the work my words could not?'
    },
    {
      id: 'wcd4',
      week: 4,
      theme: 'Connect',
      objective: 'Build relationships',
      activities: [
        { day: 'Mon', task: 'Initiate one conversation with someone new', minutes: 5 },
        { day: 'Tue', task: 'Check in with one peer who is struggling', minutes: 10 },
        { day: 'Wed', task: 'Reach out to one peer outside your usual circle', minutes: 5 },
        { day: 'Thu', task: 'Sit with someone who is alone', minutes: 30 },
        { day: 'Fri', task: 'Reflect on connections this week', minutes: 10 }
      ],
      reflection: 'Whose week did I make different?'
    },
    {
      id: 'wcd5',
      week: 5,
      theme: 'Document',
      objective: 'Build documentation habit',
      activities: [
        { day: 'Mon', task: 'Set up your documentation system', minutes: 15 },
        { day: 'Tue', task: 'Document one observation', minutes: 5 },
        { day: 'Wed', task: 'Document another', minutes: 5 },
        { day: 'Thu', task: 'Review your documentation', minutes: 10 },
        { day: 'Fri', task: 'Identify any patterns', minutes: 10 }
      ],
      reflection: 'What pattern did I see only when I tracked?'
    },
    {
      id: 'wcd6',
      week: 6,
      theme: 'Report',
      objective: 'Practice reporting',
      activities: [
        { day: 'Mon', task: 'Identify 3 trusted adults', minutes: 10 },
        { day: 'Tue', task: 'Practice your reporting language', minutes: 15 },
        { day: 'Wed', task: 'Make one report (something small)', minutes: 'as needed' },
        { day: 'Thu', task: 'Follow up on report', minutes: 5 },
        { day: 'Fri', task: 'Reflect on reporting', minutes: 10 }
      ],
      reflection: 'What did I learn about reporting?'
    },
    {
      id: 'wcd7',
      week: 7,
      theme: 'Repair',
      objective: 'Practice repair',
      activities: [
        { day: 'Mon', task: 'Identify one apology you owe', minutes: 10 },
        { day: 'Tue', task: 'Draft the apology', minutes: 15 },
        { day: 'Wed', task: 'Send or deliver apology', minutes: 'as needed' },
        { day: 'Thu', task: 'Reflect on response', minutes: 10 },
        { day: 'Fri', task: 'Identify next repair', minutes: 10 }
      ],
      reflection: 'What did real apology teach me?'
    },
    {
      id: 'wcd8',
      week: 8,
      theme: 'Sustain',
      objective: 'Plan ongoing practice',
      activities: [
        { day: 'Mon', task: 'Identify your top 3 daily practices', minutes: 10 },
        { day: 'Tue', task: 'Identify your top 3 weekly practices', minutes: 10 },
        { day: 'Wed', task: 'Set up reminders for each', minutes: 15 },
        { day: 'Thu', task: 'Plan monthly check-in', minutes: 10 },
        { day: 'Fri', task: 'Commit to year plan', minutes: 30 }
      ],
      reflection: 'What is my long-term upstander practice?'
    }
  ];

  var DEEP_DIVE_SCENARIOS_SET2 = [
    {
      id: 'dds1',
      title: 'When the bully is your sibling',
      situation: 'Your younger sibling has been bullying another child in their grade. You hear about it from their friend.',
      whatToDo: [
        '1. Verify what you have heard',
        '2. Talk to your sibling privately',
        '3. Encourage them to apologize',
        '4. Involve parents if pattern continues',
        '5. Support them in changing'
      ],
      whatNotToDo: [
        'Lecture publicly',
        'Bully them about being a bully',
        'Stay silent thinking it is not your business',
        'Take over the situation without consulting them'
      ],
      sampleDialogue: [
        { speaker: 'You', text: 'I heard about what happened with ___. Want to talk about it?' },
        { speaker: 'Sibling', text: 'I do not know what you are talking about.' },
        { speaker: 'You', text: 'I am not here to lecture. I want to understand what is going on with you.' },
        { speaker: 'Sibling', text: '[Eventually opens up]' }
      ]
    },
    {
      id: 'dds2',
      title: 'When the bully is your own kid',
      situation: 'Your child has been identified as bullying another student.',
      whatToDo: [
        '1. Take it seriously',
        '2. Listen to your child without defending',
        '3. Engage with school',
        '4. Help your child understand impact',
        '5. Address root causes',
        '6. Support change'
      ],
      whatNotToDo: [
        'Defend without listening',
        'Blame the school',
        'Punish without addressing why',
        'Hide it from family',
        'Treat it as phase'
      ],
      considerations: [
        'Hurt people hurt people - find out what is going on',
        'Therapy may be appropriate',
        'Family dynamics may need addressing',
        'Long-term commitment to change'
      ]
    },
    {
      id: 'dds3',
      title: 'Bullying in extracurricular activity',
      situation: 'Bullying is happening in a sport or club. The coach or sponsor is not addressing it.',
      whatToDo: [
        '1. Document specific incidents',
        '2. Talk to coach or sponsor first',
        '3. Escalate to athletic director or activities coordinator',
        '4. Involve parents if needed',
        '5. Consider leaving if pattern continues'
      ],
      whatNotToDo: [
        'Ignore it and hope it stops',
        'Quit silently without telling anyone',
        'Confront bully alone in private space'
      ],
      legalNotes: 'Extracurriculars are still school-affiliated. Same protections apply.'
    },
    {
      id: 'dds4',
      title: 'Bullying on the bus',
      situation: 'Daily bullying on the school bus.',
      whatToDo: [
        '1. Document each incident',
        '2. Talk to driver',
        '3. Talk to school transportation coordinator',
        '4. Talk to principal',
        '5. Request safety plan'
      ],
      whatNotToDo: [
        'Tell child to handle it alone',
        'Switch seats without addressing pattern',
        'Wait for it to stop'
      ],
      considerations: [
        'Bus is school property - bullying laws apply',
        'Drivers may need training',
        'Cameras often exist - request review',
        'Seating plans can help'
      ]
    },
    {
      id: 'dds5',
      title: 'Bullying after school online',
      situation: 'Cyberbullying continues from school hours into evening.',
      whatToDo: [
        '1. Screenshot everything',
        '2. Block and report on platforms',
        '3. Tell school - it may be covered by school cyberbullying policy',
        '4. Contact platform safety team',
        '5. Police if threats involved'
      ],
      whatNotToDo: [
        'Engage with bully online',
        'Continue checking the harmful content',
        'Delete evidence',
        'Threaten back'
      ],
      considerations: [
        'Many states cover cyberbullying that affects school',
        'Platforms have safety teams',
        'Some content may be criminal (threats, photos)',
        'Mental health support important'
      ]
    },
    {
      id: 'dds6',
      title: 'When the harmer is your own friend',
      situation: 'Your friend has been the harmer in an incident.',
      whatToDo: [
        '1. Verify what happened',
        '2. Talk to friend privately',
        '3. Encourage accountability',
        '4. Support them through change',
        '5. Stay friends while holding accountability'
      ],
      whatNotToDo: [
        'Defend them publicly',
        'Make excuses',
        'Pretend it did not happen',
        'Abandon them without conversation'
      ],
      considerations: [
        'Friendship can survive accountability',
        'Sometimes friend will not change',
        'Your role is friend AND accountability partner'
      ]
    },
    {
      id: 'dds7',
      title: 'Watching a stranger being harassed',
      situation: 'You are at a store and witness someone being harassed by another shopper.',
      whatToDo: [
        '1. Approach target (not harasser)',
        '2. Distract: "Excuse me, do you know what time the store closes?"',
        '3. Stand near target',
        '4. Document if safe',
        '5. Report to store security if needed'
      ],
      whatNotToDo: [
        'Engage harasser directly',
        'Try to argue with them',
        'Make it about yourself'
      ],
      considerations: [
        'Strangers count too',
        'Safety first',
        'Document for legal purposes',
        'Center the target'
      ]
    },
    {
      id: 'dds8',
      title: 'When you witness adult-on-child harm',
      situation: 'You see an adult mistreating a child in public.',
      whatToDo: [
        '1. Assess immediate safety',
        '2. If immediate danger, call 911',
        '3. If not immediate, document',
        '4. Report to authorities (CPS, police, etc.)',
        '5. Follow up on report'
      ],
      whatNotToDo: [
        'Confront the adult unless trained',
        'Ignore due to it being "family business"',
        'Wait too long to report'
      ],
      legalNotes: 'You can report anonymously. Mandated reporters are required to. Anyone can.'
    }
  ];

  var REPAIR_STORIES_COLLECTION = [
    {
      id: 'rsc1',
      title: 'When apology was just the beginning',
      story: [
        'I was 14. I spread a rumor about a classmate that turned out to be false.',
        '',
        'Two weeks later I realized everyone thought it was true. My classmate was being shunned.',
        '',
        'I went to my counselor. She helped me plan what to do.',
        '',
        'First I told the people I had told the rumor directly: it was false.',
        '',
        'Then I went to my classmate. I told her exactly what I had done. I did not make excuses. I told her who I had told.',
        '',
        'She was furious. She had every right to be.',
        '',
        'I asked what I could do to repair. She said she wanted me to publicly correct the rumor at lunch in front of the people I had told.',
        '',
        'I did it. It was awful. I was humiliated. I stood up at lunch and said: "I told everyone something about ___ that was not true. I lied. I am sorry."',
        '',
        'My classmate said: "Thanks."',
        '',
        'For weeks she would not speak to me. Then slowly she started saying hi.',
        '',
        'Three months later we were eating lunch together.',
        '',
        'Five years later we are friends.',
        '',
        'The apology was not the end. It was the beginning. Repair took time and effort.'
      ]
    },
    {
      id: 'rsc2',
      title: 'When I had to confront my best friend',
      story: [
        'My best friend Jess had been mocking a kid in our class. I had laughed along.',
        '',
        'Then I realized: I was complicit.',
        '',
        'I told Jess: "I cannot do this anymore. What we are doing is mean."',
        '',
        'Jess said: "You are being dramatic."',
        '',
        'I said: "I am not. I am done."',
        '',
        'Jess and I drifted apart for the rest of the year.',
        '',
        'Then in 11th grade, I was at the library. Jess came up. She said: "I was thinking about what you said. You were right. I should not have been doing that. I am sorry."',
        '',
        'We talked for two hours. She was working with a therapist. She had realized her bullying was a way of dealing with her own family stuff.',
        '',
        'We rebuilt our friendship. It is different now. We are both more thoughtful.',
        '',
        'The targeted student is still not friends with Jess. That is fair. Some harms are not fully repaired.',
        '',
        'But Jess apologized to him too. He accepted but maintained distance.',
        '',
        'Repair is complicated. Friendships can rebuild. Some harms leave permanent change.'
      ]
    },
    {
      id: 'rsc3',
      title: 'When the teacher repaired',
      story: [
        'My math teacher had been short with me. Snapping at my questions. I had stopped asking.',
        '',
        'One day she pulled me aside after class. She said: "I have been thinking. I have not been patient with you. That is not okay. I am sorry."',
        '',
        'I was shocked. Teachers do not apologize.',
        '',
        'I said: "It is okay."',
        '',
        'She said: "It is not okay. You needed help. I should have given it to you. I will do better."',
        '',
        'She started staying late twice a week to work with me. My grades came up.',
        '',
        'She still snapped sometimes. But she would apologize. We had a different relationship.',
        '',
        'At end of year she wrote me a note: "Thank you for being patient with me. You taught me to be a better teacher."',
        '',
        'Repair from adults is rare. When it happens, it shifts everything.'
      ]
    },
    {
      id: 'rsc4',
      title: 'The reconciliation that took years',
      story: [
        'My family had a rift over my coming out as gay. My grandfather had said terrible things.',
        '',
        'I did not see him for four years.',
        '',
        'When my grandfather got sick, my mom called. She said he wanted to see me.',
        '',
        'I went. I did not know what to expect.',
        '',
        'He said: "I was wrong. I have been thinking. The way I responded was based on what I had been taught. It was not based on knowing you."',
        '',
        'He said: "Will you forgive me?"',
        '',
        'I said: "I want to. It will take time."',
        '',
        'For the last year of his life, we talked every week. He met my boyfriend. He came to our anniversary dinner.',
        '',
        'At his funeral I spoke. I said: "He was a man who changed his mind. Few people do that. I am grateful I knew him at the end."',
        '',
        'Repair takes time. People can change. Sometimes the wait is worth it.'
      ]
    },
    {
      id: 'rsc5',
      title: 'When I learned my parents were upstanders',
      story: [
        'I always thought my parents were quiet people. Nothing special.',
        '',
        'In college I started researching family history. I found out my mom had been part of organizing for racial justice in our town in the 70s. She had been arrested at a sit-in.',
        '',
        'I asked her about it. She said: "I do not talk about it because it was just what we did. We saw something wrong. We stood up."',
        '',
        'I learned my dad had been arrested too. Different protest.',
        '',
        'I had been a bystander to my parents. I had assumed they were not movement people.',
        '',
        'I told them I was sorry I had underestimated them. They laughed.',
        '',
        'Family stories matter. Upstander work crosses generations.'
      ]
    }
  ];

  var TEACHING_GUIDES_FOR_EDUCATORS = [
    {
      id: 'tge1',
      audience: 'Elementary teachers',
      focusAreas: [
        'Building inclusive classroom',
        'Teaching empathy',
        'Modeling intervention',
        'Engaging families'
      ],
      specificStrategies: [
        'Morning meetings',
        'Books featuring diverse characters',
        'Compliment circles',
        'Restorative practice basics'
      ],
      ageAppropriate: [
        'Simple vocabulary',
        'Concrete examples',
        'Active practice',
        'Family engagement'
      ]
    },
    {
      id: 'tge2',
      audience: 'Middle school teachers',
      focusAreas: [
        'Identity development',
        'Peer dynamics',
        'Building bystander intervention skills',
        'Online safety'
      ],
      specificStrategies: [
        'Identity-affirming curriculum',
        'Cooperative learning',
        'Real-time intervention modeling',
        'Digital citizenship'
      ],
      ageAppropriate: [
        'Discussion-based',
        'Identity exploration',
        'Real scenarios',
        'Family engagement'
      ]
    },
    {
      id: 'tge3',
      audience: 'High school teachers',
      focusAreas: [
        'Systemic analysis',
        'Coalition building',
        'Long-term advocacy',
        'Transition to adulthood'
      ],
      specificStrategies: [
        'Critical curriculum',
        'Student-led discussions',
        'Real-world applications',
        'College/career preparation'
      ],
      ageAppropriate: [
        'Analytical depth',
        'Self-determination',
        'Coalition skills',
        'Adult preparation'
      ]
    },
    {
      id: 'tge4',
      audience: 'Special education teachers',
      focusAreas: [
        'Disability-aware practice',
        'Bullying of disabled students',
        'Self-advocacy skills',
        'Family partnership'
      ],
      specificStrategies: [
        'Identity-affirming language',
        'Specific protections',
        'Building self-advocacy',
        'Trauma-informed practice'
      ],
      ageAppropriate: [
        'Varies by ability and need',
        'Individualized',
        'Multiple modalities',
        'Strong family partnership'
      ]
    }
  ];

  var ROLE_PLAY_DIALOGUES_DEEP = [
    {
      id: 'rpdd1',
      title: 'A bystander becomes an upstander - first time',
      cast: ['Bystander (You)', 'Mocker (Friend)', 'Target', 'Observer (Another classmate)'],
      acts: [
        {
          beat: 'The moment',
          description: 'In hallway. Friend is mocking target. Target is silent.',
          dialogue: [
            { speaker: 'Mocker', line: '[Imitates target\'s walk in front of group]' },
            { speaker: 'Target', line: '[Hood up, walks faster]' },
            { speaker: 'Bystander internal', line: 'This is wrong. I feel sick. I have to do something.' }
          ]
        },
        {
          beat: 'The action',
          description: 'Bystander steps forward.',
          dialogue: [
            { speaker: 'Bystander', line: 'Hey, knock it off.' },
            { speaker: 'Mocker', line: 'What? It is a joke.' },
            { speaker: 'Bystander', line: 'It is not. Stop.' },
            { speaker: 'Mocker', line: 'Whatever.' }
          ]
        },
        {
          beat: 'The follow-up',
          description: 'After class, bystander approaches target.',
          dialogue: [
            { speaker: 'Bystander', line: 'Hey. I saw what happened earlier. I am sorry.' },
            { speaker: 'Target', line: 'Thanks for saying something.' },
            { speaker: 'Bystander', line: 'You okay?' },
            { speaker: 'Target', line: 'I am used to it.' },
            { speaker: 'Bystander', line: 'You should not have to be. Anything I can do?' },
            { speaker: 'Target', line: 'Just keep being you.' }
          ]
        }
      ],
      analysis: 'Bystander acted in moment AND followed up. Small intervention. Real impact.'
    },
    {
      id: 'rpdd2',
      title: 'A teacher intervenes',
      cast: ['Teacher', 'Student A', 'Student B'],
      acts: [
        {
          beat: 'In class',
          description: 'Student A makes mocking comment to Student B about their accent.',
          dialogue: [
            { speaker: 'Student A', line: '[Mimics Student B\'s accent loudly]' },
            { speaker: 'Student B', line: '[Goes silent]' },
            { speaker: 'Teacher internal', line: 'I have to respond now. Class is watching.' }
          ]
        },
        {
          beat: 'Intervention',
          description: 'Teacher pauses and addresses class.',
          dialogue: [
            { speaker: 'Teacher', line: 'Stop. What just happened in this class is not okay.' },
            { speaker: 'Student A', line: 'It was a joke.' },
            { speaker: 'Teacher', line: 'In our class, we do not mock accents or any aspect of how someone speaks. Apologize.' },
            { speaker: 'Student A', line: 'Sorry.' },
            { speaker: 'Teacher', line: 'Student B, are you okay?' },
            { speaker: 'Student B', line: '[Nods]' },
            { speaker: 'Teacher', line: 'Lets continue. And let us all reset the norm: every voice belongs here.' }
          ]
        }
      ],
      analysis: 'Teacher named harm, required apology, checked on target, reset class culture. All in 60 seconds.'
    },
    {
      id: 'rpdd3',
      title: 'Restorative circle for incident',
      cast: ['Facilitator', 'Harmed', 'Harmer', 'Friend of harmed', 'Friend of harmer'],
      acts: [
        {
          beat: 'Setup',
          description: 'Circle formed. Talking piece passed.',
          dialogue: [
            { speaker: 'Facilitator', line: 'Welcome. We are here to address what happened on Monday. Lets start with each of us sharing what we know and how we are feeling.' }
          ]
        },
        {
          beat: 'Sharing',
          description: 'Each person speaks when holding talking piece.',
          dialogue: [
            { speaker: 'Harmer', line: 'I said the thing on Monday. I did not realize how it landed.' },
            { speaker: 'Harmed', line: 'It hurt. I have been thinking about it all week.' },
            { speaker: 'Friend of harmed', line: 'I saw it. I was with her after. She was crying.' },
            { speaker: 'Friend of harmer', line: 'I saw it too. I should have said something then.' }
          ]
        },
        {
          beat: 'Needs',
          description: 'What is needed for repair?',
          dialogue: [
            { speaker: 'Facilitator', line: 'What is needed for this to be repaired?' },
            { speaker: 'Harmed', line: 'I need her to understand the impact. I need her not to do it again.' },
            { speaker: 'Harmer', line: 'I understand now. I will not do it again. I am sorry.' },
            { speaker: 'Harmed', line: 'I need to also know we are okay long-term.' }
          ]
        },
        {
          beat: 'Agreement',
          description: 'Written agreement.',
          dialogue: [
            { speaker: 'Facilitator', line: 'Lets write this down. Harmer will not repeat the language. Both will sit together at lunch tomorrow. Friends will support both. We will check back in two weeks.' },
            { speaker: 'All', line: 'Agreed.' }
          ]
        }
      ],
      analysis: 'Circle allows everyone to speak. Names impact. Specific agreement. Follow-up planned.'
    },
    {
      id: 'rpdd4',
      title: 'Parent calling about bullying',
      cast: ['Parent', 'Principal'],
      acts: [
        {
          beat: 'Initial call',
          description: 'Parent calls principal\'s office.',
          dialogue: [
            { speaker: 'Parent', line: 'Hi, my name is Maria Lopez. I am calling about my son Andrew. He is in 7th grade.' },
            { speaker: 'Principal', line: 'Hi Maria. How can I help?' },
            { speaker: 'Parent', line: 'Andrew has been bullied for the last three weeks. He has been coming home upset. I want to discuss it.' }
          ]
        },
        {
          beat: 'Meeting',
          description: 'In-person meeting next day.',
          dialogue: [
            { speaker: 'Parent', line: 'I have written down what Andrew has told me. Here are the dates. Here are the names of the students. Here is what has been happening.' },
            { speaker: 'Principal', line: 'Thank you for bringing this. We will investigate.' },
            { speaker: 'Parent', line: 'I would like to know your timeline. And I want a safety plan for Andrew this week, not next week.' },
            { speaker: 'Principal', line: 'We can have a safety plan by tomorrow afternoon. Investigation will take 5-10 days.' },
            { speaker: 'Parent', line: 'Thank you. I would like written confirmation of both.' }
          ]
        }
      ],
      analysis: 'Parent came prepared. Specific requests. Written follow-up.'
    },
    {
      id: 'rpdd5',
      title: 'Friend group accountability',
      cast: ['Friend 1', 'Friend 2', 'Friend 3 (problematic)', 'Friend 4'],
      acts: [
        {
          beat: 'Setting up',
          description: 'Three friends decide to talk to fourth.',
          dialogue: [
            { speaker: 'Friend 1', line: 'We need to talk to ___ about how they have been treating ___ at school.' },
            { speaker: 'Friend 2', line: 'They will be defensive.' },
            { speaker: 'Friend 4', line: 'Yes. AND we have to.' },
            { speaker: 'Friend 1', line: 'Lets do it together. We meet ___ after school.' }
          ]
        },
        {
          beat: 'The conversation',
          description: 'Three friends approach the fourth.',
          dialogue: [
            { speaker: 'Friend 1', line: 'Hey, can we talk?' },
            { speaker: 'Friend 3', line: 'About what?' },
            { speaker: 'Friend 2', line: 'About how you have been treating ___.' },
            { speaker: 'Friend 3', line: 'I have not done anything.' },
            { speaker: 'Friend 4', line: 'You have. Specifically: [specific examples].' },
            { speaker: 'Friend 1', line: 'We have all seen it. We care about you. AND we are not going to participate in mistreating ___.' },
            { speaker: 'Friend 3', line: '[Long silence]' },
            { speaker: 'Friend 1', line: 'We want to know what is going on with you. Lets talk.' }
          ]
        }
      ],
      analysis: 'Group accountability. Specific examples. Care + accountability. Door open for conversation.'
    },
    {
      id: 'rpdd6',
      title: 'After-school text support',
      cast: ['Friend (You)', 'Target (Classmate)'],
      acts: [
        {
          beat: 'Reaching out',
          description: 'Text exchange.',
          dialogue: [
            { speaker: 'You (text)', line: 'Hey. I saw what happened today in PE. Wanted to check in. No need to respond if not ready.' },
            { speaker: 'Target', line: 'Thanks for asking. I am having a hard time.' },
            { speaker: 'You', line: 'I am sorry. Want to talk about it?' },
            { speaker: 'Target', line: 'Maybe later. I just need to know someone saw it.' },
            { speaker: 'You', line: 'I did. And it was not okay. You did not deserve it.' },
            { speaker: 'Target', line: 'Thanks.' },
            { speaker: 'You', line: 'I am here when you want to talk. Also I told my mom and she is going to help me figure out what to do.' },
            { speaker: 'Target', line: 'You did?' },
            { speaker: 'You', line: 'Yeah. I am not okay just leaving this. I will keep you updated.' }
          ]
        }
      ],
      analysis: 'Specific. Acknowledged. Did not push. Continued support.'
    },
    {
      id: 'rpdd7',
      title: 'Athlete confronting coach',
      cast: ['Student athlete', 'Coach'],
      acts: [
        {
          beat: 'After practice',
          description: 'Student approaches coach privately.',
          dialogue: [
            { speaker: 'Student', line: 'Coach, can I talk to you for a few minutes?' },
            { speaker: 'Coach', line: 'Sure.' },
            { speaker: 'Student', line: 'I want to talk about the way you have been yelling at ___ at practice.' },
            { speaker: 'Coach', line: 'They need to step up.' },
            { speaker: 'Student', line: 'I hear that. And the way it is happening is humiliating them. I have noticed. Other players have noticed. I think we need a different approach.' },
            { speaker: 'Coach', line: 'You are telling me how to coach?' },
            { speaker: 'Student', line: 'I am telling you the impact. I am asking you to consider a different way. Maybe private feedback. Maybe specific instead of public.' },
            { speaker: 'Coach', line: 'I will think about it.' }
          ]
        },
        {
          beat: 'Following up',
          description: 'A week later.',
          dialogue: [
            { speaker: 'Student', line: 'Hey Coach, just checking in on what we talked about last week.' },
            { speaker: 'Coach', line: 'I have been trying to be more private. Thanks for bringing it up.' }
          ]
        }
      ],
      analysis: 'Private. Specific. Impact-focused. Suggested alternative. Followed up.'
    },
    {
      id: 'rpdd8',
      title: 'New student welcome',
      cast: ['Existing student', 'New student'],
      acts: [
        {
          beat: 'First day',
          description: 'Existing student notices new student alone at lunch.',
          dialogue: [
            { speaker: 'Existing student', line: 'Hi. Mind if I sit here?' },
            { speaker: 'New student', line: 'Sure.' },
            { speaker: 'Existing student', line: 'I am ___. I am in 9th grade. You new?' },
            { speaker: 'New student', line: 'Yeah. Started yesterday.' },
            { speaker: 'Existing student', line: 'Welcome. Where did you move from?' },
            { speaker: 'New student', line: '[Tells story briefly]' },
            { speaker: 'Existing student', line: 'Cool. So, anything you need to know? Where is the math wing? Who has the easiest sub?' }
          ]
        },
        {
          beat: 'Following up',
          description: 'Next day.',
          dialogue: [
            { speaker: 'Existing student', line: 'Hey, want to sit again? I am the same place.' },
            { speaker: 'New student', line: 'Yeah!' }
          ]
        }
      ],
      analysis: 'Simple. Specific. Continued.'
    }
  ];

  var TRAINING_MODULES = [
    {
      id: 'tm1',
      title: 'Module 1: The Spectrum of Bystander to Upstander',
      duration: '90 min',
      objectives: ['Understand the spectrum', 'Identify own current location', 'Plan growth'],
      sections: [
        {
          section: 'Introduction',
          time: '10 min',
          content: 'Welcome. Today we explore where each of us sits on the bystander-upstander spectrum.'
        },
        {
          section: 'The Spectrum',
          time: '20 min',
          content: 'Define each: passive bystander, witnessing without acknowledging, witnessing with acknowledgment, intervening indirectly, intervening directly, organizing for change.'
        },
        {
          section: 'Self-assessment',
          time: '20 min',
          content: 'Each participant identifies where they typically sit. Notes patterns.'
        },
        {
          section: 'Stories',
          time: '30 min',
          content: 'Real stories from participants about times they were each point on the spectrum.'
        },
        {
          section: 'Growth planning',
          time: '10 min',
          content: 'Each participant identifies one step toward becoming more active upstander.'
        }
      ]
    },
    {
      id: 'tm2',
      title: 'Module 2: Reading the Room',
      duration: '90 min',
      objectives: ['Improve noticing', 'Distinguish bullying from conflict', 'Identify intervention opportunities'],
      sections: [
        {
          section: 'Introduction',
          time: '10 min',
          content: 'Most students miss bullying. We will practice noticing.'
        },
        {
          section: 'Mini-lesson',
          time: '15 min',
          content: 'Bullying vs conflict. Power dynamics. Repetition. Intent and impact.'
        },
        {
          section: 'Case studies',
          time: '30 min',
          content: 'Small groups analyze 5 scenarios. Distinguish bullying from conflict. Identify dynamics.'
        },
        {
          section: 'Practice',
          time: '25 min',
          content: 'Video clips. Identify what is happening. Discuss interventions.'
        },
        {
          section: 'Commitment',
          time: '10 min',
          content: 'Each participant commits to noticing one moment this week.'
        }
      ]
    },
    {
      id: 'tm3',
      title: 'Module 3: Direct Intervention Skills',
      duration: '90 min',
      objectives: ['Build verbal skills', 'Practice high-risk intervention', 'Build muscle memory'],
      sections: [
        {
          section: 'Introduction',
          time: '10 min',
          content: 'Direct intervention is high-risk but sometimes the right move. Practice makes it possible.'
        },
        {
          section: 'Mini-lesson',
          time: '15 min',
          content: 'Key phrases. Body language. Voice. Stance. Exit strategy.'
        },
        {
          section: 'Demonstration',
          time: '15 min',
          content: 'Trainers demonstrate. Walk through choices.'
        },
        {
          section: 'Role-play',
          time: '40 min',
          content: 'Pairs practice. Switch roles. Get feedback.'
        },
        {
          section: 'Debrief',
          time: '10 min',
          content: 'What worked? What was hard? Commit to use one phrase this week.'
        }
      ]
    },
    {
      id: 'tm4',
      title: 'Module 4: Indirect Intervention Skills',
      duration: '90 min',
      objectives: ['Learn distract, delegate, document, delay', 'Practice each', 'Plan use'],
      sections: [
        {
          section: 'Introduction',
          time: '10 min',
          content: 'When direct is too risky, indirect works.'
        },
        {
          section: 'Four Ds',
          time: '20 min',
          content: 'Distract: redirect attention. Delegate: get help. Document: record. Delay: follow up later.'
        },
        {
          section: 'Practice each',
          time: '50 min',
          content: '5 scenarios. Apply each D. Switch and try.'
        },
        {
          section: 'Reflection',
          time: '10 min',
          content: 'Which D fits your style? When?'
        }
      ]
    },
    {
      id: 'tm5',
      title: 'Module 5: Supporting Targets',
      duration: '90 min',
      objectives: ['Build support skills', 'Listen well', 'Provide ongoing care'],
      sections: [
        {
          section: 'Introduction',
          time: '10 min',
          content: 'Support work continues after intervention.'
        },
        {
          section: 'Listening skills',
          time: '20 min',
          content: 'Active listening. Reflective listening. Refrain from fixing.'
        },
        {
          section: 'Practice',
          time: '40 min',
          content: 'Pairs practice listening. One shares, one listens. Switch.'
        },
        {
          section: 'Resources',
          time: '15 min',
          content: 'Local and online resources for targets. How to share.'
        },
        {
          section: 'Commitment',
          time: '5 min',
          content: 'Commit to reaching out to one person this week.'
        }
      ]
    },
    {
      id: 'tm6',
      title: 'Module 6: Confronting Harmers',
      duration: '90 min',
      objectives: ['Build confrontation skills', 'Hold accountability + compassion', 'Practice repair'],
      sections: [
        {
          section: 'Introduction',
          time: '10 min',
          content: 'Confrontation done well changes minds and behaviors.'
        },
        {
          section: 'Framework',
          time: '20 min',
          content: 'Private setting. I-statements. Specific. Impact-focused. Listen.'
        },
        {
          section: 'Role-play',
          time: '40 min',
          content: 'Pairs practice. Switch. Get feedback.'
        },
        {
          section: 'Restorative dialogue',
          time: '15 min',
          content: 'When and how to use restorative dialogue.'
        },
        {
          section: 'Commitment',
          time: '5 min',
          content: 'Identify one conversation you will have.'
        }
      ]
    },
    {
      id: 'tm7',
      title: 'Module 7: Sustained Advocacy',
      duration: '90 min',
      objectives: ['Build coalition skills', 'Plan sustained work', 'Self-care for activists'],
      sections: [
        {
          section: 'Introduction',
          time: '10 min',
          content: 'Systemic change requires sustained action.'
        },
        {
          section: 'Coalition building',
          time: '20 min',
          content: 'Finding allies. Building shared analysis. Setting goals.'
        },
        {
          section: 'Strategy',
          time: '25 min',
          content: 'Choose targets. Plan actions. Document outcomes.'
        },
        {
          section: 'Self-care',
          time: '25 min',
          content: 'Sustainable practice. Avoiding burnout. Mutual care.'
        },
        {
          section: 'Closing',
          time: '10 min',
          content: 'Each participant commits to one sustained action.'
        }
      ]
    },
    {
      id: 'tm8',
      title: 'Module 8: Identity-Aware Upstander Work',
      duration: '120 min',
      objectives: ['Center marginalized voices', 'Examine privilege', 'Build identity-aware practice'],
      sections: [
        {
          section: 'Introduction',
          time: '10 min',
          content: 'Identity shapes harm. Upstander work must be identity-aware.'
        },
        {
          section: 'Intersectionality',
          time: '30 min',
          content: 'Kimberle Crenshaw framework. Multiple identities. Compounding effects.'
        },
        {
          section: 'Privilege examination',
          time: '30 min',
          content: 'Each participant maps their own identities and privileges.'
        },
        {
          section: 'Centering most impacted',
          time: '30 min',
          content: 'How to center voices in coalition. When to step back.'
        },
        {
          section: 'Practice',
          time: '15 min',
          content: 'Role-play identity-based intervention.'
        },
        {
          section: 'Closing',
          time: '5 min',
          content: 'One commitment toward identity-aware practice.'
        }
      ]
    },
    {
      id: 'tm9',
      title: 'Module 9: Trauma-Informed Upstander Work',
      duration: '90 min',
      objectives: ['Apply trauma-informed framework', 'Recognize trauma in self and others', 'Build trauma-aware practice'],
      sections: [
        {
          section: 'Introduction',
          time: '10 min',
          content: 'Trauma shapes harm and response.'
        },
        {
          section: 'Trauma basics',
          time: '20 min',
          content: 'How trauma works. ACE study. Body keeps the score.'
        },
        {
          section: 'Recognition',
          time: '20 min',
          content: 'Recognizing trauma in self and others.'
        },
        {
          section: 'Application',
          time: '30 min',
          content: 'Apply trauma-informed principles to upstander work.'
        },
        {
          section: 'Self-care',
          time: '10 min',
          content: 'Vicarious trauma. Self-care.'
        }
      ]
    },
    {
      id: 'tm10',
      title: 'Module 10: Long-Term Practice',
      duration: '90 min',
      objectives: ['Build sustainable practice', 'Plan year of action', 'Build mentor relationship'],
      sections: [
        {
          section: 'Reflection',
          time: '20 min',
          content: 'What have you learned through this training?'
        },
        {
          section: 'Year planning',
          time: '40 min',
          content: 'Plan a year of upstander practice. Monthly goals. Quarterly check-ins.'
        },
        {
          section: 'Mentorship',
          time: '20 min',
          content: 'Pair with mentor. Ongoing relationship.'
        },
        {
          section: 'Closing',
          time: '10 min',
          content: 'Each participant shares one commitment for the year.'
        }
      ]
    }
  ];

  var UPSTANDER_GLOSSARY = [
    { id: 'ug1', term: 'Active bystander', definition: 'Someone who witnesses harm and chooses to intervene in some way.' },
    { id: 'ug2', term: 'Passive bystander', definition: 'Someone who witnesses harm and does not intervene.' },
    { id: 'ug3', term: 'Upstander', definition: 'Someone who stands up against harm. The opposite of passive bystander.' },
    { id: 'ug4', term: 'Target', definition: 'A person experiencing harm. Preferred over "victim" by some.' },
    { id: 'ug5', term: 'Victim', definition: 'Someone harmed. Some prefer "target" as it does not center vulnerability.' },
    { id: 'ug6', term: 'Survivor', definition: 'Someone who has experienced harm and continues. Often preferred over victim.' },
    { id: 'ug7', term: 'Perpetrator', definition: 'Person doing harm. Use carefully; many prefer "person who caused harm."' },
    { id: 'ug8', term: 'Person who caused harm', definition: 'Preferred language for someone who has harmed others. Centers their humanity.' },
    { id: 'ug9', term: 'Bullying', definition: 'Repeated aggressive behavior intended to harm, with imbalance of power.' },
    { id: 'ug10', term: 'Harassment', definition: 'Unwelcome conduct creating hostile environment, often based on protected identity.' },
    { id: 'ug11', term: 'Discrimination', definition: 'Differential treatment based on protected identity.' },
    { id: 'ug12', term: 'Microaggression', definition: 'Subtle, often unintentional discriminatory comments or actions.' },
    { id: 'ug13', term: 'Cyberbullying', definition: 'Bullying that takes place via electronic devices.' },
    { id: 'ug14', term: 'Doxxing', definition: 'Publishing private personal information about someone.' },
    { id: 'ug15', term: 'Catfishing', definition: 'Creating fake identity online to deceive someone.' },
    { id: 'ug16', term: 'Trolling', definition: 'Posting deliberately inflammatory or off-topic comments.' },
    { id: 'ug17', term: 'Sealioning', definition: 'Bad-faith requests for information designed to exhaust target.' },
    { id: 'ug18', term: 'Restorative justice', definition: 'Approach focused on repairing harm rather than punishment.' },
    { id: 'ug19', term: 'Punitive', definition: 'Punishment-focused approach.' },
    { id: 'ug20', term: 'Conflict mediation', definition: 'Process involving neutral third party to resolve disputes.' },
    { id: 'ug21', term: 'Circle', definition: 'Restorative practice where participants speak in turn.' },
    { id: 'ug22', term: 'Conference', definition: 'Formal restorative meeting with structured roles.' },
    { id: 'ug23', term: 'Repair', definition: 'Concrete action to address harm.' },
    { id: 'ug24', term: 'Accountability', definition: 'Taking responsibility for one\'s actions and their impact.' },
    { id: 'ug25', term: 'Apology', definition: 'Acknowledgment of harm with intent to repair.' },
    { id: 'ug26', term: 'In-group', definition: 'Group with which one identifies.' },
    { id: 'ug27', term: 'Out-group', definition: 'Group with which one does not identify.' },
    { id: 'ug28', term: 'Privilege', definition: 'Advantages granted based on identity.' },
    { id: 'ug29', term: 'Power', definition: 'Capacity to influence outcomes.' },
    { id: 'ug30', term: 'Allyship', definition: 'Standing with marginalized groups one is not part of.' },
    { id: 'ug31', term: 'Accomplice', definition: 'Active participant in resistance, more than just ally.' },
    { id: 'ug32', term: 'Solidarity', definition: 'Unity in cause or struggle.' },
    { id: 'ug33', term: 'Intersectionality', definition: 'Recognition that identities compound. Coined by Kimberle Crenshaw.' },
    { id: 'ug34', term: 'Ableism', definition: 'Systemic prejudice against disabled people.' },
    { id: 'ug35', term: 'Racism', definition: 'Prejudice + power, systemic harm based on race.' },
    { id: 'ug36', term: 'Sexism', definition: 'Prejudice + power, systemic harm based on sex/gender.' },
    { id: 'ug37', term: 'Homophobia', definition: 'Prejudice against gay and lesbian people.' },
    { id: 'ug38', term: 'Transphobia', definition: 'Prejudice against trans people.' },
    { id: 'ug39', term: 'Xenophobia', definition: 'Prejudice against foreigners or those perceived as such.' },
    { id: 'ug40', term: 'Islamophobia', definition: 'Prejudice against Muslims.' },
    { id: 'ug41', term: 'Anti-Semitism', definition: 'Prejudice against Jewish people.' },
    { id: 'ug42', term: 'Anti-Black racism', definition: 'Specific racism against Black people.' },
    { id: 'ug43', term: 'White supremacy', definition: 'System of advantage for white people.' },
    { id: 'ug44', term: 'Misogyny', definition: 'Hatred or contempt for women.' },
    { id: 'ug45', term: 'Patriarchy', definition: 'System of male dominance.' },
    { id: 'ug46', term: 'Heteronormativity', definition: 'Assumption that heterosexuality is default.' },
    { id: 'ug47', term: 'Cisnormativity', definition: 'Assumption that cisgender is default.' },
    { id: 'ug48', term: 'Disability justice', definition: 'Framework centering multiply marginalized disabled people.' },
    { id: 'ug49', term: 'Trauma-informed', definition: 'Approach recognizing impact of trauma.' },
    { id: 'ug50', term: 'Adverse Childhood Experiences (ACEs)', definition: 'Difficult or traumatic events in childhood.' }
  ];

  var BYSTANDER_FAQ = [
    {
      id: 'bfq1',
      question: 'What if intervening makes me a target?',
      answer: 'This is a real concern. Strategies: 1) Choose lower-risk interventions when needed. 2) Build coalition before intervening. 3) Use indirect support. 4) Have exit plan. 5) Take care of self after.'
    },
    {
      id: 'bfq2',
      question: 'What if I am not sure what is happening?',
      answer: 'Pause and assess. Ask target if safe. If you are not sure, low-risk interventions (distraction, delegation) are still helpful.'
    },
    {
      id: 'bfq3',
      question: 'What if the target does not want help?',
      answer: 'Honor their choice. You can still document, tell trusted adult, and offer ongoing support without forcing intervention.'
    },
    {
      id: 'bfq4',
      question: 'What if I have been a bystander for a long time?',
      answer: 'You can start now. Acknowledge past silence, apologize where appropriate, commit to future action.'
    },
    {
      id: 'bfq5',
      question: 'What if I have been the harmer?',
      answer: 'You can change. Acknowledge specifically, apologize, repair, sustain change. Most upstanders have been harmers at some point.'
    },
    {
      id: 'bfq6',
      question: 'What if my friend group will not change?',
      answer: 'Sometimes you need new friends. Take time. Build values-aligned community. Loss is real and worth it.'
    },
    {
      id: 'bfq7',
      question: 'What if adults at school do not help?',
      answer: 'Try multiple adults. Try different levels (teacher, counselor, principal, district, state). Find your allies.'
    },
    {
      id: 'bfq8',
      question: 'What if intervention makes things worse?',
      answer: 'Some interventions can escalate. Choose strategy carefully. Reflect after. Try different approach next time.'
    },
    {
      id: 'bfq9',
      question: 'What if I burn out?',
      answer: 'Build sustainable practices. Rotate with allies. Self-care is political. Take breaks.'
    },
    {
      id: 'bfq10',
      question: 'What if there is no one else doing this work?',
      answer: 'Start. One person can build a movement. Find one ally. Build from there.'
    }
  ];

  var UPSTANDER_HISTORY_EXTENDED = [
    {
      id: 'uhe1',
      year: 1960,
      event: 'Greensboro lunch counter sit-ins',
      whoWasInvolved: 'Joseph McNeil, Franklin McCain, Ezell Blair Jr., David Richmond - four NC A&T freshmen',
      whatHappened: 'Four Black college students sat at a whites-only Woolworth lunch counter. They were refused service. They came back the next day. And the next. Sit-ins spread to dozens of cities.',
      whyItMatters: 'Showed power of nonviolent direct action by ordinary young people. Bystanders to segregation became upstanders.',
      lessons: ['Four people can start movement', 'Nonviolent action is powerful', 'Young people lead', 'Persistence matters']
    },
    {
      id: 'uhe2',
      year: 1961,
      event: 'Freedom Rides',
      whoWasInvolved: 'CORE, SNCC, 436 Freedom Riders',
      whatHappened: 'Interracial groups rode interstate buses through the South to challenge segregation. They were beaten. Buses were firebombed. They kept going.',
      whyItMatters: 'White and Black upstanders together risked their lives to test Supreme Court ruling.',
      lessons: ['Cross-identity coalition', 'Real cost of upstander work', 'Solidarity matters', 'Movement is sustained']
    },
    {
      id: 'uhe3',
      year: 1964,
      event: 'Freedom Summer',
      whoWasInvolved: 'SNCC, COFO, 1000+ volunteers',
      whatHappened: 'Mostly white college students went to Mississippi to register Black voters. Three were murdered. Many were beaten.',
      whyItMatters: 'Upstander work involves risk and solidarity. White people putting bodies on line for Black voting rights.',
      lessons: ['Privilege used for justice', 'Real risk', 'Coalition power', 'Persistence']
    },
    {
      id: 'uhe4',
      year: 1965,
      event: 'Selma marches',
      whoWasInvolved: 'SNCC, SCLC, Hosea Williams, John Lewis, Amelia Boynton, MLK Jr., thousands of supporters',
      whatHappened: 'Three marches from Selma to Montgomery for voting rights. Bloody Sunday. Violence on Edmund Pettus Bridge. Led to Voting Rights Act.',
      whyItMatters: 'Strategic upstander action with national impact.',
      lessons: ['Strategy + courage', 'Media as ally', 'Persistence through violence', 'Federal change possible']
    },
    {
      id: 'uhe5',
      year: 1969,
      event: 'Stonewall riots',
      whoWasInvolved: 'Marsha P. Johnson, Sylvia Rivera, Stormé DeLarverie, Pulitzer-eligible trans, queer, and street community',
      whatHappened: 'After police raid on Stonewall Inn, LGBTQ patrons fought back. Sparked Pride movement.',
      whyItMatters: 'Trans women of color led upstander action that benefited all LGBTQ people.',
      lessons: ['Most marginalized often lead', 'Sometimes resistance is right', 'Pride is political']
    },
    {
      id: 'uhe6',
      year: 1971,
      event: 'Attica Prison uprising',
      whoWasInvolved: 'Incarcerated men, supporters outside',
      whatHappened: 'Incarcerated men at Attica took over the prison, demanding better conditions and rights. Forty-three killed when state retook prison.',
      whyItMatters: 'Some upstander work is for those society has dismissed entirely.',
      lessons: ['Voice from those most marginalized', 'Cost is real', 'Allies on the outside matter']
    },
    {
      id: 'uhe7',
      year: 1973,
      event: 'Wounded Knee',
      whoWasInvolved: 'American Indian Movement, Oglala Lakota, Russell Means, Dennis Banks',
      whatHappened: 'AIM occupied Wounded Knee on Pine Ridge Reservation for 71 days, demanding treaty rights and federal accountability.',
      whyItMatters: 'Indigenous-led upstander action against centuries of harm.',
      lessons: ['Centuries of organizing', 'Sovereignty matters', 'Federal accountability']
    },
    {
      id: 'uhe8',
      year: 1977,
      event: 'Combahee River Collective Statement',
      whoWasInvolved: 'Black feminist lesbian collective in Boston',
      whatHappened: 'Issued foundational statement on intersectional politics. Coined "identity politics" in transformative sense.',
      whyItMatters: 'Articulated multiply marginalized analysis that shapes upstander work today.',
      lessons: ['Theory matters', 'Black feminism is foundational', 'Intersectionality predates the word']
    },
    {
      id: 'uhe9',
      year: 1977,
      event: '504 sit-in',
      whoWasInvolved: 'Disabled activists, Black Panthers, allies',
      whatHappened: 'Disabled activists occupied federal building for 28 days to force enforcement of Section 504.',
      whyItMatters: 'Cross-movement solidarity (Black Panthers fed disabled protesters daily).',
      lessons: ['Disability rights matter', 'Cross-movement solidarity', 'Sustained action wins']
    },
    {
      id: 'uhe10',
      year: 1989,
      event: 'AIDS Coalition to Unleash Power (ACT UP) demonstrations',
      whoWasInvolved: 'ACT UP, AIDS activists',
      whatHappened: 'Direct action protests demanded faster AIDS research, treatment access, and government response. "Silence = Death."',
      whyItMatters: 'Sick and dying people doing upstander work for themselves and others.',
      lessons: ['Urgency', 'Direct action', 'Silence kills', 'Movement builds power']
    },
    {
      id: 'uhe11',
      year: 1990,
      event: 'ADA passage',
      whoWasInvolved: 'Justin Dart, Patrisha Wright, Evan Kemp, decades of disability activists',
      whatHappened: 'Comprehensive disability civil rights law passes. Capitol Crawl pressured passage.',
      whyItMatters: 'Decades of upstander work won foundational protections.',
      lessons: ['Long arc', 'Coalition power', 'Embodied protest', 'Federal change']
    },
    {
      id: 'uhe12',
      year: 1990,
      event: 'Capitol Crawl',
      whoWasInvolved: 'ADAPT activists including Jennifer Keelan-Chaffins',
      whatHappened: 'Disabled activists abandoned wheelchairs and crawled up Capitol steps to demand ADA passage.',
      whyItMatters: 'Embodied protest by those society had ignored.',
      lessons: ['Visibility matters', 'Children can lead', 'Bodies make argument']
    },
    {
      id: 'uhe13',
      year: 1992,
      event: 'Anita Hill testimony',
      whoWasInvolved: 'Anita Hill, Sen. Joseph Biden\'s Judiciary Committee',
      whatHappened: 'Anita Hill testified about sexual harassment by Supreme Court nominee Clarence Thomas. Despite testimony, Thomas was confirmed.',
      whyItMatters: 'Brought sexual harassment into public discourse. Catalyzed Year of the Woman.',
      lessons: ['Cost of speaking up', 'Even when you "lose"', 'Long-term impact']
    },
    {
      id: 'uhe14',
      year: 1999,
      event: 'WTO Seattle protests',
      whoWasInvolved: 'Labor, environment, anti-globalization activists',
      whatHappened: 'Massive protests against World Trade Organization meeting in Seattle. Tear gas. Mass arrests. Shut down meetings.',
      whyItMatters: 'Showed power of coalition across labor, environment, identity.',
      lessons: ['Coalition power', 'Direct action', 'Global awareness']
    },
    {
      id: 'uhe15',
      year: 2011,
      event: 'Occupy Wall Street',
      whoWasInvolved: 'Diverse coalition, anonymous founders',
      whatHappened: 'Occupation of Zuccotti Park in NYC sparked nationwide and global "Occupy" movement against inequality.',
      whyItMatters: 'Brought class analysis into public discourse. "We are the 99%."',
      lessons: ['Naming the system', 'Direct presence', 'Movement building']
    },
    {
      id: 'uhe16',
      year: 2013,
      event: 'Black Lives Matter founded',
      whoWasInvolved: 'Patrisse Cullors, Alicia Garza, Opal Tometi',
      whatHappened: 'After Trayvon Martin killer\'s acquittal, three Black women started #BlackLivesMatter. Became global movement.',
      whyItMatters: 'Black queer women started movement against anti-Black violence.',
      lessons: ['Online to offline', 'Movement led by impacted', 'Sustained presence']
    },
    {
      id: 'uhe17',
      year: 2017,
      event: 'Women\'s March',
      whoWasInvolved: 'Tamika Mallory, Carmen Perez, Linda Sarsour, Bob Bland, millions',
      whatHappened: 'Largest single-day protest in US history. 5+ million worldwide. Day after Trump inauguration.',
      whyItMatters: 'Massive coalition presence. Intersectional organizing visible.',
      lessons: ['Scale matters', 'Intersectional leadership', 'Sustained organizing']
    },
    {
      id: 'uhe18',
      year: 2018,
      event: 'Parkland shooting and March for Our Lives',
      whoWasInvolved: 'Emma Gonzalez, David Hogg, Cameron Kasky, Parkland students',
      whatHappened: 'After Parkland shooting, students organized national march for gun reform. Hundreds of thousands attended.',
      whyItMatters: 'Students led national movement on policy.',
      lessons: ['Young people lead', 'Personal experience to organizing', 'Sustained pressure']
    },
    {
      id: 'uhe19',
      year: 2020,
      event: 'George Floyd protests',
      whoWasInvolved: 'BLM, allies, millions globally',
      whatHappened: 'After George Floyd murder by police, global protests for racial justice. Largest protest movement in US history.',
      whyItMatters: 'Bystander video by Darnella Frazier made murder visible globally.',
      lessons: ['Documentation matters', 'Coalition is broader', 'Scale builds power']
    },
    {
      id: 'uhe20',
      year: 2022,
      event: 'Roe v Wade overturned, abortion access',
      whoWasInvolved: 'Reproductive justice movement, allies',
      whatHappened: 'Dobbs decision ended federal abortion protection. Movement responded with state organizing, mutual aid.',
      whyItMatters: 'Losses also require upstander response.',
      lessons: ['Losses are not endings', 'State organizing', 'Mutual aid', 'Adaptation']
    }
  ];

  var UPSTANDER_DAILY_PRACTICES_DEEP = [
    {
      id: 'udpd1',
      timeOfDay: 'Morning',
      practice: 'Intention setting',
      duration: '3 min',
      howTo: [
        'Sit or stand quietly',
        'Think about your day',
        'Identify one moment where you might need to be an upstander',
        'Set intention: "Today I will ___ if ___"',
        'Speak it aloud if able'
      ],
      benefits: 'Pre-decides intervention. Reduces freeze-up.'
    },
    {
      id: 'udpd2',
      timeOfDay: 'Morning',
      practice: 'Affirmation',
      duration: '2 min',
      howTo: [
        'Choose one upstander affirmation',
        'Repeat 3 times aloud or written',
        'Carry it with you in pocket if helpful'
      ],
      benefits: 'Builds identity. Counters self-doubt.'
    },
    {
      id: 'udpd3',
      timeOfDay: 'School day',
      practice: 'Notice and name',
      duration: 'Ongoing',
      howTo: [
        'Throughout day, notice moments of inclusion or exclusion',
        'Note privately or in journal',
        'Pattern recognition over time'
      ],
      benefits: 'Builds noticing muscle. Foundation of intervention.'
    },
    {
      id: 'udpd4',
      timeOfDay: 'School day',
      practice: 'One kind act',
      duration: '5 min',
      howTo: [
        'Identify one peer who could use kindness',
        'Specific act: compliment, sit with, ask about',
        'No expectation of return'
      ],
      benefits: 'Builds connection. Reduces isolation in environment.'
    },
    {
      id: 'udpd5',
      timeOfDay: 'School day',
      practice: 'Stand with',
      duration: 'Variable',
      howTo: [
        'When someone is targeted, position self near them physically',
        'Make eye contact in solidarity',
        'Stay until needed'
      ],
      benefits: 'Presence is powerful. Visible solidarity.'
    },
    {
      id: 'udpd6',
      timeOfDay: 'After school',
      practice: 'Check in',
      duration: '5-15 min',
      howTo: [
        'Reach out to one person who was struggling',
        'Brief, specific, caring',
        'No expectation of long conversation'
      ],
      benefits: 'Builds relationships. Provides support.'
    },
    {
      id: 'udpd7',
      timeOfDay: 'Evening',
      practice: 'Documentation',
      duration: '5 min',
      howTo: [
        'Note any incidents observed',
        'Date, time, who saw, what happened',
        'Save for pattern recognition or escalation'
      ],
      benefits: 'Records create accountability.'
    },
    {
      id: 'udpd8',
      timeOfDay: 'Evening',
      practice: 'Reflection',
      duration: '10 min',
      howTo: [
        'What moments did I act?',
        'What moments did I not?',
        'What do I want to do differently?',
        'How am I feeling?'
      ],
      benefits: 'Learning over time. Sustainable practice.'
    },
    {
      id: 'udpd9',
      timeOfDay: 'Evening',
      practice: 'Self-care',
      duration: '15+ min',
      howTo: [
        'Physical care (rest, food, movement)',
        'Emotional care (process feelings)',
        'Social care (connect with safe people)',
        'Joy care (do something you love)'
      ],
      benefits: 'Sustainable practice requires rest.'
    },
    {
      id: 'udpd10',
      timeOfDay: 'Weekly',
      practice: 'Coalition check-in',
      duration: '30 min',
      howTo: [
        'Connect with one upstander ally',
        'Share what is happening',
        'Discuss strategy',
        'Mutual support'
      ],
      benefits: 'Combats isolation. Builds power.'
    },
    {
      id: 'udpd11',
      timeOfDay: 'Weekly',
      practice: 'Learning',
      duration: '30+ min',
      howTo: [
        'Read one piece by marginalized author',
        'Watch one upstander story',
        'Listen to one podcast about justice',
        'Build understanding over time'
      ],
      benefits: 'Sustains commitment. Builds analysis.'
    },
    {
      id: 'udpd12',
      timeOfDay: 'Monthly',
      practice: 'Personal audit',
      duration: '60 min',
      howTo: [
        'Review your practice',
        'What worked?',
        'What did not?',
        'What patterns emerge?',
        'Adjust commitments'
      ],
      benefits: 'Continuous improvement.'
    },
    {
      id: 'udpd13',
      timeOfDay: 'Monthly',
      practice: 'Mentor connection',
      duration: '30+ min',
      howTo: [
        'Reach out to mentor or model',
        'Share growth',
        'Ask for guidance',
        'Apply their wisdom'
      ],
      benefits: 'Accelerates learning. Sustains motivation.'
    },
    {
      id: 'udpd14',
      timeOfDay: 'Annually',
      practice: 'Big picture review',
      duration: '2+ hours',
      howTo: [
        'Reflect on full year',
        'What change happened?',
        'What did you contribute?',
        'What is next?'
      ],
      benefits: 'Long-arc thinking. Sustains commitment.'
    },
    {
      id: 'udpd15',
      timeOfDay: 'Annually',
      practice: 'Pass it forward',
      duration: 'Variable',
      howTo: [
        'Mentor someone younger',
        'Share your story',
        'Build the next generation of upstanders'
      ],
      benefits: 'Sustains movement. Builds community.'
    }
  ];

  var BYSTANDER_PSYCHOLOGY_DEEP = [
    {
      id: 'bpd1',
      concept: 'Bystander effect',
      origin: 'Latane and Darley (1968) - after Kitty Genovese case',
      explanation: 'When witnesses are present, individuals are less likely to intervene. The more witnesses, the less likely any single one acts.',
      mechanisms: ['Diffusion of responsibility', 'Pluralistic ignorance', 'Social inhibition'],
      counter: 'Awareness alone increases intervention rates. Training specifically increases more.',
      schoolApplication: 'In a hallway with 20 students, intervention is rarer than with 2 students. Awareness reverses this.'
    },
    {
      id: 'bpd2',
      concept: 'Pluralistic ignorance',
      origin: 'Floyd Allport (1924)',
      explanation: 'When everyone seems calm about a situation, individuals doubt their own assessment. "Maybe it is not that bad."',
      mechanisms: ['Reading the room', 'Conformity', 'Self-doubt'],
      counter: 'Trust your gut. If something feels wrong, it probably is. Be the first to act.',
      schoolApplication: 'In a class watching a peer get mocked, students may stay silent because no one else acted. Breaking pluralistic ignorance requires one person.'
    },
    {
      id: 'bpd3',
      concept: 'Diffusion of responsibility',
      origin: 'Bystander effect research',
      explanation: 'When responsibility could fall on anyone, it falls on no one specifically.',
      mechanisms: ['Group dynamics', 'Authority gaps', 'Role ambiguity'],
      counter: 'Make yourself specifically responsible. Identify a specific person to help.',
      schoolApplication: 'Instead of "someone should help", say "I will help" or "you, will you help me?"'
    },
    {
      id: 'bpd4',
      concept: 'Cost-benefit analysis',
      origin: 'Piliavin et al (1969)',
      explanation: 'Witnesses weigh cost of intervention against cost of inaction. High cost reduces intervention.',
      mechanisms: ['Risk assessment', 'Status loss', 'Physical danger'],
      counter: 'Lower-cost intervention options exist. Practice them.',
      schoolApplication: 'Direct confrontation may be high cost. Distraction or delegation is lower.'
    },
    {
      id: 'bpd5',
      concept: 'Social proof',
      origin: 'Solomon Asch (1951)',
      explanation: 'People defer to perceived group consensus, even when it conflicts with their own assessment.',
      mechanisms: ['Conformity pressure', 'Information cascade', 'Authority deference'],
      counter: 'Practice independent assessment. Find one ally before acting publicly.',
      schoolApplication: 'In a group where bullying is happening, social proof tells students not to act. One dissenter breaks the pattern.'
    },
    {
      id: 'bpd6',
      concept: 'Moral disengagement',
      origin: 'Albert Bandura',
      explanation: 'People disengage moral standards through dehumanization, blaming the victim, displacing responsibility, etc.',
      mechanisms: ['Dehumanizing language', 'Victim-blaming', 'Comparing to "worse"'],
      counter: 'Name the moral disengagement. Re-humanize the target. Reject excuses.',
      schoolApplication: 'When students say "they deserve it" or "they are weird anyway", moral disengagement is happening.'
    },
    {
      id: 'bpd7',
      concept: 'Just world hypothesis',
      origin: 'Melvin Lerner',
      explanation: 'People believe the world is fundamentally just, so victims must have done something to deserve their treatment.',
      mechanisms: ['Cognitive dissonance protection', 'System justification', 'Self-protection'],
      counter: 'Recognize this bias in self and others. Disconfirm.',
      schoolApplication: '"They got bullied because they were weird" is just-world thinking. Push back.'
    },
    {
      id: 'bpd8',
      concept: 'In-group favoritism',
      origin: 'Henri Tajfel',
      explanation: 'People favor those they identify as in-group. Out-group members are easier to harm or ignore.',
      mechanisms: ['Identity-based assessment', 'Empathy filtering', 'Resource hoarding'],
      counter: 'Expand your in-group. Bridge across identity.',
      schoolApplication: 'Friend group dynamics create in/out groups. Targets are often out-group.'
    },
    {
      id: 'bpd9',
      concept: 'Compassion fatigue',
      origin: 'Trauma research',
      explanation: 'Sustained exposure to others\' suffering depletes compassion capacity.',
      mechanisms: ['Emotional exhaustion', 'Vicarious trauma', 'Resource depletion'],
      counter: 'Self-care. Rotation with allies. Choose battles. Sustainable practice.',
      schoolApplication: 'Long-term upstander work requires sustainable practice. Burnout reduces effectiveness.'
    },
    {
      id: 'bpd10',
      concept: 'Empathic concern vs personal distress',
      origin: 'Daniel Batson',
      explanation: 'Witnessing harm can produce empathic concern (motivates helping) OR personal distress (motivates escaping).',
      mechanisms: ['Other-oriented vs self-oriented response', 'Emotional regulation', 'Action vs avoidance'],
      counter: 'Build emotional regulation. Convert distress to concern.',
      schoolApplication: 'When you feel sick watching harm, you can choose to convert that to action.'
    }
  ];

  var TRAUMA_INFORMED_UPSTANDER = [
    {
      id: 'tiu1',
      principle: 'Safety',
      forUpstanders: [
        'Establish physical safety before intervention',
        'Build emotional safety for self',
        'Predict escalation patterns',
        'Have exit plans'
      ],
      forTargets: [
        'Believe their safety concerns',
        'Help establish safety',
        'Multiple safe spaces',
        'Trusted adults available'
      ],
      forHarmers: [
        'Address underlying safety needs',
        'Avoid retraumatizing',
        'Predictable consequences',
        'Support systems'
      ]
    },
    {
      id: 'tiu2',
      principle: 'Trustworthiness and transparency',
      forUpstanders: [
        'Build trust through consistency',
        'Be transparent about your role',
        'Follow through on commitments',
        'Honor confidentiality'
      ],
      forTargets: [
        'Be transparent about who knows what',
        'Follow through on promises',
        'Build trust over time',
        'Honor their choices'
      ],
      forHarmers: [
        'Clear expectations',
        'Transparent consequences',
        'Build trust before change',
        'Honor what they share'
      ]
    },
    {
      id: 'tiu3',
      principle: 'Peer support',
      forUpstanders: [
        'Build upstander community',
        'Mutual support',
        'Share strategies',
        'Process together'
      ],
      forTargets: [
        'Connect with peer survivors',
        'Affinity groups',
        'Mentorship',
        'Sustained relationships'
      ],
      forHarmers: [
        'Peer accountability circles',
        'Connection with reformed peers',
        'Build new community',
        'Sustained relationships'
      ]
    },
    {
      id: 'tiu4',
      principle: 'Collaboration and mutuality',
      forUpstanders: [
        'Work with not for',
        'Power-share',
        'Center most impacted',
        'Listen first'
      ],
      forTargets: [
        'Center their voice',
        'Their priorities lead',
        'Co-create plans',
        'Honor self-determination'
      ],
      forHarmers: [
        'Engage them in change',
        'Co-create accountability',
        'Honor their humanity',
        'Build agency'
      ]
    },
    {
      id: 'tiu5',
      principle: 'Empowerment, voice, choice',
      forUpstanders: [
        'Build your own agency',
        'Use your voice',
        'Make choices that fit you',
        'Resist coercion'
      ],
      forTargets: [
        'Restore agency',
        'Honor their choices',
        'Build voice',
        'Resist re-victimization'
      ],
      forHarmers: [
        'Build accountable agency',
        'Real choices',
        'Voice in repair',
        'Path forward'
      ]
    },
    {
      id: 'tiu6',
      principle: 'Cultural, historical, gender consideration',
      forUpstanders: [
        'Examine your privilege',
        'Build cross-identity coalition',
        'Honor cultural context',
        'Address historical harms'
      ],
      forTargets: [
        'Honor identity context',
        'Address historical harms',
        'Cultural competence',
        'Identity-affirming support'
      ],
      forHarmers: [
        'Cultural context',
        'Historical patterns',
        'Identity-aware accountability',
        'Build identity skills'
      ]
    }
  ];

  var SCAFFOLDED_UPSTANDER_PRACTICE = [
    {
      id: 'sup1',
      skill: 'Noticing harm',
      tiers: {
        warmup: [
          { task: 'Watch a video clip of bullying. Identify 3 things happening.', evidence: 'Listed the events' },
          { task: 'Replay a moment from your own week. What did you see?', evidence: 'Memory exercised' },
          { task: 'Read a short story about bullying. Identify the dynamics.', evidence: 'Analysis practiced' }
        ],
        practice: [
          { task: 'Each day, note one moment of social tension you observed.', evidence: '1 observation per day' },
          { task: 'In group chat, note when conversation turns critical of someone.', evidence: 'Pattern noted' },
          { task: 'Notice exclusion in real time.', evidence: 'Real-time awareness' }
        ],
        mastery: [
          { task: 'Notice patterns over time. Same students targeted? Same dynamics?', evidence: 'Pattern recognition' },
          { task: 'Identify root causes of patterns.', evidence: 'Systemic analysis' },
          { task: 'Use noticing to inform intervention strategy.', evidence: 'Strategic action' }
        ]
      }
    },
    {
      id: 'sup2',
      skill: 'Quick verbal intervention',
      tiers: {
        warmup: [
          { task: 'Practice saying "Stop" or "Not okay" in mirror.', evidence: 'Said words aloud' },
          { task: 'Role-play with a friend. Practice quick responses.', evidence: 'Practice happened' },
          { task: 'Memorize 3 stock phrases.', evidence: 'Have phrases ready' }
        ],
        practice: [
          { task: 'Use one phrase in low-stakes situation this week.', evidence: 'Used it' },
          { task: 'Notice when you almost used a phrase but did not. Try next time.', evidence: 'Missed opportunity noted' },
          { task: 'Build to using a phrase weekly.', evidence: 'Weekly practice' }
        ],
        mastery: [
          { task: 'Use the right phrase for the right moment.', evidence: 'Discernment' },
          { task: 'Use intervention without preparation.', evidence: 'Automaticity' },
          { task: 'Teach others these phrases.', evidence: 'Mentor others' }
        ]
      }
    },
    {
      id: 'sup3',
      skill: 'Supporting targets after harm',
      tiers: {
        warmup: [
          { task: 'Practice supportive opener: "I noticed what happened. Are you okay?"', evidence: 'Memorized opener' },
          { task: 'Practice listening without trying to fix.', evidence: 'Listening practice' },
          { task: 'Learn what targets typically need.', evidence: 'Knowledge built' }
        ],
        practice: [
          { task: 'Reach out to one target this week.', evidence: 'Reached out' },
          { task: 'Listen without solving.', evidence: 'Listened' },
          { task: 'Follow up next day.', evidence: 'Followed up' }
        ],
        mastery: [
          { task: 'Maintain ongoing support over time.', evidence: 'Sustained support' },
          { task: 'Connect targets with resources without forcing.', evidence: 'Resource sharing' },
          { task: 'Build community of support.', evidence: 'Community building' }
        ]
      }
    },
    {
      id: 'sup4',
      skill: 'Confronting friends',
      tiers: {
        warmup: [
          { task: 'Identify one moment you wish you had spoken up to a friend.', evidence: 'Honest reflection' },
          { task: 'Draft what you would say.', evidence: 'Words on paper' },
          { task: 'Practice with another friend.', evidence: 'Practice happened' }
        ],
        practice: [
          { task: 'Have one private conversation with a friend about hurtful behavior.', evidence: 'Conversation had' },
          { task: 'Use specific examples and impact statements.', evidence: 'Concrete' },
          { task: 'Listen to their response.', evidence: 'Listened' }
        ],
        mastery: [
          { task: 'Hold the line when friend pushes back.', evidence: 'Hold ground' },
          { task: 'Accept friendship loss if needed.', evidence: 'Values over comfort' },
          { task: 'Confront proactively, not just reactively.', evidence: 'Anticipation' }
        ]
      }
    },
    {
      id: 'sup5',
      skill: 'Documenting incidents',
      tiers: {
        warmup: [
          { task: 'Learn the components: date, time, who saw, what happened.', evidence: 'Knows format' },
          { task: 'Document a past incident as practice.', evidence: 'One document' },
          { task: 'Set up your logging system.', evidence: 'System exists' }
        ],
        practice: [
          { task: 'Document incidents within 24 hours.', evidence: 'Timely' },
          { task: 'Maintain log over time.', evidence: 'Habit built' },
          { task: 'Use log for escalation.', evidence: 'Used for action' }
        ],
        mastery: [
          { task: 'Documentation becomes routine.', evidence: 'Automatic' },
          { task: 'Use documentation to support targets.', evidence: 'Service' },
          { task: 'Teach others to document.', evidence: 'Mentor' }
        ]
      }
    },
    {
      id: 'sup6',
      skill: 'Reporting to adults',
      tiers: {
        warmup: [
          { task: 'Identify 3 trusted adults at school.', evidence: 'List exists' },
          { task: 'Draft a brief report.', evidence: 'Words on paper' },
          { task: 'Role-play the conversation.', evidence: 'Practice happened' }
        ],
        practice: [
          { task: 'Make one report this month.', evidence: 'Reported' },
          { task: 'Follow up on the report.', evidence: 'Followed up' },
          { task: 'Document the response.', evidence: 'Tracked outcomes' }
        ],
        mastery: [
          { task: 'Escalate when needed.', evidence: 'Knows the chain' },
          { task: 'Help others make reports.', evidence: 'Coaching' },
          { task: 'Build relationships with adults.', evidence: 'Trust built' }
        ]
      }
    },
    {
      id: 'sup7',
      skill: 'Sustained advocacy',
      tiers: {
        warmup: [
          { task: 'Identify one issue you care about.', evidence: 'Issue named' },
          { task: 'Find 2-3 allies.', evidence: 'Allies identified' },
          { task: 'Plan one action.', evidence: 'Plan exists' }
        ],
        practice: [
          { task: 'Execute one action.', evidence: 'Done' },
          { task: 'Reflect and adjust.', evidence: 'Learning happened' },
          { task: 'Plan next action.', evidence: 'Forward motion' }
        ],
        mastery: [
          { task: 'Sustain over months.', evidence: 'Persistence' },
          { task: 'Build new leaders.', evidence: 'Movement growing' },
          { task: 'Institutionalize change.', evidence: 'Systemic impact' }
        ]
      }
    }
  ];

  var GROUP_DISCUSSION_GUIDES = [
    {
      id: 'gdg1',
      topic: 'When have you been a bystander?',
      duration: '45 min',
      groupSize: '6-12',
      structure: [
        { phase: 'Opening', time: 5, prompts: ['Welcome', 'Brief group agreements', 'Names + one feeling word'] },
        { phase: 'Stories', time: 25, prompts: ['Share a time you were a bystander', 'No judgment, just reflection', 'Honor each voice'] },
        { phase: 'Patterns', time: 10, prompts: ['What patterns do you notice?', 'What stops bystanders?'] },
        { phase: 'Closing', time: 5, prompts: ['One thing you take away'] }
      ],
      facilitatorNotes: 'No shame. Everyone has been a bystander. This is honest reflection.'
    },
    {
      id: 'gdg2',
      topic: 'When have you been an upstander?',
      duration: '45 min',
      groupSize: '6-12',
      structure: [
        { phase: 'Opening', time: 5, prompts: ['Welcome', 'Names + one feeling word'] },
        { phase: 'Stories', time: 25, prompts: ['Share a time you intervened', 'What worked?', 'What did you learn?'] },
        { phase: 'Patterns', time: 10, prompts: ['What makes intervention possible?', 'What sustains it?'] },
        { phase: 'Closing', time: 5, prompts: ['One commitment for next time'] }
      ],
      facilitatorNotes: 'Celebrate the courage. Build models.'
    },
    {
      id: 'gdg3',
      topic: 'When have you been the target?',
      duration: '60 min',
      groupSize: '6-12 (with sensitivity)',
      structure: [
        { phase: 'Opening', time: 10, prompts: ['Welcome', 'Strong group agreements about confidentiality', 'Care for self during conversation'] },
        { phase: 'Sharing', time: 30, prompts: ['Share if you want to', 'Listen if you do not', 'No interruption'] },
        { phase: 'Needs', time: 15, prompts: ['What did you need from witnesses?', 'What helped?', 'What did not?'] },
        { phase: 'Closing', time: 5, prompts: ['One support that would help right now'] }
      ],
      facilitatorNotes: 'Most sensitive topic. Have backup support available. Honor the sharing.'
    },
    {
      id: 'gdg4',
      topic: 'When have you been the harmer?',
      duration: '60 min',
      groupSize: '6-12 (with sensitivity)',
      structure: [
        { phase: 'Opening', time: 10, prompts: ['Welcome', 'Strong agreements', 'No judgment, just reflection'] },
        { phase: 'Sharing', time: 30, prompts: ['Share if comfortable', 'Take responsibility', 'No excuses'] },
        { phase: 'Patterns', time: 15, prompts: ['What were you needing?', 'What hurt you that led to harming others?'] },
        { phase: 'Closing', time: 5, prompts: ['One step toward repair'] }
      ],
      facilitatorNotes: 'Hold accountability AND compassion. Hurt people hurt people.'
    },
    {
      id: 'gdg5',
      topic: 'Identity and bullying',
      duration: '60 min',
      groupSize: '6-12',
      structure: [
        { phase: 'Opening', time: 10, prompts: ['Welcome', 'How does identity affect bullying?'] },
        { phase: 'Mini-lesson', time: 15, prompts: ['Intersectional analysis', 'Different impacts'] },
        { phase: 'Stories', time: 25, prompts: ['Identity-based experiences', 'What helped or hurt'] },
        { phase: 'Closing', time: 10, prompts: ['One way to be an ally across identity'] }
      ],
      facilitatorNotes: 'Center marginalized voices. Watch power dynamics.'
    },
    {
      id: 'gdg6',
      topic: 'Restorative vs punitive',
      duration: '60 min',
      groupSize: '6-12',
      structure: [
        { phase: 'Opening', time: 10, prompts: ['Welcome', 'What is the goal of accountability?'] },
        { phase: 'Mini-lesson', time: 15, prompts: ['Restorative principles', 'Punitive results'] },
        { phase: 'Application', time: 25, prompts: ['Apply to a specific case', 'What would restorative response look like?'] },
        { phase: 'Closing', time: 10, prompts: ['One restorative practice you commit to'] }
      ],
      facilitatorNotes: 'Connect to real cases. Move from theory to practice.'
    },
    {
      id: 'gdg7',
      topic: 'Coalition building',
      duration: '60 min',
      groupSize: '6-12',
      structure: [
        { phase: 'Opening', time: 10, prompts: ['Welcome', 'What change do you want?'] },
        { phase: 'Strategy', time: 25, prompts: ['Build coalition', 'Identify allies', 'Plan steps'] },
        { phase: 'Practice', time: 15, prompts: ['Role-play recruitment conversations'] },
        { phase: 'Closing', time: 10, prompts: ['One action this week'] }
      ],
      facilitatorNotes: 'Build practical skills.'
    },
    {
      id: 'gdg8',
      topic: 'Self-care for upstanders',
      duration: '45 min',
      groupSize: '6-12',
      structure: [
        { phase: 'Opening', time: 5, prompts: ['Welcome', 'How are you feeling?'] },
        { phase: 'Discussion', time: 25, prompts: ['What is hard about upstander work?', 'What sustains you?'] },
        { phase: 'Practice', time: 10, prompts: ['Build personal self-care plan'] },
        { phase: 'Closing', time: 5, prompts: ['Commit to one self-care practice'] }
      ],
      facilitatorNotes: 'Self-care is political. Honor sustainability.'
    }
  ];

  var DETAILED_SCENARIO_LIBRARY = [
    {
      id: 'dsl1',
      title: 'The substitute teacher who used a slur',
      narrative: [
        'Substitute teacher walked into 5th period English. Within 10 minutes, she said something racist to a Black student.',
        '',
        'I sat there. So did the other 27 students.',
        '',
        'After class I went up to the Black student. I said: "I heard what she said. I am sorry."',
        '',
        'He said: "Thanks. I have been hearing it all day."',
        '',
        'I went to the principal\'s office after school. I told her exactly what I had heard. She thanked me.',
        '',
        'The substitute was not invited back.',
        '',
        'The next day in English, I noticed the regular teacher had been told. She acknowledged what had happened to the class and apologized that we had been in that environment.',
        '',
        'What I learned: My voice matters even when I sat there in the moment. Going to the principal mattered. The student who was targeted needed to know someone had heard. The follow-up matters more than the in-moment response sometimes.'
      ]
    },
    {
      id: 'dsl2',
      title: 'When my best friend was the bully',
      narrative: [
        'My best friend Alex had been mocking another kid for months. I had been participating sometimes. Other times silently.',
        '',
        'One day the targeted kid did not come to school. He had attempted suicide.',
        '',
        'I felt sick.',
        '',
        'I confronted Alex. He said: "It is not my fault. He is just dramatic."',
        '',
        'I said: "What we have been doing has been wrong. I am stopping. I want you to stop too."',
        '',
        'Alex said no.',
        '',
        'I lost my best friend.',
        '',
        'I visited the targeted kid in the hospital. I apologized. I told him I had been part of why he had been hurting.',
        '',
        'He cried. He thanked me.',
        '',
        'I was 16. Alex and I never spoke again.',
        '',
        'I tell people: the cost of doing the right thing is real. The cost of not doing it is much higher.'
      ]
    },
    {
      id: 'dsl3',
      title: 'When my teacher believed me',
      narrative: [
        'I had been getting bullied in 6th grade. I had told my mom. She had told the principal. Nothing had changed.',
        '',
        'I tried one teacher. Mrs. Reed. I told her what had been happening.',
        '',
        'She took out a notebook. She asked me to tell her every incident I could remember. Specifically: date, time, who saw, what happened.',
        '',
        'I told her for an hour. She wrote it all down.',
        '',
        'She told me she would handle it. She told me I had been brave to come to her.',
        '',
        'Two weeks later the bullying stopped.',
        '',
        'I never knew exactly what Mrs. Reed did. But I knew she had taken me seriously.',
        '',
        'I tell adults: when a student tells you, take out a notebook. Write it down. Take it seriously. Do something.'
      ]
    },
    {
      id: 'dsl4',
      title: 'The peer who saved me',
      narrative: [
        'In 8th grade I was new. I had been getting mocked for my accent. I had been eating alone.',
        '',
        'On Day 9 a kid named Marcus walked over and sat down at my table. He did not ask permission. He did not make a thing of it.',
        '',
        'He pulled out his lunch. He started eating.',
        '',
        'After a while he asked me what I was reading.',
        '',
        'I told him. He had read the same book.',
        '',
        'Marcus sat with me for the rest of 8th grade. He did not ask why I had been alone before. He just decided I was not going to be alone anymore.',
        '',
        'The mocking stopped within two weeks of Marcus sitting with me. He had social power I did not understand. He had decided to use it for me.',
        '',
        'I tell students: presence is a language. You do not have to say anything. Just sit down.'
      ]
    },
    {
      id: 'dsl5',
      title: 'When I called out my coach',
      narrative: [
        'My basketball coach had been screaming at one of my teammates for weeks. He had targeted her specifically.',
        '',
        'I had not said anything. I was on the team. Coach\'s favor mattered.',
        '',
        'One day after practice I asked her if she was okay. She was not.',
        '',
        'I went to the athletic director. I told him exactly what I had observed. I named specific incidents. I named dates.',
        '',
        'He talked to the coach. The coach denied it. The coach screamed at me publicly next practice.',
        '',
        'I quit the team. I did not regret it.',
        '',
        'Three other players quit within the next month.',
        '',
        'The coach was let go at the end of the season.',
        '',
        'I learned to play other sports.',
        '',
        'I tell people: sometimes the cost of speaking up is the activity itself. That is a real cost. It is also a worthwhile one.'
      ]
    },
    {
      id: 'dsl6',
      title: 'The text I sent that changed someone',
      narrative: [
        'I noticed a classmate had stopped posting on social media. They had been active before. Suddenly silent.',
        '',
        'I sent them a text: "Hi. I have noticed you have been quiet on social. Just wanted to check in. No pressure to respond."',
        '',
        'They responded an hour later: "Thanks for asking. I have been struggling."',
        '',
        'We had a long conversation. They told me what was going on. I listened.',
        '',
        'I asked if they had told an adult. They had not. I told them I would help them tell.',
        '',
        'The next day we went together to the school counselor.',
        '',
        'My classmate got the help they needed.',
        '',
        'Years later they told me my text had been the first thing that made them feel seen in months.',
        '',
        'I tell students: a single text matters. You do not have to fix everything. You just have to notice.'
      ]
    },
    {
      id: 'dsl7',
      title: 'When the school did not believe me',
      narrative: [
        'I reported a teacher who was harassing me. The principal said: "He is well-loved. Are you sure?"',
        '',
        'I was sure. I had documentation.',
        '',
        'The school did not act.',
        '',
        'I escalated to the district. They said: "Talk to the principal."',
        '',
        'I escalated to the state. They opened an investigation.',
        '',
        'The teacher was let go.',
        '',
        'The principal was reprimanded.',
        '',
        'I tell people: when the system does not believe you, document and escalate. There is always a next level.'
      ]
    },
    {
      id: 'dsl8',
      title: 'When I was the bully',
      narrative: [
        'In 7th grade I was mean. I joined in on mockery. I spread rumors. I was popular partly because I was mean.',
        '',
        'In 9th grade I started noticing. I was not happy. I had no real friends. The friend group I was in was full of meanness too.',
        '',
        'I started apologizing. To everyone I had hurt. One at a time.',
        '',
        'Some forgave me. Some did not.',
        '',
        'I left my friend group. I built a new one with kinder people.',
        '',
        'I am 25 now. I run an anti-bullying program at the middle school I went to.',
        '',
        'I tell former bullies: you can change. The work is real. The repair is real. The future is yours.',
        '',
        'I tell young people: I was a bully because I was hurt. Some of the kids hurting you are hurt too. That does not excuse them. But it explains them.'
      ]
    },
    {
      id: 'dsl9',
      title: 'The school that transformed',
      narrative: [
        'My school had been bad. Bullying was constant. Suspensions were daily.',
        '',
        'In 9th grade a new principal arrived. She introduced restorative practices. Class circles. Conflict mediation.',
        '',
        'At first we made fun of it. Adults in circles asking us how we feel.',
        '',
        'But by mid-year something shifted. Conflicts that used to escalate started getting resolved. Suspensions dropped. Climate improved.',
        '',
        'By 11th grade my school felt different. People were kinder. Conflicts were repaired.',
        '',
        'I tell people: schools can change. It takes leadership. It takes years. It is possible.'
      ]
    },
    {
      id: 'dsl10',
      title: 'My ongoing upstander practice',
      narrative: [
        'I am 28 now. I have been practicing upstander work since middle school.',
        '',
        'My practice is mostly small. I notice when someone is being excluded at work. I check in. I refuse to engage in gossip. I speak up in meetings when I notice harm.',
        '',
        'My practice is sometimes big. I report misconduct. I support coworkers in their reports. I organize.',
        '',
        'My practice is ongoing. I have not gotten it right every time. I have apologized many times.',
        '',
        'My practice has shaped my life. The friends I have. The work I do. The way I show up.',
        '',
        'I tell young people: this is a practice. It does not end at graduation. You will continue to face moments. You will continue to grow.'
      ]
    }
  ];

  var UPSTANDER_CULTURE_INDICATORS = [
    {
      id: 'uci1',
      indicator: 'Inclusive language',
      whatItLooksLike: [
        'Students avoid slurs',
        'Identity-first / person-first respected',
        'Pronouns used correctly',
        'Diverse names pronounced correctly'
      ],
      howToBuild: [
        'Direct teaching',
        'Model from adults',
        'Build into class agreements',
        'Address slips quickly'
      ],
      warningSignsOfErosion: [
        'Slurs returning',
        'Mocking accents',
        'Refusing pronoun corrections',
        'Mispronouncing names deliberately'
      ]
    },
    {
      id: 'uci2',
      indicator: 'Peer support during hard moments',
      whatItLooksLike: [
        'Students sit with someone alone',
        'Quick supportive responses to distress',
        'Sharing notes when sick',
        'Defending each other'
      ],
      howToBuild: [
        'Model peer support',
        'Build small acts into routine',
        'Recognize peer support',
        'Create structure (buddy systems)'
      ],
      warningSignsOfErosion: [
        'Isolation tolerated',
        'Distress dismissed',
        'Bystanders\' default'
      ]
    },
    {
      id: 'uci3',
      indicator: 'Restorative response to harm',
      whatItLooksLike: [
        'Apologies are real',
        'Repair is concrete',
        'Communities rebuild after conflicts',
        'Adults model repair'
      ],
      howToBuild: [
        'Train staff in restorative',
        'Replace punitive with restorative',
        'Make repair concrete',
        'Celebrate repaired relationships'
      ],
      warningSignsOfErosion: [
        'Punitive default returns',
        'Apologies become formulaic',
        'Communities fracture',
        'Adults stop modeling'
      ]
    },
    {
      id: 'uci4',
      indicator: 'Student voice in policy',
      whatItLooksLike: [
        'Students consulted on policy',
        'Student government has real power',
        'Affinity groups are heard',
        'Students help train staff'
      ],
      howToBuild: [
        'Create real student power structures',
        'Listen actively',
        'Implement student ideas',
        'Recognize student leaders'
      ],
      warningSignsOfErosion: [
        'Student government as window dressing',
        'Student feedback ignored',
        'Affinity groups defunded',
        'Adult-only spaces'
      ]
    },
    {
      id: 'uci5',
      indicator: 'Adult upstander modeling',
      whatItLooksLike: [
        'Adults intervene in harm',
        'Adults apologize when wrong',
        'Adults engage with diverse families',
        'Adults push for systemic change'
      ],
      howToBuild: [
        'Adult restorative practice',
        'Modeling apology',
        'Engaging in own learning',
        'Coalition-building among adults'
      ],
      warningSignsOfErosion: [
        'Adult silence in face of harm',
        'Refusal to apologize',
        'Defensive responses to feedback',
        'Closed adult culture'
      ]
    },
    {
      id: 'uci6',
      indicator: 'Visible diversity',
      whatItLooksLike: [
        'Diverse families in school events',
        'Diverse curriculum',
        'Diverse staff',
        'Multilingual signage'
      ],
      howToBuild: [
        'Hire diversely',
        'Implement diverse curriculum',
        'Engage diverse families',
        'Welcome multilingual community'
      ],
      warningSignsOfErosion: [
        'White-dominant spaces',
        'Curriculum centers one culture',
        'Monolingual rigidity',
        'Diverse families excluded'
      ]
    },
    {
      id: 'uci7',
      indicator: 'Trauma-informed approach',
      whatItLooksLike: [
        'Soft sensory environments',
        'Patient adults',
        'Trauma-informed discipline',
        'Mental health resources'
      ],
      howToBuild: [
        'Train all staff in trauma',
        'Soften sensory environments',
        'Replace harsh discipline',
        'Invest in mental health'
      ],
      warningSignsOfErosion: [
        'Loud alarms back',
        'Harsh discipline',
        'Trauma denial',
        'Mental health underfunded'
      ]
    },
    {
      id: 'uci8',
      indicator: 'Strong family-school partnership',
      whatItLooksLike: [
        'Multiple communication channels',
        'Families heard at school events',
        'Multilingual communication',
        'Families help shape decisions'
      ],
      howToBuild: [
        'Open communication',
        'Listen to families',
        'Translate materials',
        'Include families in decisions'
      ],
      warningSignsOfErosion: [
        'One-way communication',
        'Defensive responses to families',
        'English-only communication',
        'Families excluded from decisions'
      ]
    }
  ];

  var COMMON_BARRIERS_TO_INTERVENTION = [
    {
      id: 'cbi1',
      barrier: 'Fear of being targeted next',
      whyItExists: 'Realistic risk. Bullies often target those who challenge them.',
      howToOvercome: [
        'Build coalition before intervening',
        'Use indirect intervention',
        'Document for adult escalation',
        'Take care of self before and after'
      ],
      whenToHonor: 'Fear is valid. Honor your own safety.'
    },
    {
      id: 'cbi2',
      barrier: 'Diffusion of responsibility',
      whyItExists: 'Bystander effect. Brain reasons that someone else will help.',
      howToOvercome: [
        'Decide in advance you are the someone',
        'Practice intervening',
        'Build muscle memory',
        'Specifically address it'
      ],
      whenToHonor: 'Multiple bystanders may be a sign you can be the one. Or you can recruit one.'
    },
    {
      id: 'cbi3',
      barrier: 'Social cost',
      whyItExists: 'Friends may not understand or support intervention.',
      howToOvercome: [
        'Find your upstander tribe',
        'Build values-aligned friend group',
        'Tolerate temporary disapproval',
        'Trust long-term outcomes'
      ],
      whenToHonor: 'Friend feedback can be data. Listen, but do not always defer.'
    },
    {
      id: 'cbi4',
      barrier: 'Uncertainty about the right move',
      whyItExists: 'Real ambiguity exists. Not every situation is clear.',
      howToOvercome: [
        'Default to lowest-risk action',
        'Ask trusted adults for help',
        'Use decision trees',
        'Take time to think when possible'
      ],
      whenToHonor: 'Pausing to think is often wisdom.'
    },
    {
      id: 'cbi5',
      barrier: 'Not wanting to make it worse',
      whyItExists: 'Sometimes intervention does escalate.',
      howToOvercome: [
        'Choose low-risk interventions first',
        'Plan for follow-up support',
        'Consult with target if possible',
        'Plan for after'
      ],
      whenToHonor: 'Strategy matters. Bad intervention can make it worse.'
    },
    {
      id: 'cbi6',
      barrier: 'Adult inaction in past',
      whyItExists: 'Many students have learned adults will not help.',
      howToOvercome: [
        'Find specific adults who will help',
        'Escalate as needed',
        'Build trust over time',
        'Combine adult and peer responses'
      ],
      whenToHonor: 'Past patterns inform current. Some adults will not help. Find ones who will.'
    },
    {
      id: 'cbi7',
      barrier: 'Compassion fatigue',
      whyItExists: 'Upstander work is tiring. Cannot be on all the time.',
      howToOvercome: [
        'Build sustainable practices',
        'Take care of self',
        'Rotate with allies',
        'Choose battles wisely'
      ],
      whenToHonor: 'Rest is required. Compassion fatigue is real.'
    },
    {
      id: 'cbi8',
      barrier: 'Internal self-doubt',
      whyItExists: 'Cultural messages tell us our voice does not matter.',
      howToOvercome: [
        'Affirmations',
        'Build evidence of your impact',
        'Connect with mentors',
        'Therapy if patterns persist'
      ],
      whenToHonor: 'Some self-doubt is wisdom. Most is conditioning.'
    }
  ];

  var EXTENDED_BYSTANDER_SCENARIOS_PART2 = [
    {
      id: 'bse11',
      title: 'Sports team hazing',
      setup: 'Older players on your sports team are doing humiliating things to new freshmen as "initiation." You are a junior.',
      whatYouFeel: 'Conflicted. You went through it. Want to belong with older players.',
      whatYourBrainTellsYou: 'It is just tradition. They will survive.',
      whatIsActuallyHappening: 'Hazing is harm. Tradition does not make it acceptable.',
      lowRiskMoves: [
        'Refuse to personally participate',
        'Check in with freshmen privately',
        'Tell coach what you saw'
      ],
      mediumRiskMoves: [
        'Talk to older players: "Lets not do this"',
        'Help freshmen leave the situation',
        'Tell athletic director'
      ],
      highRiskMoves: [
        'Publicly refuse to participate in front of team',
        'Lead reform of team culture',
        'Take it to school administration'
      ],
      afterCare: [
        'Continue checking on freshmen',
        'Build new team culture',
        'Process your own complicity'
      ]
    },
    {
      id: 'bse12',
      title: 'A teacher belittles a struggling student',
      setup: 'A teacher publicly mocks a student\'s wrong answer. The student is visibly upset. Class is silent.',
      whatYouFeel: 'Frozen. Embarrassed for student. Afraid to disagree with teacher.',
      whatYourBrainTellsYou: 'Teacher knows best. Cannot interfere.',
      whatIsActuallyHappening: 'Adult abusing power. Student humiliated. Class learning fear.',
      lowRiskMoves: [
        'Catch student\'s eye in solidarity',
        'Volunteer next answer to deflect',
        'Talk to student after class'
      ],
      mediumRiskMoves: [
        'Tell counselor',
        'Tell parent of targeted student',
        'Document pattern if it repeats'
      ],
      highRiskMoves: [
        'File formal complaint',
        'Help student\'s family report',
        'Organize peer letter'
      ],
      afterCare: [
        'Build relationship with student',
        'Protect them in future class interactions',
        'Process your own fear of authority'
      ]
    },
    {
      id: 'bse13',
      title: 'A student is being mocked for not having lunch money',
      setup: 'Friends are mocking a classmate for asking the lunch lady about free lunch options.',
      whatYouFeel: 'Sick. Want to defend them.',
      whatYourBrainTellsYou: 'Not my place. Maybe they will not notice.',
      whatIsActuallyHappening: 'Class-based shaming. Classmate likely heard.',
      lowRiskMoves: [
        'Walk over and sit with the classmate',
        'Strike up unrelated conversation',
        'Buy them lunch next time'
      ],
      mediumRiskMoves: [
        'Tell friends privately: "Knock it off"',
        'Apologize to classmate',
        'Advocate for universal free lunch'
      ],
      highRiskMoves: [
        'Call out friends in real time',
        'Push school to address class-based mockery',
        'Organize for systemic policy change'
      ],
      afterCare: [
        'Build friendship with the classmate',
        'Reset group norms',
        'Process your own privilege'
      ]
    },
    {
      id: 'bse14',
      title: 'Anti-Muslim comment after news event',
      setup: 'After a news event involving violence, a peer makes an anti-Muslim comment in a casual conversation. A Muslim classmate is in the group.',
      whatYouFeel: 'Sick. Want to defend the classmate.',
      whatYourBrainTellsYou: 'They might not mean it. Topic is sensitive.',
      whatIsActuallyHappening: 'Anti-Muslim harassment. Muslim classmate heard. Conversation legitimizes prejudice.',
      lowRiskMoves: [
        'Change the subject',
        'Apologize to Muslim classmate privately',
        'Tell speaker privately their comment was anti-Muslim'
      ],
      mediumRiskMoves: [
        'In group: "That comment is anti-Muslim. Lets not say things like that."',
        'Talk to multiple peers about the moment',
        'Connect with Muslim student organization'
      ],
      highRiskMoves: [
        'Report to administration',
        'Push for cultural competency training',
        'Build interfaith student alliance'
      ],
      afterCare: [
        'Continue checking in with Muslim classmate',
        'Educate self on Islamophobia',
        'Stand visibly as ally'
      ]
    },
    {
      id: 'bse15',
      title: 'Asexual classmate being mocked',
      setup: 'A classmate has come out as asexual. Other students are mocking, including making sexual jokes at their expense.',
      whatYouFeel: 'Want to defend them.',
      whatYourBrainTellsYou: 'Not sure if I have authority since I am not asexual.',
      whatIsActuallyHappening: 'Identity-based harassment. Classmate is being violated for sharing identity.',
      lowRiskMoves: [
        'Privately tell classmate: "I am sorry that is happening. I think you are valid."',
        'Refuse to laugh at jokes',
        'Tell adults what you observed'
      ],
      mediumRiskMoves: [
        'In group: "Stop. That is not okay."',
        'Educate peers about asexuality',
        'Connect classmate with LGBTQ student org'
      ],
      highRiskMoves: [
        'Report to administration as harassment',
        'Help organize ace+ awareness day',
        'Advocate for LGBTQ inclusive curriculum'
      ],
      afterCare: [
        'Stand visibly with classmate',
        'Continue education',
        'Push for inclusive culture'
      ]
    },
    {
      id: 'bse16',
      title: 'Adoptee being teased about birth family',
      setup: 'A classmate who was adopted is being teased about their birth family by other students.',
      whatYouFeel: 'Worried for the classmate.',
      whatYourBrainTellsYou: 'They will get over it. Maybe they think it is funny.',
      whatIsActuallyHappening: 'Teasing about family structure. Classmate may be hurt even if they laugh.',
      lowRiskMoves: [
        'Privately ask classmate how they are',
        'Change the subject',
        'Tell other students directly: "Stop"'
      ],
      mediumRiskMoves: [
        'Talk to teasing students about adoption',
        'Connect adoptee with adoption-affirming community',
        'Tell counselor'
      ],
      highRiskMoves: [
        'Educate peers about adoption',
        'Push for inclusive family curriculum',
        'Help organize Family Diversity programming'
      ],
      afterCare: [
        'Continue check-ins',
        'Stand visibly with adoptee',
        'Learn about adoption'
      ]
    },
    {
      id: 'bse17',
      title: 'Foster kid being teased',
      setup: 'Word has gotten around that a classmate is in foster care. Other students are asking invasive questions and making mean comments.',
      whatYouFeel: 'Protective.',
      whatYourBrainTellsYou: 'I should not make it a thing.',
      whatIsActuallyHappening: 'Privacy violation. Classmate stigmatized. Identity-based harm.',
      lowRiskMoves: [
        'Privately tell classmate you are thinking of them',
        'Refuse to engage in invasive conversations',
        'Tell counselor'
      ],
      mediumRiskMoves: [
        'Direct: "Stop asking about that."',
        'Build friendship with foster classmate',
        'Tell counselor and advocate for protection'
      ],
      highRiskMoves: [
        'Push school to protect foster student privacy',
        'Educate peers',
        'Advocate for foster youth support'
      ],
      afterCare: [
        'Continue check-ins',
        'Be patient',
        'Learn about foster care system'
      ]
    },
    {
      id: 'bse18',
      title: 'Speech impediment mocking',
      setup: 'A classmate stutters. Other students are mimicking the stutter and laughing.',
      whatYouFeel: 'Anger. Want to defend.',
      whatYourBrainTellsYou: 'Maybe they will stop.',
      whatIsActuallyHappening: 'Mocking disability. Classmate likely heard. Other students learning.',
      lowRiskMoves: [
        'Approach classmate and start conversation',
        'Tell mockers privately: "Stop"',
        'Tell teacher'
      ],
      mediumRiskMoves: [
        'In moment: "Stop. That is mocking disability."',
        'Connect classmate with SLP or community',
        'Tell counselor and advocate for disability awareness'
      ],
      highRiskMoves: [
        'Report to administration',
        'Push for disability education',
        'Help organize Disability Pride event'
      ],
      afterCare: [
        'Build friendship with classmate',
        'Continue education',
        'Stand visibly'
      ]
    },
    {
      id: 'bse19',
      title: 'Religious clothing mocking',
      setup: 'A Sikh classmate wears a turban. Other students are imitating wrapping their heads with t-shirts.',
      whatYouFeel: 'Sick. Embarrassed for them.',
      whatYourBrainTellsYou: 'They are just being silly.',
      whatIsActuallyHappening: 'Religious mockery. Classmate has likely seen. Connecting harm to identity.',
      lowRiskMoves: [
        'Approach classmate and start conversation',
        'Tell mockers privately: "That is religious mockery"',
        'Tell teacher'
      ],
      mediumRiskMoves: [
        'Educate mockers about Sikhism',
        'Connect classmate with religious community',
        'Tell administration'
      ],
      highRiskMoves: [
        'Push for religious diversity programming',
        'Build interfaith student council',
        'Push for stronger protections'
      ],
      afterCare: [
        'Continue check-ins',
        'Educate self',
        'Stand visibly'
      ]
    },
    {
      id: 'bse20',
      title: 'Gay classmate being deadnamed',
      setup: 'A teacher repeatedly uses the wrong name for a trans classmate who has come out and asked for their new name.',
      whatYouFeel: 'Sick. Want to do something.',
      whatYourBrainTellsYou: 'Maybe the teacher will get it eventually.',
      whatIsActuallyHappening: 'Misgendering by authority figure. Other students normalizing.',
      lowRiskMoves: [
        'Use correct name consistently yourself',
        'Privately ask classmate how to support',
        'Tell counselor'
      ],
      mediumRiskMoves: [
        'In class, casually use correct name',
        'Talk to teacher privately about it',
        'Tell principal'
      ],
      highRiskMoves: [
        'File complaint about teacher conduct',
        'Help classmate\'s family advocate',
        'Push for staff trans education'
      ],
      afterCare: [
        'Continue using correct name',
        'Stand visibly',
        'Support trans community'
      ]
    }
  ];

  var COMMUNITY_CHANGE_GUIDES = [
    {
      id: 'ccg1',
      level: 'Friend group',
      duration: 'Weeks to months',
      tools: ['Direct conversations', 'Modeling', 'Boundary-setting'],
      steps: [
        'Notice the problem',
        'Address it with one friend',
        'Address with whole group',
        'Hold the line',
        'Reset norms',
        'Maintain over time'
      ]
    },
    {
      id: 'ccg2',
      level: 'Classroom',
      duration: 'Semester to year',
      tools: ['Teacher partnership', 'Class agreements', 'Student leadership'],
      steps: [
        'Identify pattern',
        'Approach teacher with allies',
        'Propose class agreements',
        'Implement together',
        'Adjust as needed',
        'Build sustained culture'
      ]
    },
    {
      id: 'ccg3',
      level: 'School',
      duration: 'Year to years',
      tools: ['Student organizing', 'Administration partnership', 'Policy change'],
      steps: [
        'Build coalition',
        'Identify priorities',
        'Engage administration',
        'Push for policy changes',
        'Implement together',
        'Monitor and adjust'
      ]
    },
    {
      id: 'ccg4',
      level: 'District',
      duration: 'Years',
      tools: ['Multi-school organizing', 'Board engagement', 'Community partnerships'],
      steps: [
        'Build cross-school coalition',
        'Engage school board',
        'Push for district policy',
        'Monitor implementation',
        'Hold accountable',
        'Sustain over time'
      ]
    },
    {
      id: 'ccg5',
      level: 'State',
      duration: 'Years to decades',
      tools: ['Legislative advocacy', 'Community organizing', 'Media engagement'],
      steps: [
        'Build state-wide coalition',
        'Engage legislators',
        'Push for state policy',
        'Implementation oversight',
        'Continuous improvement'
      ]
    }
  ];

  var BULLYING_LAW_PRIMER = [
    {
      id: 'blp1',
      law: 'Title VI of the Civil Rights Act',
      year: 1964,
      whatItProtects: 'Discrimination based on race, color, or national origin.',
      whoEnforces: 'U.S. Department of Education Office for Civil Rights',
      whatItMeansForBullying: 'Race-based harassment in schools violates Title VI.',
      howToFile: 'Online at ed.gov/ocr',
      timeline: 'Within 180 days of last incident'
    },
    {
      id: 'blp2',
      law: 'Title IX of the Education Amendments',
      year: 1972,
      whatItProtects: 'Sex-based discrimination in education, including sexual harassment and gender-based harassment.',
      whoEnforces: 'OCR plus Title IX coordinator at each district',
      whatItMeansForBullying: 'Sexual harassment, gender-based harassment, harassment of LGBTQ students (in some interpretations) covered.',
      howToFile: 'Title IX coordinator first; then OCR',
      timeline: 'Within 180 days for OCR'
    },
    {
      id: 'blp3',
      law: 'Section 504 of the Rehabilitation Act',
      year: 1973,
      whatItProtects: 'Disability-based discrimination in any federally funded program.',
      whoEnforces: 'OCR',
      whatItMeansForBullying: 'Disability-based harassment violates Section 504.',
      howToFile: 'OCR online',
      timeline: 'Within 180 days'
    },
    {
      id: 'blp4',
      law: 'Americans with Disabilities Act (ADA)',
      year: 1990,
      whatItProtects: 'Disability discrimination across employment, public services, public accommodations.',
      whoEnforces: 'EEOC for employment; DOJ for public accommodations; OCR for education',
      whatItMeansForBullying: 'Disability harassment in schools may violate ADA Title II.',
      howToFile: 'Depends on context; OCR for schools',
      timeline: 'Varies by venue'
    },
    {
      id: 'blp5',
      law: 'State anti-bullying laws',
      year: 'varies',
      whatItProtects: 'Specific protections vary by state.',
      whoEnforces: 'State education agency',
      whatItMeansForBullying: 'Most states have specific anti-bullying laws requiring schools to investigate and respond.',
      howToFile: 'State education agency or state attorney general',
      timeline: 'Varies'
    },
    {
      id: 'blp6',
      law: 'Maine\'s anti-bullying law',
      year: 2012,
      whatItProtects: 'All Maine K-12 students from bullying and cyberbullying.',
      whoEnforces: 'Each school district plus Maine DOE',
      whatItMeansForBullying: 'Requires every school to have anti-bullying policy, investigation procedures, and reporting.',
      howToFile: 'School first; then Maine DOE',
      timeline: 'Reasonable time per district policy'
    },
    {
      id: 'blp7',
      law: 'Maine\'s Civil Rights Act',
      year: '1989, amended periodically',
      whatItProtects: 'Civil rights including disability, race, religion, sexual orientation, gender identity.',
      whoEnforces: 'Maine Attorney General Civil Rights Division',
      whatItMeansForBullying: 'Identity-based harassment in Maine schools may violate MCRA.',
      howToFile: 'Maine AG Civil Rights Team',
      timeline: '300 days typical'
    },
    {
      id: 'blp8',
      law: 'FERPA',
      year: 1974,
      whatItProtects: 'Privacy of student educational records. Right to inspect records.',
      whoEnforces: 'U.S. Department of Education',
      whatItMeansForBullying: 'Can use FERPA to access discipline records, behavior logs.',
      howToFile: 'Request to school. Complaint to DOE if denied.',
      timeline: '45 days from request'
    },
    {
      id: 'blp9',
      law: 'IDEA',
      year: 1975,
      whatItProtects: 'Free Appropriate Public Education for students with disabilities.',
      whoEnforces: 'OSEP and OCR',
      whatItMeansForBullying: 'Bullying of disabled students can constitute denial of FAPE.',
      howToFile: 'State complaint or due process',
      timeline: 'Varies'
    },
    {
      id: 'blp10',
      law: 'Title VII of the Civil Rights Act',
      year: 1964,
      whatItProtects: 'Employment discrimination based on race, color, religion, sex, national origin.',
      whoEnforces: 'EEOC',
      whatItMeansForBullying: 'School employees experiencing harassment can file under Title VII.',
      howToFile: 'EEOC online',
      timeline: '180 or 300 days depending on state'
    }
  ];

  var INTERVENTION_LETTER_TEMPLATES = [
    {
      id: 'ilt1',
      title: 'Letter to principal reporting bullying',
      audience: 'School principal',
      template: [
        'Dear Principal [Name],',
        '',
        'I am writing to formally report bullying of my child, [Student Name], grade [grade], at [school name].',
        '',
        'The following incidents have occurred:',
        '- [Date 1]: [Description]',
        '- [Date 2]: [Description]',
        '- [Date 3]: [Description]',
        '',
        'Witnesses to these incidents include: [Names]',
        '',
        'The impact on my child has been:',
        '- [Impact 1]',
        '- [Impact 2]',
        '',
        'Under our state\'s anti-bullying laws and the school\'s anti-bullying policy, I am requesting:',
        '1. A formal investigation per school policy',
        '2. Immediate safety planning for my child',
        '3. Communication with me about the investigation timeline and findings',
        '4. Specific consequences and supports for both students as appropriate',
        '',
        'Please confirm receipt of this report and provide me with the investigation timeline.',
        '',
        'Sincerely,',
        '[Your Name]'
      ]
    },
    {
      id: 'ilt2',
      title: 'Letter to district about school inaction',
      audience: 'Superintendent / District',
      template: [
        'Dear [Superintendent Name],',
        '',
        'I am escalating a bullying complaint to your office because school-level response has been inadequate.',
        '',
        'Background: I previously reported bullying of my child to [school principal] on [date]. Despite that report, the pattern has continued. [Recent incidents].',
        '',
        'I am requesting:',
        '1. District-level investigation',
        '2. Specific safety plan for my child',
        '3. Review of school\'s anti-bullying response',
        '4. Written response within [timeline]',
        '',
        'Documentation attached.',
        '',
        'Sincerely,',
        '[Your Name]'
      ]
    },
    {
      id: 'ilt3',
      title: 'Letter to state DOE',
      audience: 'State education agency',
      template: [
        'Dear State Department of Education,',
        '',
        'I am filing a state complaint against [School District] for failure to address bullying of my child.',
        '',
        'Facts:',
        '[Timeline of incidents and school responses]',
        '',
        'Violations:',
        '- Failure to investigate per state law',
        '- Failure to protect my child from ongoing harm',
        '- [Specific other violations]',
        '',
        'Remedies requested:',
        '- State investigation',
        '- Compliance order',
        '- Compensatory services if appropriate',
        '',
        'Documentation attached.',
        '',
        'Sincerely,',
        '[Your Name]'
      ]
    },
    {
      id: 'ilt4',
      title: 'Letter to OCR',
      audience: 'U.S. Department of Education OCR',
      template: [
        'Dear OCR Compliance Officer,',
        '',
        'I am filing a complaint against [School District] alleging civil rights violations against my child [Student Name].',
        '',
        'Basis: Discrimination based on [race/sex/disability/etc.] in violation of [Title VI/IX/Section 504].',
        '',
        'Specific allegations:',
        '[Detailed facts]',
        '',
        'Documentation:',
        '[List]',
        '',
        'Remedies requested:',
        '[List]',
        '',
        'Sincerely,',
        '[Your Name]'
      ]
    },
    {
      id: 'ilt5',
      title: 'Letter requesting safety plan',
      audience: 'Principal',
      template: [
        'Dear Principal [Name],',
        '',
        'Following the bullying incidents I have reported, I am requesting a written safety plan for my child.',
        '',
        'Proposed safety plan components:',
        '1. Separation from harasser during transitions',
        '2. Designated safe person and space',
        '3. Communication protocol for incidents',
        '4. Counselor support',
        '5. Re-entry plan if absences occurred',
        '',
        'I would like this in writing by [date].',
        '',
        'Sincerely,',
        '[Your Name]'
      ]
    },
    {
      id: 'ilt6',
      title: 'Letter to teacher about ongoing pattern',
      audience: 'Classroom teacher',
      template: [
        'Dear [Teacher],',
        '',
        'I am following up on our previous conversations about my child\'s experience in your class. The pattern has continued. Specifically: [recent incidents].',
        '',
        'I would like to: 1) Confirm what you observed. 2) Discuss next steps.',
        '',
        'Could we meet by [date]?',
        '',
        'Sincerely,',
        '[Your Name]'
      ]
    },
    {
      id: 'ilt7',
      title: 'Apology letter from harmer to harmed',
      audience: 'Person harmed',
      template: [
        'Dear [Name],',
        '',
        'I want to apologize for [specific actions]. I am not trying to make excuses.',
        '',
        'Here is what I did and why it was wrong: [description].',
        '',
        'I understand the impact has been: [impact].',
        '',
        'Here is what I am doing differently: [changes].',
        '',
        'Is there anything I can do to repair this?',
        '',
        'I am not asking for forgiveness on your timeline.',
        '',
        '[Your Name]'
      ]
    }
  ];

  var REAL_WORLD_DIALOGUE_LIBRARY = [
    {
      id: 'rwd1',
      title: 'Calling a teacher about your child being bullied',
      cast: ['Parent', 'Teacher'],
      dialogue: [
        { speaker: 'Parent', line: 'Hi Mr. Martinez. Do you have 10 minutes? I want to talk about something that has been happening with my son.' },
        { speaker: 'Teacher', line: 'Of course, what is going on?' },
        { speaker: 'Parent', line: 'For the last three weeks, my son has been coming home upset. He has been targeted by a group of students. Specifically: [examples].' },
        { speaker: 'Teacher', line: 'I had not noticed.' },
        { speaker: 'Parent', line: 'I appreciate you taking it seriously now. What do you typically do when you notice bullying?' },
        { speaker: 'Teacher', line: 'I usually address it in the moment.' },
        { speaker: 'Parent', line: 'That is helpful. Can we set up a plan for what to do now that I have shared this? I want to make sure the pattern stops.' },
        { speaker: 'Teacher', line: 'Yes. Let me bring this to the counselor and we can have a meeting.' },
        { speaker: 'Parent', line: 'Thank you. Can I get a follow-up by Friday?' },
        { speaker: 'Teacher', line: 'Yes.' }
      ],
      keyMoves: ['Specific examples', 'Schedule meeting, not ambush', 'Plan with follow-up timeline', 'Collaborative tone']
    },
    {
      id: 'rwd2',
      title: 'Reporting to the principal after teacher inaction',
      cast: ['Parent', 'Principal'],
      dialogue: [
        { speaker: 'Parent (email)', line: 'Dear Principal Diaz, I am writing to escalate a concern about ongoing bullying of my son. I have previously reported to his teacher Mr. Martinez on [date]. Since then, the pattern has continued. Specifically: [recent incidents]. I would like to meet with you and Mr. Martinez to develop an intervention plan.' },
        { speaker: 'Principal', line: 'Thank you for bringing this to my attention. I am scheduling a meeting for next week.' },
        { speaker: 'Parent (at meeting)', line: 'I have documented the incidents. Here are the dates and what happened. I am asking for: 1) An investigation. 2) A plan for stopping the harassment. 3) A timeline for re-evaluation.' },
        { speaker: 'Principal', line: 'We will investigate and respond.' },
        { speaker: 'Parent', line: 'I would like the investigation in writing. And I would like to know my child\'s safety plan.' },
        { speaker: 'Principal', line: 'Yes.' }
      ],
      keyMoves: ['Written escalation', 'Documentation', 'Specific asks', 'Written response request']
    },
    {
      id: 'rwd3',
      title: 'Restorative dialogue between harmed and harmer',
      cast: ['Facilitator', 'Harmed', 'Harmer'],
      dialogue: [
        { speaker: 'Facilitator', line: 'Welcome. This is a restorative dialogue. The goal is repair, not punishment. Are both of you ready to engage in good faith?' },
        { speaker: 'Both', line: 'Yes.' },
        { speaker: 'Facilitator', line: '[Harmer], tell us what happened.' },
        { speaker: 'Harmer', line: '[Describes their version]' },
        { speaker: 'Facilitator', line: '[Harmed], tell us how that affected you.' },
        { speaker: 'Harmed', line: '[Describes impact]' },
        { speaker: 'Facilitator', line: '[Harmer], having heard that, what do you understand differently now?' },
        { speaker: 'Harmer', line: '[Reflects]' },
        { speaker: 'Facilitator', line: 'What is needed to repair?' },
        { speaker: 'Harmed', line: '[States needs]' },
        { speaker: 'Facilitator', line: 'Can both of you agree to those needs being met?' },
        { speaker: 'Both', line: 'Yes.' },
        { speaker: 'Facilitator', line: 'Lets put that in writing.' }
      ],
      keyMoves: ['Equal time', 'Impact and understanding', 'Specific needs', 'Written agreement']
    },
    {
      id: 'rwd4',
      title: 'Teacher intervening in real time',
      cast: ['Teacher', 'Student A (mocking)', 'Student B (target)'],
      dialogue: [
        { speaker: 'Student A', line: '[Mocks Student B for accent]' },
        { speaker: 'Teacher', line: 'Stop. That comment is not okay.' },
        { speaker: 'Student A', line: 'It was a joke.' },
        { speaker: 'Teacher', line: 'In our class, we do not mock accents. Please apologize.' },
        { speaker: 'Student A', line: 'Sorry.' },
        { speaker: 'Teacher', line: 'Student B, are you okay?' },
        { speaker: 'Student B', line: '[Nods]' },
        { speaker: 'Teacher', line: 'Lets continue. Class, just a reminder: in our class, every voice belongs.' }
      ],
      keyMoves: ['Real-time intervention', 'Name the harm', 'Require apology', 'Check on target', 'Class-wide norm reset']
    },
    {
      id: 'rwd5',
      title: 'Counselor supporting a target',
      cast: ['Counselor', 'Student'],
      dialogue: [
        { speaker: 'Counselor', line: 'Thanks for coming. Take a moment to settle in.' },
        { speaker: 'Student', line: 'Thanks.' },
        { speaker: 'Counselor', line: 'Tell me what has been going on.' },
        { speaker: 'Student', line: '[Shares]' },
        { speaker: 'Counselor', line: 'That sounds really hard. I am sorry that has been happening.' },
        { speaker: 'Counselor', line: 'I want you to know: this is not your fault. The pattern of behavior is wrong.' },
        { speaker: 'Counselor', line: 'What feels most important to you right now?' },
        { speaker: 'Student', line: '[Shares]' },
        { speaker: 'Counselor', line: 'Lets make a plan. Here are some options...' }
      ],
      keyMoves: ['Validate first', 'Affirm not their fault', 'Center student priorities', 'Concrete plan']
    },
    {
      id: 'rwd6',
      title: 'Friend intervention',
      cast: ['You', 'Friend (mocker)'],
      dialogue: [
        { speaker: 'You', line: 'Hey, can we talk?' },
        { speaker: 'Friend', line: 'Sure.' },
        { speaker: 'You', line: 'When you said that about ___, I want to share how it landed for me.' },
        { speaker: 'Friend', line: 'What do you mean?' },
        { speaker: 'You', line: 'It felt mean. I know you might not have meant it that way. But that is how it sounded.' },
        { speaker: 'Friend', line: 'I was just joking.' },
        { speaker: 'You', line: 'I get that. I am asking you to not joke like that. It hurts me to be in friendships where we joke about people that way.' },
        { speaker: 'Friend', line: 'Okay. I will be more careful.' },
        { speaker: 'You', line: 'Thanks for hearing me.' }
      ],
      keyMoves: ['Private setting', 'I-statements', 'Impact-focused', 'Specific ask']
    },
    {
      id: 'rwd7',
      title: 'Reporting to OCR',
      cast: ['Student/Family member', 'OCR investigator'],
      dialogue: [
        { speaker: 'Student/Family', line: 'I would like to file a complaint regarding disability-based harassment at [school name]. My case manager Ms. Park has the relevant documentation. Here is what has been happening: [specifics]' },
        { speaker: 'OCR', line: 'Thank you for bringing this to us. We will investigate. Can you provide all documentation?' },
        { speaker: 'Student/Family', line: 'Yes. Here is my full timeline, copies of emails to school, and copies of incident reports.' },
        { speaker: 'OCR', line: 'We will follow up within 30 days.' }
      ],
      keyMoves: ['Specific legal framing', 'Documentation prepared', 'Specific timeline expectations']
    },
    {
      id: 'rwd8',
      title: 'Group calling out a peer',
      cast: ['Group of 3 friends', 'One friend who has been hurtful'],
      dialogue: [
        { speaker: 'Friend 1', line: 'Hey, can we talk?' },
        { speaker: 'Friend in question', line: 'About what?' },
        { speaker: 'Friend 1', line: 'About how you have been treating ___.' },
        { speaker: 'Friend in question', line: 'I have not been doing anything.' },
        { speaker: 'Friend 2', line: 'You have been. Specifically: [examples].' },
        { speaker: 'Friend 3', line: 'I have noticed too.' },
        { speaker: 'Friend in question', line: '[Pause]' },
        { speaker: 'Friend 1', line: 'We are not trying to attack you. We are saying we have all seen a pattern. We want you to know we will not participate in it.' },
        { speaker: 'Friend in question', line: 'I did not realize.' },
        { speaker: 'Friend 2', line: 'Now you do. We want our friend group to be different.' }
      ],
      keyMoves: ['Three vs one (group accountability)', 'Specific examples', 'Affirmation of relationship', 'Forward-looking']
    }
  ];

  var DEEP_DIVE_TOPICS = [
    {
      id: 'ddt1',
      topic: 'Why bystanders stay silent',
      research: 'The bystander effect (Latane and Darley, 1968) showed that the presence of other witnesses reduces individual likelihood of intervention.',
      explanations: [
        'Diffusion of responsibility',
        'Social pressure to conform',
        'Pluralistic ignorance',
        'Fear of social cost'
      ],
      interventions: [
        'Personal accountability training',
        'Specific intervention skills',
        'Cultural shift toward intervention norm',
        'Community of upstanders'
      ]
    },
    {
      id: 'ddt2',
      topic: 'How identity shapes bullying',
      research: 'GLSEN, ASAN, NAACP, and other organizations document differential bullying patterns based on identity.',
      explanations: [
        'Systemic prejudice manifests in peer relations',
        'Identity makes some students more visible targets',
        'Multiple marginalizations compound risk',
        'Cultural messages legitimize harm'
      ],
      interventions: [
        'Identity-affirming curriculum',
        'Affinity groups',
        'Cross-identity coalition',
        'Cultural competency for staff'
      ]
    },
    {
      id: 'ddt3',
      topic: 'Why punitive approaches fail',
      research: 'Research consistently shows suspension and expulsion increase recidivism and reduce academic outcomes.',
      explanations: [
        'Punishment does not address root cause',
        'Suspended students miss instruction',
        'Suspension correlates with future incarceration',
        'School-to-prison pipeline'
      ],
      interventions: [
        'Restorative practices',
        'Trauma-informed responses',
        'Wraparound services',
        'Community accountability'
      ]
    },
    {
      id: 'ddt4',
      topic: 'How adults can be upstanders',
      research: 'Teachers and school staff have particular leverage and responsibility.',
      explanations: [
        'Authority gives power',
        'Modeling teaches more than instruction',
        'Adults set norms students follow',
        'Adult silence is permission'
      ],
      interventions: [
        'Staff training',
        'Adult restorative practices',
        'Modeling intervention',
        'Building inclusive culture'
      ]
    },
    {
      id: 'ddt5',
      topic: 'How to repair after harm',
      research: 'Restorative justice research shows repair is possible and reduces future harm.',
      explanations: [
        'Punishment alone does not repair',
        'Repair requires acknowledgment, accountability, action',
        'Time can support but does not repair alone',
        'Sustained relationship-building is essential'
      ],
      interventions: [
        'Restorative circles',
        'Conferences',
        'Specific repair agreements',
        'Long-term follow-up'
      ]
    }
  ];

  var FAMILY_INVOLVEMENT_GUIDES = [
    {
      id: 'fig1',
      audience: 'Parents of targets',
      whatToDo: [
        'Listen first. Validate.',
        'Believe your child.',
        'Document everything.',
        'Work with school but escalate as needed.',
        'Get mental health support if needed.',
        'Help build resilience without minimizing harm.',
        'Stay engaged over time.'
      ],
      whatNotToDo: [
        'Tell them to ignore it.',
        'Tell them to fight back.',
        'Blame them for being targeted.',
        'Confront the bully or their family directly.',
        'Make decisions without your child.'
      ],
      whenToEscalate: [
        'School response is inadequate',
        'Pattern continues',
        'Mental health is affected',
        'Civil rights violation suspected'
      ]
    },
    {
      id: 'fig2',
      audience: 'Parents of bullies',
      whatToDo: [
        'Take it seriously.',
        'Understand root cause (often trauma or unmet needs).',
        'Get mental health support for your child.',
        'Work with school on accountability AND support.',
        'Model the change you want to see.',
        'Build empathy through real engagement with diverse people.',
        'Avoid shame; embrace accountability.'
      ],
      whatNotToDo: [
        'Defend the behavior.',
        'Blame the school or other family.',
        'Treat as a phase.',
        'Punish without addressing why.',
        'Hide your child\'s actions.'
      ],
      restorativeApproach: [
        'Apology with substance',
        'Repair the harm',
        'Address root cause',
        'Sustained accountability'
      ]
    },
    {
      id: 'fig3',
      audience: 'Parents of bystanders',
      whatToDo: [
        'Build vocabulary about upstander vs bystander',
        'Discuss values in your family',
        'Build empathy through stories',
        'Practice scenarios at home',
        'Affirm courage when you see it',
        'Model upstander behavior in your own life'
      ],
      whatNotToDo: [
        'Tell them to mind their own business',
        'Treat bystander work as optional',
        'Shame them for past silence'
      ],
      buildingCourage: [
        'Practice in low-stakes situations',
        'Build allies in their friend group',
        'Connect with adults who model courage',
        'Read books and watch films with upstander characters'
      ]
    },
    {
      id: 'fig4',
      audience: 'All parents',
      whatToDo: [
        'Have regular family conversations about school dynamics',
        'Know your child\'s friends and online life',
        'Model the values you want to see',
        'Engage with school community',
        'Push for inclusive school culture',
        'Build relationship with school staff'
      ],
      whatNotToDo: [
        'Wait for crisis to engage',
        'Assume "not at my child\'s school"',
        'Trust the system to handle everything'
      ],
      ongoingPractices: [
        'Family dinners with check-ins',
        'Phone-free conversation time',
        'Parent network',
        'School volunteering'
      ]
    }
  ];

  var EDUCATOR_TOOLKIT = [
    {
      id: 'et1',
      role: 'Classroom teacher',
      bullying_responsibilities: [
        'Notice and document',
        'Respond in the moment when possible',
        'Refer for further intervention',
        'Build inclusive classroom culture',
        'Engage families',
        'Continue learning'
      ],
      tools: [
        'Restorative circles',
        'Classroom agreements',
        'Bystander intervention curriculum',
        'Affective statements',
        'Clear, calm responses'
      ],
      whenToEscalate: [
        'Pattern of behavior',
        'Physical violence',
        'Discrimination',
        'Beyond your scope'
      ]
    },
    {
      id: 'et2',
      role: 'School counselor',
      bullying_responsibilities: [
        'Support targets',
        'Provide individual counseling',
        'Coordinate with families',
        'Lead group interventions',
        'Crisis response',
        'Train staff'
      ],
      tools: [
        'Individual sessions',
        'Group counseling',
        'Crisis intervention',
        'Family conferences',
        'Restorative circles'
      ],
      whenToEscalate: [
        'Mental health crisis',
        'Suicide risk',
        'Abuse disclosure',
        'Beyond your role'
      ]
    },
    {
      id: 'et3',
      role: 'Principal',
      bullying_responsibilities: [
        'Set school-wide expectations',
        'Implement policies',
        'Investigate complaints',
        'Discipline appropriately (restorative where possible)',
        'Engage families',
        'Train staff'
      ],
      tools: [
        'Policies',
        'Resources',
        'Authority',
        'Cross-staff coordination'
      ],
      whenToEscalate: [
        'District-level support needed',
        'Legal implications',
        'Civil rights violation'
      ]
    },
    {
      id: 'et4',
      role: 'Coach / Activity Leader',
      bullying_responsibilities: [
        'Set expectations for team/group',
        'Address harm immediately',
        'Model values',
        'Engage families',
        'Coordinate with school'
      ],
      tools: [
        'Team agreements',
        'Captain meetings',
        'One-on-one conversations',
        'Team-building'
      ],
      whenToEscalate: [
        'Beyond your scope',
        'Need school intervention',
        'Civil rights issue'
      ]
    },
    {
      id: 'et5',
      role: 'Para-educator / Aide',
      bullying_responsibilities: [
        'Notice and report',
        'Support targets',
        'Build trust with students',
        'Coordinate with teachers',
        'Continue learning'
      ],
      tools: [
        'Relationship-building',
        'Observation',
        'Reporting'
      ],
      whenToEscalate: [
        'Always when you observe harm',
        'When students disclose to you',
        'When you cannot intervene safely'
      ]
    }
  ];

  var BULLYING_TYPES_DETAILED = [
    {
      id: 'btd1',
      type: 'Physical bullying',
      definition: 'Use of physical actions to cause harm or intimidation.',
      examples: ['Hitting', 'Pushing', 'Kicking', 'Spitting', 'Tripping', 'Damaging property', 'Threatening gestures'],
      whoIsAtRisk: ['Smaller students', 'New students', 'Students perceived as different'],
      warningSigns: ['Unexplained injuries', 'Damaged belongings', 'Skipping school', 'Avoiding certain spaces'],
      whatHelps: ['Adult presence in problem areas', 'Clear consequences', 'Immediate intervention', 'Safety planning'],
      whatDoesNotHelp: ['Telling target to fight back', 'Ignoring it', 'Punishing without context']
    },
    {
      id: 'btd2',
      type: 'Verbal bullying',
      definition: 'Use of words to cause harm.',
      examples: ['Name-calling', 'Threats', 'Mocking', 'Slurs', 'Sexual comments', 'Public shaming'],
      whoIsAtRisk: ['Students with marginalized identities', 'Students with disabilities', 'Students who stand out'],
      warningSigns: ['Withdrawal', 'Anxiety in social situations', 'Reluctance to speak in class'],
      whatHelps: ['Interrupt slurs immediately', 'Address language norms', 'Affirm targets'],
      whatDoesNotHelp: ['Treating words as "just words"', 'Telling target to ignore', 'Free speech defenses']
    },
    {
      id: 'btd3',
      type: 'Relational/Social bullying',
      definition: 'Use of relationships and social structures to cause harm.',
      examples: ['Exclusion', 'Spreading rumors', 'Public humiliation', 'Manipulating friendships', 'Silent treatment in groups', 'Coordinated avoidance'],
      whoIsAtRisk: ['Students with fewer social connections', 'Students who do not conform', 'New students'],
      warningSigns: ['Loss of friend group', 'Isolation at lunch', 'Mood changes', 'School avoidance'],
      whatHelps: ['Build inclusive culture', 'Address group dynamics', 'Support target connection-building', 'Adult mentorship'],
      whatDoesNotHelp: ['Forcing friendships', 'Ignoring social dynamics', 'Punishing exclusion without addressing why']
    },
    {
      id: 'btd4',
      type: 'Cyberbullying',
      definition: 'Bullying through digital channels.',
      examples: ['Mean texts', 'Group chat pile-ons', 'Non-consensual photo sharing', 'Online rumors', 'Catfishing', 'Doxxing', 'Outing on social media'],
      whoIsAtRisk: ['Students using social media (most)', 'Students with marginalized identities', 'Students with strong social media presence'],
      warningSigns: ['Avoiding phone', 'Anxiety about checking apps', 'Sudden mood changes after device use', 'School avoidance'],
      whatHelps: ['Screenshot everything', 'Block and report', 'Take breaks from platforms', 'Adult involvement', 'School policy on cyberbullying'],
      whatDoesNotHelp: ['Telling them to just get off social media', 'Ignoring it', 'Treating it as less real']
    },
    {
      id: 'btd5',
      type: 'Sexual harassment',
      definition: 'Unwelcome sexual behavior creating hostile environment.',
      examples: ['Sexual comments', 'Unwanted touch', 'Sharing intimate images without consent', 'Sexual rumors', 'Sexual threats', 'Sexual assault'],
      whoIsAtRisk: ['Girls especially', 'LGBTQ students', 'Students who do not conform to gender norms'],
      warningSigns: ['Anxiety in mixed-gender spaces', 'Changes in clothing', 'School avoidance', 'Mental health changes'],
      whatHelps: ['Title IX reporting', 'Counselor support', 'Documentation', 'Investigation', 'Safety planning'],
      whatDoesNotHelp: ['Blaming target for behavior or clothing', 'Treating as "boys will be boys"', 'Informal resolution alone']
    },
    {
      id: 'btd6',
      type: 'Identity-based harassment',
      definition: 'Harassment targeting specific aspects of identity.',
      examples: ['Racial slurs', 'Homophobic and transphobic language', 'Religious mockery', 'Ableist language', 'Xenophobic comments'],
      whoIsAtRisk: ['Students with the targeted identity'],
      warningSigns: ['Hiding identity', 'Withdrawal from identity-affirming activities', 'Mental health changes'],
      whatHelps: ['Identity-affirming community', 'School policy enforcement', 'OCR complaint if needed', 'Educator training'],
      whatDoesNotHelp: ['Treating identity-based as same as other bullying', 'Ignoring the identity dimension', 'Asking target to educate']
    },
    {
      id: 'btd7',
      type: 'Disability harassment',
      definition: 'Harassment specifically targeting disability.',
      examples: ['Imitating disability', 'Mocking accommodations', 'Refusing to honor disability', 'Slurs (retard etc.)', 'Sabotaging accommodations'],
      whoIsAtRisk: ['Students with visible or known disabilities'],
      warningSigns: ['Hiding disability', 'Refusing accommodations', 'Mental health changes', 'Performance decline'],
      whatHelps: ['Section 504 / IDEA / ADA enforcement', 'Disability awareness education', 'Counselor support', 'Affinity group'],
      whatDoesNotHelp: ['Treating as "just teasing"', 'Asking student to ignore', 'Not consulting disabled students']
    },
    {
      id: 'btd8',
      type: 'Religious bullying',
      definition: 'Harassment based on religion or religious expression.',
      examples: ['Mocking religious clothing', 'Vandalism of religious items', 'Exclusion from social events for religious reasons', 'Hate speech'],
      whoIsAtRisk: ['Students from minority religions', 'Students wearing religious clothing'],
      warningSigns: ['Hiding religious identity', 'Withdrawal from religious activities', 'Mental health changes'],
      whatHelps: ['Religious accommodation policies', 'Interfaith student programs', 'Title VI enforcement', 'Cultural competency'],
      whatDoesNotHelp: ['Treating as cultural difference', 'Asking student to change']
    },
    {
      id: 'btd9',
      type: 'Class-based bullying',
      definition: 'Harassment based on socioeconomic status.',
      examples: ['Mocking clothes or shoes', 'Excluding based on cost of activities', 'Free/reduced lunch teasing', 'Insulting home address'],
      whoIsAtRisk: ['Students from lower-income families'],
      warningSigns: ['Hiding lunch', 'Avoiding social events', 'Skipping field trips', 'Mental health changes'],
      whatHelps: ['Universal free meals', 'Equity in extracurricular access', 'No-cost school activities', 'Conscious dress codes'],
      whatDoesNotHelp: ['Treating as not really bullying', 'Highlighting student\'s situation publicly']
    },
    {
      id: 'btd10',
      type: 'Body-based bullying',
      definition: 'Harassment based on body size, shape, or appearance.',
      examples: ['Weight commentary', 'Mocking body parts', 'Sexualizing developing bodies', 'Diet talk', 'Eating commentary'],
      whoIsAtRisk: ['Students with bodies that differ from cultural norms'],
      warningSigns: ['Disordered eating', 'Body covering', 'Mental health changes'],
      whatHelps: ['Body-positive programming', 'NEDA resources', 'Mental health support', 'Inclusive dress codes'],
      whatDoesNotHelp: ['Joining diet talk', 'Treating as harmless']
    }
  ];

  var INTERVENTION_DECISION_TREES = [
    {
      id: 'idt1',
      situation: 'Slur used in public',
      questions: [
        { q: 'Is the target physically safe?', actions: { yes: 'Move to next question', no: 'Get help immediately' } },
        { q: 'Are you physically safe to intervene?', actions: { yes: 'Direct intervention possible', no: 'Choose indirect intervention' } },
        { q: 'Is target requesting intervention?', actions: { yes: 'Match the level they want', no: 'Default to brief, calm response' } }
      ],
      possibleResponses: ['Say "stop, that word is not okay"', 'Catch target\'s eye in support', 'Tell adult after', 'Document for pattern tracking']
    },
    {
      id: 'idt2',
      situation: 'Group chat going cruel',
      questions: [
        { q: 'Is target in the chat?', actions: { yes: 'Address publicly', no: 'Decide whether to address publicly or just leave' } },
        { q: 'Are you willing to risk losing group?', actions: { yes: 'Speak up directly', no: 'Leave quietly and reach out to target privately' } },
        { q: 'Is this pattern or single incident?', actions: { pattern: 'Time to act', single: 'Watch for repeat' } }
      ],
      possibleResponses: ['"Lets ease up on this"', '"This is going hard. Lets change subject"', 'Leave chat', 'DM target with support']
    },
    {
      id: 'idt3',
      situation: 'Lunch exclusion',
      questions: [
        { q: 'Did the excluded person want to sit with you?', actions: { yes: 'Address it', no: 'No action needed' } },
        { q: 'Is this part of a pattern?', actions: { yes: 'Pattern needs more action', no: 'Single incident addressed' } },
        { q: 'Are friends willing to change?', actions: { yes: 'Address with friends', no: 'Consider different lunch table' } }
      ],
      possibleResponses: ['Invite excluded person tomorrow', 'Address with friends privately', 'Eat at different table', 'Have group conversation']
    },
    {
      id: 'idt4',
      situation: 'Adult is harming a student',
      questions: [
        { q: 'Is student in immediate danger?', actions: { yes: 'Get help now', no: 'Document and report' } },
        { q: 'Is this pattern or single incident?', actions: { pattern: 'Time to escalate', single: 'Document and watch' } },
        { q: 'Is internal reporting possible?', actions: { yes: 'Try internal first', no: 'Skip to external' } }
      ],
      possibleResponses: ['Tell counselor', 'Tell principal', 'Tell parent of target', 'File OCR complaint', 'External authority']
    },
    {
      id: 'idt5',
      situation: 'Friend has been hurt',
      questions: [
        { q: 'Are they safe right now?', actions: { yes: 'Move to support', no: 'Get them safe first' } },
        { q: 'What do they want?', actions: { listening: 'Listen', action: 'Help take action', space: 'Give space and check back' } },
        { q: 'Do they want adult involvement?', actions: { yes: 'Help them find right adult', no: 'Respect their wishes for now' } }
      ],
      possibleResponses: ['Sit with them', 'Help report', 'Connect with adult', 'Check in tomorrow', 'Be witness']
    }
  ];

  var BULLYING_PREVENTION_FRAMEWORKS = [
    {
      id: 'bpf1',
      name: 'Olweus Bullying Prevention Program',
      origin: 'Dan Olweus, Norway',
      keyComponents: [
        'School-wide commitment',
        'Classroom rules against bullying',
        'Adult supervision in problem areas',
        'Individual intervention for bullies and targets',
        'Consistent consequences',
        'Family engagement'
      ],
      effectiveness: 'Research shows reductions of 20-70% in bullying when fully implemented.',
      limitations: 'Requires multi-year commitment. Difficult to fully implement.',
      bestFor: 'Schools committed to comprehensive culture change.'
    },
    {
      id: 'bpf2',
      name: 'Restorative Practices',
      origin: 'Indigenous traditions, particularly Maori; popularized in Western schools by various educators including IIRP',
      keyComponents: [
        'Circles (proactive and responsive)',
        'Restorative dialogue',
        'Conferences',
        'Affective statements',
        'Affective questions'
      ],
      effectiveness: 'Strong research base. Reduces recidivism, builds relationships, improves school climate.',
      limitations: 'Requires significant staff training. Cannot be partial.',
      bestFor: 'Schools willing to invest in long-term culture change.'
    },
    {
      id: 'bpf3',
      name: 'PBIS (Positive Behavioral Interventions and Supports)',
      origin: 'OSEP-funded framework',
      keyComponents: [
        'School-wide behavior expectations',
        'Positive reinforcement',
        'Tiered interventions',
        'Data-driven decision making',
        'Family engagement'
      ],
      effectiveness: 'Strong evidence base. Reduces office referrals significantly.',
      limitations: 'Risk of becoming token economy. Must be paired with relational practices.',
      bestFor: 'Schools building consistent expectations.'
    },
    {
      id: 'bpf4',
      name: 'Trauma-Informed Schools',
      origin: 'SAMHSA framework',
      keyComponents: [
        'Safety',
        'Trustworthiness and transparency',
        'Peer support',
        'Collaboration and mutuality',
        'Empowerment, voice, choice',
        'Cultural, historical, gender considerations'
      ],
      effectiveness: 'Improves outcomes for all students, especially those with ACEs.',
      limitations: 'Requires deep cultural shift. Staff need ongoing support.',
      bestFor: 'Schools with high-trauma populations.'
    },
    {
      id: 'bpf5',
      name: 'Social-Emotional Learning (SEL)',
      origin: 'CASEL framework',
      keyComponents: [
        'Self-awareness',
        'Self-management',
        'Social awareness',
        'Relationship skills',
        'Responsible decision-making'
      ],
      effectiveness: 'Strong research base. Improves academic outcomes too.',
      limitations: 'Can be reduced to checklist if not integrated.',
      bestFor: 'Schools building emotional competence across curriculum.'
    },
    {
      id: 'bpf6',
      name: 'Bystander Intervention Training',
      origin: 'Various, including Green Dot, Bringing in the Bystander',
      keyComponents: [
        'Direct intervention skills',
        'Distract',
        'Delegate',
        'Document',
        'Delay (follow up)'
      ],
      effectiveness: 'Effective for increasing bystander action.',
      limitations: 'Must be combined with cultural change.',
      bestFor: 'High school and college populations.'
    },
    {
      id: 'bpf7',
      name: 'Disability Justice Framework',
      origin: 'Sins Invalid, Patty Berne, others',
      keyComponents: [
        'Intersectionality',
        'Leadership of most impacted',
        'Anti-capitalism',
        'Cross-movement organizing',
        'Recognizing wholeness',
        'Sustainability',
        'Cross-disability solidarity',
        'Interdependence',
        'Collective access',
        'Collective liberation'
      ],
      effectiveness: 'Centers multiply marginalized people. Transformative when implemented.',
      limitations: 'Requires deep commitment. Often resisted by institutions.',
      bestFor: 'Schools committed to deep equity work.'
    },
    {
      id: 'bpf8',
      name: 'Culturally Responsive Pedagogy',
      origin: 'Gloria Ladson-Billings, Geneva Gay, others',
      keyComponents: [
        'High expectations for all students',
        'Cultural connections to learning',
        'Critical consciousness',
        'Asset-based view',
        'Student voice and agency'
      ],
      effectiveness: 'Strong outcomes for marginalized students.',
      limitations: 'Requires teachers to do their own learning.',
      bestFor: 'All schools, especially diverse ones.'
    }
  ];

  var UPSTANDER_HISTORY_TIMELINE = [
    {
      id: 'uht1',
      year: 1957,
      event: 'Daisy Bates and the Little Rock Nine',
      whoWasInvolved: 'Daisy Bates, Elizabeth Eckford, 8 other Black students integrating Little Rock Central High',
      whatHappened: 'Bates organized and supported 9 Black students integrating an all-white high school. They faced threats, harassment, and violence.',
      whyItMatters: 'Modeled organized upstander action against systemic harm. Required adults to protect young students.',
      lesson: 'Sometimes adults must be the upstanders, and sometimes young people must be.'
    },
    {
      id: 'uht2',
      year: 1957,
      event: 'Klaus Kinkel - Holocaust history',
      whoWasInvolved: 'Various witnesses and rescuers',
      whatHappened: 'Some non-Jews risked their lives to save Jewish neighbors and strangers from Nazi persecution.',
      whyItMatters: 'These rescuers, called Righteous Among the Nations, represent the upstander tradition in its most consequential form.',
      lesson: 'Even in the most dangerous moments, upstander action is possible.'
    },
    {
      id: 'uht3',
      year: 1965,
      event: 'Selma to Montgomery march',
      whoWasInvolved: 'Civil rights organizers including Hosea Williams, John Lewis, Amelia Boynton, Martin Luther King Jr.',
      whatHappened: 'Civil rights marchers attempted to march from Selma to Montgomery for voting rights. Met with police violence at Edmund Pettus Bridge.',
      whyItMatters: 'Bystanders watching on TV became upstanders. Public pressure led to Voting Rights Act.',
      lesson: 'Sometimes the work is to make others bear witness.'
    },
    {
      id: 'uht4',
      year: 1969,
      event: 'Stonewall riots',
      whoWasInvolved: 'Marsha P. Johnson, Sylvia Rivera, Stormé DeLarverie, many trans women of color',
      whatHappened: 'After police raid on Stonewall Inn, LGBTQ patrons fought back. Sparked modern Pride movement.',
      whyItMatters: 'Trans women of color led upstander action that benefited entire LGBTQ community.',
      lesson: 'The most marginalized often lead the most transformative movements.'
    },
    {
      id: 'uht5',
      year: 1977,
      event: '504 Sit-in',
      whoWasInvolved: 'Judy Heumann, Kitty Cone, Brad Lomax, Black Panthers (food support), many others',
      whatHappened: 'Disabled activists occupied federal building for 28 days to force enforcement of Section 504.',
      whyItMatters: 'Showed cross-movement solidarity. Black Panthers fed disabled protesters daily.',
      lesson: 'Coalition across movements multiplies power.'
    },
    {
      id: 'uht6',
      year: 1989,
      event: 'Tiananmen Square Tank Man',
      whoWasInvolved: 'Unknown protester, Chinese pro-democracy movement',
      whatHappened: 'Anonymous man stood in front of tanks in Beijing after democracy protest crackdown.',
      whyItMatters: 'Image of single person blocking tank became universal upstander symbol.',
      lesson: 'One person\'s action can become an icon for many.'
    },
    {
      id: 'uht7',
      year: 2010,
      event: 'Pulse Nightclub aftermath',
      whoWasInvolved: 'First responders, family members of victims, LGBTQ community',
      whatHappened: 'After mass shooting at LGBTQ club, community organized to support survivors and families.',
      whyItMatters: 'Modeled how community responds to mass trauma. Mutual aid.',
      lesson: 'Community response after crisis is upstander work too.'
    },
    {
      id: 'uht8',
      year: 2017,
      event: 'Heather Heyer - Charlottesville',
      whoWasInvolved: 'Heather Heyer and other counter-protesters',
      whatHappened: 'At white supremacist rally in Charlottesville, counter-protester Heather Heyer was killed when a car was driven into the crowd.',
      whyItMatters: 'Modeled that upstander work can cost lives.',
      lesson: 'Risk is real. So is the duty.'
    },
    {
      id: 'uht9',
      year: 2018,
      event: 'March for Our Lives',
      whoWasInvolved: 'Emma Gonzalez, David Hogg, Parkland students',
      whatHappened: 'After Parkland school shooting, students organized national march for gun reform.',
      whyItMatters: 'Modeled student-led organizing on national scale.',
      lesson: 'Young people can lead national movements.'
    },
    {
      id: 'uht10',
      year: 2020,
      event: 'George Floyd protests',
      whoWasInvolved: 'Black Lives Matter movement, millions globally',
      whatHappened: 'After murder of George Floyd, global protests led to police reform conversations.',
      whyItMatters: 'Bystander video (Darnella Frazier) made the harm visible globally.',
      lesson: 'Documentation can change the world.'
    }
  ];

  var UPSTANDER_LESSON_PLANS = [
    {
      id: 'ulp1',
      title: 'Lesson 1: What does it mean to be an upstander?',
      grade: 'middle school',
      duration: '45 min',
      objectives: ['Distinguish between bystander and upstander', 'Identify 3 examples of upstander actions', 'Reflect on personal experience'],
      structure: [
        { phase: 'Opening', time: '5 min', activity: 'Brainstorm: what is the difference between bystander and upstander?' },
        { phase: 'Mini-lesson', time: '10 min', activity: 'Define both. Show video clip. Discuss spectrum.' },
        { phase: 'Group activity', time: '20 min', activity: 'Pairs identify 5 upstander actions they have seen or done.' },
        { phase: 'Reflection', time: '10 min', activity: 'Write: one time I was a bystander. One time I was an upstander.' }
      ],
      homework: 'Notice one upstander moment this week.',
      assessmentRubric: 'Student articulates difference and identifies examples.'
    },
    {
      id: 'ulp2',
      title: 'Lesson 2: Why bystanders stay silent',
      grade: 'middle school',
      duration: '60 min',
      objectives: ['Identify barriers to intervention', 'Develop strategies to overcome', 'Practice low-risk moves'],
      structure: [
        { phase: 'Opening', time: '10 min', activity: 'Brainstorm: what stops you from speaking up?' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'The diffusion of responsibility. Bystander effect. Social risk.' },
        { phase: 'Group activity', time: '25 min', activity: 'Role-play 3 scenarios with different intervention levels.' },
        { phase: 'Closing', time: '10 min', activity: 'Each student commits to one low-risk move this week.' }
      ],
      homework: 'Try your committed move. Reflect.',
      assessmentRubric: 'Student practices at least one intervention strategy.'
    },
    {
      id: 'ulp3',
      title: 'Lesson 3: Why people bully',
      grade: 'middle school',
      duration: '45 min',
      objectives: ['Understand hurt people hurt people', 'Distinguish behavior from person', 'Develop compassion + accountability'],
      structure: [
        { phase: 'Opening', time: '5 min', activity: 'Brainstorm: why do people bully?' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'Research on bullies as victims. Trauma response. Power dynamics.' },
        { phase: 'Discussion', time: '20 min', activity: 'Discuss: can we hold someone accountable AND show compassion?' },
        { phase: 'Closing', time: '5 min', activity: 'One insight you take away.' }
      ],
      homework: 'Notice one bullying behavior. Think about possible contexts.',
      assessmentRubric: 'Student articulates dual approach.'
    },
    {
      id: 'ulp4',
      title: 'Lesson 4: What targets need',
      grade: 'middle school',
      duration: '45 min',
      objectives: ['Identify needs of bullying targets', 'Practice supportive responses', 'Plan ongoing support'],
      structure: [
        { phase: 'Opening', time: '5 min', activity: 'If you were targeted, what would you want from a peer?' },
        { phase: 'Mini-lesson', time: '10 min', activity: 'Research on target needs. Validation. Connection. Safety planning.' },
        { phase: 'Practice', time: '20 min', activity: 'In pairs, practice supportive opener: "I noticed what happened. Are you okay?"' },
        { phase: 'Closing', time: '10 min', activity: 'Commit to checking in on one targeted peer.' }
      ],
      homework: 'Reach out to one person who has been targeted.',
      assessmentRubric: 'Student practices supportive language.'
    },
    {
      id: 'ulp5',
      title: 'Lesson 5: Reporting and what happens',
      grade: 'middle school',
      duration: '60 min',
      objectives: ['Understand reporting options', 'Identify trusted adults', 'Practice documentation'],
      structure: [
        { phase: 'Opening', time: '10 min', activity: 'Brainstorm: who would you tell?' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'Reporting levels: trusted adult, counselor, principal, district, state, federal.' },
        { phase: 'Practice', time: '20 min', activity: 'Practice writing a formal report.' },
        { phase: 'Resources', time: '10 min', activity: 'Share state and federal resources.' },
        { phase: 'Closing', time: '5 min', activity: 'Commit to identifying your trusted adults.' }
      ],
      homework: 'Identify 3 trusted adults at school and 1 outside.',
      assessmentRubric: 'Student can articulate reporting process.'
    },
    {
      id: 'ulp6',
      title: 'Lesson 6: Cyberbullying and digital citizenship',
      grade: 'middle school',
      duration: '60 min',
      objectives: ['Understand digital harm', 'Develop digital ethics', 'Practice digital intervention'],
      structure: [
        { phase: 'Opening', time: '10 min', activity: 'Brainstorm: differences between in-person and online harm.' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'Permanence of digital. Disinhibition online. Compounding harms.' },
        { phase: 'Scenarios', time: '25 min', activity: 'Discuss 4 cyberbullying scenarios. Brainstorm responses.' },
        { phase: 'Closing', time: '10 min', activity: 'Commit to one digital ethics practice.' }
      ],
      homework: 'Audit your own digital footprint. Apologize for anything regrettable.',
      assessmentRubric: 'Student articulates digital intervention strategies.'
    },
    {
      id: 'ulp7',
      title: 'Lesson 7: Identity-based harm',
      grade: 'high school',
      duration: '60 min',
      objectives: ['Distinguish identity-based harm', 'Recognize multiple identities', 'Build identity-affirming community'],
      structure: [
        { phase: 'Opening', time: '10 min', activity: 'Discuss: how does identity affect bullying?' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'Identity-based harassment research. Multiple identities. Intersectionality.' },
        { phase: 'Stories', time: '25 min', activity: 'Read or hear stories of identity-based bullying.' },
        { phase: 'Discussion', time: '10 min', activity: 'How can we build identity-affirming community?' }
      ],
      homework: 'Read one piece by someone with marginalized identity.',
      assessmentRubric: 'Student articulates intersectional analysis.'
    },
    {
      id: 'ulp8',
      title: 'Lesson 8: Restorative justice',
      grade: 'high school',
      duration: '90 min',
      objectives: ['Understand restorative vs punitive', 'Practice restorative dialogue', 'Apply to real situation'],
      structure: [
        { phase: 'Opening', time: '10 min', activity: 'Discuss: what is the goal of accountability?' },
        { phase: 'Mini-lesson', time: '20 min', activity: 'Restorative justice principles. Comparison to punitive.' },
        { phase: 'Practice', time: '45 min', activity: 'Restorative dialogue role-play in groups of 3 (harm-doer, harmed, facilitator).' },
        { phase: 'Closing', time: '15 min', activity: 'Reflect on what worked, what was hard.' }
      ],
      homework: 'Identify one relationship where you need to repair. Plan the conversation.',
      assessmentRubric: 'Student participates in role-play and reflects.'
    },
    {
      id: 'ulp9',
      title: 'Lesson 9: Building coalition',
      grade: 'high school',
      duration: '60 min',
      objectives: ['Understand coalition-building', 'Plan one organizing action', 'Commit to ongoing work'],
      structure: [
        { phase: 'Opening', time: '10 min', activity: 'Brainstorm: what change do you want at school?' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'Coalition-building basics. Examples.' },
        { phase: 'Planning', time: '25 min', activity: 'Small groups plan one action.' },
        { phase: 'Sharing', time: '10 min', activity: 'Each group shares plan.' }
      ],
      homework: 'Take one step toward your coalition.',
      assessmentRubric: 'Student plans concrete action.'
    },
    {
      id: 'ulp10',
      title: 'Lesson 10: Sustaining the work',
      grade: 'high school',
      duration: '60 min',
      objectives: ['Identify burnout patterns', 'Develop self-care practices', 'Build long-term sustainability'],
      structure: [
        { phase: 'Opening', time: '10 min', activity: 'Discuss: what makes upstander work tiring?' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'Burnout research. Self-care as political. Community sustenance.' },
        { phase: 'Practice', time: '25 min', activity: 'Build personal sustainability plan.' },
        { phase: 'Closing', time: '10 min', activity: 'Share one sustainability commitment.' }
      ],
      homework: 'Implement your sustainability plan for a week.',
      assessmentRubric: 'Student has concrete sustainability practices.'
    }
  ];

  var UPSTANDER_JOURNAL_PROMPTS = [
    { id: 'ujp1', prompt: 'Describe the last time you witnessed harm. What did you do? What do you wish you had done?', depth: 'reflection' },
    { id: 'ujp2', prompt: 'What stops you from speaking up? Be specific.', depth: 'reflection' },
    { id: 'ujp3', prompt: 'What is one moment of upstander courage you are proud of?', depth: 'celebration' },
    { id: 'ujp4', prompt: 'Who is one bystander who became an upstander? What changed?', depth: 'inspiration' },
    { id: 'ujp5', prompt: 'When have you been the target? What did you need from witnesses?', depth: 'empathy' },
    { id: 'ujp6', prompt: 'When have you been part of the harm? What would you do differently?', depth: 'accountability' },
    { id: 'ujp7', prompt: 'What kind of upstander do you want to be?', depth: 'aspiration' },
    { id: 'ujp8', prompt: 'What is one fear about speaking up that you want to examine?', depth: 'inner work' },
    { id: 'ujp9', prompt: 'Who is one ally you want to deepen relationship with?', depth: 'connection' },
    { id: 'ujp10', prompt: 'What is one piece of identity you want to learn more about as an ally?', depth: 'learning' },
    { id: 'ujp11', prompt: 'When was the last time you apologized well? What made it work?', depth: 'skill' },
    { id: 'ujp12', prompt: 'What is one cultural norm at your school you want to change?', depth: 'systems' },
    { id: 'ujp13', prompt: 'Who is your model of upstander? What do they do that you can do?', depth: 'mentor' },
    { id: 'ujp14', prompt: 'What is one small daily practice you will commit to?', depth: 'practice' },
    { id: 'ujp15', prompt: 'How are you doing on your sustainability practices?', depth: 'check-in' },
    { id: 'ujp16', prompt: 'What conversation have you been avoiding?', depth: 'specific' },
    { id: 'ujp17', prompt: 'What is one resource you want to share with someone else?', depth: 'community' },
    { id: 'ujp18', prompt: 'What growth have you noticed in yourself?', depth: 'progress' },
    { id: 'ujp19', prompt: 'What is one belief about yourself that limits your courage?', depth: 'deep' },
    { id: 'ujp20', prompt: 'What would you tell your past self about being an upstander?', depth: 'mentor self' }
  ];

  var EXTENDED_CASE_STUDIES = [
    {
      id: 'ecs1',
      title: 'The High School That Transformed Its Culture',
      summary: 'A suburban high school with persistent bullying problems implemented a multi-year restorative practices program that reduced incidents by 65%.',
      problem: [
        'Discipline data showed 200+ suspensions per year',
        'Survey showed 40% of students felt unsafe at school',
        'Mental health referrals had increased 50% over 3 years',
        'Staff burnout was high'
      ],
      approach: [
        'Year 1: All staff trained in restorative basics',
        'Year 1: Daily classroom circles introduced',
        'Year 2: Conflict mediation team established',
        'Year 2: Restorative response replaced suspension for most violations',
        'Year 3: Student-led restorative circles',
        'Year 3: Family engagement protocols'
      ],
      outcomes: [
        'Suspensions decreased 60%',
        'Bullying incidents decreased 65%',
        'Mental health referrals decreased 35%',
        'Staff retention improved',
        'Student climate surveys improved across all measures'
      ],
      lessons: [
        'Restorative practices require time and investment',
        'All staff must be trained, not just specialists',
        'Daily circles build culture, not just respond to crises',
        'Students must be partners in the work'
      ]
    },
    {
      id: 'ecs2',
      title: 'The Middle School Anti-Racism Movement',
      summary: 'After a racist incident, BIPOC students organized for systemic change at their middle school.',
      problem: [
        'Racist graffiti appeared in the bathroom',
        'Administration response was slow and minimal',
        'Multiple BIPOC students reported similar incidents historically',
        'School climate had been deteriorating'
      ],
      approach: [
        'Students organized walk-out',
        'Met with administration with specific demands',
        'Created student-led racism reporting system',
        'Engaged parents and community',
        'Pushed for curriculum review',
        'Demanded staff cultural competency training'
      ],
      outcomes: [
        'Administration committed to action plan',
        'Curriculum review committee included students',
        'Staff training implemented across district',
        'Cultural competency made part of evaluation',
        'Student climate council established'
      ],
      lessons: [
        'Student organizing is powerful',
        'Community engagement amplifies student voice',
        'Systemic change requires multiple levels of pressure',
        'Document everything'
      ]
    },
    {
      id: 'ecs3',
      title: 'The Cyberbullying Coalition',
      summary: 'Parents, students, and educators built a multi-school coalition to address cyberbullying.',
      problem: [
        'Multiple students at multiple schools were targets of coordinated online harassment',
        'Schools struggled to address harm that originated online',
        'Parents felt powerless',
        'Mental health crisis was emerging'
      ],
      approach: [
        'Parents organized cross-school meeting',
        'Identified pattern across schools',
        'Engaged district leadership',
        'Built coalition with mental health providers',
        'Created digital citizenship curriculum',
        'Established crisis response protocols'
      ],
      outcomes: [
        'District-wide cyberbullying policy developed',
        'Mental health response coordination',
        'Digital citizenship in all middle schools',
        'Family education on tech',
        'Coalition continues to monitor and respond'
      ],
      lessons: [
        'Cyberbullying crosses school boundaries',
        'Coalition expands reach',
        'Mental health response is essential',
        'Prevention requires education AND policy'
      ]
    },
    {
      id: 'ecs4',
      title: 'The GSA That Saved Lives',
      summary: 'A high school GSA expanded to support LGBTQ youth through bullying and crisis.',
      problem: [
        'High rate of LGBTQ bullying',
        'Multiple students hospitalized for mental health',
        'Some students did not feel safe being out',
        'Staff varied in support'
      ],
      approach: [
        'GSA recruited faculty advisor allies',
        'Created safe space stickers for classrooms',
        'Built peer mentorship program',
        'Connected with Trevor Project resources',
        'Hosted Day of Silence',
        'Advocated for trans-inclusive policies'
      ],
      outcomes: [
        'Safe space stickers in 75% of classrooms',
        'Multiple students credited GSA with saving their lives',
        'Trans-inclusive bathroom policy adopted',
        'Pronoun training for staff',
        'School recognized at state level'
      ],
      lessons: [
        'Peer support saves lives',
        'Visible allies matter',
        'Specific policies matter',
        'Student leadership is essential'
      ]
    },
    {
      id: 'ecs5',
      title: 'The Disability Inclusion Project',
      summary: 'Students with disabilities and allies worked to make their school more accessible.',
      problem: [
        'Physical accessibility issues',
        'Disability mocking was common',
        'Accommodations were often not honored',
        'Disabled students felt segregated'
      ],
      approach: [
        'Student disability council formed',
        'Audit of physical access issues',
        'Disability awareness curriculum proposed',
        'Buddy system for new students with disabilities',
        'Accommodation tracking system',
        'Advocate for universal design principles'
      ],
      outcomes: [
        'Physical access improvements',
        'Disability awareness in curriculum',
        'Accommodation compliance tracked',
        'Disabled students feel more integrated',
        'Universal design becoming standard'
      ],
      lessons: [
        'Disability advocacy is ongoing',
        'Student voice is essential',
        'Universal design benefits all students',
        'Accommodations require active monitoring'
      ]
    }
  ];

  var BULLYING_RESEARCH_OVERVIEW = [
    {
      id: 'bro1',
      finding: 'Bystander intervention reduces bullying',
      research: 'Multiple studies show that when bystanders intervene, bullying duration decreases by 70% within 10 seconds.',
      implications: 'The first 10 seconds matter most. Quick intervention beats waiting for the perfect moment.',
      practicalApplications: [
        'Train students in quick interventions',
        'Practice 5-second responses',
        'Build muscle memory for the early moment'
      ]
    },
    {
      id: 'bro2',
      finding: 'Bullies are often victims too',
      research: 'Research consistently shows that students who bully often experience violence at home or have experienced trauma.',
      implications: 'Punishment alone does not address root cause. Restorative approaches plus support for the bullying student work better.',
      practicalApplications: [
        'Look beyond the behavior to understand context',
        'Support all students, not just targets',
        'Restorative practices over punitive'
      ]
    },
    {
      id: 'bro3',
      finding: 'Identity-based bullying is more harmful',
      research: 'Bullying based on race, sexuality, disability, religion etc. has worse mental health outcomes than non-identity-based bullying.',
      implications: 'Identity-based bullying requires identity-aware intervention.',
      practicalApplications: [
        'Train staff on identity-based harassment',
        'Connect targets with identity-affirming community',
        'Hold higher accountability for identity-based incidents'
      ]
    },
    {
      id: 'bro4',
      finding: 'Cyberbullying compounds with in-person',
      research: 'Students who experience both online and offline bullying have significantly worse outcomes than either alone.',
      implications: 'Cyberbullying response must be coordinated with school response.',
      practicalApplications: [
        'Address both spheres in any intervention',
        'Document across both contexts',
        'Build digital citizenship into curriculum'
      ]
    },
    {
      id: 'bro5',
      finding: 'Restorative practices outperform suspension',
      research: 'Schools using restorative practices see lower repeat offenses, better academic outcomes, and stronger climate than schools using suspension.',
      implications: 'Suspension often fails. Restorative practices require investment but produce results.',
      practicalApplications: [
        'Train all staff in restorative methods',
        'Build circles into regular routines',
        'Track recidivism rates as metric of success'
      ]
    },
    {
      id: 'bro6',
      finding: 'Adults underestimate bullying frequency',
      research: 'Students report 2-3x more bullying incidents than adults observe.',
      implications: 'Adult-led tracking misses most incidents. Student-centered data collection is essential.',
      practicalApplications: [
        'Anonymous student surveys',
        'Student-led reporting systems',
        'Multiple feedback channels'
      ]
    },
    {
      id: 'bro7',
      finding: 'Bystander silence is the norm',
      research: 'In observational studies, bystanders intervene in only 19% of bullying incidents. Most witnesses do nothing.',
      implications: 'Most students need explicit training and permission to intervene.',
      practicalApplications: [
        'Bystander intervention curriculum',
        'Multiple intervention strategies',
        'Cultural shift toward intervention as norm'
      ]
    },
    {
      id: 'bro8',
      finding: 'Targets often blame themselves',
      research: 'Students targeted by bullying often internalize the message that they deserve it.',
      implications: 'Targets need explicit support and reframing.',
      practicalApplications: [
        'Affirm target experience',
        'Provide context (it is not about you)',
        'Connect with peer support'
      ]
    },
    {
      id: 'bro9',
      finding: 'School climate affects bullying rates',
      research: 'Schools with strong inclusive climate have significantly lower bullying rates than schools without.',
      implications: 'Climate-building is bullying prevention.',
      practicalApplications: [
        'Build inclusive cultures',
        'Visible diversity programming',
        'Train all staff on inclusion'
      ]
    },
    {
      id: 'bro10',
      finding: 'Trauma-informed approaches matter',
      research: 'Schools using trauma-informed approaches see better outcomes for all students, especially those with high ACE scores.',
      implications: 'Trauma-informed is not optional. It is foundational.',
      practicalApplications: [
        'Train all staff in trauma basics',
        'Avoid traumatizing practices (loud alarms, harsh discipline)',
        'Build regulation into routine'
      ]
    }
  ];

  var DAILY_UPSTANDER_PRACTICES = [
    { id: 'dup1', practice: 'Notice one moment of exclusion today and address it', frequency: 'daily', minutes: 5 },
    { id: 'dup2', practice: 'Smile at one person who seems alone', frequency: 'daily', minutes: 1 },
    { id: 'dup3', practice: 'Compliment one specific thing about a peer', frequency: 'daily', minutes: 1 },
    { id: 'dup4', practice: 'Interrupt one slur or hurtful word', frequency: 'weekly', minutes: 1 },
    { id: 'dup5', practice: 'Check in on one classmate who has been quiet', frequency: 'weekly', minutes: 5 },
    { id: 'dup6', practice: 'Send a kind anonymous note', frequency: 'monthly', minutes: 10 },
    { id: 'dup7', practice: 'Sit with someone different at lunch', frequency: 'weekly', minutes: 30 },
    { id: 'dup8', practice: 'Volunteer to help one peer', frequency: 'weekly', minutes: 15 },
    { id: 'dup9', practice: 'Refuse to participate in gossip', frequency: 'daily', minutes: 1 },
    { id: 'dup10', practice: 'Change the subject when a chat gets cruel', frequency: 'as needed', minutes: 1 },
    { id: 'dup11', practice: 'Stand up tall in your own body', frequency: 'daily', minutes: 1 },
    { id: 'dup12', practice: 'Use correct pronouns for everyone', frequency: 'daily', minutes: 1 },
    { id: 'dup13', practice: 'Learn one peer\'s story', frequency: 'monthly', minutes: 20 },
    { id: 'dup14', practice: 'Notice one privilege you have and use it', frequency: 'daily', minutes: 1 },
    { id: 'dup15', practice: 'Apologize for something small you did', frequency: 'weekly', minutes: 5 },
    { id: 'dup16', practice: 'Tell a trusted adult one observation', frequency: 'weekly', minutes: 10 },
    { id: 'dup17', practice: 'Read one piece of writing by a marginalized person', frequency: 'weekly', minutes: 15 },
    { id: 'dup18', practice: 'Build one new friendship outside your usual circle', frequency: 'monthly', minutes: 30 },
    { id: 'dup19', practice: 'Take care of yourself before and after hard moments', frequency: 'daily', minutes: 15 },
    { id: 'dup20', practice: 'Reflect on a hard interaction at end of day', frequency: 'daily', minutes: 5 }
  ];

  var UPSTANDER_AFFIRMATIONS = [
    { id: 'ua1', text: 'My silence is not safety. My voice is.' },
    { id: 'ua2', text: 'Small acts of kindness build big movements.' },
    { id: 'ua3', text: 'I belong here. So does every other student.' },
    { id: 'ua4', text: 'It is not my job to fix everything. It is my job to do something.' },
    { id: 'ua5', text: 'I can be afraid and brave at the same time.' },
    { id: 'ua6', text: 'Every time I interrupt harm, I build a different world.' },
    { id: 'ua7', text: 'I can be wrong. I can apologize. I can try again.' },
    { id: 'ua8', text: 'My presence is a contribution.' },
    { id: 'ua9', text: 'I am part of something bigger than me.' },
    { id: 'ua10', text: 'I am a witness. Witnessing matters.' },
    { id: 'ua11', text: 'I have allies I have not met yet.' },
    { id: 'ua12', text: 'My discomfort is data. I do not have to act on it. I can sit with it.' },
    { id: 'ua13', text: 'My friend\'s discomfort about my upstander move is theirs to manage.' },
    { id: 'ua14', text: 'I do not have to perform brave to be brave.' },
    { id: 'ua15', text: 'Quiet courage is still courage.' },
    { id: 'ua16', text: 'I can be a good friend and still hold my line.' },
    { id: 'ua17', text: 'My boundaries protect my values.' },
    { id: 'ua18', text: 'I am the kind of person who does not look away.' },
    { id: 'ua19', text: 'I get to choose who I am, every day.' },
    { id: 'ua20', text: 'The cost of speaking up is real. The cost of silence is higher.' },
    { id: 'ua21', text: 'I will be the friend I wish I had had.' },
    { id: 'ua22', text: 'Every student deserves to feel safe at school.' },
    { id: 'ua23', text: 'My care is a verb.' },
    { id: 'ua24', text: 'My silence has been a teacher. My speech can be too.' },
    { id: 'ua25', text: 'I am not alone in this work.' },
    { id: 'ua26', text: 'I am building a culture, not just reacting to incidents.' },
    { id: 'ua27', text: 'Small interventions count.' },
    { id: 'ua28', text: 'My empathy is power, not weakness.' },
    { id: 'ua29', text: 'I refuse to be a bystander to my own life.' },
    { id: 'ua30', text: 'I am part of the long arc of justice.' }
  ];

  var DETAILED_ROLE_PLAY_LIBRARY = [
    {
      id: 'drp1',
      title: 'Confronting a friend in private',
      setup: 'Your friend made fun of a classmate at lunch today. You want to address it privately.',
      acts: [
        {
          beat: 'Setting up',
          dialogue: [
            { speaker: 'You (text)', line: 'Hey, can we talk after school? Nothing huge, just want to chat.' },
            { speaker: 'Friend', line: 'Sure, everything okay?' },
            { speaker: 'You', line: 'Yeah. Just want to talk in person.' }
          ],
          notes: 'Schedule. Do not ambush. Sets stage for real conversation.'
        },
        {
          beat: 'Opening',
          dialogue: [
            { speaker: 'You', line: 'I want to talk about lunch today. When you made fun of ___.' },
            { speaker: 'Friend', line: 'Oh, that. I was just joking around.' },
            { speaker: 'You', line: 'I know you were not trying to be cruel. But I want to tell you how it landed for me, and probably for ___.' }
          ],
          notes: 'Specific. Names what happened. Acknowledges intent before impact.'
        },
        {
          beat: 'Naming the impact',
          dialogue: [
            { speaker: 'You', line: 'When you said that, ___ went quiet. I noticed. I think they heard it. And it made me feel like our group is the kind that mocks people.' },
            { speaker: 'Friend', line: 'I did not mean it that way.' },
            { speaker: 'You', line: 'I believe you. But the impact was real. I want us to be better than that.' }
          ],
          notes: 'Stay with impact. Do not let intent erase impact.'
        },
        {
          beat: 'Asking for change',
          dialogue: [
            { speaker: 'You', line: 'Can we agree to ease up on the jokes that target people?' },
            { speaker: 'Friend', line: 'Yeah. I will be more careful.' },
            { speaker: 'You', line: 'Thanks for hearing me. I know that was not easy to receive.' }
          ],
          notes: 'Specific ask. Honor their reception.'
        }
      ],
      whatWorked: ['Private setting', 'Specific incident', 'Impact statement', 'Specific ask', 'Honored their willingness to hear'],
      whatToWatchFor: ['Defensive response', 'Pattern of dismissal', 'Need for more conversations']
    },
    {
      id: 'drp2',
      title: 'Intervening in a hallway slur',
      setup: 'You hear someone use a slur in the hallway. Target keeps walking.',
      acts: [
        {
          beat: 'Recognizing the moment',
          dialogue: [
            { speaker: 'Internal', line: 'I heard that. Do I act?' },
            { speaker: 'Internal', line: 'I am scared. AND that was real harm. AND silence makes it normal.' },
            { speaker: 'Internal', line: 'Even a small action counts.' }
          ],
          notes: 'Decision moment. Worth pausing for.'
        },
        {
          beat: 'The smallest move',
          dialogue: [
            { speaker: 'You (to speaker)', line: 'Hey. That word.' },
            { speaker: 'Speaker', line: 'What?' },
            { speaker: 'You', line: 'That word is not okay.' },
            { speaker: 'Speaker', line: 'You are taking it too seriously.' },
            { speaker: 'You', line: 'It is racist. Please do not say it.' }
          ],
          notes: 'Short. Clear. Name the harm. Do not back down.'
        },
        {
          beat: 'Following up with the target',
          dialogue: [
            { speaker: 'You (later, text)', line: 'Hey. I heard what they said in the hallway. I am sorry that happened. Are you okay?' },
            { speaker: 'Target', line: 'I am tired. Thanks for saying something.' },
            { speaker: 'You', line: 'Anything I can do?' }
          ],
          notes: 'Privacy. Care. Open door.'
        },
        {
          beat: 'Reporting',
          dialogue: [
            { speaker: 'You (to counselor)', line: 'I want to report something I heard in the hallway today.' },
            { speaker: 'Counselor', line: 'Tell me what happened.' },
            { speaker: 'You', line: 'At 11:15 between class periods, I heard ___ say ___ to ___. I asked them to stop. I am reporting because I want it documented.' }
          ],
          notes: 'Specific. Documented. Asked for record.'
        }
      ],
      whatWorked: ['Acted in the moment', 'Followed up with target', 'Reported for documentation'],
      whatToWatchFor: ['Speaker escalates with you', 'Target prefers no intervention', 'Pattern of slurs']
    },
    {
      id: 'drp3',
      title: 'Calling out a group chat',
      setup: 'Group chat is mocking a classmate. You decide to speak up.',
      acts: [
        {
          beat: 'Setup',
          dialogue: [
            { speaker: 'Internal', line: 'I have been scrolling. I should say something.' },
            { speaker: 'Internal', line: 'This will probably blow up at me.' },
            { speaker: 'Internal', line: 'It is worth it anyway.' }
          ],
          notes: 'Decision.'
        },
        {
          beat: 'The message',
          dialogue: [
            { speaker: 'You (in chat)', line: 'Hey - I do not think we should keep mocking ___. It is going hard.' }
          ],
          notes: 'Direct. Brief. No long lecture.'
        },
        {
          beat: 'Response',
          dialogue: [
            { speaker: 'Friend A', line: 'It is just jokes' },
            { speaker: 'Friend B', line: 'Lighten up' },
            { speaker: 'You', line: 'I know it feels like jokes. The pattern is targeting. I am asking us to stop.' },
            { speaker: 'Friend C', line: 'Yeah, I agree with [You]. Lets change the subject.' }
          ],
          notes: 'Hold ground. Sometimes one ally appears.'
        },
        {
          beat: 'What happens next',
          dialogue: [
            { speaker: 'You (privately to target)', line: 'I saw the chat. I called it out. I am sorry it happened.' },
            { speaker: 'Target', line: 'Thanks. I had not seen it yet. That helps.' }
          ],
          notes: 'Reach to target.'
        }
      ],
      whatWorked: ['Brief direct statement', 'Held ground after pushback', 'Followed up with target'],
      whatToWatchFor: ['Chat may turn on you', 'You may need to leave', 'Target may need more support']
    },
    {
      id: 'drp4',
      title: 'Standing with a target whose accommodations are being mocked',
      setup: 'A student with hearing aid is being mocked for asking for repetition. You decide to act.',
      acts: [
        {
          beat: 'The moment',
          dialogue: [
            { speaker: 'Mocker', line: 'What did you say? What did you say? What did you say?' },
            { speaker: 'You (loud)', line: 'Just answer their question. It is not a big deal.' }
          ],
          notes: 'Redirect. Do not engage mocker on their level.'
        },
        {
          beat: 'After class',
          dialogue: [
            { speaker: 'You (to target)', line: 'Hey. I noticed what happened. I should have said something earlier. You okay?' },
            { speaker: 'Target', line: 'I am used to it. Thanks for stepping in today.' },
            { speaker: 'You', line: 'I want to be someone who steps in earlier next time.' }
          ],
          notes: 'Honor their experience. Commit to growth.'
        },
        {
          beat: 'Following up with mocker',
          dialogue: [
            { speaker: 'You (privately)', line: 'I want to talk about what happened in class. When you mocked ___ for asking for repetition.' },
            { speaker: 'Mocker', line: 'It was just a joke.' },
            { speaker: 'You', line: 'They have an accommodation. Mocking that is ableist. I am asking you to stop.' }
          ],
          notes: 'Private confrontation. Name the system, not just the moment.'
        }
      ],
      whatWorked: ['Real-time redirect', 'Follow-up with target', 'Private accountability'],
      whatToWatchFor: ['Pattern of ableism', 'Need for adult involvement', 'Target may want to take their own action']
    },
    {
      id: 'drp5',
      title: 'When the bully is in your friend group',
      setup: 'You have realized that your friend has been bullying someone for weeks. You have to address it.',
      acts: [
        {
          beat: 'Reckoning',
          dialogue: [
            { speaker: 'Internal', line: 'I knew this was happening. I did not stop it.' },
            { speaker: 'Internal', line: 'I have to address it now.' },
            { speaker: 'Internal', line: 'I will lose this friend. AND I will gain myself.' }
          ],
          notes: 'Self-honesty.'
        },
        {
          beat: 'The conversation',
          dialogue: [
            { speaker: 'You', line: 'I need to talk to you about ___. What you have been doing to them.' },
            { speaker: 'Friend', line: 'What about it?' },
            { speaker: 'You', line: 'You have been bullying them for weeks. I have watched and not stopped it. I am wrong for that. I am stopping now.' },
            { speaker: 'Friend', line: 'You are being dramatic.' },
            { speaker: 'You', line: 'I am not. I am being honest. I will not participate in this. I will tell adults if it continues.' }
          ],
          notes: 'Take responsibility for your role. Set clear line.'
        },
        {
          beat: 'After',
          dialogue: [
            { speaker: 'You (to target)', line: 'Hi. You do not know me well. I have been part of a friend group that has been mistreating you. I am sorry. I am stopping. I would like to make it right.' },
            { speaker: 'Target', line: 'You are friends with [bully].' },
            { speaker: 'You', line: 'I was. Now I am here, telling you the truth and apologizing. I will not be silent if it happens again.' }
          ],
          notes: 'Direct. Accountable. Forward-looking.'
        }
      ],
      whatWorked: ['Took responsibility', 'Set clear line', 'Apologized directly'],
      whatToWatchFor: ['Loss of friendship', 'Bully escalates', 'Target may not want apology']
    }
  ];

  var REPORTING_PROCEDURES_DETAILED = [
    {
      id: 'rpd1',
      level: 'Informal',
      situation: 'Single incident with low-level harm',
      who: 'Trusted teacher or counselor',
      how: 'Verbal or brief written note',
      timeline: 'Same day if possible',
      followUp: 'Check back in 1 week',
      tip: 'Even informal reports create record.'
    },
    {
      id: 'rpd2',
      level: 'Formal school',
      situation: 'Pattern of harm or single serious incident',
      who: 'Principal, vice principal, or counselor',
      how: 'Written report with date, time, witnesses',
      timeline: 'Within 1 week of incident',
      followUp: 'School should respond within 10 days. Document if they do not.',
      tip: 'Keep your own copy. Note who you sent it to.'
    },
    {
      id: 'rpd3',
      level: 'District',
      situation: 'School not responding to internal complaint',
      who: 'District superintendent or Title IX coordinator',
      how: 'Written complaint citing specific facts',
      timeline: 'After school-level fails',
      followUp: 'District has 30 days typically',
      tip: 'Include all previous reports.'
    },
    {
      id: 'rpd4',
      level: 'State',
      situation: 'District not responding or systemic issue',
      who: 'State education agency',
      how: 'Online complaint or written submission',
      timeline: 'After district-level fails',
      followUp: 'State investigation typically 60 days',
      tip: 'Cite specific state law if applicable.'
    },
    {
      id: 'rpd5',
      level: 'Federal civil rights',
      situation: 'Discrimination based on protected class',
      who: 'U.S. Department of Education Office for Civil Rights',
      how: 'Online complaint via ed.gov/ocr',
      timeline: 'Within 180 days of last incident',
      followUp: 'OCR opens investigation within 30 days',
      tip: 'Free. Does not require attorney.'
    },
    {
      id: 'rpd6',
      level: 'Police',
      situation: 'Criminal behavior (assault, sexual assault, threats)',
      who: 'Local police or school resource officer',
      how: 'Phone call or in-person report',
      timeline: 'Immediately for safety',
      followUp: 'Get case number. Follow up on investigation.',
      tip: 'You can choose not to file charges but the report exists.'
    }
  ];

  var UPSTANDER_NARRATIVES = [
    {
      id: 'un1',
      title: 'The day I lost a friend by speaking up',
      narrative: [
        'I was 15. My best friend Jess was mocking a girl named Maria in our class. Mocking her clothes. Her accent. Her family.',
        '',
        'I had laughed along for weeks. I told myself I was just being polite.',
        '',
        'One day Maria heard. She did not say anything. She just stopped sitting near us.',
        '',
        'That night I could not sleep. I had been part of why Maria felt unsafe.',
        '',
        'The next day I told Jess I was done participating. She was furious. She said I was being dramatic.',
        '',
        'I sat with Maria at lunch. Maria looked surprised. I said: "I am sorry for what I did. I should not have laughed. I will not do it again."',
        '',
        'Maria and I became friends. Jess stopped talking to me for a year.',
        '',
        'I lost a friend. I gained one. Was it worth it? Yes. Maria is still my best friend 10 years later.',
        '',
        'What I tell younger people: Sometimes the cost of doing the right thing is real. The cost of not doing it is also real, just hidden.'
      ]
    },
    {
      id: 'un2',
      title: 'I was the kid being mocked',
      narrative: [
        'I am autistic. In 7th grade I was the only out autistic kid in my class. I stimmed visibly. Other kids mocked it.',
        '',
        'One day a kid named David walked over and sat next to me at lunch. Just sat down. Did not ask for anything.',
        '',
        'I did not know what to do. I had been sitting alone for weeks.',
        '',
        'He started eating his lunch. Then he asked me what I was reading.',
        '',
        'I told him. He had read the same book.',
        '',
        'David sat with me every day for the rest of the year. Other kids stopped mocking me when David was there. He had a quiet kind of social power.',
        '',
        'David did not save me. But he showed me I was not alone.',
        '',
        'Years later I asked David why he sat with me. He said: "I knew you needed someone. I had been new the year before. I knew what it was like."',
        '',
        'I now sit with kids who are alone. I know what David knew.',
        '',
        'What I tell younger people: Sometimes the most upstander thing is to sit down without saying a word.'
      ]
    },
    {
      id: 'un3',
      title: 'The chat I left',
      narrative: [
        'I was 14. I was in a group chat of 8 people. We had been friends since 5th grade.',
        '',
        'In 8th grade the chat got mean. Someone outside the chat had become the target. Daily mockery. Screenshots. Photos.',
        '',
        'I felt sick reading it. I told myself it was just typing. Words on a screen.',
        '',
        'Then one day the target came to school in tears. He had seen the screenshots.',
        '',
        'I left the chat that night. I told everyone: "I am done. What we are doing is hurting someone."',
        '',
        'Three people DMd me to call me self-righteous. Two unfriended me on social media.',
        '',
        'One person said: "I have been thinking the same thing. I am leaving too."',
        '',
        'Then another. And another.',
        '',
        'In a week half the chat had left.',
        '',
        'The target started getting his life back. Slowly.',
        '',
        'I lost half my friend group. I gained myself.',
        '',
        'What I tell younger people: The cost of leaving is high. The cost of staying is higher.'
      ]
    },
    {
      id: 'un4',
      title: 'The teacher who took my report seriously',
      narrative: [
        'I was 12. I told my homeroom teacher Mrs. Patel that a kid in our class had been hurting another kid. I had seen it.',
        '',
        'I expected her to brush it off. To say "tell me if it happens again."',
        '',
        'Instead, she sat me down. She asked me to tell her exactly what I saw. She wrote it down.',
        '',
        'She thanked me. She said I had done something important.',
        '',
        'I learned later that Mrs. Patel had escalated my report. The bullying student was given consequences. The targeted student got help.',
        '',
        'Mrs. Patel did not tell anyone I had told her. She protected me.',
        '',
        'I tell adults: when a student reports something, they are taking a huge risk. Treat the report with the weight it deserves.',
        '',
        'I tell students: there are adults who will help. You may have to try several. Mrs. Patel was the third adult I asked. The first two had brushed it off.',
        '',
        'Find your Mrs. Patel.'
      ]
    },
    {
      id: 'un5',
      title: 'When I called out my own family',
      narrative: [
        'My uncle made a racist joke at Thanksgiving. Everyone laughed except me.',
        '',
        'I was 16. I had been hearing these jokes my whole life.',
        '',
        'I said: "That joke is not funny. It is racist."',
        '',
        'The table went silent. My uncle said: "Lighten up."',
        '',
        'My grandmother said: "We do not have political conversations at the table."',
        '',
        'I said: "It is not political. It is racist. Please do not say things like that around me."',
        '',
        'I went outside. My mom came out. She said: "I am proud of you. I should have said something years ago."',
        '',
        'My uncle did not apologize. But he has not made a racist joke around me since.',
        '',
        'Family is the hardest place to be an upstander. The cost feels personal. The reward is also personal.',
        '',
        'What I tell younger people: Start with family. If you can stand up in your own dinner table, you can stand up anywhere.'
      ]
    },
    {
      id: 'un6',
      title: 'I stood up in a way nobody noticed',
      narrative: [
        'I was 17. A teacher was being verbally harsh with a struggling student. The student was crying.',
        '',
        'I knew I should intervene. I did not know how.',
        '',
        'I raised my hand. I asked a question about the lesson that I already knew the answer to. The teacher had to stop the harsh moment to answer me.',
        '',
        'The student wiped their face. The moment passed.',
        '',
        'No one noticed I had done anything.',
        '',
        'After class I checked on the student. They said: "Thanks for raising your hand. I needed that."',
        '',
        'They had noticed.',
        '',
        'Upstander moves do not always look heroic. Sometimes they look like a small redirection. A glance. A question that interrupts.',
        '',
        'What I tell younger people: Quiet upstander moves are still upstander moves.'
      ]
    },
    {
      id: 'un7',
      title: 'When I was wrong',
      narrative: [
        'I was 16. I called a kid out publicly for something I thought was bullying.',
        '',
        'It turned out I had misread the situation. The two kids were close friends. They had a rough sense of humor with each other. Both consented to it.',
        '',
        'I had embarrassed both of them. I had embarrassed myself.',
        '',
        'I apologized to both of them. I asked what I had missed. They explained their dynamic.',
        '',
        'I learned: upstander work requires accurate reading of situations. Not every conflict is bullying. Not every interaction is harmful.',
        '',
        'But I also learned: caring is not wrong. Being wrong about a specific instance is not the same as being wrong to care.',
        '',
        'What I tell younger people: You will be wrong sometimes. Apologize. Adjust. Keep caring.'
      ]
    },
    {
      id: 'un8',
      title: 'The peer who supported me when I had been the bully',
      narrative: [
        'I had been mean to a kid in 5th grade. I joined in mocking. I had not started it but I had not stopped it either.',
        '',
        'In 7th grade my friend Sam pulled me aside. He said: "I have been wanting to talk to you. What you did to Andy back then. It was not okay. You should know."',
        '',
        'I felt sick. I had not thought about Andy in years.',
        '',
        'Sam said: "I am not telling you to make you feel bad. I am telling you so you can do something different now."',
        '',
        'I found Andy on Instagram. I sent him a long message. Apologized.',
        '',
        'Andy responded weeks later. He said it had hurt. He said he had spent years thinking he deserved it.',
        '',
        'He thanked me for reaching out.',
        '',
        'Sam was the upstander. Years later. Telling me, the former bully, the truth.',
        '',
        'I have been Sam since. I tell friends when their behavior was harmful. I do it with love.',
        '',
        'What I tell younger people: Repair is always possible. Even years later. Even from the person who caused the harm.'
      ]
    },
    {
      id: 'un9',
      title: 'When I joined a movement',
      narrative: [
        'I was 18. There had been an incident at our school. A racial slur written on a bathroom wall.',
        '',
        'Some students wanted to organize. I went to the first meeting unsure what to expect.',
        '',
        'There were 15 students. Mostly BIPOC. A few white students like me. We talked about what had happened. What we wanted.',
        '',
        'I listened more than I spoke. I learned things about the school I had not seen.',
        '',
        'We organized a walk-out. Then a meeting with administration. Then a curriculum review.',
        '',
        'Two years later, the school has new staff training, new restorative practices, new cultural competency programs.',
        '',
        'I did not lead the movement. I supported it. I showed up.',
        '',
        'What I tell younger people: You do not have to lead to be part of change. Following can be powerful.'
      ]
    },
    {
      id: 'un10',
      title: 'My quietest upstander move',
      narrative: [
        'I am 13. I am autistic. I am sensitive to social cues.',
        '',
        'Yesterday a kid was being mocked at lunch. I noticed. I knew what to do but I could not get the words out.',
        '',
        'I walked over to the table. I sat down across from the mocked kid. I did not say anything. I started eating my lunch.',
        '',
        'The mockers got quiet. Then they walked away.',
        '',
        'I did not say a word.',
        '',
        'The mocked kid said: "Thanks." That was the only word.',
        '',
        'We ate in silence. It was the most powerful moment of my year.',
        '',
        'What I tell younger people: Words are not the only way to be an upstander. Presence is also a language.'
      ]
    }
  ];

  var UPSTANDER_MENTOR_QUOTES = [
    { id: 'umq1', mentor: 'Bayard Rustin', quote: 'We need in every community a group of angelic troublemakers.', useWhen: 'When you wonder if making good trouble is worth it.', followup: 'You can be both angelic and troublesome.' },
    { id: 'umq2', mentor: 'Audre Lorde', quote: 'Your silence will not protect you.', useWhen: 'When silence feels safer than speaking up.', followup: 'Silence costs you and others. Speak.' },
    { id: 'umq3', mentor: 'Martin Luther King Jr.', quote: 'In the end, we will remember not the words of our enemies, but the silence of our friends.', useWhen: 'When friends are being quiet about harm.', followup: 'Your silence is remembered too.' },
    { id: 'umq4', mentor: 'Elie Wiesel', quote: 'There may be times when we are powerless to prevent injustice, but there must never be a time when we fail to protest.', useWhen: 'When you cannot stop the harm but feel you must do something.', followup: 'Protest can be small. It always matters.' },
    { id: 'umq5', mentor: 'Desmond Tutu', quote: 'If you are neutral in situations of injustice, you have chosen the side of the oppressor.', useWhen: 'When you tell yourself you are staying neutral.', followup: 'Neutrality is a choice. Often the wrong one.' },
    { id: 'umq6', mentor: 'Pastor Martin Niemoller', quote: 'First they came for the socialists, and I did not speak out...', useWhen: 'When you think it does not affect you, so you should not get involved.', followup: 'It will eventually affect you. Speak earlier.' },
    { id: 'umq7', mentor: 'Howard Zinn', quote: 'You cannot be neutral on a moving train.', useWhen: 'When you opt out of choosing.', followup: 'Choose a direction.' },
    { id: 'umq8', mentor: 'Cesar Chavez', quote: 'You are never strong enough that you do not need help.', useWhen: 'When you think you must intervene alone.', followup: 'Bring others.' },
    { id: 'umq9', mentor: 'Dolores Huerta', quote: 'Every moment is an organizing opportunity.', useWhen: 'When the situation feels too small to matter.', followup: 'Small acts build movements.' },
    { id: 'umq10', mentor: 'Maya Angelou', quote: 'I have learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel.', useWhen: 'When you wonder what you can offer.', followup: 'Presence is enough. Care is enough.' },
    { id: 'umq11', mentor: 'Ruby Bridges', quote: 'Don\'t follow the path. Go where there is no path and begin the trail.', useWhen: 'When no one else is intervening.', followup: 'Be the first.' },
    { id: 'umq12', mentor: 'Fred Rogers', quote: 'Look for the helpers. You will always find people who are helping.', useWhen: 'When everything feels hopeless.', followup: 'You can be the helper.' },
    { id: 'umq13', mentor: 'Anne Frank', quote: 'No one has ever become poor by giving.', useWhen: 'When you weigh the cost of helping.', followup: 'The cost is real. So is the reward.' },
    { id: 'umq14', mentor: 'Nelson Mandela', quote: 'A good head and a good heart are always a formidable combination.', useWhen: 'When you wonder if caring is enough.', followup: 'Care + strategy = change.' },
    { id: 'umq15', mentor: 'Malala Yousafzai', quote: 'When the whole world is silent, even one voice becomes powerful.', useWhen: 'When you are the only one speaking.', followup: 'Your voice matters more than you know.' },
    { id: 'umq16', mentor: 'Greta Thunberg', quote: 'You are never too small to make a difference.', useWhen: 'When you doubt your power.', followup: 'Your age is not a disqualification.' },
    { id: 'umq17', mentor: 'Tarana Burke', quote: 'Empowerment through empathy.', useWhen: 'When you wonder how to start a movement.', followup: 'Empathy is the start. Action follows.' },
    { id: 'umq18', mentor: 'Bryan Stevenson', quote: 'You cannot be an effective problem solver from a distance.', useWhen: 'When you analyze instead of approach.', followup: 'Get close to the person closest to the harm.' },
    { id: 'umq19', mentor: 'Bryan Stevenson', quote: 'Each of us is more than the worst thing we have ever done.', useWhen: 'When you cannot see the person behind their action.', followup: 'Including yourself.' },
    { id: 'umq20', mentor: 'James Baldwin', quote: 'Not everything that is faced can be changed, but nothing can be changed until it is faced.', useWhen: 'When avoidance feels easier.', followup: 'Face it. Then change it.' },
    { id: 'umq21', mentor: 'Brene Brown', quote: 'Courage is contagious.', useWhen: 'When you are first to speak up.', followup: 'You may move others without knowing.' },
    { id: 'umq22', mentor: 'Brene Brown', quote: 'Stop walking through the world looking for confirmation that you do not belong.', useWhen: 'When you doubt your right to speak up.', followup: 'You belong.' },
    { id: 'umq23', mentor: 'Glennon Doyle', quote: 'We can do hard things.', useWhen: 'When the intervention feels too hard.', followup: 'You can.' },
    { id: 'umq24', mentor: 'Toni Morrison', quote: 'If there is a book that you want to read, but it has not been written yet, you must be the one to write it.', useWhen: 'When the change you want does not exist.', followup: 'Make it.' },
    { id: 'umq25', mentor: 'Audre Lorde', quote: 'I am deliberate and afraid of nothing.', useWhen: 'When you want to claim your power.', followup: 'You can be both afraid and deliberate.' },
    { id: 'umq26', mentor: 'Bell Hooks', quote: 'The function of art is to do more than tell it like it is; it is to imagine what is possible.', useWhen: 'When you cannot see how to change.', followup: 'Imagine first.' },
    { id: 'umq27', mentor: 'Octavia Butler', quote: 'All that you touch you change.', useWhen: 'When you wonder if your action matters.', followup: 'It matters.' },
    { id: 'umq28', mentor: 'Ella Baker', quote: 'Strong people do not need strong leaders.', useWhen: 'When you wait for someone else to start.', followup: 'Start yourself.' },
    { id: 'umq29', mentor: 'Fannie Lou Hamer', quote: 'Nobody is free until everybody is free.', useWhen: 'When you advocate only for those like you.', followup: 'Everyone or no one.' },
    { id: 'umq30', mentor: 'Frederick Douglass', quote: 'Power concedes nothing without a demand.', useWhen: 'When you hope politely waiting will work.', followup: 'Make the demand.' },
    { id: 'umq31', mentor: 'Sojourner Truth', quote: 'Truth is powerful and it prevails.', useWhen: 'When the lie is winning.', followup: 'Tell the truth anyway.' },
    { id: 'umq32', mentor: 'Harriet Tubman', quote: 'Every great dream begins with a dreamer.', useWhen: 'When you doubt your vision.', followup: 'Dream big.' },
    { id: 'umq33', mentor: 'Yuri Kochiyama', quote: 'Remember that consciousness is power.', useWhen: 'When you wonder what to do.', followup: 'Stay awake.' },
    { id: 'umq34', mentor: 'Bayard Rustin', quote: 'We are all one, and if we do not know it, we will learn it the hard way.', useWhen: 'When others seem separate from you.', followup: 'We are one.' },
    { id: 'umq35', mentor: 'James Baldwin', quote: 'Children have never been very good at listening to their elders, but they have never failed to imitate them.', useWhen: 'When you wonder what young people are watching.', followup: 'They are watching you.' },
    { id: 'umq36', mentor: 'Audre Lorde', quote: 'I am not free while any woman is unfree, even when her shackles are very different from my own.', useWhen: 'When you advocate only across familiar identities.', followup: 'Expand your circle.' },
    { id: 'umq37', mentor: 'Howard Zinn', quote: 'Small acts, when multiplied by millions of people, can transform the world.', useWhen: 'When your action feels too small.', followup: 'You are one of millions.' },
    { id: 'umq38', mentor: 'Jane Addams', quote: 'The good we secure for ourselves is precarious and uncertain until it is secured for all of us and incorporated into our common life.', useWhen: 'When you keep your good for yourself.', followup: 'Share it.' },
    { id: 'umq39', mentor: 'Pauli Murray', quote: 'Hope is a song in a weary throat.', useWhen: 'When you cannot find your voice.', followup: 'Sing anyway.' },
    { id: 'umq40', mentor: 'Bryan Stevenson', quote: 'Just mercy is something we believe in, not something we do until we are tired.', useWhen: 'When you want to stop.', followup: 'Mercy is a discipline.' }
  ];

  var IDENTITY_HARASSMENT_DEEP = [
    {
      id: 'ihd1',
      identityTargeted: 'Race / Ethnicity',
      commonForms: [
        'Slurs and racist language',
        'Mocking accents',
        'Stereotyping',
        'Exclusion based on race',
        'Mocking cultural foods, clothing, hair',
        'Microaggressions ("where are you really from")',
        'Hair touching',
        'Tone policing'
      ],
      whyItHurts: 'Racial harassment tells students they do not belong in their own school. Compounds with every incident.',
      legalProtections: 'Title VI, Civil Rights Act of 1964. State anti-discrimination laws.',
      whatBystandersCanDo: [
        'Interrupt slurs',
        'Validate target\'s experience',
        'Report patterns',
        'Stand visibly in solidarity',
        'Educate self on racial harm'
      ],
      systemicTactics: [
        'Track racial discipline disparities',
        'Push for culturally responsive curriculum',
        'Support BIPOC student organizations',
        'Engage parents of all backgrounds',
        'Affinity group support'
      ]
    },
    {
      id: 'ihd2',
      identityTargeted: 'LGBTQ+',
      commonForms: [
        'Slurs (faggot, dyke, etc.)',
        'Misgendering',
        'Deadnaming',
        'Mocking gender expression',
        'Outing without consent',
        'Stereotyping',
        'Exclusion from gendered spaces',
        'Sexualized commentary'
      ],
      whyItHurts: 'LGBTQ harassment creates hostile climate and is linked to higher rates of mental health issues, suicide.',
      legalProtections: 'Title IX (when sex-based), state non-discrimination laws, Title VI in some contexts.',
      whatBystandersCanDo: [
        'Interrupt slurs',
        'Use correct names and pronouns',
        'Stand visibly as ally',
        'Refuse to participate in outing',
        'Report patterns'
      ],
      systemicTactics: [
        'Support GSA',
        'Push for inclusive curriculum',
        'Trans-affirming bathroom policies',
        'Staff training on LGBTQ youth',
        'Family engagement on LGBTQ topics'
      ]
    },
    {
      id: 'ihd3',
      identityTargeted: 'Disability',
      commonForms: [
        'Slurs (retard, etc.)',
        'Mocking of disability features',
        'Imitation of disability',
        'Exclusion based on access needs',
        'Refusal to accommodate',
        'Dismissing as faking',
        'Public mockery',
        'Sabotaging accommodations'
      ],
      whyItHurts: 'Disability harassment compounds with system\'s tendency to dismiss disabled experience.',
      legalProtections: 'Section 504, ADA, IDEA, state non-discrimination laws.',
      whatBystandersCanDo: [
        'Interrupt ableist language',
        'Support accommodations being used',
        'Stand with disabled peers visibly',
        'Use identity-first language',
        'Report patterns'
      ],
      systemicTactics: [
        'Support disability student org',
        'Push for accessibility improvements',
        'Disability awareness education',
        'Hold administration accountable',
        'Push for trauma-informed approach'
      ]
    },
    {
      id: 'ihd4',
      identityTargeted: 'Religion',
      commonForms: [
        'Mocking religious practices',
        'Stereotyping',
        'Vandalism of religious items',
        'Exclusion from social events on religious grounds',
        'Insistence on Christianity-dominant calendar',
        'Anti-Semitic, Islamophobic, anti-Hindu, anti-Sikh harassment'
      ],
      whyItHurts: 'Religious harassment connects to deep family and cultural identity.',
      legalProtections: 'Title VI, First Amendment, state non-discrimination laws.',
      whatBystandersCanDo: [
        'Learn about other religions',
        'Interrupt mockery',
        'Stand with religious peers',
        'Advocate for inclusive calendar',
        'Report vandalism or harassment'
      ],
      systemicTactics: [
        'Push for religious accommodation policies',
        'Inclusive holiday calendar',
        'Cultural competency training',
        'Interfaith student programs',
        'Family engagement'
      ]
    },
    {
      id: 'ihd5',
      identityTargeted: 'National Origin / Immigration Status',
      commonForms: [
        'Mocking accents',
        '"Go back to your country" comments',
        'Outing immigration status',
        'Stereotyping immigrants',
        'Exclusion based on language',
        'Mocking traditional clothing or food'
      ],
      whyItHurts: 'National origin harassment is often racial harassment in disguise.',
      legalProtections: 'Title VI, immigration laws, state non-discrimination laws.',
      whatBystandersCanDo: [
        'Interrupt nationality-based mockery',
        'Refuse to participate in immigration outing',
        'Support multilingual education',
        'Stand with immigrant peers'
      ],
      systemicTactics: [
        'Push for ESL/ELL improvements',
        'Sanctuary policies',
        'Family engagement in home language',
        'Cultural competency training',
        'Immigrant rights education'
      ]
    },
    {
      id: 'ihd6',
      identityTargeted: 'Socioeconomic Status',
      commonForms: [
        'Mocking clothes or shoes',
        'Exclusion from social events that cost money',
        'Insulting based on home address',
        'Free/reduced lunch teasing',
        'Hand-me-down mockery',
        'Excluding from group based on what they cannot afford'
      ],
      whyItHurts: 'Class harassment is often invisible to those with means.',
      legalProtections: 'Limited federal protection. State law varies.',
      whatBystandersCanDo: [
        'Refuse to participate in class mockery',
        'Be conscious of cost in group plans',
        'Stand with peers from different backgrounds',
        'Support universal free programs'
      ],
      systemicTactics: [
        'Push for universal free meals',
        'Equity in extracurricular access',
        'No-cost school activities',
        'Conscious dress codes',
        'Class-conscious programming'
      ]
    },
    {
      id: 'ihd7',
      identityTargeted: 'Gender (especially girls)',
      commonForms: [
        'Sexual harassment',
        'Body commentary',
        'Sexual rumors',
        'Slut-shaming',
        'Inequitable treatment in class',
        'Dress code policing',
        'Sexual assault'
      ],
      whyItHurts: 'Gender-based harassment is widespread and often dismissed.',
      legalProtections: 'Title IX, state laws, federal civil rights.',
      whatBystandersCanDo: [
        'Interrupt body commentary',
        'Refuse to participate in rumors',
        'Support targets',
        'Report sexual harassment'
      ],
      systemicTactics: [
        'Push for Title IX enforcement',
        'Body-positive programming',
        'Consent education',
        'Equitable dress codes',
        'Anti-sexual harassment training'
      ]
    },
    {
      id: 'ihd8',
      identityTargeted: 'Body Size',
      commonForms: [
        'Body shaming',
        'Mocking weight',
        'Diet talk around heavier peers',
        'Eating commentary',
        'Stereotyping based on size',
        'Sports performance assumptions'
      ],
      whyItHurts: 'Body shaming connects to disordered eating, mental health, and self-worth.',
      legalProtections: 'Some state laws. Limited federal protection.',
      whatBystandersCanDo: [
        'Refuse to participate in body commentary',
        'Compliment beyond appearance',
        'Stand with body-shamed peers',
        'Educate on health vs. size'
      ],
      systemicTactics: [
        'Body-positive PE',
        'Anti-diet culture in cafeteria',
        'Mental health resources',
        'NEDA programming',
        'Inclusive dress codes'
      ]
    }
  ];

  var COALITION_BUILDING_DEEP = [
    {
      id: 'cbd1',
      stage: 'Finding your people',
      steps: [
        'Identify the issue you want to address',
        'Notice who else is affected',
        'Approach 1-2 people who share your concern',
        'Listen to their experiences',
        'Find common ground',
        'Suggest meeting again'
      ],
      whatItFeelsLike: 'Lonely at first. Then less lonely.',
      tips: ['Start small', 'Listen more than talk', 'Be patient with trust building']
    },
    {
      id: 'cbd2',
      stage: 'Building shared analysis',
      steps: [
        'Meet regularly',
        'Share experiences',
        'Identify patterns',
        'Name the systemic issue',
        'Distinguish individual incidents from system',
        'Build shared language'
      ],
      whatItFeelsLike: 'Clarifying. Empowering. Sometimes overwhelming.',
      tips: ['Validate emotions', 'Use specific examples', 'Build vocabulary together']
    },
    {
      id: 'cbd3',
      stage: 'Defining goals',
      steps: [
        'Brainstorm what change would look like',
        'Distinguish short-term from long-term',
        'Prioritize',
        'Make goals specific and measurable',
        'Write them down',
        'Share with each member'
      ],
      whatItFeelsLike: 'Focused. Energizing. Sometimes contentious.',
      tips: ['Be specific', 'Be ambitious AND achievable', 'Build consensus']
    },
    {
      id: 'cbd4',
      stage: 'Planning action',
      steps: [
        'Choose first action',
        'Assign roles',
        'Set timeline',
        'Anticipate obstacles',
        'Plan response to pushback',
        'Communicate plan to coalition'
      ],
      whatItFeelsLike: 'Concrete. Empowering.',
      tips: ['Plan for failure', 'Plan for success', 'Plan for in-between']
    },
    {
      id: 'cbd5',
      stage: 'Taking action',
      steps: [
        'Execute the plan',
        'Document what happens',
        'Communicate with coalition',
        'Adjust as needed',
        'Take care of each other'
      ],
      whatItFeelsLike: 'Scary AND empowering.',
      tips: ['Stay grounded', 'Stay connected', 'Stay strategic']
    },
    {
      id: 'cbd6',
      stage: 'Evaluating outcome',
      steps: [
        'Gather coalition',
        'Review what happened',
        'What worked?',
        'What did not?',
        'What did we learn?',
        'What is next?'
      ],
      whatItFeelsLike: 'Reflective. Sometimes hard.',
      tips: ['Honor what was accomplished', 'Learn from what failed', 'Plan next steps']
    },
    {
      id: 'cbd7',
      stage: 'Sustaining coalition',
      steps: [
        'Regular meetings',
        'Celebrate wins',
        'Honor exits',
        'Welcome new members',
        'Document history',
        'Pass on leadership'
      ],
      whatItFeelsLike: 'Long-term. Sometimes tedious. Always important.',
      tips: ['Build infrastructure', 'Develop new leaders', 'Document for future']
    }
  ];

  var BYSTANDER_SCENARIOS_EXTENDED = [
    {
      id: 'bse1',
      title: 'Hallway Slur',
      setup: 'You are walking to class. You hear a peer say a racist slur to another student. The target keeps walking. The peer laughs with friends.',
      whatYouFeel: 'Stomach drops. Heart races. Want to disappear.',
      whatYourBrainTellsYou: 'It is not your fight. The target is handling it. Speaking up will make it worse.',
      whatIsActuallyHappening: 'Silence reinforces that the slur is acceptable. Target heard it. So did witnesses.',
      lowRiskMoves: [
        'Catch the target\'s eye and nod (witness acknowledgment)',
        'Tell a trusted adult what you heard, with names and time',
        'Privately text the target: "I heard what they said. That was not okay. Are you okay?"'
      ],
      mediumRiskMoves: [
        'Say in earshot: "That word is not okay."',
        'Walk with the target if heading same direction',
        'Tell the speaker directly later: "What you said hurt. Do not say that around me."'
      ],
      highRiskMoves: [
        'Interrupt directly: "Stop. That word is racist. Knock it off."',
        'Stand between speaker and target',
        'Pull friends into a coalition that does not tolerate slurs'
      ],
      afterCare: [
        'Tell someone safe what you saw',
        'Check on target the next day',
        'Document if pattern: who, what, when',
        'Process your own reaction; it takes courage'
      ]
    },
    {
      id: 'bse2',
      title: 'Group Chat Pile-On',
      setup: 'Your friend group chat has 6 people. One person is being mocked over and over for something they shared in confidence. They are no longer responding.',
      whatYouFeel: 'Uncomfortable. Want to scroll past. Worried about being targeted next.',
      whatYourBrainTellsYou: 'It is just jokes. They will get over it. Speaking up will turn the chat on me.',
      whatIsActuallyHappening: 'Group dynamic is becoming unsafe. Target is being shamed publicly. Your silence reads as agreement.',
      lowRiskMoves: [
        'Privately DM the target: "Hey, that was a lot. Are you okay?"',
        'Change the subject in the chat',
        'Leave the chat quietly with no explanation'
      ],
      mediumRiskMoves: [
        'In chat: "Lets ease up on ___, this is a lot."',
        'In chat: "Can we change the topic?"',
        'Privately message 1-2 friends: "I am not into this. Lets stop."'
      ],
      highRiskMoves: [
        'In chat: "What is happening here is mean. We can do better."',
        'Call out specific person: "What you just said was hurtful."',
        'Leave chat publicly: "I am out. This is not how I roll."'
      ],
      afterCare: [
        'Reach out to target with concrete support',
        'Decide if the group chat is one you want to be in',
        'Process with someone outside the group',
        'Notice if pattern of cruelty in this group'
      ]
    },
    {
      id: 'bse3',
      title: 'Lunch Table Exclusion',
      setup: 'A new student approaches the lunch table you usually sit at. Your friends move bags to take up the empty seats. The student walks away.',
      whatYouFeel: 'Embarrassed for the new student. Awkward about your friends.',
      whatYourBrainTellsYou: 'It was unintentional. They can sit elsewhere. Not your business.',
      whatIsActuallyHappening: 'Coordinated exclusion. New student got the message. Group hierarchy reinforced.',
      lowRiskMoves: [
        'Call after them: "Hey, you can sit here, I will move my bag."',
        'Ask one friend privately later: "Did we mean to do that?"',
        'Sit with the new student tomorrow'
      ],
      mediumRiskMoves: [
        'In the moment: "Make space, there is room."',
        'Get up and find the new student',
        'Eat at a different table that day'
      ],
      highRiskMoves: [
        'Call it out: "What just happened was not cool. Why did we do that?"',
        'Bring the new student into the group consistently',
        'Reset the table norms with friends'
      ],
      afterCare: [
        'Check in with the new student',
        'Reflect on your group dynamic',
        'Make connection a habit, not exception'
      ]
    },
    {
      id: 'bse4',
      title: 'Teacher Singling Out a Student',
      setup: 'A teacher repeatedly calls on one student to point out wrong answers. The student\'s face is red. Class is silent.',
      whatYouFeel: 'Worried for the student. Afraid to disagree with teacher.',
      whatYourBrainTellsYou: 'Teacher knows best. Cannot interfere with adult.',
      whatIsActuallyHappening: 'Public shaming. Power abuse. Other students learning that this is acceptable.',
      lowRiskMoves: [
        'Privately tell the student later: "I noticed what happened. That was not fair."',
        'Tell a trusted adult about what you saw',
        'Document the pattern if it repeats'
      ],
      mediumRiskMoves: [
        'Raise your hand and volunteer an answer to break the pattern',
        'After class, talk to a counselor about what you saw',
        'Talk to parent or guardian about what you witnessed'
      ],
      highRiskMoves: [
        'Tell the principal in writing',
        'Help the targeted student file a complaint',
        'Organize peer letter to administration'
      ],
      afterCare: [
        'Protect your relationship with the student',
        'Be a witness if needed',
        'Process your own feelings about authority'
      ]
    },
    {
      id: 'bse5',
      title: 'Social Media Photo Without Consent',
      setup: 'A photo of a classmate has been shared without their consent. It is being passed around. The classmate does not know yet.',
      whatYouFeel: 'Sick. Frantic. Wanting to do something but not knowing what.',
      whatYourBrainTellsYou: 'It is already out there. There is nothing you can do.',
      whatIsActuallyHappening: 'Privacy violation. Possible harassment or assault. Time matters.',
      lowRiskMoves: [
        'Do not forward the photo to anyone',
        'Tell the target privately so they know',
        'Tell a trusted adult immediately'
      ],
      mediumRiskMoves: [
        'In group chats: "Stop sharing this. It is not yours to share."',
        'Help the target report on platforms',
        'Document who is sharing and when'
      ],
      highRiskMoves: [
        'Tell the school administration',
        'Encourage the target to involve law enforcement if appropriate',
        'Stand up publicly against the spread'
      ],
      afterCare: [
        'Support the target ongoing',
        'Process your own distress',
        'Push for school education on consent and digital privacy'
      ]
    },
    {
      id: 'bse6',
      title: 'Coach Public Berating',
      setup: 'A coach yells at a single player for an extended time after a loss. The player is younger. Other players look down.',
      whatYouFeel: 'Anger. Helplessness. Solidarity with the targeted player.',
      whatYourBrainTellsYou: 'This is how coaches are. Toughness culture.',
      whatIsActuallyHappening: 'Public humiliation. Possibly verbally abusive. Other players learn to fear the coach.',
      lowRiskMoves: [
        'Sit by the targeted player on the bus',
        'Check on them privately later',
        'Talk to your parents about what happened'
      ],
      mediumRiskMoves: [
        'Talk to athletic director about coaching style',
        'Encourage targeted player to talk to athletic director',
        'Talk to parents of targeted player'
      ],
      highRiskMoves: [
        'Report to school administration in writing',
        'Quit the team in protest if pattern',
        'Organize parent or player complaint'
      ],
      afterCare: [
        'Protect your relationship with target',
        'Reflect on coaching culture',
        'Decide your own line'
      ]
    },
    {
      id: 'bse7',
      title: 'Religious Mockery',
      setup: 'A classmate is wearing religious garb (hijab, kippah, cross, turban). Another student is mimicking them behind their back. Several students are laughing.',
      whatYouFeel: 'Disgust. Want to walk away. Sympathy.',
      whatYourBrainTellsYou: 'They probably did not see it. It is a private joke.',
      whatIsActuallyHappening: 'Religious harassment. Other students may join. Target may sense the change.',
      lowRiskMoves: [
        'Walk over to stand near the target',
        'Engage the target in conversation about something else',
        'Tell mocking student privately: "Not cool"'
      ],
      mediumRiskMoves: [
        'Tell the target what you saw, give them choice on how to handle',
        'Tell a trusted teacher',
        'Talk to mocking student directly: "What you did was disrespectful."'
      ],
      highRiskMoves: [
        'Report to administration as religious harassment',
        'Help target file formal complaint',
        'Educate peer group on religious diversity'
      ],
      afterCare: [
        'Continue checking in with target',
        'Stand visibly with them in subsequent encounters',
        'Push for school cultural competence education'
      ]
    },
    {
      id: 'bse8',
      title: 'Disability Mocking',
      setup: 'A student with a visible disability is being imitated by another student behind their back. The imitator pretends to walk with a limp.',
      whatYouFeel: 'Sick. Want to do something. Worried about being targeted next.',
      whatYourBrainTellsYou: 'Maybe they do not realize how it looks. They are just joking.',
      whatIsActuallyHappening: 'Disability harassment. Cruel mockery. Target may have already heard echoes.',
      lowRiskMoves: [
        'Walk over to the disabled student and start a conversation',
        'Tell the mocking student: "Knock it off"',
        'Document and tell a trusted teacher'
      ],
      mediumRiskMoves: [
        'Confront mocking student directly: "What you are doing is ableist."',
        'Tell counselor what you saw',
        'Tell the target if they did not see it, let them decide what to do'
      ],
      highRiskMoves: [
        'File formal complaint with administration',
        'Help disabled student\'s family report',
        'Push for school disability awareness education'
      ],
      afterCare: [
        'Stand visibly with the disabled student',
        'Continue check-ins',
        'Process your own discomfort'
      ]
    },
    {
      id: 'bse9',
      title: 'Trans Misgendering',
      setup: 'A teacher repeatedly uses the wrong pronouns for a trans student despite being corrected. The student stops correcting.',
      whatYouFeel: 'Frustrated for the student. Worried about authority.',
      whatYourBrainTellsYou: 'Maybe the teacher is trying. The student should not have to correct constantly.',
      whatIsActuallyHappening: 'Misgendering by adult in position of power. Student gave up. Other students learning that misgendering is okay.',
      lowRiskMoves: [
        'Use the student\'s correct pronouns yourself, consistently',
        'Privately ask the student how to support',
        'Tell counselor what you noticed'
      ],
      mediumRiskMoves: [
        'In class, casually use correct pronouns when referring to the student',
        'Tell the principal what you observed',
        'Help the student\'s family advocate'
      ],
      highRiskMoves: [
        'File formal complaint about teacher conduct',
        'Help organize trans-affirming student group',
        'Push for staff trans education'
      ],
      afterCare: [
        'Continue using correct pronouns',
        'Stand visibly as ally',
        'Support trans community at school'
      ]
    },
    {
      id: 'bse10',
      title: 'Body Shaming at Lunch',
      setup: 'Friends are loudly commenting on a classmate\'s food choices, body size, or eating habits. Classmate is within earshot.',
      whatYouFeel: 'Embarrassed for the classmate. Awkward.',
      whatYourBrainTellsYou: 'They probably did not hear. Maybe they will not notice.',
      whatIsActuallyHappening: 'Body shaming. Classmate likely heard. Internalized harm in real time.',
      lowRiskMoves: [
        'Change the subject',
        'Compliment the classmate on something unrelated',
        'Sit with classmate next day'
      ],
      mediumRiskMoves: [
        'Tell friends: "Knock it off, that is mean"',
        'Apologize to classmate privately',
        'Talk to friends individually about body shaming'
      ],
      highRiskMoves: [
        'Call it out loud in real time: "What you just said is body shaming. Stop."',
        'Refuse to participate in body talk',
        'Push for school body positivity programming'
      ],
      afterCare: [
        'Build relationship with classmate',
        'Reset group norms',
        'Process your own body image'
      ]
    }
  ];

  var COURAGE_DEEP_DIVE = [
    {
      id: 'cdd1',
      level: 'micro courage',
      title: 'Smile at someone alone',
      whyItCounts: 'Acknowledgment is the foundation of belonging. A smile says: I see you.',
      practiceSteps: [
        'Notice when you pass someone alone',
        'Make eye contact briefly',
        'Smile slightly',
        'Move on without expectation'
      ],
      whenToUse: 'Daily. Multiple times.',
      buildsUpTo: 'Saying hi. Then having conversation. Then offering to sit together.'
    },
    {
      id: 'cdd2',
      level: 'micro courage',
      title: 'Make eye contact during hard moment',
      whyItCounts: 'Eye contact says: I see what is happening. I will not look away.',
      practiceSteps: [
        'Notice when someone is being targeted',
        'Catch their eye',
        'Hold it briefly',
        'Let them know you are present'
      ],
      whenToUse: 'When you cannot intervene loudly, eye contact is itself a witness move.',
      buildsUpTo: 'Following up after. Then sitting with them. Then standing with them.'
    },
    {
      id: 'cdd3',
      level: 'micro courage',
      title: 'Sit with the new kid',
      whyItCounts: 'New kids are often isolated. One person who sits with them changes their week.',
      practiceSteps: [
        'Notice when a new student is alone',
        'Approach lunch table with one question',
        'Introduce yourself',
        'Ask one question about them'
      ],
      whenToUse: 'First week of school. After transfer. After return from absence.',
      buildsUpTo: 'Bringing new kid into your friend group. Then helping them build their own network.'
    },
    {
      id: 'cdd4',
      level: 'micro courage',
      title: 'Compliment specifically',
      whyItCounts: 'Specific compliments mean you actually noticed. Vague ones mean you said something to be nice.',
      practiceSteps: [
        'Notice one specific thing about a person',
        'Mention it briefly',
        'No expectation of return'
      ],
      whenToUse: 'When you have a real observation. Not when fishing for connection.',
      buildsUpTo: 'Being known for noticing. Being trusted for honesty.'
    },
    {
      id: 'cdd5',
      level: 'small courage',
      title: 'Speak up against a slur in a friend group',
      whyItCounts: 'Friend groups are where slurs go unchallenged. Your no there matters.',
      practiceSteps: [
        'Notice a slur',
        'Say: "Lets not use that word"',
        'Be calm but firm',
        'Move conversation along'
      ],
      whenToUse: 'When safe enough to do.',
      buildsUpTo: 'Naming patterns. Then leaving spaces that will not change.'
    },
    {
      id: 'cdd6',
      level: 'small courage',
      title: 'Apologize when you were wrong',
      whyItCounts: 'Apology is harder than confrontation. Real apology repairs.',
      practiceSteps: [
        'Notice when you hurt someone',
        'Approach them privately',
        'Name what you did',
        'No excuses',
        'Ask what they need'
      ],
      whenToUse: 'When you have hurt someone, however small.',
      buildsUpTo: 'Reputation for accountability. Stronger relationships.'
    },
    {
      id: 'cdd7',
      level: 'small courage',
      title: 'Tell a trusted adult about something you saw',
      whyItCounts: 'Adults can intervene in ways students cannot. But they need to know.',
      practiceSteps: [
        'Identify trusted adult',
        'Tell them specifically what happened',
        'Include date, time, who saw',
        'Decline if asked to be the only reporter unless ready'
      ],
      whenToUse: 'When you witness harm that adults need to address.',
      buildsUpTo: 'Multiple trusted adults. Being known as someone who tells.'
    },
    {
      id: 'cdd8',
      level: 'small courage',
      title: 'Decline to participate in cruelty',
      whyItCounts: 'You do not have to lead resistance. Quiet refusal to participate counts.',
      practiceSteps: [
        'Notice when cruelty is happening',
        'Do not laugh',
        'Do not engage',
        'Walk away if able'
      ],
      whenToUse: 'When you cannot intervene loudly.',
      buildsUpTo: 'Active opposition. Then mobilizing others.'
    },
    {
      id: 'cdd9',
      level: 'medium courage',
      title: 'Confront a friend privately about hurtful behavior',
      whyItCounts: 'Friends listen better than strangers. Private confrontation preserves relationship.',
      practiceSteps: [
        'Pick a private moment',
        'Open with: "I have something to say. I care about you."',
        'Name what they did',
        'Name impact',
        'Listen to their side'
      ],
      whenToUse: 'When friend has done something hurtful.',
      buildsUpTo: 'Closer friendships. Group culture shift.'
    },
    {
      id: 'cdd10',
      level: 'medium courage',
      title: 'Walk away from a friend group that does harm',
      whyItCounts: 'Sometimes the group will not change. Your departure is your statement.',
      practiceSteps: [
        'Identify the pattern',
        'Talk to one friend first',
        'Set boundary',
        'Spend less time there',
        'Build elsewhere'
      ],
      whenToUse: 'When friends consistently harm others and refuse to change.',
      buildsUpTo: 'New friend groups. Stronger sense of values.'
    },
    {
      id: 'cdd11',
      level: 'medium courage',
      title: 'Report to a counselor or principal',
      whyItCounts: 'Internal reporting moves issues to people who can act.',
      practiceSteps: [
        'Decide what you want to report',
        'Write it down: who, what, when, where',
        'Schedule meeting or stop by office',
        'Document the report'
      ],
      whenToUse: 'For pattern violations or serious incidents.',
      buildsUpTo: 'External reporting if internal fails.'
    },
    {
      id: 'cdd12',
      level: 'medium courage',
      title: 'Speak up in a group meeting',
      whyItCounts: 'Public dissent changes group dynamics.',
      practiceSteps: [
        'Prepare what you want to say',
        'Wait for natural opening',
        'State your position calmly',
        'Do not back down if pushed'
      ],
      whenToUse: 'When group is making a bad decision.',
      buildsUpTo: 'Influence in group decisions.'
    },
    {
      id: 'cdd13',
      level: 'big courage',
      title: 'File a formal complaint',
      whyItCounts: 'Formal complaints create accountability and record.',
      practiceSteps: [
        'Document everything',
        'Get help from a trusted adult or organization',
        'Submit formal complaint',
        'Follow through investigation'
      ],
      whenToUse: 'When informal channels fail and harm continues.',
      buildsUpTo: 'Legal advocacy. Systemic change.'
    },
    {
      id: 'cdd14',
      level: 'big courage',
      title: 'Publicly call out harmful behavior',
      whyItCounts: 'Public accountability changes public norms.',
      practiceSteps: [
        'Confirm the facts',
        'Choose your platform',
        'Be specific',
        'Center the harm, not the harmer',
        'Be ready for backlash'
      ],
      whenToUse: 'When private and internal channels failed.',
      buildsUpTo: 'Systemic change. New norms.'
    },
    {
      id: 'cdd15',
      level: 'big courage',
      title: 'Lead organizing for systemic change',
      whyItCounts: 'Individual courage builds to collective movement.',
      practiceSteps: [
        'Build coalition',
        'Articulate demands',
        'Develop strategy',
        'Execute and sustain'
      ],
      whenToUse: 'When patterns require structural change.',
      buildsUpTo: 'Lasting institutional change.'
    }
  ];

  var REPAIR_PROTOCOL_LIBRARY = [
    {
      id: 'rpl1',
      situation: 'You hurt a friend\'s feelings with a thoughtless joke',
      protocol: [
        '1. Acknowledge the harm internally. Do not minimize.',
        '2. Approach friend privately within 24 hours.',
        '3. Open: "I want to apologize for what I said about ___."',
        '4. Specifically name what you said.',
        '5. Acknowledge impact: "I see how that hurt you."',
        '6. No excuses. Do not say "I did not mean it."',
        '7. Ask: "Is there anything I can do to make this right?"',
        '8. Listen without defending.',
        '9. Commit to change.',
        '10. Follow through over time.'
      ],
      whatNotToDo: ['Wait too long', 'Apologize in front of others without checking first', 'Demand immediate forgiveness']
    },
    {
      id: 'rpl2',
      situation: 'You spread a rumor that turned out to be untrue',
      protocol: [
        '1. Acknowledge the harm done by the rumor.',
        '2. Track everyone you told.',
        '3. Tell each one the truth, and that you spread something false.',
        '4. Approach the person who was the subject of the rumor.',
        '5. Tell them: "I spread something untrue about you. I am sorry."',
        '6. Tell them specifically what you said and to whom.',
        '7. Ask what they need from you.',
        '8. Do not ask them to forgive you. That is their choice.',
        '9. Make amends in concrete way if possible.',
        '10. Reflect on what led you to spread the rumor.'
      ],
      whatNotToDo: ['Hide the rumor', 'Blame others for spreading it further', 'Minimize the impact']
    },
    {
      id: 'rpl3',
      situation: 'You were a bystander to bullying and stayed silent',
      protocol: [
        '1. Acknowledge to yourself that silence was a choice.',
        '2. Reach out to the target.',
        '3. Acknowledge: "I saw what happened. I should have said something."',
        '4. Apologize for the silence.',
        '5. Ask what they need now.',
        '6. Offer ongoing support.',
        '7. Decide what you will do next time.',
        '8. Practice the response.',
        '9. Be ready for next time.'
      ],
      whatNotToDo: ['Make it about your guilt', 'Ask target to comfort you', 'Forget to follow through']
    },
    {
      id: 'rpl4',
      situation: 'You participated in cyberbullying',
      protocol: [
        '1. Delete your contributing posts/comments.',
        '2. Reach out to target privately.',
        '3. Acknowledge what you did.',
        '4. Apologize.',
        '5. Tell others who participated that you regret it.',
        '6. Report harmful content if still up.',
        '7. Commit to digital ethics going forward.',
        '8. Educate yourself on digital harm.',
        '9. Become advocate for digital kindness.'
      ],
      whatNotToDo: ['Pretend it did not happen', 'Defend the original posts', 'Wait for target to confront you']
    },
    {
      id: 'rpl5',
      situation: 'You excluded someone from a group',
      protocol: [
        '1. Notice the exclusion happened.',
        '2. Reach out to the excluded person privately.',
        '3. Acknowledge: "I did not invite you to ___. I am sorry."',
        '4. Explain (briefly) without making excuses.',
        '5. Ask if they want to be included in future.',
        '6. Make concrete plans together.',
        '7. Address group dynamic if needed.'
      ],
      whatNotToDo: ['Pretend they were always invited', 'Blame the group', 'Promise things you will not follow through on']
    }
  ];

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
      // ── Host theme remap (consumes ctx.theme) — canonical SEL light-base pattern ──
      var _upCTheme = (ctx && ctx.theme) || {};
      var _upCHC = !!_upCTheme.isContrast, _upCDark = !_upCHC && !!_upCTheme.isDark;
      var _UPC_DARK = {'#fff':'#1e293b','#f8fafc':'#0f172a','#fafafa':'#1e293b','#f1f5f9':'#1e293b','#fef3c7':'#3a2e12','#fffbeb':'#2e2410','#fef9c3':'#3a3410','#fefce8':'#2e2a10','#fff7ed':'#2e2410','#fef2f2':'#2e1414','#fee2e2':'#3a1a1a','#fff1f2':'#2e1418','#f0fdf4':'#0b2e22','#ecfdf5':'#0e3326','#eff6ff':'#0e1f3a','#dbeafe':'#16315e','#f0f9ff':'#0c2840','#faf5ff':'#2e1b4d','#ede9fe':'#2a1a45','#f3e8ff':'#2e1b4d','#fdf4ff':'#2e1b4d','#0f172a':'#f1f5f9','#1f2937':'#e2e8f0','#334155':'#cbd5e1','#374151':'#cbd5e1','#475569':'#cbd5e1','#64748b':'#94a3b8','#94a3b8':'#94a3b8','#e5e7eb':'#334155','#e2e8f0':'#334155','#d1d5db':'#475569','#cbd5e1':'#475569','#92400e':'#fde68a','#78350f':'#fcd34d','#854d0e':'#fde68a','#a16207':'#fde047','#991b1b':'#fca5a5','#dc2626':'#f87171','#166534':'#86efac','#1e3a8a':'#93c5fd','#1e40af':'#93c5fd','#1d4ed8':'#93c5fd','#6b21a8':'#d8b4fe','#ecfeff':'#0c2e30','#0e7490':'#67e8f9','#9d174d':'#fbcfe8','#9a3412':'#fdba74'};
      var _UPC_HC = {'#fff':'#000000','#f8fafc':'#000000','#fafafa':'#000000','#f1f5f9':'#000000','#fef3c7':'#000000','#fffbeb':'#000000','#fef9c3':'#000000','#fefce8':'#000000','#fff7ed':'#000000','#fef2f2':'#000000','#fee2e2':'#000000','#fff1f2':'#000000','#f0fdf4':'#000000','#ecfdf5':'#000000','#eff6ff':'#000000','#dbeafe':'#000000','#f0f9ff':'#000000','#faf5ff':'#000000','#ede9fe':'#000000','#f3e8ff':'#000000','#fdf4ff':'#000000','#0f172a':'#ffff00','#1f2937':'#ffff00','#334155':'#ffff00','#374151':'#ffff00','#475569':'#ffff00','#64748b':'#ffff00','#94a3b8':'#ffff00','#e5e7eb':'#ffff00','#e2e8f0':'#ffff00','#d1d5db':'#ffff00','#cbd5e1':'#ffff00','#92400e':'#ffff00','#78350f':'#ffff00','#854d0e':'#ffff00','#a16207':'#ffff00','#991b1b':'#ffff00','#dc2626':'#ffff00','#166534':'#ffff00','#1e3a8a':'#ffff00','#1e40af':'#ffff00','#1d4ed8':'#ffff00','#6b21a8':'#ffff00','#ecfeff':'#000000','#0e7490':'#ffff00','#9d174d':'#ffff00','#9a3412':'#ffff00'};
      var _upC = function(hex){ return _upCHC ? (_UPC_HC[hex]||hex) : (_upCDark ? (_UPC_DARK[hex]||hex) : hex); };
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

      var BLUE = '#2563eb'; var BL = _upC('#eff6ff'); var BD = _upC('#1e3a8a');

      var TABS = [
        { id: 'roles',    icon: '\uD83D\uDC65',  label: 'Three Roles' },
        { id: 'moves',    icon: '\uD83E\uDDF1',  label: 'Upstander Moves' },
        { id: 'practice', icon: '\uD83C\uDFAD',  label: 'Practice' },
        { id: 'cycle',    icon: '\uD83D\uDD17',  label: 'Break the Cycle' },
        { id: 'pledge',   icon: '\u270D\uFE0F', label: 'My Pledge' },
        { id: 'coach',    icon: '\uD83E\uDD16',  label: 'Talk it through' },
        { id: 'reference',icon: '\uD83D\uDCDA',  label: 'Reference' },
      ];

      var exploredTabs = d.exploredTabs || {};
      if (!exploredTabs[activeTab]) { var ne = Object.assign({}, exploredTabs); ne[activeTab] = true; upd('exploredTabs', ne); }
      var exploredCount = Object.keys(exploredTabs).length;

      var tabBar = h('div', {
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid #bfdbfe', background: 'linear-gradient(180deg, #eff6ff, #dbeafe)', flexShrink: 0 }
      },
        h('div', { style: { height: '3px', background: _upC('#e2e8f0'), position: 'relative', overflow: 'hidden' } },
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
              style: { padding: '6px 14px', borderRadius: '10px', border: a ? 'none' : '1px solid ' + (explored ? '#bfdbfe' : 'transparent'), background: a ? 'linear-gradient(135deg, ' + BLUE + ', #1d4ed8)' : explored ? 'rgba(37,99,235,0.06)' : 'transparent', color: a ? '#fff' : explored ? _upC('#1e3a8a') : _upC('#94a3b8'), fontWeight: a ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', boxShadow: a ? '0 3px 12px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none' }
            }, h('span', { className: a ? 'sel-hero-icon' : '', 'aria-hidden': 'true' }, t.icon), t.label,
              explored && !a ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#60a5fa', marginLeft: '2px' } }) : null
            );
          }),
          h('span', { className: 'sel-badge', style: { marginLeft: '8px', fontSize: '10px', color: BD, fontWeight: 700, whiteSpace: 'nowrap', background: _upC('#dbeafe'), padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } }, exploredCount + '/' + TABS.length),
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
              h('p', { style: { margin: 0, color: _upC('#334155'), fontSize: 13, lineHeight: 1.5 } },
                'Understand bullying from all sides \u2014 target, bystander, and the one doing the hurting \u2014 and build the courage to break the cycle.')
            )
          ),
          // \u2500\u2500 Cross-link to Digital Wellbeing for cyberbullying \u2500\u2500
          h('div', { role: 'note', style: {
            padding: 12, marginBottom: 16,
            background: _upC('#ecfeff'), border: '1px solid #67e8f9', borderRadius: 10,
            display: 'flex', gap: 10, alignItems: 'center'
          } },
            h('span', { 'aria-hidden': 'true', style: {
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #67e8f9 0%, #06b6d4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#fff'
            } }, '\uD83D\uDCF1'),
            h('div', { style: { flex: 1, minWidth: 0, fontSize: 13, color: _upC('#0f172a'), lineHeight: 1.5 } },
              h('strong', null, 'For online bullying \u2014 '),
              'screenshots, group chats, pile-ons, photo-without-consent \u2014 open the ',
              h('strong', { style: { color: _upC('#0e7490') } }, 'Digital Wellbeing Studio'),
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
            var roleAccent = { target: _upC('#1e40af'), bully: _upC('#991b1b'), bystander: _upC('#92400e') };

            return h('div', { style: { marginBottom: 18 } },
              h('button', {
                onClick: function() { upd('scOpen', !scOpen); if (soundOn) sfxClick(); },
                'aria-expanded': scOpen ? 'true' : 'false',
                style: {
                  width: '100%', padding: '12px 14px', textAlign: 'left',
                  border: '2px solid ' + (scOpen ? '#a78bfa' : '#d8b4fe'),
                  background: scOpen ? _upC('#faf5ff') : _upC('#fdf4ff'),
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
                  h('div', { style: { fontWeight: 800, fontSize: 14, color: _upC('#6b21a8'), marginBottom: 2 } },
                    scShowResults ? 'Your role-pattern result' : 'Quick self-check \u2014 which roles do I find myself in?'),
                  h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                    scShowResults ? 'Most people are in more than one role. Tap to revisit.' : '6 questions. Honest answers only. No single \"right\" role.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#7c3aed', fontSize: 18 } }, scOpen ? '\u25BE' : '\u25B8')
              ),
              scOpen && (scShowResults
                ? // Results view
                  h('div', { 'aria-live': 'polite', style: { marginTop: 12, padding: 16, background: _upC('#fff'), border: '1px solid #d8b4fe', borderRadius: 12 } },
                    h('p', { style: { margin: '0 0 12px', fontSize: 13, lineHeight: 1.55, color: _upC('#0f172a') } },
                      h('strong', null, 'Most people are in more than one role at different times. '),
                      'Your higher-scoring roles are the ones you might look at first \u2014 but reading all three is the whole point.'),
                    h('div', { style: { display: 'grid', gap: 8, marginBottom: 14 } },
                      ['target', 'bully', 'bystander'].map(function(r) {
                        var pct = Math.round(rolePct[r] * 100);
                        return h('div', { key: r, style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 } },
                          h('div', { style: { width: 180, color: roleAccent[r], fontWeight: 700, flexShrink: 0 } }, roleLabel[r]),
                          h('div', { style: { flex: 1, background: _upC('#e2e8f0'), height: 18, borderRadius: 4, overflow: 'hidden', position: 'relative' } },
                            h('div', { style: {
                              background: 'linear-gradient(90deg, ' + roleColor[r] + ' 0%, ' + roleAccent[r] + ' 100%)',
                              height: '100%', width: pct + '%',
                              transition: 'width 0.6s ease'
                            } }),
                            h('span', { style: { position: 'absolute', right: 6, top: 0, lineHeight: '18px', fontSize: 11, fontWeight: 700, color: _upC('#0f172a') } }, pct + '%')
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
                      padding: 12, background: _upC('#fef3c7'), border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 10
                    } },
                      h('div', { style: { fontWeight: 800, fontSize: 13, color: _upC('#92400e'), marginBottom: 4 } },
                        '\u26A0\uFE0F You flagged both target and perpetrator patterns'),
                      h('p', { style: { margin: 0, fontSize: 12, lineHeight: 1.55, color: _upC('#0f172a') } },
                        'This combination has a specific name in the research \u2014 "bully-victim." It is also the group with the hardest outcomes AND the one schools usually serve worst. There is a Bully-Victim section in the role detail below \u2014 it is for you. Please read it.')
                    ),
                    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                      h('button', {
                        onClick: function() { upd({ scAnswers: {}, scShowResults: false }); if (soundOn) sfxClick(); },
                        style: { padding: '8px 14px', background: _upC('#fff'), color: _upC('#0f172a'), border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                      }, 'Retake check-in')
                    )
                  )
                : // Question view
                  h('div', { style: { marginTop: 12, padding: 16, background: _upC('#fff'), border: '1px solid #d8b4fe', borderRadius: 12 } },
                    h('p', { style: { margin: '0 0 10px', fontSize: 12, color: _upC('#475569'), lineHeight: 1.5 } },
                      'For each one: how often is this true for you?'),
                    h('div', { style: { display: 'grid', gap: 10 } },
                      SELF_CHECK_ITEMS.map(function(q) {
                        return h('div', { key: q.id, style: { padding: 10, background: _upC('#faf5ff'), borderRadius: 8 } },
                          h('div', { style: { fontSize: 13, color: _upC('#0f172a'), marginBottom: 8, lineHeight: 1.5 } }, q.text),
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
                                  background: selected ? '#7c3aed' : _upC('#fff'),
                                  color: selected ? '#fff' : _upC('#475569'),
                                  border: '1px solid ' + (selected ? '#7c3aed' : _upC('#cbd5e1')),
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
                          background: totalAnswered < SELF_CHECK_ITEMS.length ? _upC('#cbd5e1') : '#7c3aed',
                          color: totalAnswered < SELF_CHECK_ITEMS.length && _upCHC ? '#000000' : '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
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
            h('p', { style: { fontSize: '13px', color: _upC('#64748b'), margin: 0 } }, 'Every bullying situation has three roles. Understanding all three is how we break the pattern.')
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
                  border: '2px solid ' + (active ? r.color : _upC('#e5e7eb')),
                  background: active ? r.color + '18' : _upC('#fff'),
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
                  fontSize: 26, color: active ? '#fff' : _upC('#475569'),
                  boxShadow: active ? 'inset 0 1px 0 rgba(255, 255, 255, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                } }, r.icon),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: active ? BD : _upC('#374151'), lineHeight: 1.25 } }, r.title)
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
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: _upC('#94a3b8'), marginBottom: '6px' } }, 'What they might feel:'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                cur.feels.map(function(f) {
                  return h('span', { key: f, style: { padding: '3px 10px', background: _upC('#fff'), border: '1px solid ' + cur.color + '66', borderRadius: '20px', fontSize: '11px', color: _upC('#374151') } }, f);
                })
              )
            ),
            // The truth
            h('div', { style: { background: _upC('#fff'), borderRadius: '10px', padding: '12px', borderLeft: '4px solid ' + BLUE, marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: BLUE, marginBottom: '2px' } }, 'The truth:'),
              h('p', { style: { fontSize: '13px', color: _upC('#374151'), margin: 0, lineHeight: 1.6 } }, cur.truth)
            ),
            // Myth vs truth
            h('div', { style: { background: _upC('#fef3c7'), borderRadius: '10px', padding: '12px', borderLeft: '4px solid #f59e0b' } },
              h('p', { style: { fontSize: '12px', color: _upC('#92400e'), margin: 0, lineHeight: 1.6 } }, cur.myth)
            ),
            // ── Have I been here? reflection ──
            h('div', { style: { marginTop: 14 } },
              h('button', {
                onClick: function() { upd('roleReflectOpen', !roleReflectOpen); if (soundOn) sfxClick(); },
                'aria-expanded': roleReflectOpen ? 'true' : 'false',
                style: {
                  width: '100%', padding: '10px 12px', textAlign: 'left',
                  background: roleReflectOpen ? _upC('#fff') : 'transparent',
                  border: '1px dashed ' + cur.color,
                  borderRadius: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  font: 'inherit', color: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, '🪞'),
                h('span', { style: { flex: 1, fontSize: 13, fontWeight: 700, color: BD } },
                  'Have I been here? — a quiet reflection'),
                h('span', { 'aria-hidden': 'true', style: { color: _upC('#64748b'), fontSize: 14 } }, roleReflectOpen ? '▾' : '▸')
              ),
              roleReflectOpen && h('div', { style: { marginTop: 10, padding: 14, background: _upC('#fff'), border: '1px solid ' + cur.color + '66', borderRadius: 10 } },
                h('p', { style: { margin: '0 0 10px', fontSize: 12, color: _upC('#475569'), lineHeight: 1.55 } },
                  'Nobody is going to read this except you. Whatever you write stays on your device. The point is honesty — with yourself.'),
                h('label', { htmlFor: 'us-rr-' + cur.id, style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
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
                  background: ihOpen ? _upC('#faf5ff') : _upC('#fdf4ff'),
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
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#6b21a8'), marginBottom: 2 } },
                    'Identity-based harassment — when the targeting is about who you ARE'),
                  h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                    'Race, gender, sexuality, religion, disability, language. Different harms. Specific federal protections.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#7c3aed', fontSize: 18 } }, ihOpen ? '▾' : '▸')
              ),
              ihOpen && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #d8b4fe', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: _upC('#475569') } },
                  h('strong', { style: { color: _upC('#6b21a8') } }, 'Why this gets its own section: '),
                  'identity-based bullying hits differently AND has different legal/practical recourse. Most students do not know what protections they actually have.'),
                h('div', { style: { display: 'grid', gap: 10 } },
                  ihContent.map(function(c, idx) {
                    return h('div', { key: idx, className: 'us-card', style: {
                      display: 'flex', gap: 12, padding: 14, background: _upC('#faf5ff'), border: '1px solid #d8b4fe', borderRadius: 12
                    } },
                      h('div', { 'aria-hidden': 'true', style: {
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg, #a78bfa 0%, #6b21a8 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: '#fff'
                      } }, c.icon),
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontWeight: 700, fontSize: 14, color: _upC('#6b21a8'), marginBottom: 4 } }, c.title),
                        h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: _upC('#1f2937') } }, c.body)
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
                  background: pdOpen ? _upC('#ecfeff') : _upC('#f0f9ff'),
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
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#0e7490'), marginBottom: 2 } },
                    'Power dynamics — not everyone has equal room to intervene'),
                  h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                    'Honest read on why some upstander moves are safer for some students than others. The Courage Hierarchy is calibrated this way for a reason.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#0891b2', fontSize: 18 } }, pdOpen ? '▾' : '▸')
              ),
              pdOpen && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #67e8f9', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: _upC('#475569') } },
                  h('strong', { style: { color: _upC('#0e7490') } }, 'Why this section exists: '),
                  'most anti-bullying programs pretend every student has equal power to act. That puts the heaviest cost on the kids who can least afford it. Naming the math honestly is the first step.'),
                h('div', { style: { display: 'grid', gap: 10 } },
                  pdContent.map(function(c, idx) {
                    return h('div', { key: idx, className: 'us-card', style: {
                      display: 'flex', gap: 12, padding: 14, background: _upC('#ecfeff'), border: '1px solid #67e8f9', borderRadius: 12
                    } },
                      h('div', { 'aria-hidden': 'true', style: {
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg, #22d3ee 0%, #0e7490 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: '#fff'
                      } }, c.icon),
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontWeight: 700, fontSize: 14, color: _upC('#0e7490'), marginBottom: 4 } }, c.title),
                        h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: _upC('#1f2937') } }, c.body)
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
                  background: bvOpen ? _upC('#fff7ed') : '#fffaf0',
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
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#9a3412'), marginBottom: 2 } },
                    'If you have been BOTH — the bully-victim section'),
                  h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                    'When you have been targeted AND have caused harm. The clinically most-vulnerable group — and often the least well-served.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#ea580c', fontSize: 18 } }, bvOpen ? '▾' : '▸')
              ),
              bvOpen && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #fed7aa', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: _upC('#475569') } },
                  h('strong', { style: { color: _upC('#9a3412') } }, 'Why this section exists: '),
                  'a real fraction of students are in both roles. The research on this group is unambiguous — they have the worst mental health outcomes — and the systems around them are usually worst at recognizing it. If this is you, this section is for you. If it is someone you know, it might help you understand them.'),
                h('div', { style: { display: 'grid', gap: 10 } },
                  bvContent.map(function(c, idx) {
                    return h('div', { key: idx, className: 'us-card', style: {
                      display: 'flex', gap: 12, padding: 14, background: _upC('#fff7ed'), border: '1px solid #fed7aa', borderRadius: 12
                    } },
                      h('div', { 'aria-hidden': 'true', style: {
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg, #fb923c 0%, #c2410c 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: '#fff'
                      } }, c.icon),
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontWeight: 700, fontSize: 14, color: _upC('#9a3412'), marginBottom: 4 } }, c.title),
                        h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: _upC('#1f2937') } }, c.body)
                      )
                    );
                  })
                ),
                h('div', { style: {
                  marginTop: 16, padding: 12, background: _upC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 10,
                  fontSize: 12, color: _upC('#0f172a'), lineHeight: 1.55
                } },
                  h('strong', { style: { color: _upC('#991b1b') } }, 'If anything in this section is bringing up thoughts of self-harm: '),
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
          { id: 'low',    label: 'Lower-risk moves',  sub: 'Almost everyone can do these. No public confrontation required.', tone: '#16a34a', bg: _upC('#f0fdf4'), border: '#bbf7d0' },
          { id: 'medium', label: 'Moderate-risk moves', sub: 'Require some willingness to break the social spell.',           tone: '#d97706', bg: _upC('#fffbeb'), border: '#fcd34d' },
          { id: 'high',   label: 'Higher-risk moves',  sub: 'These cost you something. The impact is also bigger.',         tone: _upC('#dc2626'), bg: _upC('#fef2f2'), border: '#fecaca' }
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
              h('p', { style: { margin: 0, color: _upC('#334155'), fontSize: 13, lineHeight: 1.5 } },
                'Concrete actions, sorted by social risk. Start where you feel safe. Doing ANY of these makes you part of the answer.')
            )
          ),
          // ── Courage Hierarchy visual ladder ──
          h('div', { className: 'us-card', style: {
            padding: 14, marginBottom: 16, borderRadius: 12,
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #eff6ff 70%, #faf5ff 100%)',
            border: '1px solid #bbf7d0'
          } },
            h('div', { style: { fontSize: 12, color: _upC('#166534'), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center' } },
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
                    background: _upC('#fff'), borderRadius: 8,
                    borderLeft: '3px solid ' + rung.color,
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
                  } },
                    h('div', { style: { fontWeight: 700, fontSize: 13, color: _upC('#0f172a'), marginBottom: 1 } }, rung.label),
                    h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.5 } }, rung.desc)
                  )
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 12, color: _upC('#0f172a'), lineHeight: 1.55, textAlign: 'center', fontStyle: 'italic' } },
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
                  h('div', { style: { fontSize: 12, color: _upC('#475569') } }, tier.sub)
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
                      background: active ? tier.bg : _upC('#fff'),
                      border: '2px solid ' + (active ? tier.tone : _upC('#e5e7eb')),
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
                      h('div', { style: { fontWeight: 700, fontSize: 14, color: _upC('#0f172a'), marginBottom: 2 } }, m.move),
                      h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: active ? 'unset' : 2, WebkitBoxOrient: 'vertical',
                        overflow: active ? 'visible' : 'hidden'
                      } }, m.desc)
                    )
                  );
                })
              )
            );
          }),
          h('p', { style: { textAlign: 'center', marginTop: 14, fontSize: 12, color: _upC('#64748b'), fontStyle: 'italic' } },
            'Tap a card to expand and read the full description.'),

          // ── AI Rehearsal — practice what you would actually say ──
          h('div', { style: { marginTop: 24 } },
            h('button', {
              onClick: function() { upd('rhShown', !rhShown); if (soundOn) sfxClick(); },
              'aria-expanded': rhShown ? 'true' : 'false',
              style: {
                width: '100%', padding: '14px 16px', textAlign: 'left',
                border: '2px solid ' + (rhShown ? '#a855f7' : '#d8b4fe'),
                background: rhShown ? _upC('#faf5ff') : _upC('#fdf4ff'),
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
                h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#6b21a8'), marginBottom: 2 } },
                  'Rehearse what you would actually say'),
                h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                  'Type a situation + your draft response. An AI coach gives you specific feedback on how it might land.')
              ),
              h('span', { 'aria-hidden': 'true', style: { color: '#a855f7', fontSize: 18 } }, rhShown ? '▾' : '▸')
            ),
            rhShown && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #d8b4fe', borderRadius: 14 } },
              h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: _upC('#475569') } },
                h('strong', { style: { color: _upC('#6b21a8') } }, 'How this works: '),
                'tell the bot the situation, then write what you would say in that moment. The bot gives you 3 things: what would probably land well, what might land badly, and one tweak you could make. It is rehearsal, not script.'),
              h('label', { htmlFor: 'us-rh-sit', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'The situation'),
              h('textarea', { id: 'us-rh-sit', value: rhSituation,
                onChange: function(e) { upd('rhSituation', e.target.value); },
                placeholder: 'Example: My friend group is making fun of someone behind their back. I want to say something but I don’t want to start a fight.',
                rows: 3,
                style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('label', { htmlFor: 'us-rh-att', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Your draft — what you would say out loud'),
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
                    // Safety pre-check on combined situation + draft. If
                    // critical-tier content appears, swap the AI feedback
                    // for a coach-style break-character message + surface
                    // crisis resources (rendered via _lastTier).
                    var rhSafety = (window.SelHub && window.SelHub.safeRehearseCheck)
                      ? window.SelHub.safeRehearseCheck(rhSituation + ' ' + rhAttempt, { toolId: 'upstander_rh', onSafetyFlag: onSafetyFlag })
                      : { action: 'continue' };
                    if (rhSafety.action === 'block') {
                      upd({ rhLoading: false, rhFeedback: window.SelHub.rehearseBreakCharacterText(rhSafety.severity), _lastTier: 3 });
                      return;
                    }
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
                      upd({ rhLoading: false, rhFeedback: (r || '').trim(), _lastTier: rhSafety.action === 'nudge' ? 2 : 0 });
                      if (soundOn) sfxBrave();
                      tryAwardBadge('rehearsed', 15);
                      if (announceToSR) announceToSR('Feedback ready');
                    }).catch(function() {
                      upd({ rhLoading: false, rhFeedback: 'The AI is not reachable right now. While you wait, try reading your draft out loud. Notice how it sounds. If it sounds like something you would actually say, that is more important than getting it perfect.' });
                    });
                  },
                  style: {
                    padding: '10px 16px',
                    background: (rhLoading || !rhSituation.trim() || !rhAttempt.trim() || !callGemini) ? _upC('#cbd5e1') : '#7c3aed',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                    cursor: (rhLoading || !rhSituation.trim() || !rhAttempt.trim() || !callGemini) ? 'not-allowed' : 'pointer',
                    fontSize: 13
                  }
                }, rhLoading ? 'Thinking…' : (callGemini ? 'Get coach feedback' : 'AI not available')),
                rhFeedback && h('button', {
                  onClick: function() { upd({ rhSituation: '', rhAttempt: '', rhFeedback: '' }); },
                  style: { padding: '10px 16px', background: _upC('#fff'), color: _upC('#0f172a'), border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                }, 'Try another')
              ),
              !callGemini && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: _upC('#6b21a8') } },
                'AI features need a connection. While offline, try reading your draft out loud.'),
              // Surface 988 / Crisis Text Line block on tier-3 (set by the
              // safety pre-check above the callGemini call in this section).
              (d._lastTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),
              rhFeedback && h('div', { 'aria-live': 'polite', className: 'us-pop', style: {
                marginTop: 14, padding: 14, background: _upC('#faf5ff'), border: '1px dashed #c084fc',
                borderRadius: 10, fontSize: 14, lineHeight: 1.6, color: _upC('#0f172a'), whiteSpace: 'pre-wrap'
              } }, rhFeedback),
              rhFeedback && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: _upC('#6b21a8'), fontStyle: 'italic' } },
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
                background: hfOpen ? _upC('#ecfdf5') : _upC('#f0fdf4'),
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
                h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#166534'), marginBottom: 2 } },
                  'If a friend is the one being targeted'),
                h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                  'Different from upstander-in-the-moment. This is about presence over time. Scripts + what to avoid.')
              ),
              h('span', { 'aria-hidden': 'true', style: { color: '#059669', fontSize: 18 } }, hfOpen ? '▾' : '▸')
            ),
            hfOpen && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #86efac', borderRadius: 14 } },
              h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: _upC('#475569') } },
                h('strong', { style: { color: _upC('#166534') } }, 'You do not have to be a counselor. '),
                'You have to be present. The single most protective thing a peer can do is not look away. Tap a moment below to see what to say and why it works.'),
              // Scripts
              h('div', { style: { display: 'grid', gap: 8, marginBottom: 16 } },
                HELPING_FRIEND.scripts.map(function(s, idx) {
                  var open = hfScriptIdx === idx;
                  return h('div', { key: idx, className: 'us-card', style: {
                    border: '1px solid ' + (open ? '#34d399' : _upC('#d1d5db')),
                    borderRadius: 10, background: open ? _upC('#f0fdf4') : _upC('#fff'), overflow: 'hidden'
                  } },
                    h('button', {
                      onClick: function() { upd('hfScriptIdx', open ? null : idx); if (soundOn) sfxClick(); },
                      'aria-expanded': open ? 'true' : 'false',
                      style: {
                        width: '100%', padding: '10px 12px', textAlign: 'left',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: 14, fontWeight: 700, color: _upC('#0f172a'),
                        display: 'flex', alignItems: 'center', gap: 8,
                        font: 'inherit'
                      }
                    },
                      h('span', { style: { flex: 1, fontWeight: 600 } }, s.situation),
                      h('span', { 'aria-hidden': 'true', style: { color: _upC('#64748b'), fontSize: 16 } }, open ? '▾' : '▸')
                    ),
                    open && h('div', { style: { padding: '0 12px 12px' } },
                      h('div', { style: { padding: 12, background: _upC('#ecfdf5'), border: '1px solid #5eead4', borderRadius: 8, marginBottom: 10 } },
                        h('div', { style: { fontSize: 11, color: _upC('#0e7490'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Try this'),
                        h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _upC('#0f172a'), fontStyle: 'italic' } }, s.say)
                      ),
                      h('div', { style: { fontSize: 11, color: _upC('#64748b'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Why it works'),
                      h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _upC('#334155') } }, s.why)
                    )
                  );
                })
              ),
              // Don'ts
              h('div', { style: { padding: 14, background: _upC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 10 } },
                h('div', { style: { fontWeight: 800, color: _upC('#991b1b'), marginBottom: 10, fontSize: 14 } },
                  h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⛔'),
                  'And what to avoid'),
                h('div', { style: { display: 'grid', gap: 10 } },
                  HELPING_FRIEND.donts.map(function(d, idx) {
                    return h('div', { key: idx },
                      h('div', { style: { fontSize: 13, fontWeight: 700, color: _upC('#0f172a'), marginBottom: 2 } }, '✗ ' + d.what),
                      h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.5 } }, d.why)
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
                background: cbOpen ? _upC('#fffbeb') : _upC('#fef9c3'),
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
                h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#92400e'), marginBottom: 2 } },
                  'Coalition Building — the move that makes the other moves possible'),
                h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                  'Three peers committed to backing each other change what any one of them can safely do. ' + COALITION_STEPS.length + ' concrete steps.')
              ),
              h('span', { 'aria-hidden': 'true', style: { color: '#d97706', fontSize: 18 } }, cbOpen ? '▾' : '▸')
            ),
            cbOpen && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #fcd34d', borderRadius: 14 } },
              h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: _upC('#475569') } },
                h('strong', { style: { color: _upC('#92400e') } }, 'Why this matters: '),
                'one person speaking up in a hostile room is risky. Three people saying "this is not okay" together is different math. Most lasting change at schools comes from coalitions, not solo heroes. Coalition building is also one of the only moves that lets lower-power students participate safely in higher-impact intervention.'),
              h('div', { style: { display: 'grid', gap: 10 } },
                COALITION_STEPS.map(function(s) {
                  return h('div', { key: s.n, className: 'us-card', style: {
                    display: 'flex', gap: 12, padding: 14, background: _upC('#fffbeb'), border: '1px solid #fcd34d', borderRadius: 12
                  } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: '#fff'
                    } }, s.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 11, color: _upC('#92400e'), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Step ' + s.n),
                      h('div', { style: { fontWeight: 700, fontSize: 14, color: _upC('#0f172a'), marginBottom: 6 } }, s.title),
                      h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: _upC('#334155') } }, s.body)
                    )
                  );
                })
              ),
              h('div', { style: {
                marginTop: 14, padding: 12, background: _upC('#f0fdf4'), border: '1px solid #86efac', borderRadius: 10
              } },
                h('p', { style: { margin: 0, fontSize: 12, lineHeight: 1.6, color: _upC('#0f172a') } },
                  h('strong', { style: { color: _upC('#166534') } }, 'The math, plainly: '),
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
                background: deOpen ? _upC('#fef2f2') : _upC('#fff1f2'),
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
                h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#991b1b'), marginBottom: 2 } },
                  'De-escalation — when your move starts making it hotter'),
                h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                  'Signals to read, words to use, body to position. Plus: when to extract instead of engage.')
              ),
              h('span', { 'aria-hidden': 'true', style: { color: _upC('#dc2626'), fontSize: 18 } }, deOpen ? '▾' : '▸')
            ),
            deOpen && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #fca5a5', borderRadius: 14 } },
              h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: _upC('#475569') } },
                h('strong', { style: { color: _upC('#991b1b') } }, 'Sometimes intervention escalates. '),
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
                      background: active ? _upC('#dc2626') : _upC('#fff'),
                      color: active ? '#fff' : _upC('#991b1b'),
                      border: '1px solid ' + (active ? _upC('#dc2626') : '#fecaca'),
                      borderRadius: 999, fontWeight: active ? 700 : 500, cursor: 'pointer', fontSize: 12
                    }
                  }, h('span', { 'aria-hidden': 'true', style: { marginRight: 4 } }, s.icon), s.label);
                })
              ),
              // Section content
              (function() {
                if (deSection === 'signals') {
                  return h('div', null,
                    h('p', { style: { margin: '0 0 10px', fontSize: 13, color: _upC('#475569'), lineHeight: 1.5 } },
                      'If you see any of these stacking up, the situation is escalating. The earlier you read them, the more options you have.'),
                    h('div', { style: { display: 'grid', gap: 8 } },
                      DEESCALATION.signals.map(function(s, idx) {
                        return h('div', { key: idx, className: 'us-card', style: {
                          display: 'flex', gap: 10, padding: 10,
                          background: _upC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 8
                        } },
                          h('span', { 'aria-hidden': 'true', style: { fontSize: 22, flexShrink: 0 } }, s.icon),
                          h('div', { style: { fontSize: 13, color: _upC('#0f172a'), lineHeight: 1.5 } }, s.label)
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
                      padding: 12, background: _upC('#fff'), border: '1px solid #fecaca', borderRadius: 10
                    } },
                      h('div', { style: { fontWeight: 700, fontSize: 14, color: _upC('#0f172a'), marginBottom: 4 } },
                        h('span', { style: { color: '#16a34a', marginRight: 6 } }, '✓'),
                        r.do
                      ),
                      h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.55, paddingLeft: 20 } }, r.why)
                    );
                  })
                );
              })(),
              h('div', { style: {
                marginTop: 14, padding: 12, background: _upC('#fffbeb'), border: '1px dashed #fcd34d', borderRadius: 10
              } },
                h('p', { style: { margin: 0, fontSize: 12, color: _upC('#0f172a'), lineHeight: 1.6 } },
                  h('strong', { style: { color: _upC('#92400e') } }, 'Floor rule: '),
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
              h('h2', { style: { margin: '0 0 2px', color: _upC('#0f172a'), fontSize: 20, lineHeight: 1.2 } }, 'Breaking the Cycle'),
              h('p', { style: { margin: 0, color: _upC('#334155'), fontSize: 13, lineHeight: 1.5 } },
                'How harm flows, why punishment fails, and what actually works \u2014 for targets, perpetrators, and witnesses alike.')
            )
          ),
          // \u2500\u2500 Harm Cycle visualization \u2500\u2500
          h('div', { className: 'us-card', style: {
            padding: 16, marginBottom: 16, borderRadius: 14,
            background: 'linear-gradient(135deg, #fef2f2 0%, #fefce8 50%, #f0fdf4 100%)',
            border: '1px solid #fcd34d'
          } },
            h('div', { style: { fontSize: 12, color: _upC('#92400e'), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' } },
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
                  h('path', { d: 'M0,0 L10,5 L0,10 Z', fill: _upC('#dc2626') })
                ),
                h('marker', { id: 'us-arrowhead-green', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' },
                  h('path', { d: 'M0,0 L10,5 L0,10 Z', fill: '#16a34a' })
                )
              ),
              // Curved arrows showing harm flowing
              h('path', { d: 'M 80,70 Q 130,40 175,70', stroke: _upC('#dc2626'), strokeWidth: 2.5, fill: 'none', 'marker-end': 'url(#us-arrowhead)' }),
              h('path', { d: 'M 215,70 Q 265,40 310,70', stroke: _upC('#dc2626'), strokeWidth: 2.5, fill: 'none', 'marker-end': 'url(#us-arrowhead)' }),
              // The cycle-breaker absorbs (no arrow leaving them \u2014 shown by a stop sign)
              h('path', { d: 'M 350,160 L 350,190', stroke: '#16a34a', strokeWidth: 3, fill: 'none', strokeDasharray: '4 3' }),
              // Node 1: Adult hurts child
              h('g', null,
                h('circle', { cx: 60, cy: 90, r: 32, fill: '#fecaca', stroke: _upC('#dc2626'), strokeWidth: 2 }),
                h('text', { x: 60, y: 96, textAnchor: 'middle', fontSize: 24 }, '\uD83D\uDC64'),
                h('text', { x: 60, y: 140, textAnchor: 'middle', fontSize: 11, fill: _upC('#991b1b'), fontWeight: 700 }, 'Hurt'),
                h('text', { x: 60, y: 155, textAnchor: 'middle', fontSize: 10, fill: _upC('#475569') }, 'at home')
              ),
              // Node 2: Child hurts smaller child
              h('g', null,
                h('circle', { cx: 195, cy: 90, r: 32, fill: '#fed7aa', stroke: '#ea580c', strokeWidth: 2 }),
                h('text', { x: 195, y: 96, textAnchor: 'middle', fontSize: 24 }, '\uD83D\uDE1E'),
                h('text', { x: 195, y: 140, textAnchor: 'middle', fontSize: 11, fill: _upC('#9a3412'), fontWeight: 700 }, 'Hurts'),
                h('text', { x: 195, y: 155, textAnchor: 'middle', fontSize: 10, fill: _upC('#475569') }, 'at school')
              ),
              // Node 3: Smaller child hurts someone smaller
              h('g', null,
                h('circle', { cx: 330, cy: 90, r: 32, fill: '#fde68a', stroke: '#ca8a04', strokeWidth: 2 }),
                h('text', { x: 330, y: 96, textAnchor: 'middle', fontSize: 24 }, '\uD83D\uDE22'),
                h('text', { x: 330, y: 140, textAnchor: 'middle', fontSize: 11, fill: _upC('#92400e'), fontWeight: 700 }, 'Could pass'),
                h('text', { x: 330, y: 155, textAnchor: 'middle', fontSize: 10, fill: _upC('#475569') }, 'it on')
              ),
              // The cycle-breaker \u2014 distinct, green, with shield
              h('g', null,
                h('circle', { cx: 405, cy: 90, r: 36, fill: '#bbf7d0', stroke: '#16a34a', strokeWidth: 3 }),
                h('text', { x: 405, y: 98, textAnchor: 'middle', fontSize: 28 }, '\uD83D\uDEE1\uFE0F'),
                h('text', { x: 405, y: 145, textAnchor: 'middle', fontSize: 11, fill: _upC('#166534'), fontWeight: 800 }, 'The cycle'),
                h('text', { x: 405, y: 158, textAnchor: 'middle', fontSize: 11, fill: _upC('#166534'), fontWeight: 800 }, 'breaker')
              ),
              // STOPS HERE label under cycle breaker
              h('rect', { x: 360, y: 188, width: 90, height: 20, rx: 10, fill: '#16a34a' }),
              h('text', { x: 405, y: 202, textAnchor: 'middle', fontSize: 11, fill: '#fff', fontWeight: 800 }, 'STOPS HERE')
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 12, color: _upC('#0f172a'), lineHeight: 1.55, textAlign: 'center' } },
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
                  background: active ? BL : _upC('#fff'),
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
                  h('h4', { style: { fontSize: 14, fontWeight: 700, color: active ? BD : _upC('#374151'), margin: 0, flex: 1 } }, b.title)
                ),
                active && h('p', { style: { fontSize: 13, lineHeight: 1.7, color: _upC('#374151'), margin: 0, paddingLeft: 52 } }, b.text)
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
                  background: repairOpen ? _upC('#fff1f2') : _upC('#fef2f2'),
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
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#991b1b'), marginBottom: 2 } },
                    'If you have been the one doing the hurting'),
                  h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                    'The hardest tab in this tool. Real repair, not performative apology. ' + steps.length + ' steps.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: _upC('#dc2626'), fontSize: 18 } }, repairOpen ? '▾' : '▸')
              ),
              repairOpen && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #fecaca', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: _upC('#475569') } },
                  h('strong', { style: { color: _upC('#991b1b') } }, 'One thing first: '),
                  'recognizing you have hurt someone is a really hard thing to do, and it is what people who can change actually do. This section assumes you are here in good faith. None of these steps are about getting forgiven — they are about doing the work whether or not forgiveness comes.'),
                // Step indicator
                h('div', { style: { display: 'flex', gap: 6, marginBottom: 14 } },
                  steps.map(function(s, i) {
                    return h('div', { key: i, 'aria-hidden': 'true', style: {
                      flex: 1, height: 6, borderRadius: 3,
                      background: i <= repairStep ? 'linear-gradient(90deg, #dc2626, #b91c1c)' : _upC('#fee2e2')
                    } });
                  })
                ),
                h('div', { 'aria-live': 'polite', className: 'us-pop us-card', style: {
                  padding: 16, borderRadius: 12, background: _upC('#fff1f2'), border: '1px solid #fca5a5'
                } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #fca5a5 0%, #dc2626 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: '#fff'
                    } }, curStep.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 11, color: _upC('#991b1b'), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Step ' + curStep.n + ' of ' + steps.length),
                      h('div', { style: { fontSize: 15, fontWeight: 700, color: _upC('#0f172a') } }, curStep.title)
                    )
                  ),
                  h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: _upC('#1f2937') } }, curStep.body)
                ),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between' } },
                  h('button', {
                    onClick: function() { if (repairStep > 0) upd('repairStep', repairStep - 1); },
                    disabled: repairStep === 0,
                    style: { padding: '8px 14px', background: _upC('#fff'), color: repairStep === 0 ? _upC('#94a3b8') : _upC('#0f172a'),
                      border: '1px solid #fecaca', borderRadius: 8, fontWeight: 600,
                      cursor: repairStep === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }
                  }, '← Back'),
                  repairStep < steps.length - 1
                    ? h('button', {
                        onClick: function() { upd('repairStep', repairStep + 1); if (soundOn) sfxClick(); },
                        style: { padding: '8px 14px', background: _upC('#dc2626'), color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
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
                      background: apOpen ? _upC('#fff1f2') : 'transparent',
                      borderRadius: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      font: 'inherit', color: 'inherit'
                    }
                  },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, '🎤'),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontWeight: 800, fontSize: 13, color: _upC('#991b1b'), marginBottom: 2 } },
                        'Rehearse your apology with AI feedback'),
                      h('div', { style: { fontSize: 11, color: _upC('#64748b'), lineHeight: 1.4 } },
                        'Type who you hurt + your draft. Coach tells you what would land, what might backfire, one tweak.')
                    ),
                    h('span', { 'aria-hidden': 'true', style: { color: _upC('#dc2626'), fontSize: 16 } }, apOpen ? '▾' : '▸')
                  ),
                  apOpen && h('div', { style: { marginTop: 10, padding: 14, background: _upC('#fff'), border: '1px solid #fecaca', borderRadius: 12 } },
                    h('p', { style: { margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: _upC('#475569') } },
                      'A real apology has no "but," no "if you felt that way." Practice here, then have the conversation for real. The AI cannot make this easier than it is, but it can help you notice what you are actually saying.'),
                    h('label', { htmlFor: 'us-ap-hurt', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                      'Who you hurt and what happened (brief)'),
                    h('textarea', { id: 'us-ap-hurt', value: apHurt,
                      onChange: function(e) { upd('apHurt', e.target.value); },
                      placeholder: 'Example: My friend J — I told the group their secret as a joke and they heard about it.',
                      rows: 2,
                      style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
                    }),
                    h('label', { htmlFor: 'us-ap-draft', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
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
                          // Safety pre-check. The Apology Coach is high-risk
                          // because students describe harm they caused —
                          // sometimes that opens into something a kid in
                          // distress needs to bring to a real adult.
                          var apSafety = (window.SelHub && window.SelHub.safeRehearseCheck)
                            ? window.SelHub.safeRehearseCheck(apHurt + ' ' + apDraft, { toolId: 'upstander_ap', onSafetyFlag: onSafetyFlag })
                            : { action: 'continue' };
                          if (apSafety.action === 'block') {
                            upd({ apLoading: false, apFeedback: window.SelHub.rehearseBreakCharacterText(apSafety.severity), _lastTier: 3 });
                            return;
                          }
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
                            upd({ apLoading: false, apFeedback: (r || '').trim(), _lastTier: apSafety.action === 'nudge' ? 2 : 0 });
                            if (soundOn) sfxBrave();
                            tryAwardBadge('rehearsed', 10);
                            if (announceToSR) announceToSR('Apology feedback ready');
                          }).catch(function() {
                            upd({ apLoading: false, apFeedback: 'The AI is not reachable right now. While you wait, read your draft out loud. Notice any "but," any "if you felt that way," any place where you are explaining yourself instead of acknowledging impact. Those are the edits to make.' });
                          });
                        },
                        style: {
                          padding: '8px 14px',
                          background: (apLoading || !apHurt.trim() || !apDraft.trim() || !callGemini) ? _upC('#cbd5e1') : _upC('#dc2626'),
                          color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                          cursor: (apLoading || !apHurt.trim() || !apDraft.trim() || !callGemini) ? 'not-allowed' : 'pointer',
                          fontSize: 13
                        }
                      }, apLoading ? 'Thinking…' : (callGemini ? 'Get coach feedback' : 'AI not available')),
                      apFeedback && h('button', {
                        onClick: function() { upd({ apHurt: '', apDraft: '', apFeedback: '' }); },
                        style: { padding: '8px 14px', background: _upC('#fff'), color: _upC('#0f172a'), border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                      }, 'Try another')
                    ),
                    !callGemini && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: _upC('#991b1b') } },
                      'AI features need a connection. While offline: read your draft out loud and listen for any \"but.\"'),
                    // Surface 988 / Crisis Text Line block on tier-3.
                    (d._lastTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),
                    apFeedback && h('div', { 'aria-live': 'polite', className: 'us-pop', style: {
                      marginTop: 12, padding: 12, background: _upC('#fff1f2'), border: '1px dashed #fca5a5',
                      borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: _upC('#0f172a'), whiteSpace: 'pre-wrap'
                    } }, apFeedback),
                    apFeedback && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: _upC('#991b1b'), fontStyle: 'italic' } },
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
                  background: afterOpen ? _upC('#eff6ff') : _upC('#f0f9ff'),
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
                  h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                    'A ' + steps.length + '-step grounding sequence for the moments right after. Built for your body, not just your brain.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: BLUE, fontSize: 18 } }, afterOpen ? '▾' : '▸')
              ),
              afterOpen && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #bfdbfe', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: _upC('#475569') } },
                  h('strong', { style: { color: BD } }, 'Take it one step at a time. '),
                  'You do not have to read all of these now. Just do the next one. Your job in the next few minutes is not to figure out the whole situation — it is to take care of your body.'),
                // Step indicator
                h('div', { style: { display: 'flex', gap: 6, marginBottom: 14 } },
                  steps.map(function(s, i) {
                    return h('div', { key: i, 'aria-hidden': 'true', style: {
                      flex: 1, height: 6, borderRadius: 3,
                      background: i <= afterStep ? 'linear-gradient(90deg, ' + BLUE + ', #1d4ed8)' : _upC('#dbeafe')
                    } });
                  })
                ),
                h('div', { 'aria-live': 'polite', className: 'us-pop us-card', style: {
                  padding: 16, borderRadius: 12, background: _upC('#f0f9ff'), border: '1px solid #93c5fd'
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
                      h('div', { style: { fontSize: 15, fontWeight: 700, color: _upC('#0f172a') } }, curStep.title)
                    )
                  ),
                  h('p', { style: { margin: '0 0 6px', fontSize: 14, lineHeight: 1.6, color: _upC('#1f2937') } }, curStep.body),
                  h('div', { style: { fontSize: 12, color: _upC('#64748b'), fontStyle: 'italic' } }, curStep.sec)
                ),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between' } },
                  h('button', {
                    onClick: function() { if (afterStep > 0) upd('afterStep', afterStep - 1); },
                    disabled: afterStep === 0,
                    style: { padding: '8px 14px', background: _upC('#fff'), color: afterStep === 0 ? _upC('#94a3b8') : _upC('#0f172a'),
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
                  background: whOpen ? _upC('#faf5ff') : _upC('#fdf4ff'),
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
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#6b21a8'), marginBottom: 2 } },
                    'For the witness who froze — healing the shame'),
                  h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                    'If you carry a memory of NOT acting when you should have — this section is for you. ' + steps.length + ' steps.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#9333ea', fontSize: 18 } }, whOpen ? '▾' : '▸')
              ),
              whOpen && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #d8b4fe', borderRadius: 14 } },
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: _upC('#475569') } },
                  h('strong', { style: { color: _upC('#6b21a8') } }, 'Most people have one. '),
                  'A memory of when they should have said something and did not. The shame is real, and the path forward is real too. This is not about absolving you — it is about helping you become someone you can trust to show up next time.'),
                // Step indicator
                h('div', { style: { display: 'flex', gap: 6, marginBottom: 14 } },
                  steps.map(function(s, i) {
                    return h('div', { key: i, 'aria-hidden': 'true', style: {
                      flex: 1, height: 6, borderRadius: 3,
                      background: i <= whStep ? 'linear-gradient(90deg, #9333ea, #6b21a8)' : _upC('#ede9fe')
                    } });
                  })
                ),
                h('div', { 'aria-live': 'polite', className: 'us-pop us-card', style: {
                  padding: 16, borderRadius: 12, background: _upC('#faf5ff'), border: '1px solid #c084fc'
                } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: '#fff'
                    } }, curStep.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 11, color: _upC('#6b21a8'), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Step ' + curStep.n + ' of ' + steps.length),
                      h('div', { style: { fontSize: 15, fontWeight: 700, color: _upC('#0f172a') } }, curStep.title)
                    )
                  ),
                  h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: _upC('#1f2937') } }, curStep.body)
                ),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between' } },
                  h('button', {
                    onClick: function() { if (whStep > 0) upd('whStep', whStep - 1); },
                    disabled: whStep === 0,
                    style: { padding: '8px 14px', background: _upC('#fff'), color: whStep === 0 ? _upC('#94a3b8') : _upC('#0f172a'),
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
              h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.55, color: _upC('#0f172a') } },
                h('strong', { style: { color: _upC('#92400e') } }, 'Reporting is a real thing that has real steps. '),
                'Most students do not know what actually happens after they tell an adult — which is one reason they hesitate. Below is what the process looks like, what you should expect, and what to do if the system stalls.'),
              h('p', { style: { margin: 0, fontSize: 12, color: _upC('#475569'), lineHeight: 1.55, fontStyle: 'italic' } },
                'Note: specifics vary by state and district. Use StopBullying.gov to look up your state\'s laws and your school\'s posted policy.')
            ),
            h('div', { style: { display: 'grid', gap: 10 } },
              US_REPORT_STEPS.map(function(s, idx) {
                return h('div', { key: idx, className: 'us-card', style: {
                  display: 'flex', gap: 14, padding: 14, border: '1px solid #cbd5e1', borderRadius: 12, background: _upC('#fff')
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
                    h('div', { style: { fontWeight: 700, fontSize: 15, color: _upC('#0f172a'), marginBottom: 6 } }, s.title),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.6, color: _upC('#334155') } }, s.body),
                    h('div', { style: { padding: 10, background: _upC('#f0f9ff'), borderLeft: '3px solid ' + BLUE, borderRadius: 6 } },
                      h('div', { style: { fontSize: 10, color: BD, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 } }, 'Tip'),
                      h('div', { style: { fontSize: 12, color: _upC('#1f2937'), lineHeight: 1.5 } }, s.tip)
                    )
                  )
                );
              })
            ),
            h('div', { style: {
              marginTop: 16, padding: 14, background: _upC('#f0fdf4'), border: '1px solid #86efac', borderRadius: 10
            } },
              h('div', { style: { fontWeight: 800, color: _upC('#166534'), marginBottom: 6, fontSize: 14 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '✊'),
                'You have rights'),
              h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7, color: _upC('#0f172a') } },
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
              h('p', { style: { fontSize: 12, color: _upC('#475569'), marginBottom: 12, lineHeight: 1.55 } },
                'If the school offers restorative conferencing, you should know what you are agreeing to. The phases below are typical of well-run conferences using International Institute for Restorative Practices (IIRP) frameworks. Quality of facilitation varies — ask questions about training and follow-through.'),
              h('div', { style: { display: 'grid', gap: 8 } },
                RESTORATIVE_WALKTHROUGH.map(function(step, idx) {
                  var phaseColor = step.phase === 'Before' ? '#0891b2' : step.phase === 'During' ? '#7c3aed' : '#059669';
                  var phaseBg    = step.phase === 'Before' ? _upC('#ecfeff') : step.phase === 'During' ? _upC('#faf5ff') : _upC('#f0fdf4');
                  return h('div', { key: idx, className: 'us-card', style: {
                    padding: 12, background: _upC('#fff'), border: '1px solid #cbd5e1', borderRadius: 10,
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
                      h('div', { style: { fontWeight: 700, fontSize: 14, color: _upC('#0f172a'), marginBottom: 4 } }, step.title),
                      h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _upC('#334155') } }, step.body)
                    )
                  );
                })
              ),
              h('p', { style: { margin: '12px 0 0', fontSize: 12, color: _upC('#64748b'), lineHeight: 1.55, fontStyle: 'italic' } },
                'Restorative practice works when it is real. It re-harms when it is performative. You can say no. You can say "not yet." You can stop the process at any point.')
            )
          );
        } else if (refSection === 'educators') {
          refBody = h('div', null,
            h('div', { className: 'us-card', style: {
              padding: 14, marginBottom: 14, background: _upC('#eff6ff'), border: '1px solid #bfdbfe', borderRadius: 10
            } },
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _upC('#0f172a') } },
                h('strong', { style: { color: BLUE } }, 'For teachers, school psychologists, counselors, administrators. '),
                'Students may show you this tool. The seven items below are the ones most often misunderstood about bullying — backed by the research in the Sources tab.')
            ),
            h('div', { style: { display: 'grid', gap: 10 } },
              (function() {
                var palettes = [
                  { from: '#60a5fa', to: '#2563eb', accent: _upC('#1e40af') },
                  { from: '#a78bfa', to: '#7c3aed', accent: _upC('#6b21a8') },
                  { from: '#fb923c', to: '#ea580c', accent: _upC('#9a3412') },
                  { from: '#34d399', to: '#059669', accent: _upC('#166534') },
                  { from: '#f87171', to: _upC('#dc2626'), accent: _upC('#991b1b') },
                  { from: '#22d3ee', to: '#0891b2', accent: _upC('#0e7490') },
                  { from: '#f472b6', to: '#db2777', accent: _upC('#9d174d') }
                ];
                return US_EDUCATORS.map(function(tip, idx) {
                  var p = palettes[idx % palettes.length];
                  return h('div', { key: idx, className: 'us-card', style: {
                    display: 'flex', gap: 14, padding: 14, border: '1px solid #cbd5e1', borderRadius: 12, background: _upC('#fff')
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
                      h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: _upC('#334155') } }, tip.body)
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
              h('p', { style: { margin: '0 0 6px', fontSize: 13, lineHeight: 1.55, color: _upC('#0f172a') } },
                h('strong', { style: { color: _upC('#92400e') } }, 'For parents and caregivers specifically. '),
                'The things that are usually missing from parent-facing bullying guidance: how to talk so your kid keeps talking, how to handle suspecting your kid is the one bullying, how to advocate at the school without becoming the adversary, and how to read warning signs.'),
              h('p', { style: { margin: 0, fontSize: 12, color: _upC('#475569'), lineHeight: 1.55, fontStyle: 'italic' } },
                'Note: cyberbullying has its own toolkit in Digital Wellbeing Studio (also in the SEL Hub). Read both if your kid spends time online.')
            ),
            h('div', { style: { display: 'grid', gap: 10 } },
              (function() {
                var palettes = [
                  { from: '#fb923c', to: '#ea580c', accent: _upC('#9a3412') },
                  { from: '#f87171', to: _upC('#dc2626'), accent: _upC('#991b1b') },
                  { from: '#60a5fa', to: '#2563eb', accent: _upC('#1e40af') },
                  { from: '#a78bfa', to: '#7c3aed', accent: _upC('#6b21a8') },
                  { from: '#34d399', to: '#059669', accent: _upC('#166534') },
                  { from: '#22d3ee', to: '#0891b2', accent: _upC('#0e7490') },
                  { from: '#f472b6', to: '#db2777', accent: _upC('#9d174d') },
                  { from: '#facc15', to: '#ca8a04', accent: _upC('#854d0e') }
                ];
                return US_PARENTS.map(function(tip, idx) {
                  var p = palettes[idx % palettes.length];
                  return h('div', { key: idx, className: 'us-card', style: {
                    display: 'flex', gap: 14, padding: 14, border: '1px solid #cbd5e1', borderRadius: 12, background: _upC('#fff')
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
                      h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: _upC('#334155') } }, tip.body)
                    )
                  );
                });
              })()
            ),
            h('div', { style: {
              marginTop: 16, padding: 14, background: _upC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 10
            } },
              h('div', { style: { fontWeight: 800, color: _upC('#991b1b'), marginBottom: 6, fontSize: 14 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '📞'),
                'When in crisis'),
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: _upC('#0f172a') } },
                'If your kid says anything that worries you about self-harm: 988 (call or text), Crisis Text Line (text HOME to 741741), or your local ER. Asking directly about suicide does not plant the idea — but staying silent can be the thing that lets it harden. Trust your gut.')
            )
          );
        } else if (refSection === 'glossary') {
          refBody = h('div', null,
            h('p', { style: { fontSize: 13, color: _upC('#475569'), marginBottom: 10, lineHeight: 1.5 } },
              'Tap any term to expand. Useful for parent conversations, IEP meetings, and getting precise about what we mean by words that get used loosely.'),
            h('div', { style: { display: 'grid', gap: 6 } },
              US_GLOSSARY.map(function(g) {
                var open = refExpanded === g.term;
                return h('div', { key: g.term, style: {
                  border: '1px solid ' + (open ? '#93c5fd' : _upC('#e2e8f0')),
                  borderRadius: 8, background: open ? _upC('#eff6ff') : _upC('#fff'), overflow: 'hidden'
                } },
                  h('button', {
                    onClick: function() { upd('refExpanded', open ? null : g.term); if (soundOn) sfxClick(); },
                    'aria-expanded': open ? 'true' : 'false',
                    style: {
                      width: '100%', padding: '10px 12px', textAlign: 'left',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 14, fontWeight: 700, color: _upC('#0f172a'),
                      display: 'flex', alignItems: 'center', gap: 8
                    }
                  },
                    h('span', { style: { flex: 1 } }, g.term),
                    h('span', { 'aria-hidden': 'true', style: { color: _upC('#64748b'), fontSize: 16 } }, open ? '▾' : '▸')
                  ),
                  open && h('p', { style: { margin: 0, padding: '0 12px 12px', fontSize: 13, lineHeight: 1.55, color: _upC('#334155') } }, g.def)
                );
              })
            )
          );
        } else {
          refBody = h('div', null,
            h('p', { style: { fontSize: 13, color: _upC('#475569'), marginBottom: 12, lineHeight: 1.5 } },
              'Where the claims in this tool come from. Use these to verify, deepen, or share with parents and educators who want documentation.'),
            h('div', { style: { display: 'grid', gap: 10 } },
              US_SOURCES.map(function(s, idx) {
                return h('div', { key: idx, className: 'us-card', style: {
                  padding: 12, border: '1px solid #bfdbfe', borderRadius: 10, background: _upC('#f8fafc')
                } },
                  h('div', { style: { fontWeight: 700, fontSize: 14, color: _upC('#0f172a'), lineHeight: 1.4 } }, s.name),
                  h('div', { style: { fontSize: 12, color: _upC('#64748b'), fontStyle: 'italic', marginTop: 4 } }, s.who),
                  h('div', { style: { fontSize: 13, color: _upC('#334155'), lineHeight: 1.55, marginTop: 6 } }, s.what)
                );
              })
            )
          );
        }
        refContent = h('div', { style: { padding: '20px', maxWidth: '680px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '16px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))' } }, '📚'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Reference'),
            h('p', { style: { fontSize: '13px', color: _upC('#64748b'), margin: 0 } }, 'Sources cited, guidance for educators, and a glossary of key terms.')
          ),
          h('div', { role: 'tablist', 'aria-label': 'Reference sections', style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' } },
            refSections.map(function(s) {
              var active = refSection === s.id;
              return h('button', {
                key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { upd({ refSection: s.id, refExpanded: null }); if (soundOn) sfxClick(); },
                style: {
                  padding: '6px 12px',
                  background: active ? BLUE : _upC('#fff'),
                  color: active ? '#fff' : _upC('#0f172a'),
                  border: '1px solid ' + (active ? BLUE : _upC('#cbd5e1')),
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
              h('h2', { style: { margin: '0 0 2px', color: _upC('#854d0e'), fontSize: 20, lineHeight: 1.2 } }, 'My Upstander Pledge'),
              h('p', { style: { margin: 0, color: _upC('#78350f'), fontSize: 13, lineHeight: 1.5 } },
                band === 'elementary' ? 'Write a promise to yourself about how you\u2019ll act when you see bullying.'
                : 'Define who you want to be in the face of cruelty. Not who you think you should be \u2014 who you choose to be.')
            )
          ),
          !pledgeSaved
            ? h('div', { style: { background: BL, borderRadius: '16px', padding: '20px', border: '2px solid #93c5fd' } },
                h('div', { style: { fontSize: '13px', color: BD, fontStyle: 'italic', marginBottom: '10px' } }, 'I pledge to...'),
                h('textarea', { value: pledge, onChange: function(ev) { upd('pledge', ev.target.value); }, 'aria-label': 'Write your upstander pledge',
                  placeholder: band === 'elementary' ? 'When I see someone being bullied, I will...' : 'The kind of person I choose to be when I witness harm...',
                  style: { width: '100%', border: 'none', background: 'transparent', fontSize: '14px', fontFamily: 'Georgia, serif', lineHeight: 1.8, color: _upC('#1f2937'), resize: 'vertical', minHeight: '100px', boxSizing: 'border-box' }
                }),
                h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } },
                  h('button', { onClick: function() { if (pledge.trim()) { upd('pledgeSaved', true); tryAwardBadge('pledge_sealed', 20); } }, disabled: !pledge.trim(),
                    style: { padding: '10px 24px', background: pledge.trim() ? BLUE : _upC('#d1d5db'), color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: pledge.trim() ? 'pointer' : 'not-allowed' }
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
                h('div', { style: { fontSize: 11, color: _upC('#92400e'), textTransform: 'uppercase', letterSpacing: 2, fontWeight: 800, marginBottom: 4 } }, 'Certificate of Pledge'),
                h('div', { style: { fontSize: 13, fontStyle: 'italic', color: _upC('#a16207'), marginBottom: 14 } }, '\u2014 Upstander Workshop \u2014'),
                h('div', { style: { fontSize: 12, color: _upC('#78350f'), marginBottom: 6 } }, 'I, the undersigned, pledge to:'),
                h('p', { style: {
                  fontSize: 17, fontWeight: 600, color: _upC('#1f2937'), lineHeight: 1.6,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  margin: '0 auto 18px', maxWidth: 480,
                  padding: '14px 18px',
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: 10,
                  borderLeft: '3px solid #ca8a04',
                  borderRight: '3px solid #ca8a04'
                } }, '\u201C' + pledge + '\u201D'),
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, fontSize: 11, color: _upC('#78350f'), maxWidth: 480, margin: '0 auto', paddingTop: 4 } },
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
                    style: { padding: '8px 14px', background: 'transparent', color: _upC('#78350f'), border: '1px solid #ca8a04', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12 }
                  }, '\u270F\uFE0F Edit pledge')
                )
              ),
          // \u2500\u2500 Trusted Adults circle \u2500\u2500
          h('div', { style: { marginTop: 24 } },
            h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: 12 } },
              h('div', { className: 'sel-hero-icon', style: { fontSize: 36, marginBottom: 4 } }, '\uD83D\uDC65'),
              h('h3', { style: { fontSize: 16, fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'My Trusted Adults'),
              h('p', { style: { fontSize: 12, color: _upC('#64748b'), margin: 0, lineHeight: 1.5, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' } },
                'A small list of adults you trust enough to bring something hard to. Aim for 3 \u2014 ideally from different parts of your life (home, school, community). Knowing the names BEFORE you need them is half the battle.')
            ),
            trustedAdults.length > 0 && h('div', { style: { display: 'grid', gap: 8, marginBottom: 12 } },
              trustedAdults.map(function(a, idx) {
                return h('div', { key: idx, className: 'us-card', style: {
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: _upC('#f0fdf4'), border: '1px solid #86efac', borderRadius: 10
                } },
                  h('div', { 'aria-hidden': 'true', style: {
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800
                  } }, (a.name || '?').charAt(0).toUpperCase()),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontWeight: 700, fontSize: 14, color: _upC('#166534') } }, a.name),
                    h('div', { style: { fontSize: 12, color: _upC('#475569') } }, a.role || 'trusted adult')
                  ),
                  h('button', {
                    'aria-label': 'Remove ' + a.name,
                    onClick: function() {
                      var na = trustedAdults.slice(); na.splice(idx, 1);
                      upd('trustedAdults', na);
                    },
                    style: { minWidth: 24, minHeight: 24, background: 'transparent', border: 'none', color: _upC('#94a3b8'), cursor: 'pointer', fontSize: 20, fontWeight: 700, lineHeight: 1, padding: 0 }
                  }, '\u00D7')
                );
              })
            ),
            h('div', { className: 'us-card', style: { padding: 12, background: _upC('#fff'), border: '1px solid #e5e7eb', borderRadius: 10 } },
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' } },
                h('label', { style: { flex: '1 1 140px', display: 'flex', flexDirection: 'column', fontSize: 11, color: _upC('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } },
                  'Name',
                  h('input', { type: 'text', value: newAdultName,
                    onChange: function(e) { upd('newAdultName', e.target.value); },
                    placeholder: 'Ms. Rodriguez',
                    style: { marginTop: 4, padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: _upC('#0f172a') }
                  })
                ),
                h('label', { style: { flex: '1 1 140px', display: 'flex', flexDirection: 'column', fontSize: 11, color: _upC('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } },
                  'How you know them',
                  h('input', { type: 'text', value: newAdultRole,
                    onChange: function(e) { upd('newAdultRole', e.target.value); },
                    placeholder: 'School counselor',
                    style: { marginTop: 4, padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: _upC('#0f172a') }
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
                  style: { padding: '8px 14px', background: newAdultName.trim() ? BLUE : _upC('#cbd5e1'), color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: newAdultName.trim() ? 'pointer' : 'not-allowed', fontSize: 13 }
                }, 'Add to circle')
              ),
              h('p', { style: { margin: '8px 0 0', fontSize: 11, color: _upC('#64748b'), fontStyle: 'italic' } },
                'No accounts, no sharing \u2014 this lives only on your device unless you save the packet.')
            )
          ),
          // \u2500\u2500 Witness Log \u2500\u2500
          h('div', { style: { marginTop: 24 } },
            h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: 12 } },
              h('div', { className: 'sel-hero-icon', style: { fontSize: 36, marginBottom: 4 } }, '\uD83D\uDCD3'),
              h('h3', { style: { fontSize: 16, fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Witness Log'),
              h('p', { style: { fontSize: 12, color: _upC('#64748b'), margin: 0, lineHeight: 1.5, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' } },
                'A private record of what you have seen \u2014 and what you did or did not do about it. Not for anyone else. The act of writing it down is the work.')
            ),
            // Log form
            h('div', { className: 'us-card', style: { padding: 14, background: _upC('#fff'), border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 14 } },
              h('label', { htmlFor: 'us-wl-saw', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What I saw'),
              h('textarea', { id: 'us-wl-saw', value: wlSaw, onChange: function(e) { upd('wlSaw', e.target.value); },
                placeholder: 'A short description of what happened...',
                rows: 2,
                style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('label', { htmlFor: 'us-wl-did', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What I did \u2014 or did not do'),
              h('textarea', { id: 'us-wl-did', value: wlDid, onChange: function(e) { upd('wlDid', e.target.value); },
                placeholder: 'Honesty over performance. "I froze" is a valid answer.',
                rows: 2,
                style: { width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('label', { htmlFor: 'us-wl-next', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What I would do next time'),
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
                  background: (wlSaw.trim() || wlDid.trim() || wlNext.trim()) ? BLUE : _upC('#cbd5e1'),
                  color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                  cursor: (wlSaw.trim() || wlDid.trim() || wlNext.trim()) ? 'pointer' : 'not-allowed', fontSize: 13 }
              }, '\uD83D\uDCDD Save entry')
            ),
            // Past entries
            witnessLog.length > 0 && h('div', null,
              h('div', { style: { fontSize: 12, fontWeight: 700, color: _upC('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } },
                'Past entries (' + witnessLog.length + ')'),
              h('div', { style: { display: 'grid', gap: 8 } },
                witnessLog.map(function(e, idx) {
                  return h('div', { key: e.ts || idx, className: 'us-card', style: {
                    padding: 12, background: _upC('#f8fafc'), border: '1px solid #e2e8f0', borderRadius: 10
                  } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                      h('div', { style: { fontSize: 11, fontWeight: 700, color: BD } }, e.date),
                      h('button', {
                        'aria-label': 'Delete entry from ' + e.date,
                        onClick: function() {
                          var na = witnessLog.slice(); na.splice(idx, 1);
                          upd('witnessLog', na);
                        },
                        style: { background: 'transparent', border: 'none', color: _upC('#94a3b8'), cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }
                      }, '\u00D7')
                    ),
                    e.saw && h('div', { style: { fontSize: 12, marginBottom: 4 } },
                      h('span', { style: { fontWeight: 700, color: _upC('#475569') } }, 'Saw: '),
                      h('span', { style: { color: _upC('#0f172a') } }, e.saw)),
                    e.did && h('div', { style: { fontSize: 12, marginBottom: 4 } },
                      h('span', { style: { fontWeight: 700, color: _upC('#475569') } }, 'Did: '),
                      h('span', { style: { color: _upC('#0f172a') } }, e.did)),
                    e.next && h('div', { style: { fontSize: 12 } },
                      h('span', { style: { fontWeight: 700, color: _upC('#475569') } }, 'Next time: '),
                      h('span', { style: { color: _upC('#0f172a') } }, e.next))
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
                h('div', { style: { fontWeight: 800, fontSize: 14, color: _upC('#0e7490'), marginBottom: 2 } },
                  'Counselor / parent handoff packet'),
                h('div', { style: { fontSize: 12, color: _upC('#334155'), lineHeight: 1.5 } },
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
                style: { padding: '10px 16px', background: _upC('#0e7490'), color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
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
                h('p', { style: { fontSize: 12, color: _upC('#64748b'), margin: 0, lineHeight: 1.5 } },
                  earnedCount + ' of ' + totalCount + ' earned. Each one marks a moment you showed up.')
              ),
              h('div', { style: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' } },
                allBadgeIds.map(function(bid) {
                  var b = BADGE_CATALOG[bid];
                  var earned = !!earnedBadges[bid];
                  var earnedInfo = earnedBadges[bid] || {};
                  return h('div', { key: bid, className: earned ? 'us-card us-pop' : 'us-card', style: {
                    padding: 12, borderRadius: 12,
                    border: '2px solid ' + (earned ? b.color : _upC('#e5e7eb')),
                    background: earned ? _upC('#fff') : _upC('#f8fafc'),
                    opacity: earned ? 1 : 0.55,
                    textAlign: 'center',
                    filter: earned ? 'none' : 'grayscale(40%)'
                  } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 44, height: 44, borderRadius: '50%',
                      background: earned ? 'linear-gradient(135deg, ' + b.color + ' 0%, ' + b.color + 'cc 100%)' : _upC('#cbd5e1'),
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, margin: '0 auto 6px',
                      boxShadow: earned ? '0 3px 8px ' + b.color + '44, inset 0 1px 0 rgba(255, 255, 255, 0.3)' : 'none'
                    } }, b.icon),
                    h('div', { style: { fontWeight: 700, fontSize: 12, color: earned ? b.color : _upC('#475569'), lineHeight: 1.3, marginBottom: 2 } }, b.label),
                    h('div', { style: { fontSize: 10, color: _upC('#64748b'), lineHeight: 1.35 } }, b.desc),
                    earned && earnedInfo.date && h('div', { style: { fontSize: 9, color: b.color, fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 } }, '✓ ' + earnedInfo.date)
                  );
                })
              )
            );
          })()
        );
      }

      // ── Talk-it-through Coach ──
      var coachContent = null;
      if (activeTab === 'coach') {
        // ── Safety Layer: require informed consent before coach access ──
        var hasSafetyLayer = window.SelHub && window.SelHub.hasCoachConsent;
        var hasConsent = hasSafetyLayer ? window.SelHub.hasCoachConsent() : true;

        if (hasSafetyLayer && !hasConsent) {
          coachContent = window.SelHub.renderConsentScreen(h, band, function() {
            window.SelHub.giveCoachConsent();
            upd('_consentRefresh', Date.now()); // force re-render
          }, ctx.activeSessionCode);
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
              if (awardXP) awardXP(5, 'Talked it through with the coach');
            }).catch(function() {
              upd({ coachHist: hist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting. But your courage in talking about this is real. You don\u2019t have to carry it alone.' }]), coachLoad: false });
            });
          };

          coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
            h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
              h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))' } }, '\uD83E\uDD16'),
              h('h3', { style: { fontSize: '18px', fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Talk it through'),
              h('p', { style: { fontSize: '13px', color: _upC('#94a3b8'), margin: 0 } }, 'Talk about a bullying experience from any role.'),
              window.SelHub && window.SelHub.renderSafetyDisclosure && window.SelHub.renderSafetyDisclosure(h, band, ctx.activeSessionCode),
              h('p', { style: { fontSize: '11px', color: _upC('#dc2626'), margin: '6px 0 0', fontWeight: 600 } }, '\u26A0\uFE0F If you are in danger, please talk to a trusted adult or call 988.')
            ),
            // Show crisis resources if last message was flagged Tier 3
            (d._lastTier >= 3 && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),
            coachHist.length > 0 && h('div', { role: 'log', 'aria-label': 'Coach conversation', 'aria-live': 'polite', 'aria-busy': coachLoad ? 'true' : 'false',
              style: {
                maxHeight: 320, overflowY: 'auto', marginBottom: 12,
                padding: 14, borderRadius: 14,
                background: _upC('#f8fafc'), boxShadow: 'inset 0 0 0 1px #e2e8f0',
                display: 'flex', flexDirection: 'column', gap: 10
              }
            },
              coachHist.map(function(m, i) {
                var u = m.role === 'user';
                if (u) {
                  return h('div', { key: i, style: { display: 'flex', justifyContent: 'flex-end' } },
                    h('div', { style: { maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 } },
                      h('div', { style: { fontSize: 10, color: _upC('#64748b'), fontWeight: 700, paddingRight: 4 } }, 'YOU'),
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
                      padding: '10px 14px', background: BL, color: _upC('#0f172a'),
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
                  padding: '10px 14px', background: BL, color: _upC('#475569'),
                  fontSize: 14, fontStyle: 'italic',
                  borderRadius: '18px 18px 18px 4px', border: '1px solid #bfdbfe'
                } }, 'listening\u2026')
              )
            ),
            h('div', { style: { display: 'flex', gap: '8px' } },
              h('input', { type: 'text', 'aria-label': 'Share your experience', value: coachInput, onChange: function(ev) { upd('coachInput', ev.target.value); },
                onKeyDown: function(ev) { if (ev.key === 'Enter' && coachInput.trim() && !coachLoad && callGemini) sendSafeMessage(coachInput.trim()); },
                disabled: coachLoad || !callGemini,
                placeholder: coachLoad ? 'Listening...' : 'Share what happened or how you feel...',
                style: { flex: 1, border: '2px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
              }),
              h('button', {
                'aria-label': coachLoad ? 'Upstander coach is responding' : 'Send message to upstander coach',
                onClick: function() { if (coachInput.trim() && !coachLoad && callGemini) sendSafeMessage(coachInput.trim()); },
                disabled: coachLoad || !coachInput.trim() || !callGemini,
                style: { padding: '10px 16px', background: coachInput.trim() && !coachLoad ? BLUE : _upC('#d1d5db'), color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoad ? 'pointer' : 'not-allowed', fontSize: '13px' }
              }, coachLoad ? '\u23F3' : '\uD83E\uDDF1')
            ),
            coachHist.length === 0 && h('div', { style: { marginTop: '16px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 600, color: _upC('#94a3b8'), marginBottom: '6px' } }, 'You might share:'),
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
              h('h2', { style: { margin: '0 0 2px', color: _upC('#6b21a8'), fontSize: 20, lineHeight: 1.2 } }, 'Practice — what would you actually do?'),
              h('p', { style: { margin: 0, color: _upC('#334155'), fontSize: 13, lineHeight: 1.5 } },
                'Real scenarios. Pick a response. See how it lands. There are no perfect answers, but some choices help and some make things worse.')
            )
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px', color: _upC('#64748b') } },
            h('span', null, 'Scenario ' + (pracIdx + 1) + ' of ' + scenList.length),
            totalDone > 0 && h('span', { style: { fontWeight: 700, color: BLUE } }, totalDone + ' answered · ' + topRated + ' strong response' + (topRated === 1 ? '' : 's'))
          ),
          h('div', { className: 'us-card', style: { background: _upC('#fff'), borderRadius: 14, padding: 18, border: '1px solid #e5e7eb', marginBottom: 14 } },
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
            h('p', { 'aria-live': 'polite', style: { margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: _upC('#1f2937') } }, scen.setup),
            h('div', { role: 'radiogroup', 'aria-label': 'What would you do?', style: { display: 'grid', gap: 8 } },
              scen.choices.map(function(c, idx) {
                var picked = pracChoice === idx;
                return h('button', {
                  key: idx, role: 'radio', 'aria-checked': picked ? 'true' : 'false',
                  onClick: function() { upd('pracChoice', idx); if (soundOn) sfxClick(); },
                  style: {
                    padding: '12px 14px', textAlign: 'left',
                    background: picked ? _upC('#eff6ff') : _upC('#fff'),
                    border: '2px solid ' + (picked ? BLUE : _upC('#cbd5e1')),
                    borderRadius: 10, fontSize: 14, fontWeight: picked ? 700 : 500,
                    color: _upC('#0f172a'), cursor: 'pointer',
                    display: 'flex', alignItems: 'flex-start', gap: 10
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: {
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    border: '2px solid ' + (picked ? BLUE : _upC('#cbd5e1')),
                    background: picked ? BLUE : _upC('#fff'),
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
              background: scen.choices[pracChoice].rating >= 3 ? _upC('#f0fdf4') : (scen.choices[pracChoice].rating === 2 ? _upC('#fefce8') : _upC('#fef2f2')),
              border: '1px solid ' + (scen.choices[pracChoice].rating >= 3 ? '#bbf7d0' : (scen.choices[pracChoice].rating === 2 ? '#fde68a' : '#fecaca'))
            } },
              h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
                color: scen.choices[pracChoice].rating >= 3 ? _upC('#166534') : (scen.choices[pracChoice].rating === 2 ? _upC('#854d0e') : _upC('#991b1b')) } },
                scen.choices[pracChoice].rating >= 3 ? 'Strong response' : (scen.choices[pracChoice].rating === 2 ? 'Partial — worth thinking about' : 'Risky — think this through')),
              h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _upC('#0f172a') } }, scen.choices[pracChoice].feedback)
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (pracIdx > 0) upd({ pracIdx: pracIdx - 1, pracChoice: null }); },
              disabled: pracIdx === 0,
              style: { padding: '8px 14px', background: _upC('#fff'), color: pracIdx === 0 ? _upC('#94a3b8') : _upC('#0f172a'),
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
                background: pracChoice == null ? _upC('#94a3b8') : BLUE,
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
                background: genShown ? _upC('#faf5ff') : _upC('#fdf4ff'),
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
                h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#6b21a8'), marginBottom: 2 } },
                  'Generate a scenario for your situation'),
                h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                  'Pick a setting and what kind of harm. AI writes a fresh scenario in the same format. Useful when the 9 above do not match your real life.')
              ),
              h('span', { 'aria-hidden': 'true', style: { color: '#a855f7', fontSize: 18 } }, genShown ? '▾' : '▸')
            ),
            genShown && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #d8b4fe', borderRadius: 14 } },
              !genScenario && h('div', null,
                h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: _upC('#475569') } },
                  'Fill in any 2 or 3 fields. The AI uses what you give it and improvises the rest. Output is always 4 rated choices, just like the hand-written ones above.'),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 } },
                  h('div', null,
                    h('label', { htmlFor: 'us-gen-setting', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Setting'),
                    h('select', { id: 'us-gen-setting', value: genSetting,
                      onChange: function(e) { upd('genSetting', e.target.value); },
                      style: { width: '100%', padding: 8, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', background: _upC('#fff') }
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
                    h('label', { htmlFor: 'us-gen-rel', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Who is involved'),
                    h('select', { id: 'us-gen-rel', value: genRelation,
                      onChange: function(e) { upd('genRelation', e.target.value); },
                      style: { width: '100%', padding: 8, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', background: _upC('#fff') }
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
                    h('label', { htmlFor: 'us-gen-harm', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Kind of harm'),
                    h('select', { id: 'us-gen-harm', value: genHarmType,
                      onChange: function(e) { upd('genHarmType', e.target.value); },
                      style: { width: '100%', padding: 8, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', background: _upC('#fff') }
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
                h('label', { htmlFor: 'us-gen-focus', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Optional: anything specific about your situation'),
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
                      background: (genLoading || !callGemini || (!genSetting && !genRelation && !genHarmType && !genFocus.trim())) ? _upC('#cbd5e1') : '#7c3aed',
                      color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                      cursor: (genLoading || !callGemini || (!genSetting && !genRelation && !genHarmType && !genFocus.trim())) ? 'not-allowed' : 'pointer',
                      fontSize: 13
                    }
                  }, genLoading ? 'Writing scenario…' : (callGemini ? 'Generate scenario' : 'AI not available'))
                ),
                !callGemini && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: _upC('#6b21a8') } },
                  'AI features need a connection. Try the 9 hand-written scenarios above while offline.'),
                genError && h('div', { 'aria-live': 'polite', style: {
                  marginTop: 10, padding: 10, background: _upC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: _upC('#991b1b')
                } }, genError)
              ),
              // ── Render the generated scenario in the same 4-choice UI shape ──
              genScenario && h('div', null,
                h('div', { className: 'us-card', style: { background: _upC('#fff'), borderRadius: 14, padding: 18, border: '1px dashed #c084fc', marginBottom: 14, background: _upC('#faf5ff') } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                    h('span', { 'aria-hidden': 'true', style: {
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, #a78bfa 0%, #6b21a8 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, color: '#fff'
                    } }, genScenario.icon || '🎭'),
                    h('div', { style: { flex: 1 } },
                      h('h4', { style: { margin: 0, fontSize: 16, fontWeight: 800, color: _upC('#6b21a8') } }, genScenario.title || 'Your scenario'),
                      h('div', { style: { fontSize: 11, color: _upC('#6b21a8'), fontStyle: 'italic', marginTop: 2 } }, 'AI-generated practice')
                    )
                  ),
                  h('p', { 'aria-live': 'polite', style: { margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: _upC('#1f2937') } }, genScenario.setup),
                  h('div', { role: 'radiogroup', 'aria-label': 'What would you do?', style: { display: 'grid', gap: 8 } },
                    (genScenario.choices || []).map(function(c, idx) {
                      var picked = genChoice === idx;
                      return h('button', {
                        key: 'gen-c-' + idx, role: 'radio', 'aria-checked': picked ? 'true' : 'false',
                        onClick: function() { upd('genChoice', idx); if (soundOn) sfxClick(); },
                        style: {
                          padding: '12px 14px', textAlign: 'left',
                          background: picked ? _upC('#eff6ff') : _upC('#fff'),
                          border: '2px solid ' + (picked ? BLUE : _upC('#cbd5e1')),
                          borderRadius: 10, fontSize: 14, fontWeight: picked ? 700 : 500,
                          color: _upC('#0f172a'), cursor: 'pointer',
                          display: 'flex', alignItems: 'flex-start', gap: 10
                        }
                      },
                        h('span', { 'aria-hidden': 'true', style: {
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                          border: '2px solid ' + (picked ? BLUE : _upC('#cbd5e1')),
                          background: picked ? BLUE : _upC('#fff'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1
                        } }, picked ? '✓' : ''),
                        h('span', { style: { flex: 1, lineHeight: 1.5 } }, c.label)
                      );
                    })
                  ),
                  genChoice != null && genScenario.choices && genScenario.choices[genChoice] && h('div', { 'aria-live': 'polite', className: 'us-pop', style: {
                    marginTop: 12, padding: 12, borderRadius: 10,
                    background: genScenario.choices[genChoice].rating >= 3 ? _upC('#f0fdf4') : (genScenario.choices[genChoice].rating === 2 ? _upC('#fefce8') : _upC('#fef2f2')),
                    border: '1px solid ' + (genScenario.choices[genChoice].rating >= 3 ? '#bbf7d0' : (genScenario.choices[genChoice].rating === 2 ? '#fde68a' : '#fecaca'))
                  } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
                      color: genScenario.choices[genChoice].rating >= 3 ? _upC('#166534') : (genScenario.choices[genChoice].rating === 2 ? _upC('#854d0e') : _upC('#991b1b')) } },
                      genScenario.choices[genChoice].rating >= 3 ? 'Strong response' : (genScenario.choices[genChoice].rating === 2 ? 'Partial — worth thinking about' : 'Risky — think this through')),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _upC('#0f172a') } }, genScenario.choices[genChoice].feedback)
                  )
                ),
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  h('button', {
                    onClick: function() { upd({ genScenario: null, genChoice: null, genError: '' }); },
                    style: { padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                  }, 'Generate another'),
                  // Bridge: take this scenario into the role-play below.
                  // Carry the setup over as the scene so the AI peer stays in
                  // the same context the student just read. Student still
                  // picks which role to practice.
                  callGemini && h('button', {
                    onClick: function() {
                      upd({
                        rpShown: true,
                        rpRole: '',
                        rpScene: genScenario.setup || '',
                        rpHistory: [],
                        rpInput: '',
                        rpEnded: false,
                        rpReflection: '',
                        rpStarting: false
                      });
                      if (soundOn) sfxClick();
                      if (announceToSR) announceToSR('Role-play opened with this scene. Pick which role to practice.');
                    },
                    style: { padding: '8px 14px', background: _upC('#fff'), color: _upC('#6b21a8'), border: '2px solid #a855f7', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                  }, 'Try this as a role-play →'),
                  h('button', {
                    onClick: function() { upd({ genShown: false, genScenario: null, genChoice: null, genError: '' }); },
                    style: { padding: '8px 14px', background: _upC('#fff'), color: _upC('#0f172a'), border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                  }, 'Done')
                ),
                h('p', { style: { margin: '8px 0 0', fontSize: 11, color: _upC('#6b21a8'), fontStyle: 'italic' } },
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
                upd({ rpRole: roleKey, rpScene: rpScene || cfg.fallbackScene, rpHistory: [{ speaker: 'ai', text: cfg.fallbackOpener }], rpInput: '', rpEnded: false, rpReflection: '', rpStarting: false });
                return;
              }
              // If a scene is already provided (e.g., from the "Try this as
              // a role-play →" bridge on a generated scenario), only generate
              // an opener that matches THAT scene + this role. Otherwise
              // generate both fresh.
              var preExistingScene = (rpScene && rpScene.trim()) || '';
              upd({ rpRole: roleKey, rpHistory: [], rpInput: '', rpEnded: false, rpReflection: '', rpStarting: true });
              if (announceToSR) announceToSR(preExistingScene ? 'Generating role-play opener' : 'Generating fresh role-play scene');
              var bandLabel = band === 'k2' ? 'K-2' : band === 'g35' ? '3-5' : band === 'g68' ? '6-8' : band === 'g912' ? '9-12' : 'middle school';
              var prompt;
              if (preExistingScene) {
                prompt =
                  'You are starting a role-play for an SEL bullying-rehearsal tool. The SCENE is already fixed (see below). ' +
                  'Generate just the FIRST in-character line the peer says — 1-2 sentences, in their voice, sounds like a real ' + bandLabel + ' student. ' +
                  'No narration, no quotation marks, no commentary — just the line.\n\n' +
                  'YOUR PEER CHARACTER: ' + cfg.charDesc + '\n\n' +
                  'SCENE (the role-play takes place inside this situation): ' + preExistingScene + '\n\n' +
                  'RULES: NO slurs, NO explicit threats or violence. Stay at the "social meanness" level. Return ONLY the line.';
                callGemini(prompt, false).then(function(r) {
                  var line = (r || cfg.fallbackOpener).trim().replace(/^"|"$/g, '');
                  upd({ rpScene: preExistingScene, rpHistory: [{ speaker: 'ai', text: line }], rpStarting: false });
                  if (announceToSR) announceToSR('Role-play ready. ' + cfg.label);
                }).catch(function() {
                  upd({ rpScene: preExistingScene, rpHistory: [{ speaker: 'ai', text: cfg.fallbackOpener }], rpStarting: false });
                });
                return;
              }
              prompt =
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
                  background: rpShown ? _upC('#faf5ff') : _upC('#fdf4ff'),
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
                  h('div', { style: { fontWeight: 800, fontSize: 15, color: _upC('#6b21a8'), marginBottom: 2 } },
                    'Practice the conversation (role-play)'),
                  h('div', { style: { fontSize: 12, color: _upC('#475569'), lineHeight: 1.4 } },
                    'AI plays a peer. You practice what you would actually say. Up to ~5 turns. You can break character anytime for coaching.')
                ),
                h('span', { 'aria-hidden': 'true', style: { color: '#a855f7', fontSize: 18 } }, rpShown ? '▾' : '▸')
              ),
              rpShown && h('div', { style: { marginTop: 12, padding: 18, background: _upC('#fff'), border: '1px solid #d8b4fe', borderRadius: 14 } },
                // STEP 1: pick a role to practice
                !rpRole && h('div', null,
                  // Scene-carried-over banner (if the student came in via the
                  // "Try this as a role-play →" bridge on a generated scenario)
                  rpScene && h('div', { style: {
                    padding: '10px 12px', marginBottom: 12, background: _upC('#fafafa'),
                    borderTop: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', borderLeft: '3px solid #a855f7', borderRadius: 8,
                    fontSize: 13, lineHeight: 1.5, color: _upC('#475569'), fontStyle: 'italic'
                  } },
                    h('span', { style: { fontStyle: 'normal', fontWeight: 700, color: _upC('#6b21a8'), fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 6 } }, 'Scene loaded:'),
                    rpScene
                  ),
                  h('p', { style: { margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: _upC('#475569') } },
                    h('strong', { style: { color: _upC('#6b21a8') } }, 'Pick what you want to practice. '),
                    rpScene
                      ? 'The scene above is the setting. The AI will play the OTHER person inside that scene. You play yourself.'
                      : 'The AI will play the OTHER person. You play yourself. Keep responses short and real — the way you would actually talk.'),
                  h('div', { style: { display: 'grid', gap: 8 } },
                    ['bully', 'target', 'bystander'].map(function(roleKey) {
                      var cfg = rpRoles[roleKey];
                      return h('button', {
                        key: roleKey,
                        onClick: function() { if (soundOn) sfxClick(); startRolePlay(roleKey); },
                        disabled: !callGemini || rpStarting,
                        style: {
                          padding: '12px 14px', textAlign: 'left',
                          background: _upC('#fff'), border: '2px solid #cbd5e1', borderRadius: 10,
                          fontSize: 14, color: _upC('#0f172a'), cursor: (callGemini && !rpStarting) ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          opacity: rpStarting ? 0.6 : 1
                        }
                      },
                        h('span', { 'aria-hidden': 'true', style: { fontSize: 22, marginTop: 2 } }, cfg.icon),
                        h('div', { style: { flex: 1 } },
                          h('div', { style: { fontWeight: 700, marginBottom: 4 } }, cfg.label),
                          h('div', { style: { fontSize: 12, color: _upC('#64748b'), lineHeight: 1.45 } }, cfg.desc)
                        )
                      );
                    })
                  ),
                  rpStarting && h('p', { 'aria-live': 'polite', style: { margin: '10px 0 0', fontSize: 12, color: _upC('#6b21a8'), fontStyle: 'italic' } },
                    'Generating a fresh scene…'),
                  !callGemini && h('p', { style: { margin: '12px 0 0', fontSize: 11, color: _upC('#6b21a8') } },
                    'AI features need a connection. Try the hand-written scenarios above while offline.')
                ),
                // STEP 2: conversation in progress
                rpRole && charCfg && h('div', null,
                  h('div', { style: {
                    padding: '8px 12px', marginBottom: 12, background: _upC('#f3e8ff'), borderRadius: 8,
                    fontSize: 12, color: _upC('#6b21a8'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap'
                  } },
                    h('span', { style: { fontWeight: 700 } }, charCfg.icon + ' ' + charCfg.label),
                    h('button', {
                      onClick: function() { upd({ rpRole: '', rpScene: '', rpHistory: [], rpInput: '', rpEnded: false, rpReflection: '', rpStarting: false }); if (soundOn) sfxClick(); },
                      style: { padding: '4px 10px', background: _upC('#fff'), color: _upC('#6b21a8'), border: '1px solid #d8b4fe', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }
                    }, '← Different role')
                  ),
                  // Scene-setter (italic, neutral observer voice) above the conversation
                  rpScene && h('div', { style: {
                    padding: '10px 12px', marginBottom: 10, background: _upC('#fafafa'), borderTop: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', borderLeft: '3px solid #a855f7', borderRadius: 8,
                    fontSize: 13, lineHeight: 1.5, color: _upC('#475569'), fontStyle: 'italic'
                  } },
                    h('span', { style: { fontStyle: 'normal', fontWeight: 700, color: _upC('#6b21a8'), fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 6 } }, 'Scene:'),
                    rpScene
                  ),
                  // Conversation log
                  h('div', { 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: '40vh', overflowY: 'auto', padding: 4 } },
                    rpHistory.map(function(turn, ti) {
                      // _crisis is a marker — render the always-on crisis-resources
                      // block in line so the student sees 988 / text line / trusted-adult
                      // links right next to the coach's break-character message.
                      if (turn.speaker === '_crisis') {
                        return h('div', { key: 'rp-t-' + ti, style: { alignSelf: 'stretch' } },
                          window.SelHub && window.SelHub.renderCrisisResources && window.SelHub.renderCrisisResources(h, band)
                        );
                      }
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
                          background: isStudent ? _upC('#dbeafe') : (isCoach ? _upC('#fef3c7') : _upC('#f1f5f9')),
                          border: '1px solid ' + (isStudent ? '#93c5fd' : (isCoach ? '#fcd34d' : _upC('#cbd5e1'))),
                          color: _upC('#0f172a')
                        }
                      },
                        h('div', { style: { fontSize: 10, fontWeight: 700, color: isStudent ? _upC('#1d4ed8') : (isCoach ? _upC('#92400e') : _upC('#475569')), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                          isStudent ? 'You' : (isCoach ? '🪶 Coach (out of character)' : '🎭 ' + (rpRole === 'bully' ? 'Mean peer' : rpRole === 'target' ? 'Peer who was hurt' : 'Friend going along'))),
                        h('div', null, turn.text)
                      );
                    })
                  ),
                  // Input area + send + coach + end
                  !rpEnded && h('div', null,
                    h('textarea', { id: 'us-rp-input', value: rpInput,
                      'aria-label': 'Your upstander role-play response',
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
                          // ── Safety pre-check ──
                          // Critical content (self-harm, harm to others) halts the
                          // rehearsal and surfaces crisis resources instead of
                          // continuing in character. High-severity content (bullying
                          // language, concerning content) lets the rehearsal continue
                          // but appends a soft "talk to a trusted adult" reminder.
                          var safety = (window.SelHub && window.SelHub.safeRehearseCheck)
                            ? window.SelHub.safeRehearseCheck(studentTurn, { toolId: 'upstander', onSafetyFlag: ctx.onSafetyFlag })
                            : { action: 'continue' };
                          if (safety.action === 'block') {
                            var blockedHist = rpHistory.concat([
                              { speaker: 'student', text: studentTurn },
                              { speaker: 'coach', text: window.SelHub.rehearseBreakCharacterText(safety.severity) },
                              { speaker: '_crisis', text: '' }
                            ]);
                            upd({ rpHistory: blockedHist, rpInput: '', rpLoading: false });
                            if (announceToSR) announceToSR('Rehearsal paused. Safety resources shown.');
                            return;
                          }
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
                            var afterTurn = newHist.concat([{ speaker: 'ai', text: reply || '...' }]);
                            if (safety.action === 'nudge') {
                              afterTurn = afterTurn.concat([{ speaker: 'coach', text: 'Quick check-in: if any of what you just typed is hitting close to real life, talking to a trusted adult is always an option.' }]);
                            }
                            upd({ rpHistory: afterTurn, rpLoading: false });
                            if (announceToSR) announceToSR('Peer responded');
                          }).catch(function() {
                            upd({ rpHistory: newHist.concat([{ speaker: 'ai', text: '(AI not reachable — try again in a moment)' }]), rpLoading: false });
                          });
                        },
                        style: {
                          padding: '10px 16px',
                          background: (rpLoading || !rpInput.trim() || !callGemini) ? _upC('#cbd5e1') : '#7c3aed',
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
                          background: _upC('#fff'), color: _upC('#92400e'), border: '1px solid #fcd34d', borderRadius: 8, fontWeight: 600,
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
                          background: _upC('#fff'), color: _upC('#475569'), border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600,
                          cursor: (rpLoading || !callGemini) ? 'not-allowed' : 'pointer',
                          fontSize: 13
                        }
                      }, 'End & reflect')
                    )
                  ),
                  // STEP 3: end-of-practice reflection
                  rpEnded && rpReflection && h('div', { className: 'us-pop', style: {
                    marginTop: 8, padding: 14, background: _upC('#f0fdf4'), border: '1px solid #bbf7d0', borderRadius: 10
                  } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: _upC('#166534'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } },
                      'How that went'),
                    h('p', { style: { margin: '0 0 12px', fontSize: 14, lineHeight: 1.55, color: _upC('#0f172a'), whiteSpace: 'pre-wrap' } }, rpReflection),
                    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                      h('button', {
                        onClick: function() { upd({ rpRole: '', rpScene: '', rpHistory: [], rpInput: '', rpEnded: false, rpReflection: '', rpStarting: false }); if (soundOn) sfxClick(); },
                        style: { padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                      }, 'Practice again'),
                      h('button', {
                        onClick: function() { upd({ rpShown: false, rpRole: '', rpScene: '', rpHistory: [], rpInput: '', rpEnded: false, rpReflection: '', rpStarting: false }); },
                        style: { padding: '8px 14px', background: _upC('#fff'), color: _upC('#0f172a'), border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                      }, 'Done')
                    )
                  ),
                  rpRole && h('p', { style: { margin: '8px 0 0', fontSize: 11, color: _upC('#6b21a8'), fontStyle: 'italic' } },
                    'AI-generated peer responses. No real student is being depicted. Treat coach feedback as one perspective.'),
                  // Always-on help strip — visible in both solo and live-session
                  // modes. The Rehearse layer makes safety-keyword checks but
                  // the real safety net is a trusted adult, not the AI.
                  rpRole && window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
                )
              )
            );
          })()
        );
      }

      var content = rolesContent || movesContent || pracContent || cycleContent || pledgeContent || coachContent || refContent;
      return h('div', { className: 'us-root', style: { display: 'flex', flexDirection: 'column', height: '100%' } }, (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('upstander', h, ctx) : null), tabBar, h('div', { style: { flex: 1, overflow: 'auto' } }, content));
    }
  });
})();
