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
  "elementary": [
    {
      "id": "target",
      "title": "Experiencing harm",
      "scenario": "At lunch, classmates repeatedly use a name one child has asked them not to use.",
      "notice": "The name-calling continues after a request to stop.",
      "unknown": "You cannot tell how the child feels or whether they want company from their face or silence.",
      "learner": "The child can ask for space, company or a trusted adult. They do not have to say the perfect words to deserve help.",
      "adult": "A lunchroom adult needs to stop the name-calling, check what support is wanted and watch for it happening again.",
      "boundary": "Do not make the child change their name, leave lunch or forgive someone as the price of help.",
      "check": "Check whether the name-calling stopped and the child can use the lunchroom without being targeted."
    },
    {
      "id": "bully",
      "title": "Causing harm",
      "scenario": "At lunch, a child keeps using a name a classmate has asked them not to use.",
      "notice": "The child is repeating an unwanted name.",
      "unknown": "You do not know their feelings, home life or reason for doing it. Those guesses are not needed to stop the behavior.",
      "learner": "The child needs to stop using the name and practice the name the classmate wants. They can ask an adult for help changing the habit.",
      "adult": "An adult should name the behavior clearly, set a limit, teach a different response and follow up.",
      "boundary": "An explanation does not excuse repeating the name. The classmate does not have to accept an apology or help teach the lesson.",
      "check": "Look for the name actually changing in later interactions, rather than only an apology being said."
    },
    {
      "id": "bystander",
      "title": "Witnessing harm",
      "scenario": "A child hears repeated name-calling at lunch but does not speak in that moment.",
      "notice": "The child heard the behavior and did not speak then.",
      "unknown": "Silence does not tell you whether they agreed, were scared, missed part of it or did not know what to do.",
      "learner": "They can stop joining any laughter, seek adult help or offer company later if wanted. Public speaking is not required.",
      "adult": "Adults should make it easy to ask for help, respond to the behavior and check the witness's support needs too.",
      "boundary": "Do not make a child responsible for stopping the whole group or demand an apology for being unable to speak.",
      "check": "Check whether an adult responded and whether the witness knows a usable support route."
    }
  ],
  "middle": [
    {
      "id": "target",
      "title": "Experiencing harm",
      "scenario": "A group repeatedly removes a student's contribution from a shared project and jokes that the student has nothing to offer.",
      "notice": "The contribution is being removed and the comments target the student.",
      "unknown": "You cannot infer ability, confidence or feelings from whether the student protests.",
      "learner": "The student can ask for their work to be recognized and choose a supported way to participate without defending their worth to the group.",
      "adult": "The teacher needs to address the removal, review how contributions are recorded and check for retaliation.",
      "boundary": "Do not solve exclusion by automatically moving only the targeted student or requiring them to win the group over.",
      "check": "Check whether contributions are retained, credit is accurate and the student can participate without further targeting."
    },
    {
      "id": "bully",
      "title": "Causing harm",
      "scenario": "A student repeatedly deletes a peer's project contributions and joins jokes about their ability.",
      "notice": "Deleting and mocking are observable actions that affect the peer's access and credit.",
      "unknown": "You do not know the student's motives or personal history. More than one factor may matter.",
      "learner": "The student needs to stop deleting and mocking, help restore the work and use agreed feedback methods. They can seek help learning those methods.",
      "adult": "The teacher should set expectations, arrange proportionate accountability under school procedures and monitor access to the project.",
      "boundary": "Do not make the peer supervise the repair, forgive the behavior or meet privately with someone who intimidates them.",
      "check": "Check whether work stays restored and later disagreements use the agreed review process."
    },
    {
      "id": "bystander",
      "title": "Witnessing harm",
      "scenario": "A student sees a peer's work removed from a group project and hears mocking but worries that objecting will make them the next target.",
      "notice": "The student noticed removal and mocking and has a concern about retaliation.",
      "unknown": "They may not know the full pattern or which support route will respond well.",
      "learner": "They can describe what they directly saw to the teacher or another trusted adult and ask how retaliation will be addressed.",
      "adult": "The teacher needs to investigate the concern appropriately, protect participation and follow through. The witness does not need to gather a case alone.",
      "boundary": "Do not demand screenshots obtained at risk, a public accusation or an equal-blame mediation session.",
      "check": "Check whether the report led to concrete protection and whether another trusted route is needed."
    }
  ],
  "high": [
    {
      "id": "target",
      "title": "Experiencing harm",
      "scenario": "A peer is repeatedly targeted with identity-based comments after an earlier request for the comments to stop.",
      "notice": "The comments are repeated and unwanted.",
      "unknown": "You cannot infer the person's identity, diagnosis, feelings or preferred disclosure from the comments being used.",
      "learner": "The peer can choose what support to request and which identity details to share. They do not have to educate others or show distress as proof.",
      "adult": "School adults need to address the harassment, discuss privacy limits and respond to retaliation or continued harm.",
      "boundary": "Do not out the person, require public advocacy, or ask them to debate whether they deserve respect.",
      "check": "Check whether the behavior and retaliation stop while access to learning and privacy are protected."
    },
    {
      "id": "bully",
      "title": "Causing harm",
      "scenario": "A student repeats identity-based comments about a peer and says the group meant them as jokes.",
      "notice": "The student used the comments; calling them jokes does not undo the action.",
      "unknown": "You do not know the student's background or whether they understand every effect of the comments.",
      "learner": "They need to stop the comments, avoid recruiting others to defend them, and work with appropriate adults on a specific change in behavior.",
      "adult": "Adults should set limits, follow applicable school procedures and provide instruction and monitoring that do not rely on the targeted peer.",
      "boundary": "Support for the student causing harm is compatible with accountability. It does not entitle them to contact, forgiveness or access to the peer.",
      "check": "Look for changed behavior across settings and no further pressure on the peer, not a persuasive account of good intentions."
    },
    {
      "id": "bystander",
      "title": "Witnessing harm",
      "scenario": "A student witnesses repeated identity-based comments and wants to help without exposing the peer to more attention.",
      "notice": "The student noticed the comments and is considering a response.",
      "unknown": "They may not know who is safe to involve, what the peer wants disclosed or how the group might retaliate.",
      "learner": "If welcome, they can ask about a preferred support route and report observed behavior with only necessary personal details.",
      "adult": "School adults must respond to harassment and explain how reports, privacy and retaliation concerns will be handled.",
      "boundary": "No witness has to prove courage through confrontation or disclose someone else's identity. Immediate danger still needs urgent help.",
      "check": "Check whether the chosen support route responds; if it does not, seek another trusted route without expanding disclosure unnecessarily."
    }
  ]
};

  // Upstander strategies
  var UPSTANDER_MOVES = {
  "elementary": [
    {
      "move": "Offer company with permission",
      "desc": "If approaching is safe, ask whether the person wants company or some space.",
      "fit": "This may help when someone wants a friendly person nearby.",
      "limit": "Do not assume they want you close, touching them or speaking for them. Get adult help for ongoing danger.",
      "icon": ""
    },
    {
      "move": "Offer a simple redirect",
      "desc": "If it feels safe, invite a change of activity without making anyone the joke.",
      "fit": "A redirect may provide a pause when there is no immediate physical danger.",
      "limit": "It might not work. Do not use distraction instead of adult help during a chase, grabbing or threats.",
      "icon": ""
    },
    {
      "move": "Offer an exit, not a demand",
      "desc": "Ask whether they want to join another activity or go toward an adult with you.",
      "fit": "This may help when the person wants to leave and the route is safe.",
      "limit": "Accept no. Do not pull them away or make them leave an activity they have a right to enjoy.",
      "icon": ""
    },
    {
      "move": "Use a brief limit if safe",
      "desc": "You might say, 'Please stop the name-calling,' then seek help or step away.",
      "fit": "This may fit when speaking briefly feels safe.",
      "limit": "You do not have to confront anyone. Do not argue, threaten or try to physically stop a group.",
      "icon": ""
    },
    {
      "move": "Get an adult's help",
      "desc": "Tell an adult what you saw and where help is needed. If the first adult does not help, try another trusted adult.",
      "fit": "This is useful when behavior continues or someone may be in danger.",
      "limit": "You do not need a perfect account or proof. For danger happening now, seek help promptly rather than waiting until later.",
      "icon": ""
    },
    {
      "move": "Check in later",
      "desc": "If welcome, say that what happened was not okay and ask whether they want company or help.",
      "fit": "Later support can matter when you could not act in the moment.",
      "limit": "You do not have to apologize for being scared or freezing. Later kindness does not replace urgent help for current danger.",
      "icon": ""
    }
  ],
  "middle": [
    {
      "move": "Company with consent",
      "desc": "Ask before sitting nearby or accompanying someone. Offer choices about where and how to connect.",
      "fit": "This may fit when company is wanted and approaching will not increase exposure.",
      "limit": "Eye contact, touch and conversation are not required. Notice and respect a request for space.",
      "icon": ""
    },
    {
      "move": "Redirect without a spectacle",
      "desc": "Suggest a change of activity or topic if doing so feels safe and does not mock anyone.",
      "fit": "This can sometimes interrupt an audience's attention.",
      "limit": "It is not a guarantee. Do not invent a threat or use a redirect instead of help when someone is being physically harmed.",
      "icon": ""
    },
    {
      "move": "Name the behavior briefly",
      "desc": "If safe, name the action: 'Please stop mocking their answer.' You can stop there.",
      "fit": "This may fit when a short statement can set a limit without a prolonged exchange.",
      "limit": "A public label or debate can increase exposure. Direct speech is optional and is not a higher level of courage.",
      "icon": ""
    },
    {
      "move": "Private or delayed support",
      "desc": "If welcome, offer a brief check-in and ask what kind of support is useful.",
      "fit": "This may fit when immediate contact was unsafe or unwanted.",
      "limit": "A private message may be shared. Do not demand details, promise secrecy or make the person reassure you.",
      "icon": ""
    },
    {
      "move": "Stop participating and seek help",
      "desc": "Avoid adding laughter, reactions or forwarded content; step away if needed and consider a trusted support route.",
      "fit": "This may reduce your participation and help you reach safety.",
      "limit": "Bullying can continue without an audience. Leaving does not by itself protect someone; seek help when harm continues.",
      "icon": ""
    },
    {
      "move": "Report observations, not theories",
      "desc": "Tell a trusted adult what you directly saw or heard, where it happened, and what help is needed.",
      "fit": "This may fit repeated targeting, unsafe confrontation or an unresolved concern.",
      "limit": "Do not investigate, gather evidence at personal risk or promise anonymity. Ask how information and retaliation concerns will be handled.",
      "icon": ""
    }
  ],
  "high": [
    {
      "move": "Consent before visible solidarity",
      "desc": "Ask whether the person wants public company, quiet contact or a different kind of support.",
      "fit": "This may fit when visible support is welcome and the setting is sufficiently safe.",
      "limit": "Public association can reveal identity or draw attention. The person does not owe you a visible show of gratitude.",
      "icon": ""
    },
    {
      "move": "A direct limit is optional",
      "desc": "If you judge it safe, name a specific behavior and set a brief limit without threats or personal attacks.",
      "fit": "This may fit some settings where you have a safe exit and support.",
      "limit": "Social standing does not guarantee safety. Do not physically intervene or keep debating as risk increases.",
      "icon": ""
    },
    {
      "move": "Plan support with others carefully",
      "desc": "Ask a trusted adult or a small, appropriate support group how to help without adding exposure.",
      "fit": "This may fit a repeated pattern that needs coordinated action.",
      "limit": "More people can also mean more disclosure or retaliation. Do not assume a coalition is safer or organize a confrontation for the targeted person.",
      "icon": ""
    },
    {
      "move": "Respect dignity without a defense speech",
      "desc": "Name harmful behavior without making the person's worth depend on being talented, kind or likeable.",
      "fit": "This may fit when a response would otherwise become a public case for why someone deserves respect.",
      "limit": "Do not reveal private identity or history to persuade an audience. Everyone deserves safety without earning it through good traits.",
      "icon": ""
    },
    {
      "move": "Request changes in the setting",
      "desc": "With appropriate support, identify changes to supervision, reporting access or routines that could reduce repeated harm.",
      "fit": "This may fit when individual support has not addressed the conditions around the behavior.",
      "limit": "Adults remain responsible for responding. Do not require the targeted person to lead a campaign or face those harming them in mediation.",
      "icon": ""
    },
    {
      "move": "Offer support after the moment",
      "desc": "If welcome, acknowledge the behavior was wrong and offer a bounded next step, such as company or help reaching support.",
      "fit": "This may fit when you were unable to act earlier or the person wanted space.",
      "limit": "You do not need to perform guilt or promise unlimited availability. If you joined the harm, own that specific action separately.",
      "icon": ""
    }
  ]
};

  // Breaking the cycle — what actually works
  var CYCLE_BREAKERS = {
  "elementary": [
    {
      "id": "stop",
      "title": "Stop harm without carrying it",
      "scenario": "A child who was teased earlier is now teasing someone else during a game.",
      "notice": "Two harmful events may have happened. Each needs attention.",
      "unknown": "Being hurt does not mean someone will hurt others, and it does not tell us why this child did.",
      "learner": "The child needs to stop the teasing and can ask for help with what happened earlier.",
      "adult": "An adult should respond to both events, help protect each child and teach a different response.",
      "boundary": "No child has to absorb unkind treatment to keep it from reaching someone else.",
      "check": "Check that both situations receive help and that the teasing stops in later games."
    },
    {
      "id": "accountability",
      "title": "A limit and a way to learn",
      "scenario": "An adult stops a child from taking a classmate's supplies. The child says they did not know what else to do.",
      "notice": "The supplies were taken and need to be returned.",
      "unknown": "You do not know whether the child lacked a skill, ignored a rule or faced another difficulty.",
      "learner": "The child can return the supplies and practice asking before borrowing.",
      "adult": "The adult should set a clear limit, help restore access and teach or practice the needed skill.",
      "boundary": "The classmate does not have to lend supplies later or accept an apology before getting them back.",
      "check": "Check whether supplies stay available and borrowing happens with permission."
    },
    {
      "id": "review",
      "title": "Check that help worked",
      "scenario": "A teacher talks with children about name-calling. The next day the name-calling happens again away from the teacher.",
      "notice": "The first response did not stop the behavior across settings.",
      "unknown": "The teacher may not know it continued; the child experiencing it need not work out why.",
      "learner": "A child can tell a trusted adult that it happened again, with the details they know.",
      "adult": "Adults need to adjust supervision or support and check back rather than treating the first talk as completion.",
      "boundary": "The child experiencing harm does not have to confront the group or become more tolerant.",
      "check": "Check whether adults follow up where it happens and whether the child can join activities without targeting."
    }
  ],
  "middle": [
    {
      "id": "stop",
      "title": "Different responsibilities in the same situation",
      "scenario": "A student who was excluded from one group begins excluding a younger student elsewhere.",
      "notice": "The student may have experienced harm and also caused harm.",
      "unknown": "One event does not prove the cause of the other. Experiencing exclusion does not excuse using it.",
      "learner": "The student needs to stop excluding the younger student and can seek support for what happened to them.",
      "adult": "Adults should address both patterns, including access, accountability and the conditions that let them continue.",
      "boundary": "Do not ask either student to carry the other's distress or pretend responsibility is equal in every incident.",
      "check": "Check each pattern separately: has the harm stopped and is appropriate support available?"
    },
    {
      "id": "accountability",
      "title": "Repair does not require a meeting",
      "scenario": "A student offers an apology after repeatedly mocking a peer. The peer does not want to meet.",
      "notice": "An apology has been offered and a boundary has been stated.",
      "unknown": "You do not know whether a meeting would feel safe or be useful; declining does not show an unwillingness to heal.",
      "learner": "The student who mocked can stop, correct what they control and plan different behavior without demanding contact.",
      "adult": "Adults should address safety and accountability and avoid forcing mediation between people with unequal power.",
      "boundary": "No meeting, forgiveness or renewed friendship is required to make a repair plan meaningful.",
      "check": "Check the changed behavior and respect for no contact, rather than whether the apology was accepted."
    },
    {
      "id": "review",
      "title": "Support is not a courage contest",
      "scenario": "After an incident, one witness speaks publicly and another asks a trusted adult privately for help.",
      "notice": "The witnesses used different support routes.",
      "unknown": "Visibility does not tell you how safe, useful or wanted either response was.",
      "learner": "Witnesses can choose a supported route that fits the setting and the person's wishes.",
      "adult": "Adults should respond to the concern and protect those involved, including witnesses worried about retaliation.",
      "boundary": "Do not rank people by public bravery or treat a private report as a lower level of help.",
      "check": "Check whether the response reduced harm, respected boundaries and led to follow-through."
    }
  ],
  "high": [
    {
      "id": "stop",
      "title": "Address behavior and conditions",
      "scenario": "Harassment happens repeatedly in a poorly supervised area even after individual reminders to stop.",
      "notice": "The behavior continues in a particular setting.",
      "unknown": "You cannot conclude that either personal choices or the setting alone explain every incident.",
      "learner": "Students can describe observed behavior and suggest access or supervision concerns without investigating others.",
      "adult": "School adults need to address the behavior and the conditions around it, with a plan for monitoring and response.",
      "boundary": "A student should not have to lead a campaign or leave a needed activity to receive protection.",
      "check": "Check whether behavior changes in that area and elsewhere, and whether protection remains accessible."
    },
    {
      "id": "accountability",
      "title": "Support and accountability can work together",
      "scenario": "A student causing harm receives support from an adult while the school considers consequences under its procedures.",
      "notice": "Support and a response to harmful behavior are both being considered.",
      "unknown": "You cannot predict success from calling an approach restorative or punitive. How it is carried out matters.",
      "learner": "The student needs to stop the behavior and participate in a concrete plan for change.",
      "adult": "Adults should explain expectations, use appropriate procedures, protect the affected person and review the result.",
      "boundary": "Support does not erase responsibility. Consequences alone do not establish that learning, repair or safety has occurred.",
      "check": "Check specific behavior, continued access and retaliation, rather than relying on the name of the approach."
    },
    {
      "id": "review",
      "title": "Revise a plan that is not protecting people",
      "scenario": "An earlier intervention reduced public comments, but private messages now continue the harassment.",
      "notice": "The form of the behavior changed; the harm may still be continuing.",
      "unknown": "A quiet classroom does not by itself show that the problem is resolved.",
      "learner": "The affected person or a witness can use a trusted route to describe the continuation without spreading messages broadly.",
      "adult": "Adults need to revisit the plan, discuss privacy and retaliation concerns, and check whether new supports are working.",
      "boundary": "Do not treat a report of continued harm as failure by the person seeking help or require them to mediate it.",
      "check": "Look for sustained changes across settings and a clear way to get further help if the pattern returns."
    }
  ]
};

  // ── Practice Scenarios (branching) ──
  // Built-in scenarios compare conditional support routes without rating the learner.
  // Designed for in-person school contexts; cyberbullying is in Digital Wellbeing.
  var SCENARIOS = {
  "elementary": [
    {
      "id": "lunch_alone",
      "title": "Mocking at lunch",
      "situation": "Some children point and laugh at a classmate sitting alone at lunch.",
      "known": "You saw pointing and laughter directed toward the classmate.",
      "unknown": "You do not know whether they want company or what happened earlier.",
      "needs": "Check whether anyone is in immediate danger. Offer support without making the person the center of more attention.",
      "change": "The classmate says they want to sit alone, but asks you to tell an adult about the mocking.",
      "review": "Respect the request for space and help reach an adult. Sitting alone is not itself a problem to fix; the mocking is.",
      "options": [
        {
          "label": "Ask before joining",
          "response": "Would you like company, or would you prefer some space?",
          "fit": "This can fit when approaching is safe and the person welcomes company.",
          "limit": "Accept no without asking them to explain. Company alone does not stop ongoing targeting.",
          "id": "a"
        },
        {
          "label": "Get lunchroom support",
          "response": "Tell a nearby adult what you saw and ask them to help stop the mocking.",
          "fit": "This can fit when harm continues, approaching feels unsafe, or the classmate asks for help.",
          "limit": "Describe the behavior without calling the classmate lonely or assuming how they feel. Check whether the adult follows up.",
          "id": "b"
        }
      ]
    },
    {
      "id": "recess_chase",
      "title": "A chase that needs help",
      "situation": "Three children chase a classmate and try to grab their backpack. The classmate calls for them to stop.",
      "known": "The chase and grabbing attempts are happening now despite a request to stop.",
      "unknown": "You cannot know whether approaching would be safe or whether someone is hurt.",
      "needs": "Get adult help promptly from a safe position. Do not join the chase, physically separate people or wait until later to report ongoing danger.",
      "change": "You cannot see the usual recess monitor from where you are.",
      "review": "Use another nearby adult or the school's emergency-help route. If danger is immediate, call for urgent local help. Later kindness does not replace help during an active threat.",
      "options": [
        {
          "label": "Alert a nearby adult",
          "response": "From a safe place, call or signal a nearby adult and describe where the chase is happening.",
          "fit": "This fits an active situation needing adult attention.",
          "limit": "Do not run into the chase, grab someone, or film it instead of seeking help.",
          "id": "a"
        },
        {
          "label": "Reach another help route",
          "response": "Move away from the chase toward a staffed area, or ask a nearby person to alert an adult while you stay safe.",
          "fit": "This can fit when the usual monitor is not visible or approaching them would cross the chase.",
          "limit": "Do not delay for a perfect account. Use the school's urgent-help procedure or urgent local help if danger is immediate.",
          "id": "b"
        }
      ]
    }
  ],
  "middle": [
    {
      "id": "locker_push",
      "title": "A shove between classes",
      "situation": "You see a student shove another student toward a locker and walk away. Two witnesses laugh.",
      "known": "You saw the shove and the laughter.",
      "unknown": "You do not know whether someone is injured or whether this is part of repeated targeting.",
      "needs": "Help reach an adult promptly. Stay out of a confrontation and ask before offering company or touching someone.",
      "change": "The student says they are hurt and do not want to walk to class.",
      "review": "Get an adult to them rather than trying to move them yourself. Check that help arrived; you do not have to assess an injury.",
      "options": [
        {
          "label": "Get adult attention now",
          "response": "Tell a nearby adult about the shove and where the student is. Explain any request for help you hear.",
          "fit": "This can fit when there may be injury, repeated targeting or risk of another incident.",
          "limit": "Do not diagnose an injury or confront the student who shoved. Adult attention and follow-through matter.",
          "id": "a"
        },
        {
          "label": "Offer support while help is sought",
          "response": "From a safe distance, ask whether they want company while someone alerts an adult.",
          "fit": "This can fit when approaching is safe and support is welcome.",
          "limit": "Do not touch, move or escort them without considering their request and adult help. Do not make them minimize the shove to accept support.",
          "id": "b"
        }
      ]
    },
    {
      "id": "group_chat_real",
      "title": "Organized exclusion",
      "situation": "Friends say they have agreed to ignore a classmate and laugh that the person has 'got the hint'.",
      "known": "You heard an organized plan to isolate someone.",
      "unknown": "You do not know what support the classmate wants or how your friends might respond if challenged.",
      "needs": "Do not join the targeting. Consider power, retaliation and a trusted adult's help; the learner does not have to resolve the group dynamic alone.",
      "change": "The classmate says a public invitation would draw more attention and asks for quiet support.",
      "review": "Respect the preferred form of support. Ask an adult to address the pattern without making the classmate manage a public confrontation.",
      "options": [
        {
          "label": "Refuse to take part quietly",
          "response": "Stop joining the exclusion. If welcome, ask the classmate privately what kind of support would help.",
          "fit": "This can fit when public action would expose the person or put you at risk.",
          "limit": "Private contact can still be shared. Do not promise secrecy or take responsibility for fixing the whole group.",
          "id": "a"
        },
        {
          "label": "Plan supported action",
          "response": "Describe the pattern to a trusted adult and ask for help addressing exclusion and possible retaliation.",
          "fit": "This can fit when the group has social power or the behavior is repeated.",
          "limit": "Do not organize forced mediation or ask the targeted person to win the group's approval.",
          "id": "b"
        }
      ]
    },
    {
      "id": "gym_mock",
      "title": "Mocking during a drill",
      "situation": "Several students imitate a classmate's missed shots during a gym drill. The teacher is across the room.",
      "known": "The imitation targets a classmate's performance.",
      "unknown": "You do not know whether the classmate wants a partner, a break, or another kind of support.",
      "needs": "Get the teacher's attention if harm is continuing. Participation and eye contact are not requirements for receiving support.",
      "change": "The classmate declines a partner and says they want the teacher's help to take a break.",
      "review": "Respect the refusal and help contact the teacher. Do not make the person keep practicing to show confidence.",
      "options": [
        {
          "label": "Ask the teacher to act",
          "response": "Tell the teacher what the group is doing and where support is needed.",
          "fit": "This can fit while the mocking is continuing or when direct intervention feels unsafe.",
          "limit": "Do not require the classmate to demonstrate distress or identify themselves publicly before adults respond.",
          "id": "a"
        },
        {
          "label": "Offer a choice of company",
          "response": "If it feels safe, ask whether they want to practice together or would prefer help reaching the teacher.",
          "fit": "This can fit when the classmate wants company and the offer does not increase exposure.",
          "limit": "Accept a refusal. Do not insist on eye contact, continued practice or an explanation of their feelings.",
          "id": "b"
        }
      ]
    }
  ],
  "high": [
    {
      "id": "rumor_text",
      "title": "A degrading rumor",
      "situation": "At a gathering, you hear a degrading personal rumor about an absent peer. Others laugh.",
      "known": "A personal story is being circulated for ridicule.",
      "unknown": "You may not know the facts or what the absent person already knows. You do not need to investigate their private life.",
      "needs": "Avoid repeating details or claiming facts you cannot verify. Consider your own safety and a trusted support route.",
      "change": "Someone suggests posting the rumor publicly so everyone can judge whether it is true.",
      "review": "Do not amplify the rumor in a rebuttal or poll. Seek appropriate support if circulation or threats continue, and share only details needed for that purpose.",
      "options": [
        {
          "label": "Set a brief boundary if safe",
          "response": "I am not joining in or passing on personal rumors. Please stop sharing this.",
          "fit": "This can fit when a brief response feels safe and does not repeat the details.",
          "limit": "You do not have to claim the story is false if you cannot know, debate it, or pull the speaker aside alone.",
          "id": "a"
        },
        {
          "label": "Disengage and seek support",
          "response": "Leave the exchange if useful, avoid forwarding details, and use a trusted support route if the harm continues.",
          "fit": "This can fit when direct challenge would increase danger or spread the rumor.",
          "limit": "If you contact the peer, offer a choice about hearing more and avoid unnecessary details. Do not turn them into an investigator of their own harassment.",
          "id": "b"
        }
      ]
    },
    {
      "id": "isolate_friend",
      "title": "When a familiar group causes harm",
      "situation": "A group you belong to repeatedly changes plans to exclude one member and uses jokes aimed at them.",
      "known": "You have noticed repeated exclusion and targeted jokes.",
      "unknown": "You do not know what contact the person wants or whether you would face retaliation for a public challenge.",
      "needs": "Support can be private, delayed or assisted. You do not have to risk confrontation or offer unlimited access to be useful.",
      "change": "When you quietly refuse to join in, the group begins threatening to target you too.",
      "review": "Seek support for both people through a trusted adult or appropriate route. Retaliation changes the plan; escalating your confrontation is not a courage requirement.",
      "options": [
        {
          "label": "Offer bounded private support",
          "response": "I have noticed the excluding jokes. Would you like company, help finding support, or space?",
          "fit": "This can fit when contact is welcome and a private approach is safer for the people involved.",
          "limit": "You cannot promise to stop every incident. Respect no contact and do not make the peer comfort you about what you witnessed.",
          "id": "a"
        },
        {
          "label": "Get help with the pattern",
          "response": "Ask a trusted adult or school support person to help address repeated exclusion and risks to those who report.",
          "fit": "This can fit when the group holds power or a peer response has not helped.",
          "limit": "A public coalition is not automatically safer. Plan what information is needed and how retaliation will be addressed.",
          "id": "b"
        }
      ]
    },
    {
      "id": "ally_target",
      "title": "Identity-based harassment continues",
      "situation": "A peer is repeatedly targeted with identity-based slurs or jokes. An earlier report has not stopped it.",
      "known": "You have witnessed repeated harassment and know a report was made.",
      "unknown": "You may not know who is safe to involve or which personal details the peer wants kept private.",
      "needs": "The harassment needs adult action. Avoid outing the peer, making them prove harm, or treating this as an equal disagreement requiring mediation.",
      "change": "The peer fears being outed to family and says the first adult dismissed the report.",
      "review": "Look for another trusted school support route and explain the privacy and retaliation concerns. Do not promise secrecy you cannot control; immediate danger still needs urgent help.",
      "options": [
        {
          "label": "Ask about support and privacy",
          "response": "If welcome, ask which support person feels safe and what information should be shared for help.",
          "fit": "This can fit when the peer wants assistance reaching a trusted adult.",
          "limit": "They do not need to educate you about their identity or provide proof. You cannot promise to control how others handle a report.",
          "id": "a"
        },
        {
          "label": "Escalate the unresolved concern",
          "response": "Describe what you witnessed to another trusted school support person, including that the earlier report did not stop the harassment.",
          "fit": "This can fit when the first route did not respond adequately or harm continues.",
          "limit": "Keep identity details limited to what support requires. Ask about privacy and retaliation safeguards; do not put the burden of confronting harassers on the peer.",
          "id": "b"
        }
      ]
    }
  ]
};

  // ══════════════════════════════════════════════════════════════
  // ── Repair pathway (for students who have caused harm) ──
  // The hard, missing piece in most anti-bullying tools.
  // Restorative practice, not performative apology.
  // ══════════════════════════════════════════════════════════════
  var REPAIR_STEPS = {
  "elementary": [
    {
      "id": "stop",
      "title": "Stop harm and get support",
      "body": "Stop the action first. An adult can help everyone get space and help anyone who is hurt. You can ask for help with your own feelings without asking the other child to comfort you.",
      "question": "What needs to stop, and who can help? (optional)"
    },
    {
      "id": "name",
      "title": "Name behavior and known impact",
      "body": "Say what happened using words you know are true. Name what you did, not what kind of person you are. You do not have to guess how someone feels or say you did something you did not do.",
      "question": "What is known, and what should stay uncertain? (optional)"
    },
    {
      "id": "contact",
      "title": "Check contact and consent",
      "body": "An apology is an offer, not a reason to follow someone or make them listen. An adult can help check whether a message is welcome. No answer does not mean yes. You can change your actions without talking to the person.",
      "question": "What contact boundary needs to be respected? (optional)"
    },
    {
      "id": "repair",
      "title": "Choose a practical repair",
      "body": "Work with an adult on something that helps with the actual problem. Returning a belonging may help; a gift does not buy friendship. The other child does not have to join in, forgive you, or do the fixing.",
      "question": "What repair might fit, and what could make it worse? (optional)"
    },
    {
      "id": "practice",
      "title": "Practice a different response",
      "body": "Choose one action to practice and someone who can help you remember it. Feeling upset or wanting friends to laugh may help explain a choice, but it does not make hurting someone okay.",
      "question": "What could the learner practice with support? (optional)"
    },
    {
      "id": "review",
      "title": "Review what changed",
      "body": "Pick a time for an adult to check what happened next. Look for changed actions, not a smile or a thank-you. If harm continues, stop and get more help. You can revise a plan without giving up on change.",
      "question": "Who will check what changed, and when? (optional)"
    }
  ],
  "middle": [
    {
      "id": "stop",
      "title": "Stop harm and get support",
      "body": "Stop participating, respect separation, and involve an appropriate adult if harm or danger continues. Support for your own distress can happen separately. The person affected is not responsible for helping you feel better.",
      "question": "What needs to stop, and who can help? (optional)"
    },
    {
      "id": "name",
      "title": "Name behavior and known impact",
      "body": "Describe your action and its known effects specifically. Separate intention from impact and facts from uncertainty. Accountability does not require inventing a motive, accepting an inaccurate accusation, or calling yourself a bad person.",
      "question": "What is known, and what should stay uncertain? (optional)"
    },
    {
      "id": "contact",
      "title": "Check contact and consent",
      "body": "Check whether contact is wanted and permitted before offering an apology. Respect a refusal, silence or a no-contact direction; do not use friends to get around it. An adult can support separate conversations without arranging forced mediation.",
      "question": "What contact boundary needs to be respected? (optional)"
    },
    {
      "id": "repair",
      "title": "Choose a practical repair",
      "body": "Match repair to the harm and check possible side effects. A correction can spread a rumor further; a group meeting can create pressure. With adult support, choose a proportionate route that protects privacy and restores access where possible.",
      "question": "What repair might fit, and what could make it worse? (optional)"
    },
    {
      "id": "practice",
      "title": "Practice a different response",
      "body": "Identify a situation where the behavior could recur and rehearse an alternative. Context such as peer pressure can guide a support plan without becoming an excuse. Adults can teach skills and set clear limits at the same time.",
      "question": "What could the learner practice with support? (optional)"
    },
    {
      "id": "review",
      "title": "Review what changed",
      "body": "Agree on who will check, when, and what evidence matters: behavior, access and retaliation. The affected person need not monitor you or approve your progress. An apology or a completed worksheet does not show that harm stopped.",
      "question": "Who will check what changed, and when? (optional)"
    }
  ],
  "high": [
    {
      "id": "stop",
      "title": "Stop harm and get support",
      "body": "Stop the behavior and any recruitment of others into it. Follow appropriate adult support and response procedures when harm continues. Do not delay help to complete a reflection or try to resolve an unsafe situation through a private meeting.",
      "question": "What needs to stop, and who can help? (optional)"
    },
    {
      "id": "name",
      "title": "Name behavior and known impact",
      "body": "Name your specific contribution and the impact you can substantiate. Be clear about what you do not know. Intention does not erase impact, and accountability does not require a coerced confession or speculation about your history.",
      "question": "What is known, and what should stay uncertain? (optional)"
    },
    {
      "id": "contact",
      "title": "Check contact and consent",
      "body": "Contact, reconciliation and forgiveness are separate choices. Respect refusal, silence and no-contact boundaries across in-person, online and indirect routes. Any facilitated conversation requires appropriate safeguards and willing participation; it is not a required step in repair.",
      "question": "What contact boundary needs to be respected? (optional)"
    },
    {
      "id": "repair",
      "title": "Choose a practical repair",
      "body": "Consider who needs a correction or practical restoration, what details they need, and what further exposure it could cause. Plan with appropriate adult support. Public defense, a gift, payment or a policy campaign is not automatically a fitting repair.",
      "question": "What repair might fit, and what could make it worse? (optional)"
    },
    {
      "id": "practice",
      "title": "Practice a different response",
      "body": "Build a specific alternative for the next pressure point, including who can support it and what conditions adults should change. Support needs and consequences can coexist. You are responsible for your actions without being responsible for fixing every institutional condition.",
      "question": "What could the learner practice with support? (optional)"
    },
    {
      "id": "review",
      "title": "Review what changed",
      "body": "Review whether behavior changed and access improved, including less visible harm or retaliation. Set a concrete check-in with an appropriate adult. Trust may remain limited even when behavior improves; neither forgiveness nor a fixed timeline certifies repair.",
      "question": "Who will check what changed, and when? (optional)"
    }
  ]
};

  var REPAIR_CASES = {
  "elementary": [
    {
      "id": "name",
      "title": "An unwanted nickname",
      "scenario": "A child keeps using a nickname after a classmate asks them to stop. The classmate now wants space.",
      "applications": [
        "Stop using the nickname and ask an adult for help keeping the space requested.",
        "The child knows they kept using an unwanted name. They do not know every feeling the classmate has.",
        "Do not follow the classmate to say sorry. An adult can help find out later whether a message is wanted.",
        "Use the name the classmate wants. An adult can address others repeating the nickname without putting the classmate on the spot.",
        "Practice using the wanted name even when friends use the nickname. Ask an adult for help if the group keeps it going.",
        "An adult can check at the next class and again later whether the nickname stopped. The classmate does not need to become a friend."
      ]
    },
    {
      "id": "supplies",
      "title": "Taking supplies during art",
      "scenario": "A child has repeatedly taken a classmate's art supplies without asking. One brush is damaged. The child wants to give the classmate a present.",
      "applications": [
        "Stop taking the supplies. Ask the teacher to help return what belongs to the classmate and make sure they can continue the activity.",
        "Name the taking and the damaged brush. Do not assume the classmate will feel better because a present is offered.",
        "The classmate can decline a conversation or a gift. Returning belongings through the teacher does not require a meeting.",
        "The teacher can help arrange a suitable repair or replacement and access to supplies. A gift does not replace that responsibility.",
        "Practice asking to borrow and accepting no. The teacher can help the child find supplies of their own.",
        "Check at the next art lesson whether the classmate has usable materials and the taking has stopped. A thank-you is not the test."
      ]
    }
  ],
  "middle": [
    {
      "id": "rumor",
      "title": "A rumor and an unwanted message",
      "scenario": "A student repeated an unverified rumor in a small group. The peer affected has asked for no messages. The student proposes a public apology post.",
      "applications": [
        "Stop repeating the claim and asking others to defend it. Tell an appropriate adult if the group is continuing the harassment.",
        "The student knows they repeated an unverified claim. They should not claim to know all of its effects or declare the rumor true.",
        "Respect the request for no messages, including messages sent through friends. A draft can remain unsent.",
        "With adult guidance, consider a correction to the people who received the claim without repeating private details. A public post could introduce it to a new audience.",
        "Rehearse refusing to pass along unverified claims and asking for help when the group pressures the student to join in.",
        "An adult checks whether circulation and retaliation continue. Removing one post or receiving no reply does not establish that the harm stopped."
      ]
    },
    {
      "id": "project",
      "title": "Restoring a teammate's work",
      "scenario": "A student repeatedly deleted a teammate's contributions and claimed the work as their own. The teammate wants the teacher's help and declines a joint meeting.",
      "applications": [
        "Stop deleting or claiming the work. The teacher can protect access and review the contribution record.",
        "Name the deletions and the credit claimed. The teacher can establish disputed details separately rather than requiring the teammate to argue their case.",
        "Respect the declined meeting. The student can cooperate with a teacher-led correction without contacting the teammate.",
        "Restore recoverable work and correct credit through the teacher's agreed process. The teammate should not have to redo the lost work as the repair.",
        "Practice asking before editing someone else's contribution. The teacher can set permissions and a review process.",
        "At the next project checkpoint, the teacher checks access, accurate credit and whether exclusion continues. A new group assignment alone does not prove repair."
      ]
    }
  ],
  "high": [
    {
      "id": "privacy",
      "title": "Repair without further disclosure",
      "scenario": "A student shared a peer's private identity information in a group chat without permission. The peer asks for no contact and fears a public correction would spread it further.",
      "applications": [
        "Stop sharing the information and do not recruit others to explain or defend the disclosure. Seek appropriate adult support that takes privacy concerns seriously.",
        "Name the unauthorized disclosure. Do not infer the peer's identity beyond what they choose to share or claim to know how every recipient used the information.",
        "Respect no contact across channels. Do not ask friends to deliver an apology or ask the peer to reassure you.",
        "Discuss a limited response with an appropriate adult, sharing only details needed for support. A public explanation or repost of a screenshot could amplify the exposure.",
        "Practice checking permission before sharing another person's information. Adults can address group norms and ongoing harassment without making the peer a public example.",
        "Agree on an adult check-in about further sharing, access and retaliation. Deleted content cannot guarantee that copies are gone; revise the plan if exposure continues."
      ]
    },
    {
      "id": "exclusion",
      "title": "An apology accepted, harm continuing",
      "scenario": "A student organized repeated exclusion from a club. They apologized and the peer accepted, but other members still block the peer from activities.",
      "applications": [
        "Stop supporting the exclusion and ask the club adviser to address the continuing barriers. An accepted apology does not end that responsibility.",
        "Name the organizing and the continuing access problem. Do not assume the peer's acceptance means trust is restored or every effect is resolved.",
        "Do not seek repeated reassurance or ask the peer to attend a reconciliation event. Acceptance of an apology is not permission for every kind of contact.",
        "Work with the adviser on fair activity access and correcting the exclusionary directions. The peer should not have to earn readmission or lead the repair.",
        "Practice responding when members repeat the exclusion. The adviser sets and enforces participation expectations rather than leaving the student to manage the group alone.",
        "At the next two activities, the adviser checks actual participation and retaliation, with a private feedback route available. If barriers remain, the plan needs further action."
      ]
    }
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
    self_check_done:    { id: 'self_check_done', retired: true,    label: 'Honest Mirror',           icon: '🪞', color: '#7c3aed', desc: 'Took the role self-check' },
    pledge_sealed:      { id: 'pledge_sealed',      label: 'Pledge Sealed',           icon: '🏆', color: '#ca8a04', desc: 'Sealed your Upstander Pledge' },
    practice_courage:   { id: 'practice_courage', retired: true,   label: 'Practiced Courage',       icon: '🎭', color: '#2563eb', desc: 'Locked in strong responses in Practice' },
    repair_walked:      { id: 'repair_walked', retired: true,      label: 'Walked the Repair Path',  icon: '🔧', color: '#dc2626', desc: 'Completed the Repair pathway' },
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

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  // ══════════════════════════════════════════════════════════════
  // ── Registration ──
  // ══════════════════════════════════════════════════════════════

  // ─── Content libraries wired 2026-09-13 (archived Aug 25 as never-read; each now has a view) ───
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
var QUOTES_FROM_THE_MOVEMENT = [
    { id: 'qfm1', quote: 'If we could change ourselves, the tendencies in the world would also change.', author: 'Mahatma Gandhi, Indian Opinion (1913)', context: 'Active responsibility. The popular version of this line — \'be the change you wish to see in the world\' — is a later paraphrase that Gandhi never actually said or wrote.' },
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
      var _UPC_DARK = {'#fffaf0':'#2e2410','#2563eb':'#60a5fa','#fff':'#1e293b','#f8fafc':'#0f172a','#fafafa':'#1e293b','#f1f5f9':'#1e293b','#fef3c7':'#3a2e12','#fffbeb':'#2e2410','#fef9c3':'#3a3410','#fefce8':'#2e2a10','#fff7ed':'#2e2410','#fef2f2':'#2e1414','#fee2e2':'#3a1a1a','#fff1f2':'#2e1418','#f0fdf4':'#0b2e22','#ecfdf5':'#0e3326','#eff6ff':'#0e1f3a','#dbeafe':'#16315e','#f0f9ff':'#0c2840','#faf5ff':'#2e1b4d','#ede9fe':'#2a1a45','#f3e8ff':'#2e1b4d','#fdf4ff':'#2e1b4d','#0f172a':'#f1f5f9','#1f2937':'#e2e8f0','#334155':'#cbd5e1','#374151':'#cbd5e1','#475569':'#cbd5e1','#64748b':'#94a3b8','#94a3b8':'#94a3b8','#e5e7eb':'#334155','#e2e8f0':'#334155','#d1d5db':'#475569','#cbd5e1':'#475569','#92400e':'#fde68a','#78350f':'#fcd34d','#854d0e':'#fde68a','#a16207':'#fde047','#991b1b':'#fca5a5','#dc2626':'#f87171','#166534':'#86efac','#1e3a8a':'#93c5fd','#1e40af':'#93c5fd','#1d4ed8':'#93c5fd','#6b21a8':'#d8b4fe','#ecfeff':'#0c2e30','#0e7490':'#67e8f9','#9d174d':'#fbcfe8','#9a3412':'#fdba74'};
      var _UPC_HC = {'#fffaf0':'#000000','#2563eb':'#ffff00','#fff':'#000000','#f8fafc':'#000000','#fafafa':'#000000','#f1f5f9':'#000000','#fef3c7':'#000000','#fffbeb':'#000000','#fef9c3':'#000000','#fefce8':'#000000','#fff7ed':'#000000','#fef2f2':'#000000','#fee2e2':'#000000','#fff1f2':'#000000','#f0fdf4':'#000000','#ecfdf5':'#000000','#eff6ff':'#000000','#dbeafe':'#000000','#f0f9ff':'#000000','#faf5ff':'#000000','#ede9fe':'#000000','#f3e8ff':'#000000','#fdf4ff':'#000000','#0f172a':'#ffff00','#1f2937':'#ffff00','#334155':'#ffff00','#374151':'#ffff00','#475569':'#ffff00','#64748b':'#ffff00','#94a3b8':'#ffff00','#e5e7eb':'#ffff00','#e2e8f0':'#ffff00','#d1d5db':'#ffff00','#cbd5e1':'#ffff00','#92400e':'#ffff00','#78350f':'#ffff00','#854d0e':'#ffff00','#a16207':'#ffff00','#991b1b':'#ffff00','#dc2626':'#ffff00','#166534':'#ffff00','#1e3a8a':'#ffff00','#1e40af':'#ffff00','#1d4ed8':'#ffff00','#6b21a8':'#ffff00','#ecfeff':'#000000','#0e7490':'#ffff00','#9d174d':'#ffff00','#9a3412':'#ffff00'};
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
      var pledge      = (typeof d.pledge === 'string' ? d.pledge : '');
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
      var witnessLog        = (Array.isArray(d.witnessLog) ? d.witnessLog : []);
      var wlSaw             = (typeof d.wlSaw === 'string' ? d.wlSaw : '');
      var wlDid             = (typeof d.wlDid === 'string' ? d.wlDid : '');
      var wlNext            = (typeof d.wlNext === 'string' ? d.wlNext : '');
      // Trusted Adults state (inside Pledge tab)
      var trustedAdults     = (Array.isArray(d.trustedAdults) ? d.trustedAdults : []);
      var newAdultName      = (typeof d.newAdultName === 'string' ? d.newAdultName : '');
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
        earnedBadges = nb; // keep this render's copy current: a second award in one handler must add, not replace
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

      // BLUE stays the raw hue because it is also used for borders and left
      // rules; the four TEXT uses route through _upC so they follow the card.
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
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' }
        },
          h('div', { role: 'tablist', 'aria-label': 'Upstander sections', style: { display: 'flex', gap: '3px' } },
            TABS.map(function(t) {
            var a = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', { key: t.id, role: 'tab', className: 'sel-tab' + (a ? ' sel-tab-active' : ''), 'aria-selected': a ? 'true' : 'false', onClick: function() { upd('activeTab', t.id); if (soundOn) sfxClick(); },
              style: { padding: '6px 14px', borderRadius: '10px', border: a ? 'none' : '1px solid ' + (explored ? '#bfdbfe' : 'transparent'), background: a ? 'linear-gradient(135deg, ' + BLUE + ', #1d4ed8)' : explored ? 'rgba(37,99,235,0.06)' : 'transparent', color: a ? '#fff' : explored ? _upC('#1e3a8a') : _upC('#94a3b8'), fontWeight: a ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', boxShadow: a ? '0 3px 12px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none' }
            }, h('span', { className: a ? 'sel-hero-icon' : '', 'aria-hidden': 'true' }, t.icon), t.label,
              explored && !a ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#60a5fa', marginLeft: '2px' } }) : null
            );
            })
          ),
          h('span', { className: 'sel-badge', style: { marginLeft: '8px', fontSize: '10px', color: BD, fontWeight: 700, whiteSpace: 'nowrap', background: _upC('#dbeafe'), padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } }, exploredCount + '/' + TABS.length),
          h('button', { onClick: function() { upd('soundOn', !soundOn); }, className: 'sel-btn', 'aria-label': soundOn ? 'Mute' : 'Unmute', style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 } }, soundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        )
      );

      // Optional fictional reflections: band and example keep separate drafts.
      function renderCoreReflection(kind, data, title, lead, selectLabel, legacyIndex) {
        function record(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
        var coreBand = Object.prototype.hasOwnProperty.call(data, band) ? band : 'elementary';
        var items = data[coreBand];
        var selectionsKey = kind + 'CoreSelected', notesKey = kind + 'CoreNotes';
        var selections = record(d[selectionsKey]), allNotes = record(d[notesKey]);
        var selected = items.find(function(item) { return item.id === selections[coreBand]; });
        if (!selected) selected = items[Number.isInteger(legacyIndex) && legacyIndex >= 0 && legacyIndex < items.length ? legacyIndex : 0];
        var noteKey = coreBand + ':' + selected.id, notes = record(allNotes[noteKey]);
        function value(key) { return typeof notes[key] === 'string' ? notes[key] : ''; }
        function setNote(key, text) {
          var next = Object.assign({}, allNotes);
          next[noteKey] = Object.assign({}, notes); next[noteKey][key] = text;
          upd(notesKey, next);
        }
        var edge = _upCHC ? '#ffff00' : _upCDark ? '#94a3b8' : '#64748b';
        var control = { width: '100%', minHeight: 44, boxSizing: 'border-box', padding: 10, border: '1px solid ' + edge, borderRadius: 8, background: _upC('#fff'), color: _upC('#0f172a'), fontFamily: 'inherit', fontSize: 16 };
        var summaryStyle = { minHeight: 44, padding: '12px 0', cursor: 'pointer', fontWeight: 700 };
        function paragraph(label, text) { return h('p', null, h('strong', null, label + ': '), text); }
        function field(key, label) {
          var id = 'up-' + kind + '-core-' + key;
          return h('div', { style: { margin: '16px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700, marginBottom: 6 } }, label),
            h('textarea', { id: id, value: value(key), rows: 3, style: Object.assign({}, control, { resize: 'vertical' }), onChange: function(e) { setNote(key, e.target.value); } }));
        }
        var oldNote = kind === 'roles' && typeof record(d.roleReflect)[selected.id] === 'string' ? d.roleReflect[selected.id] : '';
        var hasOldScores = kind === 'roles' && Object.keys(record(d.scAnswers)).length > 0;
        return h('section', { role: 'region', 'aria-label': title, style: { background: _upC('#fff'), color: _upC('#0f172a'), padding: 16, border: '1px solid ' + edge, borderRadius: 14, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
          h('h2', { style: { margin: '0 0 8px', fontSize: 22, lineHeight: 1.3 } }, title),
          h('p', null, lead),
          h('p', null, 'Use these fictional examples. You can read, think, write, or skip any reflection. You do not need to share a personal experience, and these notes are not scored.'),
          h('label', { htmlFor: 'up-' + kind + '-core-select', style: { display: 'block', fontWeight: 700, marginBottom: 6 } }, selectLabel),
          h('select', { id: 'up-' + kind + '-core-select', style: control, value: selected.id, onChange: function(e) { var next = Object.assign({}, selections); next[coreBand] = e.target.value; upd(selectionsKey, next); } }, items.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); })),
          h('div', { key: noteKey },
            h('h3', { style: { fontSize: 18, lineHeight: 1.4 } }, selected.title),
            h('p', null, selected.scenario),
            h('details', { open: true, style: { borderTop: '1px solid ' + edge } },
              h('summary', { style: summaryStyle }, '1. Notice without guessing'),
              paragraph('What is observed', selected.notice), paragraph('What is not known', selected.unknown),
              field('notice', 'What can you notice, and what is still unknown? (optional)')),
            h('details', { style: { borderTop: '1px solid ' + edge } },
              h('summary', { style: summaryStyle }, '2. Separate choices and responsibilities'),
              paragraph('Learner choices', selected.learner), paragraph('Adult responsibility', selected.adult), paragraph('A boundary to protect', selected.boundary),
              field('plan', 'Who can help, and what responsibility belongs to them? (optional)')),
            h('details', { style: { borderTop: '1px solid ' + edge } },
              h('summary', { style: summaryStyle }, '3. Check support and follow-through'),
              paragraph('A follow-through check', selected.check),
              field('review', 'What would show that support needs to change? (optional)')),
            oldNote.trim() && h('details', { style: { borderTop: '1px solid ' + edge } },
              h('summary', { style: summaryStyle }, 'Earlier reflection: grade band unassigned'),
              h('p', null, 'This earlier reflection has no recorded grade band. It remains unchanged and has not been assigned to this fictional example. Copy it only if you want to use it here.'),
              h('p', { style: { whiteSpace: 'pre-wrap' } }, oldNote),
              h('button', { type: 'button', disabled: value('notice').length > 0, style: Object.assign({}, control, { cursor: value('notice').length ? 'default' : 'pointer' }), onClick: function() { if (!value('notice').length) setNote('notice', oldNote); } }, 'Copy earlier reflection into empty noticing note'),
              value('notice').length > 0 && h('p', { role: 'status' }, 'Your current noticing note is kept. Clear it yourself before copying an earlier reflection.'))
          ),
          hasOldScores && h('p', null, 'Earlier self-check answers remain in your project data. They are not used here to classify you or calculate role percentages.'),
          h('p', { style: { marginBottom: 0 } }, 'Notes stay separate for each example and grade band in this project. Use the hub save controls to keep your project. Review personal details before sharing it.')
        );
      }

      // ── Three Roles ──
      var rolesContent = null;
      if (activeTab === 'roles') {
        rolesContent = h('div', { style: { padding: '20px', maxWidth: '640px', margin: '0 auto' } },
          renderCoreReflection('roles', ROLES, 'Role, behavior and support', 'Roles describe what is happening in a situation, not a fixed identity. A person may have different experiences over time. Support needs and responsibility are not the same for everyone.', 'Choose a role example', roleIdx),
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
                  // Half-migrated: the OPEN state routed through _upC, the closed
                  // state kept a raw #fffaf0. The card's text is color:'inherit',
                  // so on the dark tool shell it inherited light text onto a light
                  // card (1.43:1), and in high contrast yellow onto near-white
                  // (1.03:1). Both states now route through the same remap.
                  background: _upC(bvOpen ? '#fff7ed' : '#fffaf0'),
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
        var guideSurface = _upC('#fff'), guideInk = _upC('#0f172a');
        var guideEdge = ctx.theme && ctx.theme.isContrast ? '#ffff00' : ctx.theme && ctx.theme.isDark ? '#94a3b8' : '#64748b';
        movesContent = h('div', { style: { padding: '16px', maxWidth: '760px', margin: '0 auto' } },
          h('section', { 'aria-label': 'Contextual upstander strategies', style: { padding: '16px', background: guideSurface, color: guideInk, border: '1px solid ' + guideEdge, borderRadius: '12px', fontSize: '14px', lineHeight: 1.65, overflowWrap: 'anywhere' } },
            h('h3', { style: { fontSize: '22px', margin: '0 0 8px' } }, 'Choose support that fits the situation'),
            h('p', null, "These approaches are not a ladder of courage or fixed levels of risk. Consider immediate danger, power, possible retaliation, the person's wishes and available adult support. You can combine approaches or seek help before choosing."),
            h('p', null, 'For current physical danger, move toward safety and alert an adult or urgent local help. Do not physically intervene or delay help to collect proof. Quiet and later support are meaningful; neither replaces urgent help when it is needed.'),
            moves.map(function(move, index) {
              return h('details', { key: index, open: index === 0, style: { margin: '14px 0', padding: '12px', border: '1px solid ' + guideEdge, borderRadius: '10px', minWidth: 0 } },
                h('summary', { style: { minHeight: '44px', padding: '10px 0', boxSizing: 'border-box', fontWeight: 700, cursor: 'pointer' } }, move.move),
                h('p', null, move.desc),
                h('p', null, h('strong', null, 'When it may fit: '), move.fit),
                h('p', null, h('strong', null, 'What to check: '), move.limit)
              );
            })
          ),

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
                style: { background: _upC('#fff'), color: _upC('#0f172a'), width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('label', { htmlFor: 'us-rh-att', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Your draft — what you would say out loud'),
              h('textarea', { id: 'us-rh-att', value: rhAttempt,
                onChange: function(e) { upd('rhAttempt', e.target.value); },
                placeholder: 'Type the exact words you would actually say...',
                rows: 3,
                style: { background: _upC('#fff'), color: _upC('#0f172a'), width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
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
        cycleContent = h('div', { style: { padding: '20px', maxWidth: '640px', margin: '0 auto' } },
          renderCoreReflection('cycle', CYCLE_BREAKERS, 'Shared responsibility for stopping harm', 'Stopping harm can take clear limits, support, changes to the setting, and repeated follow-through. No learner has to absorb harm or solve it alone.', 'Choose a shared-responsibility example', cycleIdx),
          // ── REPAIR pathway (for students who have been the one causing harm) ──
          (function() {
            var repairBand = Object.prototype.hasOwnProperty.call(REPAIR_STEPS, band) ? band : 'elementary';
            var steps = REPAIR_STEPS[repairBand], cases = REPAIR_CASES[repairBand];
            function record(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
            var selections = record(d.repairCaseSelections), drafts = record(d.repairDrafts);
            var current = cases.find(function(item) { return item.id === selections[repairBand]; }) || cases[0];
            var draftKey = repairBand + ':' + current.id, draft = record(drafts[draftKey]);
            var initialStep = Number.isInteger(repairStep) && repairStep >= 0 && repairStep < steps.length ? repairStep : 0;
            var edge = _upCHC ? '#ffff00' : _upCDark ? '#94a3b8' : '#64748b';
            var control = { width: '100%', minHeight: 44, boxSizing: 'border-box', padding: 10, border: '1px solid ' + edge, borderRadius: 8, background: _upC('#fff'), color: _upC('#0f172a'), fontFamily: 'inherit', fontSize: 16 };
            return h('div', { style: { marginTop: 24 } },
              h('button', {
                type: 'button', onClick: function() { upd('repairOpen', !repairOpen); },
                'aria-expanded': repairOpen ? 'true' : 'false', 'aria-controls': 'up-repair-body',
                style: Object.assign({}, control, { textAlign: 'left', cursor: 'pointer', fontWeight: 700 })
              }, 'Repair: choices, consent and follow-through'),
              h('div', { id: 'up-repair-body', hidden: !repairOpen }, repairOpen && h('div', { style: { marginTop: 12 } },
                h('section', { role: 'region', 'aria-label': 'Repair planning practice', style: { padding: 16, borderRadius: 14, border: '1px solid ' + edge, background: _upC('#fff'), color: _upC('#0f172a'), fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
                  h('h2', { style: { margin: '0 0 8px', fontSize: 22, lineHeight: 1.3 } }, 'Repair is more than an apology'),
                  h('p', null, 'Explore a fictional situation without identifying yourself as someone who caused harm. Read, discuss, think, or write; all notes are optional. These questions can be revisited in any order.'),
                  h('p', null, 'The aim is changed behavior and appropriate support. Contact, forgiveness and friendship are not requirements. Reading or filling this out does not prove repair, earn a badge, or send an apology.'),
                  h('label', { htmlFor: 'up-repair-case', style: { display: 'block', fontWeight: 700, marginBottom: 6 } }, 'Choose a repair situation'),
                  h('select', { id: 'up-repair-case', value: current.id, style: control, onChange: function(e) { var next = Object.assign({}, selections); next[repairBand] = e.target.value; upd('repairCaseSelections', next); } }, cases.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); })),
                  h('h3', { style: { fontSize: 18, lineHeight: 1.4 } }, current.title),
                  h('p', null, current.scenario),
                  h('div', { key: draftKey }, steps.map(function(step, index) {
                    var fieldId = 'up-repair-note-' + step.id;
                    return h('details', { key: step.id, open: index === initialStep, style: { borderTop: '1px solid ' + edge } },
                      h('summary', { style: { minHeight: 44, padding: '12px 0', cursor: 'pointer', fontWeight: 700 } }, step.title),
                      h('p', null, step.body),
                      h('p', null, h('strong', null, 'In this situation: '), current.applications[index]),
                      h('label', { htmlFor: fieldId, style: { display: 'block', fontWeight: 700, marginBottom: 6 } }, step.question),
                      h('textarea', { id: fieldId, rows: 3, value: typeof draft[step.id] === 'string' ? draft[step.id] : '', style: Object.assign({}, control, { resize: 'vertical', marginBottom: 16 }), onChange: function(e) {
                        var next = Object.assign({}, drafts); next[draftKey] = Object.assign({}, draft); next[draftKey][step.id] = e.target.value; upd('repairDrafts', next);
                      } })
                    );
                  })),
                  h('p', null, 'Notes stay separate for each situation and grade band in this project. Use the hub save controls to keep them. Review personal details before sharing.'),
                  h('button', { type: 'button', style: Object.assign({}, control, { cursor: 'pointer', fontWeight: 700 }), onClick: function() {
                    upd('repairOpen', false);
                    // The trigger stays mounted; return focus after hiding the guide.
                    var body = document.getElementById('up-repair-body');
                    if (body && body.previousElementSibling) body.previousElementSibling.focus();
                  } }, 'Close repair guide')
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
                        'Use a fictional situation and an optional draft. Feedback cannot establish consent or predict a response.')
                    ),
                    h('span', { 'aria-hidden': 'true', style: { color: _upC('#dc2626'), fontSize: 16 } }, apOpen ? '▾' : '▸')
                  ),
                  apOpen && h('div', { style: { marginTop: 10, padding: 14, background: _upC('#fff'), border: '1px solid #fecaca', borderRadius: 12 } },
                    h('p', { style: { margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: _upC('#475569') } },
                      'Use fictional names and omit identifying details. Requesting feedback sends the situation and draft to the configured AI service. A draft can stay unsent. Respect refusal, silence and no-contact boundaries; an apology does not require a conversation.'),
                    h('label', { htmlFor: 'us-ap-hurt', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                      'Fictional situation (omit identifying details)'),
                    h('textarea', { id: 'us-ap-hurt', value: apHurt,
                      onChange: function(e) { upd('apHurt', e.target.value); },
                      placeholder: 'Example: My friend J — I told the group their secret as a joke and they heard about it.',
                      rows: 2,
                      style: { background: _upC('#fff'), color: _upC('#0f172a'), width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
                    }),
                    h('label', { htmlFor: 'us-ap-draft', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                      'Optional apology draft for feedback'),
                    h('textarea', { id: 'us-ap-draft', value: apDraft,
                      onChange: function(e) { upd('apDraft', e.target.value); },
                      placeholder: 'Type your apology as if you were saying it out loud...',
                      rows: 4,
                      style: { background: _upC('#fff'), color: _upC('#0f172a'), width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
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
                            '1) What the draft clearly acknowledges — specific actions and known impact\n' +
                            '2) What needs checking — consent, privacy, uncertainty, \"but,\" minimizing, centering yourself, asking for forgiveness too early\n' +
                            '3) One concrete tweak that would strengthen it\n\n' +
                            'Be specific. Use the actual words from their draft when you reference them. ' +
                            'Do not write the perfect apology for them — their voice matters more than yours. ' +
                            'Do not predict how the recipient will respond or promise forgiveness. Respect refusal, silence and no-contact directions; never suggest contacting through friends or another channel. An unsent draft and changed behavior are valid options. Do not require a meeting, public correction or disclosure. Describe known impact without inventing feelings or motives. Tone: warm, real, no emojis.\n\n' +
                            'WHAT HAPPENED: \"' + apHurt.trim().replace(/"/g, '\\\"') + '\"\n' +
                            'THEIR DRAFT: \"' + apDraft.trim().replace(/"/g, '\\\"') + '\"';
                          callGemini(prompt, false).then(function(r) {
                            upd({ apLoading: false, apFeedback: (r || '').trim(), _lastTier: apSafety.action === 'nudge' ? 2 : 0 });
                            if (soundOn) sfxBrave();
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
                      'AI-generated feedback may be mistaken. It cannot establish consent, certify repair, or decide whether contact is appropriate. No message is sent to the person in the situation.')
                  )
                )
              ))
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
                h('span', { 'aria-hidden': 'true', style: { color: _upC(BLUE), fontSize: 18 } }, afterOpen ? '▾' : '▸')
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
                        style: { padding: '8px 14px', background: '#047857', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
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
                        style: { padding: '8px 14px', background: '#047857', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
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
                h('strong', { style: { color: _upC(BLUE) } }, 'For teachers, school psychologists, counselors, administrators. '),
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
                    style: { padding: '8px 14px', background: '#854d0e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12 }
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
                    style: { background: _upC('#fff'), marginTop: 4, padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: _upC('#0f172a') }
                  })
                ),
                h('label', { style: { flex: '1 1 140px', display: 'flex', flexDirection: 'column', fontSize: 11, color: _upC('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } },
                  'How you know them',
                  h('input', { type: 'text', value: newAdultRole,
                    onChange: function(e) { upd('newAdultRole', e.target.value); },
                    placeholder: 'School counselor',
                    style: { background: _upC('#fff'), marginTop: 4, padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: _upC('#0f172a') }
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
                style: { background: _upC('#fff'), color: _upC('#0f172a'), width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('label', { htmlFor: 'us-wl-did', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What I did \u2014 or did not do'),
              h('textarea', { id: 'us-wl-did', value: wlDid, onChange: function(e) { upd('wlDid', e.target.value); },
                placeholder: 'Honesty over performance. "I froze" is a valid answer.',
                rows: 2,
                style: { background: _upC('#fff'), color: _upC('#0f172a'), width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('label', { htmlFor: 'us-wl-next', style: { display: 'block', fontSize: 11, fontWeight: 700, color: _upC('#475569'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What I would do next time'),
              h('textarea', { id: 'us-wl-next', value: wlNext, onChange: function(e) { upd('wlNext', e.target.value); },
                placeholder: 'One specific thing. Even small counts.',
                rows: 2,
                style: { background: _upC('#fff'), color: _upC('#0f172a'), width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
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
            var allBadgeIds = Object.keys(BADGE_CATALOG).filter(function(id) { return !BADGE_CATALOG[id].retired || earnedBadges[id]; }); // retired badges show only to students who earned them
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
                    border: '2px ' + (earned ? 'solid ' : 'dashed ') + (earned ? b.color : _upC('#94a3b8')),
                    background: earned ? _upC('#fff') : _upC('#f8fafc'),
                    textAlign: 'center'
                  } },
                    h('div', { 'aria-hidden': 'true', style: {
                      width: 44, height: 44, borderRadius: '50%',
                      background: earned ? 'linear-gradient(135deg, ' + b.color + ' 0%, ' + b.color + 'cc 100%)' : _upC('#cbd5e1'),
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, margin: '0 auto 6px', filter: earned ? 'none' : 'grayscale(1)',
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
                style: { background: _upC('#fff'), color: _upC('#0f172a'), flex: 1, border: '2px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
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
        var practiceBand = Object.prototype.hasOwnProperty.call(SCENARIOS, band) ? band : 'elementary';
        var dilemmas = SCENARIOS[practiceBand];
        var selectedPractice = d.practiceSelections && d.practiceSelections[practiceBand];
        var legacyPracticeIndex = Number.isInteger(d.pracIdx) && d.pracIdx >= 0 ? d.pracIdx % dilemmas.length : 0;
        var curD = dilemmas.find(function(item) { return item.id === selectedPractice; }) || dilemmas[legacyPracticeIndex];
        // Grade band is part of the key, so similarly named future cases stay independent.
        var practiceKey = practiceBand + ':' + curD.id;
        var practiceCases = d.practiceCases && typeof d.practiceCases === 'object' && !Array.isArray(d.practiceCases) ? d.practiceCases : {};
        var savedPractice = practiceCases[practiceKey];
        var practiceCase = savedPractice && typeof savedPractice === 'object' && !Array.isArray(savedPractice) ? savedPractice : {};
        var practiceNote = function(key) { return typeof practiceCase[key] === 'string' ? practiceCase[key] : ''; };
        var savePractice = function(values) {
          var next = Object.assign({}, practiceCases);
          next[practiceKey] = Object.assign({}, practiceCase, values);
          upd('practiceCases', next);
        };
        var practiceSurface = _upC('#fff'), practiceInk = _upC('#1f2937');
        var practiceEdge = ctx.theme && ctx.theme.isContrast ? '#ffff00' : ctx.theme && ctx.theme.isDark ? '#94a3b8' : '#64748b';
        var practiceCard = { padding: '16px', margin: '14px 0', background: practiceSurface, color: practiceInk, border: '1px solid ' + practiceEdge, borderRadius: '12px', minWidth: 0 };
        var practiceControl = { minHeight: '44px', maxWidth: '100%', width: '100%', padding: '10px', border: '1px solid ' + practiceEdge, borderRadius: '8px', background: practiceSurface, color: practiceInk, font: 'inherit', fontSize: '16px', boxSizing: 'border-box' };
        var practiceButton = { minHeight: '44px', padding: '10px 14px', border: '2px solid ' + practiceEdge, borderRadius: '8px', background: practiceSurface, color: practiceInk, font: 'inherit', fontWeight: 700, cursor: 'pointer', maxWidth: '100%', whiteSpace: 'normal' };
        var practiceSummary = { minHeight: '44px', padding: '10px 0', fontWeight: 700, cursor: 'pointer', boxSizing: 'border-box' };
        var practiceField = function(key, label, hint) {
          var id = 'up-practice-' + key;
          return h('div', { key: key, style: { margin: '14px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, label),
            h('p', { id: id + '-hint', style: { margin: '4px 0 8px' } }, hint),
            h('textarea', { id: id, rows: 3, value: practiceNote(key), 'aria-describedby': id + '-hint',
              onChange: function(ev) { var values = {}; values[key] = ev.target.value; savePractice(values); },
              style: Object.assign({}, practiceControl, { resize: 'vertical' }) })
          );
        };
        var chosenPractice = curD.options.find(function(option) { return option.id === practiceNote('choice'); });
        var revisedPractice = curD.options.find(function(option) { return option.id === practiceNote('revisedChoice'); });
        var corePractice = h('section', { 'aria-label': "Upstander support practice", style: { padding: '16px', maxWidth: '760px', margin: '0 auto', background: practiceSurface, color: practiceInk, fontSize: '14px', lineHeight: 1.65, overflowWrap: 'anywhere' } },
          h('h3', { style: { fontSize: '22px', margin: '0 0 8px' } }, "Upstander practice: support with care"),
          h('p', null, "Explore fictional situations without acting them out. Check immediate danger, the person's wishes, power and available adult support. No single route is always safe or guaranteed to work."),
          h('p', null, "All writing and choices are optional. Think, draw or discuss instead. Direct confrontation is not required. If danger is happening now, move toward safety and get adult or urgent local help; do not delay to finish this activity."),
          h('p', null, "Notes stay in this tool state. Use the project save controls to keep a project copy. Avoid names or identifying details. This practice does not send a report or contact anyone."),
          h('label', { htmlFor: 'up-practice-case', style: { display: 'block', fontWeight: 700 } }, "Choose an upstander scenario"),
          h('select', { id: 'up-practice-case', value: curD.id, style: practiceControl,
            onChange: function(ev) { var next = Object.assign({}, d.practiceSelections || {}); next[practiceBand] = ev.target.value; upd('practiceSelections', next); } },
            dilemmas.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); })
          ),
          h('div', { key: practiceKey },
            h('article', { style: practiceCard, 'aria-labelledby': 'up-practice-case-title' },
              h('h4', { id: 'up-practice-case-title', style: { fontSize: '18px', margin: '0 0 8px' } }, curD.title),
              h('p', null, curD.situation)
            ),
            h('details', { open: true, style: practiceCard },
              h('summary', { style: practiceSummary }, "1. Notice the situation and support needed"),
              h('p', null, h('strong', null, 'What is known: '), curD.known),
              h('p', null, h('strong', null, 'What remains uncertain: '), curD.unknown),
              h('p', null, h('strong', null, "Safety and support priorities: "), curD.needs),
              practiceField('notice', "What matters for safety and consent? (optional)", "Use what you directly noticed. You do not need to investigate motives or gather proof before asking for help."),
              practiceField('first', "Your first support plan (optional)", "Describe a supported next step. Quiet support, getting help or stepping toward safety may fit better than speaking directly.")
            ),
            h('details', { style: practiceCard },
              h('summary', { style: practiceSummary }, '2. Compare approaches and their limits'),
              h('p', null, 'These are possible routes, not a right-answer pair. Compare both, choose one to explore, combine ideas in your notes, or use a different route.'),
              curD.options.map(function(option) {
                var selected = chosenPractice && chosenPractice.id === option.id;
                return h('article', { key: option.id, style: practiceCard, 'aria-labelledby': 'up-practice-option-' + option.id },
                  h('h4', { id: 'up-practice-option-' + option.id, style: { fontSize: '17px', margin: '0 0 8px' } }, option.label),
                  h('p', null, option.response),
                  h('p', null, h('strong', null, 'When this may fit: '), option.fit),
                  h('p', null, h('strong', null, 'Limit to consider: '), option.limit),
                  h('button', { type: 'button', style: practiceButton, 'aria-pressed': !!selected,
                    onClick: function() { savePractice({ choice: selected ? '' : option.id }); } }, (selected ? 'Selected: ' : 'Explore: ') + option.label)
                );
              }),
              h('p', { role: 'status', 'aria-live': 'polite' }, chosenPractice ? 'Route being explored: ' + chosenPractice.label + '. Select it again to leave the choice blank. Your own plan can be different.' : 'No route selected. You can compare without choosing.'),
              practiceField('privacy', "Who should help, and what do they need to know? (optional)", "Name a support route and the observations needed for help. Consider privacy and retaliation; do not promise anonymity or require the person to prove harm.")
            ),
            h('div', { style: practiceCard },
              h('h4', { id: 'up-practice-change-title', style: { fontSize: '18px', margin: '0 0 8px' } }, '3. Reconsider after new information'),
              h('button', { type: 'button', style: practiceButton, 'aria-expanded': practiceCase.changeSeen === true, 'aria-controls': 'up-practice-change',
                onClick: function() { savePractice({ changeSeen: true }); } }, practiceCase.changeSeen === true ? 'New information shown' : 'Explore new information'),
              h('div', { id: 'up-practice-change', hidden: practiceCase.changeSeen !== true },
                h('p', null, h('strong', null, 'Imagine this happens: '), curD.change),
                h('p', null, h('strong', null, 'Your earlier route: '), chosenPractice ? chosenPractice.label : 'No route selected. Your first notes remain above.'),
                h('label', { htmlFor: 'up-practice-revised-choice', style: { display: 'block', fontWeight: 700 } }, 'A route after the change (optional)'),
                h('select', { id: 'up-practice-revised-choice', style: practiceControl, value: revisedPractice ? revisedPractice.id : practiceNote('revisedChoice') === 'different' ? 'different' : '',
                  onChange: function(ev) { savePractice({ revisedChoice: ev.target.value }); } },
                  h('option', { value: '' }, 'Leave open for now'),
                  curD.options.map(function(option) { return h('option', { key: option.id, value: option.id }, option.label); }),
                  h('option', { value: 'different' }, 'A different or combined route')
                ),
                practiceField('revised', 'What would you keep or change, and why? (optional)', 'A reasoned choice can stay the same or change. Your first response and earlier selection remain separate and editable.'),
                h('details', null,
                  h('summary', { style: practiceSummary }, 'Consider a follow-through check'),
                  h('p', null, curD.review),
                  practiceField('followup', 'What would tell you that more support is needed? (optional)', "Check whether help arrived, harm continues or a new risk appeared. Adults remain responsible for responding; you do not have to resolve the situation alone.")
                )
              )
            )
            ,(d.pracChoice != null || (d.pracDone && typeof d.pracDone === 'object' && Object.keys(d.pracDone).length > 0)) && h('details', { style: practiceCard },
              h('summary', { style: practiceSummary }, 'Earlier practice records are retained'),
              h('p', null, 'Earlier choices and completion records remain saved. These revised routes have different meanings, so older rated answers are not assigned to the new choices.')
            )
          )
        );
        pracContent = h('div', { style: { padding: '0 0 16px' } }, corePractice,

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
                  style: { background: _upC('#fff'), color: _upC('#0f172a'), width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }
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
                          if (awardXP) awardXP(10, 'Generated a practice scenario'); // no badge was ever defined for this
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
                      style: { background: _upC('#fff'), color: _upC('#0f172a'), width: '100%', padding: 10, fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }
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
                            addToast('The practice partner could not reply just now. What you wrote is saved — try again.', 'error');
                            if (announceToSR) announceToSR('The practice partner could not reply just now. What you wrote is saved — try again.');
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
                            tryAwardBadge('rehearsed', 20); // a role-play reflection is AI feedback on a rehearsal ('roleplayed' matched no badge)
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


      // This tool is light-base: _upC maps light hexes to dark and high-contrast. The shared
      // panel helpers are written in dark-base hexes, so translate to light-base first.
      var _UPW_FG = { '#f1f5f9': '#0f172a', '#e2e8f0': '#1e293b', '#cbd5e1': '#334155', '#94a3b8': '#64748b', '#5eead4': '#0e7490' };
      var _UPW_BG = { '#1e293b': '#fff', '#0f172a': '#f8fafc' };
      var _UPW_BD = { '#334155': '#e2e8f0', '#475569': '#cbd5e1' };
      var _upW_fg = function(hex) { return _upC(_UPW_FG[hex] || hex); };
      var _upW_bg = function(hex) { return _upC(_UPW_BG[hex] || hex); };
      var _upW_bd = function(hex) { return _upC(_UPW_BD[hex] || hex); };


      // This tool is light-base: _upC maps light hexes to dark and high-contrast. The shared
      // panel helpers are written in dark-base hexes, so translate to light-base first.
      // '#1f2937' rather than '#1e293b' for body text: it is the light-base grey this tool's
      // dark map knows ('#1f2937' -> '#e2e8f0'); '#1e293b' is not in the map and would stay dark on dark.
      var _UPW_FG = { '#f1f5f9': '#0f172a', '#e2e8f0': '#1f2937', '#cbd5e1': '#334155', '#94a3b8': '#64748b', '#5eead4': '#0e7490' };
      var _UPW_BG = { '#1e293b': '#fff', '#0f172a': '#f8fafc' };
      var _UPW_BD = { '#334155': '#e2e8f0', '#475569': '#cbd5e1' };
      var _upW_fg = function(hex) { return _upC(_UPW_FG[hex] || hex); };
      var _upW_bg = function(hex) { return _upC(_UPW_BG[hex] || hex); };
      var _upW_bd = function(hex) { return _upC(_UPW_BD[hex] || hex); };

      // ─── Wired-content helpers (2026-09-13) ─────────────────────────────
      // Plain headings, lists and disclosures; buttons carry names and pressed
      // state; every colour goes through the tool's theme mapper; no motion.
      function _upW_txt(x) { return x && typeof x === 'object' && !Array.isArray(x) ? (x[band] || x.middle || x.elementary || x.high || '') : (x == null ? '' : String(x)); }
      function _upW_label(k) { return String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function(c) { return c.toUpperCase(); }); }
      function _upW_panel(key, title, blurb, children, accent) {
        var hid = '_upW-wired-' + key;
        return h('section', { 'aria-labelledby': hid, style: { margin: '18px 12px 0', padding: 14, borderRadius: 12, background: _upW_bg('#1e293b'), borderLeft: '4px solid ' + (accent || '#a78bfa') } },
          h('h3', { id: hid, style: { margin: '0 0 4px', fontSize: 15, fontWeight: 900, color: _upW_fg('#f1f5f9') } }, title),
          blurb ? h('p', { style: { margin: '0 0 10px', fontSize: 12, color: _upW_fg('#94a3b8'), lineHeight: 1.5 } }, blurb) : null,
          children
        );
      }
      function _upW_details(summary, body, key) {
        return h('details', { key: key, style: { marginBottom: 6, borderRadius: 8, border: '1px solid ' + _upW_bd('#334155'), background: _upW_bg('#0f172a') } },
          h('summary', { style: { cursor: 'pointer', padding: '10px 12px', fontSize: 13, fontWeight: 700, color: _upW_fg('#e2e8f0'), minHeight: 44, display: 'flex', alignItems: 'center' } }, summary),
          h('div', { style: { padding: '0 12px 12px', fontSize: 12.5, color: _upW_fg('#cbd5e1'), lineHeight: 1.6 } }, body)
        );
      }
      function _upW_any(v) {
        if (v == null || v === '') return null;
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return h('p', { style: { margin: '2px 0' } }, String(v));
        if (Array.isArray(v)) {
          if (v.every(function(x) { return typeof x === 'string'; })) return h('ul', { style: { margin: '2px 0', paddingLeft: 18 } }, v.map(function(x, i) { return h('li', { key: i }, x); }));
          return h('div', null, v.map(function(x, i) { return h('div', { key: i, style: { marginBottom: 6 } }, _upW_any(x)); }));
        }
        return h('dl', { style: { margin: '2px 0' } }, Object.keys(v).filter(function(k) { return k !== 'id'; }).map(function(k) {
          return h('div', { key: k, style: { marginBottom: 4 } }, h('dt', { style: { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: _upW_fg('#94a3b8') } }, _upW_label(k)), h('dd', { style: { margin: 0 } }, _upW_any(v[k])));
        }));
      }
      function _upW_kv(label, value, tone) {
        if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;
        return h('div', { style: { marginTop: 6 } },
          h('div', { style: { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: _upW_fg(tone || '#94a3b8') } }, label),
          _upW_any(value)
        );
      }
      // One library entry as a disclosure: the first present title key is the summary,
      // every other field is a labelled block (arrays as lists, nested objects as term lists).
      function _upW_entry(item, titleKeys, key) {
        var tk = null;
        for (var i = 0; i < titleKeys.length; i++) { if (item[titleKeys[i]]) { tk = titleKeys[i]; break; } }
        var title = tk ? _upW_txt(item[tk]) : ('Entry ' + (key || ''));
        var body = Object.keys(item).filter(function(k) { return k !== 'id' && k !== tk; }).map(function(k) {
          var v = item[k];
          if (Array.isArray(v) && v.length && typeof v[0] === 'string' && v.every(function(x) { return x === '' || typeof x === 'string'; }) && k === 'narrative') {
            return h('div', { key: k, style: { marginTop: 6 } }, v.filter(Boolean).map(function(line, j) { return h('p', { key: j, style: { margin: '0 0 6px' } }, line); }));
          }
          return h('div', { key: k }, _upW_kv(_upW_label(k), v));
        });
        return _upW_details(title, h('div', null, body), key || title);
      }
      function _upW_library(list, titleKeys, cap) {
        var arr = Array.isArray(list) ? list : [];
        var seen = {};
        var out = [];
        for (var i = 0; i < arr.length && out.length < (cap || 60); i++) {
          var it = arr[i]; if (!it || typeof it !== 'object') continue;
          var t = ''; for (var j = 0; j < titleKeys.length; j++) { if (it[titleKeys[j]]) { t = _upW_txt(it[titleKeys[j]]); break; } }
          if (t && seen[t]) continue; seen[t] = true;
          out.push(_upW_entry(it, titleKeys, it.id || ('e' + i)));
        }
        return out;
      }
      // A single card drawn from a bank, with "Another one". Seed lives in tool data so it survives re-render.
      function _upW_deck(key, items, mainKey, subKeys, blurb, accent) {
        var arr = (Array.isArray(items) ? items : []).filter(Boolean);
        if (!arr.length) return null;
        var seedKey = 'wiredSeed_' + key;
        var idx = ((d[seedKey] || 0) + Math.floor(Date.now() / 86400000)) % arr.length;
        var it = arr[idx];
        var main = typeof it === 'string' ? it : _upW_txt(it[mainKey]);
        return h('div', { style: { padding: 12, borderRadius: 10, background: _upW_bg('#0f172a'), border: '1px solid ' + _upW_bd('#334155') } },
          blurb ? h('p', { style: { margin: '0 0 6px', fontSize: 11, color: _upW_fg('#94a3b8') } }, blurb) : null,
          h('p', { style: { margin: '0 0 8px', fontSize: 15, fontStyle: 'italic', color: _upW_fg('#f1f5f9'), lineHeight: 1.5 } }, '\u201C' + main + '\u201D'),
          typeof it === 'object' ? (subKeys || []).map(function(k) { return it[k] ? h('div', { key: k, style: { fontSize: 12, color: _upW_fg('#cbd5e1'), marginBottom: 2 } }, h('strong', null, _upW_label(k) + ': '), _upW_txt(it[k])) : null; }) : null,
          h('button', { onClick: function() { var patch = {}; patch[seedKey] = (d[seedKey] || 0) + 1; upd(patch); if (typeof announceToSR === 'function') announceToSR('Showing another one'); },
            style: { marginTop: 6, minHeight: 40, padding: '8px 12px', borderRadius: 8, border: '1px solid ' + _upW_bd('#475569'), background: _upW_bg('#1e293b'), color: _upW_fg('#e2e8f0'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, 'Another one')
        );
      }
      function _upW_chips(key, options, current, onPick, label) {
        return h('div', { role: 'group', 'aria-label': label, style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
          options.map(function(o) {
            var on = current === o;
            return h('button', { key: o, onClick: function() { onPick(o); }, 'aria-pressed': on ? 'true' : 'false',
              style: { minHeight: 36, padding: '6px 12px', borderRadius: 999, border: '1px solid ' + (on ? _upW_fg('#5eead4') : _upW_bd('#475569')), background: on ? 'rgba(20,184,166,0.18)' : _upW_bg('#0f172a'), color: on ? _upW_fg('#5eead4') : _upW_fg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, _upW_label(o));
          })
        );
      }

      var _upW_h4 = function(t) { return h('h4', { style: { margin: '12px 0 6px', fontSize: 13, color: _upW_fg('#e2e8f0') } }, t); };
      // Moves: the courage ladder, everyday moments, and scripts.
      if (activeTab === 'moves' && movesContent) {
        var lvl = d.courageLevel || 'all';
        var levels = ['all'].concat(COURAGE_DEEP_DIVE.map(function(c) { return c.level; }).filter(function(x, i, a) { return x && a.indexOf(x) === i; }));
        movesContent = h('div', null, movesContent,
          _upW_panel('courage', 'Courage ladder', 'Courage is built in rungs. Each one names why it counts, how to practise it, and what it builds up to. Nobody starts at the top.',
            h('div', null, _upW_chips('lvl', levels, lvl, function(o) { upd({ courageLevel: o }); }, 'Courage level'),
              _upW_library(COURAGE_DEEP_DIVE.filter(function(c) { return lvl === 'all' || c.level === lvl; }), ['title'], 15)), '#f59e0b'),
          _upW_panel('moments', 'Everyday upstander moments', 'Most upstanding is small and takes under a minute.',
            h('div', null, _upW_library(EVERYDAY_UPSTANDER_MOMENTS, ['moment'], 20), _upW_h4('Micro-practices'), _upW_library(MICRO_PRACTICE_LIBRARY, ['practice'], 15)), '#22c55e'),
          _upW_panel('scripts', 'Words that have worked', 'Short lines for the moment. Say one out loud now so it is there later.',
            h('div', null, _upW_library(INTERVENTION_SCRIPT_LIBRARY, ['context'], 50), _upW_h4('By context'), _upW_library(CONTEXTUAL_SCRIPT_LIBRARY, ['context'], 15)), '#0ea5e9'));
      }
      // Practice: situations, low-risk move first.
      if (activeTab === 'practice' && pracContent) {
        pracContent = h('div', null, pracContent,
          _upW_panel('situations', 'Situations, with the low-risk move first', 'What you feel, what your brain tells you, what is actually happening, and moves in order of risk. You never have to take the biggest one.',
            h('div', null, _upW_library([].concat(BYSTANDER_SCENARIOS_EXTENDED, EXTENDED_BYSTANDER_SCENARIOS_PART2), ['title'], 20), _upW_h4('Harder ones'), _upW_library([].concat(DEEP_DIVE_SCENARIOS_SET2, COMPLEX_SCENARIOS), ['title'], 16)), '#ef4444'));
      }
      // Roles: why people freeze.
      if (activeTab === 'roles' && rolesContent) {
        rolesContent = h('div', null, rolesContent,
          _upW_panel('freeze', 'Why people freeze, and what unfreezes them', 'The bystander effect is a pattern, not a character flaw. Naming the barrier is most of the way to moving through it.',
            h('div', null, _upW_library(BYSTANDER_MOMENT_RECOGNITION, ['moment'], 8), _upW_h4('Common barriers'), _upW_library(COMMON_BARRIERS_TO_INTERVENTION, ['barrier'], 8), _upW_h4('Kinds of bystander'), _upW_library(ALL_BYSTANDER_TYPES, ['type'], 10), _upW_h4('The psychology'), _upW_library(BYSTANDER_PSYCHOLOGY_DEEP, ['concept'], 10)), '#a78bfa'));
      }
      // Cycle: repair.
      if (activeTab === 'cycle' && cycleContent) {
        cycleContent = h('div', null, cycleContent,
          _upW_panel('repair', 'Repair, step by step', 'When you were the one who caused harm, or stayed silent. A script for each stage and the pitfalls.',
            h('div', null, _upW_library(REPAIR_PROCESS_DEEP, ['stage'], 10), _upW_h4('Protocols by situation'), _upW_library(REPAIR_PROTOCOL_LIBRARY, ['situation'], 5)), '#22c55e'));
      }
      // Pledge: voices and prompts.
      if (activeTab === 'pledge' && pledgeContent) {
        pledgeContent = h('div', null, pledgeContent,
          _upW_panel('voices', 'Voices', null,
            h('div', null,
              _upW_deck('mentor', UPSTANDER_MENTOR_QUOTES, 'quote', ['mentor', 'useWhen', 'followup'], 'From someone who spoke up.', null),
              h('div', { style: { height: 8 } }),
              _upW_deck('movement', QUOTES_FROM_THE_MOVEMENT, 'quote', ['author', 'context'], 'From the movement.', null),
              h('div', { style: { height: 8 } }),
              _upW_deck('affirm', [].concat(UPSTANDER_AFFIRMATIONS, WAVE_OF_AFFIRMATIONS), 'text', [], 'An affirmation. Say it once.', null)
            ), '#f59e0b'),
          _upW_panel('prompts', 'A prompt to write from', null,
            h('div', null, _upW_deck('prompt', [].concat(DEEP_PRACTICE_PROMPTS, UPSTANDER_JOURNAL_PROMPTS, EXTENDED_REFLECTION_PROMPTS), 'prompt', ['depth'], null, null),
              _upW_details('Browse all prompts', h('div', null, _upW_library([].concat(DEEP_PRACTICE_PROMPTS, UPSTANDER_JOURNAL_PROMPTS, EXTENDED_REFLECTION_PROMPTS), ['prompt'], 110)), 'all-prompts')), '#a78bfa'));
      }
      // Reference: stories, history, questions, adults.
      if (activeTab === 'reference' && refContent) {
        var stories = [].concat(UPSTANDER_NARRATIVES, ADDITIONAL_BYSTANDER_NARRATIVES, COMPREHENSIVE_NARRATIVES_PART2, BYSTANDER_NARRATIVES_ENRICHED, EXTENDED_BYSTANDER_NARRATIVES_PART5, DETAILED_SCENARIO_LIBRARY, REPAIR_STORIES_COLLECTION);
        refContent = h('div', null, refContent,
          _upW_panel('stories', 'Stories from people who spoke up, and some who wish they had', 'First-person, written for this tool; the people in them are composites, not real students. Read one, then ask what you would have done.',
            _upW_library(stories, ['title'], 60), '#ec4899'),
          _upW_panel('history', 'People who stood up before you', 'Dates and names as authored; check a source before quoting one.',
            h('div', null, _upW_library([].concat(UPSTANDER_HISTORY_TIMELINE, UPSTANDER_HISTORY_EXTENDED), ['event'], 30), _upW_h4('Around the world'), _upW_library(GLOBAL_UPSTANDER_HISTORY, ['movement', 'country'], 10)), '#94a3b8'),
          _upW_panel('faq', 'Questions people ask', null,
            _upW_library([].concat(BYSTANDER_FAQ, ANSWER_BANK, COMPREHENSIVE_FAQ_FINAL, COMMON_QUESTIONS_DEEP), ['question'], 50), '#0ea5e9'),
          _upW_panel('adults', 'For families and educators', 'Written for the adults. What to do, what not to do, and when to escalate.',
            h('div', null, _upW_library([].concat(FAMILY_GUIDES_DEEP, FAMILY_INVOLVEMENT_GUIDES), ['audience', 'topic'], 12), _upW_h4('For educators'), _upW_library([].concat(TEACHING_GUIDES_FOR_EDUCATORS, EDUCATOR_TOOLKIT), ['audience', 'role'], 10), _upW_h4('Trauma-informed responses'), _upW_library([].concat(TRAUMA_INFORMED_BULLYING_RESPONSE, TRAUMA_INFORMED_UPSTANDER), ['principle'], 12)), '#22c55e'));
      }

      var content = rolesContent || movesContent || pracContent || cycleContent || pledgeContent || coachContent || refContent;
      return h('div', { className: 'us-root', style: { display: 'flex', flexDirection: 'column', height: '100%' } }, (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('upstander', h, ctx) : null), tabBar, h('div', { style: { flex: 1, overflow: 'auto' } }, content));
    }
  });
})();
