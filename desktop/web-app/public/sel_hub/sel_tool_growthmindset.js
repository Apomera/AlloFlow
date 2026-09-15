// ═══════════════════════════════════════════════════════════════
// sel_tool_growthmindset.js — Growth Mindset Workshop (v1.0)
// Interactive neuroplasticity education, fixed→growth reframing,
// persistence stories, personal growth mapping, AI growth coach.
// Based on Carol Dweck's research (2006): the belief that abilities
// develop through dedication and hard work creates a love of
// learning and resilience essential for great accomplishment.
// Registered tool ID: "growthmindset"
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

  // ── SEL Visual Polish CSS (shared keyframes + effects) ──
  // Defined here but injected at RENDER time (see render → _selInjectVisualPolishCSS()),
  // not at module load, so merely loading this tool's script no longer mutates
  // document.head app-wide. The .sel-* classes are used only by this tool; the
  // prefers-reduced-motion rule it carries is a genuine accommodation and is kept.
  function _selInjectVisualPolishCSS() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('sel-visual-polish-css')) return;
    var style = document.createElement('style');
    style.id = 'sel-visual-polish-css';
    style.textContent = [
      '@keyframes selFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
      '@keyframes selFadeInScale { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }',
      '@keyframes selPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }',
      '@keyframes selShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }',
      '@keyframes selGlow { 0%, 100% { box-shadow: 0 0 8px rgba(124,58,237,0.2); } 50% { box-shadow: 0 0 20px rgba(124,58,237,0.5); } }',
      '@keyframes selFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }',
      '@keyframes selSlideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }',
      '@keyframes selBounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { transform: scale(1); } }',
      '@keyframes selSparkle { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }',
      '@keyframes selGrowBar { from { width: 0; } }',
      '@keyframes selRotateIn { from { opacity: 0; transform: rotate(-10deg) scale(0.9); } to { opacity: 1; transform: rotate(0) scale(1); } }',
      '.sel-card { animation: selFadeIn 0.35s ease-out both; }',
      '.sel-card:nth-child(2) { animation-delay: 0.06s; }',
      '.sel-card:nth-child(3) { animation-delay: 0.12s; }',
      '.sel-card:nth-child(4) { animation-delay: 0.18s; }',
      '.sel-card:nth-child(5) { animation-delay: 0.24s; }',
      '.sel-tab { transition: all 0.2s ease; position: relative; min-height: 44px; }',
      '.sel-tab:hover, .sel-tab:focus-visible { transform: translateY(-1px); }',
      '.sel-tab-active { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }',
      '.sel-hero { animation: selFadeInScale 0.5s ease-out both; }',
      '.sel-hero-icon { animation: selFloat 3s ease-in-out infinite; display: inline-block; }',
      '.sel-badge { animation: selBounceIn 0.4s ease-out both; }',
      '.sel-progress-dot { transition: all 0.3s ease; }',
      '.sel-progress-dot:hover, .sel-progress-dot:focus-visible, .sel-progress-dot:active { transform: scale(1.2); }',
      '.sel-btn { transition: all 0.2s ease; min-height: 44px; }',
      '.sel-btn:hover, .sel-btn:focus-visible { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }',
      '.sel-btn:active { transform: translateY(0); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }',
      '.sel-glow { animation: selGlow 2s ease-in-out infinite; }',
      '.sel-shimmer { background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%); background-size: 200% 100%; animation: selShimmer 2s linear infinite; }',
      '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }',
    ].join('\n');
    document.head.appendChild(style);
  }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-growthmindset')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-growthmindset';
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
  function sfxGrow() {
    // Ascending scale — the sound of growth
    playTone(262, 0.12, 'sine', 0.06);
    setTimeout(function() { playTone(330, 0.12, 'sine', 0.06); }, 100);
    setTimeout(function() { playTone(392, 0.12, 'sine', 0.06); }, 200);
    setTimeout(function() { playTone(523, 0.18, 'sine', 0.08); }, 300);
  }
  function sfxReframe() {
    // Transformative chime — fixed → growth
    playTone(330, 0.15, 'triangle', 0.05);
    setTimeout(function() { playTone(523, 0.2, 'sine', 0.07); }, 150);
    setTimeout(function() { playTone(659, 0.25, 'sine', 0.08); }, 300);
  }
  function sfxNeuron() {
    // Synaptic spark
    playTone(1200, 0.03, 'sine', 0.04);
    setTimeout(function() { playTone(1600, 0.04, 'sine', 0.03); }, 30);
  }
  function sfxComplete() {
    playTone(523, 0.1, 'sine', 0.08);
    setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80);
    setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160);
  }

  // ══════════════════════════════════════════════════════════════
  // ── Content Data ──
  // ══════════════════════════════════════════════════════════════

  // Brain Science facts — grade-adaptive
  var BRAIN_FACTS = {
  "elementary": [
    {
      "title": "Learning takes different paths",
      "text": "People learn in different ways and at different speeds. Notice one part you understand and one part where you need help.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Use an error as a clue",
      "text": "A mistake can show a step to check. Ask for an explanation or example; making the mistake by itself does not tell you how to fix it.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Change something useful",
      "text": "If the same practice is not helping, try a clearer example, different materials or support. More effort is not the only choice.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Hard is a signal to check",
      "text": "Hard work can be interesting, frustrating or too much. Feeling overwhelmed is not proof that your brain is growing. You can pause and ask for help.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Show what you understand",
      "text": "Try explaining, drawing or showing one thing you learned. Needing a tool or another person does not make your understanding less valuable.",
      "emoji": "\ud83c\udf31"
    }
  ],
  "middle": [
    {
      "title": "Learning and the brain",
      "text": "Brains change with experience, but a difficult feeling cannot tell you how much learning has happened. Look for what you can explain or do with appropriate support.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "A belief is not a guarantee",
      "text": "Believing improvement is possible may support trying a useful approach. It cannot guarantee a grade or remove barriers such as missing instruction or inaccessible materials.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Find a manageable challenge",
      "text": "Ask whether a task offers a useful challenge and enough support. Continuing confusion without useful feedback is a reason to change the task or seek help.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Make feedback actionable",
      "text": "Useful feedback identifies a feature of the work and a possible next step. Ask for specifics and question comments that are inaccurate, unfair or insulting.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Review the strategy",
      "text": "After a short trial, check what changed in your understanding. Keep, adjust or stop a strategy based on what it helps you do, not how much effort it costs.",
      "emoji": "\ud83c\udf31"
    }
  ],
  "high": [
    {
      "title": "Change without a fixed label",
      "text": "People can develop knowledge and skills over time. Avoid sorting people into fixed and growth brain types; a statement in one situation does not define a person.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Context matters",
      "text": "A large school experiment found that growth-mindset intervention effects varied with context. A belief-focused activity is not a substitute for instruction, access or supportive conditions.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Interpret evidence carefully",
      "text": "A brain image or a story about neurons does not establish what an individual learner needs. Examine the task, prior knowledge, feedback and available supports.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Test transfer",
      "text": "Success on a familiar example does not guarantee use in a new setting. Explain when a strategy fits and check it on a different example with feedback.",
      "emoji": "\ud83c\udf31"
    },
    {
      "title": "Share responsibility for access",
      "text": "Invite learners to identify useful strategies while adults address instruction and unfair conditions. Choosing a sustainable goal or leaving an unsuitable route can be a thoughtful decision.",
      "emoji": "\ud83c\udf31"
    }
  ]
};

  // Fixed → Growth reframe challenges
  var REFRAMES = {
  "elementary": [
    {
      "id": "e1",
      "title": "Getting started in math",
      "thought": "I cannot do math.",
      "context": "A learner gets stuck on regrouping in two subtraction problems.",
      "valid": "Those steps really are confusing right now.",
      "check": "Do two problems tell us about every kind of math?",
      "model": "I am stuck on regrouping. I can ask someone to show that step with blocks.",
      "step": "Try one example with blocks, then explain where a group of ten went.",
      "support": "Ask the teacher for a worked example and time to use the blocks.",
      "review": "After one supported example, check whether the step makes sense; ask for another explanation if needed.",
      "change": "The blocks help, but the written symbols are still confusing."
    },
    {
      "id": "e2",
      "title": "A label after a hard task",
      "thought": "I am not smart.",
      "context": "A learner cannot finish a puzzle that classmates completed.",
      "valid": "Being left behind can feel disappointing.",
      "check": "What parts were understandable? Were the instructions clear?",
      "model": "This puzzle was hard for me today. It does not tell everything about how I learn.",
      "step": "Find one piece that fits and explain the clue used.",
      "support": "Ask a partner to explain a clue without finishing the puzzle for you.",
      "review": "After a few pieces, decide whether a new clue or a break would help.",
      "change": "The learner notices that some pieces are missing."
    },
    {
      "id": "e3",
      "title": "When hard means too much",
      "thought": "This is too hard.",
      "context": "A learner tries a long worksheet while the room is noisy.",
      "valid": "Noise and a long task can make starting harder.",
      "check": "Is the difficulty the skill, the amount, the setting, or more than one?",
      "model": "I need a smaller starting point and less noise. Being overwhelmed does not mean I am learning more.",
      "step": "Try one item in a quieter agreed space.",
      "support": "Ask an adult to help reduce noise or split the task.",
      "review": "After the first item, check whether the setting helps; pause and seek support if it is still too much.",
      "change": "The quiet space is unavailable today."
    },
    {
      "id": "e4",
      "title": "Comparing with a classmate",
      "thought": "She is better than me.",
      "context": "A classmate finishes a drawing quickly.",
      "valid": "The drawings may look different, and that can feel discouraging.",
      "check": "Do we know the classmate's experience, tools or goal?",
      "model": "I can notice something I like in her drawing and choose one thing I want to try in mine.",
      "step": "Try one kind of line or shading that interests you.",
      "support": "Ask permission before asking the classmate to explain a technique.",
      "review": "Compare one chosen feature with your own goal, not who finished first.",
      "change": "The classmate does not want to teach the technique."
    },
    {
      "id": "e5",
      "title": "Choosing a pause",
      "thought": "I give up.",
      "context": "A learner's paper tower falls repeatedly and they are tired.",
      "valid": "Repeated attempts can be tiring and frustrating.",
      "check": "Would another identical attempt help, or is a pause or new design needed?",
      "model": "I can stop for now. If I return, I can change the base instead of repeating the same design.",
      "step": "After a chosen pause, try a wider base if you still want to.",
      "support": "Ask for a demonstration or help finding suitable materials.",
      "review": "Check stability after one changed design; returning today is optional.",
      "change": "The available paper cannot support the planned height."
    },
    {
      "id": "e6",
      "title": "Already knowing part of it",
      "thought": "I already know this.",
      "context": "A learner can solve the first problems in a practice set.",
      "valid": "Some practice may be familiar.",
      "check": "Can the learner explain the method and use it in a different example?",
      "model": "I know this part. I can check my understanding and ask for a useful next challenge.",
      "step": "Explain one solution, then try an example with a small change.",
      "support": "Ask the teacher for appropriate extension work if the skill is secure.",
      "review": "Use the explanation to decide whether to extend or review a particular step.",
      "change": "The changed example reveals a step the learner cannot explain."
    },
    {
      "id": "e7",
      "title": "Learning after an error",
      "thought": "I made a mistake.",
      "context": "A learner uses the wrong unit in a measurement.",
      "valid": "The answer needs a correction; feeling annoyed is understandable.",
      "check": "Which step produced the error? A mistake alone does not teach the next step.",
      "model": "I used the wrong unit. I can check the label and correct that part.",
      "step": "Compare the tool's unit label with the answer, then measure once more.",
      "support": "Ask someone to model reading the unit if the label is unclear.",
      "review": "Check whether the new answer uses the correct unit and makes sense.",
      "change": "The label is too small to read comfortably."
    },
    {
      "id": "e8",
      "title": "Reading with support",
      "thought": "I will never be good at reading.",
      "context": "A learner keeps losing their place in a passage.",
      "valid": "Reading this passage is difficult right now.",
      "check": "Would clearer print, a guide, audio or reading instruction help?",
      "model": "I need help with this passage. I can use a support while learning the part that is hard.",
      "step": "Try a line guide or accessible text for a short section.",
      "support": "Ask the teacher to identify the difficulty and provide appropriate instruction.",
      "review": "Check understanding and comfort after the section; speed is not the only sign of progress.",
      "change": "A line guide helps tracking but some words remain unfamiliar."
    },
    {
      "id": "e9",
      "title": "Trying with enough safety",
      "thought": "I do not want to try because I might fail.",
      "context": "A learner avoids sharing a first attempt in front of the class.",
      "valid": "A public first attempt can feel risky.",
      "check": "Could the learner practice privately or choose another way to show the idea?",
      "model": "I do not have to make my first attempt in front of everyone. I can choose a supported start.",
      "step": "Rehearse one part privately or show a drawing instead.",
      "support": "Ask the teacher for an agreed way to practice without public exposure.",
      "review": "Check whether the route makes trying manageable; more exposure is not required.",
      "change": "Someone laughs during a practice attempt."
    },
    {
      "id": "e10",
      "title": "An artwork that does not fit the plan",
      "thought": "My drawing looks bad.",
      "context": "A learner wanted a recognizable animal but is unhappy with the shape.",
      "valid": "The drawing does not yet match the learner's intention.",
      "check": "Which feature matters to the learner? Art can have different goals.",
      "model": "I do not like this shape. I can change one feature, keep it as an experiment, or start another version.",
      "step": "Choose one feature to adjust using a reference if useful.",
      "support": "Ask for specific feedback about that feature rather than a good-or-bad rating.",
      "review": "Decide whether the change serves your intention; keeping an unusual result is allowed.",
      "change": "The learner decides the unusual shape is something they like."
    }
  ],
  "middle": [
    {
      "id": "m1",
      "title": "Finding the missing math step",
      "thought": "I am just not a math person.",
      "context": "A learner repeatedly loses track when solving equations.",
      "valid": "The current method is not working well.",
      "check": "Which step breaks down? Are examples and notation accessible?",
      "model": "I am stuck on keeping the equation balanced. I can learn that step with a clearer example.",
      "step": "Annotate one worked equation, then try a similar one with feedback.",
      "support": "Ask for a model that explains why each side changes.",
      "review": "Check the same step in a new example; repeated errors suggest the explanation needs changing.",
      "change": "The learner understands the example but cannot start a differently worded problem."
    },
    {
      "id": "m2",
      "title": "Speaking with options",
      "thought": "I am terrible at public speaking.",
      "context": "A learner knows the material but freezes during a class presentation.",
      "valid": "Speaking in this setting is difficult; practice does not guarantee it will feel easy.",
      "check": "Is the barrier preparation, audience pressure, communication access, or something else?",
      "model": "I understand my topic. I can ask for a way to present that lets me communicate it.",
      "step": "Rehearse a short part with notes, or propose an agreed recording or supported format.",
      "support": "Ask the teacher to clarify the learning goal and available participation options.",
      "review": "Check whether the chosen format communicates the idea; comfort and access matter too.",
      "change": "The presentation must include questions from an audience."
    },
    {
      "id": "m3",
      "title": "Questioning feedback fairly",
      "thought": "That feedback is unfair.",
      "context": "A teacher writes 'careless' on a project without identifying an example.",
      "valid": "Vague or unfair feedback is reasonable to question.",
      "check": "What criterion was used? Which part of the work does the comment refer to?",
      "model": "I need specific feedback before I can use it. I can ask for an example and question a judgment that is not supported.",
      "step": "Compare one comment with the rubric and ask a factual question about the mismatch.",
      "support": "Seek a trusted adult's support if asking directly feels unsafe or the concern is dismissed.",
      "review": "Check whether the response identifies something actionable and applies criteria consistently.",
      "change": "The teacher supplies a valid correction but leaves another concern unexplained."
    },
    {
      "id": "m4",
      "title": "Effort without a verdict",
      "thought": "If I have to work hard, I am not talented.",
      "context": "A learner spends a long time on a science explanation without making progress.",
      "valid": "The work is taking real effort.",
      "check": "Is the time producing understanding, or repeating an unhelpful approach?",
      "model": "Time spent is not a verdict on ability. I can change how I study and ask where my explanation breaks down.",
      "step": "Explain one process using a diagram, then compare it with a worked model.",
      "support": "Ask for feedback on the first unclear link rather than a rating of talent.",
      "review": "Check whether the link becomes clearer; more time alone is not the target.",
      "change": "The learner has less study time because of responsibilities at home."
    },
    {
      "id": "m5",
      "title": "The part we cannot see",
      "thought": "Other people make it look easy.",
      "context": "Classmates solve a task quickly while one learner needs more time.",
      "valid": "Their current speed differs from the learner's.",
      "check": "Do we know their preparation, supports or familiarity? We cannot assume everyone struggles privately.",
      "model": "I can see their speed, but not everything behind it. I can focus on understanding the step I need.",
      "step": "Work through one step accurately and explain the reasoning.",
      "support": "Ask for enough time and an example at the right level.",
      "review": "Review understanding, not whether speed matches someone else's.",
      "change": "A timed format is preventing the learner from showing what they understand."
    },
    {
      "id": "m6",
      "title": "Interpreting a test result",
      "thought": "I failed the test, so I am dumb.",
      "context": "A learner receives a low score after studying.",
      "valid": "The result is disappointing and may have consequences.",
      "check": "Which items show missing knowledge, misunderstood directions or access barriers?",
      "model": "This score is one result. I can examine what happened and choose a specific next step.",
      "step": "Sort a few errors by cause before choosing one concept to revisit.",
      "support": "Ask to review the marked work and discuss unclear directions or missing supports.",
      "review": "Try a related item with feedback; check whether the chosen cause was accurate.",
      "change": "Most errors came from misreading the instructions rather than the studied concept."
    },
    {
      "id": "m7",
      "title": "A goal worth choosing",
      "thought": "Why bother? I will never be as good as them.",
      "context": "A learner considers leaving a club after comparing performances.",
      "valid": "Comparison can make an activity less enjoyable.",
      "check": "Does the learner still value this activity? Staying and leaving both deserve thought.",
      "model": "I can choose what I want from this club. I do not have to outperform someone to participate, and I can choose another activity.",
      "step": "Try one personally meaningful goal if the learner wants to continue.",
      "support": "Discuss workload, access or alternative roles with a supportive adult.",
      "review": "Revisit enjoyment, energy and the chosen goal after an agreed trial; leaving remains an option.",
      "change": "A new responsibility makes the club schedule unmanageable."
    },
    {
      "id": "m8",
      "title": "Belonging and classroom conditions",
      "thought": "I do not belong in this advanced class.",
      "context": "A learner struggles with an unfamiliar topic and hears classmates make excluding remarks.",
      "valid": "The topic is difficult, and exclusion needs a response.",
      "check": "Which learning support is missing? Which classroom behavior needs to change?",
      "model": "I deserve respectful access to learning. I can seek help with the topic and support with the exclusion.",
      "step": "Identify one prerequisite to review without accepting classmates' exclusion as a verdict.",
      "support": "Ask a trusted adult to help address the remarks and arrange learning support.",
      "review": "Review whether both instruction and classroom conditions improve; the learner need not prove worth by enduring mistreatment.",
      "change": "Extra instruction helps the topic, but the excluding remarks continue."
    }
  ],
  "high": [
    {
      "id": "h1",
      "title": "Creating within constraints",
      "thought": "I am not creative.",
      "context": "A learner cannot develop an idea for an open-ended design assignment.",
      "valid": "An open brief can make starting difficult.",
      "check": "Is the barrier generating ideas, choosing one, unclear criteria or missing resources?",
      "model": "I am stuck at the idea stage. I can narrow the brief and test a small variation rather than judge my identity.",
      "step": "Choose one constraint and sketch two variations.",
      "support": "Ask for examples of different valid approaches and access to suitable materials.",
      "review": "Compare the variations with one criterion; revise the approach if neither fits.",
      "change": "The preferred idea requires materials the learner cannot access."
    },
    {
      "id": "h2",
      "title": "A missing prerequisite",
      "thought": "I should already know this by now.",
      "context": "A learner encounters a prerequisite not taught in their previous course.",
      "valid": "The missing knowledge is real; shame does not explain the gap.",
      "check": "What was taught, and what does the new task assume?",
      "model": "I have a specific gap to address. I can ask for an explanation and a realistic plan without blaming myself for missing instruction.",
      "step": "Work through a short prerequisite example before returning to the task.",
      "support": "Ask for targeted instruction and an appropriate timeline.",
      "review": "Check whether the prerequisite can be used in the current task; revise the plan if more instruction is needed.",
      "change": "The deadline arrives before the needed instruction is available."
    },
    {
      "id": "h3",
      "title": "Help that is safe to request",
      "thought": "If I ask for help, people will think I am incompetent.",
      "context": "A learner has a question but worries about a dismissive response.",
      "valid": "Other people's reactions are uncertain, and previous dismissal may matter.",
      "check": "Who has responded constructively? Is a private or supported request possible?",
      "model": "I can choose whom and how to ask. Needing an explanation is not a full account of my competence.",
      "step": "Prepare a specific question, using only details needed for the request.",
      "support": "Choose a trusted person or ask someone to help make the request.",
      "review": "Check whether the response is respectful and useful; seek another route if it is not.",
      "change": "The first person dismisses the question instead of answering it."
    },
    {
      "id": "h4",
      "title": "A score and a wider plan",
      "thought": "My test score defines my potential.",
      "context": "A learner receives a standardized-test result below a program's stated target.",
      "valid": "The score may affect this application; disappointment makes sense.",
      "check": "What does the program actually require, and what choices are available?",
      "model": "This score can matter for this route, but it does not describe all of me. I can check requirements and consider feasible options.",
      "step": "Verify current criteria before deciding whether a retake or another route fits.",
      "support": "Ask a counselor to compare costs, access needs, deadlines and alternatives.",
      "review": "Review the plan when requirements and resources are known; a retake is optional.",
      "change": "A retake would cost money or time needed for something else."
    },
    {
      "id": "h5",
      "title": "Trying without changing identity",
      "thought": "I am not the kind of person who can do this.",
      "context": "A learner is interested in a technical club but rarely sees people like them represented.",
      "valid": "Representation and belonging can affect whether a space feels welcoming.",
      "check": "What experience is required? Are there barriers in the group, rather than in the learner's identity?",
      "model": "I can explore this interest as myself. I can ask about an accessible starting role and whether the group will support me.",
      "step": "Try an optional introductory task if the setting feels suitable.",
      "support": "Ask a trusted mentor about entry routes and how the group handles exclusion.",
      "review": "Review interest, access and treatment after the trial; leaving an unwelcoming space is valid.",
      "change": "A member makes a stereotype-based comment during the visit."
    },
    {
      "id": "h6",
      "title": "Practice with unequal resources",
      "thought": "Some people are just naturally better.",
      "context": "A learner compares their progress with someone who has more instruction and equipment.",
      "valid": "People differ in experience, circumstances and current skill.",
      "check": "Which resources and opportunities differ? Practice does not guarantee equal outcomes.",
      "model": "I can work on a chosen skill while recognizing unequal access. I do not need to explain every difference as talent or effort.",
      "step": "Choose a focused practice task that fits the available time and equipment.",
      "support": "Ask about shared equipment, affordable instruction or a different way to participate.",
      "review": "Check the chosen skill after a feasible trial; adjust the goal or support instead of endlessly adding hours.",
      "change": "The learner loses access to the equipment used for practice."
    }
  ]
};

  // Famous "Yet" Stories — real people who persisted
  var YET_STORIES = {
    elementary: [
      { name: 'Thomas Edison', emoji: '\uD83D\uDCA1', area: 'Inventing', story: 'Thomas Edison tried over 1,000 different materials before finding one that worked for the light bulb. When a reporter asked how it felt to fail 1,000 times, he said: "I didn\u2019t fail 1,000 times. The light bulb was an invention with 1,000 steps."', lesson: 'Every attempt taught him something. Failure was part of the invention.' },
      { name: 'J.K. Rowling', emoji: '\uD83D\uDCDA', area: 'Writing', story: 'Before Harry Potter became the most famous book series in the world, 12 different publishers said "no thank you." J.K. Rowling was a single mom with very little money. She kept sending her book out because she believed in the story.', lesson: 'Twelve "no"s before one "yes" that changed the world.' },
      { name: 'Michael Jordan', emoji: '\uD83C\uDFC0', area: 'Sports', story: 'Michael Jordan was cut from his high school basketball team. He went home, locked himself in his room, and cried. Then he practiced harder than anyone. He said: "I\u2019ve missed more than 9,000 shots. I\u2019ve failed over and over. And that is why I succeed."', lesson: 'The greatest basketball player ever was once told he wasn\u2019t good enough.' },
      { name: 'Bethany Hamilton', emoji: '\uD83C\uDFC4', area: 'Surfing', story: 'Bethany Hamilton lost her arm in a shark attack when she was 13. Everyone thought she\u2019d never surf again. One month later, she was back on her board. She went on to become a professional surfer and champion.', lesson: 'She didn\u2019t let the hardest thing that ever happened to her define what she could do.' },
      { name: 'Albert Einstein', emoji: '\uD83E\uDDEA', area: 'Science', story: 'Albert Einstein didn\u2019t speak until he was 4 years old. His teachers said he was "slow." He failed his first college entrance exam. He became the most famous scientist in history and changed how we understand the universe.', lesson: 'Starting slow doesn\u2019t mean finishing slow.' },
    ],
    middle: [
      { name: 'Oprah Winfrey', emoji: '\uD83C\uDF1F', area: 'Media', story: 'Oprah was told she was "unfit for television" and fired from her first TV job. She grew up in poverty and faced severe adversity. She went on to build a media empire and became one of the most influential people in history.', lesson: 'Someone else\u2019s assessment of you is not your destiny.' },
      { name: 'Walt Disney', emoji: '\uD83C\uDFA8', area: 'Animation', story: 'Walt Disney was fired from a newspaper for "lacking imagination and having no good ideas." His first animation company went bankrupt. He was rejected 302 times trying to get financing for Disney World. Today, Disney is worth $130 billion.', lesson: '302 rejections. One "yes." That\u2019s all it took.' },
      { name: 'Malala Yousafzai', emoji: '\uD83D\uDCDA', area: 'Education', story: 'Malala was shot by the Taliban for advocating girls\u2019 education. She survived, continued her activism, and won the Nobel Peace Prize at age 17 \u2014 the youngest person ever. She said: "One child, one teacher, one book, and one pen can change the world."', lesson: 'The greatest obstacles sometimes produce the greatest advocates.' },
      { name: 'Stephen Hawking', emoji: '\uD83C\uDF0C', area: 'Physics', story: 'Stephen Hawking was diagnosed with ALS at 21 and told he had two years to live. He lived to 76, became one of the greatest physicists ever, wrote "A Brief History of Time," and proved that a body\u2019s limitations don\u2019t limit a mind.', lesson: 'He didn\u2019t have a growth mindset about his body. He had one about his mind.' },
      { name: 'Lin-Manuel Miranda', emoji: '\uD83C\uDFB5', area: 'Theater', story: 'Lin-Manuel Miranda spent 7 years writing Hamilton. Seven years of rewriting, doubt, and revision. He read a biography on vacation, had an idea, and then did the unglamorous work of turning that spark into the most celebrated musical of a generation.', lesson: 'Inspiration is a moment. Creation is seven years of work.' },
    ],
    high: [
      { name: 'Marie Curie', emoji: '\u2622\uFE0F', area: 'Science', story: 'Marie Curie was denied admission to the University of Krak\u00F3w because she was a woman. She moved to Paris, lived in a freezing attic, and studied physics. She became the first woman to win a Nobel Prize \u2014 and the first person to win two in different sciences.', lesson: 'When the institution said no, she changed the institution.' },
      { name: 'Vincent van Gogh', emoji: '\uD83C\uDFA8', area: 'Art', story: 'Van Gogh sold only one painting in his entire lifetime. He was rejected by art schools, fired from jobs, and struggled with mental illness. Today his paintings sell for $100+ million each. He once wrote: "If you hear a voice within you say \u2018you cannot paint,\u2019 then by all means paint, and that voice will be silenced."', lesson: 'The market\u2019s opinion and the work\u2019s value are two different things.' },
      { name: 'Vera Wang', emoji: '\uD83D\uDC57', area: 'Fashion', story: 'Vera Wang failed to make the U.S. Olympic figure skating team. She then worked as a Vogue editor for 15 years but was passed over for the editor-in-chief position. At 40, most people would have settled. She started her own fashion company. She was 40.', lesson: 'Your Plan A failing doesn\u2019t mean your story is over. Sometimes Plan C is the masterpiece.' },
      { name: 'Abraham Lincoln', emoji: '\uD83C\uDFDB\uFE0F', area: 'Leadership', story: 'Lost his job, lost 8 elections, had a nervous breakdown, lost his fianc\u00E9e to illness. He failed publicly and repeatedly for 30 years. Then he became President and held a nation together through its greatest crisis. His persistence wasn\u2019t stubbornness \u2014 it was conviction.', lesson: 'A resume of failures can precede the most consequential success in history.' },
      { name: 'Tu Youyou', emoji: '\uD83C\uDF3F', area: 'Medicine', story: 'Tu Youyou spent decades researching ancient Chinese medical texts for a malaria cure, enduring failed experiment after failed experiment. She tested the drug on herself first. Her discovery of artemisinin has saved millions of lives. She won the Nobel Prize at 84.', lesson: 'Sometimes the breakthrough comes after decades of quiet, unglamorous work.' },
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Tool Registration ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('growthmindset', {
    icon: '\uD83C\uDF31',
    label: 'Growth Mindset Workshop',
    desc: 'Explore learning strategies, fair self-talk, support and thoughtful changes of direction.',
    color: 'emerald',
    category: 'self-direction',
    render: function(ctx) {
      _selInjectVisualPolishCSS(); // inject visual-polish CSS on first render, not at module load (A11Y-6)
      var React = ctx.React;
      var h = React.createElement;
      var Sparkles = ctx.icons.Sparkles;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var band = ctx.gradeBand || 'elementary';

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.growthmindset) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('growthmindset', key); }
        else { if (ctx.update) ctx.update('growthmindset', key, val); }
      };

      // Navigation
      var activeTab     = d.activeTab || 'reframe';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Brain Science state
      var brainFactIdx  = (Number.isInteger(d.brainFactIdx) && d.brainFactIdx >= 0 ? d.brainFactIdx : 0);
      var brainExplored = d.brainExplored || {};

      // Reframe state
      var reframeIdx    = d.reframeIdx || 0;
      var reframeInput  = d.reframeInput || '';
      var reframeRevealed = d.reframeRevealed || false;
      var reframeScore  = d.reframeScore || 0;
      var reframeTotal  = d.reframeTotal || 0;

      // Yet Stories state
      var storyIdx      = (Number.isInteger(d.storyIdx) && d.storyIdx >= 0 ? d.storyIdx : 0);
      var storiesRead   = d.storiesRead || {};

      // Growth Map state
      var growthGoals   = (Array.isArray(d.growthGoals) ? d.growthGoals : []);
      var newGoalText   = (typeof d.newGoalText === 'string' ? d.newGoalText : '');

      // AI Coach state
      var coachInput    = d.coachInput || '';
      var coachResponse = d.coachResponse || '';
      var coachLoading  = d.coachLoading || false;
      var coachHistory  = d.coachHistory || [];

      // Letter to Future Me state
      var savedLetters   = (Array.isArray(d.savedLetters) ? d.savedLetters : []);
      var letterDraft    = (typeof d.letterDraft === 'string' ? d.letterDraft : '');

      // Stats
      var totalReframes = reframeScore || 0;
      var totalStories  = Object.keys(storiesRead || {}).length;
      var totalFacts    = Object.keys(brainExplored || {}).length;

      // ── Host theme remap (consumes ctx.theme) — pilot for SEL tool theming ──
      // Growth Mindset is light-base. _gmC('#hex') returns the ORIGINAL hex on a light
      // host (so light rendering stays byte-identical), a same-hue DARK value on a
      // .theme-dark host, and the WCAG yellow/black scheme on high-contrast — so the
      // tool FOLLOWS the SEL Hub theme toggle instead of staying a light island. Generic
      // chrome (card/text/border) + the tinted growth(green)/fixed(red)/amber/blue
      // surfaces each get a dark variant; vivid accent FILLS (EMERALD buttons, per-tab
      // hero hues) intentionally stay constant. Tinted text + its tinted surface are
      // remapped together so neither goes dark-on-dark. Pattern reusable by other tools.
      var _gmTheme = (ctx && ctx.theme) || {};
      var _gmHC = !!_gmTheme.isContrast, _gmDark = !_gmHC && !!_gmTheme.isDark;
      var _GM_DARK = {
        '#1f2937':'#e2e8f0','#374151':'#cbd5e1','#475569':'#cbd5e1',
        '#fff':'#1e293b','#ffffff':'#1e293b','#e5e7eb':'#334155','#e2e8f0':'#334155',
        '#f0fdf4':'#0b2e22','#ecfdf5':'#0e3326','#d1fae5':'#14463a','#a7f3d0':'#1c5e4a',
        '#065f46':'#6ee7b7','#064e3b':'#6ee7b7',
        '#fef2f2':'#2e1414','#fee2e2':'#3a1a1a','#991b1b':'#fca5a5','#7f1d1d':'#fca5a5','#dc2626':'#f87171',
        '#fffbeb':'#2e2410','#fef3c7':'#3a2e12','#fef9c3':'#3a3410','#92400e':'#fde68a','#78350f':'#fcd34d',
        '#eff6ff':'#0e1f3a','#2563eb':'#93c5fd','#1e3a8a':'#93c5fd'
      };
      var _GM_HC = {
        '#1f2937':'#ffff00','#374151':'#ffff00','#475569':'#ffff00','#94a3b8':'#ffff00',
        '#fff':'#000000','#ffffff':'#000000','#e5e7eb':'#ffff00','#e2e8f0':'#333300',
        '#f0fdf4':'#000000','#ecfdf5':'#000000','#d1fae5':'#000000','#a7f3d0':'#000000',
        '#065f46':'#ffff00','#064e3b':'#ffff00',
        '#fef2f2':'#000000','#fee2e2':'#000000','#991b1b':'#ffff00','#7f1d1d':'#ffff00','#dc2626':'#ffff00',
        '#fffbeb':'#000000','#fef3c7':'#000000','#fef9c3':'#000000','#92400e':'#ffff00','#78350f':'#ffff00',
        '#eff6ff':'#000000','#2563eb':'#ffff00','#1e3a8a':'#ffff00'
      };
      var _gmC = function(hex) { return _gmHC ? (_GM_HC[hex] || hex) : (_gmDark ? (_GM_DARK[hex] || hex) : hex); };

      // Colors
      var EMERALD = '#059669';              // accent FILL — semantic, constant across themes
      var EMERALD_LIGHT = _gmC('#ecfdf5');  // tinted surface — themes its 5 background usages
      var EMERALD_DARK = _gmC('#064e3b');   // tinted text — themes its 12 color usages
      var AMBER = '#d97706';                // accent text — readable on light + dark, kept

      // ══════════════════════════════════════════════════════════
      // ── Tab Bar ──
      // ══════════════════════════════════════════════════════════
      var TABS = [
        { id: 'brain',    icon: '\uD83E\uDDE0', label: 'Learning & Practice' },
        { id: 'reframe',  icon: '\uD83D\uDD04', label: 'Reframe It' },
        { id: 'stories',  icon: '\uD83C\uDF1F', label: 'Yet Stories' },
        { id: 'map',      icon: '\uD83D\uDDFA\uFE0F', label: 'My Growth Map' },
        { id: 'coach',    icon: '\uD83E\uDD16', label: callGemini ? 'AI Coach' : 'AI Coach (off)' },
        { id: 'letter',   icon: '\u2709\uFE0F', label: 'Future Me' },
        { id: 'educator', icon: '\uD83C\uDFEB', label: 'Educator Lens' },
      ];

      // Count explored tabs for progress
      var exploredTabs = d.exploredTabs || {};
      if (!exploredTabs[activeTab]) {
        var newExplored = Object.assign({}, exploredTabs);
        newExplored[activeTab] = true;
        upd('exploredTabs', newExplored);
      }
      var exploredCount = Object.keys(exploredTabs).length;

      var tabBar = h('div', {
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid ' + _gmC('#d1fae5'), background: 'linear-gradient(180deg, ' + _gmC('#f0fdf4') + ', ' + _gmC('#ecfdf5') + ')', flexShrink: 0 }
      },
        // Progress bar
        h('div', { style: { height: '3px', background: _gmC('#e2e8f0'), position: 'relative', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.round((exploredCount / TABS.length) * 100) + '%', background: 'linear-gradient(90deg, ' + EMERALD + ', #34d399)', transition: 'width 0.5s ease', borderRadius: '0 2px 2px 0', animation: 'selGrowBar 0.6s ease-out' } })
        ),
        h('div', {
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' }
        },
          h('div', { role: 'tablist', 'aria-label': 'Growth Mindset sections', style: { display: 'flex', gap: '3px' } },
            TABS.map(function(t, ti) {
            var active = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', {
              key: t.id,
              className: 'sel-tab' + (active ? ' sel-tab-active' : ''),
              role: 'tab', 'aria-selected': active ? 'true' : 'false',
              onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
              style: {
                padding: '6px 14px', borderRadius: '10px', border: active ? 'none' : '1px solid ' + (explored ? _gmC('#a7f3d0') : 'transparent'),
                background: active ? 'linear-gradient(135deg, ' + EMERALD + ', #047857)' : explored ? 'rgba(5,150,105,0.08)' : 'transparent',
                color: active ? '#fff' : explored ? _gmC('#065f46') : _gmC('#94a3b8'),
                fontWeight: active ? 700 : 500, fontSize: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                whiteSpace: 'nowrap',
                boxShadow: active ? '0 3px 12px rgba(5,150,105,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
                position: 'relative'
              }
            },
              h('span', { className: active ? 'sel-hero-icon' : '', 'aria-hidden': 'true', style: { fontSize: active ? '14px' : '12px' } }, t.icon),
              t.label,
              explored && !active ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', marginLeft: '2px', flexShrink: 0 } }) : null
            );
            })
          ),
          // Progress badge
          h('span', { className: 'sel-badge', style: { marginLeft: '8px', fontSize: '10px', color: EMERALD_DARK, fontWeight: 700, whiteSpace: 'nowrap', background: _gmC('#d1fae5'), padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } },
            exploredCount + '/' + TABS.length
          ),
          // Sound toggle
          h('button', {
            onClick: function() { upd('soundEnabled', !soundEnabled); },
            className: 'sel-btn',
            'aria-label': soundEnabled ? 'Mute sounds' : 'Enable sounds',
            style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 }
          }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        )
      );

      // ── Topic-accent hero band per tab ──
      var heroBand = (function() {
        var TAB_META = {
          brain:    { accent: '#059669', soft: 'rgba(5,150,105,0.10)', icon: '\uD83E\uDDE0', title: 'Learning & Practice - conditions that help', hint: 'Explore practice, feedback and access. Effort and a positive belief alone do not guarantee learning; check what support and changes are useful.' },
          reframe:  { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83D\uDD04', title: 'Reframe It - honest, specific and workable', hint: 'Acknowledge what is hard. Question broad judgments, choose support or a strategy, and revisit the plan when conditions change.' },
          stories:  { accent: '#fbbf24', soft: 'rgba(251,191,36,0.10)',  icon: '\uD83C\uDF1F', title: 'Yet Stories \u2014 the world\u2019s late bloomers',         hint: 'Edison\u2019s 10,000 light-bulb attempts, J.K. Rowling\u2019s 12 rejections, Michael Jordan cut from varsity, Einstein didn\u2019t speak till 4. Survivor narratives \u2014 but the pattern (struggle \u2192 persistence \u2192 mastery) is real research too.' },
          map:      { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',   icon: '\uD83D\uDDFA', title: 'My Growth Map \u2014 your own then-now-next',              hint: 'Pick something you can do now that you couldn\u2019t a year ago. That\u2019s your living evidence of growth-mindset working. Bandura: vicarious self-efficacy is real, but personal mastery experience is the strongest source.' },
          coach:    { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)',  icon: '\uD83E\uDD16', title: 'AI Coach \u2014 reframe partner on demand',                hint: 'Type a stuck thought; the coach helps you find the growth-language version. Repeated exposure builds the habit. NOT a substitute for therapy or hard conversations \u2014 a rehearsal space for the easier reframes.' },
          letter:   { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)',  icon: '\u2709',         title: 'Future Me \u2014 letter to who you\u2019re becoming',     hint: 'Write to yourself 1 / 5 / 10 years from now. Specifying who you want to become makes the path more visible. Implementation intentions (Gollwitzer 1999): naming the future doubles follow-through.' },
          educator: { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',   icon: '\uD83C\uDFEB', title: 'Educator Lens \u2014 growth-mindset for teachers',         hint: 'Praise PROCESS not ability (Mueller + Dweck 1998). \u201CYou worked hard\u201D > \u201CYou\u2019re smart.\u201D Avoids the fixed-mindset trap that praise-for-ability creates. Critical for IEP language too \u2014 \u201Capproaching\u201D not \u201Cnot yet meeting.\u201D' }
        };
        var meta = TAB_META[activeTab] || TAB_META.brain;
        return h('div', {
          style: {
            margin: '8px 12px 12px',
            padding: '12px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
            border: '1px solid ' + meta.accent + '55',
            borderLeft: '4px solid ' + meta.accent,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
          }
        },
          h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
          h('div', { style: { flex: 1, minWidth: 220 } },
            h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
            h('p', { style: { margin: '3px 0 0', color: _gmC('#475569'), fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
          )
        );
      })();

      // ══════════════════════════════════════════════════════════
      // ── Section: Brain Science ──
      // ══════════════════════════════════════════════════════════
      var brainContent = null;
      if (activeTab === 'brain') {
        var facts = BRAIN_FACTS[band] || BRAIN_FACTS.elementary;
        var currentFact = facts[brainFactIdx % facts.length];

        brainContent = h('div', { className: 'sel-hero', style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          // Hero section with visual brain illustration
          h('div', { style: { textAlign: 'center', marginBottom: '20px', position: 'relative' } },
            // Decorative neural network dots
            h('div', { style: { position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '80px', pointerEvents: 'none', opacity: 0.3 } },
              [0,1,2,3,4,5].map(function(i) {
                return h('div', { key: 'n'+i, style: {
                  position: 'absolute',
                  left: (20 + Math.sin(i * 1.2) * 40 + 50) + '%',
                  top: (10 + Math.cos(i * 0.8) * 30 + 20) + '%',
                  width: (4 + i % 3 * 2) + 'px', height: (4 + i % 3 * 2) + 'px',
                  borderRadius: '50%', background: EMERALD,
                  animation: 'selSparkle ' + (1.5 + i * 0.3) + 's ease-in-out infinite',
                  animationDelay: (i * 0.2) + 's'
                }});
              })
            ),
            h('div', { className: 'sel-hero-icon', style: { fontSize: '56px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(5,150,105,0.3))' } }, '\uD83E\uDDE0'),
            h('h3', { style: { fontSize: '20px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 6px', letterSpacing: '-0.3px' } }, 'Conditions for learning'),
            h('p', { style: { fontSize: '13px', color: _gmC('#94a3b8'), margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' } },
              band === 'elementary' ? 'Explore what helps you understand, practice and ask for help.'
              : band === 'middle' ? 'Explore how strategies, feedback and access support learning.'
              : 'Consider evidence, context and the limits of any one approach.')
          ),
          // Fact card with enhanced visuals
          h('div', {
            className: 'sel-card',
            key: 'fact-' + brainFactIdx, // Re-triggers animation on change
            style: {
              background: 'linear-gradient(135deg, ' + _gmC('#ecfdf5') + ' 0%, ' + _gmC('#d1fae5') + ' 50%, ' + _gmC('#a7f3d0') + ' 100%)',
              borderRadius: '20px', padding: '28px', border: '2px solid #6ee7b7',
              boxShadow: '0 8px 32px rgba(5,150,105,0.12), 0 2px 8px rgba(5,150,105,0.08)',
              marginBottom: '16px', position: 'relative', overflow: 'hidden'
            }
          },
            // Shimmer overlay
            h('div', { className: 'sel-shimmer', style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '20px', pointerEvents: 'none' } }),
            h('div', { style: { position: 'relative', zIndex: 1 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' } },
                h('div', { style: { fontSize: '36px', background: 'rgba(255,255,255,0.6)', borderRadius: '14px', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } }, currentFact.emoji),
                h('div', null,
                  h('h4', { style: { fontSize: '17px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 2px' } }, currentFact.title),
                  h('div', { style: { fontSize: '10px', color: EMERALD, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' } }, 'Idea ' + (brainFactIdx % facts.length + 1) + ' of ' + facts.length)
                )
              ),
              h('p', { style: { fontSize: '14px', lineHeight: 1.8, color: _gmC('#1f2937'), margin: 0 } }, currentFact.text)
            )
          ),
          // Navigation
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' } },
            h('button', {
              className: 'sel-btn',
              onClick: function() {
                var prev = (brainFactIdx - 1 + facts.length) % facts.length;
                upd({ brainFactIdx: prev, brainExplored: Object.assign({}, brainExplored, (function() { var o = {}; o[prev] = true; return o; })()) });
                if (soundEnabled) sfxNeuron();
              },
              style: { padding: '10px 20px', background: _gmC('#fff'), border: '2px solid #a7f3d0', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: EMERALD_DARK, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
            }, '\u2190 Previous'),
            h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '12px', color: _gmC('#475569'), fontWeight: 600, background: _gmC('#f0fdf4'), padding: '4px 12px', borderRadius: '8px' } },
              (brainFactIdx % facts.length + 1) + ' / ' + facts.length
            ),
            h('button', {
              className: 'sel-btn',
              onClick: function() {
                var next = (brainFactIdx + 1) % facts.length;
                upd({ brainFactIdx: next, brainExplored: Object.assign({}, brainExplored, (function() { var o = {}; o[next] = true; return o; })()) });
                if (soundEnabled) sfxNeuron();
                if (Object.keys(Object.assign({}, brainExplored, (function() { var o = {}; o[next] = true; return o; })())).length >= facts.length) {
                  if (awardXP) awardXP(15, 'Explored all learning ideas!');
                }
              },
              style: { padding: '10px 20px', background: 'linear-gradient(135deg, ' + EMERALD + ', #047857)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#fff', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }
            }, 'Next \u2192')
          ),
          // Progress dots
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '6px' } },
            facts.map(function(f, i) {
              var explored = !!brainExplored[i];
              var current = i === brainFactIdx % facts.length;
              return h('button', {
                key: i, type: 'button',
                'aria-label': 'Fact ' + (i + 1) + ' of ' + facts.length + (explored ? ' (explored)' : '') + (current ? ' (current)' : ''),
                onClick: function() { upd({ brainFactIdx: i, brainExplored: Object.assign({}, brainExplored, (function() { var o = {}; o[i] = true; return o; })()) }); },
                className: 'sel-progress-dot',
                style: {
                  width: current ? '32px' : '24px', height: '24px', padding: 0, border: 'none',
                  borderRadius: '12px', cursor: 'pointer', background: 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  display: 'block',
                  width: current ? '28px' : explored ? '12px' : '10px', height: current ? '12px' : '10px',
                  borderRadius: '6px',
                  background: current ? 'linear-gradient(135deg, ' + EMERALD + ', #34d399)' : explored ? '#6ee7b7' : _gmC('#e5e7eb'),
                  boxShadow: current ? '0 2px 8px rgba(5,150,105,0.4)' : 'none'
                } })
              );
            })
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: Reframe Engine ──
      // ══════════════════════════════════════════════════════════
      var reframeContent = null;
      if (activeTab === 'reframe') {
        var practiceBand = Object.prototype.hasOwnProperty.call(REFRAMES, band) ? band : 'elementary';
        var reframes = REFRAMES[practiceBand];
        var selected = d.practiceSelected && d.practiceSelected[practiceBand];
        var legacyIndex = Number.isInteger(d.reframeIdx) && d.reframeIdx >= 0 ? d.reframeIdx % reframes.length : 0;
        var current = reframes.find(function(item) { return item.id === selected; }) || reframes[legacyIndex];
        var practiceDrafts = d.practiceDrafts && typeof d.practiceDrafts === 'object' && !Array.isArray(d.practiceDrafts) ? d.practiceDrafts : {};
        var savedPractice = practiceDrafts[current.id];
        var practice = savedPractice && typeof savedPractice === 'object' && !Array.isArray(savedPractice) ? savedPractice : {};
        var note = function(key) { return typeof practice[key] === 'string' ? practice[key] : ''; };
        var savePractice = function(values) {
          var next = Object.assign({}, practiceDrafts);
          next[current.id] = Object.assign({}, practice, values);
          upd('practiceDrafts', next);
        };
        var surface = _gmC('#fff'), ink = _gmC('#1f2937');
        var edge = _gmHC ? '#ffff00' : _gmDark ? '#94a3b8' : '#64748b';
        var cardStyle = { padding: '16px', margin: '14px 0', background: surface, color: ink, border: '1px solid ' + edge, borderRadius: '12px', minWidth: 0 };
        var controlStyle = { minHeight: '44px', maxWidth: '100%', width: '100%', padding: '10px', border: '1px solid ' + edge, borderRadius: '8px', background: surface, color: ink, font: 'inherit', fontSize: '16px', boxSizing: 'border-box' };
        var buttonStyle = { minHeight: '44px', padding: '10px 14px', border: '2px solid ' + edge, borderRadius: '8px', background: surface, color: ink, font: 'inherit', fontWeight: 700, cursor: 'pointer', maxWidth: '100%', whiteSpace: 'normal' };
        var summaryStyle = { minHeight: '44px', padding: '10px 0', fontWeight: 700, cursor: 'pointer', boxSizing: 'border-box' };
        var field = function(key, label, hint) {
          var id = 'gm-practice-' + key;
          return h('div', { key: key, style: { margin: '14px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, label),
            hint && h('p', { id: id + '-hint', style: { margin: '4px 0 8px' } }, hint),
            h('textarea', { id: id, rows: 3, value: note(key), 'aria-describedby': hint ? id + '-hint' : undefined,
              onChange: function(ev) { var values = {}; values[key] = ev.target.value; savePractice(values); },
              style: Object.assign({}, controlStyle, { resize: 'vertical' }) })
          );
        };
        var routes = [
          { id: 'adjust', label: 'Try an adjustment', guidance: 'Change one part of the method and check what it helps. Repeating the same effort is not the only option.' },
          { id: 'support', label: 'Ask for support', guidance: 'Name the explanation, access change or adult action needed. A learner does not have to solve an unfair condition alone.' },
          { id: 'pause', label: 'Pause and review', guidance: 'A pause does not need to be earned. Choose whether and when to reconsider; stopping is not a character judgment.' },
          { id: 'change', label: 'Change the goal or route', guidance: 'Consider what matters, available resources and competing needs. Changing direction can be a considered decision.' }
        ];
        var route = routes.find(function(item) { return item.id === note('route'); });
        var oldDraft = typeof d.reframeInput === 'string' ? d.reframeInput : '';
        reframeContent = h('section', { 'aria-label': 'Grounded reframe practice', style: { padding: '16px', maxWidth: '760px', margin: '0 auto', background: surface, color: ink, fontSize: '14px', lineHeight: 1.65, overflowWrap: 'anywhere' } },
          h('h3', { style: { fontSize: '22px', margin: '0 0 8px' } }, 'A fair thought, a workable next step'),
          h('p', null, 'Explore fictional situations. A useful reframe can acknowledge frustration, unfairness or limits. You do not have to feel positive, add "yet", or keep pursuing a goal.'),
          h('p', null, 'Writing and every step are optional. Think, draw or discuss instead. Models are examples to examine, not answers to match. Your notes stay in this tool state; use the project save controls if you want to keep a project copy.'),
          h('label', { htmlFor: 'gm-practice-case', style: { display: 'block', fontWeight: 700 } }, 'Choose a reframe scenario'),
          h('select', { id: 'gm-practice-case', value: current.id, style: controlStyle,
            onChange: function(ev) { var next = Object.assign({}, d.practiceSelected || {}); next[practiceBand] = ev.target.value; upd('practiceSelected', next); } },
            reframes.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); })
          ),
          h('div', { key: current.id },
            h('article', { style: cardStyle, 'aria-labelledby': 'gm-practice-case-title' },
              h('h4', { id: 'gm-practice-case-title', style: { fontSize: '18px', margin: '0 0 8px' } }, current.title),
              h('p', null, current.context),
              h('p', null, h('strong', null, 'A thought in this situation: '), current.thought)
            ),
            h('details', { open: true, style: cardStyle },
              h('summary', { style: summaryStyle }, '1. Notice what is real and what is assumed'),
              h('p', null, h('strong', null, 'What deserves acknowledgment: '), current.valid),
              h('p', null, h('strong', null, 'A question to investigate: '), current.check),
              field('evidence', 'What is known, and what needs checking? (optional)', 'Keep observations separate from guesses about ability, motives or the future.'),
              field('first', 'A fair response to the thought (optional)', 'Keep the real concern. Make the claim specific and leave room for support or a different choice.')
            ),
            h('div', { style: cardStyle },
              h('button', { type: 'button', style: buttonStyle, 'aria-expanded': practice.modelSeen === true, 'aria-controls': 'gm-practice-model',
                onClick: function() { savePractice({ modelSeen: true }); } }, practice.modelSeen === true ? 'Example is open' : 'Compare a grounded example'),
              h('div', { id: 'gm-practice-model', hidden: practice.modelSeen !== true },
                h('p', null, current.model),
                h('p', null, 'Compare: Does this acknowledge the difficulty? Does it avoid a sweeping judgment? Does it suggest a feasible choice? You may disagree with or adapt the example.')
              )
            ),
            h('details', { style: cardStyle },
              h('summary', { style: summaryStyle }, '2. Choose a strategy, support or pause'),
              h('details', null,
                h('summary', { style: summaryStyle }, 'Explore a step and support for this case'),
                h('p', null, h('strong', null, 'A possible step: '), current.step),
                h('p', null, h('strong', null, 'Support or a change around the learner: '), current.support),
                h('p', null, h('strong', null, 'A useful review point: '), current.review)
              ),
              h('label', { htmlFor: 'gm-practice-route', style: { display: 'block', fontWeight: 700 } }, 'A route to explore (optional)'),
              h('select', { id: 'gm-practice-route', style: controlStyle, value: route ? route.id : '',
                onChange: function(ev) { savePractice({ route: ev.target.value }); } },
                h('option', { value: '' }, 'Choose when useful'), routes.map(function(item) { return h('option', { key: item.id, value: item.id }, item.label); })
              ),
              h('p', { role: 'status', 'aria-live': 'polite' }, route ? route.guidance : 'More than one route may fit. You can change your selection or leave it blank.'),
              field('plan', 'A step or support that fits (optional)', 'What could the learner try, request, pause or change? Who else needs to act?'),
              field('review', 'What would make you review the plan? (optional)', 'Look for understanding, access or a useful result, not just more effort. Include a reason to stop or seek different support.')
            ),
            h('div', { style: cardStyle },
              h('h4', { id: 'gm-practice-change-title', style: { fontSize: '18px', margin: '0 0 8px' } }, '3. Revisit when the situation changes'),
              h('button', { type: 'button', style: buttonStyle, 'aria-expanded': practice.changeSeen === true, 'aria-controls': 'gm-practice-change',
                onClick: function() { savePractice({ changeSeen: true }); } }, practice.changeSeen === true ? 'Changed situation shown' : 'Explore a changed situation'),
              h('div', { id: 'gm-practice-change', hidden: practice.changeSeen !== true },
                h('p', null, h('strong', null, 'Imagine this happens: '), current.change),
                field('revised', 'What would you keep or change now? (optional)', 'Explain what still fits or what needs adjusting. Your earlier response remains above; it does not need to be replaced.')
              )
            ),
            oldDraft.trim() && h('details', { style: cardStyle },
              h('summary', { style: summaryStyle }, 'An earlier unassigned response is available'),
              h('p', null, 'The older activity did not record which case or grade band this response belonged to. Check the context before copying it.'),
              h('p', { style: { whiteSpace: 'pre-wrap' } }, oldDraft),
              h('button', { type: 'button', style: buttonStyle,
                onClick: function() { if (!note('first').trim()) savePractice({ first: oldDraft }); } }, 'Copy earlier response into an empty draft'),
              h('p', null, 'Copying keeps the earlier response and never replaces current writing.')
            )
          )
        );
      }

      // Yet Stories retains its existing saved state and rendering.
      var storiesContent = null;
      if (activeTab === 'stories') {
        var stories = YET_STORIES[band] || YET_STORIES.elementary;
        var currentStory = stories[storyIdx % stories.length];

        storiesContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83C\uDF1F'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 4px' } }, 'The Power of Yet'),
            h('p', { style: { fontSize: '13px', color: _gmC('#94a3b8'), margin: 0 } }, 'Real people who didn\u2019t give up \u2014 and changed the world.')
          ),
          // Story card
          h('div', { style: { background: _gmC('#fff'), borderRadius: '16px', padding: '24px', border: '1px solid ' + _gmC('#e5e7eb'), boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '16px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' } },
              h('div', { style: { fontSize: '36px' } }, currentStory.emoji),
              h('div', null,
                h('h4', { style: { fontSize: '16px', fontWeight: 800, color: _gmC('#1f2937'), margin: 0 } }, currentStory.name),
                h('div', { style: { fontSize: '11px', color: EMERALD, fontWeight: 600 } }, currentStory.area)
              )
            ),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: _gmC('#374151'), margin: '0 0 14px' } }, currentStory.story),
            h('div', { style: { background: _gmC('#fef9c3'), borderRadius: '10px', padding: '12px', borderLeft: '4px solid #f59e0b' } },
              h('p', { style: { fontSize: '13px', fontWeight: 600, color: _gmC('#92400e'), margin: 0 } }, '\uD83D\uDCA1 ' + currentStory.lesson)
            )
          ),
          // Navigation
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            h('button', {
              onClick: function() {
                var prev = (storyIdx - 1 + stories.length) % stories.length;
                upd({ storyIdx: prev, storiesRead: Object.assign({}, storiesRead, (function() { var o = {}; o[prev] = true; return o; })()) });
                if (soundEnabled) sfxGrow();
              },
              style: { padding: '8px 16px', background: _gmC('#fff'), border: '2px solid ' + _gmC('#e5e7eb'), borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: _gmC('#374151') }
            }, '\u2190 Previous'), // a11y: label set via visible text
            h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '12px', color: _gmC('#94a3b8') } },
              (storyIdx % stories.length + 1) + ' / ' + stories.length +
              ' \u00b7 ' + totalStories + ' read'
            ),
            h('button', {
              onClick: function() {
                var next = (storyIdx + 1) % stories.length;
                upd({ storyIdx: next, storiesRead: Object.assign({}, storiesRead, (function() { var o = {}; o[next] = true; return o; })()) });
                if (soundEnabled) sfxGrow();
                if (Object.keys(Object.assign({}, storiesRead, (function() { var o = {}; o[next] = true; return o; })())).length >= stories.length) {
                  if (awardXP) awardXP(20, 'Read all Yet Stories!');
                }
              },
              style: { padding: '8px 16px', background: EMERALD, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff' }
            }, 'Next Story \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: My Growth Map ──
      // ══════════════════════════════════════════════════════════
      var mapContent = null;
      if (activeTab === 'map') {
        mapContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83D\uDDFA\uFE0F'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 4px' } }, 'My Growth Map'),
            h('p', { style: { fontSize: '13px', color: _gmC('#94a3b8'), margin: 0 } }, 'Set goals using "I can\u2019t... YET" framing. Track your growth journey.')
          ),
          // Add goal form
          h('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
            h('div', { style: { flex: 1 } },
              h('label', { htmlFor: 'gm-new-goal', style: { display: 'block', fontSize: '11px', fontWeight: 600, color: _gmC('#94a3b8'), marginBottom: '3px' } }, 'I can\u2019t __________ YET.'),
              h('input', {
                id: 'gm-new-goal',
                type: 'text', value: newGoalText,
                onChange: function(ev) { upd('newGoalText', ev.target.value); },
                onKeyDown: function(ev) {
                  if (ev.key === 'Enter' && newGoalText.trim()) {
                    var goal = { id: Date.now().toString(), text: newGoalText.trim(), createdAt: Date.now(), steps: [], reflection: '' };
                    upd({ growthGoals: [goal].concat(growthGoals), newGoalText: '' });
                    if (soundEnabled) sfxGrow();
                    if (awardXP) awardXP(5, 'Set a growth goal!');
                  }
                },
                placeholder: band === 'elementary' ? 'e.g. do long division' : band === 'middle' ? 'e.g. write a persuasive essay' : 'e.g. solve differential equations',
                style: { width: '100%', border: '2px solid #a7f3d0', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
              })
            ),
            h('button', {
              onClick: function() {
                if (!newGoalText.trim()) return;
                var goal = { id: Date.now().toString(), text: newGoalText.trim(), createdAt: Date.now(), steps: [], reflection: '' };
                upd({ growthGoals: [goal].concat(growthGoals), newGoalText: '' });
                if (soundEnabled) sfxGrow();
                if (awardXP) awardXP(5, 'Set a growth goal!');
              },
              disabled: !newGoalText.trim(),
              style: { padding: '10px 16px', background: newGoalText.trim() ? EMERALD : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: newGoalText.trim() ? 'pointer' : 'not-allowed', fontSize: '13px', alignSelf: 'flex-end' }
            }, '\uD83C\uDF31 Plant Goal')
          ),
          // Goal list
          growthGoals.length === 0
            ? h('div', { style: { textAlign: 'center', padding: '30px', color: _gmC('#94a3b8') } },
                h('div', { style: { fontSize: '32px', marginBottom: '8px' } }, '\uD83C\uDF3F'),
                h('p', { style: { fontSize: '13px' } }, 'No goals planted yet. What can\u2019t you do YET?')
              )
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                growthGoals.map(function(goal) {
                  var daysSince = Math.floor((Date.now() - goal.createdAt) / (24 * 60 * 60 * 1000));
                  var stepsCount = (goal.steps || []).length;
                  return h('div', {
                    key: goal.id,
                    style: { background: _gmC('#fff'), border: '2px solid ' + _gmC('#d1fae5'), borderRadius: '14px', padding: '16px', transition: 'border-color 0.15s' }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
                      h('div', null,
                        h('span', { style: { fontSize: '14px', fontWeight: 700, color: _gmC('#1f2937') } }, 'I can\u2019t '),
                        h('span', { style: { fontSize: '14px', fontWeight: 700, color: EMERALD, textDecoration: 'underline', textDecorationColor: _gmC('#a7f3d0') } }, goal.text),
                        h('span', { style: { fontSize: '14px', fontWeight: 700, color: _gmC('#1f2937') } }, ' '),
                        h('span', { style: { fontSize: '14px', fontWeight: 800, color: AMBER, background: _gmC('#fef3c7'), padding: '1px 6px', borderRadius: '4px' } }, 'YET')
                      ),
                      h('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
                        h('span', { style: { fontSize: '10px', color: _gmC('#94a3b8') } }, daysSince === 0 ? 'today' : daysSince + 'd ago'),
                        h('button', {
                          onClick: function() { upd('growthGoals', growthGoals.filter(function(g) { return g.id !== goal.id; })); },
                          'aria-label': 'Remove goal', style: { background: _gmC('#fee2e2'), border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', color: _gmC('#991b1b'), fontSize: '12px', padding: '2px 4px' }
                        }, '\u2715')
                      )
                    ),
                    // Steps I've taken
                    h('div', { style: { fontSize: '11px', color: _gmC('#94a3b8'), marginBottom: '4px' } },
                      '\uD83D\uDC63 Steps I\u2019ve taken (' + stepsCount + '):'
                    ),
                    (goal.steps || []).map(function(step, si) {
                      return h('div', { key: si, style: { fontSize: '12px', color: _gmC('#374151'), padding: '2px 0 2px 16px', borderLeft: '2px solid #a7f3d0' } },
                        '\u2713 ' + step
                      );
                    }),
                    h('div', { style: { display: 'flex', gap: '6px', marginTop: '6px' } },
                      h('input', {
                        type: 'text',
                        placeholder: 'Add a step you took toward this goal...',
                        'aria-label': 'Add growth step',
                        onKeyDown: function(ev) {
                          if (ev.key === 'Enter' && ev.target.value.trim()) {
                            var step = ev.target.value.trim();
                            var updated = growthGoals.map(function(g) {
                              return g.id === goal.id ? Object.assign({}, g, { steps: (g.steps || []).concat([step]) }) : g;
                            });
                            upd('growthGoals', updated);
                            ev.target.value = '';
                            if (soundEnabled) sfxComplete();
                            if (awardXP) awardXP(5, 'Recorded a growth step!');
                          }
                        },
                        style: { flex: 1, border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontFamily: 'inherit' }
                      })
                    )
                  );
                })
              )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: AI Growth Coach ──
      // ══════════════════════════════════════════════════════════
      var coachContent = null;
      if (activeTab === 'coach') {
        var hasSafetyLayer = window.SelHub && window.SelHub.hasCoachConsent;
        var hasConsent = hasSafetyLayer ? window.SelHub.hasCoachConsent() : true;
        if (hasSafetyLayer && !hasConsent) {
          coachContent = window.SelHub.renderConsentScreen(h, band, function() {
            window.SelHub.giveCoachConsent();
            upd('_consentRefresh', Date.now());
          }, ctx.activeSessionCode);
        } else if (!callGemini) {
          // No AI provider here (PPS students use the app without Gemini). Say so, and hand the
          // student the tab that does the same work by hand.
          coachContent = h('div', { 'data-gm-coach-off': 'true', style: { padding: '20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' } },
            h('div', { 'aria-hidden': 'true', style: { fontSize: '40px', marginBottom: '8px' } }, '\uD83E\uDD16'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 6px' } }, 'The AI coach is off here'),
            h('p', { style: { fontSize: '13px', color: _gmC('#475569'), margin: '0 0 14px', lineHeight: 1.6 } }, 'This copy of AlloFlow has no AI provider, so there is no one on the other end of the chat. Reframe It does the same work by hand: name the fixed thought, then make it specific and workable.'),
            h('button', { type: 'button', onClick: function() { upd('activeTab', 'reframe'); },
              style: { minHeight: 44, padding: '10px 18px', borderRadius: '10px', border: 'none', background: EMERALD_DARK, color: '#fff', fontWeight: 800, fontSize: '14px', cursor: 'pointer' } }, 'Open Reframe It')
          );
        } else {
        coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83E\uDD16'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 4px' } }, 'AI Growth Coach'),
            h('p', { style: { fontSize: '13px', color: _gmC('#94a3b8'), margin: 0 } }, 'Share a struggle or a fixed mindset thought. Your coach will help you reframe it.'),
            window.SelHub && window.SelHub.renderSafetyDisclosure && window.SelHub.renderSafetyDisclosure(h, band, ctx.activeSessionCode)
          ),
          // Surface 988 / Crisis Text Line block when last turn was tier-3.
          (d._lastTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),
          // Chat history
          coachHistory.length > 0 && h('div', { role: 'log', 'aria-label': 'Conversation with Growth Coach', 'aria-live': 'polite', 'aria-busy': coachLoading ? 'true' : 'false', style: { maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
            coachHistory.map(function(msg, i) {
              var isUser = msg.role === 'user';
              return h('div', { key: i, style: { display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' } },
                h('div', { style: {
                  maxWidth: '80%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isUser ? _gmC('#eff6ff') : EMERALD_LIGHT,
                  border: '1px solid ' + (isUser ? '#bfdbfe' : _gmC('#a7f3d0')),
                  fontSize: '13px', lineHeight: 1.6, color: _gmC('#1f2937')
                } },
                  !isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: EMERALD, marginBottom: '4px' } }, '\uD83C\uDF31 Growth Coach'),
                  msg.text
                )
              );
            })
          ),
          // Input
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('input', {
              'aria-label': 'Message the growth coach',
              type: 'text', value: coachInput,
              onChange: function(ev) { upd('coachInput', ev.target.value); },
              onKeyDown: function(ev) {
                if (ev.key === 'Enter' && coachInput.trim() && !coachLoading && callGemini) {
                  var userMsg = coachInput.trim();
                  var newHistory = (coachHistory || []).concat([{ role: 'user', text: userMsg }]);
                  upd({ coachHistory: newHistory, coachInput: '', coachLoading: true });

                  var prompt = 'You are a warm, encouraging growth mindset coach for a ' + band + ' school student. '
                    + 'The student said: "' + userMsg + '"\n\n'
                    + 'Respond with:\n'
                    + '1. Acknowledge their feeling (1 sentence)\n'
                    + '2. Reframe with growth mindset (1-2 sentences)\n'
                    + '3. A specific, actionable suggestion (1 sentence)\n\n'
                    + 'Be warm, concise, and age-appropriate. Use "you" not "one." '
                    + 'Reference neuroplasticity naturally. Max 3-4 sentences total.';

                  var safeSend = (window.SelHub && window.SelHub.safeCoach) ? function() {
                    return window.SelHub.safeCoach({
                      studentMessage: userMsg,
                      coachPrompt: prompt,
                      toolId: 'growthmindset',
                      band: band,
                      callGemini: callGemini,
                      codename: ctx.studentCodename || 'student',
                      conversationHistory: newHistory,
                      onSafetyFlag: onSafetyFlag
                    });
                  } : function() {
                    var preFallback = (window.SelHub && window.SelHub.safeRehearseCheck)
                      ? window.SelHub.safeRehearseCheck(userMsg, { toolId: 'growthmindset', onSafetyFlag: onSafetyFlag })
                      : { action: 'continue' };
                    return callGemini(prompt, false).then(function(r) { return { response: r, tier: preFallback.action === 'block' ? 3 : 0, showCrisis: preFallback.action === 'block' }; });
                  };
                  safeSend().then(function(result) {
                    upd({
                      coachHistory: newHistory.concat([{ role: 'coach', text: result.response }]),
                      coachLoading: false,
                      _lastTier: result.tier || 0
                    });
                    if (awardXP) awardXP(5, 'Talked with Growth Coach!');
                  }).catch(function() {
                    upd({
                      coachHistory: newHistory.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting right now, but remember: the fact that you\u2019re here, thinking about this, already shows a growth mindset. What you\u2019re struggling with is proof that you\u2019re reaching for something beyond your current ability \u2014 and that\u2019s exactly how growth works.' }]),
                      coachLoading: false
                    });
                  });
                }
              },
              disabled: coachLoading || !callGemini,
              placeholder: coachLoading ? 'Thinking...' : 'Tell me what you\u2019re struggling with...',
              style: { flex: 1, border: '2px solid #a7f3d0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
            }),
            h('button', {
              onClick: function() {
                if (!coachInput.trim() || coachLoading || !callGemini) return;
                // Trigger same logic as Enter key
                var ev = { key: 'Enter', target: {} };
                // For simplicity, duplicate the logic inline
                var userMsg = coachInput.trim();
                var newHistory = (coachHistory || []).concat([{ role: 'user', text: userMsg }]);
                upd({ coachHistory: newHistory, coachInput: '', coachLoading: true });

                var prompt = 'You are a warm, encouraging growth mindset coach for a ' + band + ' school student. '
                  + 'The student said: "' + userMsg + '"\n\n'
                  + 'Respond with:\n'
                  + '1. Acknowledge their feeling (1 sentence)\n'
                  + '2. Reframe with growth mindset (1-2 sentences)\n'
                  + '3. A specific, actionable suggestion (1 sentence)\n\n'
                  + 'Be warm, concise, and age-appropriate. Use "you" not "one." '
                  + 'Reference neuroplasticity naturally. Max 3-4 sentences total.';

                var safeSend = (window.SelHub && window.SelHub.safeCoach) ? function() {
                  return window.SelHub.safeCoach({
                    studentMessage: userMsg,
                    coachPrompt: prompt,
                    toolId: 'growthmindset',
                    band: band,
                    callGemini: callGemini,
                    codename: ctx.studentCodename || 'student',
                    conversationHistory: newHistory,
                    onSafetyFlag: onSafetyFlag
                  });
                } : function() {
                  var preFallback = (window.SelHub && window.SelHub.safeRehearseCheck)
                    ? window.SelHub.safeRehearseCheck(userMsg, { toolId: 'growthmindset', onSafetyFlag: onSafetyFlag })
                    : { action: 'continue' };
                  return callGemini(prompt, false).then(function(r) { return { response: r, tier: preFallback.action === 'block' ? 3 : 0, showCrisis: preFallback.action === 'block' }; });
                };
                safeSend().then(function(result) {
                  upd({
                    coachHistory: newHistory.concat([{ role: 'coach', text: result.response }]),
                    coachLoading: false,
                    _lastTier: result.tier || 0
                  });
                  if (awardXP) awardXP(5, 'Talked with Growth Coach!');
                }).catch(function() {
                  upd({
                    coachHistory: newHistory.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting right now. But here\u2019s what I know: you showed up. You\u2019re thinking about how to grow. That already puts you ahead.' }]),
                    coachLoading: false
                  });
                });
              },
              disabled: coachLoading || !coachInput.trim() || !callGemini,
              style: { padding: '10px 16px', background: coachInput.trim() && !coachLoading ? EMERALD : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'not-allowed', fontSize: '13px' }
            }, coachLoading ? '\u23F3' : '\u2728 Send')
          ),
          // Starter prompts
          coachHistory.length === 0 && h('div', { style: { marginTop: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 600, color: _gmC('#94a3b8'), marginBottom: '6px' } }, 'Try saying:'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
              [
                band === 'elementary' ? 'I\u2019m bad at math' : band === 'middle' ? 'I\u2019ll never be good at writing' : 'I\u2019m not smart enough for this class',
                band === 'elementary' ? 'Everyone else is smarter than me' : band === 'middle' ? 'I failed and I want to give up' : 'I don\u2019t see the point of trying',
                band === 'elementary' ? 'I can\u2019t read as fast as my friends' : band === 'middle' ? 'My teacher thinks I\u2019m dumb' : 'I\u2019m afraid of failing in front of everyone',
              ].map(function(prompt) {
                return h('button', {
                  key: prompt,
                  'aria-label': 'Use starter prompt: ' + prompt,
                  onClick: function() { upd('coachInput', prompt); },
                  style: { padding: '5px 10px', background: _gmC('#f0fdf4'), border: '1px solid #a7f3d0', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: EMERALD_DARK, fontWeight: 500 }
                }, prompt);
              })
            )
          )
        );
        } // end else (hasConsent)
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: Letter to Future Me ──
      // ══════════════════════════════════════════════════════════
      var letterContent = null;
      if (activeTab === 'letter') {
        var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var today = new Date();
        var dateStr = monthNames[today.getMonth()] + ' ' + today.getDate() + ', ' + today.getFullYear();

        letterContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\u2709\uFE0F'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 4px' } }, 'Letter to Future Me'),
            h('p', { style: { fontSize: '13px', color: _gmC('#94a3b8'), margin: 0 } },
              band === 'elementary' ? 'Write a letter to yourself. One day you\u2019ll read it and see how much you\u2019ve grown!'
              : 'Document where you are right now. Your future self will read this and see the distance traveled.')
          ),
          // Writing area
          h('div', { style: { background: _gmC('#fffbeb'), borderRadius: '16px', padding: '20px', border: '2px solid #fde68a', marginBottom: '16px' } },
            h('div', { style: { fontSize: '12px', color: _gmC('#92400e'), fontWeight: 600, marginBottom: '4px' } }, dateStr),
            h('div', { style: { fontSize: '13px', color: _gmC('#92400e'), fontStyle: 'italic', marginBottom: '12px' } }, 'Dear Future Me,'),
            h('textarea', {
              'aria-label': 'Write a letter to your future self',
              value: letterDraft,
              onChange: function(ev) { upd('letterDraft', ev.target.value); },
              placeholder: band === 'elementary'
                ? 'Right now I\u2019m learning about... The hardest thing for me is... But I know that if I keep trying...'
                : band === 'middle'
                ? 'Here\u2019s what I\u2019m working on right now... What\u2019s hard for me is... What I want you (future me) to remember is...'
                : 'Where I am right now... What I\u2019m struggling with... What I\u2019m choosing to believe about my ability to grow...',
              style: { width: '100%', border: 'none', background: 'transparent', fontSize: '14px', fontFamily: 'Georgia, serif', lineHeight: 1.8, color: _gmC('#78350f'), resize: 'vertical', minHeight: '120px', boxSizing: 'border-box' }
            }),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } },
              h('button', {
                onClick: function() {
                  if (!letterDraft.trim()) return;
                  var letter = { id: Date.now().toString(), text: letterDraft.trim(), date: dateStr, timestamp: Date.now() };
                  upd({ savedLetters: [letter].concat(savedLetters), letterDraft: '' });
                  if (soundEnabled) sfxGrow();
                  if (awardXP) awardXP(15, 'Wrote a letter to your future self!');
                  if (announceToSR) announceToSR('Letter saved');
                },
                disabled: !letterDraft.trim(),
                style: { padding: '8px 18px', background: letterDraft.trim() ? '#b45309' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: letterDraft.trim() ? 'pointer' : 'not-allowed' }
              }, '\uD83D\uDD8B\uFE0F Seal This Letter')
            )
          ),
          // Saved letters
          savedLetters.length > 0 && h('div', null,
            h('div', { style: { fontSize: '12px', fontWeight: 700, color: _gmC('#374151'), marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' } },
              '\uD83D\uDCEC Letters From Past Me (' + savedLetters.length + ')'
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              savedLetters.map(function(letter) {
                var daysAgo = Math.floor((Date.now() - letter.timestamp) / (24 * 60 * 60 * 1000));
                var timeLabel = daysAgo === 0 ? 'Written today' : daysAgo === 1 ? 'Written yesterday' : 'Written ' + daysAgo + ' days ago';
                return h('div', {
                  key: letter.id,
                  style: { background: _gmC('#fff'), border: '1px solid ' + _gmC('#e5e7eb'), borderRadius: '14px', padding: '16px', position: 'relative' }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                    h('div', { style: { fontSize: '11px', color: _gmC('#94a3b8') } }, letter.date + ' \u00b7 ' + timeLabel),
                    h('button', {
                      onClick: function() { upd('savedLetters', savedLetters.filter(function(l) { return l.id !== letter.id; })); },
                      'aria-label': 'Delete this letter',
                      style: { background: _gmC('#fee2e2'), border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', color: _gmC('#991b1b'), fontSize: '10px', padding: '2px 6px' }
                    }, '\u2715')
                  ),
                  h('div', { style: { fontSize: '13px', color: _gmC('#92400e'), fontStyle: 'italic', marginBottom: '4px' } }, 'Dear Future Me,'),
                  h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: _gmC('#374151'), margin: 0, fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap' } }, letter.text),
                  // Growth reflection prompt (shows after 7+ days)
                  daysAgo >= 7 && h('div', { style: { marginTop: '12px', background: EMERALD_LIGHT, borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid ' + EMERALD } },
                    h('div', { style: { fontSize: '11px', fontWeight: 700, color: EMERALD, marginBottom: '4px' } }, '\uD83C\uDF31 Reflection moment'),
                    h('p', { style: { fontSize: '12px', color: _gmC('#374151'), margin: 0 } },
                      'You wrote this ' + daysAgo + ' days ago. Has anything changed? What would past-you think about where you are now?')
                  )
                );
              })
            )
          ),
          // Empty state
          savedLetters.length === 0 && h('div', { style: { textAlign: 'center', padding: '20px', color: _gmC('#94a3b8') } },
            h('p', { style: { fontSize: '13px', fontStyle: 'italic' } },
              band === 'elementary' ? 'When you write a letter, it gets sealed and saved here. One day you\u2019ll open it and be amazed at how far you\u2019ve come!'
              : 'Your letters create a time capsule of your growth journey. The most powerful evidence of growth is your own words looking back at where you started.')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Section: Educator Lens ──
      // ══════════════════════════════════════════════════════════
      var educatorContent = null;
      if (activeTab === 'educator') {
        var TEACHER_REFRAMES = [
          { fixed: 'He\u2019s just a low kid.', growth: 'He hasn\u2019t mastered this strategy yet. Let\u2019s try a different approach.', research: 'Rosenthal & Jacobson (1968): Teacher expectations directly influence student achievement. The "Pygmalion effect" is one of the most replicated findings in education.' },
          { fixed: 'She\u2019ll never be able to do grade-level work.', growth: 'She\u2019s not at grade level yet. What scaffolds can close the gap?', research: 'Vygotsky\u2019s Zone of Proximal Development: learning happens in the space between what a student can do alone and what they can do with support.' },
          { fixed: 'This student just doesn\u2019t care.', growth: 'This student hasn\u2019t found what motivates them yet. What matters to them?', research: 'Self-Determination Theory (Deci & Ryan): perceived incompetence often looks like apathy. Students disengage to protect themselves from failure.' },
          { fixed: 'I\u2019ve tried everything with this kid.', growth: 'I haven\u2019t found the right approach yet. Who else can I consult?', research: 'Collaboration is protective against burnout. Teachers who seek peer consultation report higher efficacy and lower emotional exhaustion (Skaalvik & Skaalvik, 2017).' },
          { fixed: 'Some kids just aren\u2019t cut out for math.', growth: 'Every student can develop mathematical thinking with the right entry point.', research: 'Jo Boaler\u2019s research at Stanford: mathematical ability is not innate. When students are taught that math is learnable, achievement gaps narrow significantly.' },
          { fixed: 'The parents don\u2019t care about education.', growth: 'The family may show caring in ways I haven\u2019t recognized yet. How can I build a bridge?', research: 'Mapp & Kuttner (2013): "hard to reach" families are often "hard to reach for." The barrier is usually systemic, not motivational.' },
          { fixed: 'This behavior plan isn\u2019t working.', growth: 'The function of the behavior may not be what we assumed. Let\u2019s reassess.', research: 'Applied Behavior Analysis: behavior serves a function. When interventions fail, the hypothesis about function is wrong \u2014 not the student.' },
          { fixed: 'They\u2019re just not smart enough for this class.', growth: 'They need different preparation, not a different destination.', research: 'Mary Murphy\u2019s "Cultures of Growth": when classrooms communicate that intelligence is expandable, ALL students perform better \u2014 especially those from marginalized groups.' },
        ];
        var tReframeIdx = (Number.isInteger(d.tReframeIdx) && d.tReframeIdx >= 0 ? d.tReframeIdx : 0);
        var currentTR = TEACHER_REFRAMES[tReframeIdx % TEACHER_REFRAMES.length];

        var FEEDBACK_PHRASES = [
          { instead: 'You\u2019re so smart!', try: 'You worked really hard on that strategy.', why: 'Praising effort over intelligence teaches students that success comes from process, not identity.' },
          { instead: 'Great job!', try: 'I noticed you tried three different approaches before finding one that worked.', why: 'Specific process praise is 3x more effective than generic praise (Mueller & Dweck, 1998).' },
          { instead: 'This should be easy for you.', try: 'This might be challenging, and that\u2019s where the learning happens.', why: 'Framing difficulty as expected normalizes productive struggle.' },
          { instead: 'Don\u2019t worry, not everyone is good at this.', try: 'This is hard AND you\u2019re building the skills to get better at it.', why: 'Comfort messages ("not everyone can") implicitly communicate fixed ability.' },
          { instead: 'You got it wrong.', try: 'Your brain just grew. What did that mistake teach you?', why: 'Reframing errors as learning signals reduces math anxiety by up to 30% (Boaler, 2013).' },
          { instead: 'See? You ARE smart!', try: 'See what happens when you stick with something difficult?', why: 'Attributing success to identity ("you\u2019re smart") makes future failure feel like identity threat.' },
        ];

        educatorContent = h('div', { style: { padding: '20px', maxWidth: '650px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83C\uDFEB'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 4px' } }, 'Educator Lens'),
            h('p', { style: { fontSize: '13px', color: _gmC('#94a3b8'), margin: 0 } }, 'Growth mindset isn\u2019t just for students. The language adults use shapes the mindset culture of the classroom.')
          ),
          // Teacher reframe card
          h('div', { style: { marginBottom: '20px' } },
            h('div', { style: { fontSize: '13px', fontWeight: 700, color: _gmC('#374151'), marginBottom: '10px' } }, '\uD83D\uDD04 Reframe: What We Say About Students'),
            h('div', { style: { background: _gmC('#fef2f2'), border: '2px solid #fca5a5', borderRadius: '12px', padding: '14px', marginBottom: '8px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: _gmC('#dc2626'), textTransform: 'uppercase', marginBottom: '4px' } }, 'Fixed mindset language'),
              h('p', { style: { fontSize: '14px', fontWeight: 600, color: _gmC('#7f1d1d'), margin: 0, fontStyle: 'italic' } }, '"' + currentTR.fixed + '"')
            ),
            h('div', { style: { background: EMERALD_LIGHT, border: '2px solid #6ee7b7', borderRadius: '12px', padding: '14px', marginBottom: '8px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: EMERALD, textTransform: 'uppercase', marginBottom: '4px' } }, 'Growth mindset reframe'),
              h('p', { style: { fontSize: '14px', fontWeight: 600, color: EMERALD_DARK, margin: 0 } }, '"' + currentTR.growth + '"')
            ),
            h('div', { style: { background: _gmC('#eff6ff'), borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid #3b82f6', marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: _gmC('#2563eb'), marginBottom: '2px' } }, '\uD83D\uDCDA Research'),
              h('p', { style: { fontSize: '12px', color: _gmC('#374151'), margin: 0, lineHeight: 1.5 } }, currentTR.research)
            ),
            h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
              h('button', {
                onClick: function() { upd('tReframeIdx', (tReframeIdx - 1 + TEACHER_REFRAMES.length) % TEACHER_REFRAMES.length); },
                style: { padding: '6px 14px', background: _gmC('#fff'), border: '2px solid ' + _gmC('#e5e7eb'), borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: _gmC('#374151') }
              }, '\u2190 Prev'),
              h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '11px', color: _gmC('#94a3b8') } }, (tReframeIdx % TEACHER_REFRAMES.length + 1) + ' / ' + TEACHER_REFRAMES.length),
              h('button', {
                onClick: function() { upd('tReframeIdx', (tReframeIdx + 1) % TEACHER_REFRAMES.length); },
                style: { padding: '6px 14px', background: EMERALD, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#fff' }
              }, 'Next \u2192')
            )
          ),
          // Feedback phrase guide
          h('div', null,
            h('div', { style: { fontSize: '13px', fontWeight: 700, color: _gmC('#374151'), marginBottom: '10px' } }, '\uD83D\uDCAC Growth-Oriented Feedback Phrases'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              FEEDBACK_PHRASES.map(function(fp, i) {
                return h('div', { key: i, style: { background: _gmC('#fff'), border: '1px solid ' + _gmC('#e5e7eb'), borderRadius: '10px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' } },
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' } },
                      h('span', { style: { fontSize: '10px', background: _gmC('#fef2f2'), color: _gmC('#dc2626'), padding: '1px 6px', borderRadius: '4px', fontWeight: 600 } }, 'Instead of'),
                      h('span', { style: { fontSize: '12px', color: _gmC('#94a3b8'), fontStyle: 'italic' } }, '"' + fp.instead + '"')
                    ),
                    h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' } },
                      h('span', { style: { fontSize: '10px', background: EMERALD_LIGHT, color: EMERALD, padding: '1px 6px', borderRadius: '4px', fontWeight: 600 } }, 'Try'),
                      h('span', { style: { fontSize: '12px', color: _gmC('#1f2937'), fontWeight: 600 } }, '"' + fp.try + '"')
                    ),
                    h('p', { style: { fontSize: '11px', color: _gmC('#94a3b8'), margin: '2px 0 0', lineHeight: 1.4 } }, fp.why)
                  )
                );
              })
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Progress Summary (shown at bottom of every tab) ──
      // ══════════════════════════════════════════════════════════
      var progressBar = (totalFacts + totalReframes + totalStories) > 0
        ? h('div', { style: { padding: '8px 16px', borderTop: '1px solid ' + _gmC('#d1fae5'), background: _gmC('#f0fdf4'), display: 'flex', gap: '16px', alignItems: 'center', fontSize: '10px', color: _gmC('#94a3b8'), flexShrink: 0 } },
            h('span', null, '\uD83E\uDDE0 ' + totalFacts + ' facts'),
            h('span', null, '\uD83D\uDD04 ' + totalReframes + ' reframed'),
            h('span', null, '\uD83C\uDF1F ' + totalStories + ' stories'),
            h('span', null, '\uD83C\uDF31 ' + growthGoals.length + ' goals'),
            savedLetters.length > 0 && h('span', null, '\u2709\uFE0F ' + savedLetters.length + ' letters'),
            (totalFacts + totalReframes + totalStories) >= 10 && h('span', { style: { color: EMERALD, fontWeight: 700 } }, '\u2728 Growth mindset activated!')
          )
        : null;

      // ══════════════════════════════════════════════════════════
      // ── Final Render ──
      // ══════════════════════════════════════════════════════════
      var content = brainContent || reframeContent || storiesContent || mapContent || coachContent || letterContent || educatorContent;

      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('growthmindset', h, ctx) : null),
        tabBar,
        heroBand,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content),
        progressBar
      );
    }
  });
})();
