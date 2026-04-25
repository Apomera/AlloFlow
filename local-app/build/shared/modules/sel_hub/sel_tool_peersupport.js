// ═══════════════════════════════════════════════════════════════
// sel_tool_peersupport.js — Peer Support Coach Plugin (v1.0)
// Teaches MI-adjacent conversational support skills (OARS):
//   Open questions, Affirmations, Reflections, Summaries
// Two-tier: static skill practice (no AI) + AI roleplay (with AI)
// CRITICAL: Includes safety boundary training — when to get an adult
// Evidence base: Teen MHFA, Sources of Strength, MI in Schools
// Registered tool ID: "peersupport"
// Category: relationship-skills
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // ── WCAG: Live region ──
  (function() {
    if (document.getElementById('allo-live-peersupport')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-peersupport';
    lr.setAttribute('aria-live', 'assertive'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function announceToSR(msg) { var el = document.getElementById('allo-live-peersupport'); if (el) { el.textContent = ''; setTimeout(function() { el.textContent = msg; }, 50); } }

  // ── Sound effects ──
  var _audioCtx = null;
  function getAudioCtx() { if (!_audioCtx) try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return _audioCtx; }
  function playTone(f,d,t,v) { var ac = getAudioCtx(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.1,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.15)); } catch(e) {} }
  function sfxCorrect() { playTone(523,0.1,'sine',0.08); setTimeout(function(){playTone(659,0.1,'sine',0.08);},80); setTimeout(function(){playTone(784,0.15,'sine',0.1);},160); }
  function sfxAlert() { playTone(880,0.15,'sine',0.1); setTimeout(function(){playTone(880,0.15,'sine',0.1);},200); }

  // ═══════════════════════════════════════════════════════════════
  // OARS SKILL DEFINITIONS
  // ═══════════════════════════════════════════════════════════════

  var OARS = [
    { id: 'open', label: 'Open Questions', icon: '❓', color: '#3b82f6',
      what: 'Questions that can\'t be answered with just "yes" or "no" — they invite someone to share more.',
      examples: ['"What\'s been on your mind?"', '"How are you feeling about that?"', '"Tell me more about what happened."'],
      contrast: [{ open: 'What was that like for you?', closed: 'Was that bad?' }, { open: 'How are you feeling about the test?', closed: 'Are you nervous?' }, { open: 'What do you think you could try?', closed: 'Have you tried studying more?' }]
    },
    { id: 'affirm', label: 'Affirmations', icon: '⭐', color: '#f59e0b',
      what: 'Recognizing someone\'s strengths, effort, or courage — not empty praise, but genuine recognition of what they\'re doing right.',
      examples: ['"It took courage to tell me that."', '"You\'ve been working really hard on this."', '"I can see you care about doing the right thing."'],
      contrast: [{ good: 'It takes guts to talk about this.', weak: 'Don\'t worry, it\'ll be fine.' }, { good: 'You\'ve been putting in real effort — that matters.', weak: 'You\'re so smart, you\'ll figure it out.' }]
    },
    { id: 'reflect', label: 'Reflections', icon: '🪞', color: '#8b5cf6',
      what: 'Saying back what you heard in your own words — this shows you\'re really listening and helps the other person feel understood.',
      examples: ['"It sounds like you\'re feeling stuck."', '"So what you\'re saying is..."', '"You seem really frustrated about this."'],
      contrast: [{ reflection: 'It sounds like you\'re torn between two things.', advice: 'You should just pick one.' }, { reflection: 'You seem really hurt by what they said.', advice: 'Just ignore them.' }]
    },
    { id: 'summarize', label: 'Summaries', icon: '📋', color: '#10b981',
      what: 'Pulling together what someone has shared — this helps them hear their own story and feel heard.',
      examples: ['"Let me make sure I understand — you\'re dealing with..."', '"So overall, it sounds like..."', '"You\'ve told me about X, Y, and Z — is there anything I\'m missing?"'],
      contrast: []
    },
  ];

  // ═══════════════════════════════════════════════════════════════
  // SAFETY BOUNDARIES — When to get an adult
  // ═══════════════════════════════════════════════════════════════

  var SAFETY_SIGNALS = [
    { id: 'self-harm', label: 'Hurting themselves', icon: '🚨', examples: ['I don\'t want to be alive anymore.', 'I\'ve been cutting myself.', 'Nobody would miss me if I was gone.', 'I have a plan to end things.'] },
    { id: 'harmed', label: 'Being harmed by someone', icon: '🛡️', examples: ['My parent hits me when they\'re drunk.', 'Someone at school won\'t stop touching me.', 'I\'m scared to go home.', 'An older kid makes me do things I don\'t want to.'] },
    { id: 'harm-others', label: 'Planning to hurt someone', icon: '⚠️', examples: ['I want to hurt them so bad.', 'I brought something to school to scare them.', 'I\'m going to make them pay.'] },
    { id: 'substance', label: 'Substance crisis', icon: '💊', examples: ['I took a bunch of pills.', 'I can\'t stop drinking and I\'m scared.', 'Someone gave me something and I feel really weird.'] },
  ];

  var SAFETY_RESPONSE_STEPS = [
    { step: 1, label: 'Stay calm', desc: 'Don\'t panic. Your friend needs you to be steady.' },
    { step: 2, label: 'Listen & believe', desc: 'Say "I believe you" and "Thank you for telling me."' },
    { step: 3, label: 'Don\'t promise secrecy', desc: 'Say "I care about you too much to keep this secret."' },
    { step: 4, label: 'Tell a trusted adult', desc: 'A teacher, counselor, parent, coach — someone who can help.' },
    { step: 5, label: 'Stay with them', desc: 'Don\'t leave them alone. Go together if possible.' },
  ];

  // ═══════════════════════════════════════════════════════════════
  // STATIC SCENARIOS — Tier 1
  // ═══════════════════════════════════════════════════════════════

  var PRACTICE_SCENARIOS = {
    elementary: {
      open_vs_closed: [
        { situation: 'Your friend seems sad at lunch.', closed: 'Are you sad?', open: 'What\'s going on? You seem different today.', explain: 'Open questions invite them to share their story, not just say "yes."' },
        { situation: 'A classmate isn\'t joining the group activity.', closed: 'Don\'t you want to play?', open: 'What would make this more fun for you?', explain: 'Asking "what would help" gives them control, instead of pressuring them to join.' },
        { situation: 'Your friend failed a spelling test.', closed: 'Are you upset?', open: 'How are you feeling about the test?', explain: 'This lets them name their own feelings instead of you guessing.' },
      ],
      reflect_vs_advise: [
        { situation: 'Your friend says "Nobody likes me."', advice: 'That\'s not true! Lots of people like you!', reflection: 'It sounds like you\'re feeling really lonely right now.', explain: 'Telling someone their feelings are "wrong" doesn\'t help. Naming the feeling shows you hear them.' },
        { situation: 'A classmate says "This math is impossible!"', advice: 'Just try harder!', reflection: 'Math is really frustrating you today, huh?', explain: '"Try harder" feels dismissive. Reflecting their frustration makes them feel understood.' },
      ],
      safety: [
        { situation: 'Your friend whispers "I don\'t want to go home. My mom\'s boyfriend scares me."', options: [
          { text: 'That sounds scary. Let\'s go talk to our teacher right now — they can help.', rating: 'great', feedback: 'Perfect. You believed them, stayed calm, and got an adult involved immediately. This is exactly right.' },
          { text: 'Just avoid him. Stay in your room.', rating: 'poor', feedback: 'This puts the responsibility on your friend to manage an adult\'s dangerous behavior. They need adult help — this isn\'t something a kid should handle alone.' },
          { text: 'I promise I won\'t tell anyone.', rating: 'poor', feedback: 'NEVER promise secrecy when someone might be in danger. You can say "I care about you too much to keep this secret" and get adult help.' },
        ]},
        { situation: 'A classmate shows you marks on their arm and says "I did this to myself."', options: [
          { text: 'I\'m really glad you told me. This is too important to keep between us — let\'s go find Mrs. Johnson right now.', rating: 'great', feedback: 'Exactly right. You thanked them for trusting you, didn\'t panic, and immediately involved a trusted adult. You are being a real friend.' },
          { text: 'Why would you do that?! That\'s crazy!', rating: 'poor', feedback: 'Reacting with shock or judgment makes them regret telling you. Stay calm, show you care, and get help.' },
          { text: 'I\'ll keep your secret. I pinky promise.', rating: 'poor', feedback: 'When someone is hurting themselves, keeping the secret could cost their life. A real friend gets help even when it\'s hard.' },
        ]},
      ],
    },
    middle: {
      open_vs_closed: [
        { situation: 'Your friend has been skipping activities they used to enjoy.', closed: 'Are you depressed?', open: 'I\'ve noticed you haven\'t been coming to practice. What\'s been going on with you?', explain: 'Diagnosing someone ("Are you depressed?") puts them on the defensive. Observing and asking opens the door.' },
        { situation: 'A friend is stressed about their parents fighting.', closed: 'Are your parents getting divorced?', open: 'That sounds really stressful. How are you handling everything at home?', explain: 'Jumping to worst-case scenarios adds fear. Asking how they\'re handling it focuses on THEM, not the situation.' },
      ],
      reflect_vs_advise: [
        { situation: 'Your friend says "I can\'t stop scrolling my phone at night and I\'m always tired."', advice: 'Just put your phone in another room.', reflection: 'It sounds like you know the phone is affecting your sleep but it\'s hard to stop.', explain: 'They already know what they "should" do. Reflecting their struggle validates that it\'s hard, which builds trust.' },
        { situation: 'A friend says "My parents expect me to be perfect and I\'m cracking."', advice: 'Just tell them how you feel.', reflection: 'You\'re carrying a lot of pressure to meet their expectations, and it\'s wearing you down.', explain: '"Just tell them" oversimplifies a complex family dynamic. The reflection shows you understand the weight they\'re carrying.' },
      ],
      safety: [
        { situation: 'Your friend texts you at midnight: "I wrote goodbye letters to everyone. You were the best friend I ever had."', options: [
          { text: 'Stay on the phone with them. Tell a parent or call 988 immediately. Do not leave them alone.', rating: 'great', feedback: 'This is a life-or-death situation. You recognized the warning signs (goodbye letters) and took immediate action. Call 988 (Suicide & Crisis Lifeline), tell any available adult, and stay connected until help arrives.' },
          { text: 'Text back "Don\'t say that! Think positive!"', rating: 'poor', feedback: 'Toxic positivity doesn\'t save lives. This is a crisis signal — goodbye letters are a red flag for imminent danger. You need to get adult help NOW, not send encouraging texts.' },
          { text: 'They\'re probably just being dramatic. Go back to sleep.', rating: 'poor', feedback: 'NEVER dismiss a suicide warning sign. Even if you think they\'re exaggerating, the cost of being wrong is someone\'s life. Always take it seriously and get help.' },
        ]},
      ],
    },
    high: {
      open_vs_closed: [
        { situation: 'A friend confides they\'ve been binge drinking on weekends.', closed: 'Do you think you have a problem?', open: 'What role is drinking playing in your life right now?', explain: 'Asking "do you have a problem" triggers defensiveness. Asking about the role it plays invites honest self-reflection — a core MI technique.' },
      ],
      reflect_vs_advise: [
        { situation: 'A friend says "I cheated on the exam and I feel terrible, but I can\'t tell anyone because I\'ll lose my scholarship."', advice: 'You need to come clean. Honesty is the best policy.', reflection: 'You\'re caught between your integrity and something really important to your future. That\'s an incredibly hard place to be.', explain: 'Moralizing ("honesty is the best policy") shuts down the conversation. The reflection honors the genuine difficulty of their situation and keeps them talking.' },
      ],
      safety: [
        { situation: 'At a party, a friend pulls you aside and says "I took something and my heart is racing really fast. I\'m scared."', options: [
          { text: 'Stay with them. Call 911 immediately. Don\'t worry about getting in trouble — their life matters more.', rating: 'great', feedback: 'Exactly right. Medical emergency overrides everything. Most states have Good Samaritan laws protecting people who call for help during overdoses. Their life is worth more than anyone\'s reputation.' },
          { text: 'Just drink some water and lie down. You\'ll be fine.', rating: 'poor', feedback: 'You are not a doctor. A racing heart after taking an unknown substance could be a medical emergency. Never guess — call 911.' },
          { text: 'We can\'t call anyone or we\'ll all get in trouble.', rating: 'poor', feedback: 'Someone could die while you worry about consequences. Good Samaritan laws exist for this exact reason. ALWAYS prioritize life over consequences.' },
        ]},
      ],
    },
  };

  // AI Roleplay scenarios
  var AI_SUPPORT_SCENARIOS = {
    elementary: [
      { id: 'lonely', title: 'The Lonely Friend', setup: 'Your friend hasn\'t been talking to anyone at recess for the past week.', peerName: 'Maya', peerDesc: 'a quiet student who feels like nobody wants to be their friend, but is afraid to say it', skill: 'open', goal: 'Use OARS skills to find out what\'s bothering Maya and help her feel heard.' },
      { id: 'bully', title: 'The Silent Struggle', setup: 'You notice your friend flinches when a certain older student walks by.', peerName: 'Diego', peerDesc: 'a student who is being bullied but is ashamed to admit it, scared of retaliation', skill: 'reflect', goal: 'Help Diego feel safe enough to share what\'s happening. If it\'s serious, encourage getting adult help.', hasSafetyTrigger: true },
    ],
    middle: [
      { id: 'grades', title: 'Falling Behind', setup: 'Your friend\'s grades have dropped and they seem like they\'ve given up.', peerName: 'Jordan', peerDesc: 'a smart student who has lost motivation because they feel overwhelmed and believe they\'re too far behind to catch up', skill: 'affirm', goal: 'Use OARS to understand why Jordan has given up and help them see their own strengths.' },
      { id: 'family', title: 'The Secret', setup: 'Your friend pulls you aside and seems like they want to tell you something heavy.', peerName: 'Avery', peerDesc: 'a student dealing with a difficult situation at home — might reveal something that requires adult intervention', skill: 'reflect', goal: 'Listen with OARS skills. If Avery reveals something dangerous, recognize when to involve a trusted adult.', hasSafetyTrigger: true },
    ],
    high: [
      { id: 'identity', title: 'The Crossroads', setup: 'A close friend is struggling with a major life decision and everyone is giving them different advice.', peerName: 'Kai', peerDesc: 'a thoughtful student overwhelmed by conflicting expectations from family, friends, and their own desires — feeling pressured to be someone they\'re not', skill: 'summarize', goal: 'Use OARS to help Kai hear their own voice amidst all the noise. Don\'t give advice — help them find their own answer.' },
      { id: 'crisis', title: 'The Warning Signs', setup: 'A friend has been isolating, giving away belongings, and sent you a text saying "Thanks for being a good friend. Remember that."', peerName: 'River', peerDesc: 'a student showing warning signs of suicidal ideation — withdrawn, giving away possessions, saying goodbye-like statements', skill: 'safety', goal: 'Recognize the warning signs. Use OARS to keep them talking, but your primary job is to get adult help immediately.', hasSafetyTrigger: true },
    ],
  };

  // ═══════════════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('peersupport', {
    title: 'Peer Support Coach',
    icon: '🤝',
    category: 'relationship-skills',
    description: 'Learn to be a supportive listener using OARS skills — and know when to get adult help',
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    standards: ['CASEL: Relationship Skills', 'CASEL: Social Awareness', 'Sources of Strength'],
    ready: true,

    render: function(ctx) {
      var h = ctx.React.createElement;
      var useState = ctx.React.useState;
      var useCallback = ctx.React.useCallback;
      var useRef = ctx.React.useRef;

      var gradeBand = ctx.gradeBand || 'elementary';
      var callGemini = ctx.callGemini;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var update = ctx.update;
      var toolData = (ctx.toolData && ctx.toolData.peersupport) || {};
      var hasAI = !!callGemini;

      var _mode = useState('menu'); var mode = _mode[0]; var setMode = _mode[1];
      var _subMode = useState(null); var subMode = _subMode[0]; var setSubMode = _subMode[1];
      var _idx = useState(0); var idx = _idx[0]; var setIdx = _idx[1];
      var _feedback = useState(null); var feedback = _feedback[0]; var setFeedback = _feedback[1];
      var _score = useState(0); var score = _score[0]; var setScore = _score[1];
      var _total = useState(0); var total = _total[0]; var setTotal = _total[1];
      // AI roleplay
      var _aiScenario = useState(null); var aiScenario = _aiScenario[0]; var setAiScenario = _aiScenario[1];
      var _chatHistory = useState([]); var chatHistory = _chatHistory[0]; var setChatHistory = _chatHistory[1];
      var _chatInput = useState(''); var chatInput = _chatInput[0]; var setChatInput = _chatInput[1];
      var _chatLoading = useState(false); var chatLoading = _chatLoading[0]; var setChatLoading = _chatLoading[1];
      var _chatFeedback = useState(null); var chatFeedback = _chatFeedback[0]; var setChatFeedback = _chatFeedback[1];
      var _chatTurns = useState(0); var chatTurns = _chatTurns[0]; var setChatTurns = _chatTurns[1];
      var _rapport = useState(50); var rapport = _rapport[0]; var setRapport = _rapport[1];
      var _peerMood = useState('neutral'); var peerMood = _peerMood[0]; var setPeerMood = _peerMood[1];
      var _oarsUsed = useState({}); var oarsUsed = _oarsUsed[0]; var setOarsUsed = _oarsUsed[1]; // tracks which OARS skills detected
      var _safetyTriggered = useState(false); var safetyTriggered = _safetyTriggered[0]; var setSafetyTriggered = _safetyTriggered[1];
      var chatEndRef = useRef(null);

      var scenarios = PRACTICE_SCENARIOS[gradeBand] || PRACTICE_SCENARIOS.elementary;
      var aiScenarios = AI_SUPPORT_SCENARIOS[gradeBand] || AI_SUPPORT_SCENARIOS.elementary;
      var MOOD_EMOJIS = { happy: '😊', sad: '😢', angry: '😠', nervous: '😰', neutral: '😐', grateful: '🥰', confused: '😕', hurt: '😔', relieved: '😌', guarded: '🛡️', trusting: '🤝', crying: '😭' };

      var PURPLE = '#059669';
      var card = { background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '10px' };
      var btn = function(bg, fg, dis) { return { padding: '10px 18px', background: dis ? '#e5e7eb' : bg, color: dis ? '#9ca3af' : fg, border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: dis ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }; };

      // ── AI Chat ──
      var sendChat = useCallback(async function(userMsg) {
        if (!callGemini || !aiScenario || !userMsg.trim()) return;
        var newHistory = chatHistory.concat([{ role: 'user', text: userMsg.trim() }]);
        setChatHistory(newHistory);
        setChatInput('');
        setChatLoading(true);
        setChatTurns(function(t) { return t + 1; });
        try {
          var historyText = newHistory.map(function(m) { return (m.role === 'user' ? 'Student helper' : aiScenario.peerName) + ': ' + m.text; }).join('\n');
          var safetyNote = aiScenario.hasSafetyTrigger
            ? '\n\nIMPORTANT — SAFETY TRIGGER SYSTEM:\nAfter 4-5 exchanges, IF the conversation is going well (rapport > 60), gradually reveal something that requires adult help (matching your character description). Make it realistic — don\'t dump it all at once. The student should have the opportunity to recognize the safety signal and suggest getting an adult. If they do suggest getting help, respond with relief ("I was hoping you\'d say that"). If they don\'t, drop another hint.\n'
            : '';
          var prompt = 'You are ' + aiScenario.peerName + ', ' + aiScenario.peerDesc + '. You are a ' + gradeBand + ' school student who needs support.\n\n'
            + 'Scenario: ' + aiScenario.setup + '\n'
            + 'Current rapport: ' + rapport + '/100\n'
            + safetyNote + '\n'
            + 'Conversation:\n' + historyText + '\n\n'
            + 'Analyze the student\'s last message for OARS skills, then respond in character.\n\n'
            + 'Return JSON:\n'
            + '{"text":"your in-character response (1-2 sentences)","mood":"sad|nervous|neutral|grateful|hurt|relieved|trusting|guarded|crying",'
            + '"rapportChange":-10 to +10,'
            + '"oarsDetected":["open"|"affirm"|"reflect"|"summarize"|null] (which OARS skills the student used in their message),'
            + '"isSafetyMoment":false (set true ONLY if you just revealed something requiring adult help)}\n\n'
            + 'Rules:\n- Stay in character as a struggling peer\n- React authentically — if they use good OARS skills, open up more\n- If they give unsolicited advice, pull back slightly\n- 1-2 sentences max\n- Do NOT coach or break character';
          var result = await callGemini(prompt, true);
          if (result) {
            try {
              var parsed = JSON.parse(result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
              setChatHistory(function(prev) { return prev.concat([{ role: 'peer', text: parsed.text || '', mood: parsed.mood }]); });
              if (parsed.mood) setPeerMood(parsed.mood);
              if (parsed.rapportChange) setRapport(function(prev) { return Math.max(0, Math.min(100, prev + parsed.rapportChange)); });
              if (parsed.oarsDetected && Array.isArray(parsed.oarsDetected)) {
                setOarsUsed(function(prev) {
                  var n = Object.assign({}, prev);
                  parsed.oarsDetected.forEach(function(skill) { if (skill) n[skill] = (n[skill] || 0) + 1; });
                  return n;
                });
              }
              if (parsed.isSafetyMoment) {
                setSafetyTriggered(true);
                announceToSR('Safety alert: ' + aiScenario.peerName + ' may need adult help. Consider suggesting a trusted adult.');
              }
            } catch (e) {
              setChatHistory(function(prev) { return prev.concat([{ role: 'peer', text: result.trim() }]); });
            }
          }
        } catch (err) { addToast && addToast('Response failed.', 'error'); }
        setChatLoading(false);
        setTimeout(function() { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, 100);
      }, [callGemini, aiScenario, chatHistory, rapport, gradeBand, addToast]);

      // ── Get conversation feedback ──
      var getFeedback = useCallback(async function() {
        if (!callGemini || !aiScenario) return;
        setChatFeedback('loading');
        try {
          var historyText = chatHistory.map(function(m) { return (m.role === 'user' ? 'Student' : aiScenario.peerName) + ': ' + m.text; }).join('\n');
          var oarsSummary = OARS.map(function(s) { return s.label + ': ' + (oarsUsed[s.id] || 0) + ' times'; }).join(', ');
          var prompt = 'You are a warm peer support skills coach evaluating a ' + gradeBand + ' student\'s supportive conversation.\n\n'
            + 'Scenario: ' + aiScenario.setup + '\nSkill focus: ' + aiScenario.skill + '\nGoal: ' + aiScenario.goal + '\n'
            + 'Final rapport: ' + rapport + '/100 (started at 50)\n'
            + 'OARS skills used: ' + oarsSummary + '\n'
            + (safetyTriggered ? 'SAFETY: A safety moment occurred. Did the student recognize it and suggest getting adult help?\n' : '')
            + '\nConversation:\n' + historyText + '\n\n'
            + 'Return JSON:\n'
            + '{"rating":"developing|proficient|exemplary",'
            + '"oarsFeedback":{"open":"feedback on open questions usage","affirm":"feedback on affirmations","reflect":"feedback on reflections","summarize":"feedback on summaries"},'
            + '"safetyFeedback":"' + (safetyTriggered ? 'Did they recognize the safety signal and suggest getting help? Be specific.' : 'null') + '",'
            + '"strengths":["1-2 things done well"],"improvements":["1-2 specific suggestions"],'
            + '"overallNote":"encouraging 1-2 sentence summary"}\n\n'
            + 'Grade expectations: ' + (gradeBand === 'elementary' ? 'Praise any listening attempt. "Exemplary" = asked at least one open question AND reflected a feeling.' : gradeBand === 'middle' ? 'Expect 2+ OARS skills used. "Exemplary" = multiple skills with genuine engagement.' : 'Expect sophisticated use. "Exemplary" = natural integration of OARS + recognized safety signals if present.');
          var result = await callGemini(prompt, true);
          var parsed = JSON.parse(result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
          setChatFeedback(parsed);
          var xp = parsed.rating === 'exemplary' ? 30 : parsed.rating === 'proficient' ? 20 : 10;
          if (safetyTriggered) xp += 10; // Bonus for safety scenarios
          if (awardXP) awardXP('peersupport', xp);
          addToast && addToast('Feedback received! +' + xp + ' XP', 'success');
        } catch (err) { setChatFeedback({ error: 'Could not generate feedback.' }); }
      }, [callGemini, aiScenario, chatHistory, rapport, oarsUsed, safetyTriggered, gradeBand, awardXP, addToast]);

      // ═══ RENDER ═══

      // ── MENU ──
      if (mode === 'menu') {
        return h('div', { style: { maxWidth: '650px', margin: '0 auto', padding: '20px' } },
          h('div', { style: { textAlign: 'center', marginBottom: '24px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '🤝'),
            h('h2', { style: { fontSize: '24px', fontWeight: 900, color: '#1e293b' } }, 'Peer Support Coach'),
            h('p', { style: { color: '#9ca3af', fontSize: '14px', maxWidth: '480px', margin: '0 auto' } },
              'Learn to be a supportive listener. Not a counselor — a better friend. These skills help people find their own answers.')
          ),
          // OARS overview cards
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' } },
            OARS.map(function(skill) {
              return h('div', { key: skill.id, style: { background: '#fff', borderRadius: '12px', padding: '12px', border: '2px solid ' + skill.color + '33' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
                  h('span', { style: { fontSize: '18px' }, 'aria-hidden': 'true' }, skill.icon),
                  h('span', { style: { fontSize: '13px', fontWeight: 800, color: skill.color } }, skill.label)
                ),
                h('p', { style: { fontSize: '10px', color: '#6b7280', lineHeight: 1.4, margin: 0 } }, skill.what)
              );
            })
          ),
          // Safety banner — always visible
          h('div', { style: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '14px', padding: '14px', marginBottom: '16px' } },
            h('div', { style: { fontSize: '13px', fontWeight: 800, color: '#991b1b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' } }, '🚨 Know When to Get Help'),
            h('p', { style: { fontSize: '11px', color: '#991b1b', margin: '0 0 8px', lineHeight: 1.5 } },
              'Being a good listener is important — but some things are too big for friends to handle alone. If someone tells you about:'),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' } },
              SAFETY_SIGNALS.map(function(sig) {
                return h('span', { key: sig.id, style: { fontSize: '10px', background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '8px', border: '1px solid #fca5a5', fontWeight: 600 } }, sig.icon + ' ' + sig.label);
              })
            ),
            h('p', { style: { fontSize: '11px', color: '#991b1b', fontWeight: 700, margin: 0 } }, '→ Tell a trusted adult immediately. You are not betraying them — you are saving them.')
          ),
          // Tier 1: Practice
          h('div', { style: Object.assign({}, card, { border: '2px solid #86efac', background: '#f0fdf4' }) },
            h('h3', { style: { fontSize: '15px', fontWeight: 800, color: '#166534', marginBottom: '8px' } }, '📋 Skill Practice (No AI needed)'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              h('button', { onClick: function() { setSubMode('open_vs_closed'); setIdx(0); setFeedback(null); setScore(0); setTotal(0); setMode('practice'); },
                style: Object.assign({}, btn('#fff', '#166534', false), { border: '1px solid #bbf7d0', textAlign: 'left' }) },
                '❓ Open vs. Closed Questions — ' + (scenarios.open_vs_closed || []).length + ' exercises'),
              h('button', { onClick: function() { setSubMode('reflect_vs_advise'); setIdx(0); setFeedback(null); setScore(0); setTotal(0); setMode('practice'); },
                style: Object.assign({}, btn('#fff', '#166534', false), { border: '1px solid #bbf7d0', textAlign: 'left' }) },
                '🪞 Reflection vs. Advice — ' + (scenarios.reflect_vs_advise || []).length + ' exercises'),
              h('button', { onClick: function() { setSubMode('safety'); setIdx(0); setFeedback(null); setScore(0); setTotal(0); setMode('practice'); },
                style: Object.assign({}, btn('#fff', '#991b1b', false), { border: '1px solid #fca5a5', textAlign: 'left', background: '#fef2f2' }) },
                '🚨 Safety Scenarios — When to get an adult — ' + (scenarios.safety || []).length + ' scenarios')
            )
          ),
          // Tier 2: AI Roleplay
          h('div', { style: Object.assign({}, card, { border: '2px solid ' + (hasAI ? '#86efac' : '#fca5a5'), background: hasAI ? '#f0fdf4' : '#fef2f2' }) },
            h('h3', { style: { fontSize: '15px', fontWeight: 800, color: hasAI ? '#166534' : '#991b1b', marginBottom: '8px' } }, '🤖 AI Practice Conversations' + (hasAI ? '' : ' (AI Required)')),
            hasAI && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              aiScenarios.map(function(sc) {
                return h('button', { key: sc.id, onClick: function() {
                  setAiScenario(sc); setChatHistory([]); setChatInput(''); setChatFeedback(null); setChatTurns(0); setRapport(50); setPeerMood('neutral'); setOarsUsed({}); setSafetyTriggered(false); setMode('roleplay');
                  callGemini('You are ' + sc.peerName + ', ' + sc.peerDesc + '. Scenario: ' + sc.setup + '. Say your opening line — 1 sentence, natural, showing vulnerability. Return ONLY dialogue.', false)
                    .then(function(line) { setChatHistory([{ role: 'peer', text: line ? line.trim() : '...' }]); })
                    .catch(function() { setChatHistory([{ role: 'peer', text: '...' }]); });
                }, style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#fff', border: '1px solid ' + (sc.hasSafetyTrigger ? '#fca5a5' : '#bbf7d0'), borderRadius: '12px', cursor: 'pointer', textAlign: 'left' } },
                  h('span', { style: { fontSize: '20px' } }, sc.hasSafetyTrigger ? '🚨' : '💬'),
                  h('div', null,
                    h('div', { style: { fontWeight: 700, fontSize: '13px', color: '#1e293b' } }, sc.title),
                    h('div', { style: { fontSize: '10px', color: '#6b7280' } }, sc.setup.substring(0, 60) + '...'),
                    sc.hasSafetyTrigger && h('span', { style: { fontSize: '9px', background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '6px', fontWeight: 600 } }, 'Includes safety recognition')
                  )
                );
              })
            )
          ),
          // Clinical note
          h('div', { style: { marginTop: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', fontSize: '11px', color: '#1e40af' } },
            h('strong', null, 'Clinical note: '),
            'Peer Support Coach teaches MI-adjacent OARS skills (Open questions, Affirmations, Reflections, Summaries) for peer support contexts. ',
            'Safety boundary training is integrated throughout — students learn to recognize when situations require adult intervention. ',
            'Evidence base: Teen Mental Health First Aid, Sources of Strength (Wyman et al., 2010), Motivational Interviewing in Schools (Rollnick et al., 2016). ',
            'This tool does NOT train students as counselors — it teaches them to be better listeners and to know their limits.'
          )
        );
      }

      // ── PRACTICE MODE (Static) ──
      if (mode === 'practice') {
        var exercises = scenarios[subMode] || [];
        var current = exercises[idx % exercises.length];
        if (!current) return h('div', null, 'No exercises for this skill.');

        // Safety scenarios use the Social Lab pattern (multiple choice)
        if (subMode === 'safety') {
          return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
              h('button', { onClick: function() { setMode('menu'); }, style: btn('#f1f5f9', '#374151', false) }, '← Back'),
              h('span', { style: { fontSize: '13px', fontWeight: 700, color: '#16a34a' } }, '✅ ' + score + '/' + total),
              h('span', { style: { fontSize: '12px', color: '#991b1b', fontWeight: 700 } }, '🚨 Safety Scenarios')
            ),
            // Teach safety steps on first scenario
            idx === 0 && !feedback && h('div', { style: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '14px', padding: '14px', marginBottom: '12px' } },
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#991b1b', marginBottom: '8px' } }, '🚨 5 Steps When Someone Is in Danger'),
              h('ol', { style: { margin: '0 0 0 16px', padding: 0, fontSize: '12px', color: '#991b1b', lineHeight: 1.6 } },
                SAFETY_RESPONSE_STEPS.map(function(step) {
                  return h('li', { key: step.step, style: { marginBottom: '4px' } }, h('strong', null, step.label), ' — ' + step.desc);
                })
              )
            ),
            h('div', { style: { background: '#fef3c7', border: '2px solid #fde68a', borderRadius: '14px', padding: '16px', marginBottom: '12px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: '6px' } }, 'The Situation'),
              h('p', { style: { fontSize: '14px', color: '#1e293b', lineHeight: 1.6 } }, current.situation)
            ),
            feedback && h('div', { role: 'status', 'aria-live': 'assertive', style: { padding: '14px', borderRadius: '12px', marginBottom: '12px', background: feedback.ok ? '#dcfce7' : '#fee2e2', border: '1px solid ' + (feedback.ok ? '#86efac' : '#fca5a5'), color: feedback.ok ? '#166534' : '#991b1b', fontSize: '13px', fontWeight: 600 } }, feedback.msg),
            !feedback && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, role: 'group', 'aria-label': 'Choose your response' },
              current.options.map(function(opt, oi) {
                return h('button', { key: oi, 'aria-label': 'Response ' + String.fromCharCode(65 + oi), onClick: function() {
                  setTotal(function(t) { return t + 1; });
                  if (opt.rating === 'great') { sfxCorrect(); setScore(function(s) { return s + 1; }); setFeedback({ ok: true, msg: '✅ ' + opt.feedback }); announceToSR('Correct. ' + opt.feedback); if (awardXP) awardXP('peersupport', 15); }
                  else { sfxAlert(); setFeedback({ ok: false, msg: '❌ ' + opt.feedback }); announceToSR('Incorrect. ' + opt.feedback); }
                }, style: { padding: '14px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontSize: '13px', lineHeight: 1.5 } },
                  opt.text
                );
              })
            ),
            feedback && h('div', { style: { textAlign: 'center', marginTop: '12px' } },
              h('button', { onClick: function() { if (idx + 1 < exercises.length) { setIdx(idx + 1); setFeedback(null); } else { addToast && addToast('Complete! ' + score + '/' + total, 'success'); setMode('menu'); } },
                style: btn('#059669', '#fff', false) }, idx + 1 < exercises.length ? 'Next →' : '✓ Finish')
            )
          );
        }

        // Open vs Closed / Reflect vs Advise exercises
        return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
            h('button', { onClick: function() { setMode('menu'); }, style: btn('#f1f5f9', '#374151', false) }, '← Back'),
            h('span', { style: { fontSize: '13px', fontWeight: 700, color: '#16a34a' } }, '✅ ' + score + '/' + total),
            h('span', { style: { fontSize: '12px', color: '#6b7280' } }, (subMode === 'open_vs_closed' ? '❓ Open vs Closed' : '🪞 Reflect vs Advise') + ' · ' + (idx + 1) + '/' + exercises.length)
          ),
          h('div', { style: { background: '#f8fafc', borderRadius: '14px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '12px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' } }, 'Situation'),
            h('p', { style: { fontSize: '14px', color: '#1e293b', lineHeight: 1.6 } }, current.situation)
          ),
          feedback && h('div', { role: 'status', 'aria-live': 'assertive', style: { padding: '14px', borderRadius: '12px', marginBottom: '12px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', fontSize: '13px' } },
            h('strong', null, feedback.ok ? '✅ Correct! ' : '🤔 '), feedback.msg
          ),
          !feedback && (subMode === 'open_vs_closed' ? (
            // Two-button: which is the open question?
            h('div', null,
              h('p', { style: { fontSize: '13px', color: '#6b7280', marginBottom: '10px', fontWeight: 600 } }, 'Which is the OPEN question? (invites them to share more)'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, role: 'group', 'aria-label': 'Choose the open question' },
                [{ text: current.closed, isCorrect: false }, { text: current.open, isCorrect: true }]
                  .sort(function() { return 0.5 - Math.random(); }) // Shuffle
                  .map(function(opt, oi) {
                    return h('button', { key: oi, onClick: function() {
                      setTotal(function(t) { return t + 1; });
                      if (opt.isCorrect) { sfxCorrect(); setScore(function(s) { return s + 1; }); setFeedback({ ok: true, msg: current.explain }); announceToSR('Correct!'); if (awardXP) awardXP('peersupport', 10); }
                      else { setFeedback({ ok: false, msg: 'That\'s a closed question (yes/no answer). The open one is: "' + current.open + '" — ' + current.explain }); announceToSR('That was the closed question.'); }
                    }, style: { padding: '14px', background: '#fff', border: '2px solid #d1d5db', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', lineHeight: 1.5 } },
                      '"' + opt.text + '"'
                    );
                  })
              )
            )
          ) : (
            // Reflect vs Advise
            h('div', null,
              h('p', { style: { fontSize: '13px', color: '#6b7280', marginBottom: '10px', fontWeight: 600 } }, 'Which response is a REFLECTION? (shows you heard them)'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, role: 'group', 'aria-label': 'Choose the reflection' },
                [{ text: current.advice, isCorrect: false, label: 'advice' }, { text: current.reflection, isCorrect: true, label: 'reflection' }]
                  .sort(function() { return 0.5 - Math.random(); })
                  .map(function(opt, oi) {
                    return h('button', { key: oi, onClick: function() {
                      setTotal(function(t) { return t + 1; });
                      if (opt.isCorrect) { sfxCorrect(); setScore(function(s) { return s + 1; }); setFeedback({ ok: true, msg: current.explain }); if (awardXP) awardXP('peersupport', 10); }
                      else { setFeedback({ ok: false, msg: 'That\'s advice-giving, not reflection. The reflection is: "' + current.reflection + '" — ' + current.explain }); }
                    }, style: { padding: '14px', background: '#fff', border: '2px solid #d1d5db', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', lineHeight: 1.5 } },
                      '"' + opt.text + '"'
                    );
                  })
              )
            )
          )),
          feedback && h('div', { style: { textAlign: 'center', marginTop: '12px' } },
            h('button', { onClick: function() { if (idx + 1 < exercises.length) { setIdx(idx + 1); setFeedback(null); } else { addToast && addToast('Complete! ' + score + '/' + total, 'success'); setMode('menu'); } },
              style: btn('#059669', '#fff', false) }, idx + 1 < exercises.length ? 'Next →' : '✓ Finish')
          )
        );
      }

      // ── AI ROLEPLAY MODE ──
      if (mode === 'roleplay' && aiScenario) {
        return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 } },
            h('button', { onClick: function() { setMode('menu'); }, style: btn('#f1f5f9', '#374151', false) }, '← Back'),
            h('div', { style: { textAlign: 'right' } },
              h('div', { style: { fontSize: '13px', fontWeight: 700, color: '#1e293b' } }, aiScenario.title),
              h('div', { style: { fontSize: '10px', color: '#6b7280' } }, chatTurns + ' turns')
            )
          ),
          // Peer + rapport + OARS tracker
          h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '8px', flexShrink: 0 } },
            h('div', { style: { width: '40px', height: '40px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '3px solid ' + (rapport >= 70 ? '#22c55e' : rapport >= 40 ? '#f59e0b' : '#ef4444'), flexShrink: 0 }, 'aria-label': aiScenario.peerName + ' is feeling ' + peerMood }, MOOD_EMOJIS[peerMood] || '😐'),
            h('div', { style: { flex: 1 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' } },
                h('span', { style: { fontWeight: 700, color: '#1e293b' } }, aiScenario.peerName),
                h('span', { style: { color: '#6b7280' } }, 'Rapport: ' + rapport + '%')
              ),
              h('div', { style: { height: '5px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }, role: 'progressbar', 'aria-valuenow': rapport, 'aria-label': 'Rapport' },
                h('div', { style: { height: '100%', width: rapport + '%', background: rapport >= 70 ? '#22c55e' : rapport >= 40 ? '#f59e0b' : '#ef4444', transition: 'all 0.5s', borderRadius: '3px' } })
              )
            ),
            // OARS skill tracker
            h('div', { style: { display: 'flex', gap: '3px', flexShrink: 0 } },
              OARS.map(function(s) {
                var count = oarsUsed[s.id] || 0;
                return h('div', { key: s.id, title: s.label + ': ' + count + ' used', style: { width: '24px', height: '24px', borderRadius: '50%', background: count > 0 ? s.color : '#e5e7eb', color: count > 0 ? '#fff' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, transition: 'all 0.3s' } }, count > 0 ? count : s.icon);
              })
            )
          ),
          // Safety alert
          safetyTriggered && h('div', { role: 'alert', style: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '10px', padding: '8px 12px', marginBottom: '8px', fontSize: '11px', color: '#991b1b', fontWeight: 700, textAlign: 'center', flexShrink: 0 } },
            '🚨 ' + aiScenario.peerName + ' may need adult help. Consider suggesting a trusted adult.'
          ),
          // Goal
          h('div', { style: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', fontSize: '11px', color: '#1e40af', flexShrink: 0 } },
            h('strong', null, 'Goal: '), aiScenario.goal
          ),
          // Chat
          h('div', { style: { flex: 1, overflowY: 'auto', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' } },
            chatHistory.map(function(msg, i) {
              var isPeer = msg.role === 'peer';
              return h('div', { key: i, style: { display: 'flex', justifyContent: isPeer ? 'flex-start' : 'flex-end', gap: '6px' } },
                isPeer && h('div', { style: { width: '28px', height: '28px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }, 'aria-hidden': 'true' }, msg.mood ? (MOOD_EMOJIS[msg.mood] || '😐') : '💬'),
                h('div', { style: { maxWidth: '80%', padding: '8px 12px', borderRadius: isPeer ? '12px 12px 12px 0' : '12px 12px 0 12px', background: isPeer ? '#e0e7ff' : '#dcfce7', fontSize: '13px', lineHeight: 1.5 } },
                  isPeer && h('div', { style: { fontSize: '9px', fontWeight: 700, color: '#4338ca', marginBottom: '2px' } }, aiScenario.peerName),
                  msg.text || '...'
                )
              );
            }),
            chatLoading && h('div', { style: { fontSize: '12px', color: '#6b7280', padding: '4px' } }, aiScenario.peerName + ' is typing...'),
            h('div', { ref: chatEndRef })
          ),
          // Feedback display
          chatFeedback && typeof chatFeedback === 'object' && !chatFeedback.error && h('div', { style: { background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '14px', padding: '16px', marginBottom: '8px', flexShrink: 0 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
              h('strong', { style: { color: '#166534' } }, '📝 OARS Feedback'),
              h('span', { style: { fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', background: chatFeedback.rating === 'exemplary' ? '#dcfce7' : chatFeedback.rating === 'proficient' ? '#dbeafe' : '#fef3c7', color: chatFeedback.rating === 'exemplary' ? '#166534' : chatFeedback.rating === 'proficient' ? '#1e40af' : '#92400e' } },
                chatFeedback.rating === 'exemplary' ? '⭐ Exemplary' : chatFeedback.rating === 'proficient' ? '✅ Proficient' : '📈 Developing')
            ),
            chatFeedback.overallNote && h('p', { style: { fontSize: '12px', color: '#374151', marginBottom: '8px' } }, chatFeedback.overallNote),
            // Per-OARS feedback
            chatFeedback.oarsFeedback && h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' } },
              OARS.map(function(s) {
                var fb = chatFeedback.oarsFeedback[s.id];
                if (!fb || fb === 'null') return null;
                return h('div', { key: s.id, style: { background: '#fff', borderRadius: '8px', padding: '8px', border: '1px solid ' + s.color + '33' } },
                  h('div', { style: { fontSize: '10px', fontWeight: 700, color: s.color, marginBottom: '2px' } }, s.icon + ' ' + s.label + ' (' + (oarsUsed[s.id] || 0) + 'x)'),
                  h('p', { style: { fontSize: '10px', color: '#6b7280', margin: 0, lineHeight: 1.3 } }, fb)
                );
              })
            ),
            chatFeedback.safetyFeedback && chatFeedback.safetyFeedback !== 'null' && h('div', { style: { background: '#fef2f2', borderRadius: '8px', padding: '8px', border: '1px solid #fca5a5', marginBottom: '8px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#991b1b', marginBottom: '2px' } }, '🚨 Safety Recognition'),
              h('p', { style: { fontSize: '10px', color: '#991b1b', margin: 0 } }, chatFeedback.safetyFeedback)
            ),
            chatFeedback.strengths && h('div', { style: { marginBottom: '4px' } }, h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#16a34a' } }, '💪 Strengths'), h('ul', { style: { margin: '2px 0 0 14px', fontSize: '11px', color: '#166534' } }, chatFeedback.strengths.map(function(s, i) { return h('li', { key: i }, s); }))),
            chatFeedback.improvements && h('div', null, h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#d97706' } }, '🤔 Next Time'), h('ul', { style: { margin: '2px 0 0 14px', fontSize: '11px', color: '#92400e' } }, chatFeedback.improvements.map(function(s, i) { return h('li', { key: i }, s); }))),
            h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
              h('button', { onClick: function() { setMode('menu'); }, style: btn('#f1f5f9', '#374151', false) }, '← Try Another'),
              h('button', { onClick: function() {
                var text = '🤝 Peer Support Coach — Transcript\nScenario: ' + aiScenario.title + '\nRapport: ' + rapport + '/100\nOARS: ' + OARS.map(function(s) { return s.label + '=' + (oarsUsed[s.id]||0); }).join(', ') + '\n───\n' + chatHistory.map(function(m) { return (m.role === 'user' ? 'Student' : aiScenario.peerName) + ': ' + m.text; }).join('\n\n');
                var blob = new Blob([text], { type: 'text/plain' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'peersupport_' + aiScenario.id + '.txt'; a.click(); URL.revokeObjectURL(url);
              }, style: btn('#f1f5f9', '#374151', false) }, '📄 Save')
            )
          ),
          chatFeedback === 'loading' && h('p', { style: { textAlign: 'center', fontSize: '12px', color: '#6b7280', flexShrink: 0 } }, '⏳ Analyzing your OARS skills...'),
          // Input
          !chatFeedback && h('div', { style: { display: 'flex', gap: '6px', flexShrink: 0 } },
            h('input', { type: 'text', value: chatInput, onChange: function(ev) { setChatInput(ev.target.value); },
              onKeyDown: function(ev) { if (ev.key === 'Enter' && chatInput.trim() && !chatLoading) sendChat(chatInput); },
              placeholder: 'What would you say? Use your OARS skills...', disabled: chatLoading,
              style: { flex: 1, padding: '10px 14px', border: '2px solid #d1d5db', borderRadius: '12px', fontSize: '13px', outline: 'none' },
              'aria-label': 'Your response using OARS skills' }),
            ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && h('button', { onClick: function() {
              var SR = window.SpeechRecognition || window.webkitSpeechRecognition; var rec = new SR();
              rec.lang = 'en-US'; rec.interimResults = false;
              rec.onresult = function(ev) { setChatInput(function(p) { return p ? p + ' ' + ev.results[0][0].transcript : ev.results[0][0].transcript; }); };
              rec.start(); addToast && addToast('Listening...', 'info');
            }, style: btn('#f1f5f9', '#374151', chatLoading), 'aria-label': 'Voice input' }, '🎤'),
            h('button', { onClick: function() { if (chatInput.trim()) sendChat(chatInput); }, disabled: !chatInput.trim() || chatLoading,
              style: btn('#059669', '#fff', !chatInput.trim() || chatLoading) }, '→')
          ),
          !chatFeedback && chatTurns >= 3 && h('div', { style: { textAlign: 'center', marginTop: '6px', flexShrink: 0 } },
            h('button', { onClick: getFeedback, style: { fontSize: '11px', color: '#059669', background: 'none', border: '1px dashed #86efac', borderRadius: '8px', padding: '5px 14px', cursor: 'pointer' } }, '✨ Get OARS Feedback')
          )
        );
      }

      return h('div', null, 'Loading...');
    }
  });

  console.log('[SEL] Peer Support Coach tool registered');
})();
