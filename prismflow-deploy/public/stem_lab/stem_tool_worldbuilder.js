// ═══════════════════════════════════════════
// stem_tool_worldbuilder.js — World Builder: Collaborative Literary RPG
// Multiplayer world where writing quality = character power
// Students explore, battle, and build through the strength of their prose
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('worldBuilder'))) {

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio System (auto-injected) ──
  var _wbAC = null;
  function getWbAC() { if (!_wbAC) { try { _wbAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_wbAC && _wbAC.state === "suspended") { try { _wbAC.resume(); } catch(e) {} } return _wbAC; }
  function wbTone(f,d,tp,v) { var ac = getWbAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxWbCreate() { wbTone(440,0.06,"sine",0.06); }
  function sfxWbMagic() { wbTone(880,0.08,"sine",0.05); }
  function sfxWbClick() { wbTone(600,0.03,"sine",0.04); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-worldbuilder')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-worldbuilder';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ── World Templates ──
  var WORLDS = [
    { id: 'fantasy', name: 'Enchanted Realm', emoji: '🏰', desc: 'A magical kingdom of castles, dragons, and ancient prophecies', rooms: [
      { id: 'castle', name: 'The Crystal Castle', emoji: '🏰', desc: 'A towering fortress of shimmering crystal, its spires catching the light of three moons.', connections: ['forest', 'village'] },
      { id: 'forest', name: 'The Whispering Woods', emoji: '🌲', desc: 'Ancient trees with silver leaves that whisper secrets to those who listen carefully.', connections: ['castle', 'cave', 'lake'] },
      { id: 'cave', name: 'The Dragon\'s Lair', emoji: '🐉', desc: 'A vast underground cavern glowing with veins of molten gold and ancient runes.', connections: ['forest', 'mountain'] },
      { id: 'village', name: 'Hearthstone Village', emoji: '🏘️', desc: 'A cozy village where smoke curls from chimneys and the smell of fresh bread fills the air.', connections: ['castle', 'market'] },
      { id: 'lake', name: 'Mirror Lake', emoji: '🌊', desc: 'A perfectly still lake that reflects not what is, but what could be.', connections: ['forest'] },
      { id: 'mountain', name: 'Storm Peak', emoji: '⛰️', desc: 'The highest mountain in the realm, where lightning dances and eagles soar.', connections: ['cave'] },
      { id: 'market', name: 'The Bazaar of Wonders', emoji: '🎪', desc: 'A bustling marketplace where merchants sell enchanted objects from distant lands.', connections: ['village'] },
    ]},
    { id: 'scifi', name: 'Deep Space Station', emoji: '🚀', desc: 'A space station orbiting a dying star, humanity\'s last outpost', rooms: [
      { id: 'bridge', name: 'Command Bridge', emoji: '🖥️', desc: 'The nerve center of the station, holographic displays showing the void beyond.', connections: ['lab', 'quarters'] },
      { id: 'lab', name: 'Research Laboratory', emoji: '🔬', desc: 'Banks of quantum computers processing data from the dying star below.', connections: ['bridge', 'engine', 'garden'] },
      { id: 'engine', name: 'Engine Core', emoji: '⚡', desc: 'The pulsing heart of the station, where antimatter meets containment fields.', connections: ['lab', 'cargo'] },
      { id: 'quarters', name: 'Living Quarters', emoji: '🛏️', desc: 'Small but comfortable rooms with viewports showing the star\'s crimson glow.', connections: ['bridge', 'garden'] },
      { id: 'garden', name: 'Hydroponic Garden', emoji: '🌱', desc: 'A green oasis of engineered plants producing oxygen and hope.', connections: ['lab', 'quarters'] },
      { id: 'cargo', name: 'Cargo Bay', emoji: '📦', desc: 'Vast storage holds containing supplies, secrets, and something that shouldn\'t be there.', connections: ['engine'] },
    ]},
    { id: 'mystery', name: 'Ravenwood Academy', emoji: '🔍', desc: 'A prestigious boarding school hiding dark secrets in its ancient halls', rooms: [
      { id: 'library', name: 'The Restricted Library', emoji: '📚', desc: 'Floor-to-ceiling shelves of forbidden knowledge, dust motes dancing in lamplight.', connections: ['hall', 'tower'] },
      { id: 'hall', name: 'The Great Hall', emoji: '🏛️', desc: 'A cavernous dining hall with portraits whose eyes seem to follow you.', connections: ['library', 'grounds', 'basement'] },
      { id: 'tower', name: 'The Clock Tower', emoji: '🕐', desc: 'The highest point of the academy, where the ancient clock has stopped at midnight.', connections: ['library'] },
      { id: 'grounds', name: 'The Grounds', emoji: '🌳', desc: 'Perfectly manicured gardens with a hedge maze that changes its paths at night.', connections: ['hall', 'greenhouse'] },
      { id: 'basement', name: 'The Underground', emoji: '🕳️', desc: 'Forgotten tunnels beneath the school, older than the academy itself.', connections: ['hall'] },
      { id: 'greenhouse', name: 'The Greenhouse', emoji: '🌿', desc: 'A glass sanctuary of rare and possibly sentient plants.', connections: ['grounds'] },
    ]},
    { id: 'historical', name: 'Ancient Crossroads', emoji: '🗺️', desc: 'A trading city where civilizations meet at the edge of known history', rooms: [
      { id: 'bazaar', name: 'The Grand Bazaar', emoji: '🏪', desc: 'A labyrinth of stalls selling spices from three continents, silk from the east, and stories from everywhere.', connections: ['harbor', 'palace', 'temple'] },
      { id: 'harbor', name: 'The Harbor', emoji: '⛵', desc: 'Ships from a dozen nations crowd the docks, their flags telling stories of distant lands.', connections: ['bazaar'] },
      { id: 'palace', name: 'The Seat of Power', emoji: '👑', desc: 'Where rulers negotiate peace and scholars debate philosophy under painted ceilings.', connections: ['bazaar', 'academy'] },
      { id: 'temple', name: 'The Temple of Many Gods', emoji: '🕌', desc: 'A sacred space where different faiths coexist, sharing wisdom across traditions.', connections: ['bazaar', 'garden'] },
      { id: 'academy', name: 'The House of Wisdom', emoji: '📜', desc: 'Scholars translate ancient texts, preserving knowledge that might otherwise be lost to time.', connections: ['palace'] },
      { id: 'garden', name: 'The Hanging Gardens', emoji: '🌺', desc: 'Terraced gardens fed by ingenious irrigation, a wonder of ancient engineering.', connections: ['temple'] },
    ]},
  ];

  // ── SEL Skills & Scenario Templates ──
  var SEL_SKILLS = [
    'empathy', 'self-advocacy', 'conflict-resolution', 'bystander-intervention',
    'emotion-regulation', 'perspective-taking', 'assertive-communication',
    'active-listening', 'accountability', 'forgiveness', 'boundary-setting',
    'help-seeking', 'de-escalation', 'cultural-humility', 'ethical-reasoning',
    'peer-mediation', 'restorative-dialogue', 'growth-mindset', 'resilience',
    'collaborative-problem-solving'
  ];

  var SCENARIO_TEMPLATES = [
    { type: 'bullying', label: '🛑 Bullying', prompt: 'Create a scene where one character is being bullied by another and a bystander (the player) must decide how to respond. Include the bully, the target, and other onlookers. The situation should be realistic and age-appropriate.', skills: ['bystander-intervention', 'self-advocacy', 'assertive-communication', 'de-escalation'] },
    { type: 'exclusion', label: '🚪 Exclusion', prompt: 'Create a scene where a new student or someone different is being excluded from a group. Multiple characters are present with different opinions about including them.', skills: ['empathy', 'perspective-taking', 'cultural-humility', 'assertive-communication'] },
    { type: 'ethical', label: '⚖️ Ethical Dilemma', prompt: 'Create a scene where the player witnesses something wrong (cheating, lying, stealing) and must decide what to do. Include the person doing wrong, the person being wronged, and a friend pressuring the player to stay quiet.', skills: ['ethical-reasoning', 'accountability', 'assertive-communication', 'help-seeking'] },
    { type: 'conflict', label: '🤝 Friend Conflict', prompt: 'Create a scene where two friends are in a serious disagreement and the player must mediate. Both sides have valid points. Include strong emotions — anger, hurt, betrayal.', skills: ['conflict-resolution', 'active-listening', 'peer-mediation', 'perspective-taking'] },
    { type: 'pressure', label: '🫸 Peer Pressure', prompt: 'Create a scene where the player is being pressured to do something they know is wrong by popular students. Include the social dynamics — wanting to fit in vs doing the right thing.', skills: ['self-advocacy', 'boundary-setting', 'ethical-reasoning', 'resilience'] },
    { type: 'grief', label: '💔 Loss & Grief', prompt: 'Create a scene where a character is dealing with loss (a pet, a move, a family change) and the player encounters them. Other characters are uncomfortable and avoiding the grieving person.', skills: ['empathy', 'active-listening', 'emotion-regulation', 'help-seeking'] },
    { type: 'identity', label: '🌈 Identity & Belonging', prompt: 'Create a scene where a character is struggling with feeling different — culture, language, disability, family structure. They feel they don\'t belong. Other characters have mixed reactions.', skills: ['cultural-humility', 'perspective-taking', 'empathy', 'assertive-communication'] },
    { type: 'failure', label: '📉 Failure & Growth', prompt: 'Create a scene where a character has failed publicly (a test, a performance, a competition) and is devastated. Others react in various ways — some kind, some mocking.', skills: ['growth-mindset', 'resilience', 'empathy', 'emotion-regulation'] },
  ];

  // ── Writing Quality Evaluator ──
  var QUALITY_THRESHOLDS = {
    legendary: { min: 75, label: 'Legendary', emoji: '👑', color: '#eab308' },
    powerful: { min: 50, label: 'Powerful', emoji: '⚡', color: '#8b5cf6' },
    moderate: { min: 25, label: 'Moderate', emoji: '🔵', color: '#3b82f6' },
    weak: { min: 0, label: 'Weak', emoji: '💫', color: 'var(--allo-stem-text-soft, #94a3b8)' },
  };

  var getQualityTier = function(score) {
    if (score >= 75) return QUALITY_THRESHOLDS.legendary;
    if (score >= 50) return QUALITY_THRESHOLDS.powerful;
    if (score >= 25) return QUALITY_THRESHOLDS.moderate;
    return QUALITY_THRESHOLDS.weak;
  };

  // Grade-level calibration instructions for AI prompts
  var GRADE_OPTIONS = [
    'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade',
    '5th Grade', '6th Grade', '7th Grade', '8th Grade',
    '9th Grade', '10th Grade', '11th Grade', '12th Grade'
  ];

  var getGradeCalibration = function(grade) {
    return '\nGRADE-LEVEL CALIBRATION: This student is in ' + grade + '.\n' +
      'CRITICAL: Score relative to what is EXPECTED at ' + grade + ' level, NOT against adult writing.\n' +
      '- A ' + grade + ' student who writes with age-appropriate detail, vocabulary, and effort should score 60-80.\n' +
      '- Only score below 30 if the writing shows minimal effort regardless of grade.\n' +
      '- Only score 90+ for truly exceptional writing that exceeds ' + grade + ' expectations.\n' +
      '- Vocabulary expectations: judge sophistication relative to ' + grade + ' curriculum, not absolute difficulty.\n' +
      '- Grammar expectations: ' + grade + '-appropriate mechanics. Minor errors typical of this age are OK.\n' +
      '- Length expectations: adjust for grade — a detailed 2-sentence response from a 2nd grader shows more effort than from a 10th grader.\n';
  };

  window.StemLab.registerTool('worldBuilder', {
    icon: '\u270D\uFE0F',
    label: 'WriteCraft',
    desc: 'Literary RPG \u2014 explore worlds, craft items, build structures, and battle through the strength of your prose.',
    color: 'violet',
    category: 'creative',
    questHooks: [
      { id: 'earn_25_wp', label: 'Earn 25 Writing Power through descriptive prose', icon: '\u270D\uFE0F', check: function(d) { return (d.writingPower || 0) >= 25; }, progress: function(d) { return (d.writingPower || 0) + '/25 WP'; } },
      { id: 'earn_100_xp', label: 'Earn 100 total XP in WriteCraft', icon: '\u2B50', check: function(d) { return (d.totalXP || 0) >= 100; }, progress: function(d) { return (d.totalXP || 0) + '/100 XP'; } },
      { id: 'create_character', label: 'Create a character with name and class', icon: '\uD83E\uDDD1\u200D\uD83D\uDE80', check: function(d) { return !!(d.characterName && d.characterClass); }, progress: function(d) { return d.characterName ? 'Created!' : 'Not yet'; } },
      { id: 'explore_world', label: 'Enter and explore a world', icon: '\uD83C\uDF0D', check: function(d) { return !!d.selectedWorld; }, progress: function(d) { return d.selectedWorld ? 'Exploring!' : 'Choose a world'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['worldBuilder']) || {};
      var upd = function(key, val) { ctx.update('worldBuilder', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('worldBuilder', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiImageEdit = ctx.callGeminiImageEdit;
      var callGeminiVision = ctx.callGeminiVision;
      var ctxGradeLevel = ctx.gradeLevel;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var awardStemXP = ctx.awardXP ? function(points, reason) { ctx.awardXP('worldBuilder', points, reason || 'WriteCraft writing'); } : null;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;

      var tab = d.tab || 'world';
      var selectedWorld = d.selectedWorld || null;
      var currentRoom = d.currentRoom || null;
      var characterName = d.characterName || '';
      var characterClass = d.characterClass || '';
      var playerGradeLevel = d.playerGradeLevel || null; // student-set, overrides ctx
      // Effective grade: student pick > teacher setting > default
      var gradeLevel = playerGradeLevel || ctxGradeLevel || '5th Grade';
      var writingPower = d.writingPower || 0;
      var totalXP = d.totalXP || 0;
      var actionLog = d.actionLog || [];
      var sceneImage = d.sceneImage || null;
      var sceneImageLoading = d.sceneImageLoading || false;
      var isWriting = d.isWriting || false;
      var actionText = d.actionText || '';
      var actionResult = d.actionResult || null;
      var actionLoading = d.actionLoading || false;
      var roomsVisited = d.roomsVisited || [];
      var battlesWon = d.battlesWon || 0;
      var legendaryActions = d.legendaryActions || 0;
      var vocabTermsUsed = d.vocabTermsUsed || [];

      // ── Character Portrait & Consistency ──
      var characterPortrait = d.characterPortrait || null;
      var characterPortraitLoading = d.characterPortraitLoading || false;
      var characterAppearance = d.characterAppearance || '';

      // ── Item Crafting, Structures & Inventory ──
      var inventory = d.inventory || [];
      var craftedThisTurn = d.craftedThisTurn || false;
      var activeItem = d.activeItem || null;
      var structures = d.structures || [];
      var structureCooldown = d.structureCooldown || 0;
      var craftSubMode = d.craftSubMode || 'item'; // 'item' or 'structure'

      // ── NPC / SEL Encounter System ──
      var activeNPC = d.activeNPC || null;
      var npcHistory = d.npcHistory || [];
      var gmCharacters = d.gmCharacters || [];
      var conflictsResolved = d.conflictsResolved || 0;
      var selSkillsUsed = d.selSkillsUsed || [];

      // ── Rapport & Quest Tracking ──
      var npcRapport = d.npcRapport || {};
      var npcQuests = d.npcQuests || {};
      var harmonyScore = d.harmonyScore || 0;
      var completedQuests = d.completedQuests || 0;

      // ── Create GM Character (teacher prompts Gemini) ──
      var createGMCharacter = function(description) {
        if (!callGemini) return;
        upd('actionLoading', true);
        var prompt = 'You are designing an NPC for a literary RPG world for ' + gradeLevel + ' students.\n' +
          'World: ' + (world ? world.name : 'Fantasy') + '\n' +
          'Teacher\'s description: "' + description + '"\n\n' +
          'Create a rich, complex character. This character may be:\n' +
          '- A quest-giver with a meaningful problem to solve\n' +
          '- Someone in conflict who needs mediation (restorative justice)\n' +
          '- A mentor who teaches through conversation\n' +
          '- A rival who challenges through debate, not violence\n' +
          '- A community member facing a social-emotional challenge\n\n' +
          'Their quest/conflict should require EMPATHY and COMMUNICATION to resolve, not just combat.\n\n' +
          'Return ONLY JSON:\n' +
          '{"name":"name","emoji":"emoji","role":"role","backstory":"2-3 sentences","personality":"traits",' +
          '"currentSituation":"what they need","selTheme":"self-awareness|self-management|social-awareness|relationship-skills|decision-making",' +
          '"conflictType":"none|interpersonal|internal|community|ethical-dilemma",' +
          '"resolution":"what resolution looks like","roomId":null,"openingLine":"in-character greeting"}';
        callGemini(prompt, true).then(function(result) {
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var npc = JSON.parse(cleaned);
            updMulti({ gmCharacters: gmCharacters.concat([npc]), actionLoading: false });
            if (addToast) addToast(npc.emoji + ' ' + npc.name + ' placed in the world!', 'success');
          } catch(e) {
            upd('actionLoading', false);
            if (typeof addToast === 'function') addToast('Could not parse AI response — please try again', 'error');
          }
        }).catch(function() { upd('actionLoading', false); });
      };

      // ── Character Portrait Generation (consistent character pipeline) ──
      var generateCharacterPortrait = function(description) {
        if (!callImagen || !description.trim()) return;
        upd('characterPortraitLoading', true);
        var worldStyle = selectedWorld === 'scifi' ? 'Sci-fi digital painting, dramatic lighting'
          : selectedWorld === 'mystery' ? 'Gothic mystery illustration, moody atmosphere'
          : selectedWorld === 'historical' ? 'Classical oil painting, historical accuracy'
          : 'Fantasy storybook illustration, warm palette';
        var imgPrompt = 'Character portrait: ' + (characterName || 'Adventurer') + ', ' + (characterClass || 'explorer') + '. ' +
          description + '. Bust portrait, centered face, soft lighting, detailed, no text, no labels. ' + worldStyle + '.';
        callImagen(imgPrompt, 400, 0.85).then(function(imageUrl) {
          if (!imageUrl) { upd('characterPortraitLoading', false); return; }
          // Refinement pass via callGeminiImageEdit if available
          if (callGeminiImageEdit) {
            try {
              var rawBase64 = imageUrl.split(',')[1];
              var refinePrompt = 'Refine this character portrait to strictly match: "' + description + '". ' +
                'Fix any anachronisms. Ensure art style matches: ' + worldStyle + '. ' +
                'Remove any text, watermarks, or blurry artifacts. Keep composition centered. No text.';
              callGeminiImageEdit(refinePrompt, rawBase64, 400, 0.85).then(function(refined) {
                updMulti({ characterPortrait: refined || imageUrl, characterPortraitLoading: false, characterAppearance: description });
                sfxWbCreate(); if (addToast) addToast('🎨 Character portrait created!', 'success');
                if (announceToSR) announceToSR('Character portrait generated successfully.');
              }).catch(function() {
                updMulti({ characterPortrait: imageUrl, characterPortraitLoading: false, characterAppearance: description });
                if (addToast) addToast('🎨 Character portrait created!', 'success');
              });
            } catch(e) {
              updMulti({ characterPortrait: imageUrl, characterPortraitLoading: false, characterAppearance: description });
            }
          } else {
            updMulti({ characterPortrait: imageUrl, characterPortraitLoading: false, characterAppearance: description });
            if (addToast) addToast('🎨 Character portrait created!', 'success');
          }
        }).catch(function() {
          upd('characterPortraitLoading', false);
          sfxWbClick(); if (addToast) addToast('Portrait generation failed — try again', 'error');
        });
      };

      // ── Refine character portrait with natural language ──
      var refineCharacterPortrait = function(editText) {
        if (!callGeminiImageEdit || !characterPortrait || !editText.trim()) return;
        upd('characterPortraitLoading', true);
        try {
          var rawBase64 = characterPortrait.split(',')[1];
          var editPrompt = 'Modify this character portrait: ' + editText + '. Keep the character recognizable. No text.';
          callGeminiImageEdit(editPrompt, rawBase64, 400, 0.85).then(function(refined) {
            var newAppearance = (characterAppearance || '') + ', ' + editText;
            updMulti({ characterPortrait: refined || characterPortrait, characterPortraitLoading: false, characterAppearance: newAppearance });
            if (addToast) addToast('🎨 Portrait refined!', 'success');
          }).catch(function() { upd('characterPortraitLoading', false); });
        } catch(e) { upd('characterPortraitLoading', false); }
      };

      // ── Apply character consistency to scene images ──
      var applyCharacterConsistency = function(sceneImageUrl) {
        if (!callGeminiImageEdit || !characterPortrait || !sceneImageUrl) return;
        try {
          var sceneBase64 = sceneImageUrl.split(',')[1];
          var portraitBase64 = characterPortrait.split(',')[1];
          var consistencyPrompt = 'Refine the main character in this scene to visually match this reference portrait. ' +
            'Character: ' + (characterName || 'Adventurer') + ' — ' + (characterAppearance || 'explorer') + '. ' +
            'Keep the scene composition, background, and lighting unchanged. ' +
            'Only adjust the protagonist\'s features to match the reference. NO TEXT.';
          callGeminiImageEdit(consistencyPrompt, sceneBase64, 400, 0.8, portraitBase64).then(function(consistent) {
            if (consistent) upd('sceneImage', consistent);
          }).catch(function() {});
        } catch(e) {}
      };

      // ── Item Crafting System ──
      var craftItem = function(description) {
        if (!callGemini || !description.trim()) return;
        if (structureCooldown > 0) {
          if (addToast) addToast('🏗️ Still recovering from your last build! ' + structureCooldown + ' turn(s) remaining.', 'info');
          return;
        }
        if (craftedThisTurn) {
          if (addToast) addToast('You can only craft one item per turn! Take an action first.', 'info');
          return;
        }
        updMulti({ actionLoading: true, actionResult: null });
        var vocabList = targetVocab.length > 0 ? targetVocab.join(', ') : '';
        var prompt = 'You evaluate creative item descriptions in a literary RPG for ' + gradeLevel + ' students.\n' +
          getGradeCalibration(gradeLevel) + '\n' +
          'WORLD: ' + (world ? world.name : 'Fantasy') + '\n' +
          'PLAYER: ' + (characterName || 'Adventurer') + ' (' + (characterClass || 'explorer') + ')\n' +
          'LOCATION: ' + (room ? room.name : 'the world') + '\n\n' +
          'The student describes an item they want to craft:\n"""\n' + description + '\n"""\n\n' +
          'EVALUATE:\n' +
          '1. WRITING QUALITY (0-60): vivid detail (0-15), vocabulary (0-15), creativity (0-15), grammar (0-15)\n' +
          '2. DESCRIPTIVE RICHNESS (0-20): Does the description make you SEE, FEEL, and UNDERSTAND the item? Sensory details, material descriptions, history/origin?\n' +
          '3. VOCABULARY USAGE (0-20): ' + (vocabList ? 'Award +5 per target vocabulary word used correctly: ' + vocabList : 'Award points for sophisticated, domain-specific language') + '\n\n' +
          'TOTAL = writing + richness + vocab (0-100)\n' +
          'Item power/rarity scales with score: 0-24=Common, 25-49=Uncommon, 50-74=Rare, 75-100=Legendary\n\n' +
          'Create the item based on their description. The quality of the item MATCHES the quality of the writing.\n' +
          'Poor description = flimsy, unremarkable item. Vivid description = extraordinary, powerful item.\n\n' +
          'Return ONLY JSON:\n' +
          '{"totalScore":0-100,"writingScore":0-60,"richnessScore":0-20,"vocabScore":0-20,' +
          '"itemName":"creative name based on description",' +
          '"itemEmoji":"single appropriate emoji",' +
          '"itemDesc":"2-3 sentences describing the crafted item, quality matching writing quality",' +
          '"itemType":"weapon|armor|tool|charm|potion|artifact",' +
          '"itemPower":0-30,' +
          '"specialAbility":"one unique ability the item has (or null for weak items)",' +
          '"battleBonus":"brief description of combat advantage (or null)",' +
          '"vocabHighlights":["vocabulary words used"],' +
          '"feedback":"one encouraging sentence about the crafting description"}';
        callGemini(prompt, true).then(function(result) {
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var item = JSON.parse(cleaned);
            // Durability scales with quality: Common=2, Uncommon=3, Rare=5, Legendary=8
            // Potions are single-use regardless of quality
            var isPotion = (item.itemType || '').toLowerCase() === 'potion';
            var maxDur = isPotion ? 1 : item.totalScore >= 75 ? 8 : item.totalScore >= 50 ? 5 : item.totalScore >= 25 ? 3 : 2;
            var newItem = {
              name: item.itemName, emoji: item.itemEmoji, desc: item.itemDesc,
              type: item.itemType, power: item.itemPower || 0,
              specialAbility: item.specialAbility, battleBonus: item.battleBonus,
              quality: item.totalScore, craftedAt: room ? room.name : 'unknown',
              durability: maxDur, maxDurability: maxDur
            };
            var tier = getQualityTier(item.totalScore);
            var xp = item.totalScore >= 75 ? 25 : item.totalScore >= 50 ? 15 : 8;
            var newVocab = vocabTermsUsed.concat(item.vocabHighlights || []);
            updMulti({
              inventory: inventory.concat([newItem]),
              actionResult: { qualityScore: item.totalScore, narrative: item.itemDesc, feedback: item.feedback, vocabHighlights: item.vocabHighlights || [],
                breakdown: { writing: item.writingScore, richness: item.richnessScore, vocab: item.vocabScore } },
              actionLoading: false, actionText: '', craftedThisTurn: true,
              totalXP: totalXP + xp, vocabTermsUsed: newVocab,
              legendaryActions: legendaryActions + (item.totalScore >= 75 ? 1 : 0),
            });
            if (awardStemXP) awardStemXP(xp);
            if (item.totalScore >= 75 && stemCelebrate) stemCelebrate();
            var durLabel = isPotion ? 'Single-use' : maxDur + ' uses';
            if (addToast) addToast(tier.emoji + ' Crafted: ' + item.itemEmoji + ' ' + item.itemName + ' (' + durLabel + ')', 'success');
            if (announceToSR) announceToSR('Item crafted: ' + item.itemName + '. Quality: ' + tier.label + '. Durability: ' + durLabel + '. ' + item.itemDesc);
          } catch(e) { updMulti({ actionResult: { qualityScore: 0, narrative: 'The materials crumble... Describe your item with more vivid detail!', feedback: __alloT('stem.worldbuilder.try_describing_what_it_looks_like_feel', 'Try describing what it looks like, feels like, and what it\'s made of.') }, actionLoading: false }); }
        }).catch(function() { updMulti({ actionLoading: false }); });
      };

      // ── Use inventory item in battle ──
      var useItemInBattle = function(item) {
        if (!activeBattle || !item) return;
        updMulti({ activeItem: item });
        if (addToast) addToast(item.emoji + ' ' + item.name + ' readied! Write your attack using it.', 'info');
        if (announceToSR) announceToSR(item.name + ' equipped. Describe how you use it in your next action.');
      };

      // ── Initialize NPC with rapport & quests ──
      var initNPCRelationship = function(npc) {
        var npcKey = npc.name;
        var currentRapport = npcRapport[npcKey];
        var currentQuests = npcQuests[npcKey];
        // Only initialize if not already tracked
        if (currentRapport === undefined) {
          var newRapport = Object.assign({}, npcRapport);
          newRapport[npcKey] = npc.initialRapport || 10;
          upd('npcRapport', newRapport);
        }
        if (!currentQuests) {
          // Generate quests for this NPC based on their backstory
          if (callGemini) {
            var qPrompt = 'Create 3 quests for an NPC in a literary RPG for ' + gradeLevel + ' students.\n' +
              'NPC: ' + npc.name + ' (' + npc.role + ')\nBackstory: ' + npc.backstory + '\n' +
              'Situation: ' + npc.currentSituation + '\nSEL Theme: ' + (npc.selTheme || 'relationship-skills') + '\n\n' +
              'Each quest should require the student to demonstrate empathy, communication, or understanding to complete.\n' +
              'Quests unlock at different rapport levels (trust must be earned through quality conversation).\n\n' +
              'Return ONLY JSON:\n[{"id":"q1","text":"objective text","difficulty":15,"isCompleted":false},' +
              '{"id":"q2","text":"deeper objective","difficulty":40,"isCompleted":false},' +
              '{"id":"q3","text":"most meaningful objective","difficulty":70,"isCompleted":false}]';
            callGemini(qPrompt, true).then(function(result) {
              try {
                var cleaned = result.trim();
                if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
                var quests = JSON.parse(cleaned);
                if (Array.isArray(quests)) {
                  var newQuests = Object.assign({}, npcQuests);
                  newQuests[npcKey] = quests;
                  upd('npcQuests', newQuests);
                }
              } catch(e) {}
            }).catch(function() {});
          }
        }
      };

      // ── NPC SEL Interaction ──
      var interactWithNPC = function(npc) {
        initNPCRelationship(npc);
        updMulti({ activeNPC: npc, actionMode: 'npc' });
      };

      var respondToNPC = function() {
        if (!callGemini || !actionText.trim() || !activeNPC) return;
        updMulti({ actionLoading: true, actionResult: null });
        var npcKey = activeNPC.name;
        var currentRapport = npcRapport[npcKey] !== undefined ? npcRapport[npcKey] : 10;
        var currentQuests = npcQuests[npcKey] || [];
        var activeQuestTexts = currentQuests.filter(function(q) { return !q.isCompleted && q.difficulty <= currentRapport; })
          .map(function(q) { return q.id + ': ' + q.text; }).join('; ');
        var lockedQuestTexts = currentQuests.filter(function(q) { return !q.isCompleted && q.difficulty > currentRapport; })
          .map(function(q) { return q.text + ' (needs rapport ' + q.difficulty + ')'; }).join('; ');
        var prompt = 'You narrate a literary RPG emphasizing SEL and restorative justice for ' + gradeLevel + ' students.\n' +
          getGradeCalibration(gradeLevel) +
          'NPC: ' + activeNPC.name + ' (' + activeNPC.role + ') — ' + activeNPC.backstory + '\n' +
          'Personality: ' + activeNPC.personality + '\nSituation: ' + activeNPC.currentSituation + '\n' +
          'SEL Theme: ' + activeNPC.selTheme + '\nConflict: ' + (activeNPC.conflictType || 'interpersonal') + '\n' +
          'Resolution looks like: ' + activeNPC.resolution + '\n\n' +
          'RAPPORT LEVEL: ' + currentRapport + '/100 (higher = more trust, NPC shares more)\n' +
          (activeQuestTexts ? 'ACTIVE QUESTS (unlocked): ' + activeQuestTexts + '\n' : '') +
          (lockedQuestTexts ? 'LOCKED QUESTS (need more rapport): ' + lockedQuestTexts + '\n' : '') +
          '\nPlayer responds:\n"""\n' + actionText + '\n"""\n\n' +
          'EVALUATE:\n1. WRITING QUALITY (0-50): detail, vocabulary, creativity, grammar, effort\n' +
          '2. SEL QUALITY (0-50): empathy(0-15), communication(0-10), problem-solving(0-10), self-awareness(0-10), accountability(0-5)\n' +
          'TOTAL = writing + SEL (0-100)\n\n' +
          'RAPPORT CHANGE: Based on the student\'s response quality:\n' +
          '- Empathetic, thoughtful response: +5 to +15 rapport\n' +
          '- Neutral/minimal response: +0 to +3 rapport\n' +
          '- Dismissive or rude: -5 to -10 rapport\n\n' +
          'QUEST COMPLETION: If the student\'s response satisfies an active quest objective, mark its id as completedQuestId.\n\n' +
          'NPC responds IN CHARACTER — at low rapport (<30), NPC is guarded. At medium (30-60), warmer. At high (>60), deeply trusting.\n' +
          'The NPC\'s response should reflect the current trust level. Model healthy communication.\n' +
          (targetVocab.length > 0 ? 'VOCAB BONUS: +5 per word: ' + targetVocab.join(', ') + '\n' : '') +
          'Return ONLY JSON:\n' +
          '{"totalScore":N,"writingScore":N,"selScore":N,' +
          '"selBreakdown":{"empathy":N,"communication":N,"problemSolving":N,"selfAwareness":N,"accountability":N},' +
          '"rapportChange":integer,' +
          '"completedQuestId":"quest id or null",' +
          '"npcResponse":"3-5 sentences in character, modeling healthy communication, trust level reflecting rapport",' +
          '"npcVisualReaction":"brief description of NPC body language/expression",' +
          '"narrative":"1-2 sentences describing scene and emotional atmosphere",' +
          '"progressToward":"not-started|beginning|progressing|near-resolution|resolved",' +
          '"resolved":false,' +
          '"writingFeedback":"one sentence","selFeedback":"one sentence",' +
          '"vocabHighlights":[],"selSkillDemonstrated":"CASEL skill or none"}';
        callGemini(prompt, true).then(function(result) {
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var r = JSON.parse(cleaned);
            var xp = r.totalScore >= 75 ? 25 : r.totalScore >= 50 ? 15 : 8;
            var rapportDelta = parseInt(r.rapportChange) || 0;
            var newRapport = Math.max(0, Math.min(100, currentRapport + rapportDelta));

            // Update rapport
            var updatedRapport = Object.assign({}, npcRapport);
            updatedRapport[npcKey] = newRapport;

            // Update quests if completed
            var updatedQuests = Object.assign({}, npcQuests);
            var questCompleted = false;
            if (r.completedQuestId && updatedQuests[npcKey]) {
              updatedQuests[npcKey] = updatedQuests[npcKey].map(function(q) {
                if (q.id === r.completedQuestId && !q.isCompleted) { questCompleted = true; return Object.assign({}, q, { isCompleted: true }); }
                return q;
              });
            }

            // Harmony score for multi-NPC scenarios
            var harmonyDelta = rapportDelta > 0 ? Math.round(rapportDelta / 2) : 0;
            var newHarmony = Math.max(0, Math.min(100, harmonyScore + harmonyDelta));

            // Bonus XP for quest completion
            if (questCompleted) xp += 20;
            // Bonus XP for rapport gains
            if (rapportDelta > 5) xp += 5;

            updMulti({
              actionResult: r, actionLoading: false, actionText: '',
              npcRapport: updatedRapport, npcQuests: updatedQuests,
              harmonyScore: newHarmony,
              completedQuests: completedQuests + (questCompleted ? 1 : 0),
              npcHistory: npcHistory.concat([{ npc: activeNPC.name, score: r.totalScore, sel: r.selScore, rapport: newRapport }]),
              selSkillsUsed: r.selSkillDemonstrated && r.selSkillDemonstrated !== 'none' ? selSkillsUsed.concat([r.selSkillDemonstrated]) : selSkillsUsed,
              conflictsResolved: conflictsResolved + (r.resolved ? 1 : 0),
              writingPower: Math.min(100, writingPower + (r.totalScore >= 50 ? 3 : 0)),
              totalXP: totalXP + xp,
              activeNPC: r.resolved ? null : activeNPC,
              actionMode: r.resolved ? 'action' : 'npc',
              craftedThisTurn: false, // reset craft per-turn limit after NPC interaction
              structureCooldown: Math.max(0, structureCooldown - 1),
            });
            if (awardStemXP) awardStemXP(xp);
            if (rapportDelta > 0 && addToast) addToast('💛 Rapport +' + rapportDelta + ' with ' + activeNPC.name, 'success');
            if (rapportDelta < 0 && addToast) addToast('💔 Rapport ' + rapportDelta + ' with ' + activeNPC.name, 'info');
            if (questCompleted) { if (addToast) addToast('⭐ Quest completed with ' + activeNPC.name + '! +20 XP', 'success'); if (stemCelebrate) stemCelebrate(); }
            if (r.resolved && stemCelebrate) stemCelebrate();
            if (r.resolved && addToast) addToast('🤝 Resolved with ' + activeNPC.name + '!', 'success');
          } catch(e) { updMulti({ actionResult: { totalScore: 0, npcResponse: activeNPC.name + ' waits, uncertain.', selFeedback: 'Try acknowledging their feelings.' }, actionLoading: false }); }
        }).catch(function() { updMulti({ actionLoading: false }); });
      };

      // ── Teacher GM state ──
      var targetVocab = d.targetVocab || [];
      var gmMessage = d.gmMessage || null;
      var gmSceneImage = d.gmSceneImage || null;
      var playerBase = d.playerBase || null;
      var pasteDetected = d.pasteDetected || false;
      var lastInputTime = d.lastInputTime || 0;

      // ── Handwriting Capture state ──
      var hwPenmanshipOn = d.hwPenmanshipOn || false;        // student toggle
      var hwTeacherPenmanship = d.hwTeacherPenmanship || false; // teacher toggle
      var hwLoading = d.hwLoading || false;
      var hwResult = d.hwResult || null; // { text, penmanship: { score, feedback, strengths, tips } | null }

      var world = WORLDS.find(function(w) { return w.id === selectedWorld; });
      var room = world ? world.rooms.find(function(r) { return r.id === currentRoom; }) : null;

      // ── Handwriting Capture ──
      var handleHandwritingCapture = function(e) {
        var file = e.target.files && e.target.files[0];
        if (!file || !callGeminiVision) return;
        // Reset file input so the same file can be re-selected
        e.target.value = '';
        upd('hwLoading', true);
        var reader = new FileReader();
        reader.onload = function() {
          // Defensive split: a malformed data URL (no comma) would yield undefined
          // and silently hang the OCR call. Surface a friendly error instead.
          var parts = reader.result.split(',');
          var base64 = parts.length > 1 ? parts[1] : null;
          if (!base64) {
            upd('hwLoading', false);
            if (typeof addToast === 'function') addToast('Could not read handwriting image — try uploading a clearer photo', 'error');
            return;
          }
          var mimeType = file.type || 'image/png';
          var showPenmanship = hwPenmanshipOn || hwTeacherPenmanship;

          // Build OCR + optional penmanship prompt
          var prompt = 'You are an expert at reading student handwriting.\n\n' +
            'TASK 1 — TRANSCRIBE: Extract ALL handwritten text from this image exactly as written. ' +
            'Preserve the student\'s original wording, spelling, and punctuation — do NOT correct anything. ' +
            'If text is unclear, make your best guess and note uncertainty with [?].\n\n';

          if (showPenmanship) {
            prompt += 'TASK 2 — PENMANSHIP EVALUATION:\n' +
              getGradeCalibration(gradeLevel) +
              'Evaluate the handwriting quality for a ' + gradeLevel + ' student.\n' +
              'Score these areas (each 0-25, total 0-100):\n' +
              '- LETTER FORMATION (0-25): Are letters shaped correctly for this grade level? Consistent sizing?\n' +
              '- SPACING (0-25): Appropriate space between words? Letters not too cramped or spread out?\n' +
              '- ALIGNMENT (0-25): Writing follows the line? Consistent baseline? Not drifting up or down?\n' +
              '- NEATNESS (0-25): Overall legibility? Consistent pressure? Clean strokes?\n\n' +
              'Be encouraging and grade-appropriate. A kindergartner\'s big wobbly letters can still score well if they show effort and are recognizable.\n\n' +
              'Return ONLY JSON:\n' +
              '{"text":"the transcribed handwriting exactly as written",' +
              '"penmanship":{"score":0-100,' +
              '"letterFormation":0-25,"spacing":0-25,"alignment":0-25,"neatness":0-25,' +
              '"strengths":"1-2 specific things done well (e.g. \'Your letter g has great descenders!\')",' +
              '"tips":"1-2 encouraging, specific suggestions for improvement",' +
              '"legibility":"easy|moderate|difficult"}}';
          } else {
            prompt += 'Return ONLY JSON:\n{"text":"the transcribed handwriting exactly as written"}';
          }

          callGeminiVision(prompt, base64, mimeType).then(function(result) {
            try {
              var cleaned = result.trim();
              if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
              var parsed = JSON.parse(cleaned);
              updMulti({
                actionText: parsed.text || '',
                hwResult: parsed,
                hwLoading: false
              });
              if (addToast) addToast('✍️ Handwriting converted! ' + (parsed.penmanship ? 'Penmanship tips ready.' : 'You can edit before submitting.'), 'success');
              if (announceToSR) announceToSR('Handwriting converted to text.' + (parsed.penmanship ? ' Penmanship tips ready below.' : ' You may edit the text before submitting.'));
            } catch(err) {
              // Fallback: treat entire result as plain text
              updMulti({ actionText: result.trim(), hwResult: { text: result.trim() }, hwLoading: false });
              if (addToast) addToast('✍️ Handwriting converted to text!', 'success');
            }
          }).catch(function() {
            upd('hwLoading', false);
            if (addToast) addToast('Could not read handwriting — try a clearer photo', 'error');
          });
        };
        reader.readAsDataURL(file);
      };

      // ── Paste detection ──
      var handleActionInput = function(e) {
        upd('actionText', e.target.value);
        upd('lastInputTime', Date.now());
      };
      var handleActionPaste = function(e) {
        var pastedText = (e.clipboardData || window.clipboardData).getData('text');
        if (pastedText && pastedText.length > 30) {
          e.preventDefault();
          upd('pasteDetected', true);
          if (addToast) addToast('Pasting is disabled in World Builder — your writing must be your own! ✍️', 'info');
          if (announceToSR) announceToSR('Pasting text is not allowed. Please type your own writing.');
          return;
        }
      };

      // ── Build Structure (3-turn cooldown) ──
      var buildStructure = function(description) {
        if (!callGemini || !description.trim()) return;
        if (structureCooldown > 0) {
          if (addToast) addToast('🏗️ Still recovering from your last build! ' + structureCooldown + ' turn(s) until you can craft again.', 'info');
          return;
        }
        updMulti({ actionLoading: true, actionResult: null });
        var vocabList = targetVocab.length > 0 ? targetVocab.join(', ') : '';
        var prompt = 'A student in a ' + gradeLevel + ' literary RPG wants to build a structure in "' + (room ? room.name + ' — ' + room.desc : 'the world') + '".\n' +
          getGradeCalibration(gradeLevel) +
          'WORLD: ' + (world ? world.name : 'Fantasy') + '\n' +
          'Their description:\n"""\n' + description + '\n"""\n\n' +
          'EVALUATE:\n' +
          '1. WRITING QUALITY (0-60): vivid detail (0-15), vocabulary (0-15), creativity (0-15), grammar (0-15)\n' +
          '2. ARCHITECTURAL VISION (0-20): Does the description convey materials, scale, purpose, and atmosphere? Can you picture this structure?\n' +
          '3. VOCABULARY USAGE (0-20): ' + (vocabList ? 'Award +5 per target vocabulary word used correctly: ' + vocabList : 'Sophisticated, domain-specific language') + '\n\n' +
          'TOTAL = writing + vision + vocab (0-100)\n' +
          'Quality determines impressiveness: 0-24=Shack, 25-49=Outpost, 50-74=Stronghold, 75-100=Monument\n\n' +
          'The quality of the structure MATCHES the quality of the writing.\n' +
          'Poor description = rickety, forgettable structure. Vivid description = awe-inspiring, legendary building.\n\n' +
          'Return ONLY JSON:\n' +
          '{"totalScore":0-100,"writingScore":0-60,"visionScore":0-20,"vocabScore":0-20,' +
          '"structureName":"creative name",' +
          '"structureEmoji":"single emoji",' +
          '"structureDesc":"2-3 sentences describing the structure as it appears in the world, quality matching writing",' +
          '"structureType":"shelter|workshop|tower|shrine|bridge|market|fortress|monument|garden|library",' +
          '"structureBonus":"one gameplay benefit this structure provides (e.g., +5 defense, healing, crafting bonus)",' +
          '"vocabHighlights":["vocabulary words used"],' +
          '"feedback":"one encouraging sentence about the architectural writing"}';
        callGemini(prompt, true).then(function(result) {
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var s = JSON.parse(cleaned);
            var newStructure = {
              name: s.structureName, emoji: s.structureEmoji, desc: s.structureDesc,
              type: s.structureType, bonus: s.structureBonus,
              quality: s.totalScore, roomId: currentRoom, builtBy: characterName || 'Adventurer'
            };
            var tier = getQualityTier(s.totalScore);
            var xp = s.totalScore >= 75 ? 35 : s.totalScore >= 50 ? 20 : 10;
            var newVocab = vocabTermsUsed.concat(s.vocabHighlights || []);
            updMulti({
              structures: structures.concat([newStructure]),
              structureCooldown: 3, // 3-turn cooldown
              craftedThisTurn: true,
              actionResult: { qualityScore: s.totalScore, narrative: s.structureDesc, feedback: s.feedback, vocabHighlights: s.vocabHighlights || [],
                breakdown: { writing: s.writingScore, vision: s.visionScore, vocab: s.vocabScore } },
              actionLoading: false, actionText: '',
              totalXP: totalXP + xp, vocabTermsUsed: newVocab,
              legendaryActions: legendaryActions + (s.totalScore >= 75 ? 1 : 0),
            });
            if (awardStemXP) awardStemXP(xp);
            if (s.totalScore >= 75 && stemCelebrate) stemCelebrate();
            if (addToast) addToast(tier.emoji + ' Built: ' + s.structureEmoji + ' ' + s.structureName + '! (3-turn cooldown)', 'success');
            if (announceToSR) announceToSR('Structure built: ' + s.structureName + '. Quality: ' + tier.label + '. You cannot craft again for 3 turns.');
          } catch(e) { updMulti({ actionResult: { qualityScore: 0, narrative: 'The foundation crumbles... Describe your structure with more vivid architectural detail!', feedback: __alloT('stem.worldbuilder.try_describing_materials_scale_and_wha', 'Try describing materials, scale, and what makes this building unique.') }, actionLoading: false }); }
        }).catch(function() { updMulti({ actionLoading: false }); });
      };

      // ── PvE Battle System ──
      var activeBattle = d.activeBattle || null;
      var battleLog = d.battleLog || [];

      var ENCOUNTERS = {
        fantasy: [
          { id: 'shadow_wolf', name: __alloT('stem.worldbuilder.shadow_wolf', 'Shadow Wolf'), emoji: '🐺', hp: 60, power: 35, desc: __alloT('stem.worldbuilder.a_wolf_made_of_living_shadow_its_eyes_', 'A wolf made of living shadow, its eyes burning like cold stars.'), weakness: 'light, fire, warmth' },
          { id: 'stone_golem', name: __alloT('stem.worldbuilder.stone_golem', 'Stone Golem'), emoji: '🗿', hp: 100, power: 25, desc: __alloT('stem.worldbuilder.an_ancient_guardian_of_carved_stone_sl', 'An ancient guardian of carved stone, slow but nearly indestructible.'), weakness: 'water, erosion, music' },
          { id: 'riddle_sphinx', name: __alloT('stem.worldbuilder.riddle_sphinx', 'Riddle Sphinx'), emoji: '🦁', hp: 80, power: 50, desc: __alloT('stem.worldbuilder.a_winged_lion_with_a_human_face_who_sp', 'A winged lion with a human face who speaks in puzzles and paradoxes.'), weakness: 'cleverness, logic, wordplay' },
          { id: 'frost_drake', name: __alloT('stem.worldbuilder.frost_drake', 'Frost Drake'), emoji: '🐉', hp: 120, power: 60, desc: __alloT('stem.worldbuilder.a_young_dragon_of_ice_and_wind_its_bre', 'A young dragon of ice and wind, its breath freezing everything it touches.'), weakness: 'fire, determination, courage' },
        ],
        scifi: [
          { id: 'rogue_ai', name: __alloT('stem.worldbuilder.rogue_ai', 'Rogue AI'), emoji: '🤖', hp: 70, power: 45, desc: __alloT('stem.worldbuilder.a_malfunctioning_ai_that_has_taken_con', 'A malfunctioning AI that has taken control of the station\'s defense systems.'), weakness: 'logic puzzles, empathy, overloading' },
          { id: 'void_entity', name: __alloT('stem.worldbuilder.void_entity', 'Void Entity'), emoji: '👾', hp: 90, power: 55, desc: __alloT('stem.worldbuilder.a_being_from_the_space_between_stars_e', 'A being from the space between stars, existing as pure electromagnetic interference.'), weakness: 'communication, containment fields, harmony' },
          { id: 'nano_swarm', name: __alloT('stem.worldbuilder.nano_swarm', 'Nano Swarm'), emoji: '🦠', hp: 50, power: 40, desc: __alloT('stem.worldbuilder.a_cloud_of_self_replicating_nanobots_c', 'A cloud of self-replicating nanobots consuming everything in their path.'), weakness: 'EMP, extreme cold, magnetic fields' },
        ],
        mystery: [
          { id: 'the_shadow', name: __alloT('stem.worldbuilder.the_shadow', 'The Shadow'), emoji: '👤', hp: 60, power: 40, desc: __alloT('stem.worldbuilder.a_mysterious_figure_that_appears_in_mi', 'A mysterious figure that appears in mirrors and darkened hallways, always watching.'), weakness: 'light, truth, confrontation' },
          { id: 'cursed_book', name: __alloT('stem.worldbuilder.the_cursed_tome', 'The Cursed Tome'), emoji: '📕', hp: 80, power: 50, desc: __alloT('stem.worldbuilder.a_sentient_book_that_rewrites_reality_', 'A sentient book that rewrites reality around it, trapping readers in its pages.'), weakness: 'original stories, creative thinking, fire' },
          { id: 'poltergeist', name: __alloT('stem.worldbuilder.the_poltergeist', 'The Poltergeist'), emoji: '👻', hp: 70, power: 35, desc: __alloT('stem.worldbuilder.a_restless_spirit_that_hurls_objects_a', 'A restless spirit that hurls objects and screams in forgotten languages.'), weakness: 'calm, music, understanding its story' },
        ],
        historical: [
          { id: 'sandstorm', name: __alloT('stem.worldbuilder.the_living_sandstorm', 'The Living Sandstorm'), emoji: '🌪️', hp: 80, power: 45, desc: __alloT('stem.worldbuilder.a_massive_storm_with_a_mind_of_its_own', 'A massive storm with a mind of its own, guardian of the desert trade routes.'), weakness: 'water, patience, navigation' },
          { id: 'sea_serpent', name: __alloT('stem.worldbuilder.the_harbor_serpent', 'The Harbor Serpent'), emoji: '🐍', hp: 100, power: 50, desc: __alloT('stem.worldbuilder.an_enormous_sea_creature_that_blocks_t', 'An enormous sea creature that blocks the harbor, demanding tribute.'), weakness: 'negotiation, music, bravery' },
          { id: 'labyrinth', name: __alloT('stem.worldbuilder.the_living_labyrinth', 'The Living Labyrinth'), emoji: '🏛️', hp: 90, power: 40, desc: __alloT('stem.worldbuilder.the_maze_itself_is_alive_shifting_its_', 'The maze itself is alive, shifting its walls to trap unwary explorers.'), weakness: 'mapping, logic, perseverance' },
        ],
      };

      var startBattle = function() {
        var worldEncounters = ENCOUNTERS[selectedWorld] || ENCOUNTERS.fantasy;
        var encounter = worldEncounters[Math.floor(Math.random() * worldEncounters.length)];
        updMulti({ activeBattle: { ...encounter, currentHp: encounter.hp, playerHits: 0, rounds: 0 }, actionMode: 'battle' });
        if (announceToSR) announceToSR('Battle started! ' + encounter.name + ' appears! ' + encounter.desc);
        if (stemBeep) stemBeep(440, 0.15, 0.3);
        if (addToast) addToast(encounter.emoji + ' ' + encounter.name + ' appears!', 'info');
      };

      var performBattleAction = function() {
        if (!callGemini || !actionText.trim() || !activeBattle) return;
        updMulti({ actionLoading: true, actionResult: null });

        var prompt = 'You are the battle narrator AND a master literary writer for a literary RPG for ' + gradeLevel + ' students.\n' +
          getGradeCalibration(gradeLevel) + '\n' +
          'WORLD: ' + (world ? world.name : 'Unknown') + '\n' +
          'LOCATION: ' + (room ? room.name + ' — ' + room.desc : 'Unknown') + '\n' +
          'ENEMY: ' + activeBattle.name + ' — ' + activeBattle.desc + '\n' +
          'Enemy HP: ' + activeBattle.currentHp + '/' + activeBattle.hp + '\n' +
          'Enemy Power: ' + activeBattle.power + '\n' +
          'Enemy Weakness: ' + activeBattle.weakness + '\n' +
          'Player: ' + (characterName || 'Adventurer') + ' (Power: ' + writingPower + '/100)\n' +
          (activeItem ? 'EQUIPPED ITEM: ' + activeItem.emoji + ' ' + activeItem.name + ' (Power: ' + activeItem.power + ') — ' + (activeItem.battleBonus || activeItem.specialAbility || 'crafted item') + '\nIf the player references or uses this item effectively, add +' + Math.min(activeItem.power, 20) + ' bonus damage.\n' : '') +
          'Round: ' + (activeBattle.rounds + 1) + '\n\n' +
          'The player writes this battle action:\n"""\n' + actionText + '\n"""\n\n' +
          'YOUR JOB HAS TWO PARTS:\n\n' +
          'PART 1 — EVALUATE THE PLAYER\'S WRITING:\n' +
          'Score writing quality (0-100): vivid detail (0-20), vocabulary (0-20), creativity (0-20), grammar (0-20), effort (0-20).\n\n' +
          'PART 2 — EVALUATE STRATEGIC THINKING:\n' +
          'Score strategy (0-30 bonus points) based on:\n' +
          '- Did they exploit the enemy\'s weakness? (+10)\n' +
          '- Did they use the environment/location creatively? (+10)\n' +
          '- Did they consider defense or positioning, not just attack? (+5)\n' +
          '- Did they build on previous rounds or adapt their approach? (+5)\n\n' +
          'FINAL SCORE = min(100, writing quality + strategy bonus)\n\n' +
          'PART 3 — THE ENEMY WRITES BACK:\n' +
          'Write the enemy\'s action as a LITERARY MODEL — vivid, evocative prose that demonstrates excellent writing.\n' +
          'The enemy\'s writing should serve as a mentor text showing the student what great descriptive writing looks like.\n' +
          'Match the enemy\'s personality: a Sphinx speaks in riddles, a Frost Drake\'s prose is cold and sharp, a Rogue AI speaks in precise logic.\n' +
          'The enemy\'s writing should be ' + gradeLevel + '-appropriate but aspirational — slightly above the student\'s level to model growth.\n\n' +
          (targetVocab.length > 0 ? 'VOCAB BONUS: +5 per target vocabulary word used correctly: ' + targetVocab.join(', ') + '\n' : '') +
          'Damage dealt = final score. Damage taken = ' + activeBattle.power + ' minus (final score / 3).\n\n' +
          'PART 4 — ILLUSTRATION PROMPT:\n' +
          'Write a brief (max 30 words) image generation prompt capturing the dramatic moment of this battle exchange.\n\n' +
          'Return ONLY JSON:\n' +
          '{\n' +
          '  "qualityScore": 0-100,\n' +
          '  "strategyScore": 0-30,\n' +
          '  "finalScore": 0-100,\n' +
          '  "damageDealt": 0-100,\n' +
          '  "damageTaken": 0-50,\n' +
          '  "weaknessExploited": true/false,\n' +
          '  "environmentUsed": true/false,\n' +
          '  "narrative": "2-3 sentences of the player\'s action outcome, quality matching the writing quality.",\n' +
          '  "enemyWriting": "3-5 sentences of VIVID LITERARY PROSE from the enemy\'s perspective — this is the mentor text. Show, don\'t tell. Use sensory details, figurative language, and the enemy\'s unique voice. This should model excellent writing for the student.",\n' +
          '  "strategyFeedback": "One sentence about the strategic quality of their decision",\n' +
          '  "writingFeedback": "One encouraging sentence about their writing — what was strong, what could be stronger",\n' +
          '  "vocabHighlights": ["sophisticated words the student used"],\n' +
          '  "breakdown": {"detail": 0-20, "vocabulary": 0-20, "creativity": 0-20, "grammar": 0-20, "effort": 0-20},\n' +
          '  "illustrationPrompt": "Brief dramatic scene description for image generation, fantasy/scifi art style, no text"\n' +
          '}';

        callGemini(prompt, true).then(function(result) {
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var action = JSON.parse(cleaned);
            var effectiveScore = action.finalScore || action.qualityScore || 0;
            var newHp = Math.max(0, activeBattle.currentHp - (action.damageDealt || effectiveScore));
            var newPower = Math.max(0, Math.min(100, writingPower - (action.damageTaken || 0) / 5 + (effectiveScore >= 75 ? 5 : 0)));
            var defeated = newHp <= 0;
            var tier = getQualityTier(effectiveScore);
            var newBattleLog = battleLog.concat([{ enemy: activeBattle.name, score: effectiveScore, damage: action.damageDealt || effectiveScore, strategy: action.strategyScore || 0, round: activeBattle.rounds + 1 }]);
            var newVocab = vocabTermsUsed.concat(action.vocabHighlights || []);

            // Generate battle illustration with character consistency
            if (callImagen && action.illustrationPrompt) {
              var battleImgPrompt = action.illustrationPrompt + ' Epic battle scene, dramatic lighting, no text.' +
                (characterAppearance ? ' The hero: ' + characterAppearance + '.' : '');
              callImagen(battleImgPrompt, 400, 0.8).then(function(img) {
                upd('battleImage', img);
                if (characterPortrait && callGeminiImageEdit) applyCharacterConsistency(img);
              }).catch(function() {});
            }

            // Degrade equipped item durability after use
            var updatedInventory = inventory;
            var updatedActiveItem = activeItem;
            if (activeItem) {
              updatedInventory = inventory.map(function(it) {
                if (it.name === activeItem.name && it.craftedAt === activeItem.craftedAt) {
                  return Object.assign({}, it, { durability: Math.max(0, (it.durability || 1) - 1) });
                }
                return it;
              });
              var degraded = updatedInventory.find(function(it) { return it.name === activeItem.name && it.craftedAt === activeItem.craftedAt; });
              if (degraded && degraded.durability <= 0) {
                // Item broke!
                updatedInventory = updatedInventory.filter(function(it) { return !(it.name === activeItem.name && it.craftedAt === activeItem.craftedAt); });
                updatedActiveItem = null;
                if (addToast) addToast('💔 ' + activeItem.emoji + ' ' + activeItem.name + ' broke!', 'info');
                if (announceToSR) announceToSR(activeItem.name + ' has broken from use.');
              } else {
                updatedActiveItem = degraded;
              }
            }

            var updates = {
              actionResult: action,
              actionLoading: false,
              actionText: '',
              writingPower: Math.round(newPower),
              battleLog: newBattleLog,
              vocabTermsUsed: newVocab,
              activeBattle: defeated ? null : { ...activeBattle, currentHp: newHp, rounds: activeBattle.rounds + 1, playerHits: activeBattle.playerHits + 1 },
              craftedThisTurn: false,
              inventory: updatedInventory,
              activeItem: defeated ? null : updatedActiveItem,
              structureCooldown: Math.max(0, structureCooldown - 1),
            };

            if (defeated) {
              updates.battlesWon = (d.battlesWon || 0) + 1;
              updates.totalXP = totalXP + 50;
              updates.legendaryActions = legendaryActions + (action.qualityScore >= 75 ? 1 : 0);
              updates.actionMode = 'action';
              if (awardStemXP) awardStemXP(50);
              if (stemCelebrate) stemCelebrate();
              if (addToast) addToast('🎉 ' + activeBattle.name + ' defeated! +50 XP!', 'success');
            } else {
              if (awardStemXP) awardStemXP(action.qualityScore >= 50 ? 15 : 5);
            }
            updMulti(updates);
            if (announceToSR) announceToSR('Round ' + (activeBattle.rounds + 1) + ': ' + action.narrative + (defeated ? ' Enemy defeated!' : ' Enemy HP: ' + newHp));
          } catch(e) {
            updMulti({ actionResult: { qualityScore: 0, narrative: 'Your attack goes wide! Focus your writing!', feedback: __alloT('stem.worldbuilder.try_describing_how_you_attack_with_sen', 'Try describing HOW you attack with sensory details.'), breakdown: {} }, actionLoading: false });
          }
        }).catch(function() { updMulti({ actionLoading: false }); });
      };

      // ── Perform action (the core mechanic) ──
      var performAction = function() {
        if (!callGemini || !actionText.trim() || !room) return;
        if (pasteDetected) { upd('pasteDetected', false); if (addToast) addToast('Write your own words to take action!', 'info'); return; }
        updMulti({ actionLoading: true, actionResult: null });

        var prompt = 'You are the narrator of a collaborative literary RPG for ' + gradeLevel + ' students.\n' +
          getGradeCalibration(gradeLevel) + '\n' +
          'WORLD: ' + (world ? world.name : 'Unknown') + '\n' +
          'LOCATION: ' + room.name + ' — ' + room.desc + '\n' +
          'CHARACTER: ' + (characterName || 'Adventurer') + (characterClass ? ' (' + characterClass + ')' : '') + '\n' +
          'WRITING POWER LEVEL: ' + writingPower + '/100\n\n' +
          'The player writes this action:\n"""\n' + actionText + '\n"""\n\n' +
          'EVALUATE the writing quality on these criteria (each 0-20, total 0-100):\n' +
          '1. VIVID DETAIL (0-20): Sensory language, specific descriptions, show-don\'t-tell\n' +
          '2. VOCABULARY (0-20): Sophisticated word choice, precise language, domain-specific terms\n' +
          '3. CREATIVITY (0-20): Original ideas, unexpected connections, imaginative scenarios\n' +
          '4. GRAMMAR & FLOW (0-20): Sentence variety, proper mechanics, rhythmic prose\n' +
          '5. LENGTH & EFFORT (0-20): Substantial writing (>30 words gets 10+, >60 gets 15+, >100 gets 20)\n\n' +
          'The QUALITY SCORE (0-100) directly determines the action\'s effectiveness:\n' +
          '- Score 0-24: Action barely succeeds. Narrate a weak, fumbling outcome.\n' +
          '- Score 25-49: Action partially succeeds. Narrate a moderate outcome with some setback.\n' +
          '- Score 50-74: Action succeeds well. Narrate a satisfying, effective outcome.\n' +
          '- Score 75-100: LEGENDARY action. Narrate an extraordinary, memorable outcome. The world itself responds to the quality of the writing.\n\n' +
          (targetVocab.length > 0 ? 'VOCABULARY BONUS: The teacher has set these target vocabulary words: ' + targetVocab.join(', ') + '. Award +5 bonus to qualityScore for EACH target word used correctly in context.\n\n' : '') +
          'CRITICAL: The narrative outcome MUST reflect the writing quality. Beautiful writing = beautiful outcomes. Lazy writing = disappointing outcomes. This IS the game mechanic.\n\n' +
          'Return ONLY JSON:\n' +
          '{\n' +
          '  "qualityScore": 0-100,\n' +
          '  "breakdown": {"detail": 0-20, "vocabulary": 0-20, "creativity": 0-20, "grammar": 0-20, "effort": 0-20},\n' +
          '  "narrative": "2-4 sentences describing what happens as a result of the action. Match the quality of the narrative to the quality of the writing.",\n' +
          '  "powerChange": -10 to +20,\n' +
          '  "xpEarned": 5-50,\n' +
          '  "feedback": "One encouraging sentence about their writing — what was strong, what could be stronger.",\n' +
          '  "vocabHighlights": ["any sophisticated or domain-specific words the student used"],\n' +
          '  "discoveredItem": null or "item name (only for scores 60+)",\n' +
          '  "worldEvent": null or "a brief environmental change in the room (only for scores 75+)"\n' +
          '}';

        callGemini(prompt, true).then(function(result) {
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var action = JSON.parse(cleaned);
            var tier = getQualityTier(action.qualityScore);
            var newPower = Math.max(0, Math.min(100, writingPower + (action.powerChange || 0)));
            var newXP = totalXP + (action.xpEarned || 10);
            var newLog = actionLog.concat([{
              room: room.name, text: actionText.substring(0, 200), score: action.qualityScore,
              tier: tier.label, narrative: action.narrative, time: new Date().toLocaleTimeString()
            }]).slice(-20);
            var newVocab = vocabTermsUsed.concat(action.vocabHighlights || []);
            var newLegendary = legendaryActions + (action.qualityScore >= 75 ? 1 : 0);

            updMulti({
              actionResult: action,
              actionLoading: false,
              actionText: '',
              writingPower: newPower,
              totalXP: newXP,
              actionLog: newLog,
              vocabTermsUsed: newVocab,
              legendaryActions: newLegendary,
              craftedThisTurn: false, // allow crafting again after action
              structureCooldown: Math.max(0, structureCooldown - 1),
            });

            if (awardStemXP) awardStemXP(action.xpEarned || 10);
            if (action.qualityScore >= 75 && stemCelebrate) stemCelebrate();
            if (action.qualityScore >= 75 && stemBeep) stemBeep(880, 0.2, 0.3);
            if (announceToSR) announceToSR('Action scored ' + action.qualityScore + ' out of 100. ' + tier.label + ' quality. ' + (action.narrative || ''));
          } catch (e) {
            updMulti({ actionResult: { qualityScore: 0, narrative: 'The world shimmers but nothing happens. Try writing with more detail and creativity!', feedback: __alloT('stem.worldbuilder.try_adding_sensory_details_what_do_you', 'Try adding sensory details — what do you see, hear, feel?'), breakdown: {} }, actionLoading: false });
          }
        }).catch(function() {
          updMulti({ actionLoading: false });
          if (addToast) addToast('Action failed — try again', 'error');
        });
      };

      // ── Move to room ──
      var moveToRoom = function(roomId) {
        var newVisited = roomsVisited.indexOf(roomId) < 0 ? roomsVisited.concat([roomId]) : roomsVisited;
        updMulti({ currentRoom: roomId, actionResult: null, sceneImage: null, roomsVisited: newVisited });
        if (awardStemXP && newVisited.length > roomsVisited.length) awardStemXP(5);
        if (announceToSR) {
          var r = world.rooms.find(function(rm) { return rm.id === roomId; });
          if (r) announceToSR('Moved to ' + r.name + '. ' + r.desc);
        }

        // Generate scene image
        if (callImagen) {
          upd('sceneImageLoading', true);
          var r = world.rooms.find(function(rm) { return rm.id === roomId; });
          if (r) {
            var imgPrompt = 'Fantasy illustration of: ' + r.name + '. ' + r.desc + ' Style: digital painting, atmospheric lighting, wide shot, no text or labels. ' + (selectedWorld === 'scifi' ? 'Sci-fi aesthetic.' : selectedWorld === 'mystery' ? 'Gothic mystery atmosphere.' : selectedWorld === 'historical' ? 'Ancient historical setting.' : 'Fantasy storybook style.');
            callImagen(imgPrompt + (characterAppearance ? ' Include: ' + characterAppearance + '.' : ''), 400, 0.8).then(function(img) {
              updMulti({ sceneImage: img, sceneImageLoading: false });
              if (characterPortrait && callGeminiImageEdit) applyCharacterConsistency(img);
            }).catch(function() { upd('sceneImageLoading', false); });
          }
        }
      };

      // ═══ RENDER ═══
      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },

        // Header
        h('div', { className: 'flex items-center gap-3' },
          h('button', Object.assign({
            className: 'p-2 rounded-full hover:bg-violet-100 text-violet-600 transition-colors',
            'aria-label': __alloT('stem.worldbuilder.back_to_stem_tools', 'Back to STEM tools'),
            title: __alloT('stem.worldbuilder.back', 'Back')
          }, a11yClick(function() { ctx.setStemLabTool(null); })),
            h(ArrowLeft, { size: 20 })
          ),
          h('div', { className: 'flex-1' },
            h('h2', { className: 'text-xl font-black text-slate-800' }, __alloT('stem.worldbuilder.writecraft', '✍️ WriteCraft')),
            h('p', { className: 'text-xs text-slate-600' }, __alloT('stem.worldbuilder.your_writing_is_your_superpower', 'Your writing IS your superpower'))
          ),
          writingPower > 0 && h('div', { className: 'flex items-center gap-2' },
            h('div', { className: 'text-center' },
              h('div', { className: 'text-lg font-black', style: { color: getQualityTier(writingPower).color } }, writingPower),
              h('div', { className: 'text-[11px] text-slate-500 font-bold' }, 'POWER')
            ),
            h('div', { className: 'text-center' },
              h('div', { className: 'text-lg font-black text-amber-600' }, totalXP),
              h('div', { className: 'text-[11px] text-slate-500 font-bold' }, 'XP')
            ),
            h('div', { className: 'text-center' },
              h('select', {
                value: gradeLevel,
                onChange: function(e) { upd('playerGradeLevel', e.target.value); },
                'aria-label': __alloT('stem.worldbuilder.grade_level', 'Grade level'),
                className: 'text-[11px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-1 py-0.5 outline-none focus:ring-2 focus:ring-violet-300'
              },
                GRADE_OPTIONS.map(function(g) {
                  return h('option', { key: g, value: g }, g);
                })
              ),
              h('div', { className: 'text-[11px] text-slate-500 font-bold' }, 'GRADE')
            )
          )
        ),

        // ═══ WORLDBUILDING INQUIRY widget (H7b'') ═══
        !selectedWorld && (function() {
          var iq = d.worldInquiry || { biome: 'temperate', popMillions: 50, techLevel: 5, conflictLevel: 3, govStability: 7, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd('worldInquiry', Object.assign({}, iq, patch)); }
          function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
          var biomes = ({
            arctic: { name: __alloT('stem.worldbuilder.arctic', 'Arctic'), carrying: 0.3, color: '#22d3ee', emoji: '❄️' },
            desert: { name: __alloT('stem.worldbuilder.desert', 'Desert'), carrying: 0.4, color: '#facc15', emoji: '🏜️' },
            steppe: { name: __alloT('stem.worldbuilder.steppe', 'Steppe'), carrying: 0.7, color: '#a3a3a3', emoji: '🌾' },
            temperate: { name: __alloT('stem.worldbuilder.temperate', 'Temperate'), carrying: 1.5, color: '#4ade80', emoji: '🌳' },
            tropical: { name: __alloT('stem.worldbuilder.tropical', 'Tropical'), carrying: 2.5, color: '#16a34a', emoji: '🌴' },
            island: { name: __alloT('stem.worldbuilder.island_archipelago', 'Island archipelago'), carrying: 0.8, color: '#0ea5e9', emoji: '🏝️' }
          });
          var biome = biomes[iq.biome] || biomes.temperate;
          var maxPop = biome.carrying * 200;
          var popPressure = iq.popMillions / maxPop;
          // composite world-fragility index
          var fragility = popPressure * 0.35 + (iq.conflictLevel / 10) * 0.25 + ((10 - iq.govStability) / 10) * 0.25 + ((10 - iq.techLevel) / 10) * 0.15;
          var state = fragility < 0.20 ? 'utopian' : fragility < 0.40 ? 'stable' : fragility < 0.60 ? 'tense' : fragility < 0.80 ? 'fracturing' : 'collapsing';
          var sm = ({
            utopian: { label: __alloT('stem.worldbuilder.utopian', 'Utopian'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: __alloT('stem.worldbuilder.low_pressure_on_all_axes_plot_tension_', 'Low pressure on all axes. Plot tension must come from outside (mystery, exploration, internal character).') },
            stable: { label: __alloT('stem.worldbuilder.stable', 'Stable'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: __alloT('stem.worldbuilder.functioning_society_small_local_confli', 'Functioning society — small local conflicts. Great backdrop for slice-of-life or coming-of-age.') },
            tense: { label: __alloT('stem.worldbuilder.tense', 'Tense'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: __alloT('stem.worldbuilder.multiple_stressors_visible_players_can', 'Multiple stressors visible. Players can feel the pressure but choice still has weight.') },
            fracturing: { label: __alloT('stem.worldbuilder.fracturing', 'Fracturing'), color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: __alloT('stem.worldbuilder.society_pulling_apart_hard_mode_storyt', 'Society pulling apart. Hard-mode storytelling — high-stakes choices, factional conflict.') },
            collapsing: { label: __alloT('stem.worldbuilder.collapsing', 'Collapsing'), color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: __alloT('stem.worldbuilder.apocalypse_post_apocalypse_territory_s', 'Apocalypse/post-apocalypse territory. Survival > diplomacy.') }
          })[state];
          // SVG: 5-axis radar
          var axes = [
            { label: __alloT('stem.worldbuilder.pop_pressure', 'Pop pressure'), val: popPressure },
            { label: __alloT('stem.worldbuilder.conflict', 'Conflict'), val: iq.conflictLevel / 10 },
            { label: __alloT('stem.worldbuilder.govt_instability', 'Govt instability'), val: (10 - iq.govStability) / 10 },
            { label: __alloT('stem.worldbuilder.tech_gap', 'Tech gap'), val: (10 - iq.techLevel) / 10 },
            { label: __alloT('stem.worldbuilder.biome_stress', 'Biome stress'), val: 1 - biome.carrying / 2.5 }
          ];
          var center = 80, radius = 60, n = 5;
          var pts = axes.map(function(a, i) {
            var ang = -Math.PI / 2 + (i * 2 * Math.PI / n);
            var r = Math.max(0, Math.min(1, a.val)) * radius;
            return [center + Math.cos(ang) * r, center + Math.sin(ang) * r];
          });
          var labelPts = axes.map(function(a, i) {
            var ang = -Math.PI / 2 + (i * 2 * Math.PI / n);
            return [center + Math.cos(ang) * (radius + 12), center + Math.sin(ang) * (radius + 12)];
          });
          return h('div', { className: 'rounded-xl p-3 mb-3', style: { background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
            h('h4', { className: 'text-xs font-black uppercase tracking-wider mb-1', style: { color: sm.color } }, __alloT('stem.worldbuilder.world_inquiry_predict_the_story_tensio', '🔬 World Inquiry — Predict the Story Tension')),
            h('p', { className: 'text-[10px] opacity-85 mb-2 leading-snug' }, __alloT('stem.worldbuilder.set_biome_population_tech_conflict_and', 'Set biome, population, tech, conflict, and government. Predict the world-state before writing your first scene. No score, no reveal.')),
            h('div', { className: 'inline-block px-2 py-1 rounded-full text-[10px] font-bold mb-2', style: { background: sm.color, color: '#000' } }, biome.emoji + ' ' + biome.name + ' · ' + sm.label),
            h('p', { className: 'text-[10px] opacity-80 mb-2' }, sm.desc),
            h('div', { className: 'flex gap-3 items-center mb-2 flex-wrap' },
              h('svg', { width: 160, height: 160, viewBox: '0 0 160 160', style: { flex: '0 0 160px' } },
                [0.25, 0.5, 0.75, 1.0].map(function(s, i) {
                  var rr = s * radius;
                  var poly = '';
                  for (var k = 0; k < n; k++) {
                    var a = -Math.PI / 2 + (k * 2 * Math.PI / n);
                    poly += (center + Math.cos(a) * rr) + ',' + (center + Math.sin(a) * rr) + ' ';
                  }
                  return h('polygon', { key: 'g' + i, points: poly.trim(), fill: 'none', stroke: '#1e293b', strokeWidth: 1, strokeDasharray: i === 3 ? '0' : '2 3' });
                }),
                h('polygon', { points: pts.map(function(p) { return p[0] + ',' + p[1]; }).join(' '), fill: sm.color + '44', stroke: sm.color, strokeWidth: 2 }),
                pts.map(function(p, i) { return h('circle', { key: 'p' + i, cx: p[0], cy: p[1], r: 3, fill: sm.color }); }),
                labelPts.map(function(lp, i) { return h('text', { key: 'l' + i, x: lp[0], y: lp[1], textAnchor: 'middle', fill: '#94a3b8', fontSize: 7 }, ['Pop', 'War', 'Govt', 'Tech', 'Bio'][i]); })
              ),
              h('div', { className: 'flex-1 text-[10px] min-w-[200px]' },
                h('div', { className: 'font-bold mb-1 opacity-85' }, __alloT('stem.worldbuilder.world_metrics', 'World metrics')),
                h('div', { className: 'flex justify-between py-0.5 border-b border-slate-700' }, h('span', null, __alloT('stem.worldbuilder.population', 'Population')), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.popMillions + 'M (' + (popPressure * 100).toFixed(0) + '% of carrying)')),
                h('div', { className: 'flex justify-between py-0.5 border-b border-slate-700' }, h('span', null, __alloT('stem.worldbuilder.carrying_cap', 'Carrying cap')), h('span', { className: 'font-mono', style: { color: sm.color } }, maxPop.toFixed(0) + 'M')),
                h('div', { className: 'flex justify-between py-0.5 border-b border-slate-700' }, h('span', null, __alloT('stem.worldbuilder.fragility_index', 'Fragility index')), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, (fragility * 100).toFixed(0) + '%')),
                h('div', { className: 'flex justify-between py-0.5 border-b border-slate-700' }, h('span', null, __alloT('stem.worldbuilder.story_tension', 'Story tension')), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, sm.label))
              )
            ),
            h('div', { className: 'flex flex-wrap gap-1 mb-2' },
              Object.keys(biomes).map(function(b) {
                var active = iq.biome === b;
                return h('button', { key: b, onClick: function() { setKey('biome', b); }, className: 'px-2 py-1 rounded text-[10px] font-bold', style: { background: active ? sm.color : '#0a0a1a', color: active ? '#000' : '#94a3b8', border: '1px solid ' + (active ? sm.color : '#1e293b'), cursor: 'pointer' } }, biomes[b].emoji + ' ' + biomes[b].name);
              })
            ),
            h('div', { className: 'grid grid-cols-2 gap-2 mb-2' },
              h('label', { className: 'text-[10px]' },
                h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, __alloT('stem.worldbuilder.population_m', 'Population (M)')), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.popMillions)),
                h('input', { type: 'range', min: 1, max: 500, step: 1, value: iq.popMillions, onChange: function(e) { setKey('popMillions', parseInt(e.target.value, 10)); }, className: 'w-full' })
              ),
              h('label', { className: 'text-[10px]' },
                h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, __alloT('stem.worldbuilder.tech_level_1_10', 'Tech level (1-10)')), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.techLevel)),
                h('input', { type: 'range', min: 1, max: 10, step: 1, value: iq.techLevel, onChange: function(e) { setKey('techLevel', parseInt(e.target.value, 10)); }, className: 'w-full' })
              ),
              h('label', { className: 'text-[10px]' },
                h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, __alloT('stem.worldbuilder.conflict_1_10', 'Conflict (1-10)')), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.conflictLevel)),
                h('input', { type: 'range', min: 1, max: 10, step: 1, value: iq.conflictLevel, onChange: function(e) { setKey('conflictLevel', parseInt(e.target.value, 10)); }, className: 'w-full' })
              ),
              h('label', { className: 'text-[10px]' },
                h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, __alloT('stem.worldbuilder.govt_stability', 'Govt stability')), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.govStability)),
                h('input', { type: 'range', min: 1, max: 10, step: 1, value: iq.govStability, onChange: function(e) { setKey('govStability', parseInt(e.target.value, 10)); }, className: 'w-full' })
              )
            ),
            h('div', { className: 'flex gap-2 mb-2' },
              h('button', { onClick: function() {
                var t = new Date().toISOString().slice(11, 19);
                setIQ({ log: iq.log.concat([{ t: t, b: iq.biome, p: iq.popMillions, tech: iq.techLevel, conf: iq.conflictLevel, gov: iq.govStability, frag: (fragility * 100).toFixed(0), state: sm.label }]) });
              }, className: 'flex-1 px-2 py-1 rounded text-[10px] font-bold', style: { background: sm.bg, color: sm.color, border: '1px solid ' + sm.border, cursor: 'pointer' } }, __alloT('stem.worldbuilder.log_this_world', '📋 Log this world')),
              h('button', { onClick: function() { setIQ({ biome: 'temperate', popMillions: 50, techLevel: 5, conflictLevel: 3, govStability: 7 }); }, className: 'px-2 py-1 rounded text-[10px]', style: { background: '#0a0a1a', color: '#94a3b8', border: '1px solid #1e293b', cursor: 'pointer' } }, __alloT('stem.worldbuilder.reset', 'Reset'))
            ),
            iq.log.length > 0 && h('div', { className: 'p-1.5 rounded text-[10px] font-mono mb-2', style: { background: '#0a0a1a', maxHeight: 70, overflow: 'auto', border: '1px solid #1e293b' } },
              iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  ' + e.state + ' · ' + e.b + ' · p' + e.p + ' tech' + e.tech + ' conf' + e.conf + ' gov' + e.gov + ' → frag ' + e.frag + '%'); })
            ),
            h('label', { className: 'block text-[10px] font-bold opacity-85 mb-1' }, __alloT('stem.worldbuilder.your_hypothesis_what_slider_would_tip_', 'Your hypothesis (what slider would tip your world into collapse fastest? Why?)')),
            h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: __alloT('stem.worldbuilder.e_g_a_desert_biome_at_carrying_capacit', 'e.g., a desert biome at carrying capacity can survive only if govt stays stable...'), className: 'w-full p-1.5 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded text-[10px] font-bold mb-2', style: { background: '#0a0a1a', color: sm.color, border: '1px solid #1e293b', cursor: 'pointer' } }, __alloT('stem.worldbuilder.i_m_stuck_show_open_questions', "🤔 I'm stuck — show open questions")),
            iq.stuckRevealed && h('div', { className: 'p-2 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px dashed ' + sm.border, lineHeight: 1.5 } },
              h('div', { className: 'font-bold mb-1', style: { color: sm.color } }, __alloT('stem.worldbuilder.open_questions_no_answer_key', 'Open questions (no answer key)')),
              h('ul', { className: 'pl-4 m-0' },
                h('li', null, __alloT('stem.worldbuilder.what_does_carrying_capacity_mean_for_a', 'What does "carrying capacity" mean for a story? When does it bend, when does it break?')),
                h('li', null, __alloT('stem.worldbuilder.why_might_a_utopian_world_be_hard_to_w', 'Why might a "utopian" world be hard to write good stories in?')),
                h('li', null, __alloT('stem.worldbuilder.can_high_tech_reduce_fragility_or_does', 'Can high tech REDUCE fragility, or does it shift it elsewhere?')),
                h('li', null, __alloT('stem.worldbuilder.when_is_the_right_time_in_a_story_to_f', 'When is the right time in a story to flip a slider — and would your reader notice?'))
              )
            ),
            h('label', { className: 'flex items-center gap-2 text-[10px] font-bold cursor-pointer mb-1' },
              h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
              h('span', null, __alloT('stem.worldbuilder.i_can_explain_why_this_combo_yields_th', 'I can explain why this combo yields this story-tension state.'))
            ),
            iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: __alloT('stem.worldbuilder.explain_in_your_own_words', 'Explain in your own words...'), className: 'w-full p-1.5 rounded text-[10px] mb-1', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
            h('p', { className: 'm-0 text-[10px] italic opacity-60' }, __alloT('stem.worldbuilder.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget — no score, no reveal, no answer dump. Carrying capacities are pedagogical heuristics, not population biology; use as story scaffolding, not policy modeling.'))
          );
        })(),

        // ═══ WORLD SELECTION ═══
        !selectedWorld && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-4' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, __alloT('stem.worldbuilder.choose_your_world', 'Choose Your World')),
            h('p', { className: 'text-sm text-slate-600' }, __alloT('stem.worldbuilder.each_world_is_a_living_story_your_writ', 'Each world is a living story. Your writing determines what happens.'))
          ),

          // Character creation
          h('div', { className: 'bg-white rounded-2xl border-2 border-violet-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-bold text-violet-700' }, __alloT('stem.worldbuilder.create_your_character', '✨ Create Your Character')),
            h('div', { className: 'flex gap-4' },
              // Portrait area
              h('div', { className: 'shrink-0 text-center' },
                characterPortrait
                  ? h('div', { className: 'relative' },
                      h('img', { src: characterPortrait, alt: (characterName || 'Character') + ' portrait', className: 'w-24 h-24 rounded-xl object-cover border-2 border-violet-300 shadow-lg' }),
                      callGeminiImageEdit && h('button', {
                        onClick: function() {
                          var edit = prompt('Describe how to change your portrait:');
                          if (edit && edit.trim()) refineCharacterPortrait(edit);
                        },
                        className: 'absolute -bottom-1 -right-1 w-6 h-6 bg-violet-600 text-white rounded-full text-[11px] font-bold hover:bg-violet-700 transition-colors shadow-md',
                        'aria-label': __alloT('stem.worldbuilder.refine_character_portrait', 'Refine character portrait')
                      }, '✏️')
                    )
                  : h('div', { className: 'w-24 h-24 rounded-xl border-2 border-dashed border-violet-300 flex items-center justify-center bg-violet-50' },
                      characterPortraitLoading
                        ? h('span', { className: 'text-2xl animate-pulse' }, '🎨')
                        : h('span', { className: 'text-3xl opacity-40' }, '👤')
                    )
              ),
              // Name/class/appearance fields
              h('div', { className: 'flex-1 space-y-2' },
                h('div', { className: 'grid grid-cols-3 gap-2' },
                  h('div', null,
                    h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, __alloT('stem.worldbuilder.character_name', 'Character Name')),
                    h('input', { type: 'text', value: characterName, onChange: function(e) { upd('characterName', e.target.value); }, placeholder: __alloT('stem.worldbuilder.your_character_s_name', 'Your character\'s name...'), 'aria-label': __alloT('stem.worldbuilder.character_name_2', 'Character name'), className: 'w-full text-sm p-2 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-violet-300' })
                  ),
                  h('div', null,
                    h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, __alloT('stem.worldbuilder.class_role', 'Class / Role')),
                    h('input', { type: 'text', value: characterClass, onChange: function(e) { upd('characterClass', e.target.value); }, placeholder: __alloT('stem.worldbuilder.e_g_scholar_explorer', 'e.g., Scholar, Explorer...'), 'aria-label': __alloT('stem.worldbuilder.character_class_or_role', 'Character class or role'), className: 'w-full text-sm p-2 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-violet-300' })
                  ),
                  h('div', null,
                    h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, __alloT('stem.worldbuilder.grade_level_2', '📚 Grade Level')),
                    h('select', {
                      value: gradeLevel,
                      onChange: function(e) { upd('playerGradeLevel', e.target.value); },
                      'aria-label': __alloT('stem.worldbuilder.your_grade_level', 'Your grade level'),
                      className: 'w-full text-sm p-2 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-violet-300 bg-white'
                    },
                      GRADE_OPTIONS.map(function(g) {
                        return h('option', { key: g, value: g }, g);
                      })
                    ),
                    ctxGradeLevel && !playerGradeLevel && h('div', { className: 'text-[11px] text-violet-500 mt-0.5' }, '📋 Set by teacher: ' + ctxGradeLevel)
                  )
                ),
                h('div', null,
                  h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, __alloT('stem.worldbuilder.describe_your_character_s_appearance', '🎨 Describe Your Character\'s Appearance')),
                  h('textarea', {
                    value: characterAppearance,
                    onChange: function(e) { upd('characterAppearance', e.target.value); },
                    placeholder: __alloT('stem.worldbuilder.describe_what_your_character_looks_lik', 'Describe what your character looks like with vivid detail — hair, eyes, clothing, accessories, distinguishing features...'),
                    'aria-label': __alloT('stem.worldbuilder.character_appearance_description', 'Character appearance description'),
                    className: 'w-full text-sm p-2 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-violet-300 resize-none h-16'
                  })
                ),
                callImagen && characterAppearance.trim().length > 10 && h('button', { 'aria-label': __alloT('stem.worldbuilder.generate_character_portrait', 'Generate Character Portrait'),
                  onClick: function() { generateCharacterPortrait(characterAppearance); },
                  disabled: characterPortraitLoading,
                  className: 'px-3 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-xs font-bold hover:from-violet-700 hover:to-purple-700 disabled:opacity-40 transition-all flex items-center gap-1.5'
                }, characterPortraitLoading ? h('span', { className: 'animate-spin' }, '⏳') : h(Sparkles, { size: 14 }), characterPortraitLoading ? ' Generating...' : ' Generate Portrait')
              )
            )
          ),

          // World cards
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            WORLDS.map(function(w) {
              return h('button', { 'aria-label': __alloT('stem.worldbuilder.select_world_to_explore', 'Select world to explore'), key: w.id, onClick: function() { updMulti({ selectedWorld: w.id, currentRoom: w.rooms[0].id, writingPower: 10, roomsVisited: [w.rooms[0].id] }); if (awardStemXP) awardStemXP(5); moveToRoom(w.rooms[0].id); },
                className: 'p-5 rounded-2xl border-2 border-slate-200 bg-white text-left hover:border-violet-400 hover:shadow-lg transition-all hover:scale-[1.02]'
              },
                h('div', { className: 'text-3xl mb-2' }, w.emoji),
                h('div', { className: 'font-bold text-slate-800' }, w.name),
                h('p', { className: 'text-xs text-slate-600 mt-1 leading-relaxed' }, __alloT('stem.worldbuilder.' + (w.id) + '_desc', w.desc)),
                h('div', { className: 'text-[11px] text-violet-500 font-bold mt-2' }, w.rooms.length + ' locations to explore')
              );
            })
          )
        ),

        // ═══ ACTIVE WORLD ═══
        selectedWorld && room && h('div', { className: 'space-y-4' },

          // Room header + image + character portrait
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl overflow-hidden border-2 border-violet-500/30' },
            h('div', { className: 'relative' },
              sceneImage && h('img', { src: sceneImage, alt: room.name + ' illustration', className: 'w-full h-48 object-cover' }),
              sceneImageLoading && !sceneImage && h('div', { className: 'w-full h-48 bg-slate-800 flex items-center justify-center' }, h('span', { className: 'text-3xl animate-pulse' }, room.emoji)),
              // Character portrait overlay
              characterPortrait && h('div', { className: 'absolute bottom-2 left-2' },
                h('img', { src: characterPortrait, alt: (characterName || 'Character') + ' portrait', className: 'w-14 h-14 rounded-full object-cover border-2 border-violet-400 shadow-lg' }),
                h('div', { className: 'text-[11px] text-white font-bold text-center mt-0.5 bg-black/50 rounded px-1' }, characterName || 'You')
              ),
              // Harmony meter overlay (visible when interacting with NPCs)
              harmonyScore > 0 && h('div', { className: 'absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1' },
                h('div', { className: 'text-[11px] font-bold text-indigo-300 uppercase tracking-wider' }, __alloT('stem.worldbuilder.harmony', '✨ Harmony')),
                h('div', { className: 'w-20 h-1.5 bg-slate-600 rounded-full overflow-hidden mt-0.5' },
                  h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', className: 'h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 transition-all duration-500', style: { width: harmonyScore + '%' } })
                ),
                h('div', { className: 'text-[11px] text-white font-bold text-center mt-0.5' }, harmonyScore + '%')
              )
            ),
            h('div', { className: 'p-4' },
              h('div', { className: 'flex items-center gap-2 mb-1' },
                h('span', { className: 'text-2xl' }, room.emoji),
                h('h3', { className: 'text-lg font-black text-white' }, room.name)
              ),
              h('p', { className: 'text-sm text-slate-300 leading-relaxed' }, room.desc),
              actionResult && actionResult.worldEvent && h('p', { className: 'text-sm text-amber-300 italic mt-2' }, '✨ ' + actionResult.worldEvent)
            )
          ),

          // World map — SVG node-link graph of the WHOLE world (the rooms +
          // their connections form a real graph). Circular auto-layout (rooms
          // carry no coords); current room highlighted, visited ringed, and the
          // current room's neighbors are click-to-travel. Replaces the flat
          // button row that hid the spatial structure.
          h('div', { className: 'bg-white rounded-xl border border-slate-400 p-3' },
            h('div', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2' }, __alloT('stem.worldbuilder.world_map', '🗺️ World Map')),
            (function() {
              var rooms = world.rooms, N = rooms.length, W = 300, Hh = 220, cx = W / 2, cy = 100, R = Math.min(cx, cy) - 36;
              var pos = {};
              rooms.forEach(function(rm, i) {
                var ang = (i / N) * Math.PI * 2 - Math.PI / 2;
                pos[rm.id] = { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
              });
              var neighbors = room.connections || [];
              var seen = {}, edges = [];
              rooms.forEach(function(rm) {
                (rm.connections || []).forEach(function(cid) {
                  if (!pos[cid]) return;
                  var key = rm.id < cid ? rm.id + '|' + cid : cid + '|' + rm.id;
                  if (seen[key]) return; seen[key] = 1;
                  var live = (rm.id === currentRoom || cid === currentRoom);
                  edges.push(h('line', { key: key, x1: pos[rm.id].x, y1: pos[rm.id].y, x2: pos[cid].x, y2: pos[cid].y, stroke: live ? '#8b5cf6' : '#cbd5e1', strokeWidth: live ? 2.2 : 1.2, opacity: live ? 0.9 : 0.6 }));
                });
              });
              return h('svg', { width: '100%', viewBox: '0 0 ' + W + ' ' + Hh, style: { maxWidth: 440, display: 'block', margin: '0 auto' }, role: 'img', 'aria-label': 'Map of ' + world.name + '. You are at ' + room.name + '.' },
                edges,
                rooms.map(function(rm) {
                  var p = pos[rm.id], isCur = rm.id === currentRoom, isVisited = roomsVisited.indexOf(rm.id) >= 0, canGo = neighbors.indexOf(rm.id) >= 0;
                  var fill = isCur ? '#ede9fe' : isVisited ? '#f0fdf4' : '#f8fafc';
                  var stroke = isCur ? '#7c3aed' : isVisited ? '#16a34a' : '#cbd5e1';
                  var bright = isVisited || isCur || canGo;
                  return h('g', { key: rm.id,
                    style: { cursor: canGo ? 'pointer' : 'default' },
                    onClick: canGo ? function() { moveToRoom(rm.id); } : null,
                    role: canGo ? 'button' : null,
                    'aria-label': canGo ? ('Travel to ' + rm.name) : (rm.name + (isCur ? ' — you are here' : '')) },
                    isCur ? h('circle', { cx: p.x, cy: p.y, r: 19, fill: 'none', stroke: '#7c3aed', strokeWidth: 1, opacity: 0.5 }) : null,
                    h('circle', { cx: p.x, cy: p.y, r: 15, fill: fill, stroke: stroke, strokeWidth: isCur ? 3 : 1.8, opacity: bright ? 1 : 0.5 }),
                    h('text', { x: p.x, y: p.y + 5, textAnchor: 'middle', fontSize: 15 }, rm.emoji),
                    h('text', { x: p.x, y: p.y + 30, textAnchor: 'middle', fontSize: 8, fontWeight: isCur ? 800 : 600, fill: bright ? '#334155' : '#94a3b8' }, rm.name.length > 16 ? rm.name.slice(0, 15) + '…' : rm.name),
                    (isVisited && !isCur) ? h('text', { x: p.x + 12, y: p.y - 9, textAnchor: 'middle', fontSize: 9, fontWeight: 800, fill: '#16a34a' }, '✓') : null
                  );
                })
              );
            })(),
            h('div', { className: 'text-[10px] text-slate-500 text-center mt-1' }, __alloT('stem.worldbuilder.you_are_here_visited_tap_a_connected_l', '🟣 you are here · ✓ visited · tap a connected location to travel'))
          ),

          // NPCs in this room
          gmCharacters.filter(function(npc) { return !npc.roomId || npc.roomId === currentRoom; }).length > 0 && !activeNPC && h('div', { className: 'bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-xl p-3' },
            h('div', { className: 'text-[11px] font-bold text-cyan-600 uppercase tracking-widest mb-2' }, __alloT('stem.worldbuilder.people_here', '👥 People Here')),
            h('div', { className: 'flex flex-wrap gap-2' },
              gmCharacters.filter(function(npc) { return !npc.roomId || npc.roomId === currentRoom; }).map(function(npc, i) {
                return h('button', { 'aria-label': 'Talk with ' + npc.name + ', ' + npc.role, key: i, onClick: function() { interactWithNPC(npc); },
                  className: 'flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-cyan-200 text-xs hover:border-cyan-400 hover:shadow-md transition-all'
                },
                  h('span', { className: 'text-lg' }, npc.emoji),
                  h('div', { className: 'text-left flex-1' },
                    h('div', { className: 'font-bold text-slate-800' }, npc.name),
                    h('div', { className: 'text-[11px] text-slate-600' }, npc.role),
                    npc.conflictType && npc.conflictType !== 'none' && h('span', { className: 'text-[11px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold' }, npc.conflictType),
                    // Mini rapport bar
                    npcRapport[npc.name] !== undefined && h('div', { className: 'mt-1 w-full' },
                      h('div', { className: 'w-full h-1 bg-slate-200 rounded-full overflow-hidden' },
                        h('div', { className: 'h-full rounded-full transition-all ' + (npcRapport[npc.name] >= 70 ? 'bg-green-400' : npcRapport[npc.name] >= 40 ? 'bg-amber-400' : 'bg-blue-400'), style: { width: npcRapport[npc.name] + '%' } })
                      ),
                      h('div', { className: 'text-[11px] text-slate-500 mt-0.5' }, '💛 ' + npcRapport[npc.name] + '%')
                    )
                  )
                );
              })
            )
          ),

          // Active NPC encounter with rapport & quests
          activeNPC && h('div', { className: 'bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-300 rounded-2xl p-4' },
            h('div', { className: 'flex items-center gap-3 mb-3' },
              h('span', { className: 'text-3xl' }, activeNPC.emoji),
              h('div', { className: 'flex-1' },
                h('div', { className: 'text-sm font-black text-slate-800' }, activeNPC.name),
                h('div', { className: 'text-[11px] text-cyan-600 font-medium' }, activeNPC.role),
                activeNPC.selTheme && h('span', { className: 'text-[11px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold' }, activeNPC.selTheme)
              )
            ),

            // ── Rapport Meter ──
            (function() {
              var npcKey = activeNPC.name;
              var rapport = npcRapport[npcKey] !== undefined ? npcRapport[npcKey] : 10;
              var rapportColor = rapport >= 70 ? 'green' : rapport >= 40 ? 'amber' : rapport >= 20 ? 'blue' : 'slate';
              return h('div', { className: 'mb-3 bg-white rounded-xl p-2.5 border border-cyan-200' },
                h('div', { className: 'flex justify-between text-[11px] font-bold uppercase mb-1' },
                  h('span', { className: 'text-cyan-600 tracking-widest' }, __alloT('stem.worldbuilder.rapport', '💛 Rapport')),
                  h('span', { className: rapport >= 70 ? 'text-green-600' : 'text-slate-600' }, rapport + '%')
                ),
                h('div', { className: 'w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-400' },
                  h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', className: 'h-full transition-all duration-500 rounded-full ' +
                    (rapport >= 70 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                     rapport >= 40 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                     rapport >= 20 ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
                     'bg-slate-400'),
                    style: { width: rapport + '%' }
                  })
                ),
                h('div', { className: 'text-[11px] text-slate-500 mt-0.5' },
                  rapport < 20 ? '🔒 Guarded — build trust through empathy' :
                  rapport < 40 ? '🌱 Opening up — keep showing understanding' :
                  rapport < 70 ? '💬 Trusting — deeper conversations unlocked' :
                  '✨ Deep bond — this character trusts you fully'
                ),
                // Quest tracker
                (npcQuests[npcKey] || []).length > 0 && h('div', { className: 'mt-2 space-y-1' },
                  h('div', { className: 'text-[11px] font-bold text-cyan-600 uppercase tracking-wider' }, __alloT('stem.worldbuilder.quests', '📋 Quests')),
                  (npcQuests[npcKey] || []).map(function(q) {
                    var isLocked = rapport < q.difficulty;
                    return h('div', { key: q.id, className: 'flex items-center gap-1.5 text-[11px] ' + (q.isCompleted ? 'text-green-600' : isLocked ? 'text-slate-500' : 'text-slate-700') },
                      h('span', null, q.isCompleted ? '✅' : isLocked ? '🔒' : '⭕'),
                      h('span', { className: q.isCompleted ? 'line-through' : isLocked ? 'opacity-50' : 'font-medium' },
                        isLocked ? 'Requires rapport ' + q.difficulty + '%' : q.text
                      )
                    );
                  })
                )
              );
            })(),

            h('div', { className: 'bg-white rounded-xl p-3 border border-cyan-200 mb-2' },
              h('p', { className: 'text-sm text-slate-800 italic leading-relaxed' }, '"' + activeNPC.openingLine + '"')
            ),
            h('div', { className: 'text-[11px] text-slate-600 mb-1' },
              h('strong', null, 'Situation: '), activeNPC.currentSituation
            ),
            actionResult && actionResult.npcResponse && h('div', { className: 'bg-cyan-50 rounded-xl p-3 border border-cyan-200 mt-2' },
              h('div', { className: 'text-[11px] font-bold text-cyan-600 mb-1' }, activeNPC.emoji + ' ' + activeNPC.name + ' says:'),
              h('p', { className: 'text-sm text-cyan-900 leading-relaxed font-medium' }, actionResult.npcResponse),
              actionResult.selBreakdown && h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
                Object.entries(actionResult.selBreakdown).map(function(entry) {
                  var max = entry[0] === 'empathy' ? 15 : entry[0] === 'accountability' ? 5 : 10;
                  return h('span', { key: entry[0], className: 'text-[11px] font-bold px-2 py-0.5 rounded-full ' + (entry[1] >= max * 0.7 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600') }, entry[0] + ': ' + entry[1] + '/' + max);
                })
              ),
              actionResult.progressToward && h('div', { className: 'mt-2 text-[11px] font-bold ' + (actionResult.progressToward === 'resolved' ? 'text-green-600' : actionResult.progressToward === 'near-resolution' ? 'text-amber-600' : 'text-slate-500') },
                '📊 Progress: ' + actionResult.progressToward.replace(/-/g, ' ')
              ),
              actionResult.selFeedback && h('p', { className: 'text-[11px] text-teal-600 mt-1 font-medium' }, '🤝 ' + actionResult.selFeedback)
            )
          ),

          // GM Message (teacher broadcast)
          gmMessage && h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-4 animate-in slide-in-from-top duration-300' },
            h('div', { className: 'flex items-center gap-2 mb-1' },
              h('span', { className: 'text-lg' }, '🎭'),
              h('span', { className: 'text-xs font-bold text-amber-700 uppercase tracking-widest' }, __alloT('stem.worldbuilder.game_master', 'Game Master'))
            ),
            h('p', { className: 'text-sm text-amber-900 font-medium leading-relaxed' }, gmMessage),
            gmSceneImage && h('img', { src: gmSceneImage, alt: __alloT('stem.worldbuilder.scene_from_the_game_master', 'Scene from the Game Master'), className: 'w-full rounded-xl mt-2 border border-amber-200' }),
            h('button', { 'aria-label': __alloT('stem.worldbuilder.dismiss', 'Dismiss'), onClick: function() { updMulti({ gmMessage: null, gmSceneImage: null }); }, className: 'mt-2 text-[11px] text-amber-500 hover:text-amber-700 font-bold' }, __alloT('stem.worldbuilder.dismiss_2', 'Dismiss'))
          ),

          // Target vocabulary (teacher-set)
          targetVocab.length > 0 && h('div', { className: 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3' },
            h('div', { className: 'text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-1' }, __alloT('stem.worldbuilder.target_vocabulary_use_these_for_bonus_', '📖 Target Vocabulary — use these for bonus power!')),
            h('div', { className: 'flex flex-wrap gap-1.5' },
              targetVocab.map(function(term, i) {
                var used = vocabTermsUsed.indexOf(term.toLowerCase()) >= 0;
                return h('span', { key: i, className: 'px-2 py-1 rounded-full text-[11px] font-bold border ' + (used ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-blue-200 text-blue-700') }, (used ? '✓ ' : '') + term);
              })
            )
          ),

          // ── Inventory ──
          inventory.length > 0 && h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-[11px] font-bold text-amber-600 uppercase tracking-widest' }, '🎒 Inventory (' + inventory.length + ')'),
              activeItem && h('span', { className: 'text-[11px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full' }, '⚔️ Equipped: ' + activeItem.emoji + ' ' + activeItem.name)
            ),
            h('div', { className: 'flex flex-wrap gap-1.5' },
              inventory.map(function(item, i) {
                var tier = getQualityTier(item.quality);
                var isEquipped = activeItem && activeItem.name === item.name;
                return h('div', { key: i, className: 'group relative' },
                  h('button', {
                    onClick: function() {
                      if (activeBattle) { useItemInBattle(item); }
                      else { updMulti({ activeItem: isEquipped ? null : item }); }
                    },
                    className: 'flex flex-col items-center px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ' +
                      (isEquipped ? 'bg-amber-200 border-amber-400 text-amber-900 ring-2 ring-amber-400' : 'bg-white border-amber-200 text-amber-700 hover:border-amber-400 hover:shadow-sm'),
                    'aria-label': item.name + ', ' + tier.label + ' quality, power ' + item.power + ', durability ' + (item.durability || 0) + ' of ' + (item.maxDurability || 0)
                  },
                    h('div', { className: 'flex items-center gap-1' },
                      h('span', null, item.emoji),
                      h('span', null, item.name),
                      h('span', { className: 'text-[11px] px-1 py-0.5 rounded-full', style: { background: tier.color + '22', color: tier.color } }, tier.emoji + item.power)
                    ),
                    // Durability bar
                    h('div', { className: 'w-full mt-0.5 flex items-center gap-1' },
                      h('div', { className: 'flex-1 h-1 bg-slate-200 rounded-full overflow-hidden' },
                        h('div', { className: 'h-full rounded-full transition-all ' +
                          ((item.durability || 0) / (item.maxDurability || 1) > 0.5 ? 'bg-green-400' :
                           (item.durability || 0) / (item.maxDurability || 1) > 0.25 ? 'bg-amber-400' : 'bg-red-400'),
                          style: { width: ((item.durability || 0) / (item.maxDurability || 1) * 100) + '%' }
                        })
                      ),
                      h('span', { className: 'text-[11px] text-slate-500' }, (item.durability || 0) + '/' + (item.maxDurability || 0))
                    )
                  ),
                  // Tooltip on hover
                  h('div', { className: 'hidden group-hover:block group-focus-within:block absolute z-10 bottom-full left-0 mb-1 w-48 bg-white border border-amber-200 rounded-lg p-2 shadow-lg text-[11px]' },
                    h('div', { className: 'font-bold text-amber-800' }, item.emoji + ' ' + item.name),
                    h('div', { className: 'text-slate-600 mt-0.5' }, item.desc),
                    item.specialAbility && h('div', { className: 'text-violet-600 font-medium mt-0.5' }, '✨ ' + item.specialAbility),
                    item.battleBonus && h('div', { className: 'text-red-600 font-medium mt-0.5' }, '⚔️ ' + item.battleBonus),
                    h('div', { className: 'font-medium mt-0.5 ' + ((item.durability || 0) <= 1 ? 'text-red-500' : 'text-slate-500') },
                      '🔧 Durability: ' + (item.durability || 0) + '/' + (item.maxDurability || 0) +
                      ((item.durability || 0) <= 1 ? ' — about to break!' : '') +
                      ((item.maxDurability || 0) === 1 ? ' (single-use)' : '')
                    ),
                    h('div', { className: 'text-slate-500 mt-0.5' }, 'Crafted at: ' + item.craftedAt)
                  )
                );
              })
            )
          ),

          // Structures in this room
          (function() {
            var roomStructures = structures.filter(function(s) { return s.roomId === currentRoom; });
            if (roomStructures.length === 0) return null;
            return h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3' },
              h('div', { className: 'text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-2' }, __alloT('stem.worldbuilder.structures_here', '🏗️ Structures Here')),
              h('div', { className: 'space-y-1.5' },
                roomStructures.map(function(s, i) {
                  var tier = getQualityTier(s.quality);
                  return h('div', { key: i, className: 'flex items-start gap-2 p-2 bg-white rounded-lg border border-emerald-200' },
                    h('span', { className: 'text-lg shrink-0' }, s.emoji),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-xs font-bold text-emerald-700' }, s.name),
                        h('span', { className: 'text-[11px] font-bold px-1.5 py-0.5 rounded-full', style: { background: tier.color + '22', color: tier.color } }, tier.emoji + ' ' + tier.label)
                      ),
                      h('p', { className: 'text-[11px] text-emerald-600 italic leading-relaxed' }, s.desc),
                      s.bonus && h('div', { className: 'text-[11px] text-violet-600 font-medium mt-0.5' }, '✨ ' + s.bonus),
                      h('div', { className: 'text-[11px] text-slate-500 mt-0.5' }, 'Built by ' + s.builtBy)
                    )
                  );
                })
              )
            );
          })(),

          // Writing action area
          h('div', { className: 'bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border-2 border-violet-200 p-5' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('h4', { className: 'text-sm font-bold text-violet-700' }, __alloT('stem.worldbuilder.what_do_you_do', '✍️ What do you do?')),
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-[11px] font-bold px-2 py-1 rounded-full', style: { background: getQualityTier(writingPower).color + '22', color: getQualityTier(writingPower).color } },
                  getQualityTier(writingPower).emoji + ' Power: ' + writingPower
                )
              )
            ),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, __alloT('stem.worldbuilder.describe_your_action_with_vivid_detail', 'Describe your action with vivid detail. The better you write, the more powerful the outcome. Use sensory language, precise vocabulary, and creativity!')),
            h('div', { className: 'flex flex-wrap gap-2 mb-2' },
              h('button', { onClick: function() { upd('actionMode', 'action'); }, 'aria-pressed': (d.actionMode || 'action') === 'action', className: 'px-3 py-1 rounded-lg text-[11px] font-bold transition-all ' + ((d.actionMode || 'action') === 'action' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, __alloT('stem.worldbuilder.act', '⚔️ Act')),
              h('button', { onClick: function() { upd('actionMode', 'explore'); }, 'aria-pressed': d.actionMode === 'explore', className: 'px-3 py-1 rounded-lg text-[11px] font-bold transition-all ' + (d.actionMode === 'explore' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, __alloT('stem.worldbuilder.explore', '🔍 Explore')),
              h('button', { onClick: function() { upd('actionMode', 'craft'); }, 'aria-pressed': d.actionMode === 'craft', className: 'px-3 py-1 rounded-lg text-[11px] font-bold transition-all ' + (d.actionMode === 'craft' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') + (craftedThisTurn && structureCooldown > 0 ? ' opacity-40' : '') }, '🔨 Craft' + (structureCooldown > 0 ? ' (' + structureCooldown + ' turns)' : craftedThisTurn ? ' (done)' : '')),
              !activeBattle && !activeNPC && h('button', { 'aria-label': __alloT('stem.worldbuilder.battle', 'Battle'), onClick: startBattle, className: 'px-3 py-1 rounded-lg text-[11px] font-bold transition-all bg-red-100 text-red-700 hover:bg-red-200' }, __alloT('stem.worldbuilder.battle_2', '⚔️ Battle')),
              activeNPC && h('button', { 'aria-label': __alloT('stem.worldbuilder.leave', 'Leave'), onClick: function() { updMulti({ activeNPC: null, actionMode: 'action' }); }, className: 'px-3 py-1 rounded-lg text-[11px] font-bold transition-all bg-slate-100 text-slate-600 hover:bg-slate-200' }, __alloT('stem.worldbuilder.leave_2', '👋 Leave'))
            ),
            // Craft sub-mode selector (Item vs Structure)
            d.actionMode === 'craft' && h('div', { className: 'flex gap-2 mb-2 ml-1' },
              h('button', { 'aria-label': __alloT('stem.worldbuilder.craft_item', 'Craft Item'), onClick: function() { upd('craftSubMode', 'item'); },
                className: 'px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ' +
                  (craftSubMode === 'item' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-600')
              }, '🔨 Craft Item' + (craftedThisTurn ? ' ✓' : '')),
              h('button', { 'aria-label': __alloT('stem.worldbuilder.build_structure', 'Build Structure'), onClick: function() { upd('craftSubMode', 'structure'); },
                className: 'px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ' +
                  (craftSubMode === 'structure' ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-600') +
                  (structureCooldown > 0 ? ' opacity-40' : '')
              }, '🏗️ Build Structure' + (structureCooldown > 0 ? ' (' + structureCooldown + ' turns)' : '')),
              structureCooldown > 0 && h('span', { className: 'text-[11px] text-slate-500 self-center' }, '⏳ Structure cooldown: ' + structureCooldown + ' turn' + (structureCooldown > 1 ? 's' : '') + ' left')
            ),
            // Active battle encounter card
            activeBattle && h('div', { className: 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-3 mb-2' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-2xl' }, activeBattle.emoji),
                  h('div', null,
                    h('div', { className: 'text-sm font-black text-red-800' }, activeBattle.name),
                    h('div', { className: 'text-[11px] text-red-600 italic' }, activeBattle.desc.substring(0, 80))
                  )
                ),
                h('div', { className: 'text-right' },
                  h('div', { className: 'text-xs font-bold text-red-700' }, 'Round ' + (activeBattle.rounds + 1)),
                  h('div', { className: 'text-[11px] text-slate-600' }, 'Power: ' + activeBattle.power)
                )
              ),
              // HP bar
              h('div', { className: 'w-full bg-slate-200 rounded-full h-3 overflow-hidden', role: 'progressbar', 'aria-label': __alloT('stem.worldbuilder.enemy_health', 'Enemy health'), 'aria-valuenow': activeBattle.currentHp, 'aria-valuemax': activeBattle.hp },
                h('div', { className: 'h-full rounded-full transition-all duration-500 ' + (activeBattle.currentHp / activeBattle.hp > 0.5 ? 'bg-red-500' : activeBattle.currentHp / activeBattle.hp > 0.25 ? 'bg-orange-500' : 'bg-yellow-500'), style: { width: (activeBattle.currentHp / activeBattle.hp * 100) + '%' } })
              ),
              h('div', { className: 'flex justify-between text-[11px] font-bold mt-1' },
                h('span', { className: 'text-red-600' }, activeBattle.currentHp + '/' + activeBattle.hp + ' HP'),
                h('span', { className: 'text-amber-600' }, '💡 Weakness: ' + activeBattle.weakness)
              ),
              h('p', { className: 'text-[11px] text-red-700 mt-1 font-medium' }, __alloT('stem.worldbuilder.write_your_battle_action_describe_how_', '⚔️ Write your battle action! Describe HOW you fight. Reference the weakness for +15 bonus damage!'))
            ),
            h('textarea', {
              value: actionText,
              onChange: handleActionInput,
              onPaste: handleActionPaste,
              placeholder: activeNPC ? 'Respond to ' + activeNPC.name + ' with empathy and thoughtfulness. How do you help resolve their situation?'
                : activeBattle ? 'Describe your battle action against ' + activeBattle.name + '!' + (activeItem ? ' You have ' + activeItem.emoji + ' ' + activeItem.name + ' equipped!' : '') + ' Reference its weakness (' + activeBattle.weakness + ') for bonus damage!'
                : d.actionMode === 'craft' && craftSubMode === 'structure' ? 'Describe a structure to build in ' + (room ? room.name : 'this location') + ' — materials, architecture, scale, purpose... The more vivid, the more impressive! (3-turn cooldown after building)'
                : d.actionMode === 'craft' ? 'Describe an item you want to craft with vivid detail — what does it look like, feel like, what is it made of? ' + (targetVocab.length > 0 ? 'Use vocabulary words (' + targetVocab.join(', ') + ') for bonus power!' : 'Use rich, descriptive language!')
                : d.actionMode === 'explore' ? 'Describe how you examine your surroundings... (Rich observation = richer discoveries!)'
                : 'Describe what your character does... (The more vivid and detailed, the more effective!)',
              'aria-label': __alloT('stem.worldbuilder.describe_your_action_in_the_world', 'Describe your action in the world'),
              className: 'w-full text-sm p-3 border border-violet-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400 resize-none h-28' + (pasteDetected ? ' border-red-400 bg-red-50' : ''),
              disabled: actionLoading || hwLoading,
            }),

            // ── Handwriting Capture Row ──
            callGeminiVision && h('div', { className: 'flex items-center gap-2 mt-1.5 flex-wrap' },
              // Camera / file upload button
              h('label', {
                className: 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-dashed border-violet-300 rounded-lg text-xs font-bold text-violet-600 cursor-pointer hover:bg-violet-50 hover:border-violet-400 transition-all' + (hwLoading ? ' opacity-50 pointer-events-none' : ''),
                'aria-label': __alloT('stem.worldbuilder.snap_or_upload_a_photo_of_your_handwri', 'Snap or upload a photo of your handwriting')
              },
                h('input', {
                  type: 'file',
                  accept: 'image/*',
                  capture: 'environment',
                  onChange: handleHandwritingCapture,
                  className: 'sr-only',
                  disabled: hwLoading,
                  'aria-hidden': 'true'
                }),
                hwLoading ? h('span', { className: 'animate-spin' }, '⏳') : '📷',
                hwLoading ? ' Reading...' : ' Snap Your Writing'
              ),
              // Penmanship feedback toggle (student can turn on/off)
              h('button', {
                onClick: function() { upd('hwPenmanshipOn', !hwPenmanshipOn); },
                'aria-label': (hwPenmanshipOn || hwTeacherPenmanship ? 'Disable' : 'Enable') + ' penmanship feedback',
                'aria-pressed': String(hwPenmanshipOn || hwTeacherPenmanship),
                className: 'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ' +
                  (hwPenmanshipOn || hwTeacherPenmanship
                    ? 'bg-violet-100 border-violet-300 text-violet-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-500')
              }, __alloT('stem.worldbuilder.penmanship_tips', '✏️ Penmanship Tips '), hwPenmanshipOn || hwTeacherPenmanship ? 'ON' : 'OFF'),
              hwTeacherPenmanship && !hwPenmanshipOn && h('span', { className: 'text-[11px] text-violet-500 font-medium' }, __alloT('stem.worldbuilder.teacher_enabled', '(teacher enabled)'))
            ),

            // ── Penmanship Feedback Card ──
            hwResult && hwResult.penmanship && h('div', { className: 'bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl p-3 mt-2', role: 'region', 'aria-label': __alloT('stem.worldbuilder.penmanship_feedback', 'Penmanship feedback') },
              h('div', { className: 'flex items-center justify-between mb-1' },
                h('div', { className: 'text-[11px] font-bold text-violet-600 uppercase tracking-widest' }, __alloT('stem.worldbuilder.penmanship_feedback_2', '✏️ Penmanship Feedback')),
                h('div', { className: 'text-sm font-black text-violet-600' },
                  (hwResult.penmanship.score >= 80 ? 'Very legible' : hwResult.penmanship.score >= 60 ? 'Legible' : hwResult.penmanship.score >= 40 ? 'Developing' : 'Keep practicing')
                )
              ),
              // AI-estimate disclaimer — handwriting can't be reliably graded from a
              // photo, so this is qualitative feedback, not an assessment or grade.
              h('p', { className: 'text-[10px] text-violet-500 italic mb-2' }, __alloT('stem.worldbuilder.an_ai_estimate_to_spark_practice_not_a', 'An AI estimate to spark practice — not a handwriting assessment or grade.')),
              // Per-dimension feedback as coarse bands (no false-precise /25 number)
              h('div', { className: 'flex gap-2 mb-2' },
                [['letterFormation', 'Letters'], ['spacing', 'Spacing'], ['alignment', 'Alignment'], ['neatness', 'Neatness']].map(function(pair) {
                  var val = hwResult.penmanship[pair[0]] || 0;
                  var band = val >= 18 ? 'Strong' : val >= 12 ? 'Solid' : 'Growing';
                  return h('div', { key: pair[0], className: 'flex-1 text-center' },
                    h('div', { className: 'text-xs font-black ' + (val >= 18 ? 'text-green-600' : val >= 12 ? 'text-amber-600' : 'text-slate-500') }, band),
                    h('div', { className: 'text-[11px] text-slate-500 font-bold uppercase' }, pair[1])
                  );
                })
              ),
              // Strengths + Tips
              hwResult.penmanship.strengths && h('p', { className: 'text-xs text-green-700 font-medium mb-1' }, '💪 ' + hwResult.penmanship.strengths),
              hwResult.penmanship.tips && h('p', { className: 'text-xs text-violet-600 font-medium' }, '💡 ' + hwResult.penmanship.tips),
              h('button', {
                onClick: function() { upd('hwResult', null); },
                className: 'text-[11px] text-slate-500 hover:text-slate-600 font-bold mt-1',
                'aria-label': __alloT('stem.worldbuilder.dismiss_penmanship_feedback', 'Dismiss penmanship feedback')
              }, __alloT('stem.worldbuilder.dismiss_3', 'Dismiss'))
            ),

            pasteDetected && h('div', { className: 'text-[11px] text-red-600 font-bold mt-1' }, __alloT('stem.worldbuilder.pasting_detected_please_write_your_own', '⚠ Pasting detected — please write your own words! Your writing power depends on YOUR creativity.')),
            h('div', { className: 'flex items-center justify-between mt-2' },
              h('span', { className: 'text-[11px] text-slate-600' }, actionText.split(/\s+/).filter(Boolean).length + ' words'),
              h('button', { onClick: function() { activeNPC ? respondToNPC() : activeBattle ? performBattleAction() : d.actionMode === 'craft' ? (craftSubMode === 'structure' ? buildStructure(actionText) : craftItem(actionText)) : performAction(); },
                'aria-busy': !!actionLoading,
                disabled: actionText.trim().length < 5 || actionLoading,
                className: 'px-5 py-2.5 bg-gradient-to-r ' + (d.actionMode === 'craft' && craftSubMode === 'structure' ? 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' : d.actionMode === 'craft' ? 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700' : 'from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700') + ' text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-all shadow-lg flex items-center gap-2'
              }, actionLoading ? h('span', { className: 'animate-spin' }, '⏳') : h(Sparkles, { size: 16 }), actionLoading ? ' The world responds...' : activeNPC ? ' Respond' : activeBattle ? ' Attack!' : d.actionMode === 'craft' && craftSubMode === 'structure' ? ' Build!' : d.actionMode === 'craft' ? ' Craft!' : d.actionMode === 'explore' ? ' Explore!' : ' Act!')
            )
          ),

          // Action result
          actionResult && (actionResult.qualityScore >= 0 || actionResult.finalScore >= 0) && h('div', { className: 'space-y-3' },

            // Battle illustration
            d.battleImage && h('img', { src: d.battleImage, alt: __alloT('stem.worldbuilder.battle_scene_illustration', 'Battle scene illustration'), className: 'w-full h-40 object-cover rounded-2xl border-2 border-violet-200 shadow-lg' }),

            // Score display
            h('div', { className: 'bg-white rounded-2xl border-2 shadow-lg overflow-hidden', style: { borderColor: getQualityTier(actionResult.finalScore || actionResult.qualityScore).color + '66' } },
              h('div', { className: 'p-4 text-center', style: { background: getQualityTier(actionResult.finalScore || actionResult.qualityScore).color + '15' } },
                h('div', { className: 'flex items-center justify-center gap-4' },
                  h('div', null,
                    h('div', { className: 'text-4xl font-black', style: { color: getQualityTier(actionResult.finalScore || actionResult.qualityScore).color } }, actionResult.finalScore || actionResult.qualityScore, h('span', { className: 'text-lg opacity-60' }, '/100')),
                    h('div', { className: 'text-sm font-bold mt-1', style: { color: getQualityTier(actionResult.finalScore || actionResult.qualityScore).color } }, getQualityTier(actionResult.finalScore || actionResult.qualityScore).emoji + ' ' + getQualityTier(actionResult.finalScore || actionResult.qualityScore).label)
                  ),
                  actionResult.strategyScore > 0 && h('div', { className: 'text-center' },
                    h('div', { className: 'text-2xl font-black text-indigo-600' }, '+', actionResult.strategyScore),
                    h('div', { className: 'text-[11px] text-indigo-500 font-bold' }, __alloT('stem.worldbuilder.strategy', '🧠 Strategy'))
                  )
                ),
                actionResult.weaknessExploited && h('div', { className: 'mt-2 inline-block bg-amber-200 text-amber-800 px-3 py-1 rounded-full text-[11px] font-bold' }, __alloT('stem.worldbuilder.weakness_exploited', '🎯 Weakness exploited!')),
                actionResult.environmentUsed && h('div', { className: 'mt-1 inline-block bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-[11px] font-bold' }, __alloT('stem.worldbuilder.environment_used', '🌍 Environment used!'))
              ),

              // Writing breakdown
              actionResult.breakdown && h('div', { className: 'flex justify-center gap-3 p-3 bg-slate-50 border-t border-slate-100' },
                Object.entries(actionResult.breakdown).map(function(entry) {
                  return h('div', { key: entry[0], className: 'text-center' },
                    h('div', { className: 'text-sm font-black text-slate-700' }, entry[1], '/20'),
                    h('div', { className: 'text-[11px] text-slate-600 uppercase font-bold' }, entry[0])
                  );
                })
              ),

              // Player's narrative outcome
              h('div', { className: 'p-4 border-b border-slate-100' },
                h('div', { className: 'text-[11px] font-bold text-violet-500 uppercase tracking-widest mb-1' }, __alloT('stem.worldbuilder.your_action', '⚔️ Your Action')),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed italic' }, '"' + (actionResult.narrative || '') + '"')
              ),

              // Enemy's literary writing (mentor text)
              actionResult.enemyWriting && h('div', { className: 'p-4 bg-gradient-to-r from-red-50 to-orange-50' },
                h('div', { className: 'text-[11px] font-bold text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1' }, activeBattle ? activeBattle.emoji + ' ' : '', activeBattle ? activeBattle.name + ' Responds' : 'Enemy Responds'),
                h('p', { className: 'text-sm text-red-900 leading-relaxed font-medium' }, actionResult.enemyWriting),
                h('p', { className: 'text-[11px] text-red-400 italic mt-2' }, __alloT('stem.worldbuilder.notice_the_vivid_language_sensory_deta', '📖 Notice the vivid language, sensory details, and figurative writing in the enemy\'s response — learn from how it describes its actions!'))
              ),

              // Feedback
              h('div', { className: 'p-4 space-y-1' },
                actionResult.writingFeedback && h('p', { className: 'text-xs text-violet-600 font-medium' }, '✍️ Writing: ' + actionResult.writingFeedback),
                actionResult.strategyFeedback && h('p', { className: 'text-xs text-indigo-600 font-medium' }, '🧠 Strategy: ' + actionResult.strategyFeedback),
                actionResult.feedback && !actionResult.writingFeedback && h('p', { className: 'text-xs text-violet-600 font-medium' }, '💡 ' + actionResult.feedback)
              ),

              // Extras
              h('div', { className: 'px-4 pb-3 flex flex-wrap gap-2' },
                actionResult.xpEarned && h('span', { className: 'text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full' }, '+' + actionResult.xpEarned + ' XP'),
                actionResult.damageDealt && h('span', { className: 'text-[11px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full' }, '💥 ' + actionResult.damageDealt + ' damage'),
                actionResult.powerChange > 0 && h('span', { className: 'text-[11px] font-bold bg-violet-100 text-violet-700 px-2 py-1 rounded-full' }, '+' + actionResult.powerChange + ' Power'),
                actionResult.discoveredItem && h('span', { className: 'text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full' }, '🎁 Found: ' + actionResult.discoveredItem),
                (actionResult.vocabHighlights || []).map(function(v, vi) {
                  return h('span', { key: vi, className: 'text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full' }, '📖 ' + v);
                })
              )
            ),

            // TTS narrate both player and enemy
            callTTS && h('div', { className: 'flex gap-2' },
              h('button', { onClick: function() { callTTS(actionResult.narrative || ''); }, className: 'text-[11px] text-violet-500 hover:text-violet-700 font-bold' }, __alloT('stem.worldbuilder.hear_your_action', '🔊 Hear your action')),
              actionResult.enemyWriting && h('button', { 'aria-label': __alloT('stem.worldbuilder.refresh', 'Refresh'), onClick: function() { callTTS(actionResult.enemyWriting); }, className: 'text-[11px] text-red-500 hover:text-red-700 font-bold' }, __alloT('stem.worldbuilder.hear_enemy_s_response', '🔊 Hear enemy\'s response'))
            )
          ),

          // Action log
          actionLog.length > 0 && h('details', { className: 'bg-white rounded-xl border border-slate-400' },
            h('summary', { className: 'px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50' }, '📜 Adventure Log (' + actionLog.length + ' actions)'),
            h('div', { className: 'px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto' },
              actionLog.slice().reverse().map(function(entry, i) {
                return h('div', { key: i, className: 'text-[11px] text-slate-600 flex items-start gap-2' },
                  h('span', { className: 'font-bold shrink-0', style: { color: getQualityTier(entry.score).color } }, entry.score),
                  h('span', { className: 'text-slate-500' }, entry.room + ':'),
                  h('span', { className: 'truncate' }, entry.text)
                );
              })
            )
          ),

          // Stats
          h('div', { className: 'grid grid-cols-4 gap-2' },
            h('div', { className: 'bg-violet-50 rounded-xl border border-violet-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-violet-600' }, roomsVisited.length), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.explored', 'Explored'))
            ),
            h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-amber-600' }, actionLog.length), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.actions', 'Actions'))
            ),
            h('div', { className: 'bg-red-50 rounded-xl border border-red-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-red-600' }, d.battlesWon || 0), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.battles_won', 'Battles Won'))
            ),
            h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-emerald-600' }, legendaryActions), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.legendary', 'Legendary'))
            ),
            h('div', { className: 'bg-cyan-50 rounded-xl border border-cyan-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-cyan-600' }, conflictsResolved), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.resolved', 'Resolved'))
            ),
            h('div', { className: 'bg-blue-50 rounded-xl border border-blue-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-blue-600' }, vocabTermsUsed.length), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.vocab', 'Vocab'))
            ),
            h('div', { className: 'bg-teal-50 rounded-xl border border-teal-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-teal-600' }, selSkillsUsed.length), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.sel_skills', 'SEL Skills'))
            ),
            h('div', { className: 'bg-purple-50 rounded-xl border border-purple-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-purple-600' }, completedQuests), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.quests_2', 'Quests'))
            ),
            h('div', { className: 'bg-orange-50 rounded-xl border border-orange-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-orange-600' }, inventory.length), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.items', 'Items'))
            ),
            h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-emerald-600' }, structures.length), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.structures', 'Structures'))
            ),
            harmonyScore > 0 && h('div', { className: 'bg-indigo-50 rounded-xl border border-indigo-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-indigo-600' }, harmonyScore), h('div', { className: 'text-[11px] text-slate-600 font-bold' }, __alloT('stem.worldbuilder.harmony_2', 'Harmony'))
            )
          ),

          // Reset
          // ── Game Master Panel (teacher creates characters) ──
          h('details', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200' },
            h('summary', { className: 'px-4 py-3 text-sm font-bold text-amber-700 cursor-pointer hover:bg-amber-100 rounded-2xl transition-colors' }, __alloT('stem.worldbuilder.game_master_create_characters_quests', '🎭 Game Master — Create Characters & Quests')),
            h('div', { className: 'px-4 pb-4 space-y-3' },
              h('p', { className: 'text-xs text-amber-600' }, __alloT('stem.worldbuilder.create_individual_characters_or_launch', 'Create individual characters or launch full scenarios with multiple NPCs interacting.')),

              // Teacher penmanship toggle
              callGeminiVision && h('div', { className: 'flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200' },
                h('button', {
                  onClick: function() { upd('hwTeacherPenmanship', !hwTeacherPenmanship); },
                  'aria-label': (hwTeacherPenmanship ? 'Disable' : 'Enable') + ' penmanship feedback for students',
                  'aria-pressed': String(hwTeacherPenmanship),
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ' +
                    (hwTeacherPenmanship
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-violet-300')
                }, '✏️ Penmanship Feedback: ' + (hwTeacherPenmanship ? 'ON' : 'OFF')),
                h('span', { className: 'text-[11px] text-slate-600' }, hwTeacherPenmanship ? 'Students will see handwriting feedback when they snap photos' : 'Enable to give students penmanship tips on handwritten submissions')
              ),

              // Scenario templates
              h('div', { className: 'mb-3' },
                h('div', { className: 'text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1.5' }, __alloT('stem.worldbuilder.quick_scenarios_creates_multiple_chara', '📋 Quick Scenarios (creates multiple characters)')),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  SCENARIO_TEMPLATES.map(function(tmpl) {
                    return h('button', { key: tmpl.type,
                      onClick: function() {
                        upd('actionLoading', true);
                        var prompt = 'Create a multi-character scene for a ' + gradeLevel + ' literary RPG in the world "' + (world ? world.name : 'Fantasy') + '".\n\n' +
                          'SCENARIO: ' + tmpl.prompt + '\n\n' +
                          'Create 2-3 distinct characters who are ALL involved in this situation. Each has their own perspective.\n' +
                          'The player will need to interact with MULTIPLE characters to resolve this.\n' +
                          'SEL skills this scenario teaches: ' + tmpl.skills.join(', ') + '\n\n' +
                          'Return ONLY a JSON ARRAY of characters:\n' +
                          '[{"name":"name","emoji":"emoji","role":"role","backstory":"2-3 sentences","personality":"traits",' +
                          '"currentSituation":"their perspective on the situation","selTheme":"primary CASEL theme",' +
                          '"conflictType":"' + tmpl.type + '","resolution":"what resolution looks like from their POV",' +
                          '"roomId":null,"openingLine":"first words in character"}]';
                        callGemini(prompt, true).then(function(result) {
                          try {
                            var cleaned = result.trim();
                            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
                            var npcs = JSON.parse(cleaned);
                            if (Array.isArray(npcs)) {
                              updMulti({ gmCharacters: gmCharacters.concat(npcs), actionLoading: false });
                              sfxWbMagic(); if (addToast) addToast(tmpl.label + ' scenario created — ' + npcs.length + ' characters!', 'success');
                            }
                          } catch(e) {
            upd('actionLoading', false);
            if (typeof addToast === 'function') addToast('Could not parse AI response — please try again', 'error');
          }
                        }).catch(function() { upd('actionLoading', false); });
                      },
                      disabled: actionLoading,
                      className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-amber-200 bg-white text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-all disabled:opacity-40'
                    }, tmpl.label);
                  })
                )
              ),

              h('div', { className: 'text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1' }, __alloT('stem.worldbuilder.or_create_a_custom_character', 'Or create a custom character:')),
              h('textarea', {
                value: d.gmCharacterPrompt || '',
                onChange: function(e) { upd('gmCharacterPrompt', e.target.value); },
                placeholder: __alloT('stem.worldbuilder.describe_a_character_e_g_a_young_refug', 'Describe a character... e.g., "A young refugee who lost her family and struggles to trust strangers" or "A merchant who cheated a customer and feels guilty" or "An elder who holds knowledge about the history everyone has forgotten"'),
                'aria-label': __alloT('stem.worldbuilder.describe_a_character_for_the_world', 'Describe a character for the world'),
                className: 'w-full text-sm p-3 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 resize-none h-20'
              }),
              h('button', { onClick: function() { if ((d.gmCharacterPrompt || '').trim()) { createGMCharacter(d.gmCharacterPrompt); upd('gmCharacterPrompt', ''); } },
                disabled: !(d.gmCharacterPrompt || '').trim() || actionLoading,
                className: 'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 disabled:opacity-40 transition-colors'
              }, actionLoading ? 'Creating...' : '✨ Create Character'),
              gmCharacters.length > 0 && h('div', { className: 'space-y-2 mt-2' },
                h('div', { className: 'text-[11px] font-bold text-amber-600 uppercase tracking-widest' }, 'Characters in World (' + gmCharacters.length + ')'),
                gmCharacters.map(function(npc, i) {
                  return h('div', { key: i, className: 'flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 text-xs' },
                    h('span', { className: 'text-lg' }, npc.emoji),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('span', { className: 'font-bold text-slate-800' }, npc.name),
                      h('span', { className: 'text-slate-600 ml-1' }, '(' + npc.role + ')'),
                      npc.selTheme && h('span', { className: 'ml-1 text-[11px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-bold' }, npc.selTheme)
                    ),
                    h('button', { onClick: function() { updMulti({ gmCharacters: gmCharacters.filter(function(_, j) { return j !== i; }) }); }, className: 'text-slate-600 hover:text-red-500 text-[11px]', 'aria-label': 'Remove ' + npc.name }, '✕')
                  );
                })
              )
            )
          ),

          h('button', { 'aria-label': __alloT('stem.worldbuilder.start_a_new_world', 'Start a New World'), onClick: function() { updMulti({ selectedWorld: null, currentRoom: null, writingPower: 0, totalXP: 0, actionLog: [], actionResult: null, sceneImage: null, roomsVisited: [], battlesWon: 0, legendaryActions: 0, vocabTermsUsed: [], gmCharacters: [], activeNPC: null, npcHistory: [], conflictsResolved: 0, selSkillsUsed: [], activeBattle: null, battleLog: [], playerBase: null, characterPortrait: null, characterPortraitLoading: false, characterAppearance: '', inventory: [], craftedThisTurn: false, activeItem: null, npcRapport: {}, npcQuests: {}, harmonyScore: 0, completedQuests: 0, battleImage: null, structures: [], structureCooldown: 0, craftSubMode: 'item', playerGradeLevel: null, hwResult: null, hwLoading: false }); }, className: 'text-[11px] text-slate-500 hover:text-slate-700 font-bold' }, __alloT('stem.worldbuilder.start_a_new_world_2', '🔄 Start a New World'))
        )
      );
    }
  });
})();
}

console.log('[StemLab] stem_tool_worldbuilder.js loaded');
