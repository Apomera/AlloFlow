// ═══════════════════════════════════════════
// sel_tool_restorativecircle.js — Restorative Circle Process
// Restorative justice circles, proactive community circles,
// talking piece tradition, and honoring Indigenous roots
// ═══════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[SelHub] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[SelHub] Error rendering ' + id, e); return null; } }
};

(function() {
  'use strict';

  // ── Audio + WCAG (auto-injected) ──
  var _restorAC = null;
  function getRestorAC() { if (!_restorAC) { try { _restorAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_restorAC && _restorAC.state==="suspended") { try { _restorAC.resume(); } catch(e) {} } return _restorAC; }
  function restorTone(f,d,tp,v) { var ac=getRestorAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxRestorClick() { restorTone(600,0.03,"sine",0.04); }
  function sfxRestorSuccess() { restorTone(523,0.08,"sine",0.07); setTimeout(function(){restorTone(659,0.08,"sine",0.07);},70); setTimeout(function(){restorTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("restor-a11y")){var _s=document.createElement("style");_s.id="restor-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}.text-slate-400{color:#64748b!important}";document.head.appendChild(_s);}


  // ── Circle process data ──

  var CIRCLE_TYPES = [
    { id: 'community', label: 'Community Building', emoji: '\uD83C\uDF31', color: '#22c55e', desc: 'Strengthen relationships, build trust, and create belonging in your group.' },
    { id: 'restorative', label: 'Repairing Harm', emoji: '\uD83D\uDC9B', color: '#eab308', desc: 'Address conflict or harm with empathy, accountability, and healing.' },
    { id: 'celebration', label: 'Celebration & Gratitude', emoji: '\uD83C\uDF89', color: '#a855f7', desc: 'Honor achievements, express gratitude, and celebrate each other.' },
    { id: 'academic', label: 'Academic Discussion', emoji: '\uD83D\uDCDA', color: '#3b82f6', desc: 'Explore ideas together with equal voice and deep listening.' },
    { id: 'check-in', label: 'Daily Check-In', emoji: '\u2600\uFE0F', color: '#f97316', desc: 'Start the day by connecting, sharing, and setting intentions.' },
  ];

  var TALKING_PIECES = [
    { id: 'feather', name: 'Eagle Feather', emoji: '\uD83E\uDEB6', origin: 'Many First Nations / Native American traditions', significance: 'The eagle feather is sacred in many Indigenous cultures. It represents truth, honor, and the connection between the holder and the Creator. When you hold the feather, you carry the responsibility to speak from the heart.' },
    { id: 'stone', name: 'Talking Stone', emoji: '\uD83E\uDEA8', origin: 'Various Indigenous cultures worldwide', significance: 'Stones connect us to the Earth. A smooth river stone represents patience \u2014 shaped by water over thousands of years. Holding it reminds us that understanding takes time, and every voice matters.' },
    { id: 'shell', name: 'Conch Shell', emoji: '\uD83D\uDC1A', origin: 'Pacific Islander and Caribbean traditions', significance: 'The conch shell carries the sound of the ocean \u2014 a reminder that we are all connected. In many island cultures, the conch called communities together for important gatherings.' },
    { id: 'stick', name: 'Talking Stick', emoji: '\uD83E\uDEB5', origin: 'Many First Nations / Native American traditions', significance: 'The talking stick is often decorated with meaningful symbols. Holding it gives you the right and responsibility to speak while others listen with respect. It teaches that listening is as important as speaking.' },
    { id: 'heart', name: 'Heart Object', emoji: '\u2764\uFE0F', origin: 'Modern circle practice', significance: 'A heart-shaped object reminds us to speak from the heart and listen with compassion. It represents the courage it takes to be vulnerable and honest.' },
    { id: 'yarn', name: 'Ball of Yarn', emoji: '\uD83E\uDDF6', origin: 'Community weaving traditions', significance: 'As the yarn passes around the circle, it creates a visible web of connection. This shows how our stories and experiences are woven together \u2014 we are stronger connected.' },
  ];

  var INDIGENOUS_ROOTS = {
    title: 'Honoring the Roots of Circle Practice',
    paragraphs: [
      'Circle processes have been practiced by Indigenous peoples around the world for thousands of years \u2014 long before Western institutions adopted them. Many First Nations, Native American, Aboriginal Australian, M\u0101ori, and African communities have used circles as the foundation of governance, conflict resolution, and community life.',
      'In many Native American traditions, the circle represents the interconnectedness of all living things. The Medicine Wheel teaches that all directions, seasons, and aspects of life are connected. When we sit in circle, we honor this teaching \u2014 every person is equal, every voice matters, and we are all part of something larger.',
      'The Navajo (Din\u00e9) practice of Peacemaking, the Haudenosaunee (Iroquois) tradition of consensus, and the M\u0101ori concept of hui all use circle-based processes to resolve conflict and make decisions. These practices center relationships over punishment, healing over blame, and community over individuals.',
      'When we use circles in schools today, we are guests of these traditions. We have a responsibility to honor their origins, practice them with respect, and acknowledge that we are building on wisdom that Indigenous communities developed and maintained for millennia.',
      'It is important to note that these practices were actively suppressed during colonization. Using them today is also an act of recognizing that Indigenous knowledge systems hold profound wisdom for how humans can live, learn, and resolve conflict together.',
    ],
    reflection: 'What does it mean to you to practice something rooted in traditions that are thousands of years old? How can you honor those roots?',
  };

  var CIRCLE_PROMPTS = {
    'community': {
      elementary: [
        'What is something that made you smile this week?',
        'If you could have any superpower to help others, what would it be?',
        'What is one thing you like about the person sitting next to you?',
        'What is something you are really good at?',
        'If our class was a team of superheroes, what would our team name be?',
        'What makes you feel safe and welcome in our classroom?',
        'Tell us about someone who is kind to you.',
        'What is one wish you have for our class this week?',
      ],
      middle: [
        'What is one thing people might not know about you that you would like to share?',
        'Describe a time when someone showed you unexpected kindness.',
        'What does "belonging" mean to you? Where do you feel you belong?',
        'If you could change one thing about how people treat each other, what would it be?',
        'What is something you are struggling with that you would like support with?',
        'What does respect look like in our community?',
        'Share a tradition from your family or culture that is meaningful to you.',
        'What is one thing our class could do to make everyone feel more included?',
      ],
      high: [
        'What is a value you hold that shapes how you treat people?',
        'Describe a moment when you felt truly heard by someone.',
        'What does justice mean to you? Is it different from fairness?',
        'How has your understanding of yourself changed in the past year?',
        'What is something you want to unlearn? Why?',
        'When have you been an ally to someone? When has someone been an ally to you?',
        'What does vulnerability look like in a community that feels safe?',
        'What is one thing our generation can teach older generations?',
      ],
    },
    'restorative': {
      elementary: [
        'What happened? Tell us in your own words.',
        'How did you feel when this happened?',
        'Who was affected by what happened?',
        'What do you need right now to feel better?',
        'What can we do to make things right?',
        'How can we make sure this does not happen again?',
      ],
      middle: [
        'What happened from your perspective?',
        'What were you thinking at the time? What are you thinking now?',
        'How has this affected you and others?',
        'What has been the hardest thing for you about this situation?',
        'What do you think needs to happen to make things right?',
        'What would it take for you to move forward?',
      ],
      high: [
        'Share what happened from your perspective \u2014 speak from "I" statements.',
        'What were the thoughts and feelings driving your actions?',
        'Who has been affected, and in what ways?',
        'What obligations or responsibilities do you see arising from this?',
        'What would accountability look like in this situation?',
        'What would healing look like for everyone involved?',
        'How can our community support the repair process?',
      ],
    },
    'celebration': {
      elementary: [
        'What is something you are proud of this week?',
        'Who helped you learn something new? What did they do?',
        'What is one kind thing you saw someone do?',
        'What is your favorite memory from this month?',
      ],
      middle: [
        'Share an accomplishment \u2014 big or small \u2014 that matters to you.',
        'Who in this circle has inspired you, and how?',
        'What is something our class did together that made you proud?',
        'What is one thing you are grateful for right now?',
      ],
      high: [
        'Share a moment of growth you have experienced recently.',
        'Acknowledge someone in this circle and the impact they have had on you.',
        'What is something our community has overcome together?',
        'What are you looking forward to, and why does it matter to you?',
      ],
    },
    'check-in': {
      elementary: [
        'On a scale of 1-5, how are you feeling today? Show with your fingers.',
        'What is one word that describes how you feel right now?',
        'What are you looking forward to today?',
        'What do you need from our class today to have a good day?',
      ],
      middle: [
        'Check in with one word or phrase \u2014 how are you arriving today?',
        'What is on your mind right now? (You can pass if you prefer.)',
        'What is one intention you have for today?',
        'Is there anything you need the group to know?',
      ],
      high: [
        'How are you showing up today \u2014 mentally, emotionally, physically?',
        'What is something you are carrying that you would like to set down?',
        'What do you need from this space today?',
        'One word: what energy are you bringing to the circle?',
      ],
    },
    'academic': {
      elementary: [
        'What is one new thing you learned this week that surprised you?',
        'What question do you still have about what we are learning?',
        'How would you explain what we are studying to a friend?',
      ],
      middle: [
        'What connection can you make between what we are learning and your life?',
        'What is the most important idea from today, and why?',
        'What is a question you want to explore further?',
        'Do you agree or disagree with [topic]? Why?',
      ],
      high: [
        'How does today\'s content challenge or confirm something you already believed?',
        'What perspectives are missing from what we studied?',
        'How would you apply this knowledge to solve a real-world problem?',
        'What is the most important question this topic raises?',
      ],
    },
  };

  var CIRCLE_AGREEMENTS = [
    { text: 'Speak from the heart \u2014 use "I" statements', icon: '\u2764\uFE0F' },
    { text: 'Listen from the heart \u2014 give your full attention', icon: '\uD83D\uDC42' },
    { text: 'Speak lean \u2014 be thoughtful and concise', icon: '\uD83C\uDFAF' },
    { text: 'Be spontaneous \u2014 respond in the moment, not rehearsed', icon: '\u2728' },
    { text: 'What is shared in circle stays in circle (confidentiality)', icon: '\uD83D\uDD12' },
    { text: 'It is OK to pass \u2014 you always have the right to not speak', icon: '\uD83E\uDD1D' },
    { text: 'Respect the talking piece \u2014 only the holder speaks', icon: '\uD83E\uDEB6' },
  ];

  // ── Circle Scripts data ──

  var CIRCLE_SCRIPTS = {
    opening: {
      elementary: [
        { title: 'Talking Piece Introduction', desc: 'Welcome to our circle. Today our talking piece is [name]. When you hold it, it is your turn to speak. When someone else holds it, we listen with our whole body. Let us pass the piece around and each say our name and one word for how we feel today.' },
        { title: 'Mindful Moment', desc: 'Let us begin by taking three deep breaths together. Breathe in through your nose... hold... and breathe out through your mouth slowly. Feel your feet on the floor. Notice the sounds around you. Now let us open our eyes and look around the circle at our friends. We are here together.' },
        { title: 'Community Agreements Review', desc: 'Before we begin, let us remember our circle agreements. I will read each one and you can give a thumbs up if you agree to follow it today. Speak from the heart. Listen with your whole body. It is okay to pass. What happens in circle stays in circle.' },
        { title: 'Gratitude Start', desc: 'Let us start our circle by thinking of one thing we are thankful for today. It can be big or small \u2014 a person, a pet, your favorite food, or something that made you laugh. As the talking piece comes to you, share your thankful thought.' },
      ],
      middle: [
        { title: 'Talking Piece Introduction', desc: 'Welcome to our circle. Our talking piece today is [name]. Holding it means you have the floor \u2014 no one will interrupt, judge, or comment until it is their turn. If you want to pass, just say "pass" and hand it along. Let us start by going around and each sharing our name and one thing on our mind today.' },
        { title: 'Mindful Centering', desc: 'Before we begin, I invite you to close your eyes or soften your gaze. Take a slow breath in... and let it go. Notice any tension in your shoulders or jaw and try to release it. Bring your attention into this room, this circle. When you are ready, open your eyes. We are here, together, and that matters.' },
        { title: 'Norms Check-In', desc: 'Let us revisit our circle norms. As I read each one, think about whether it still feels right. Speak honestly. Listen with empathy. Respect confidentiality. You can always pass. Lean in with curiosity. Does anyone want to suggest an addition or change?' },
        { title: 'Connection Spark', desc: 'We are going to start with a quick connection activity. Think of a song, a quote, or an image that captures how your week has been. As the talking piece comes to you, share it and tell us why. There are no wrong answers \u2014 just honest ones.' },
      ],
      high: [
        { title: 'Talking Piece Introduction', desc: 'Welcome. Our talking piece today represents the commitment we make to this space \u2014 to speak truthfully, to listen deeply, and to hold what is shared with care. When you hold it, the circle is yours. When you do not, your role is to witness. Let us begin by going around: your name and one word for where you are right now.' },
        { title: 'Grounding Practice', desc: 'I invite you to take a moment to arrive. Close your eyes if you are comfortable. Notice your breathing without changing it. Let whatever you are carrying from earlier today just be there \u2014 you do not have to put it down, just acknowledge it. Take one more breath. When you open your eyes, bring your full self into this circle.' },
        { title: 'Agreements Revisit', desc: 'Our circle agreements are a living document \u2014 they belong to us and they can evolve. Let me read them: Speak from the heart. Listen from the heart. Say just enough. Trust the process. Respect confidentiality. The right to pass is sacred. Do these still serve us? Let us take a moment to affirm or adjust.' },
        { title: 'Intention Setting', desc: 'Before we dive in, I want each of us to set a personal intention for this circle. Not what you will say, but how you want to show up. Maybe you intend to listen more deeply, or to take a risk and share something real, or to hold space for someone else. As the piece comes around, share your intention if you are comfortable.' },
      ],
    },
    checkIn: {
      elementary: [
        { title: 'Mood Weather Check', desc: 'If your feelings were the weather right now, what would it be? Sunny and happy? Rainy and sad? Cloudy and unsure? Stormy and mad? Share your weather and tell us a little about why.' },
        { title: 'Rose / Thorn / Bud', desc: 'Share one rose (something good that happened), one thorn (something hard or sad), and one bud (something you are looking forward to). You can start with any one you want!' },
        { title: 'Highs and Lows', desc: 'Think about your week so far. What was your highest moment \u2014 the best part? And what was your lowest moment \u2014 the hardest part? Share both with the circle.' },
      ],
      middle: [
        { title: 'Mood Weather Check', desc: 'Describe your current emotional state as a weather forecast. Are you partly cloudy with a chance of frustration? Bright sunshine with a light breeze of excitement? Be as creative as you want \u2014 the more specific, the better.' },
        { title: 'Rose / Thorn / Bud', desc: 'Share a rose (a highlight or something you are grateful for), a thorn (a challenge or something weighing on you), and a bud (something you are hopeful or curious about). Give each one a sentence.' },
        { title: 'Highs and Lows', desc: 'What was the high point of your week \u2014 a moment that felt good, meaningful, or exciting? What was the low point \u2014 something difficult, disappointing, or draining? Both are valid and both are welcome here.' },
      ],
      high: [
        { title: 'Mood Weather Check', desc: 'Give us your internal weather report. What is the climate of your mind and heart right now? What storm systems or sunshine are you carrying into this space? Be honest \u2014 this circle can hold it.' },
        { title: 'Rose / Thorn / Bud', desc: 'Rose: something that nourished you recently. Thorn: something that pricked or challenged you. Bud: something emerging in you \u2014 a new understanding, hope, or question. Take your time with each.' },
        { title: 'Highs and Lows', desc: 'Reflect on your recent experience. Share a high \u2014 a moment of connection, achievement, or clarity. Share a low \u2014 a moment of struggle, doubt, or disconnection. What did each teach you about yourself?' },
      ],
    },
    discussion: {
      elementary: [
        'What does it mean to be a good friend?',
        'How do you know when someone feels left out?',
        'What should you do when you see someone being treated unfairly?',
        'Tell about a time you made a mistake and what you learned.',
        'What makes our classroom feel like a community?',
        'If you could make one rule for how people treat each other, what would it be?',
        'What does courage mean to you?',
        'How can we help someone who is having a bad day?',
        'What does it mean to really listen to someone?',
        'What is the difference between being nice and being kind?',
      ],
      middle: [
        'What does it mean to take responsibility for your actions?',
        'How do you handle it when someone you trust lets you down?',
        'What is the difference between punishment and accountability?',
        'When have you witnessed injustice? What did you do or wish you had done?',
        'What does it mean to repair a relationship after a conflict?',
        'How do stereotypes and assumptions affect how we treat each other?',
        'What does empathy look like in action?',
        'How do you decide what is right when two values conflict?',
        'What role does forgiveness play in a healthy community?',
        'How can we disagree with someone and still respect them?',
      ],
      high: [
        'What is the relationship between power and responsibility in our community?',
        'How do systems of privilege and oppression show up in everyday interactions?',
        'What does restorative justice mean to you, and how is it different from punitive justice?',
        'When is silence complicity, and when is it wisdom?',
        'How do we balance individual freedom with collective well-being?',
        'What does it mean to hold space for someone whose experience is very different from yours?',
        'How can communities heal from collective harm or trauma?',
        'What is the difference between intent and impact, and why does it matter?',
        'How do we build trust after it has been broken?',
        'What would a truly just school community look like?',
      ],
    },
    closing: {
      elementary: [
        { title: 'Gratitude Round', desc: 'Before we close our circle, let us go around one more time. Share one thing you are grateful for from today \u2014 it can be something someone said, something you felt, or just being here together.' },
        { title: 'Commitment Statement', desc: 'Think of one thing you will do this week to be kind to someone in our community. As the talking piece comes to you, share your commitment. We will remember and support each other.' },
        { title: 'Community Affirmation', desc: 'Let us close by saying together: "We are a circle of friends. We listen, we care, we grow together. Thank you for sharing your voice today." Now let us take one deep breath together and quietly return to our day.' },
      ],
      middle: [
        { title: 'Gratitude Round', desc: 'Let us close with a round of gratitude. Share something from this circle that resonated with you, or thank someone for something they shared. Keep it brief, keep it real.' },
        { title: 'Commitment Statement', desc: 'Based on what we discussed today, what is one thing you commit to doing differently this week? It can be small. Share it out loud \u2014 saying it makes it more real.' },
        { title: 'Community Affirmation', desc: 'Let us close by going around and completing this sentence: "Something I want this community to know is..." Then we will take a collective breath and close our circle with respect.' },
      ],
      high: [
        { title: 'Gratitude Round', desc: 'As we prepare to close, take a moment to reflect on what was shared. Offer a word or sentence of gratitude \u2014 for a specific person, an insight, or simply the courage it took to be honest in this space.' },
        { title: 'Commitment Statement', desc: 'What are you taking with you from this circle? What will you do with it? Share a commitment \u2014 not a performance, but a genuine intention. This is between you and this community.' },
        { title: 'Community Affirmation', desc: 'Let us close by acknowledging what we built here today. Look around the circle. These are the people who showed up. Complete this sentence: "Being in this circle, I learned..." Then we will close together in silence for a moment before we go.' },
      ],
    },
  };

  // ── Harm Repair Process steps ──

  var HARM_REPAIR_STEPS = [
    {
      id: 'harmed-perspective',
      title: 'What happened?',
      subtitle: 'Perspective of the person harmed',
      icon: '\uD83D\uDCAC',
      guidance: {
        elementary: 'Tell us what happened in your own words. Take your time. We are listening.',
        middle: 'Share what happened from your perspective. Use "I" statements. What did you experience?',
        high: 'Describe the events as you experienced them. Focus on what happened and how it affected you personally. Speak from your own truth.',
      },
      placeholder: {
        elementary: 'I felt sad when...',
        middle: 'From my perspective, what happened was...',
        high: 'The situation as I experienced it...',
      },
    },
    {
      id: 'caused-perspective',
      title: 'What happened?',
      subtitle: 'Perspective of the person who caused harm',
      icon: '\uD83D\uDDE3\uFE0F',
      guidance: {
        elementary: 'Now it is your turn to tell what happened. Be honest. Everyone makes mistakes, and being honest is the first step to making things better.',
        middle: 'Share your perspective. What happened from your point of view? This is not about excuses \u2014 it is about understanding.',
        high: 'Describe the events from your perspective. Own your actions honestly. This takes courage, and the circle respects that courage.',
      },
      placeholder: {
        elementary: 'What I did was...',
        middle: 'From my perspective...',
        high: 'My understanding of what happened is...',
      },
    },
    {
      id: 'thoughts-feelings',
      title: 'What were you thinking and feeling?',
      subtitle: 'Both participants reflect',
      icon: '\uD83D\uDCA7',
      guidance: {
        elementary: 'Think back to when this happened. What were you feeling? Were you angry, sad, scared, confused? It is okay to have big feelings.',
        middle: 'What thoughts and feelings were driving your actions at the time? What thoughts and feelings do you have now, looking back?',
        high: 'Explore the internal experience \u2014 what thoughts, emotions, pressures, or past experiences influenced your behavior? How has your thinking shifted since then?',
      },
      placeholder: {
        elementary: 'I was feeling...',
        middle: 'At the time, I was thinking and feeling...',
        high: 'The thoughts and emotions that were present for me...',
      },
    },
    {
      id: 'who-affected',
      title: 'Who has been affected and how?',
      subtitle: 'Understanding the ripple effects',
      icon: '\uD83C\uDF0A',
      guidance: {
        elementary: 'When something happens between people, it does not just affect the two people. Think about who else might have been hurt or worried. Friends? Family? Teachers?',
        middle: 'Harm creates ripples. Think about everyone who was affected \u2014 directly and indirectly. How has this impacted relationships, trust, and the community?',
        high: 'Consider the full scope of impact. Who has been affected beyond the immediate participants? How has this affected trust, sense of safety, community bonds, and each person\'s well-being?',
      },
      placeholder: {
        elementary: 'The people affected are...',
        middle: 'This situation has affected...',
        high: 'The impact has extended to...',
      },
    },
    {
      id: 'make-right',
      title: 'What do you need to make things right?',
      subtitle: 'The person harmed names their needs',
      icon: '\uD83E\uDE79',
      guidance: {
        elementary: 'What would help you feel better? What do you need from the other person? Maybe an apology, a promise, or something else?',
        middle: 'What do you need to move forward? This could be an acknowledgment, a specific action, a change in behavior, or something else entirely. Be specific about what repair looks like for you.',
        high: 'What would genuine repair look like for you? Consider what you need emotionally, relationally, and practically. What would help restore your sense of safety, dignity, or trust?',
      },
      placeholder: {
        elementary: 'To feel better, I need...',
        middle: 'What I need to move forward is...',
        high: 'For genuine repair, I need...',
      },
    },
    {
      id: 'agreement',
      title: 'What will you do differently?',
      subtitle: 'Creating a repair agreement',
      icon: '\uD83E\uDD1D',
      guidance: {
        elementary: 'Now let us make a plan together. What will each person do differently from now on? Let us write it down so we can remember our promises.',
        middle: 'Based on everything shared today, what specific actions and commitments will each person make? An agreement is strongest when it is specific, realistic, and comes from genuine understanding.',
        high: 'Craft a concrete agreement that addresses the harm and prevents recurrence. What specific behaviors will change? What accountability structures will you put in place? How will you check in on progress?',
      },
      placeholder: {
        elementary: 'I promise to...',
        middle: 'I commit to the following actions...',
        high: 'My specific commitments going forward are...',
      },
    },
  ];

  // ── Restorative Justice Scenarios ──

  var RJ_SCENARIOS = {
    elementary: [
      {
        title: 'The Playground Conflict',
        emoji: '\uD83C\uDFDE\uFE0F',
        setup: 'During recess, two students both want to use the only open swing. One pushes the other out of the way and grabs the swing. The pushed student falls and scrapes their knee. Other kids saw what happened.',
        choices: [
          { text: 'Bring both students into a circle to talk about what happened', next: 'Both students sit in a circle with a counselor. The student who fell shares how scared and hurt they felt. The student who pushed admits they did not think before acting. They realize pushing is never okay.' },
          { text: 'Ask classmates who saw it to share what they observed', next: 'Witnesses share what they saw without blaming anyone. One says, "I saw them both running to the swing and then there was a push." The group discusses how they can solve swing arguments in the future.' },
          { text: 'Help the students create a plan for sharing', next: 'The students work together to create a swing schedule and agree to take turns. They also decide that if they both want it at the same time, they will play rock-paper-scissors. They shake hands.' },
        ],
      },
      {
        title: 'Name-Calling Hurts',
        emoji: '\uD83D\uDE22',
        setup: 'A student has been calling another student a mean nickname in the hallway. Other kids have started using the nickname too. The student being called the name has started eating lunch alone and seems sad.',
        choices: [
          { text: 'Hold a circle about how words affect people', next: 'In circle, the class discusses how names and words can hurt. The student who was called names bravely shares how lonely and sad they have felt. Several classmates apologize for joining in.' },
          { text: 'Talk privately with the student who started the name-calling', next: 'The student admits they thought it was funny at first but did not realize how much it hurt. They share that someone once called them names too and it felt terrible. They decide to apologize and ask others to stop.' },
          { text: 'Help the two students meet and talk', next: 'In a restorative conversation, the student who used the name learns how much pain it caused. They write a genuine apology and commit to standing up if they hear anyone else use the name.' },
        ],
      },
      {
        title: 'Left Out at Lunch',
        emoji: '\uD83C\uDF71',
        setup: 'A group of friends has been telling another student they cannot sit with them at lunch. They save seats and say "this seat is taken" whenever the student tries to join. The student has been sitting alone for a week.',
        choices: [
          { text: 'Hold a community circle about inclusion', next: 'The class discusses what it feels like to be excluded. Many students share times they were left out. The group realizes exclusion hurts deeply and creates a class agreement about open seating at lunch.' },
          { text: 'Meet with the group who has been excluding', next: 'In a small circle, the group hears directly from the excluded student about how painful it has been. They feel remorseful and realize they would not want to be treated this way. They invite the student to join them tomorrow.' },
          { text: 'Create a buddy bench or lunch invitation system', next: 'The class creates a "welcome table" at lunch where anyone can sit and feel included. Students volunteer as lunch buddies. The student who was excluded helps design the system so they feel empowered.' },
        ],
      },
      {
        title: 'The Broken Project',
        emoji: '\uD83D\uDEE0\uFE0F',
        setup: 'A student accidentally knocked over and broke another student\'s science project that they had worked on for two weeks. The student whose project broke started crying. The other student says it was an accident.',
        choices: [
          { text: 'Have both students sit together and talk about what happened', next: 'The student who broke the project sincerely apologizes and explains it was an accident. The other student shares how heartbroken they feel. They decide the first student will help rebuild the project after school.' },
          { text: 'Ask the class how they can help', next: 'In a circle, classmates offer to help rebuild the project. Several students donate materials and time. The class learns that even accidents have consequences and communities help each other repair.' },
          { text: 'Focus on the feelings first, then find a solution', next: 'Both students take turns sharing their feelings. The one who broke it feels terrible and guilty. The one whose project broke feels sad and frustrated. After they both feel heard, they brainstorm solutions together.' },
        ],
      },
      {
        title: 'Copying Someone\'s Work',
        emoji: '\uD83D\uDCDD',
        setup: 'A student copied answers from their neighbor during a test. The neighbor noticed and told the teacher. Now the student who copied is angry at the neighbor for "telling on" them, and the neighbor feels guilty and confused.',
        choices: [
          { text: 'Hold a restorative conversation between the two students', next: 'In the conversation, the student who copied admits they were scared of getting a bad grade. The neighbor explains they felt uncomfortable and did not know what else to do. They both realize the situation was hard and agree to support each other with studying instead.' },
          { text: 'Use a circle to talk about honesty and helping each other', next: 'The class discusses the difference between helping someone learn and helping someone cheat. They talk about how honesty builds trust. Students share times they struggled and found help the right way.' },
          { text: 'Help the students understand each other\'s feelings', next: 'The student who copied learns that their neighbor felt violated \u2014 like their hard work was taken. The neighbor learns the copier was desperate and scared. They create a plan: the neighbor will be a study buddy before the next test.' },
        ],
      },
    ],
    middle: [
      {
        title: 'Cyberbullying Aftermath',
        emoji: '\uD83D\uDCF1',
        setup: 'A student created a group chat where they shared an embarrassing photo of a classmate without permission. The photo was screenshotted and shared widely. The classmate found out and has not come to school in two days.',
        choices: [
          { text: 'Bring the student who shared the photo into a restorative conversation', next: 'The student who shared the photo hears from a counselor about the impact: their classmate has been crying at home, afraid to face anyone. The student feels deep remorse as they realize a "funny" moment became real harm. They write a genuine apology and delete the photo from every platform they can.' },
          { text: 'Hold a circle with everyone who was in the group chat', next: 'In a circle, each person reflects on their role. Some say "I just looked at it, I did not share it." The facilitator helps them understand that silence and viewing is still participation. The group creates a plan to reach out to the harmed student and commits to a digital citizenship agreement.' },
          { text: 'Work with the harmed student to identify what repair looks like', next: 'The harmed student shares what they need: a genuine apology (not just "sorry"), the photo deleted everywhere, and the person to publicly acknowledge what they did was wrong. The student who shared the photo agrees and also commits to being an upstander against cyberbullying.' },
        ],
      },
      {
        title: 'The Rumor Mill',
        emoji: '\uD83D\uDDE3\uFE0F',
        setup: 'A student started a rumor about another student that is not true. The rumor has spread through the grade and the targeted student is being treated differently by peers. Former friends are avoiding them.',
        choices: [
          { text: 'Have the rumor-starter face the person they hurt in a facilitated conversation', next: 'In the conversation, the targeted student shares the real impact: lost friendships, anxiety, trouble sleeping. The student who started the rumor is confronted with the reality that words they thought were harmless have caused serious damage. They commit to telling everyone the truth.' },
          { text: 'Hold a grade-level circle about rumors and truth', next: 'Without naming anyone, the facilitator leads a powerful discussion about how rumors function. Students realize that passing along a rumor makes you part of the harm chain. Many reflect on times they spread information without checking if it was true.' },
          { text: 'Create a repair plan with specific actions', next: 'The student who started the rumor commits to: (1) telling every person they told that it was not true, (2) a written apology, (3) checking in weekly with the harmed student, and (4) a presentation to the class about the impact of rumors.' },
        ],
      },
      {
        title: 'Cheating Accusation',
        emoji: '\u2753',
        setup: 'A teacher accused a student of cheating on a paper because it was unusually well-written. The student actually wrote it themselves with help from a tutor. The student feels humiliated and the teacher feels uncertain.',
        choices: [
          { text: 'Facilitate a restorative conversation between student and teacher', next: 'The student shares how insulting and hurtful the accusation was \u2014 like their intelligence was being questioned. The teacher acknowledges they made an assumption without evidence and apologizes sincerely. They discuss how to prevent this in the future.' },
          { text: 'Include the tutor and parents for context', next: 'The tutor confirms the student did the work. In a circle, everyone discusses how assumptions and biases can cause harm. The teacher reflects on what led them to the accusation and commits to a different approach in the future.' },
          { text: 'Use the situation to discuss fairness and assumptions', next: 'In a class circle (without naming the student), the group discusses how assumptions about what someone "can" or "cannot" do are harmful. They explore how bias operates and create agreements about addressing concerns respectfully.' },
        ],
      },
      {
        title: 'Group Exclusion',
        emoji: '\uD83D\uDEAB',
        setup: 'A friend group of five students has been systematically excluding a sixth member \u2014 changing plans without telling them, going silent in group chats when they text, and picking teams without them in PE.',
        choices: [
          { text: 'Meet with the excluded student to understand their experience', next: 'The student breaks down and shares that they have been questioning everything about themselves. They do not understand what they did wrong. The counselor validates their pain and helps them articulate what they need from the group.' },
          { text: 'Hold a circle with the whole friend group', next: 'In the circle, the group is confronted with the pattern of their behavior. Some did not realize how coordinated the exclusion looked from the outside. The excluded student shares their pain. Several group members express genuine remorse.' },
          { text: 'Have each group member reflect individually, then come together', next: 'Each member writes about their role in the exclusion and what motivated it. When they come together, patterns emerge: jealousy, a misunderstanding, and groupthink. They create specific commitments for re-including their friend.' },
        ],
      },
      {
        title: 'The Stolen Idea',
        emoji: '\uD83D\uDCA1',
        setup: 'In a group project, one student presented the whole project to the class, taking credit for ideas that came from another group member. The overlooked student feels betrayed and furious. The rest of the group stayed silent.',
        choices: [
          { text: 'Facilitate a conversation between the two students', next: 'The student who was overlooked shares that this is not the first time their contributions have been erased and it connects to deeper experiences of being dismissed. The presenter realizes their ego took over and they need to acknowledge publicly who contributed what.' },
          { text: 'Hold a group circle with the full project team', next: 'The silent group members admit they knew what was happening but did not speak up. The circle explores what it means to be a bystander versus an ally. The group agrees to re-present with proper credit.' },
          { text: 'Address the systemic issue of credit and voice', next: 'The class discusses how ideas get attributed and why some voices are amplified while others are silenced. They create a norm that all group presentations must name contributors. The overlooked student feels seen and validated.' },
        ],
      },
    ],
    high: [
      {
        title: 'Discriminatory Comments',
        emoji: '\u26A0\uFE0F',
        setup: 'A student made a discriminatory comment about another student\'s race/ethnicity during a class discussion. Some classmates laughed. The targeted student went silent and left class early. The student who made the comment says they were "just joking."',
        choices: [
          { text: 'Facilitate a direct restorative conversation', next: 'The targeted student shares the impact: the comment connected to a lifetime of similar experiences and the laughter made it worse. The student who made the comment begins to understand this is not about one joke \u2014 it is about a pattern of harm. They commit to educating themselves and making a public acknowledgment.' },
          { text: 'Hold a class circle about the incident and its context', next: 'The facilitator leads a deep discussion about microaggressions, the impact of "jokes," and the role of bystanders who laughed. Students explore how comments like this connect to systemic racism and create environments where people do not feel safe.' },
          { text: 'Create a multi-step accountability process', next: 'The student commits to: (1) a genuine, educated apology, (2) reading/watching resources about the impact of racial humor, (3) presenting what they learned to the class, and (4) ongoing check-ins with the harmed student. The class develops a protocol for addressing bias incidents.' },
        ],
      },
      {
        title: 'Academic Dishonesty',
        emoji: '\uD83D\uDCDA',
        setup: 'A student who is under immense pressure to maintain a 4.0 GPA for a scholarship bought an essay online and submitted it as their own. Another student who spent weeks writing their essay feels it is unfair. The teacher discovered the plagiarism.',
        choices: [
          { text: 'Explore the pressures behind the dishonesty', next: 'In a restorative conversation, the student who cheated opens up about the crushing pressure from family, scholarship requirements, and burnout. The circle does not excuse the behavior but humanizes it. The student takes responsibility while the school examines how its pressure systems contribute to dishonesty.' },
          { text: 'Address the fairness concern with both students', next: 'The student who worked honestly shares their frustration about feeling penalized for doing the right thing. The student who cheated understands the impact on peers and the classroom community. They agree that the essay must be rewritten and the student commits to integrity going forward.' },
          { text: 'Facilitate a broader discussion about academic culture', next: 'A class circle explores the pressures that drive cheating: competition, ranking, fear of failure. Students realize the culture itself needs repair. They propose changes to the teacher: more revision opportunities, less high-stakes assessment, and a class honor code they create together.' },
        ],
      },
      {
        title: 'Relationship Conflict Spillover',
        emoji: '\uD83D\uDC94',
        setup: 'A breakup between two students has divided the friend group into "sides." Social media posts are being weaponized, personal information shared in the relationship is being spread, and the tension is disrupting the whole class.',
        choices: [
          { text: 'Meet separately with each student first, then bring them together', next: 'Each student shares their pain privately. When brought together, they establish ground rules: no interrupting, no social media discussion about each other, and mutual respect. They agree they cannot control their friends but they can model maturity. They create specific boundaries.' },
          { text: 'Address the friend group divide in a circle', next: 'The circle reveals that many students feel pressured to choose sides and hate it. The facilitator helps the group understand that loyalty does not require taking sides against someone. The friend group agrees that both students deserve support and the "sides" dissolve.' },
          { text: 'Focus on the shared information and privacy violation', next: 'The restorative process centers on the harm of sharing private information. Both students acknowledge they violated each other\'s trust. They agree to delete posts, stop sharing private details, and respect what was shared in confidence even though the relationship ended.' },
        ],
      },
      {
        title: 'Community Harm: Vandalism',
        emoji: '\uD83C\uDFEB',
        setup: 'A group of students vandalized a mural that the art class spent months creating. The mural celebrated the school\'s diversity. The vandalism included offensive language. The art students are devastated and many students in the school feel targeted.',
        choices: [
          { text: 'Hold a restorative circle with the students who did it', next: 'In the circle, the students face the artists who created the mural and hear the deep pain and sense of violation. They also hear from students whose identities were targeted by the language. The weight of the harm becomes real. They commit to restoration: repairing the mural, a public apology, and learning about the communities they hurt.' },
          { text: 'Organize a school-wide restorative process', next: 'The school holds community circles in every classroom to process the harm. Students share how the vandalism affected their sense of belonging and safety. The students responsible participate in a community service project focused on art and inclusion. The mural is restored collaboratively.' },
          { text: 'Create an ongoing accountability and education plan', next: 'The students who vandalized commit to a semester-long process: learning the history behind the mural\'s themes, working with the art class to restore it, facilitating circles about hate speech, and regular check-ins with affected students. The school also examines what conditions allowed this to happen.' },
        ],
      },
      {
        title: 'Whistleblower Retaliation',
        emoji: '\uD83D\uDD14',
        setup: 'A student reported a group of peers for hazing new team members during a sports initiation. Now the student who reported is being frozen out by the team and receiving threatening messages. They are being called a "snitch."',
        choices: [
          { text: 'Address the retaliation in a team circle', next: 'The team sits in circle and confronts the reality: they are punishing someone for protecting people. The facilitator helps them see that the reporter showed more courage than anyone involved in the hazing. Team members who were hazed as newcomers share how it actually felt. The team creates new initiation traditions rooted in welcome, not harm.' },
          { text: 'Meet with team leadership and the reporter', next: 'Team captains hear directly from the reporter about the threats and isolation. They realize they set the culture and they let the reporter down. They commit to publicly supporting the reporter and ending the retaliation. They also work with the coach to end hazing permanently.' },
          { text: 'Facilitate a broader conversation about courage and culture', next: 'The school uses this as a catalyst for discussing reporting culture, bystander responsibility, and the difference between loyalty and complicity. The reporter is acknowledged for their courage. The team develops a new code of conduct that they create together.' },
        ],
      },
      {
        title: 'Social Media Callout',
        emoji: '\uD83D\uDCF2',
        setup: 'A student publicly called out a classmate on social media for something offensive they said two years ago. The post went viral in the school. The called-out student says they have changed since then. The situation has become a school-wide debate about accountability versus cancellation.',
        choices: [
          { text: 'Bring both students into a restorative conversation', next: 'The student who posted explains they were genuinely hurt by the old comment and felt public accountability was necessary. The called-out student acknowledges the original harm but shares the real growth they have done since. They discuss: what does accountability look like when someone has genuinely changed? They agree the public post was not the right approach.' },
          { text: 'Hold a class circle about public accountability', next: 'The circle explores deep questions: Can people change? When is public calling out helpful and when is it harmful? What is the difference between accountability and punishment? Students develop nuanced views about how to address harm while allowing growth.' },
          { text: 'Focus on the impact on both students and find a path forward', next: 'Both students share their pain: one felt unheard for two years, the other feels defined by their worst moment. The circle helps them see each other as full humans. They create a joint statement about what happened, the growth that occurred, and what real accountability looks like.' },
        ],
      },
    ],
  };

  // ── Community Agreement suggestions ──

  var AGREEMENT_SUGGESTIONS = {
    elementary: [
      'We listen when someone is speaking.',
      'We use kind words and kind hands.',
      'It is okay to make mistakes \u2014 that is how we learn.',
      'We include everyone who wants to join.',
      'We say sorry when we mess up and try to fix it.',
      'We take turns and share.',
      'We ask before touching someone else\'s things.',
      'We help each other when someone is struggling.',
      'We celebrate each other\'s successes.',
      'We tell the truth, even when it is hard.',
    ],
    middle: [
      'We respect everyone\'s right to speak and be heard.',
      'We disagree with ideas, not people.',
      'We keep what is shared in circle confidential.',
      'We challenge ourselves to be honest and vulnerable.',
      'We take responsibility for our impact, not just our intent.',
      'We support each other through mistakes and growth.',
      'We stand up when we see someone being treated unfairly.',
      'We use technology responsibly and never to harm others.',
      'We assume good intent while addressing harmful impact.',
      'We create space for different perspectives and experiences.',
    ],
    high: [
      'We practice active listening without planning our response while others speak.',
      'We hold what is shared in this space with confidentiality and care.',
      'We take responsibility for our impact regardless of our intent.',
      'We challenge ideas and systems, not individuals\' worth.',
      'We acknowledge that discomfort is part of growth.',
      'We use our privilege to amplify marginalized voices, not speak for them.',
      'We commit to ongoing learning and unlearning.',
      'We hold each other accountable with compassion.',
      'We recognize that silence can be complicity and choose to speak up.',
      'We honor that everyone is at a different place in their journey.',
    ],
  };

  // ── Badges ──

  var BADGES = [
    { id: 'circle_keeper', name: 'Circle Keeper', emoji: '\u2B55', desc: 'Facilitate 3 complete circles', threshold: 3, key: 'circlesCompleted' },
    { id: 'harm_repairer', name: 'Harm Repairer', emoji: '\uD83E\uDE79', desc: 'Complete a full harm repair process', threshold: 1, key: 'harmRepairsCompleted' },
    { id: 'agreement_maker', name: 'Agreement Maker', emoji: '\uD83D\uDCDC', desc: 'Create a community agreement with 5+ items', threshold: 1, key: 'agreementsMade' },
    { id: 'script_writer', name: 'Script Writer', emoji: '\u270D\uFE0F', desc: 'Use 3 different circle scripts', threshold: 3, key: 'scriptsUsed' },
    { id: 'restorative_champion', name: 'Restorative Champion', emoji: '\uD83C\uDFC6', desc: 'Complete 5 restorative scenarios', threshold: 5, key: 'scenariosCompleted' },
    { id: 'deep_listener', name: 'Deep Listener', emoji: '\uD83D\uDC42', desc: 'Write reflections for 5 circle rounds', threshold: 5, key: 'reflectionsWritten' },
    { id: 'roots_scholar', name: 'Roots Scholar', emoji: '\uD83C\uDF0D', desc: 'Read and reflect on Indigenous roots', threshold: 1, key: 'rootsStudied' },
    { id: 'peace_builder', name: 'Peace Builder', emoji: '\uD83E\uDD4A', desc: 'Complete all scenario types in one grade band', threshold: 1, key: 'allScenariosInBand' },
    { id: 'question_master', name: 'Question Master', emoji: '\u2753', desc: 'Use 10 questions from the question bank', threshold: 10, key: 'questionsUsed' },
    { id: 'role_expert', name: 'Role Expert', emoji: '\uD83C\uDFAD', desc: 'Read all 5 circle role cards', threshold: 5, key: 'rolesStudied' },
    { id: 'empathy_mapper', name: 'Empathy Mapper', emoji: '\uD83E\uDDE0', desc: 'Complete an empathy mapping exercise', threshold: 1, key: 'empathyMapsCompleted' },
    { id: 'restorative_scholar', name: 'Restorative Scholar', emoji: '\uD83D\uDCDA', desc: 'Rate all 6 restorative vs punitive scenarios', threshold: 6, key: 'comparisonScenariosRated' },
    { id: 'peace_circle_leader', name: 'Peace Circle Leader', emoji: '\u262E\uFE0F', desc: 'Earn 5 other restorative circle badges', threshold: 5, key: 'totalBadgesEarned' },
  ];

  // ── Restorative Questions Bank ──

  var RESTORATIVE_QUESTIONS = {
    opening: {
      label: 'Opening / Check-In',
      emoji: '\u2600\uFE0F',
      color: '#f59e0b',
      questions: [
        'Share one word that describes how you are feeling right now.',
        'What is something good that happened recently?',
        'If you were weather today, what would you be and why?',
        'What is one thing you are grateful for this morning?',
        'On a scale of one to ten, how full is your emotional battery today?',
        'What is one hope you have for today?',
        'If your mood were a color, what color would it be?',
        'What is something small that made you smile this week?',
        'Share one word about how you are arriving in this space.',
        'What is one thing you need from this circle today?'
      ]
    },
    community: {
      label: 'Building Community',
      emoji: '\uD83C\uDF31',
      color: '#22c55e',
      questions: [
        'What does respect look like in our space?',
        'Tell us about someone who inspires you and why.',
        'What is a tradition your family has that you treasure?',
        'What is one thing that makes our community special?',
        'How do you show someone you care about them?',
        'What is a skill or talent you have that others might not know about?',
        'Describe a time someone made you feel truly welcome.',
        'What does trust look like between friends?',
        'If you could create one new tradition for our group, what would it be?',
        'What is the most important quality in a good friend?'
      ]
    },
    harm: {
      label: 'Addressing Harm',
      emoji: '\uD83D\uDC9B',
      color: '#eab308',
      questions: [
        'What happened from your perspective?',
        'What were you thinking at the time?',
        'Who was affected and how?',
        'What do you need to move forward?',
        'What has been the hardest part of this situation for you?',
        'How has this affected your sense of trust or safety?',
        'What would genuine accountability look like here?',
        'If you could go back in time, what would you do differently?',
        'What do you want the other person to understand about your experience?',
        'What would need to happen for healing to begin?'
      ]
    },
    closing: {
      label: 'Closing / Commitment',
      emoji: '\uD83C\uDF19',
      color: '#8b5cf6',
      questions: [
        'What is one thing you are taking away from this circle?',
        'What commitment will you make based on what we shared today?',
        'Share one word of hope for the future.',
        'What is one thing you appreciated about today\'s circle?',
        'How do you feel now compared to when we started?',
        'What is one act of kindness you will do this week?',
        'Finish this sentence: after this circle, I feel...',
        'What did you learn about someone else today?',
        'What is one thing you want to remember from this conversation?',
        'Share a wish you have for everyone in this circle.'
      ]
    }
  };

  // ── Circle Role Cards ──

  var CIRCLE_ROLES = [
    {
      id: 'keeper',
      title: 'Circle Keeper',
      emoji: '\uD83D\uDD2E',
      subtitle: 'The Facilitator',
      description: 'The Circle Keeper holds the space for the group. They guide the process, ensure agreements are honored, and create a container where everyone feels safe to share. The keeper does not control the conversation but gently stewards it.',
      dos: [
        'Prepare the space and materials before the circle begins',
        'Review agreements at the start of every circle',
        'Model vulnerability by sharing authentically',
        'Use a calm and steady voice',
        'Ensure every voice is honored equally'
      ],
      donts: [
        'Do not dominate the conversation or share too much',
        'Do not judge or evaluate what participants say',
        'Do not force anyone to speak who wants to pass',
        'Do not take sides in a conflict',
        'Do not rush the process to finish on time'
      ],
      phrases: [
        'Thank you for sharing that with us.',
        'Let us take a breath before we continue.',
        'Remember, it is okay to pass if you are not ready.',
        'I am going to pass the talking piece to the next person.',
        'What I am hearing is... does that sound right?'
      ]
    },
    {
      id: 'holder',
      title: 'Talking Piece Holder',
      emoji: '\uD83E\uDEB6',
      subtitle: 'The Active Voice',
      description: 'When you hold the talking piece, the circle is yours. You have the right and responsibility to speak your truth. No one will interrupt you, and no one will judge you. This is your moment to be heard.',
      dos: [
        'Speak from the heart using "I" statements',
        'Take your time and do not rush',
        'Be honest and authentic',
        'Speak just enough \u2014 say what matters',
        'Look around the circle if it helps you feel grounded'
      ],
      donts: [
        'Do not use the time to attack or blame others',
        'Do not speak about others\' motivations or thoughts',
        'Do not feel pressured to say the "right" thing',
        'Do not apologize for your feelings',
        'Do not worry about being perfect'
      ],
      phrases: [
        'What I want to share is...',
        'I feel [emotion] because...',
        'Something I have been thinking about is...',
        'I pass \u2014 I am still processing.',
        'Thank you for listening.'
      ]
    },
    {
      id: 'witness',
      title: 'Witness',
      emoji: '\uD83D\uDC41\uFE0F',
      subtitle: 'The Active Listener',
      description: 'As a witness, your role is to listen deeply without planning your response. You hold space for the speaker by giving your full attention. Your presence and silence are powerful gifts to the circle.',
      dos: [
        'Give your full attention to the speaker',
        'Make gentle eye contact if culturally appropriate',
        'Notice your own reactions without acting on them',
        'Stay present in your body and breath',
        'Let the speaker\'s words land before responding'
      ],
      donts: [
        'Do not interrupt or make faces',
        'Do not plan what you will say next while someone speaks',
        'Do not whisper or side-talk with neighbors',
        'Do not look at your phone or other distractions',
        'Do not minimize or dismiss what is shared'
      ],
      phrases: [
        'I hear you.',
        'Thank you for trusting us with that.',
        'That resonates with me.',
        'I want to sit with what you said for a moment.',
        'Your words matter to this circle.'
      ]
    },
    {
      id: 'notetaker',
      title: 'Note Taker',
      emoji: '\uD83D\uDCDD',
      subtitle: 'The Recorder',
      description: 'The note taker captures key points, themes, commitments, and agreements without attributing specific quotes to individuals. Notes serve as a collective memory of the circle while honoring confidentiality.',
      dos: [
        'Write themes and key ideas, not word-for-word quotes',
        'Record commitments and agreements specifically',
        'Capture the energy and tone of the circle',
        'Ask for clarification before writing a commitment',
        'Share notes with the group for approval at the end'
      ],
      donts: [
        'Do not write down who said what',
        'Do not share notes with anyone outside the circle',
        'Do not let note-taking distract from listening',
        'Do not editorialize or add your own opinions to notes',
        'Do not record on a phone or device without permission'
      ],
      phrases: [
        'I want to make sure I captured this correctly...',
        'A theme I am noticing is...',
        'Can you help me word this commitment accurately?',
        'Would the group like me to read back our agreements?',
        'I will keep these notes confidential.'
      ]
    },
    {
      id: 'timekeeper',
      title: 'Timekeeper',
      emoji: '\u23F0',
      subtitle: 'The Pacer',
      description: 'The timekeeper gently monitors the flow and pacing of the circle. They help ensure there is enough time for every phase \u2014 opening, sharing, and closing \u2014 while never rushing someone who needs more space.',
      dos: [
        'Agree on timing with the keeper before the circle starts',
        'Give gentle signals when a section is running long',
        'Be flexible and responsive to the group\'s energy',
        'Protect time for the closing round \u2014 it matters',
        'Use visual cues rather than verbal interruptions'
      ],
      donts: [
        'Do not interrupt someone who is sharing to announce time',
        'Do not make time feel like pressure or urgency',
        'Do not rigidly enforce time if the group needs more space',
        'Do not announce time in a way that breaks the circle\'s mood',
        'Do not skip the closing to save time'
      ],
      phrases: [
        'We have about five minutes left for this section.',
        'Let us make sure we leave time for our closing round.',
        'Take the time you need \u2014 we are here.',
        'We may want to continue this in our next circle.',
        'I want to check with the keeper about our pacing.'
      ]
    }
  ];

  // ── Empathy Mapping data ──

  var EMPATHY_QUADRANTS = [
    { id: 'said', label: 'What they SAID', emoji: '\uD83D\uDCAC', color: '#3b82f6', placeholder: 'Words they spoke, exact phrases, tone of voice...' },
    { id: 'did', label: 'What they DID', emoji: '\uD83C\uDFAC', color: '#22c55e', placeholder: 'Actions they took, body language, reactions...' },
    { id: 'think', label: 'What they THINK', emoji: '\uD83D\uDCA1', color: '#f59e0b', placeholder: 'Their beliefs, assumptions, priorities, worries...' },
    { id: 'feel', label: 'What they FEEL', emoji: '\u2764\uFE0F', color: '#ef4444', placeholder: 'Emotions they might be experiencing underneath...' }
  ];

  // ── Restorative vs Punitive Comparison ──

  var RESTORATIVE_VS_PUNITIVE = {
    principles: [
      { punitive: 'Focuses on rules that were broken', restorative: 'Focuses on harm that was caused and relationships that were damaged' },
      { punitive: 'Asks "Who did it? What rule was broken? What punishment is deserved?"', restorative: 'Asks "Who was harmed? What do they need? Whose obligation is it to meet those needs?"' },
      { punitive: 'Authority figures decide consequences', restorative: 'Those affected participate in deciding how to repair the harm' },
      { punitive: 'Accountability means receiving punishment', restorative: 'Accountability means understanding impact and taking action to repair' },
      { punitive: 'Goal is deterrence through fear of consequences', restorative: 'Goal is healing through understanding and empathy' },
      { punitive: 'Can increase shame, resentment, and disconnection', restorative: 'Builds empathy, responsibility, and stronger relationships' }
    ],
    scenarios: [
      {
        title: 'Student Caught Cheating on a Test',
        emoji: '\uD83D\uDCDD',
        punitive: 'The student receives a zero on the test, a detention, and a note sent home. They feel ashamed and resentful. They learn to be more careful about cheating, not why honesty matters.',
        restorative: 'The student sits in a circle with the teacher and a counselor. They explore the pressure that led to cheating. They redo the test honestly and write a reflection about integrity. They feel understood and commit to asking for help next time.',
        discussion: 'Which approach helps the student learn about integrity? Which addresses the root cause?'
      },
      {
        title: 'Two Students in a Physical Fight',
        emoji: '\uD83E\uDD4A',
        punitive: 'Both students are suspended for three days. They return to school still angry at each other. The underlying conflict is unresolved. Friends take sides and tension spreads.',
        restorative: 'After a cool-down period, both students participate in a restorative conversation. Each shares what led to the fight. They identify the root conflict, hear each other\'s pain, and create an agreement for moving forward. The community supports the repair.',
        discussion: 'Which approach resolves the underlying conflict? Which prevents future incidents?'
      },
      {
        title: 'Student Disrupts Class Repeatedly',
        emoji: '\uD83D\uDCE2',
        punitive: 'The student is sent to the office, given detentions, and eventually placed on a behavior plan with escalating consequences. The behavior may stop briefly but returns because the root cause is unaddressed.',
        restorative: 'The teacher has a private restorative conversation with the student to understand what is driving the behavior. They discover the student is struggling at home. Together they create a plan that includes support, check-ins, and alternative ways to get needs met.',
        discussion: 'Which approach treats the symptom versus the cause? Which builds a stronger relationship?'
      },
      {
        title: 'Cyberbullying Incident',
        emoji: '\uD83D\uDCF1',
        punitive: 'The bully is suspended from school and banned from devices during school. The targeted student still feels unsafe because the underlying social dynamic has not changed. The bully feels angry and blamed.',
        restorative: 'The bully hears directly from the person they harmed about the real impact. Bystanders reflect on their role. The group creates a safety plan together. The bully commits to specific actions of repair and ongoing accountability. The targeted student has voice in the process.',
        discussion: 'Which approach centers the voice of the person harmed? Which creates lasting change?'
      },
      {
        title: 'Vandalism of School Property',
        emoji: '\uD83C\uDFEB',
        punitive: 'The student pays for damages, serves in-school suspension, and loses privileges. They comply but feel no connection to the school or understanding of community impact.',
        restorative: 'The student meets with the custodians, teachers, and students affected. They hear how the vandalism impacted everyone. They help repair the damage, contribute to a beautification project, and present to younger students about respecting shared spaces.',
        discussion: 'Which approach connects the student to their community? Which teaches responsibility versus compliance?'
      },
      {
        title: 'Exclusion and Social Cruelty',
        emoji: '\uD83D\uDE14',
        punitive: 'Adults tell the excluding students to "be nice" and include the other student. This forced inclusion feels fake. The excluded student feels more humiliated. The dynamics continue underground.',
        restorative: 'A series of circles explore what inclusion and belonging mean. The excluded student shares their experience. The group examines their behavior patterns honestly. They create genuine agreements about how to treat each other, and follow up in future circles.',
        discussion: 'Which approach creates authentic change in relationships? Which respects everyone\'s dignity?'
      }
    ]
  };

  // ── Registration ──

  window.SelHub.registerTool('restorativeCircle', {
    icon: '\uD83E\uDEB6',
    label: 'Restorative Circle',
    desc: 'Facilitate restorative and community-building circles. Explore talking pieces, Indigenous roots, and the power of sitting in circle.',
    color: 'amber',
    category: 'relationship-skills',

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['restorativeCircle']) || {};
      var upd = function(key, val) { ctx.update('restorativeCircle', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('restorativeCircle', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var X = ctx.icons.X;
      var Sparkles = ctx.icons.Sparkles;
      var Heart = ctx.icons.Heart;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';
      var theme = ctx.theme || {};

      var tab = d.tab || 'home';
      var selectedCircleType = d.circleType || null;
      var selectedPiece = d.talkingPiece || null;
      var currentPromptIdx = d.promptIdx || 0;
      var isCircleActive = d.circleActive || false;
      var reflections = d.reflections || [];
      var aiResponse = d.aiResponse || null;
      var aiLoading = d.aiLoading || false;

      // ── Badge progress tracking ──
      var badgeProgress = d.badgeProgress || {};
      var earnedBadges = d.earnedBadges || {};

      var incrementBadgeStat = function(key, amount) {
        var bp = Object.assign({}, badgeProgress);
        bp[key] = (bp[key] || 0) + (amount || 1);
        upd('badgeProgress', bp);
        // Check if any badge is newly earned
        var eb = Object.assign({}, earnedBadges);
        var newBadge = null;
        BADGES.forEach(function(b) {
          if (!eb[b.id] && b.id !== 'peace_circle_leader' && (bp[b.key] || 0) >= b.threshold) {
            eb[b.id] = true;
            newBadge = b;
          }
        });
        // Update totalBadgesEarned for the meta-badge
        var earnedCount = 0;
        Object.keys(eb).forEach(function(k) { if (eb[k] && k !== 'peace_circle_leader') earnedCount++; });
        bp.totalBadgesEarned = earnedCount;
        // Check the meta-badge
        if (!eb.peace_circle_leader && earnedCount >= 5) {
          eb.peace_circle_leader = true;
          if (!newBadge) {
            newBadge = null;
            for (var bi = 0; bi < BADGES.length; bi++) { if (BADGES[bi].id === 'peace_circle_leader') { newBadge = BADGES[bi]; break; } }
          }
        }
        if (newBadge) {
          upd('earnedBadges', eb);
          addToast('Badge earned: ' + newBadge.emoji + ' ' + newBadge.name + '!', 'success');
          ctx.awardXP(20);
          if (ctx.celebrate) ctx.celebrate();
        }
      };

      // ── Get grade-appropriate prompts ──
      var getPrompts = function(circleType) {
        var bank = CIRCLE_PROMPTS[circleType] || CIRCLE_PROMPTS['community'];
        if (gradeBand === 'high') return bank.high || bank.middle;
        if (gradeBand === 'middle') return bank.middle || bank.elementary;
        return bank.elementary;
      };

      // ── AI circle facilitator ──
      var askCircleFacilitator = function(question) {
        if (!callGemini) return;
        upd('aiLoading', true);
        var prompt = 'You are a warm, experienced circle facilitator helping a ' + (gradeLevel || '5th grade') + ' group. ' +
          'The circle type is: ' + (selectedCircleType || 'community building') + '. ' +
          'A participant asks: "' + question + '"\n\n' +
          'Respond with empathy and practical guidance. Keep it brief (2-3 sentences). ' +
          'If the question is about a conflict, center healing and accountability over punishment.';
        callGemini(prompt).then(function(resp) {
          updMulti({ aiResponse: resp, aiLoading: false });
        }).catch(function() {
          updMulti({ aiResponse: 'I\'m here to help. Let\'s take a breath and try again.', aiLoading: false });
        });
      };

      // ── Generate custom prompts with AI ──
      var generateCustomPrompts = function() {
        if (!callGemini) return;
        upd('aiLoading', true);
        var found = null;
        for (var ci = 0; ci < CIRCLE_TYPES.length; ci++) {
          if (CIRCLE_TYPES[ci].id === selectedCircleType) { found = CIRCLE_TYPES[ci]; break; }
        }
        var circleLabel = found ? found.label : 'community building';
        var prompt = 'Generate 5 circle process discussion prompts for a ' + (gradeLevel || '5th grade') + ' group doing a ' + circleLabel + ' circle. ' +
          'The prompts should be open-ended, invite vulnerability and honesty, and be age-appropriate. ' +
          'Return ONLY a JSON array of strings: ["prompt 1", "prompt 2", ...]';
        callGemini(prompt, true).then(function(resp) {
          try {
            var cleaned = resp.trim();
            if (cleaned.indexOf('```') !== -1) {
              cleaned = cleaned.split('```')[1] || cleaned;
              if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n');
            }
            var prompts = JSON.parse(cleaned);
            if (Array.isArray(prompts)) {
              updMulti({ customPrompts: prompts, aiLoading: false });
              addToast('Custom prompts generated!', 'success');
            }
          } catch(e) {
            upd('aiLoading', false);
          }
        }).catch(function() { upd('aiLoading', false); });
      };

      var prompts = d.customPrompts || getPrompts(selectedCircleType);

      // ── Harm Repair helpers ──
      var harmStep = d.harmStep || 0;
      var harmResponses = d.harmResponses || {};

      // ── Scenario helpers ──
      var scenarioIdx = d.scenarioIdx || 0;
      var scenarioChoice = d.scenarioChoice;
      var scenarioOutcome = d.scenarioOutcome || null;

      // ── Agreement builder helpers ──
      var agreements = d.communityAgreements || [];
      var customAgreement = d.customAgreement || '';

      // ── Scripts tab helpers ──
      var scriptSection = d.scriptSection || 'opening';
      var activeScriptIdx = d.activeScriptIdx;

      // ═══════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════

      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),

        // ── Header ──
        h('div', { className: 'flex items-center justify-between' },
          h('div', { className: 'flex items-center gap-3' },
            h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-amber-100 text-amber-800 transition-colors' }, ctx.a11yClick(function() { ctx.setSelHubTool(null); })),
              h(ArrowLeft, { size: 20 })
            ),
            h('div', null,
              h('h2', { className: 'text-xl font-black text-slate-800' }, '\uD83E\uDEB6 Restorative Circle'),
              h('p', { className: 'text-xs text-slate-600' }, 'Community building, repair, and the wisdom of sitting in circle')
            )
          )
        ),

        // ── Tab Navigation ──
        h('div', { role: 'tablist', 'aria-label': 'Restorative Circle tabs', className: 'flex flex-wrap gap-1 bg-amber-50 rounded-xl p-1 border border-amber-200' },
          ['home', 'circle', 'scripts', 'harm-repair', 'scenarios', 'agreements', 'talking-piece', 'roots', 'questions', 'roles', 'empathy-map', 'compare', 'badges'].map(function(t) {
            var labels = {
              'home': '\uD83C\uDFE0 Types',
              'circle': '\u2B55 Circle',
              'scripts': '\uD83D\uDCDC Scripts',
              'harm-repair': '\uD83E\uDE79 Repair',
              'scenarios': '\uD83C\uDFAD Scenarios',
              'agreements': '\uD83E\uDD1D Agreements',
              'talking-piece': '\uD83E\uDEB6 Piece',
              'roots': '\uD83C\uDF0D Roots',
              'questions': '\u2753 Questions',
              'roles': '\uD83D\uDE4B Role Cards',
              'empathy-map': '\uD83E\uDDE0 Empathy',
              'compare': '\u2696\uFE0F Compare',
              'badges': '\uD83C\uDFC5 Badges',
            };
            return h('button', { 'aria-label': 'Choose the type of circle you want to facilitate today.',
              key: t,
              role: 'tab', 'aria-selected': tab === t,
              onClick: function() { upd('tab', t); },
              className: 'flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all min-w-[70px] focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ' +
                (tab === t ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600/60 hover:text-amber-700')
            }, labels[t]);
          })
        ),

        // ═══ HOME — Circle Types ═══
        tab === 'home' && h('div', { className: 'space-y-3' },
          h('p', { className: 'text-sm text-slate-600 text-center' }, 'Choose the type of circle you want to facilitate today.'),

          // Circle type cards
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            CIRCLE_TYPES.map(function(ct) {
              return h('button', { 'aria-label': ct.emoji,
                key: ct.id,
                onClick: function() { updMulti({ circleType: ct.id, tab: 'circle', promptIdx: 0, circleActive: true, customPrompts: null }); ctx.awardXP(5); },
                className: 'p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] hover:shadow-md ' +
                  (selectedCircleType === ct.id ? 'border-amber-400 bg-amber-50 shadow-md' : 'border-slate-200 bg-white hover:border-amber-300')
              },
                h('div', { className: 'text-2xl mb-2' }, ct.emoji),
                h('div', { className: 'font-bold text-sm text-slate-800' }, ct.label),
                h('p', { className: 'text-xs text-slate-600 mt-1 leading-relaxed' }, ct.desc)
              );
            })
          ),

          // Circle Agreements
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-4 mt-4' },
            h('h3', { className: 'text-sm font-bold text-amber-700 mb-3 flex items-center gap-2' }, '\uD83D\uDCDC Circle Agreements'),
            h('div', { className: 'space-y-2' },
              CIRCLE_AGREEMENTS.map(function(a, i) {
                return h('div', { key: i, className: 'flex items-center gap-2 text-xs text-slate-700' },
                  h('span', { className: 'text-base' }, a.icon),
                  h('span', null, a.text)
                );
              })
            )
          )
        ),

        // ═══ ACTIVE CIRCLE ═══
        tab === 'circle' && selectedCircleType && h('div', { className: 'space-y-4' },

          // Circle type badge
          h('div', { className: 'text-center' },
            (function() {
              var found = null;
              for (var fi = 0; fi < CIRCLE_TYPES.length; fi++) {
                if (CIRCLE_TYPES[fi].id === selectedCircleType) { found = CIRCLE_TYPES[fi]; break; }
              }
              var ct = found || {};
              return h('span', { className: 'inline-block px-4 py-1.5 rounded-full text-xs font-bold text-white', style: { background: ct.color || '#eab308' } },
                ct.emoji + ' ' + ct.label + ' Circle'
              );
            })()
          ),

          // Talking piece reminder
          selectedPiece && (function() {
            var found = null;
            for (var pi = 0; pi < TALKING_PIECES.length; pi++) {
              if (TALKING_PIECES[pi].id === selectedPiece) { found = TALKING_PIECES[pi]; break; }
            }
            var p = found || {};
            return h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 text-center' },
              h('p', { className: 'text-xs text-amber-700' },
                'Talking piece: ', h('strong', null, p.emoji + ' ' + p.name),
                ' \u2014 Only the holder speaks.'
              )
            );
          })(),

          // Current prompt
          h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-6 text-center shadow-lg' },
            h('div', { className: 'text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2' }, 'Round ' + (currentPromptIdx + 1) + ' of ' + prompts.length),
            h('p', { className: 'text-lg font-bold text-slate-800 leading-relaxed' }, prompts[currentPromptIdx] || 'Circle complete \u2014 thank you for sharing.'),

            // Navigation
            h('div', { className: 'flex gap-2 justify-center mt-4' },
              h('button', { 'aria-label': 'Previous',
                onClick: function() { upd('promptIdx', Math.max(0, currentPromptIdx - 1)); },
                disabled: currentPromptIdx === 0,
                className: 'px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors'
              }, '\u2190 Previous'),
              h('button', { 'aria-label': currentPromptIdx < prompts.length - 1 ? 'Next Round \u2192' : '\u2705 Close Circle',
                onClick: function() {
                  if (currentPromptIdx < prompts.length - 1) {
                    upd('promptIdx', currentPromptIdx + 1);
                  } else {
                    updMulti({ circleActive: false, tab: 'home' });
                    addToast('Circle complete \u2014 well done! \uD83E\uDEB6', 'success');
                    ctx.awardXP(15);
                    if (ctx.celebrate) ctx.celebrate();
                    incrementBadgeStat('circlesCompleted', 1);
                  }
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-700 transition-colors'
              }, currentPromptIdx < prompts.length - 1 ? 'Next Round \u2192' : '\u2705 Close Circle')
            ),

            // Speak prompt aloud
            callTTS && h('button', { 'aria-label': 'Read Aloud',
              onClick: function() { callTTS(prompts[currentPromptIdx] || ''); },
              className: 'mt-3 text-[10px] text-amber-500 hover:text-amber-700 font-bold'
            }, '\uD83D\uDD0A Read Aloud')
          ),

          // Reflection journal
          h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-4' },
            h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\uD83D\uDCDD Your Reflection (private)'),
            h('textarea', {
              value: d.currentReflection || '',
              onChange: function(e) { upd('currentReflection', e.target.value); },
              placeholder: 'What came up for you during this round? What did you notice?',
              className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-amber-300',
              'aria-label': 'Circle reflection'
            }),
            d.currentReflection && h('button', { 'aria-label': 'Save Reflection',
              onClick: function() {
                var newReflections = reflections.concat([{ text: d.currentReflection, prompt: prompts[currentPromptIdx], time: new Date().toLocaleTimeString() }]);
                updMulti({ reflections: newReflections, currentReflection: '' });
                addToast('Reflection saved', 'success');
                incrementBadgeStat('reflectionsWritten', 1);
              },
              className: 'mt-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors'
            }, 'Save Reflection')
          ),

          // Generate custom prompts
          h('button', { 'aria-label': 'Circle Scripts',
            onClick: generateCustomPrompts,
            disabled: aiLoading,
            className: 'w-full px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2'
          }, h(Sparkles, { size: 14 }), aiLoading ? 'Generating...' : '\u2728 Generate Custom Prompts with AI')
        ),

        // ═══ CIRCLE SCRIPTS ═══
        tab === 'scripts' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83D\uDCDC Circle Scripts'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed max-w-lg mx-auto' },
              'Pre-written scripts to guide each phase of your circle. Select a section below, then choose a script to follow.'
            )
          ),

          // Script section selector
          h('div', { className: 'flex gap-1 bg-slate-100 rounded-xl p-1' },
            ['opening', 'checkIn', 'discussion', 'closing'].map(function(sec) {
              var secLabels = { opening: '\uD83C\uDF1F Opening', checkIn: '\u2600\uFE0F Check-In', discussion: '\uD83D\uDCAC Discussion', closing: '\uD83C\uDF19 Closing' };
              return h('button', { 'aria-label': 'Grade band: discussion prompts available',
                key: sec,
                onClick: function() { updMulti({ scriptSection: sec, activeScriptIdx: undefined }); },
                className: 'flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all ' +
                  (scriptSection === sec ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-amber-600')
              }, secLabels[sec]);
            })
          ),

          // Script content based on section
          (function() {
            var sectionData = CIRCLE_SCRIPTS[scriptSection];
            if (!sectionData) return null;
            var bandData = sectionData[gradeBand] || sectionData.elementary;
            if (!bandData) return null;

            // Discussion section is an array of strings
            if (scriptSection === 'discussion') {
              return h('div', { className: 'space-y-2' },
                h('p', { className: 'text-xs text-slate-600 italic' }, 'Grade band: ' + gradeBand + ' \u2014 ' + bandData.length + ' discussion prompts available'),
                bandData.map(function(prompt, i) {
                  return h('div', { key: i, className: 'bg-white rounded-xl border border-amber-200 p-3 flex items-start gap-3' },
                    h('span', { className: 'text-amber-500 font-bold text-sm mt-0.5 shrink-0' }, (i + 1) + '.'),
                    h('p', { className: 'text-sm text-slate-700 leading-relaxed flex-1' }, prompt),
                    callTTS && h('button', { 'aria-label': 'Mark Discussion Prompts as Used',
                      onClick: function() { callTTS(prompt); },
                      className: 'text-[10px] text-amber-400 hover:text-amber-600 shrink-0'
                    }, '\uD83D\uDD0A')
                  );
                }),
                h('button', { 'aria-label': 'Mark Discussion Prompts as Used',
                  onClick: function() { incrementBadgeStat('scriptsUsed', 1); addToast('Discussion prompts reviewed!', 'success'); ctx.awardXP(5); },
                  className: 'w-full px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors mt-2'
                }, '\u2705 Mark Discussion Prompts as Used')
              );
            }

            // Opening, CheckIn, Closing sections are arrays of { title, desc }
            return h('div', { className: 'space-y-3' },
              h('p', { className: 'text-xs text-slate-600 italic' }, 'Grade band: ' + gradeBand + ' \u2014 ' + bandData.length + ' scripts available'),
              bandData.map(function(script, i) {
                var isActive = activeScriptIdx === i;
                return h('div', { key: i, className: 'bg-white rounded-xl border-2 transition-all ' + (isActive ? 'border-amber-400 shadow-md' : 'border-slate-200 hover:border-amber-300') },
                  h('button', { 'aria-label': script.title,
                    onClick: function() { upd('activeScriptIdx', isActive ? undefined : i); },
                    className: 'w-full text-left p-4'
                  },
                    h('div', { className: 'flex items-center justify-between' },
                      h('div', { className: 'font-bold text-sm text-slate-800' }, script.title),
                      h('span', { className: 'text-xs text-amber-500' }, isActive ? '\u25B2 Collapse' : '\u25BC Expand')
                    )
                  ),
                  isActive && h('div', { className: 'px-4 pb-4 space-y-3' },
                    h('div', { className: 'bg-amber-50 rounded-lg p-4 border border-amber-100' },
                      h('p', { className: 'text-sm text-slate-700 leading-relaxed italic' }, '"' + script.desc + '"')
                    ),
                    h('div', { className: 'flex gap-2' },
                      callTTS && h('button', { 'aria-label': 'Read Aloud',
                        onClick: function() { callTTS(script.desc); },
                        className: 'px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors'
                      }, '\uD83D\uDD0A Read Aloud'),
                      h('button', { 'aria-label': 'Mark as Used',
                        onClick: function() {
                          incrementBadgeStat('scriptsUsed', 1);
                          addToast('Script "' + script.title + '" marked as used!', 'success');
                          ctx.awardXP(5);
                        },
                        className: 'px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors'
                      }, '\u2705 Mark as Used')
                    )
                  )
                );
              })
            );
          })()
        ),

        // ═══ HARM REPAIR PROCESS ═══
        tab === 'harm-repair' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83E\uDE79 Harm Repair Process'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed max-w-lg mx-auto' },
              'A guided step-by-step restorative conversation for when harm has occurred. Each step builds understanding and leads to a repair agreement.'
            )
          ),

          // Progress indicator
          h('div', { className: 'flex items-center gap-1 justify-center' },
            HARM_REPAIR_STEPS.map(function(step, i) {
              var isComplete = i < harmStep;
              var isCurrent = i === harmStep;
              return h('div', { key: i, className: 'flex items-center' },
                h('div', {
                  className: 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ' +
                    (isComplete ? 'bg-emerald-700 text-white' : isCurrent ? 'bg-amber-700 text-white ring-2 ring-amber-300' : 'bg-slate-200 text-slate-300')
                }, isComplete ? '\u2713' : (i + 1)),
                i < HARM_REPAIR_STEPS.length - 1 && h('div', { className: 'w-4 h-0.5 ' + (isComplete ? 'bg-emerald-400' : 'bg-slate-200') })
              );
            })
          ),

          // Current step
          (function() {
            var step = HARM_REPAIR_STEPS[harmStep];
            if (!step) return null;
            var guidance = step.guidance[gradeBand] || step.guidance.elementary;
            var placeholder = step.placeholder[gradeBand] || step.placeholder.elementary;

            return h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-6 shadow-lg' },
              h('div', { className: 'text-center mb-4' },
                h('span', { className: 'text-3xl' }, step.icon),
                h('h4', { className: 'text-lg font-bold text-slate-800 mt-2' }, 'Step ' + (harmStep + 1) + ': ' + step.title),
                h('p', { className: 'text-xs text-amber-600 font-medium' }, step.subtitle)
              ),
              h('div', { className: 'bg-amber-50 rounded-lg p-3 mb-4 border border-amber-100' },
                h('p', { className: 'text-sm text-amber-800 leading-relaxed' }, guidance)
              ),
              h('textarea', {
                value: harmResponses[step.id] || '',
                onChange: function(e) {
                  var newResponses = Object.assign({}, harmResponses);
                  newResponses[step.id] = e.target.value;
                  upd('harmResponses', newResponses);
                },
                placeholder: placeholder,
                className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-28 outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': step.title + ' response'
              }),
              callTTS && h('button', { 'aria-label': 'Read Guidance Aloud',
                onClick: function() { callTTS(guidance); },
                className: 'mt-2 text-[10px] text-amber-500 hover:text-amber-700 font-bold'
              }, '\uD83D\uDD0A Read Guidance Aloud'),

              // Navigation
              h('div', { className: 'flex gap-2 justify-center mt-4' },
                h('button', { 'aria-label': 'Previous Step',
                  onClick: function() { upd('harmStep', Math.max(0, harmStep - 1)); },
                  disabled: harmStep === 0,
                  className: 'px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors'
                }, '\u2190 Previous Step'),
                h('button', { 'aria-label': harmStep < HARM_REPAIR_STEPS.length - 1 ? 'Next Step \u2192' : '\u2705 Complete Repair Process',
                  onClick: function() {
                    if (harmStep < HARM_REPAIR_STEPS.length - 1) {
                      upd('harmStep', harmStep + 1);
                      ctx.awardXP(5);
                    } else {
                      addToast('Harm repair process complete \u2014 thank you for this brave work. \uD83E\uDE79', 'success');
                      ctx.awardXP(25);
                      if (ctx.celebrate) ctx.celebrate();
                      incrementBadgeStat('harmRepairsCompleted', 1);
                    }
                  },
                  className: 'px-4 py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-700 transition-colors'
                }, harmStep < HARM_REPAIR_STEPS.length - 1 ? 'Next Step \u2192' : '\u2705 Complete Repair Process')
              )
            );
          })(),

          // Summary of responses so far
          harmStep > 0 && h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-4' },
            h('h4', { className: 'text-xs font-bold text-slate-600 mb-2 uppercase tracking-widest' }, 'Previous Steps'),
            h('div', { className: 'space-y-2' },
              HARM_REPAIR_STEPS.slice(0, harmStep).map(function(step, i) {
                var response = harmResponses[step.id];
                return h('div', { key: i, className: 'bg-white rounded-lg p-3 border border-slate-100' },
                  h('div', { className: 'text-[10px] font-bold text-amber-600' }, step.icon + ' Step ' + (i + 1) + ': ' + step.title),
                  response ? h('p', { className: 'text-xs text-slate-600 mt-1 leading-relaxed' }, response) : h('p', { className: 'text-xs text-slate-600 italic mt-1' }, '(No response recorded)')
                );
              })
            )
          )
        ),

        // ═══ SCENARIOS ═══
        tab === 'scenarios' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDFAD Restorative Scenarios'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed max-w-lg mx-auto' },
              'Practice restorative thinking with realistic scenarios. Read the situation, choose a response, and see how the restorative approach unfolds.'
            )
          ),

          (function() {
            var scenarios = RJ_SCENARIOS[gradeBand] || RJ_SCENARIOS.elementary;
            var scenario = scenarios[scenarioIdx];
            if (!scenario) return null;

            return h('div', { className: 'space-y-4' },
              // Scenario selector
              h('div', { className: 'flex gap-1 overflow-x-auto pb-1' },
                scenarios.map(function(sc, i) {
                  return h('button', { 'aria-label': sc.emoji + ' ' + sc.title,
                    key: i,
                    onClick: function() { updMulti({ scenarioIdx: i, scenarioChoice: undefined, scenarioOutcome: null }); },
                    className: 'px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ' +
                      (scenarioIdx === i ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-100')
                  }, sc.emoji + ' ' + sc.title);
                })
              ),

              // Scenario card
              h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-6 shadow-lg' },
                h('div', { className: 'text-center mb-4' },
                  h('span', { className: 'text-3xl' }, scenario.emoji),
                  h('h4', { className: 'text-lg font-bold text-slate-800 mt-2' }, scenario.title)
                ),
                h('div', { className: 'bg-amber-50 rounded-lg p-4 mb-4 border border-amber-100' },
                  h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, scenario.setup)
                ),

                // Choices
                !scenarioOutcome && h('div', { className: 'space-y-2' },
                  h('p', { className: 'text-xs font-bold text-slate-600 mb-1' }, 'What would you do?'),
                  scenario.choices.map(function(choice, i) {
                    return h('button', { 'aria-label': choice.text,
                      key: i,
                      onClick: function() {
                        updMulti({ scenarioChoice: i, scenarioOutcome: choice.next });
                        ctx.awardXP(10);
                        incrementBadgeStat('scenariosCompleted', 1);
                      },
                      className: 'w-full text-left p-3 rounded-xl border-2 transition-all hover:border-amber-400 hover:bg-amber-50 ' +
                        (scenarioChoice === i ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white')
                    },
                      h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, choice.text)
                    );
                  })
                ),

                // Outcome
                scenarioOutcome && h('div', { className: 'space-y-3' },
                  h('div', { className: 'bg-emerald-50 rounded-lg p-4 border border-emerald-200' },
                    h('h5', { className: 'text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2' }, '\u2728 What Happens Next'),
                    h('p', { className: 'text-sm text-emerald-800 leading-relaxed' }, scenarioOutcome)
                  ),
                  h('div', { className: 'flex gap-2 justify-center' },
                    scenarioIdx < scenarios.length - 1 && h('button', { 'aria-label': 'Next Scenario',
                      onClick: function() { updMulti({ scenarioIdx: scenarioIdx + 1, scenarioChoice: undefined, scenarioOutcome: null }); },
                      className: 'px-4 py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-700 transition-colors'
                    }, 'Next Scenario \u2192'),
                    h('button', { 'aria-label': 'Try a Different Choice',
                      onClick: function() { updMulti({ scenarioChoice: undefined, scenarioOutcome: null }); },
                      className: 'px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors'
                    }, 'Try a Different Choice')
                  )
                )
              ),

              // Reflection
              h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-4' },
                h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\uD83D\uDCAC What restorative approach would you use in real life?'),
                h('textarea', {
                  value: d.scenarioReflection || '',
                  onChange: function(e) { upd('scenarioReflection', e.target.value); },
                  placeholder: 'Think about a real situation where a restorative approach could help...',
                  className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-amber-300',
                  'aria-label': 'Scenario reflection'
                })
              )
            );
          })()
        ),

        // ═══ COMMUNITY AGREEMENTS BUILDER ═══
        tab === 'agreements' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83E\uDD1D Community Agreements Builder'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed max-w-lg mx-auto' },
              'Build your class or group agreements together. Select from suggestions or write your own. These become the foundation of your restorative community.'
            )
          ),

          // Suggestions to select
          h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-4' },
            h('h4', { className: 'text-xs font-bold text-amber-700 mb-3 uppercase tracking-widest' }, '\uD83D\uDCA1 Suggested Agreements (tap to add)'),
            h('div', { className: 'flex flex-wrap gap-2' },
              (AGREEMENT_SUGGESTIONS[gradeBand] || AGREEMENT_SUGGESTIONS.elementary).map(function(sug, i) {
                var isAdded = agreements.indexOf(sug) !== -1;
                return h('button', { 'aria-label': 'Next',
                  key: i,
                  onClick: function() {
                    if (!isAdded) {
                      var newAg = agreements.concat([sug]);
                      upd('communityAgreements', newAg);
                      addToast('Agreement added!', 'success');
                    }
                  },
                  disabled: isAdded,
                  className: 'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ' +
                    (isAdded ? 'bg-emerald-100 text-emerald-600 cursor-default' : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-400 hover:bg-amber-50')
                }, (isAdded ? '\u2713 ' : '+ ') + sug);
              })
            )
          ),

          // Custom agreement input
          h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
            h('h4', { className: 'text-xs font-bold text-slate-600 mb-2' }, '\u270D\uFE0F Write Your Own Agreement'),
            h('div', { className: 'flex gap-2' },
              h('input', {
                type: 'text',
                value: customAgreement,
                onChange: function(e) { upd('customAgreement', e.target.value); },
                placeholder: 'Type a custom agreement...',
                className: 'flex-1 text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Custom agreement input',
                onKeyDown: function(e) {
                  if (e.key === 'Enter' && customAgreement.trim()) {
                    var newAg = agreements.concat([customAgreement.trim()]);
                    updMulti({ communityAgreements: newAg, customAgreement: '' });
                    addToast('Custom agreement added!', 'success');
                  }
                }
              }),
              h('button', { 'aria-label': '+ Add',
                onClick: function() {
                  if (customAgreement.trim()) {
                    var newAg = agreements.concat([customAgreement.trim()]);
                    updMulti({ communityAgreements: newAg, customAgreement: '' });
                    addToast('Custom agreement added!', 'success');
                  }
                },
                disabled: !customAgreement.trim(),
                className: 'px-4 py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-700 disabled:opacity-30 transition-colors'
              }, '+ Add')
            )
          ),

          // Current agreements list
          agreements.length > 0 && h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border-2 border-amber-200 p-5' },
            h('h4', { className: 'text-sm font-bold text-amber-700 mb-3 flex items-center gap-2' }, '\uD83D\uDCDC Our Community Agreements (' + agreements.length + ')'),
            h('div', { className: 'space-y-2' },
              agreements.map(function(ag, i) {
                return h('div', { key: i, className: 'flex items-center gap-2 bg-white rounded-lg p-2 border border-amber-100' },
                  h('span', { className: 'text-amber-500 font-bold text-sm shrink-0' }, (i + 1) + '.'),
                  h('span', { className: 'text-sm text-slate-700 flex-1' }, ag),
                  h('button', {
                    onClick: function() {
                      var newAg = agreements.filter(function(_, idx) { return idx !== i; });
                      upd('communityAgreements', newAg);
                    },
                    className: 'text-[10px] text-red-400 hover:text-red-600 font-bold shrink-0',
                    'aria-label': 'Remove agreement'
                  }, '\u2715')
                );
              })
            ),

            // Export / complete
            h('div', { className: 'flex gap-2 mt-4' },
              h('button', { 'aria-label': 'Copy to Clipboard',
                onClick: function() {
                  var text = 'Our Community Agreements\n' + '='.repeat(30) + '\n\n';
                  agreements.forEach(function(ag, i) { text += (i + 1) + '. ' + ag + '\n'; });
                  text += '\nCreated: ' + new Date().toLocaleDateString() + '\n';
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text);
                    addToast('Agreements copied to clipboard!', 'success');
                  } else {
                    addToast('Copy not supported in this browser', 'info');
                  }
                },
                className: 'flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors'
              }, '\uD83D\uDCCB Copy to Clipboard'),
              agreements.length >= 5 && h('button', { 'aria-label': 'Finalize Agreements',
                onClick: function() {
                  addToast('Agreements finalized! Your community is ready. \uD83E\uDD1D', 'success');
                  ctx.awardXP(15);
                  if (ctx.celebrate) ctx.celebrate();
                  incrementBadgeStat('agreementsMade', 1);
                },
                className: 'flex-1 px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors'
              }, '\u2705 Finalize Agreements')
            )
          ),

          agreements.length === 0 && h('div', { className: 'text-center py-8 text-slate-400' },
            h('p', { className: 'text-sm' }, 'No agreements yet. Select from suggestions above or write your own to get started!')
          )
        ),

        // ═══ TALKING PIECE ═══
        tab === 'talking-piece' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83E\uDEB6 The Talking Piece'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed max-w-lg mx-auto' },
              'The talking piece is a sacred object passed around the circle. Only the person holding it may speak. This practice teaches us that listening is just as powerful as speaking.'
            )
          ),

          // Talking piece cards
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            TALKING_PIECES.map(function(piece) {
              var isSelected = selectedPiece === piece.id;
              return h('div', {                 key: piece.id,
                className: 'rounded-2xl border-2 p-4 transition-all cursor-pointer hover:shadow-md ' +
                  (isSelected ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200' : 'border-slate-200 bg-white hover:border-amber-300'),
                onClick: function() { upd('talkingPiece', piece.id); ctx.awardXP(3); }
              },
                h('div', { className: 'flex items-center gap-3 mb-2' },
                  h('span', { className: 'text-3xl' }, piece.emoji),
                  h('div', null,
                    h('div', { className: 'font-bold text-sm text-slate-800' }, piece.name),
                    h('div', { className: 'text-[10px] text-amber-600 font-medium' }, piece.origin)
                  )
                ),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, piece.significance),
                isSelected && h('div', { className: 'mt-2 text-[10px] font-bold text-amber-600 flex items-center gap-1' }, '\u2713 Selected as your talking piece')
              );
            })
          ),

          // Reflection question
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 text-center' },
            h('p', { className: 'text-sm text-amber-800 italic leading-relaxed' },
              '"What object would you choose as your own talking piece? What would it represent about how you want to show up in the world?"'
            )
          )
        ),

        // ═══ INDIGENOUS ROOTS ═══
        tab === 'roots' && h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-6' },
            h('h3', { className: 'text-lg font-black text-amber-900 mb-4 flex items-center gap-2' }, '\uD83C\uDF0D ', INDIGENOUS_ROOTS.title),

            h('div', { className: 'space-y-4' },
              INDIGENOUS_ROOTS.paragraphs.map(function(para, i) {
                return h('p', { key: i, className: 'text-sm text-slate-700 leading-relaxed' }, para);
              })
            ),

            h('div', { className: 'mt-6 bg-white rounded-xl border border-amber-200 p-4' },
              h('h4', { className: 'text-xs font-bold text-amber-600 uppercase tracking-widest mb-2' }, '\uD83D\uDCAD Reflection'),
              h('p', { className: 'text-sm text-amber-800 italic mb-3' }, INDIGENOUS_ROOTS.reflection),
              h('textarea', {
                value: d.rootsReflection || '',
                onChange: function(e) { upd('rootsReflection', e.target.value); },
                placeholder: 'Write your reflection here...',
                className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Indigenous roots reflection'
              })
            ),

            // Key terms
            h('div', { className: 'mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3' },
              [
                { term: 'Peacemaking (Din\u00e9/Navajo)', desc: 'A holistic process focused on restoring harmony (h\u00f3zh\u00f3) \u2014 balance in relationships, community, and the natural world.' },
                { term: 'Hui (M\u0101ori)', desc: 'A gathering on the marae (meeting ground) where issues are discussed collectively, with protocols for speaking and listening.' },
                { term: 'Haudenosaunee Consensus', desc: 'Decision-making in the Iroquois Confederacy required consensus among all nations \u2014 a model that influenced democratic governance worldwide.' },
                { term: 'Ubuntu (Southern Africa)', desc: '"I am because we are." A philosophy that emphasizes interconnectedness \u2014 harm to one is harm to all, healing for one is healing for all.' },
              ].map(function(item, i) {
                return h('div', { key: i, className: 'bg-white rounded-xl border border-amber-200 p-3' },
                  h('div', { className: 'font-bold text-xs text-amber-800 mb-1' }, item.term),
                  h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, item.desc)
                );
              })
            )
          ),

          // Land acknowledgment prompt
          h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center' },
            h('p', { className: 'text-xs text-emerald-700 leading-relaxed' },
              '\uD83C\uDF31 Consider beginning your circle with a land acknowledgment \u2014 recognizing the Indigenous peoples whose traditional territory you are on. ',
              h('a', { href: 'https://native-land.ca/', target: '_blank', rel: 'noopener noreferrer', className: 'underline font-bold hover:text-emerald-900' }, 'native-land.ca'),
              ' can help you learn whose land you are on.'
            )
          ),

          h('button', { 'aria-label': 'I have read and reflected on these roots',
            onClick: function() {
              ctx.awardXP(10);
              addToast('Thank you for learning about these roots \uD83C\uDF0D', 'success');
              incrementBadgeStat('rootsStudied', 1);
            },
            className: 'w-full px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors'
          }, '\u2705 I have read and reflected on these roots')
        ),

        // ═══ RESTORATIVE QUESTIONS BANK ═══
        tab === 'questions' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\u2753 Restorative Questions Bank'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed max-w-lg mx-auto' },
              'Deep conversation starters organized by purpose. Use these in your circles or anytime you need a thoughtful question to open dialogue.'
            )
          ),

          // Category selector
          h('div', { className: 'flex gap-1 bg-slate-100 rounded-xl p-1' },
            ['opening', 'community', 'harm', 'closing'].map(function(cat) {
              var catData = RESTORATIVE_QUESTIONS[cat];
              return h('button', { 'aria-label': catData.emoji + ' ' + catData.label,
                key: cat,
                onClick: function() { upd('questionCategory', cat); },
                className: 'flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all ' +
                  ((d.questionCategory || 'opening') === cat ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-amber-600')
              }, catData.emoji + ' ' + catData.label);
            })
          ),

          // Questions list
          (function() {
            var activeCat = d.questionCategory || 'opening';
            var catData = RESTORATIVE_QUESTIONS[activeCat];
            if (!catData) return null;

            return h('div', { className: 'space-y-2' },
              h('div', { className: 'flex items-center gap-2 mb-1' },
                h('span', { className: 'text-xl' }, catData.emoji),
                h('h4', { className: 'text-sm font-bold', style: { color: catData.color } }, catData.label),
                h('span', { className: 'text-[10px] text-slate-600 ml-auto' }, catData.questions.length + ' questions')
              ),
              catData.questions.map(function(q, i) {
                return h('div', { key: i, className: 'bg-white rounded-xl border border-amber-200 p-3 flex items-start gap-3 hover:border-amber-400 transition-all' },
                  h('span', { className: 'font-bold text-sm mt-0.5 shrink-0', style: { color: catData.color } }, (i + 1) + '.'),
                  h('p', { className: 'text-sm text-slate-700 leading-relaxed flex-1' }, q),
                  h('div', { className: 'flex flex-col gap-1 shrink-0' },
                    callTTS && h('button', {
                      onClick: function() { callTTS(q); incrementBadgeStat('questionsUsed', 1); },
                      className: 'text-[10px] text-amber-400 hover:text-amber-600',
                      'aria-label': 'Read question aloud'
                    }, '\uD83D\uDD0A'),
                    h('button', {
                      onClick: function() {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(q);
                          addToast('Question copied!', 'success');
                          incrementBadgeStat('questionsUsed', 1);
                        }
                      },
                      className: 'text-[10px] text-slate-600 hover:text-slate-600',
                      'aria-label': 'Copy question to clipboard'
                    }, '\uD83D\uDCCB')
                  )
                );
              })
            );
          })(),

          // Random question button
          h('button', { 'aria-label': 'Random Question',
            onClick: function() {
              var cats = Object.keys(RESTORATIVE_QUESTIONS);
              var randCat = cats[Math.floor(Math.random() * cats.length)];
              var qs = RESTORATIVE_QUESTIONS[randCat].questions;
              var randQ = qs[Math.floor(Math.random() * qs.length)];
              updMulti({ randomQuestion: randQ, randomQuestionCat: RESTORATIVE_QUESTIONS[randCat].label });
              incrementBadgeStat('questionsUsed', 1);
              ctx.awardXP(3);
            },
            className: 'w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold hover:from-amber-600 hover:to-orange-600 transition-all'
          }, '\uD83C\uDFB2 Random Question'),

          // Display random question
          d.randomQuestion && h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300 p-5 text-center' },
            h('p', { className: 'text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2' }, d.randomQuestionCat || 'Question'),
            h('p', { className: 'text-lg font-bold text-slate-800 leading-relaxed' }, d.randomQuestion),
            h('div', { className: 'flex gap-2 justify-center mt-3' },
              callTTS && h('button', { 'aria-label': 'Read Aloud',
                onClick: function() { callTTS(d.randomQuestion); },
                className: 'px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors'
              }, '\uD83D\uDD0A Read Aloud'),
              h('button', { 'aria-label': 'Copy',
                onClick: function() {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(d.randomQuestion);
                    addToast('Copied!', 'success');
                  }
                },
                className: 'px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors'
              }, '\uD83D\uDCCB Copy')
            )
          )
        ),

        // ═══ CIRCLE ROLE CARDS ═══
        tab === 'roles' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83D\uDE4B Circle Role Cards'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed max-w-lg mx-auto' },
              'Every circle participant has a role. Learn what each role involves, the dos and don\'ts, and sample phrases to guide your practice.'
            )
          ),

          // Role cards
          CIRCLE_ROLES.map(function(role, ri) {
            var isExpanded = d.expandedRole === role.id;
            return h('div', {               key: role.id,
              className: 'bg-white rounded-2xl border-2 transition-all ' +
                (isExpanded ? 'border-amber-400 shadow-lg' : 'border-slate-200 hover:border-amber-300')
            },
              // Header (always visible)
              h('button', { 'aria-label': role.emoji,
                onClick: function() {
                  upd('expandedRole', isExpanded ? null : role.id);
                  if (!isExpanded) {
                    incrementBadgeStat('rolesStudied', 1);
                    ctx.awardXP(3);
                  }
                },
                className: 'w-full text-left p-4 flex items-center gap-3'
              },
                h('span', { className: 'text-2xl' }, role.emoji),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'font-bold text-sm text-slate-800' }, role.title),
                  h('div', { className: 'text-[10px] text-amber-600 font-medium' }, role.subtitle)
                ),
                h('span', { className: 'text-xs text-amber-500' }, isExpanded ? '\u25B2' : '\u25BC')
              ),

              // Expanded content
              isExpanded && h('div', { className: 'px-4 pb-5 space-y-4' },
                // Description
                h('div', { className: 'bg-amber-50 rounded-lg p-4 border border-amber-100' },
                  h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, role.description)
                ),

                // Dos and Don'ts side by side
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                  // Dos
                  h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-3' },
                    h('h5', { className: 'text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2' }, '\u2705 Do'),
                    h('ul', { className: 'space-y-1.5' },
                      role.dos.map(function(item, i) {
                        return h('li', { key: i, className: 'text-xs text-emerald-800 leading-relaxed flex items-start gap-1.5' },
                          h('span', { className: 'text-emerald-500 shrink-0 mt-0.5' }, '\u2022'),
                          h('span', null, item)
                        );
                      })
                    )
                  ),
                  // Don'ts
                  h('div', { className: 'bg-red-50 rounded-xl border border-red-200 p-3' },
                    h('h5', { className: 'text-xs font-bold text-red-600 uppercase tracking-widest mb-2' }, '\u274C Don\'t'),
                    h('ul', { className: 'space-y-1.5' },
                      role.donts.map(function(item, i) {
                        return h('li', { key: i, className: 'text-xs text-red-800 leading-relaxed flex items-start gap-1.5' },
                          h('span', { className: 'text-red-400 shrink-0 mt-0.5' }, '\u2022'),
                          h('span', null, item)
                        );
                      })
                    )
                  )
                ),

                // Sample phrases
                h('div', { className: 'bg-indigo-50 rounded-xl border border-indigo-200 p-3' },
                  h('h5', { className: 'text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2' }, '\uD83D\uDCAC Sample Phrases'),
                  h('div', { className: 'space-y-1.5' },
                    role.phrases.map(function(phrase, i) {
                      return h('div', { key: i, className: 'flex items-center gap-2' },
                        h('p', { className: 'text-xs text-indigo-800 italic leading-relaxed flex-1' }, '"' + phrase + '"'),
                        callTTS && h('button', { 'aria-label': 'Read aloud',
                          onClick: function() { callTTS(phrase); },
                          className: 'text-[10px] text-indigo-400 hover:text-indigo-600 shrink-0'
                        }, '\uD83D\uDD0A'),
                        h('button', { 'aria-label': 'div',
                          onClick: function() {
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              navigator.clipboard.writeText(phrase);
                              addToast('Phrase copied!', 'success');
                            }
                          },
                          className: 'text-[10px] text-indigo-400 hover:text-indigo-600 shrink-0'
                        }, '\uD83D\uDCCB')
                      );
                    })
                  )
                )
              )
            );
          }),

          // Quick reference card
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 text-center' },
            h('p', { className: 'text-xs text-amber-700 font-bold' },
              'Tip: In a small circle, one person may hold multiple roles. The keeper often serves as timekeeper too. What matters is that each function is covered.'
            )
          )
        ),

        // ═══ EMPATHY MAPPING EXERCISE ═══
        tab === 'empathy-map' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83E\uDDE0 Empathy Mapping Exercise'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed max-w-lg mx-auto' },
              'Understand different perspectives in a conflict by mapping what each person said, did, thought, and felt. Then find areas of overlap and build bridges.'
            )
          ),

          // Person selector
          h('div', { className: 'flex gap-2 bg-slate-100 rounded-xl p-1' },
            ['personA', 'personB'].map(function(person) {
              var personLabel = person === 'personA' ? '\uD83D\uDC64 Person A' : '\uD83D\uDC65 Person B';
              return h('button', { 'aria-label': 'text-slate-600 hover:text-amber-600',
                key: person,
                onClick: function() { upd('empathyPerson', person); },
                className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ' +
                  ((d.empathyPerson || 'personA') === person ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-amber-600')
              }, personLabel);
            })
          ),

          // Name input
          (function() {
            var activePerson = d.empathyPerson || 'personA';
            var nameKey = activePerson + 'Name';
            return h('div', { className: 'bg-white rounded-xl border border-slate-200 p-3' },
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, (activePerson === 'personA' ? 'Person A' : 'Person B') + '\'s Name (optional)'),
              h('input', {
                type: 'text',
                value: d[nameKey] || '',
                onChange: function(e) { upd(nameKey, e.target.value); },
                placeholder: 'Enter a name or label...',
                className: 'w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Person name'
              })
            );
          })(),

          // Four quadrants
          (function() {
            var activePerson = d.empathyPerson || 'personA';
            var empathyData = d.empathyData || {};

            return h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              EMPATHY_QUADRANTS.map(function(quad) {
                var dataKey = activePerson + '_' + quad.id;
                return h('div', { key: quad.id, className: 'bg-white rounded-xl border-2 p-4', style: { borderColor: quad.color + '40' } },
                  h('div', { className: 'flex items-center gap-2 mb-2' },
                    h('span', { className: 'text-lg' }, quad.emoji),
                    h('h5', { className: 'text-xs font-bold', style: { color: quad.color } }, quad.label)
                  ),
                  h('textarea', {
                    value: (empathyData[dataKey]) || '',
                    onChange: function(e) {
                      var newData = Object.assign({}, empathyData);
                      newData[dataKey] = e.target.value;
                      upd('empathyData', newData);
                    },
                    placeholder: quad.placeholder,
                    className: 'w-full text-xs p-2 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2',
                    style: { '--tw-ring-color': quad.color + '60' },
                    'aria-label': quad.label + ' for ' + activePerson
                  })
                );
              })
            );
          })(),

          // AI Analysis button
          h('button', { 'aria-label': 'AI Analysis button',
            onClick: function() {
              if (!callGemini) return;
              upd('aiLoading', true);
              var empathyData = d.empathyData || {};
              var nameA = d.personAName || 'Person A';
              var nameB = d.personBName || 'Person B';
              var summary = nameA + ':\n';
              EMPATHY_QUADRANTS.forEach(function(quad) {
                summary += '  ' + quad.label + ': ' + (empathyData['personA_' + quad.id] || '(not filled)') + '\n';
              });
              summary += nameB + ':\n';
              EMPATHY_QUADRANTS.forEach(function(quad) {
                summary += '  ' + quad.label + ': ' + (empathyData['personB_' + quad.id] || '(not filled)') + '\n';
              });
              var aiPrompt = 'You are a restorative circle facilitator helping a ' + (gradeLevel || '5th grade') + ' student understand two perspectives in a conflict.\n\n' +
                'Here is their empathy map:\n' + summary + '\n' +
                'In 3-4 sentences suitable for a ' + gradeBand + ' school student:\n' +
                '1. Identify areas where the two perspectives OVERLAP (shared feelings, needs, or experiences).\n' +
                '2. Identify areas of MISUNDERSTANDING (where one person may not see the other\'s viewpoint).\n' +
                '3. Suggest 2-3 specific bridge-building actions they could take to repair the relationship.\n' +
                'Be warm, empathetic, and constructive. Use simple language.';
              callGemini(aiPrompt).then(function(resp) {
                updMulti({ empathyAnalysis: resp, aiLoading: false });
                incrementBadgeStat('empathyMapsCompleted', 1);
                ctx.awardXP(15);
                addToast('Empathy analysis complete!', 'success');
              }).catch(function() {
                updMulti({ empathyAnalysis: 'Both perspectives hold important truths. Look for shared feelings and needs \u2014 that is where bridges are built.', aiLoading: false });
              });
            },
            disabled: aiLoading,
            className: 'w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-bold hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2'
          }, h(Sparkles, { size: 14 }), aiLoading ? 'Analyzing perspectives...' : '\u2728 Analyze Perspectives with AI'),

          // Display AI analysis
          d.empathyAnalysis && h('div', { className: 'bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-5' },
            h('div', { className: 'flex items-start gap-2 mb-3' },
              h(Sparkles, { size: 14, className: 'text-indigo-500 mt-0.5 shrink-0' }),
              h('h5', { className: 'text-xs font-bold text-indigo-600 uppercase tracking-widest' }, 'Empathy Analysis')
            ),
            h('p', { className: 'text-sm text-indigo-800 leading-relaxed' }, d.empathyAnalysis),
            h('div', { className: 'flex gap-2 mt-3' },
              callTTS && h('button', { 'aria-label': 'Read Aloud',
                onClick: function() { callTTS(d.empathyAnalysis); },
                className: 'px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors'
              }, '\uD83D\uDD0A Read Aloud'),
              h('button', { 'aria-label': 'Copy',
                onClick: function() {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(d.empathyAnalysis);
                    addToast('Analysis copied!', 'success');
                  }
                },
                className: 'px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors'
              }, '\uD83D\uDCCB Copy')
            )
          ),

          // Reset button
          h('button', { 'aria-label': 'Start New Empathy Map',
            onClick: function() { updMulti({ empathyData: {}, empathyAnalysis: null, personAName: '', personBName: '', empathyPerson: 'personA' }); addToast('Empathy map cleared', 'info'); },
            className: 'w-full px-4 py-2 bg-slate-100 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors'
          }, '\uD83D\uDD04 Start New Empathy Map')
        ),

        // ═══ RESTORATIVE VS PUNITIVE COMPARISON ═══
        tab === 'compare' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\u2696\uFE0F Restorative vs. Punitive'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed max-w-lg mx-auto' },
              gradeBand === 'elementary'
                ? 'Learn the difference between punishment and making things right. Which approach helps people learn and grow?'
                : gradeBand === 'middle'
                  ? 'Explore how restorative practices differ from traditional punishment. Compare approaches and think critically about what works.'
                  : 'Examine the philosophical and practical differences between punitive and restorative approaches to harm. Analyze real scenarios through both lenses.'
            )
          ),

          // Principles comparison
          h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-5' },
            h('h4', { className: 'text-sm font-bold text-slate-800 mb-4 text-center' },
              gradeBand === 'elementary' ? 'Two Different Ways to Handle Problems' : 'Core Differences'
            ),
            h('div', { className: 'space-y-3' },
              RESTORATIVE_VS_PUNITIVE.principles.map(function(p, i) {
                return h('div', { key: i, className: 'grid grid-cols-2 gap-2' },
                  h('div', { className: 'bg-red-50 rounded-lg p-3 border border-red-200' },
                    i === 0 && h('div', { className: 'text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1' },
                      gradeBand === 'elementary' ? '\uD83D\uDEAB Punishment Way' : '\uD83D\uDEAB Punitive Approach'
                    ),
                    h('p', { className: 'text-xs text-red-800 leading-relaxed' }, p.punitive)
                  ),
                  h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200' },
                    i === 0 && h('div', { className: 'text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1' },
                      gradeBand === 'elementary' ? '\uD83D\uDC9A Making-It-Right Way' : '\uD83D\uDC9A Restorative Approach'
                    ),
                    h('p', { className: 'text-xs text-emerald-800 leading-relaxed' }, p.restorative)
                  )
                );
              })
            )
          ),

          // Scenarios
          h('div', { className: 'space-y-4' },
            h('h4', { className: 'text-sm font-bold text-slate-800 text-center mt-2' },
              gradeBand === 'elementary' ? 'What Would Happen?' : 'Scenario Comparison'
            ),
            (function() {
              var compareScenarioIdx = d.compareScenarioIdx || 0;
              var scenarios = RESTORATIVE_VS_PUNITIVE.scenarios;
              var scenario = scenarios[compareScenarioIdx];
              if (!scenario) return null;
              var ratings = d.compareRatings || {};
              var ratingKey = 'scenario_' + compareScenarioIdx;

              return h('div', { className: 'space-y-3' },
                // Scenario selector
                h('div', { className: 'flex gap-1 overflow-x-auto pb-1' },
                  scenarios.map(function(sc, i) {
                    var hasRating = ratings['scenario_' + i] !== undefined;
                    return h('button', { 'aria-label': sc.emoji + ' ' + (i + 1),
                      key: i,
                      onClick: function() { upd('compareScenarioIdx', i); },
                      className: 'px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ' +
                        (compareScenarioIdx === i ? 'bg-amber-700 text-white' : hasRating ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600 hover:bg-amber-100')
                    }, sc.emoji + ' ' + (i + 1));
                  })
                ),

                // Scenario card
                h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-md' },
                  h('div', { className: 'text-center mb-4' },
                    h('span', { className: 'text-2xl' }, scenario.emoji),
                    h('h5', { className: 'text-sm font-bold text-slate-800 mt-1' }, scenario.title)
                  ),

                  // Side by side
                  h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4' },
                    h('div', { className: 'bg-red-50 rounded-xl border border-red-200 p-4' },
                      h('h6', { className: 'text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2' },
                        gradeBand === 'elementary' ? '\uD83D\uDEAB Punishment' : '\uD83D\uDEAB Punitive Response'
                      ),
                      h('p', { className: 'text-xs text-red-800 leading-relaxed' }, scenario.punitive)
                    ),
                    h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-4' },
                      h('h6', { className: 'text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2' },
                        gradeBand === 'elementary' ? '\uD83D\uDC9A Making It Right' : '\uD83D\uDC9A Restorative Response'
                      ),
                      h('p', { className: 'text-xs text-emerald-800 leading-relaxed' }, scenario.restorative)
                    )
                  ),

                  // Discussion question
                  h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-200 mb-4' },
                    h('p', { className: 'text-xs text-indigo-700 italic leading-relaxed' }, '\uD83D\uDCAD ' + scenario.discussion)
                  ),

                  // Rating
                  h('div', { className: 'space-y-2' },
                    h('p', { className: 'text-xs font-bold text-slate-600' },
                      gradeBand === 'elementary'
                        ? 'Which way do you think works better?'
                        : 'Which approach do you think would be more effective and why?'
                    ),
                    h('div', { className: 'flex gap-2' },
                      h('button', { 'aria-label': 'comparisonScenariosRated',
                        onClick: function() {
                          var newRatings = Object.assign({}, ratings);
                          newRatings[ratingKey] = 'punitive';
                          upd('compareRatings', newRatings);
                          incrementBadgeStat('comparisonScenariosRated', 1);
                          ctx.awardXP(5);
                        },
                        className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ' +
                          (ratings[ratingKey] === 'punitive' ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:border-red-300')
                      }, gradeBand === 'elementary' ? '\uD83D\uDEAB Punishment' : '\uD83D\uDEAB Punitive'),
                      h('button', { 'aria-label': 'compareReflections',
                        onClick: function() {
                          var newRatings = Object.assign({}, ratings);
                          newRatings[ratingKey] = 'restorative';
                          upd('compareRatings', newRatings);
                          incrementBadgeStat('comparisonScenariosRated', 1);
                          ctx.awardXP(5);
                        },
                        className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ' +
                          (ratings[ratingKey] === 'restorative' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-300')
                      }, gradeBand === 'elementary' ? '\uD83D\uDC9A Making It Right' : '\uD83D\uDC9A Restorative')
                    ),

                    // Reflection text area
                    ratings[ratingKey] && h('div', { className: 'mt-2' },
                      h('textarea', {
                        value: (d.compareReflections || {})[ratingKey] || '',
                        onChange: function(e) {
                          var newReflections = Object.assign({}, d.compareReflections || {});
                          newReflections[ratingKey] = e.target.value;
                          upd('compareReflections', newReflections);
                        },
                        placeholder: gradeBand === 'elementary'
                          ? 'Tell us why you picked this one...'
                          : 'Explain your reasoning. What makes this approach more effective?',
                        className: 'w-full text-xs p-2 border border-slate-200 rounded-lg resize-none h-16 outline-none focus:ring-2 focus:ring-amber-300',
                        'aria-label': 'Comparison reflection'
                      })
                    )
                  ),

                  // Navigation
                  h('div', { className: 'flex gap-2 justify-center mt-4' },
                    compareScenarioIdx > 0 && h('button', { 'aria-label': 'Previous',
                      onClick: function() { upd('compareScenarioIdx', compareScenarioIdx - 1); },
                      className: 'px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors'
                    }, '\u2190 Previous'),
                    compareScenarioIdx < scenarios.length - 1 && h('button', { 'aria-label': 'Next Scenario',
                      onClick: function() { upd('compareScenarioIdx', compareScenarioIdx + 1); },
                      className: 'px-4 py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-700 transition-colors'
                    }, 'Next Scenario \u2192')
                  )
                )
              );
            })()
          ),

          // Progress summary
          (function() {
            var ratings = d.compareRatings || {};
            var totalRated = Object.keys(ratings).length;
            var totalScenarios = RESTORATIVE_VS_PUNITIVE.scenarios.length;
            if (totalRated === 0) return null;
            var restorativeCount = 0;
            var punitiveCount = 0;
            Object.keys(ratings).forEach(function(k) {
              if (ratings[k] === 'restorative') restorativeCount++;
              if (ratings[k] === 'punitive') punitiveCount++;
            });
            return h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4' },
              h('p', { className: 'text-xs font-bold text-amber-700 text-center' },
                'You have rated ' + totalRated + ' of ' + totalScenarios + ' scenarios'
              ),
              h('div', { className: 'flex gap-4 justify-center mt-2' },
                h('span', { className: 'text-[10px] text-red-600 font-bold' }, '\uD83D\uDEAB Punitive: ' + punitiveCount),
                h('span', { className: 'text-[10px] text-emerald-600 font-bold' }, '\uD83D\uDC9A Restorative: ' + restorativeCount)
              ),
              totalRated >= totalScenarios && h('div', { className: 'mt-2 text-center' },
                h('button', { 'aria-label': 'Complete Comparison Study',
                  onClick: function() {
                    addToast('Comparison complete! You are a Restorative Scholar! \uD83D\uDCDA', 'success');
                    ctx.awardXP(20);
                    if (ctx.celebrate) ctx.celebrate();
                  },
                  className: 'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors'
                }, '\u2705 Complete Comparison Study')
              )
            );
          })()
        ),

        // ═══ BADGES ═══
        tab === 'badges' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDFC5 Restorative Badges'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed max-w-lg mx-auto' },
              'Earn badges as you deepen your restorative practice. Each badge recognizes growth, courage, and commitment to community.'
            )
          ),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            BADGES.map(function(badge) {
              var progress = badgeProgress[badge.key] || 0;
              var isEarned = earnedBadges[badge.id] || false;
              var pct = Math.min(100, Math.round((progress / badge.threshold) * 100));
              return h('div', {
                key: badge.id,
                className: 'rounded-2xl border-2 p-4 transition-all ' +
                  (isEarned ? 'border-amber-400 bg-amber-50 shadow-md' : 'border-slate-200 bg-white')
              },
                h('div', { className: 'flex items-center gap-3 mb-2' },
                  h('span', { className: 'text-3xl ' + (isEarned ? '' : 'grayscale opacity-40') }, badge.emoji),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'font-bold text-sm ' + (isEarned ? 'text-amber-700' : 'text-slate-600') }, badge.name),
                    h('p', { className: 'text-[10px] text-slate-600' }, badge.desc)
                  )
                ),
                h('div', { className: 'w-full bg-slate-200 rounded-full h-2 mt-1' },
                  h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
                    className: 'h-2 rounded-full transition-all ' + (isEarned ? 'bg-amber-500' : 'bg-slate-400'),
                    style: { width: pct + '%' }
                  })
                ),
                h('p', { className: 'text-[10px] text-slate-600 mt-1 text-right' },
                  isEarned ? '\u2713 Earned!' : progress + ' / ' + badge.threshold
                )
              );
            })
          ),

          // Badge summary
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 text-center' },
            h('p', { className: 'text-sm text-amber-700 font-bold' },
              Object.keys(earnedBadges).length + ' of ' + BADGES.length + ' badges earned'
            ),
            Object.keys(earnedBadges).length === BADGES.length && h('p', { className: 'text-xs text-amber-600 mt-1' }, '\u2728 You are a Restorative Circle master! Every badge earned. \u2728')
          )
        ),

        // ── AI Response ──
        aiResponse && h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-xl p-4' },
          h('div', { className: 'flex items-start gap-2' },
            h(Sparkles, { size: 14, className: 'text-indigo-500 mt-0.5 shrink-0' }),
            h('div', null,
              h('div', { className: 'text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1' }, 'Circle Facilitator'),
              h('p', { className: 'text-sm text-indigo-800 leading-relaxed' }, aiResponse)
            )
          ),
          h('button', { 'aria-label': 'Dismiss', onClick: function() { upd('aiResponse', null); }, className: 'mt-2 text-[10px] text-indigo-400 hover:text-indigo-600 font-bold' }, 'Dismiss')
        )
      );
    }
  });
})();

console.log('[SelHub] sel_tool_restorativecircle.js loaded');
