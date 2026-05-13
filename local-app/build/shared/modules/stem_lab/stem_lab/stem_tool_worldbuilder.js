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
    weak: { min: 0, label: 'Weak', emoji: '💫', color: '#94a3b8' },
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
      var ctxGradeLevel = ctx.gradeLevel;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var awardStemXP = ctx.awardXP;
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
          } catch(e) { upd('actionLoading', false); }
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
                if (addToast) addToast('🎨 Character portrait created!', 'success');
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
          if (addToast) addToast('Portrait generation failed — try again', 'error');
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
          } catch(e) { updMulti({ actionResult: { qualityScore: 0, narrative: 'The materials crumble... Describe your item with more vivid detail!', feedback: 'Try describing what it looks like, feels like, and what it\'s made of.' }, actionLoading: false }); }
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

      var world = WORLDS.find(function(w) { return w.id === selectedWorld; });
      var room = world ? world.rooms.find(function(r) { return r.id === currentRoom; }) : null;

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
          } catch(e) { updMulti({ actionResult: { qualityScore: 0, narrative: 'The foundation crumbles... Describe your structure with more vivid architectural detail!', feedback: 'Try describing materials, scale, and what makes this building unique.' }, actionLoading: false }); }
        }).catch(function() { updMulti({ actionLoading: false }); });
      };

      // ── PvE Battle System ──
      var activeBattle = d.activeBattle || null;
      var battleLog = d.battleLog || [];

      var ENCOUNTERS = {
        fantasy: [
          { id: 'shadow_wolf', name: 'Shadow Wolf', emoji: '🐺', hp: 60, power: 35, desc: 'A wolf made of living shadow, its eyes burning like cold stars.', weakness: 'light, fire, warmth' },
          { id: 'stone_golem', name: 'Stone Golem', emoji: '🗿', hp: 100, power: 25, desc: 'An ancient guardian of carved stone, slow but nearly indestructible.', weakness: 'water, erosion, music' },
          { id: 'riddle_sphinx', name: 'Riddle Sphinx', emoji: '🦁', hp: 80, power: 50, desc: 'A winged lion with a human face who speaks in puzzles and paradoxes.', weakness: 'cleverness, logic, wordplay' },
          { id: 'frost_drake', name: 'Frost Drake', emoji: '🐉', hp: 120, power: 60, desc: 'A young dragon of ice and wind, its breath freezing everything it touches.', weakness: 'fire, determination, courage' },
        ],
        scifi: [
          { id: 'rogue_ai', name: 'Rogue AI', emoji: '🤖', hp: 70, power: 45, desc: 'A malfunctioning AI that has taken control of the station\'s defense systems.', weakness: 'logic puzzles, empathy, overloading' },
          { id: 'void_entity', name: 'Void Entity', emoji: '👾', hp: 90, power: 55, desc: 'A being from the space between stars, existing as pure electromagnetic interference.', weakness: 'communication, containment fields, harmony' },
          { id: 'nano_swarm', name: 'Nano Swarm', emoji: '🦠', hp: 50, power: 40, desc: 'A cloud of self-replicating nanobots consuming everything in their path.', weakness: 'EMP, extreme cold, magnetic fields' },
        ],
        mystery: [
          { id: 'the_shadow', name: 'The Shadow', emoji: '👤', hp: 60, power: 40, desc: 'A mysterious figure that appears in mirrors and darkened hallways, always watching.', weakness: 'light, truth, confrontation' },
          { id: 'cursed_book', name: 'The Cursed Tome', emoji: '📕', hp: 80, power: 50, desc: 'A sentient book that rewrites reality around it, trapping readers in its pages.', weakness: 'original stories, creative thinking, fire' },
          { id: 'poltergeist', name: 'The Poltergeist', emoji: '👻', hp: 70, power: 35, desc: 'A restless spirit that hurls objects and screams in forgotten languages.', weakness: 'calm, music, understanding its story' },
        ],
        historical: [
          { id: 'sandstorm', name: 'The Living Sandstorm', emoji: '🌪️', hp: 80, power: 45, desc: 'A massive storm with a mind of its own, guardian of the desert trade routes.', weakness: 'water, patience, navigation' },
          { id: 'sea_serpent', name: 'The Harbor Serpent', emoji: '🐍', hp: 100, power: 50, desc: 'An enormous sea creature that blocks the harbor, demanding tribute.', weakness: 'negotiation, music, bravery' },
          { id: 'labyrinth', name: 'The Living Labyrinth', emoji: '🏛️', hp: 90, power: 40, desc: 'The maze itself is alive, shifting its walls to trap unwary explorers.', weakness: 'mapping, logic, perseverance' },
        ],
      };

      var startBattle = function() {
        var worldEncounters = ENCOUNTERS[selectedWorld] || ENCOUNTERS.fantasy;
        var encounter = worldEncounters[Math.floor(Math.random() * worldEncounters.length)];
        updMulti({ activeBattle: { ...encounter, currentHp: encounter.hp, playerHits: 0, rounds: 0 }, actionMode: 'battle' });
        if (announceToSR) announceToSR('Battle started! ' + encounter.name + ' appears! ' + encounter.desc);
        if (stemBeep) stemBeep(440, 150, 0.3);
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
            updMulti({ actionResult: { qualityScore: 0, narrative: 'Your attack goes wide! Focus your writing!', feedback: 'Try describing HOW you attack with sensory details.', breakdown: {} }, actionLoading: false });
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
            if (action.qualityScore >= 75 && stemBeep) stemBeep(880, 200, 0.3);
            if (announceToSR) announceToSR('Action scored ' + action.qualityScore + ' out of 100. ' + tier.label + ' quality. ' + (action.narrative || ''));
          } catch (e) {
            updMulti({ actionResult: { qualityScore: 0, narrative: 'The world shimmers but nothing happens. Try writing with more detail and creativity!', feedback: 'Try adding sensory details — what do you see, hear, feel?', breakdown: {} }, actionLoading: false });
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
          h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-violet-100 text-violet-600 transition-colors' }, a11yClick(function() { ctx.setStemLabTool(null); })),
            h(ArrowLeft, { size: 20 })
          ),
          h('div', { className: 'flex-1' },
            h('h2', { className: 'text-xl font-black text-slate-800' }, '✍️ WriteCraft'),
            h('p', { className: 'text-xs text-slate-500' }, 'Your writing IS your superpower')
          ),
          writingPower > 0 && h('div', { className: 'flex items-center gap-2' },
            h('div', { className: 'text-center' },
              h('div', { className: 'text-lg font-black', style: { color: getQualityTier(writingPower).color } }, writingPower),
              h('div', { className: 'text-[8px] text-slate-400 font-bold' }, 'POWER')
            ),
            h('div', { className: 'text-center' },
              h('div', { className: 'text-lg font-black text-amber-600' }, totalXP),
              h('div', { className: 'text-[8px] text-slate-400 font-bold' }, 'XP')
            ),
            h('div', { className: 'text-center' },
              h('select', {
                value: gradeLevel,
                onChange: function(e) { upd('playerGradeLevel', e.target.value); },
                'aria-label': 'Grade level',
                className: 'text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-1 py-0.5 outline-none focus:ring-2 focus:ring-violet-300'
              },
                GRADE_OPTIONS.map(function(g) {
                  return h('option', { key: g, value: g }, g);
                })
              ),
              h('div', { className: 'text-[8px] text-slate-400 font-bold' }, 'GRADE')
            )
          )
        ),

        // ═══ WORLD SELECTION ═══
        !selectedWorld && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-4' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, 'Choose Your World'),
            h('p', { className: 'text-sm text-slate-500' }, 'Each world is a living story. Your writing determines what happens.')
          ),

          // Character creation
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-2xl border-2 border-violet-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-bold text-violet-700' }, '✨ Create Your Character'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-4' },
              // Portrait area
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'shrink-0 text-center' },
                characterPortrait
                  ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'relative' },
                      h('img', { src: characterPortrait, alt: (characterName || 'Character') + ' portrait', className: 'w-24 h-24 rounded-xl object-cover border-2 border-violet-300 shadow-lg' }),
                      callGeminiImageEdit && h('button', {
                        onClick: function() {
                          var edit = prompt('Describe how to change your portrait:');
                          if (edit && edit.trim()) refineCharacterPortrait(edit);
                        },
                        className: 'absolute -bottom-1 -right-1 w-6 h-6 bg-violet-600 text-white rounded-full text-[10px] font-bold hover:bg-violet-700 transition-colors shadow-md',
                        'aria-label': 'Refine character portrait'
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
                    h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Character Name'),
                    h('input', { type: 'text', value: characterName, onChange: function(e) { upd('characterName', e.target.value); }, placeholder: 'Your character\'s name...', 'aria-label': 'Character name', className: 'w-full text-sm p-2 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-violet-300' })
                  ),
                  h('div', null,
                    h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Class / Role'),
                    h('input', { type: 'text', value: characterClass, onChange: function(e) { upd('characterClass', e.target.value); }, placeholder: 'e.g., Scholar, Explorer...', 'aria-label': 'Character class or role', className: 'w-full text-sm p-2 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-violet-300' })
                  ),
                  h('div', null,
                    h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '📚 Grade Level'),
                    h('select', {
                      value: gradeLevel,
                      onChange: function(e) { upd('playerGradeLevel', e.target.value); },
                      'aria-label': 'Your grade level',
                      className: 'w-full text-sm p-2 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-violet-300 bg-white'
                    },
                      GRADE_OPTIONS.map(function(g) {
                        return h('option', { key: g, value: g }, g);
                      })
                    ),
                    ctxGradeLevel && !playerGradeLevel && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[8px] text-violet-500 mt-0.5' }, '📋 Set by teacher: ' + ctxGradeLevel)
                  )
                ),
                h('div', null,
                  h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '🎨 Describe Your Character\'s Appearance'),
                  h('textarea', {
                    value: characterAppearance,
                    onChange: function(e) { upd('characterAppearance', e.target.value); },
                    placeholder: 'Describe what your character looks like with vivid detail — hair, eyes, clothing, accessories, distinguishing features...',
                    'aria-label': 'Character appearance description',
                    className: 'w-full text-sm p-2 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-violet-300 resize-none h-16'
                  })
                ),
                callImagen && characterAppearance.trim().length > 10 && h('button', { 'aria-label': 'Generate Character Portrait',
                  onClick: function() { generateCharacterPortrait(characterAppearance); },
                  disabled: characterPortraitLoading,
                  className: 'px-3 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-xs font-bold hover:from-violet-700 hover:to-purple-700 disabled:opacity-40 transition-all flex items-center gap-1.5'
                }, characterPortraitLoading ? h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'animate-spin' }, '⏳') : h(Sparkles, { size: 14 }), characterPortraitLoading ? ' Generating...' : ' Generate Portrait')
              )
            )
          ),

          // World cards
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            WORLDS.map(function(w) {
              return h('button', { 'aria-label': 'Select world to explore', key: w.id, onClick: function() { updMulti({ selectedWorld: w.id, currentRoom: w.rooms[0].id, writingPower: 10, roomsVisited: [w.rooms[0].id] }); if (awardStemXP) awardStemXP(5); moveToRoom(w.rooms[0].id); },
                className: 'p-5 rounded-2xl border-2 border-slate-200 bg-white text-left hover:border-violet-400 hover:shadow-lg transition-all hover:scale-[1.02]'
              },
                h('div', { className: 'text-3xl mb-2' }, w.emoji),
                h('div', { className: 'font-bold text-slate-800' }, w.name),
                h('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' }, w.desc),
                h('div', { className: 'text-[10px] text-violet-500 font-bold mt-2' }, w.rooms.length + ' locations to explore')
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
                h('div', { className: 'text-[8px] text-white font-bold text-center mt-0.5 bg-black/50 rounded px-1' }, characterName || 'You')
              ),
              // Harmony meter overlay (visible when interacting with NPCs)
              harmonyScore > 0 && h('div', { className: 'absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1' },
                h('div', { className: 'text-[8px] font-bold text-indigo-300 uppercase tracking-wider' }, '✨ Harmony'),
                h('div', { className: 'w-20 h-1.5 bg-slate-600 rounded-full overflow-hidden mt-0.5' },
                  h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', className: 'h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 transition-all duration-500', style: { width: harmonyScore + '%' } })
                ),
                h('div', { className: 'text-[8px] text-white font-bold text-center mt-0.5' }, harmonyScore + '%')
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

          // World map (connected rooms)
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl border border-slate-400 p-3' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2' }, '🗺️ Connected Locations'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-2' },
              room.connections.map(function(connId) {
                var connRoom = world.rooms.find(function(r) { return r.id === connId; });
                if (!connRoom) return null;
                var visited = roomsVisited.indexOf(connId) >= 0;
                return h('button', { 'aria-label': 'Move To Room', key: connId, onClick: function() { moveToRoom(connId); },
                  className: 'px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all hover:scale-105 ' +
                    (visited ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300')
                }, connRoom.emoji + ' ' + connRoom.name + (visited ? ' ✓' : ''));
              })
            )
          ),

          // NPCs in this room
          gmCharacters.filter(function(npc) { return !npc.roomId || npc.roomId === currentRoom; }).length > 0 && !activeNPC && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-xl p-3' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-cyan-600 uppercase tracking-widest mb-2' }, '👥 People Here'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-2' },
              gmCharacters.filter(function(npc) { return !npc.roomId || npc.roomId === currentRoom; }).map(function(npc, i) {
                return h('button', { 'aria-label': 'Interact With N P C', key: i, onClick: function() { interactWithNPC(npc); },
                  className: 'flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-cyan-200 text-xs hover:border-cyan-400 hover:shadow-md transition-all'
                },
                  h('span', { className: 'text-lg' }, npc.emoji),
                  h('div', { className: 'text-left flex-1' },
                    h('div', { className: 'font-bold text-slate-800' }, npc.name),
                    h('div', { className: 'text-[11px] text-slate-500' }, npc.role),
                    npc.conflictType && npc.conflictType !== 'none' && h('span', { className: 'text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold' }, npc.conflictType),
                    // Mini rapport bar
                    npcRapport[npc.name] !== undefined && h('div', { className: 'mt-1 w-full' },
                      h('div', { className: 'w-full h-1 bg-slate-200 rounded-full overflow-hidden' },
                        h('div', { className: 'h-full rounded-full transition-all ' + (npcRapport[npc.name] >= 70 ? 'bg-green-400' : npcRapport[npc.name] >= 40 ? 'bg-amber-400' : 'bg-blue-400'), style: { width: npcRapport[npc.name] + '%' } })
                      ),
                      h('div', { className: 'text-[7px] text-slate-400 mt-0.5' }, '💛 ' + npcRapport[npc.name] + '%')
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
                h('div', { className: 'text-[10px] text-cyan-600 font-medium' }, activeNPC.role),
                activeNPC.selTheme && h('span', { className: 'text-[8px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold' }, activeNPC.selTheme)
              )
            ),

            // ── Rapport Meter ──
            (function() {
              var npcKey = activeNPC.name;
              var rapport = npcRapport[npcKey] !== undefined ? npcRapport[npcKey] : 10;
              var rapportColor = rapport >= 70 ? 'green' : rapport >= 40 ? 'amber' : rapport >= 20 ? 'blue' : 'slate';
              return h('div', { className: 'mb-3 bg-white rounded-xl p-2.5 border border-cyan-200' },
                h('div', { className: 'flex justify-between text-[10px] font-bold uppercase mb-1' },
                  h('span', { className: 'text-cyan-600 tracking-widest' }, '💛 Rapport'),
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
                h('div', { className: 'text-[8px] text-slate-400 mt-0.5' },
                  rapport < 20 ? '🔒 Guarded — build trust through empathy' :
                  rapport < 40 ? '🌱 Opening up — keep showing understanding' :
                  rapport < 70 ? '💬 Trusting — deeper conversations unlocked' :
                  '✨ Deep bond — this character trusts you fully'
                ),
                // Quest tracker
                (npcQuests[npcKey] || []).length > 0 && h('div', { className: 'mt-2 space-y-1' },
                  h('div', { className: 'text-[11px] font-bold text-cyan-600 uppercase tracking-wider' }, '📋 Quests'),
                  (npcQuests[npcKey] || []).map(function(q) {
                    var isLocked = rapport < q.difficulty;
                    return h('div', { key: q.id, className: 'flex items-center gap-1.5 text-[10px] ' + (q.isCompleted ? 'text-green-600' : isLocked ? 'text-slate-400' : 'text-slate-700') },
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
            h('div', { className: 'text-[10px] text-slate-500 mb-1' },
              h('strong', null, 'Situation: '), activeNPC.currentSituation
            ),
            actionResult && actionResult.npcResponse && h('div', { className: 'bg-cyan-50 rounded-xl p-3 border border-cyan-200 mt-2' },
              h('div', { className: 'text-[10px] font-bold text-cyan-600 mb-1' }, activeNPC.emoji + ' ' + activeNPC.name + ' says:'),
              h('p', { className: 'text-sm text-cyan-900 leading-relaxed font-medium' }, actionResult.npcResponse),
              actionResult.selBreakdown && h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
                Object.entries(actionResult.selBreakdown).map(function(entry) {
                  var max = entry[0] === 'empathy' ? 15 : entry[0] === 'accountability' ? 5 : 10;
                  return h('span', { key: entry[0], className: 'text-[11px] font-bold px-2 py-0.5 rounded-full ' + (entry[1] >= max * 0.7 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600') }, entry[0] + ': ' + entry[1] + '/' + max);
                })
              ),
              actionResult.progressToward && h('div', { className: 'mt-2 text-[10px] font-bold ' + (actionResult.progressToward === 'resolved' ? 'text-green-600' : actionResult.progressToward === 'near-resolution' ? 'text-amber-600' : 'text-slate-500') },
                '📊 Progress: ' + actionResult.progressToward.replace(/-/g, ' ')
              ),
              actionResult.selFeedback && h('p', { className: 'text-[10px] text-teal-600 mt-1 font-medium' }, '🤝 ' + actionResult.selFeedback)
            )
          ),

          // GM Message (teacher broadcast)
          gmMessage && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-4 animate-in slide-in-from-top duration-300' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2 mb-1' },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-lg' }, '🎭'),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-amber-700 uppercase tracking-widest' }, 'Game Master')
            ),
            h('p', { className: 'text-sm text-amber-900 font-medium leading-relaxed' }, gmMessage),
            gmSceneImage && h('img', { src: gmSceneImage, alt: 'Scene from the Game Master', className: 'w-full rounded-xl mt-2 border border-amber-200' }),
            h('button', { 'aria-label': 'Dismiss', onClick: function() { updMulti({ gmMessage: null, gmSceneImage: null }); }, className: 'mt-2 text-[10px] text-amber-500 hover:text-amber-700 font-bold' }, 'Dismiss')
          ),

          // Target vocabulary (teacher-set)
          targetVocab.length > 0 && h('div', { className: 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3' },
            h('div', { className: 'text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1' }, '📖 Target Vocabulary — use these for bonus power!'),
            h('div', { className: 'flex flex-wrap gap-1.5' },
              targetVocab.map(function(term, i) {
                var used = vocabTermsUsed.indexOf(term.toLowerCase()) >= 0;
                return h('span', { key: i, className: 'px-2 py-1 rounded-full text-[10px] font-bold border ' + (used ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-blue-200 text-blue-700') }, (used ? '✓ ' : '') + term);
              })
            )
          ),

          // ── Inventory ──
          inventory.length > 0 && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center justify-between mb-2' },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-amber-600 uppercase tracking-widest' }, '🎒 Inventory (' + inventory.length + ')'),
              activeItem && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[11px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full' }, '⚔️ Equipped: ' + activeItem.emoji + ' ' + activeItem.name)
            ),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5' },
              inventory.map(function(item, i) {
                var tier = getQualityTier(item.quality);
                var isEquipped = activeItem && activeItem.name === item.name;
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: i, className: 'group relative' },
                  h('button', {
                    onClick: function() {
                      if (activeBattle) { useItemInBattle(item); }
                      else { updMulti({ activeItem: isEquipped ? null : item }); }
                    },
                    className: 'flex flex-col items-center px-2 py-1 rounded-lg border text-[10px] font-bold transition-all ' +
                      (isEquipped ? 'bg-amber-200 border-amber-400 text-amber-900 ring-2 ring-amber-400' : 'bg-white border-amber-200 text-amber-700 hover:border-amber-400 hover:shadow-sm'),
                    'aria-label': item.name + ', ' + tier.label + ' quality, power ' + item.power + ', durability ' + (item.durability || 0) + ' of ' + (item.maxDurability || 0)
                  },
                    h('div', { className: 'flex items-center gap-1' },
                      h('span', null, item.emoji),
                      h('span', null, item.name),
                      h('span', { className: 'text-[8px] px-1 py-0.5 rounded-full', style: { background: tier.color + '22', color: tier.color } }, tier.emoji + item.power)
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
                      h('span', { className: 'text-[7px] text-slate-400' }, (item.durability || 0) + '/' + (item.maxDurability || 0))
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
                    h('div', { className: 'text-slate-400 mt-0.5' }, 'Crafted at: ' + item.craftedAt)
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
              h('div', { className: 'text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2' }, '🏗️ Structures Here'),
              h('div', { className: 'space-y-1.5' },
                roomStructures.map(function(s, i) {
                  var tier = getQualityTier(s.quality);
                  return h('div', { key: i, className: 'flex items-start gap-2 p-2 bg-white rounded-lg border border-emerald-200' },
                    h('span', { className: 'text-lg shrink-0' }, s.emoji),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-xs font-bold text-emerald-700' }, s.name),
                        h('span', { className: 'text-[8px] font-bold px-1.5 py-0.5 rounded-full', style: { background: tier.color + '22', color: tier.color } }, tier.emoji + ' ' + tier.label)
                      ),
                      h('p', { className: 'text-[10px] text-emerald-600 italic leading-relaxed' }, s.desc),
                      s.bonus && h('div', { className: 'text-[11px] text-violet-600 font-medium mt-0.5' }, '✨ ' + s.bonus),
                      h('div', { className: 'text-[8px] text-slate-400 mt-0.5' }, 'Built by ' + s.builtBy)
                    )
                  );
                })
              )
            );
          })(),

          // Writing action area
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border-2 border-violet-200 p-5' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center justify-between mb-2' },
              h('h4', { className: 'text-sm font-bold text-violet-700' }, '✍️ What do you do?'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2' },
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold px-2 py-1 rounded-full', style: { background: getQualityTier(writingPower).color + '22', color: getQualityTier(writingPower).color } },
                  getQualityTier(writingPower).emoji + ' Power: ' + writingPower
                )
              )
            ),
            h('p', { className: 'text-xs text-slate-500 mb-2' }, 'Describe your action with vivid detail. The better you write, the more powerful the outcome. Use sensory language, precise vocabulary, and creativity!'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-2 mb-2' },
              h('button', { 'aria-label': 'Act', onClick: function() { upd('actionMode', 'action'); }, className: 'px-3 py-1 rounded-lg text-[10px] font-bold transition-all ' + ((d.actionMode || 'action') === 'action' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, '⚔️ Act'),
              h('button', { 'aria-label': 'Explore', onClick: function() { upd('actionMode', 'explore'); }, className: 'px-3 py-1 rounded-lg text-[10px] font-bold transition-all ' + (d.actionMode === 'explore' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, '🔍 Explore'),
              h('button', { 'aria-label': 'Battle', onClick: function() { upd('actionMode', 'craft'); }, className: 'px-3 py-1 rounded-lg text-[10px] font-bold transition-all ' + (d.actionMode === 'craft' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') + (craftedThisTurn && structureCooldown > 0 ? ' opacity-40' : '') }, '🔨 Craft' + (structureCooldown > 0 ? ' (' + structureCooldown + ' turns)' : craftedThisTurn ? ' (done)' : '')),
              !activeBattle && !activeNPC && h('button', { 'aria-label': 'Battle', onClick: startBattle, className: 'px-3 py-1 rounded-lg text-[10px] font-bold transition-all bg-red-100 text-red-700 hover:bg-red-200' }, '⚔️ Battle'),
              activeNPC && h('button', { 'aria-label': 'Leave', onClick: function() { updMulti({ activeNPC: null, actionMode: 'action' }); }, className: 'px-3 py-1 rounded-lg text-[10px] font-bold transition-all bg-slate-100 text-slate-600 hover:bg-slate-200' }, '👋 Leave')
            ),
            // Craft sub-mode selector (Item vs Structure)
            d.actionMode === 'craft' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 mb-2 ml-1' },
              h('button', { 'aria-label': 'Craft Item', onClick: function() { upd('craftSubMode', 'item'); },
                className: 'px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ' +
                  (craftSubMode === 'item' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300')
              }, '🔨 Craft Item' + (craftedThisTurn ? ' ✓' : '')),
              h('button', { 'aria-label': 'Build Structure', onClick: function() { upd('craftSubMode', 'structure'); },
                className: 'px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ' +
                  (craftSubMode === 'structure' ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300') +
                  (structureCooldown > 0 ? ' opacity-40' : '')
              }, '🏗️ Build Structure' + (structureCooldown > 0 ? ' (' + structureCooldown + ' turns)' : '')),
              structureCooldown > 0 && h('span', { className: 'text-[11px] text-slate-400 self-center' }, '⏳ Structure cooldown: ' + structureCooldown + ' turn' + (structureCooldown > 1 ? 's' : '') + ' left')
            ),
            // Active battle encounter card
            activeBattle && h('div', { className: 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-3 mb-2' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-2xl' }, activeBattle.emoji),
                  h('div', null,
                    h('div', { className: 'text-sm font-black text-red-800' }, activeBattle.name),
                    h('div', { className: 'text-[10px] text-red-600 italic' }, activeBattle.desc.substring(0, 80))
                  )
                ),
                h('div', { className: 'text-right' },
                  h('div', { className: 'text-xs font-bold text-red-700' }, 'Round ' + (activeBattle.rounds + 1)),
                  h('div', { className: 'text-[10px] text-slate-500' }, 'Power: ' + activeBattle.power)
                )
              ),
              // HP bar
              h('div', { className: 'w-full bg-slate-200 rounded-full h-3 overflow-hidden', role: 'progressbar', 'aria-label': 'Enemy health', 'aria-valuenow': activeBattle.currentHp, 'aria-valuemax': activeBattle.hp },
                h('div', { className: 'h-full rounded-full transition-all duration-500 ' + (activeBattle.currentHp / activeBattle.hp > 0.5 ? 'bg-red-500' : activeBattle.currentHp / activeBattle.hp > 0.25 ? 'bg-orange-500' : 'bg-yellow-500'), style: { width: (activeBattle.currentHp / activeBattle.hp * 100) + '%' } })
              ),
              h('div', { className: 'flex justify-between text-[10px] font-bold mt-1' },
                h('span', { className: 'text-red-600' }, activeBattle.currentHp + '/' + activeBattle.hp + ' HP'),
                h('span', { className: 'text-amber-600' }, '💡 Weakness: ' + activeBattle.weakness)
              ),
              h('p', { className: 'text-[10px] text-red-700 mt-1 font-medium' }, '⚔️ Write your battle action! Describe HOW you fight. Reference the weakness for +15 bonus damage!')
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
              'aria-label': 'Describe your action in the world',
              className: 'w-full text-sm p-3 border border-violet-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400 resize-none h-28' + (pasteDetected ? ' border-red-400 bg-red-50' : ''),
              disabled: actionLoading,
            }),
            pasteDetected && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-red-600 font-bold mt-1' }, '⚠ Pasting detected — please write your own words! Your writing power depends on YOUR creativity.'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center justify-between mt-2' },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-slate-400' }, actionText.split(/\s+/).filter(Boolean).length + ' words'),
              h('button', { 'aria-label': 'Worldbuilder action',
                onClick: function() { activeNPC ? respondToNPC() : activeBattle ? performBattleAction() : d.actionMode === 'craft' ? (craftSubMode === 'structure' ? buildStructure(actionText) : craftItem(actionText)) : performAction(); },
                disabled: actionText.trim().length < 5 || actionLoading,
                className: 'px-5 py-2.5 bg-gradient-to-r ' + (d.actionMode === 'craft' && craftSubMode === 'structure' ? 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' : d.actionMode === 'craft' ? 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700' : 'from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700') + ' text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-all shadow-lg flex items-center gap-2'
              }, actionLoading ? h('span', { className: 'animate-spin' }, '⏳') : h(Sparkles, { size: 16 }), actionLoading ? ' The world responds...' : activeNPC ? ' Respond' : activeBattle ? ' Attack!' : d.actionMode === 'craft' && craftSubMode === 'structure' ? ' Build!' : d.actionMode === 'craft' ? ' Craft!' : d.actionMode === 'explore' ? ' Explore!' : ' Act!')
            )
          ),

          // Action result
          actionResult && (actionResult.qualityScore >= 0 || actionResult.finalScore >= 0) && h('div', { className: 'space-y-3' },

            // Battle illustration
            d.battleImage && h('img', { src: d.battleImage, alt: 'Battle scene illustration', className: 'w-full h-40 object-cover rounded-2xl border-2 border-violet-200 shadow-lg' }),

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
                    h('div', { className: 'text-[11px] text-indigo-500 font-bold' }, '🧠 Strategy')
                  )
                ),
                actionResult.weaknessExploited && h('div', { className: 'mt-2 inline-block bg-amber-200 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold' }, '🎯 Weakness exploited!'),
                actionResult.environmentUsed && h('div', { className: 'mt-1 inline-block bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold' }, '🌍 Environment used!')
              ),

              // Writing breakdown
              actionResult.breakdown && h('div', { className: 'flex justify-center gap-3 p-3 bg-slate-50 border-t border-slate-100' },
                Object.entries(actionResult.breakdown).map(function(entry) {
                  return h('div', { key: entry[0], className: 'text-center' },
                    h('div', { className: 'text-sm font-black text-slate-700' }, entry[1], '/20'),
                    h('div', { className: 'text-[8px] text-slate-400 uppercase font-bold' }, entry[0])
                  );
                })
              ),

              // Player's narrative outcome
              h('div', { className: 'p-4 border-b border-slate-100' },
                h('div', { className: 'text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1' }, '⚔️ Your Action'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed italic' }, '"' + (actionResult.narrative || '') + '"')
              ),

              // Enemy's literary writing (mentor text)
              actionResult.enemyWriting && h('div', { className: 'p-4 bg-gradient-to-r from-red-50 to-orange-50' },
                h('div', { className: 'text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1' }, activeBattle ? activeBattle.emoji + ' ' : '', activeBattle ? activeBattle.name + ' Responds' : 'Enemy Responds'),
                h('p', { className: 'text-sm text-red-900 leading-relaxed font-medium' }, actionResult.enemyWriting),
                h('p', { className: 'text-[11px] text-red-400 italic mt-2' }, '📖 Notice the vivid language, sensory details, and figurative writing in the enemy\'s response — learn from how it describes its actions!')
              ),

              // Feedback
              h('div', { className: 'p-4 space-y-1' },
                actionResult.writingFeedback && h('p', { className: 'text-xs text-violet-600 font-medium' }, '✍️ Writing: ' + actionResult.writingFeedback),
                actionResult.strategyFeedback && h('p', { className: 'text-xs text-indigo-600 font-medium' }, '🧠 Strategy: ' + actionResult.strategyFeedback),
                actionResult.feedback && !actionResult.writingFeedback && h('p', { className: 'text-xs text-violet-600 font-medium' }, '💡 ' + actionResult.feedback)
              ),

              // Extras
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-4 pb-3 flex flex-wrap gap-2' },
                actionResult.xpEarned && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full' }, '+' + actionResult.xpEarned + ' XP'),
                actionResult.damageDealt && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full' }, '💥 ' + actionResult.damageDealt + ' damage'),
                actionResult.powerChange > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-1 rounded-full' }, '+' + actionResult.powerChange + ' Power'),
                actionResult.discoveredItem && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full' }, '🎁 Found: ' + actionResult.discoveredItem),
                (actionResult.vocabHighlights || []).map(function(v, vi) {
                  return h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: vi, className: 'text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full' }, '📖 ' + v);
                })
              )
            ),

            // TTS narrate both player and enemy
            callTTS && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
              h('button', { 'aria-label': 'Hear your action', onClick: function() { callTTS(actionResult.narrative || ''); }, className: 'text-[10px] text-violet-500 hover:text-violet-700 font-bold' }, '🔊 Hear your action'),
              actionResult.enemyWriting && h('button', { 'aria-label': 'Refresh', onClick: function() { callTTS(actionResult.enemyWriting); }, className: 'text-[10px] text-red-500 hover:text-red-700 font-bold' }, '🔊 Hear enemy\'s response')
            )
          ),

          // Action log
          actionLog.length > 0 && h('details', { className: 'bg-white rounded-xl border border-slate-400' },
            h('summary', { className: 'px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50' }, '📜 Adventure Log (' + actionLog.length + ' actions)'),
            h('div', { className: 'px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto' },
              actionLog.slice().reverse().map(function(entry, i) {
                return h('div', { key: i, className: 'text-[10px] text-slate-600 flex items-start gap-2' },
                  h('span', { className: 'font-bold shrink-0', style: { color: getQualityTier(entry.score).color } }, entry.score),
                  h('span', { className: 'text-slate-400' }, entry.room + ':'),
                  h('span', { className: 'truncate' }, entry.text)
                );
              })
            )
          ),

          // Stats
          h('div', { className: 'grid grid-cols-4 gap-2' },
            h('div', { className: 'bg-violet-50 rounded-xl border border-violet-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-violet-600' }, roomsVisited.length), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'Explored')
            ),
            h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-amber-600' }, actionLog.length), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'Actions')
            ),
            h('div', { className: 'bg-red-50 rounded-xl border border-red-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-red-600' }, d.battlesWon || 0), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'Battles Won')
            ),
            h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-emerald-600' }, legendaryActions), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'Legendary')
            ),
            h('div', { className: 'bg-cyan-50 rounded-xl border border-cyan-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-cyan-600' }, conflictsResolved), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'Resolved')
            ),
            h('div', { className: 'bg-blue-50 rounded-xl border border-blue-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-blue-600' }, vocabTermsUsed.length), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'Vocab')
            ),
            h('div', { className: 'bg-teal-50 rounded-xl border border-teal-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-teal-600' }, selSkillsUsed.length), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'SEL Skills')
            ),
            h('div', { className: 'bg-purple-50 rounded-xl border border-purple-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-purple-600' }, completedQuests), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'Quests')
            ),
            h('div', { className: 'bg-orange-50 rounded-xl border border-orange-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-orange-600' }, inventory.length), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'Items')
            ),
            h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-emerald-600' }, structures.length), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'Structures')
            ),
            harmonyScore > 0 && h('div', { className: 'bg-indigo-50 rounded-xl border border-indigo-200 p-2 text-center' },
              h('div', { className: 'text-lg font-black text-indigo-600' }, harmonyScore), h('div', { className: 'text-[8px] text-slate-500 font-bold' }, 'Harmony')
            )
          ),

          // Reset
          // ── Game Master Panel (teacher creates characters) ──
          h('details', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200' },
            h('summary', { className: 'px-4 py-3 text-sm font-bold text-amber-700 cursor-pointer hover:bg-amber-100 rounded-2xl transition-colors' }, '🎭 Game Master — Create Characters & Quests'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-4 pb-4 space-y-3' },
              h('p', { className: 'text-xs text-amber-600' }, 'Create individual characters or launch full scenarios with multiple NPCs interacting.'),

              // Scenario templates
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mb-3' },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1.5' }, '📋 Quick Scenarios (creates multiple characters)'),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5' },
                  SCENARIO_TEMPLATES.map(function(tmpl) {
                    return h('button', { 'aria-label': 'Action', key: tmpl.type,
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
                              if (addToast) addToast(tmpl.label + ' scenario created — ' + npcs.length + ' characters!', 'success');
                            }
                          } catch(e) { upd('actionLoading', false); }
                        }).catch(function() { upd('actionLoading', false); });
                      },
                      disabled: actionLoading,
                      className: 'px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-amber-200 bg-white text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-all disabled:opacity-40'
                    }, tmpl.label);
                  })
                )
              ),

              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1' }, 'Or create a custom character:'),
              h('textarea', {
                value: d.gmCharacterPrompt || '',
                onChange: function(e) { upd('gmCharacterPrompt', e.target.value); },
                placeholder: 'Describe a character... e.g., "A young refugee who lost her family and struggles to trust strangers" or "A merchant who cheated a customer and feels guilty" or "An elder who holds knowledge about the history everyone has forgotten"',
                'aria-label': 'Describe a character for the world',
                className: 'w-full text-sm p-3 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 resize-none h-20'
              }),
              h('button', { 'aria-label': 'Change gm character prompt',
                onClick: function() { if ((d.gmCharacterPrompt || '').trim()) { createGMCharacter(d.gmCharacterPrompt); upd('gmCharacterPrompt', ''); } },
                disabled: !(d.gmCharacterPrompt || '').trim() || actionLoading,
                className: 'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-40 transition-colors'
              }, actionLoading ? 'Creating...' : '✨ Create Character'),
              gmCharacters.length > 0 && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-2 mt-2' },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-amber-600 uppercase tracking-widest' }, 'Characters in World (' + gmCharacters.length + ')'),
                gmCharacters.map(function(npc, i) {
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: i, className: 'flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 text-xs' },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-lg' }, npc.emoji),
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex-1 min-w-0' },
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'font-bold text-slate-800' }, npc.name),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-slate-500 ml-1' }, '(' + npc.role + ')'),
                      npc.selTheme && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'ml-1 text-[8px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-bold' }, npc.selTheme)
                    ),
                    h('button', { onClick: function() { updMulti({ gmCharacters: gmCharacters.filter(function(_, j) { return j !== i; }) }); }, className: 'text-slate-500 hover:text-red-500 text-[10px]', 'aria-label': 'Remove ' + npc.name }, '✕')
                  );
                })
              )
            )
          ),

          h('button', { 'aria-label': 'Start a New World', onClick: function() { updMulti({ selectedWorld: null, currentRoom: null, writingPower: 0, totalXP: 0, actionLog: [], actionResult: null, sceneImage: null, roomsVisited: [], battlesWon: 0, legendaryActions: 0, vocabTermsUsed: [], gmCharacters: [], activeNPC: null, npcHistory: [], conflictsResolved: 0, selSkillsUsed: [], activeBattle: null, battleLog: [], playerBase: null, characterPortrait: null, characterPortraitLoading: false, characterAppearance: '', inventory: [], craftedThisTurn: false, activeItem: null, npcRapport: {}, npcQuests: {}, harmonyScore: 0, completedQuests: 0, battleImage: null, structures: [], structureCooldown: 0, craftSubMode: 'item', playerGradeLevel: null }); }, className: 'text-[10px] text-slate-400 hover:text-slate-600 font-bold' }, '🔄 Start a New World')
        )
      );
    }
  });
})();
}

console.log('[StemLab] stem_tool_worldbuilder.js loaded');
