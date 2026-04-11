/**
 * AlloFlow Escape Room CDN Module
 *
 * Contains: createEscapeRoomEngine (factory), EscapeRoomGameplay, EscapeRoomDialogs
 *
 * Extracted from AlloFlowANTI.txt escape room engine block.
 * Source: AlloFlowANTI.txt lines 25599-26414 (logic), 41734-42412 (gameplay JSX), 47710-47928 (dialogs JSX)
 */
(function() {
  'use strict';
  // WCAG 2.1 AA: Accessibility CSS
  if (!document.getElementById("escape-room-module-a11y")) { var _s = document.createElement("style"); _s.id = "escape-room-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-400 { color: #64748b !important; }"; document.head.appendChild(_s); }

  // ── Duplicate-load guard ──
  if (window.__escapeRoomModuleLoaded) {
    console.warn('[EscapeRoomModule] Already loaded — skipping');
    return;
  }
  window.__escapeRoomModuleLoaded = true;

  // ── React dependencies ──
  var React = window.React;
  if (!React) { console.error('[EscapeRoomModule] React not found on window'); return; }
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useCallback = React.useCallback;
  var useRef = React.useRef;
  var useMemo = React.useMemo;
  var h = React.createElement;

  // ── Lucide icons from host app ──
  var _icons = window.AlloIcons || {};
  var DoorOpen = _icons.DoorOpen || function(){ return null; };
  var Clock = _icons.Clock || function(){ return null; };
  var Trophy = _icons.Trophy || function(){ return null; };
  var Lightbulb = _icons.Lightbulb || function(){ return null; };
  var Key = _icons.Key || function(){ return null; };
  var Sparkles = _icons.Sparkles || function(){ return null; };
  var Volume2 = _icons.Volume2 || function(){ return null; };
  var VolumeX = _icons.VolumeX || function(){ return null; };
  var Play = _icons.Play || function(){ return null; };
  var Lock = _icons.Lock || function(){ return null; };
  var CheckCircle = _icons.CheckCircle || function(){ return null; };
  var X = _icons.X || function(){ return null; };
  var ChevronUp = _icons.ChevronUp || function(){ return null; };
  var ChevronDown = _icons.ChevronDown || function(){ return null; };
  var GripVertical = _icons.GripVertical || function(){ return null; };
  var RefreshCw = _icons.RefreshCw || function(){ return null; };
  var XCircle = _icons.XCircle || function(){ return null; };
  var Eye = _icons.Eye || function(){ return null; };
  var EyeOff = _icons.EyeOff || function(){ return null; };
  var Save = _icons.Save || function(){ return null; };
  var Rocket = _icons.Rocket || function(){ return null; };
  var Settings = _icons.Settings || function(){ return null; };
  var Puzzle = _icons.Puzzle || function(){ return null; };
  var Star = _icons.Star || function(){ return null; };
  var Zap = _icons.Zap || function(){ return null; };
  var Shield = _icons.Shield || function(){ return null; };
  var Target = _icons.Target || function(){ return null; };
  var Brain = _icons.Brain || function(){ return null; };
  var Flame = _icons.Flame || function(){ return null; };
  var Crown = _icons.Crown || function(){ return null; };
  var Gem = _icons.Gem || function(){ return null; };
  var Skull = _icons.Skull || function(){ return null; };
  var Ghost = _icons.Ghost || function(){ return null; };
  var Wand2 = _icons.Wand2 || function(){ return null; };
  var Swords = _icons.Swords || function(){ return null; };
  var ScrollText = _icons.ScrollText || function(){ return null; };
  var MapPin = _icons.MapPin || function(){ return null; };
  var Compass = _icons.Compass || function(){ return null; };
  var Anchor = _icons.Anchor || function(){ return null; };
  var Music = _icons.Music || function(){ return null; };
  var Palette = _icons.Palette || function(){ return null; };
  var Camera = _icons.Camera || function(){ return null; };
  var Cpu = _icons.Cpu || function(){ return null; };
  var Globe = _icons.Globe || function(){ return null; };
  var Heart = _icons.Heart || function(){ return null; };
  var Moon = _icons.Moon || function(){ return null; };
  var Sun = _icons.Sun || function(){ return null; };
  var Cloud = _icons.Cloud || function(){ return null; };
  var Snowflake = _icons.Snowflake || function(){ return null; };
  var TreePine = _icons.TreePine || function(){ return null; };
  var Mountain = _icons.Mountain || function(){ return null; };
  var Waves = _icons.Waves || function(){ return null; };
  var Wind = _icons.Wind || function(){ return null; };
  var Bug = _icons.Bug || function(){ return null; };
  var Bird = _icons.Bird || function(){ return null; };
  var Fish = _icons.Fish || function(){ return null; };
  var Cat = _icons.Cat || function(){ return null; };
  var Dog = _icons.Dog || function(){ return null; };
  var Flower2 = _icons.Flower2 || function(){ return null; };
  var MicOff = _icons.MicOff || function(){ return null; };

  // ═══════════════════════════════════════════════════════════════
  // MODULE-LOCAL UTILITY
  // ═══════════════════════════════════════════════════════════════

  var derangeShuffle = function(arr) {
    if (arr.length <= 1) return arr.slice();
    var shuffled = arr.slice();
    var maxAttempts = 50;
    do {
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
      }
      maxAttempts--;
    } while (
      maxAttempts > 0 &&
      shuffled.some(function(val, idx) { return val === arr[idx]; })
    );
    return shuffled;
  };

  // ═══════════════════════════════════════════════════════════════
  // FACTORY: createEscapeRoomEngine
  // ═══════════════════════════════════════════════════════════════

  function createEscapeRoomEngine(deps) {
    var callGemini = deps.callGemini;
    var addToast = deps.addToast;
    var t = deps.t;
    var handleScoreUpdate = deps.handleScoreUpdate;
    var setGlobalPoints = deps.setGlobalPoints;
    var playSound = deps.playSound;
    var getState = deps.getState;
    var setState = deps.setState;
    var firebase = deps.firebase || {};
    var db = firebase.db;
    var doc = firebase.doc;
    var updateDoc = firebase.updateDoc;
    var shared = deps.shared || {};
    var safeGetItem = shared.safeGetItem || function(k) { try { return localStorage.getItem(k); } catch(e) { return null; } };
    var safeSetItem = shared.safeSetItem || function(k,v) { try { localStorage.setItem(k,v); } catch(e) {} };
    var warnLog = shared.warnLog || function() { console.warn.apply(console, arguments); };

    // ── generateEscapeRoom ──
    var generateEscapeRoom = async function() {
      var state = getState();
      var inputText = state.inputText;
      var escapeRoomState = state.escapeRoomState;
      if (!inputText || !inputText.trim()) {
        addToast(t('errors.no_text'), 'error');
        return;
      }
      var puzzleCount = (escapeRoomState && escapeRoomState.puzzleCount) || 10;
      var difficultyPresets = {
        easy: { timePerPuzzle: 45, lives: 99, hints: 5, xpMultiplier: 0.5 },
        normal: { timePerPuzzle: 30, lives: 3, hints: 3, xpMultiplier: 1.0 },
        hard: { timePerPuzzle: 20, lives: 1, hints: 1, xpMultiplier: 2.0 }
      };
      var selectedDifficulty = (escapeRoomState && escapeRoomState.difficulty) || 'normal';
      var preset = difficultyPresets[selectedDifficulty];
      var totalTime = puzzleCount * preset.timePerPuzzle;
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          isActive: true,
          isGenerating: true,
          room: null,
          puzzles: [],
          solvedPuzzles: new Set(),
          isEscaped: false,
          timeRemaining: totalTime,
          maxTime: totalTime,
          selectedObject: null,
          discoveredClues: {},
          finalDoorUnlocked: false,
          finalDoorPuzzle: null,
          showFinalDoor: false,
          difficulty: selectedDifficulty,
          lives: preset.lives,
          maxLives: preset.lives,
          hintsRemaining: preset.hints,
          maxHints: preset.hints,
          xpMultiplier: preset.xpMultiplier,
          streak: 0,
          wrongAttempts: 0,
          isGameOver: false,
          timerPaused: true
        });
      });
      setState.setEscapeTimeLeft(totalTime);
      setState.setIsEscapeTimerRunning(false);
      var escapeRoomPrompt = 'You are creating an ADVANCED educational Escape Room with DIVERSE PUZZLE TYPES based on the following content.\n' +
'SOURCE CONTENT:\n' +
inputText.substring(0, 6000) + '\n' +
'TASK:\n' +
'Generate a themed escape room with ' + puzzleCount + ' interactive objects. Each object hides a DIFFERENT TYPE of puzzle.\n' +
'PUZZLE TYPES (use a variety - ensure good mix):\n' +
'1. "mcq" - Multiple choice question with 4 options\n' +
'2. "sequence" - Put 4-5 items in the correct order (chronological, size, importance, etc.)\n' +
'3. "cipher" - A content-based RIDDLE with word options. The riddle clues to a key vocabulary word. MUST include "wordbank" array with 1 correct + 3-4 decoy words\n' +
'4. "matching" - Match 4 pairs of related items (term<->definition, cause<->effect, etc.)\n' +
'5. "scramble" - Unscramble letters to form a key vocabulary word from the content\n' +
'6. "fillin" - Fill-in-the-blank CLOZE STYLE with wordbank (NO TYPING - student selects from choices). MUST include "wordbank" array with 1 correct + 3-4 decoys\n' +
'CLUE CHAIN:\n' +
'- Create connections between puzzles! When a puzzle is solved, it can reveal a clue that helps with another puzzle.\n' +
'- Puzzle 1 should reveal a clue for Puzzle 3\n' +
'- Puzzle 2 should reveal a clue for Puzzle 4\n' +
'- This creates a narrative flow and interdependency.\n' +
'FINAL DOOR:\n' +
'- Include a final synthesis puzzle that requires knowledge from solving the other puzzles\n' +
'- This should be a challenging fill-in-the-blank or short answer that ties everything together\n' +
'IMPORTANT:\n' +
'- Generate EXACTLY ' + puzzleCount + ' objects and ' + puzzleCount + ' puzzles\n' +
'- All content must be answerable from the source material\n' +
'- Theme should relate to the content topic (science lab, historical archive, mystery library, etc.)\n' +
'- Each object needs a thematic emoji and evocative name\n' +
'- Questions should test understanding, not just memorization\n' +
'- HINTS MUST BE VAGUE AND INDIRECT: Hints should NEVER reveal or strongly suggest the correct answer. Good hints encourage thinking about the topic area without pointing to specific answers. Bad: "The answer is the first option" or "It starts with P". Good: "Think about what you learned about energy..." or "Consider the time period...". Hints are a nudge in the right direction, NOT a giveaway.\n' +
'Return ONLY valid JSON (no markdown wrapper):\n' +
'{\n' +
'  "room": {\n' +
'    "theme": "string (e.g., \'Ancient Library\', \'Space Station Lab\', \'Detective Office\')",\n' +
'    "description": "2-3 sentence atmospheric description setting the scene"\n' +
'  },\n' +
'  "objects": [\n' +
'    { "id": "obj1", "emoji": "\\ud83d\\udcd6", "name": "Old Book", "description": "A dusty tome with strange symbols" }\n' +
'  ],\n' +
'  "puzzles": [\n' +
'    {\n' +
'      "id": "p1",\n' +
'      "type": "mcq",\n' +
'      "linkedObjectId": "obj1",\n' +
'      "question": "Multiple choice question?",\n' +
'      "options": ["Option A", "Option B", "Option C", "Option D"],\n' +
'      "correctIndex": 0,\n' +
'      "hint": "Optional hint text",\n' +
'      "revealsClueFor": "p3",\n' +
'      "revealedClue": "The clue text that helps solve puzzle p3"\n' +
'    },\n' +
'    {\n' +
'      "id": "p2",\n' +
'      "type": "sequence",\n' +
'      "linkedObjectId": "obj2",\n' +
'      "question": "Put these items in the correct order:",\n' +
'      "items": ["First item", "Second item", "Third item", "Fourth item"],\n' +
'      "correctOrder": [0, 1, 2, 3],\n' +
'      "hint": "Think chronologically..."\n' +
'    },\n' +
'    {\n' +
'      "id": "p3",\n' +
'      "type": "fillin",\n' +
'      "linkedObjectId": "obj3",\n' +
'      "question": "Complete this sentence:",\n' +
'      "sentence": "The process of _____ converts sunlight into energy.",\n' +
'      "answer": "photosynthesis",\n' +
'      "wordbank": ["photosynthesis", "respiration", "digestion", "evaporation"],\n' +
'      "hint": "Plants do this with sunlight..."\n' +
'    },\n' +
'    {\n' +
'      "id": "p4",\n' +
'      "type": "matching",\n' +
'      "linkedObjectId": "obj4",\n' +
'      "question": "Match each term with its definition:",\n' +
'      "pairs": [\n' +
'        { "left": "Term 1", "right": "Definition 1" },\n' +
'        { "left": "Term 2", "right": "Definition 2" },\n' +
'        { "left": "Term 3", "right": "Definition 3" },\n' +
'        { "left": "Term 4", "right": "Definition 4" }\n' +
'      ],\n' +
'      "hint": "Think about the relationships..."\n' +
'    },\n' +
'    {\n' +
'      "id": "p5",\n' +
'      "type": "scramble",\n' +
'      "linkedObjectId": "obj5",\n' +
'      "question": "Unscramble this key term from the content:",\n' +
'      "scrambledWord": "NOMTPOAIHHS",\n' +
'      "answer": "PHOTOSYNTHESIS",\n' +
'      "hint": "It\'s a scientific process..."\n' +
'    },\n' +
'    {\n' +
'      "id": "p6",\n' +
'      "type": "cipher",\n' +
'      "linkedObjectId": "obj6",\n' +
'      "question": "Solve this riddle:",\n' +
'      "encodedText": "I am made by plants using sunlight. I am stored in glucose. I release oxygen as a byproduct. What process am I?",\n' +
'      "answer": "photosynthesis",\n' +
'      "wordbank": ["photosynthesis", "respiration", "decomposition", "fermentation"],\n' +
'      "hint": "Think about what plants do during the day..."\n' +
'    }\n' +
'  ],\n' +
'  "finalDoor": {\n' +
'    "sentence": "A fill-in-the-blank synthesis sentence with _____ for the blank",\n' +
'    "answer": "The expected answer word",\n' +
'    "wordbank": ["correct_answer", "decoy1", "decoy2", "decoy3"],\n' +
'    "acceptableAnswers": ["answer1", "answer2", "similar answer"]\n' +
'  }\n' +
'}';
      try {
        var response = await callGemini(escapeRoomPrompt, true);
        var jsonText = response.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
        var data = JSON.parse(jsonText);
        if (data.room && data.objects && data.puzzles) {
          var processedPuzzles = data.puzzles.map(function(p, i) {
            var processed = Object.assign({}, p, {
              linkedObject: data.objects.find(function(o) { return o.id === p.linkedObjectId; }) || data.objects[i]
            });
            if (p.type === 'sequence' && p.items) {
              var indices = p.items.map(function(_, idx) { return idx; });
              processed.shuffledItems = derangeShuffle(indices);
            }
            if (p.type === 'scramble' && p.scrambledWord) {
              processed.displayLetters = derangeShuffle(p.scrambledWord.split('').filter(function(c) { return c.trim(); }));
            }
            if (p.type === 'matching' && p.pairs) {
              processed.leftColumn = derangeShuffle(p.pairs.map(function(pair) { return pair.left; }));
              processed.rightColumn = derangeShuffle(p.pairs.map(function(pair) { return pair.right; }));
            }
            if (p.type === 'fillin' && p.wordbank) {
              processed.wordbank = derangeShuffle(p.wordbank);
            }
            if (p.type === 'cipher' && p.wordbank) {
              processed.wordbank = derangeShuffle(p.wordbank);
            }
            return processed;
          });
          var processedFinalDoor = data.finalDoor || null;
          if (processedFinalDoor && processedFinalDoor.wordbank) {
            processedFinalDoor = Object.assign({}, processedFinalDoor, {
              wordbank: derangeShuffle(processedFinalDoor.wordbank)
            });
          }
          setState.setEscapeRoomState(function(prev) {
            return Object.assign({}, prev, {
              isGenerating: false,
              isActive: false,
              room: data.room,
              puzzles: processedPuzzles,
              objects: data.objects,
              totalPuzzles: processedPuzzles.length,
              finalDoorPuzzle: processedFinalDoor,
              savedEscapeRoom: { room: data.room, objects: data.objects, puzzles: data.puzzles, finalDoor: data.finalDoor || processedFinalDoor },
              isPreview: true
            });
          });
          playSound('correct');
        } else {
          throw new Error('Invalid escape room data structure');
        }
      } catch (e) {
        warnLog('Escape room generation failed:', e);
        addToast(t('errors.generation_failed'), 'error');
        setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isActive: false, isGenerating: false }); });
      }
    };

    // ── launchCollaborativeEscapeRoom ──
    var launchCollaborativeEscapeRoom = async function() {
      var state = getState();
      var inputText = state.inputText;
      var activeSessionCode = state.activeSessionCode;
      var user = state.user;
      var activeSessionAppId = state.activeSessionAppId;
      if (!inputText || !inputText.trim()) {
        addToast(t('errors.no_text'), 'error');
        return;
      }
      if (!activeSessionCode) {
        addToast(t('errors.no_session'), 'error');
        return;
      }
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          isActive: true,
          isGenerating: true,
          room: null,
          puzzles: [],
          solvedPuzzles: new Set(),
          isEscaped: false,
          timeRemaining: 300
        });
      });
      var escapeRoomPrompt = 'You are creating an educational Escape Room with DIVERSE PUZZLE TYPES based on the following content.\n' +
'SOURCE CONTENT:\n' +
inputText.substring(0, 6000) + '\n' +
'TASK:\n' +
'Generate a themed escape room with 10 interactive objects. Each object hides a puzzle.\n' +
'Return ONLY valid JSON:\n' +
'{\n' +
'  "room": { "theme": "string", "description": "2-3 sentence description" },\n' +
'  "objects": [{ "id": "obj1", "emoji": "\\ud83d\\udcd6", "name": "Old Book" }],\n' +
'  "puzzles": [{ "id": "p1", "type": "mcq", "linkedObjectId": "obj1", "question": "?", "options": ["A","B","C","D"], "correctIndex": 0, "hint": "" }]\n' +
'}';
      try {
        var response = await callGemini(escapeRoomPrompt, true);
        var jsonText = response.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
        var data = JSON.parse(jsonText);
        if (data.room && data.objects && data.puzzles) {
          var processedPuzzles = data.puzzles.map(function(p, i) {
            var shuffledItems = null;
            var correctOrder = p.correctOrder || null;
            if (p.type === 'sequence' && p.items) {
              var indices = p.items.map(function(_, idx) { return idx; });
              shuffledItems = derangeShuffle(indices);
              correctOrder = p.items.map(function(_, idx) { return idx; });
            }
            return Object.assign({}, p, {
              linkedObject: data.objects.find(function(o) { return o.id === p.linkedObjectId; }) || data.objects[i],
              shuffledItems: shuffledItems,
              correctOrder: correctOrder,
              displayLetters: p.type === 'scramble' && p.scrambledWord ? derangeShuffle(p.scrambledWord.split('')) : null
            });
          });
          if (doc && db && updateDoc) {
            var appId = activeSessionAppId;
            var sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
            await updateDoc(sessionRef, {
              'escapeRoomState': {
                isActive: true,
                room: data.room,
                puzzles: processedPuzzles,
                objects: data.objects,
                teams: {},
                teamProgress: {
                  Red: { solvedPuzzles: [], isEscaped: false },
                  Blue: { solvedPuzzles: [], isEscaped: false },
                  Green: { solvedPuzzles: [], isEscaped: false },
                  Yellow: { solvedPuzzles: [], isEscaped: false }
                },
                timeRemaining: 300,
                startedAt: Date.now(),
                hostId: (user && user.uid) || null
              }
            });
          }
          setState.setEscapeRoomState(function(prev) {
            return Object.assign({}, prev, {
              isGenerating: false,
              room: data.room,
              puzzles: processedPuzzles,
              objects: data.objects,
              totalPuzzles: processedPuzzles.length
            });
          });
          playSound('correct');
          addToast(t('escape_room.team_race'), 'success');
        } else {
          throw new Error('Invalid escape room data');
        }
      } catch (e) {
        warnLog('Collaborative escape room failed:', e);
        addToast(t('errors.generation_failed'), 'error');
        setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isActive: false, isGenerating: false }); });
      }
    };

    // ── endCollaborativeEscapeRoom ──
    var endCollaborativeEscapeRoom = async function() {
      var state = getState();
      var activeSessionCode = state.activeSessionCode;
      var activeSessionAppId = state.activeSessionAppId;
      if (!activeSessionCode) return;
      try {
        if (doc && db && updateDoc) {
          var sessionRef = doc(db, 'artifacts', activeSessionAppId, 'public', 'data', 'sessions', activeSessionCode);
          await updateDoc(sessionRef, { 'escapeRoomState.isActive': false });
        }
        addToast(t('escape_room.end_game'), 'success');
      } catch (e) { warnLog('Failed to end escape room:', e); }
      resetEscapeRoom();
    };

    // ── handlePuzzleSolved ──
    var handlePuzzleSolved = function(puzzleId) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var activeSessionCode = state.activeSessionCode;
      var sessionData = state.sessionData;
      var user = state.user;
      var activeSessionAppId = state.activeSessionAppId;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle) return;
      playSound('correct');
      var newSolved = new Set(escapeRoomState.solvedPuzzles);
      newSolved.add(puzzleId);
      var newClues = Object.assign({}, escapeRoomState.discoveredClues);
      if (puzzle.revealsClueFor && puzzle.revealedClue) {
        newClues[puzzle.revealsClueFor] = puzzle.revealedClue;
      }
      var shouldUnlockDoor = newSolved.size >= 4 && !escapeRoomState.finalDoorUnlocked;
      var baseXP = 20;
      var calculatedStreak = (escapeRoomState.currentStreak || 0) + 1;
      var streakMultiplier = calculatedStreak >= 5 ? 3 : calculatedStreak >= 3 ? 2 : 1;
      var difficultyMultiplier = escapeRoomState.difficulty === 'hard' ? 1.5 :
                                  escapeRoomState.difficulty === 'easy' ? 0.75 : 1;
      var hintPenalty = ((escapeRoomState.hintsUsed && escapeRoomState.hintsUsed[puzzleId]) ? 1 : 0) * 5;
      var escapeTimeLeft = state.escapeTimeLeft;
      var timeBonus = escapeRoomState.timerEnabled && escapeRoomState.timeRemaining > 180 ? 10 :
                      escapeRoomState.timerEnabled && escapeRoomState.timeRemaining > 60 ? 5 : 0;
      var puzzleXP = Math.max(5, Math.round((baseXP * streakMultiplier * difficultyMultiplier) + timeBonus - hintPenalty));
      handleScoreUpdate(puzzleXP, "Escape Room Puzzle", puzzleId);
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          solvedPuzzles: newSolved,
          selectedObject: null,
          discoveredClues: newClues,
          finalDoorUnlocked: shouldUnlockDoor || prev.finalDoorUnlocked,
          showClueAnimation: puzzle.revealsClueFor ? true : false,
          currentStreak: calculatedStreak,
          bestStreak: Math.max(prev.bestStreak || 0, calculatedStreak),
          streakMultiplier: streakMultiplier,
          textInput: '',
          sequenceOrder: [],
          matchingPairs: [],
          matchingSelected: null,
          scrambleLetters: []
        });
      });
      if (activeSessionCode && sessionData && sessionData.escapeRoomState && sessionData.escapeRoomState.isActive && user && user.uid) {
        var userTeam = sessionData.escapeRoomState.teams && sessionData.escapeRoomState.teams[user.uid];
        if (userTeam && doc && db && updateDoc) {
          var sessionRef = doc(db, 'artifacts', activeSessionAppId, 'sessions', activeSessionCode);
          var currentSolved = (sessionData.escapeRoomState.teamProgress && sessionData.escapeRoomState.teamProgress[userTeam] && sessionData.escapeRoomState.teamProgress[userTeam].solvedPuzzles) || [];
          var totalPuzzles = (sessionData.escapeRoomState.puzzles && sessionData.escapeRoomState.puzzles.length) || 5;
          var combined = currentSolved.concat([puzzleId]);
          var newTeamSolved = combined.filter(function(v, i, a) { return a.indexOf(v) === i; });
          var isEscaped = newTeamSolved.length >= totalPuzzles;
          var updates = {};
          updates['escapeRoomState.teamProgress.' + userTeam + '.solvedPuzzles'] = newTeamSolved;
          updates['escapeRoomState.teamProgress.' + userTeam + '.isEscaped'] = isEscaped;
          updateDoc(sessionRef, updates).catch(function(e) { warnLog('Failed to sync puzzle progress:', e); });
          if (isEscaped) {
            addToast(t('escape_room.team_escaped', { team: userTeam }), 'success');
          }
        }
      }
      if (calculatedStreak === 3) {
        addToast('\uD83D\uDD25 ' + t('escape_room.streak_bonus', { streak: 3, multiplier: 2 }), 'success');
      } else if (calculatedStreak === 5) {
        addToast('\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25 ' + t('escape_room.streak_bonus', { streak: 5, multiplier: 3 }), 'success');
      }
      if (puzzle.revealsClueFor && puzzle.revealedClue) {
        setTimeout(function() {
          addToast(t('escape_room.clue_found') + ' ' + puzzle.revealedClue, 'info');
          setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showClueAnimation: false }); });
        }, 500);
      }
      var xpMessage = streakMultiplier > 1
        ? t('escape_room.xp_earned_streak', { xp: puzzleXP, multiplier: streakMultiplier })
        : t('escape_room.xp_earned', { xp: puzzleXP });
      addToast(t('escape_room.correct') + ' ' + xpMessage, 'success');
      if (shouldUnlockDoor) {
        setTimeout(function() {
          addToast(t('escape_room.final_door_ready'), 'info');
        }, 1500);
      }
      if (newSolved.size >= escapeRoomState.puzzles.length) {
        var completionBonus = escapeRoomState.difficulty === 'hard' ? 75 :
                              escapeRoomState.difficulty === 'easy' ? 25 : 50;
        handleScoreUpdate(completionBonus, "Escape Room Complete", 'escape-room-complete-' + (escapeRoomState.theme || 'default'));
        addToast('\uD83C\uDFC6 ' + t('escape_room.all_solved_bonus', { xp: completionBonus }), 'success');
      }
    };

    // ── handleSelectObject ──
    var handleSelectObject = function(obj) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      if (!obj || (escapeRoomState.solvedPuzzles && escapeRoomState.solvedPuzzles.has && escapeRoomState.solvedPuzzles.has(obj.id))) return;
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          selectedObject: obj,
          timerPaused: false
        });
      });
      playSound('click');
    };

    // ── handleWrongAnswer ──
    var handleWrongAnswer = function(puzzleId) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      playSound('incorrect');
      var timePenalty = 10;
      var newTimeRemaining = Math.max(0, (escapeRoomState.timeRemaining || 0) - timePenalty);
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          wrongAttempts: (prev.wrongAttempts || 0) + 1,
          currentStreak: 0,
          timeRemaining: newTimeRemaining
        });
      });
      if (newTimeRemaining <= 0) {
        addToast(t('escape_room.game_over_time'), 'error');
        setTimeout(function() {
          setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isActive: false, hasEscaped: false }); });
        }, 2000);
      } else {
        addToast(t('escape_room.incorrect') + ' ' + t('escape_room.time_penalty', { seconds: timePenalty }), 'error');
      }
    };

    // ── handleEscapeRoomAnswer ──
    var handleEscapeRoomAnswer = function(puzzleId, selectedIndex) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      if (selectedIndex === puzzle.correctIndex) {
        handlePuzzleSolved(puzzleId);
      } else {
        handleWrongAnswer(puzzleId);
      }
    };

    // ── handleSequenceAnswer ──
    var handleSequenceAnswer = function(puzzleId, userOrder) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      var isCorrect = JSON.stringify(userOrder) === JSON.stringify(puzzle.correctOrder);
      if (isCorrect) {
        handlePuzzleSolved(puzzleId);
      } else {
        handleWrongAnswer(puzzleId);
      }
    };

    // ── handleCipherAnswer ──
    var handleCipherAnswer = function(puzzleId, userAnswer) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      var normalizedUser = userAnswer.toLowerCase().trim();
      var normalizedAnswer = puzzle.answer.toLowerCase().trim();
      if (normalizedUser === normalizedAnswer) {
        handlePuzzleSolved(puzzleId);
      } else {
        handleWrongAnswer(puzzleId);
      }
    };

    // ── handleMatchingSelect ──
    var handleMatchingSelect = function(puzzleId, item, column) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      var currentSelected = escapeRoomState.matchingSelected;
      if (!currentSelected) {
        setState.setEscapeRoomState(function(prev) {
          return Object.assign({}, prev, { matchingSelected: { item: item, column: column } });
        });
      } else if (currentSelected.column === column) {
        setState.setEscapeRoomState(function(prev) {
          return Object.assign({}, prev, { matchingSelected: { item: item, column: column } });
        });
      } else {
        var pair = currentSelected.column === 'left'
          ? [currentSelected.item, item]
          : [item, currentSelected.item];
        var isCorrectPair = puzzle.pairs.some(function(p) {
          return p.left === pair[0] && p.right === pair[1];
        });
        if (isCorrectPair) {
          var newPairs = (escapeRoomState.matchingPairs || []).concat([pair]);
          if (newPairs.length >= puzzle.pairs.length) {
            handlePuzzleSolved(puzzleId);
          } else {
            playSound('click');
            setState.setEscapeRoomState(function(prev) {
              return Object.assign({}, prev, { matchingPairs: newPairs, matchingSelected: null });
            });
          }
        } else {
          handleWrongAnswer(puzzleId);
          setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { matchingSelected: null }); });
        }
      }
    };

    // ── handleScrambleAnswer ──
    var handleScrambleAnswer = function(puzzleId, userAnswer) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle || escapeRoomState.solvedPuzzles.has(puzzleId)) return;
      var normalizedUser = userAnswer.toUpperCase().trim().replace(/\s/g, '');
      var normalizedAnswer = puzzle.answer.toUpperCase().trim().replace(/\s/g, '');
      if (normalizedUser === normalizedAnswer) {
        handlePuzzleSolved(puzzleId);
      } else {
        handleWrongAnswer(puzzleId);
      }
    };

    // ── handleFillinAnswer ──
    var handleFillinAnswer = function(puzzleId, userAnswer) {
      handleCipherAnswer(puzzleId, userAnswer);
    };

    // ── handleFinalDoorAnswer ──
    var handleFinalDoorAnswer = function(userAnswer) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var finalPuzzle = escapeRoomState.finalDoorPuzzle;
      if (!finalPuzzle) return;
      var normalizedUser = userAnswer.toLowerCase().trim();
      var normalizedMain = finalPuzzle.answer.toLowerCase().trim();
      var acceptableAnswers = (finalPuzzle.acceptableAnswers || []).map(function(a) { return a.toLowerCase().trim(); });
      var isCorrect = normalizedUser === normalizedMain ||
                      acceptableAnswers.indexOf(normalizedUser) !== -1 ||
                      acceptableAnswers.some(function(a) { return normalizedUser.indexOf(a) !== -1 || a.indexOf(normalizedUser) !== -1; });
      if (isCorrect) {
        playSound('correct');
        var isPerfect = (escapeRoomState.wrongAttempts || 0) === 0;
        if (isPerfect) {
          var bonusXP = 50;
          setGlobalPoints(function(prev) { return prev + bonusXP; });
          addToast(t('escape_room.victory_perfect'), 'success');
        } else {
          addToast(t('escape_room.victory_normal'), 'success');
        }
        setState.setEscapeRoomState(function(prev) {
          return Object.assign({}, prev, { isEscaped: true, showFinalDoor: false });
        });
        setState.setIsEscapeTimerRunning(false);
      } else {
        handleWrongAnswer();
      }
    };

    // ── resetEscapeRoom ──
    var resetEscapeRoom = function() {
      setState.setEscapeRoomState({
        isActive: false,
        room: null,
        puzzles: [],
        currentPuzzleIndex: null,
        solvedPuzzles: new Set(),
        totalPuzzles: 5,
        timeRemaining: 300,
        isEscaped: false,
        isGenerating: false,
        selectedObject: null,
        objects: [],
        wrongAttempts: 0,
        discoveredClues: {},
        sequenceOrder: [],
        matchingPairs: [],
        matchingSelected: null,
        scrambleLetters: [],
        textInput: '',
        showClueAnimation: false,
        finalDoorUnlocked: false,
        finalDoorPuzzle: null,
        showFinalDoor: false,
        difficulty: 'normal',
        timerEnabled: true,
        timerPaused: false,
        timeLimit: 300,
        hintsUsed: {},
        totalHintsUsed: 0,
        livesEnabled: false,
        livesRemaining: 3,
        maxLives: 3,
        currentStreak: 0,
        bestStreak: 0,
        streakMultiplier: 1,
        roomTheme: null,
        achievements: [],
        showSettings: false
      });
    };

    // ── handleRevealHint ──
    var handleRevealHint = function(puzzleId) {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.id === puzzleId; });
      if (!puzzle) return;
      if (escapeRoomState.hintsUsed && escapeRoomState.hintsUsed[puzzleId]) {
        var hintText = puzzle.hint || (puzzle.hints && puzzle.hints[0]);
        if (hintText) {
          addToast('\uD83D\uDCA1 ' + t('escape_room.hint') + ': ' + hintText, 'info');
        }
        return;
      }
      if ((escapeRoomState.hintsRemaining || 0) <= 0) {
        addToast(t('escape_room.no_hints_remaining') || 'No hints remaining!', 'warning');
        return;
      }
      var hintText2 = puzzle.hint || (puzzle.hints && puzzle.hints[0]);
      if (!hintText2) {
        addToast(t('escape_room.no_hint_available') || 'No hint available for this puzzle', 'info');
        return;
      }
      var hintCost = 5;
      setGlobalPoints(function(prev) { return Math.max(0, prev - hintCost); });
      setState.setEscapeRoomState(function(prev) {
        var newHintsUsed = Object.assign({}, prev.hintsUsed);
        newHintsUsed[puzzleId] = true;
        return Object.assign({}, prev, {
          hintsRemaining: Math.max(0, (prev.hintsRemaining || 0) - 1),
          hintsUsed: newHintsUsed,
          totalHintsUsed: (prev.totalHintsUsed || 0) + 1
        });
      });
      addToast('\uD83D\uDCA1 ' + t('escape_room.hint') + ': ' + hintText2, 'info');
    };

    // ── openEscapeRoomSettings ──
    var openEscapeRoomSettings = function() {
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          showSettings: true,
          puzzleCount: prev.puzzleCount || 10,
          difficulty: prev.difficulty || 'normal'
        });
      });
    };

    // ── updateEscapeRoomSetting ──
    var updateEscapeRoomSetting = function(key, value) {
      setState.setEscapeRoomState(function(prev) {
        var upd = {};
        upd[key] = value;
        return Object.assign({}, prev, upd);
      });
    };

    // ── launchEscapeRoomWithSettings ──
    var launchEscapeRoomWithSettings = function() {
      setState.setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showSettings: false }); });
      generateEscapeRoom();
    };

    // ── confirmEscapeRoomPreview ──
    var confirmEscapeRoomPreview = function() {
      setState.setEscapeRoomState(function(prev) {
        return Object.assign({}, prev, {
          isPreview: false,
          isActive: true,
          timerPaused: true
        });
      });
      playSound('correct');
      addToast(t('escape_room.preview_confirmed') || '\u2705 Escape Room locked \u2014 ready to play!', 'success');
    };

    // ── updateEscapeRoomPuzzle ──
    var updateEscapeRoomPuzzle = function(puzzleIndex, field, value) {
      setState.setEscapeRoomState(function(prev) {
        var newPuzzles = prev.puzzles.slice();
        var puzzle = Object.assign({}, newPuzzles[puzzleIndex]);
        if (field === 'question') puzzle.question = value;
        else if (field === 'hint') puzzle.hint = value;
        else if (field === 'answer') puzzle.answer = value;
        else if (field === 'sentence') puzzle.sentence = value;
        else if (field === 'encodedText') puzzle.encodedText = value;
        else if (field === 'options' && puzzle.type === 'mcq') {
          var newOptions = puzzle.options.slice();
          newOptions[value.index] = value.text;
          puzzle.options = newOptions;
        }
        newPuzzles[puzzleIndex] = puzzle;
        var savedPuzzles = prev.savedEscapeRoom ? prev.savedEscapeRoom.puzzles.slice() : [];
        if (savedPuzzles[puzzleIndex]) {
          savedPuzzles[puzzleIndex] = Object.assign({}, savedPuzzles[puzzleIndex]);
          if (field === 'question') savedPuzzles[puzzleIndex].question = value;
          else if (field === 'hint') savedPuzzles[puzzleIndex].hint = value;
          else if (field === 'answer') savedPuzzles[puzzleIndex].answer = value;
          else if (field === 'sentence') savedPuzzles[puzzleIndex].sentence = value;
          else if (field === 'encodedText') savedPuzzles[puzzleIndex].encodedText = value;
          else if (field === 'options' && puzzle.type === 'mcq') {
            var newOpts = savedPuzzles[puzzleIndex].options.slice();
            newOpts[value.index] = value.text;
            savedPuzzles[puzzleIndex].options = newOpts;
          }
        }
        return Object.assign({}, prev, {
          puzzles: newPuzzles,
          savedEscapeRoom: prev.savedEscapeRoom ? Object.assign({}, prev.savedEscapeRoom, { puzzles: savedPuzzles }) : null
        });
      });
    };

    // ── updateEscapeRoomFinalDoor ──
    var updateEscapeRoomFinalDoor = function(field, value) {
      setState.setEscapeRoomState(function(prev) {
        var upd = {};
        upd[field] = value;
        var newFinalDoor = Object.assign({}, prev.finalDoorPuzzle, upd);
        var newSaved = null;
        if (prev.savedEscapeRoom) {
          var fdUpd = {};
          fdUpd[field] = value;
          newSaved = Object.assign({}, prev.savedEscapeRoom, {
            finalDoor: Object.assign({}, prev.savedEscapeRoom.finalDoor || prev.finalDoorPuzzle, fdUpd)
          });
        }
        return Object.assign({}, prev, {
          finalDoorPuzzle: newFinalDoor,
          savedEscapeRoom: newSaved
        });
      });
    };

    // ── saveEscapeRoomConfig ──
    var saveEscapeRoomConfig = function() {
      var state = getState();
      var escapeRoomState = state.escapeRoomState;
      var inputText = state.inputText;
      var config = escapeRoomState.savedEscapeRoom;
      if (!config) return;
      try {
        var saveData = {
          config: config,
          difficulty: escapeRoomState.difficulty,
          puzzleCount: escapeRoomState.puzzleCount || config.puzzles.length,
          timestamp: Date.now(),
          sourceTextHash: inputText.substring(0, 100)
        };
        safeSetItem('allo_saved_escape_room', JSON.stringify(saveData));
        addToast(t('escape_room.config_saved') || '\uD83D\uDCBE Escape Room saved! Load it anytime from settings.', 'success');
      } catch (e) {
        warnLog('Failed to save escape room config:', e);
        addToast(t('errors.storage_full') || 'Storage full \u2014 could not save', 'error');
      }
    };

    // ── loadSavedEscapeRoom ──
    var loadSavedEscapeRoom = function() {
      try {
        var saved = safeGetItem('allo_saved_escape_room');
        if (!saved) {
          addToast(t('escape_room.no_saved') || 'No saved Escape Room found', 'info');
          return;
        }
        var saveData = JSON.parse(saved);
        var config = saveData.config;
        if (!config || !config.room || !config.puzzles) {
          addToast(t('escape_room.invalid_save') || 'Saved data is corrupted', 'error');
          return;
        }
        var processedPuzzles = config.puzzles.map(function(p, i) {
          var processed = Object.assign({}, p, {
            linkedObject: (config.objects && config.objects.find(function(o) { return o.id === p.linkedObjectId; })) || (config.objects && config.objects[i]) || { emoji: '\uD83D\uDD2E', name: 'Puzzle ' + (i+1) }
          });
          if (p.type === 'sequence' && p.items) {
            var indices = p.items.map(function(_, idx) { return idx; });
            processed.shuffledItems = derangeShuffle(indices);
          }
          if (p.type === 'scramble' && p.scrambledWord) {
            processed.displayLetters = derangeShuffle(p.scrambledWord.split('').filter(function(c) { return c.trim(); }));
          }
          if (p.type === 'matching' && p.pairs) {
            processed.leftColumn = derangeShuffle(p.pairs.map(function(pair) { return pair.left; }));
            processed.rightColumn = derangeShuffle(p.pairs.map(function(pair) { return pair.right; }));
          }
          if (p.type === 'fillin' && p.wordbank) {
            processed.wordbank = derangeShuffle(p.wordbank);
          }
          if (p.type === 'cipher' && p.wordbank) {
            processed.wordbank = derangeShuffle(p.wordbank);
          }
          return processed;
        });
        var processedFinalDoor = config.finalDoor || null;
        if (processedFinalDoor && processedFinalDoor.wordbank) {
          processedFinalDoor = Object.assign({}, processedFinalDoor, { wordbank: derangeShuffle(processedFinalDoor.wordbank) });
        }
        var diffPresets = {
          easy: { timePerPuzzle: 45, lives: 99, hints: 5, xpMultiplier: 0.5 },
          normal: { timePerPuzzle: 30, lives: 3, hints: 3, xpMultiplier: 1.0 },
          hard: { timePerPuzzle: 20, lives: 1, hints: 1, xpMultiplier: 2.0 }
        };
        var diff = saveData.difficulty || 'normal';
        var preset = diffPresets[diff];
        var totalTime = processedPuzzles.length * preset.timePerPuzzle;
        setState.setEscapeRoomState(function(prev) {
          return Object.assign({}, prev, {
            isActive: false,
            isPreview: true,
            isGenerating: false,
            showSettings: false,
            room: config.room,
            puzzles: processedPuzzles,
            objects: config.objects,
            totalPuzzles: processedPuzzles.length,
            finalDoorPuzzle: processedFinalDoor,
            savedEscapeRoom: config,
            solvedPuzzles: new Set(),
            isEscaped: false,
            timeRemaining: totalTime,
            maxTime: totalTime,
            difficulty: diff,
            lives: preset.lives,
            maxLives: preset.lives,
            hintsRemaining: preset.hints,
            maxHints: preset.hints,
            xpMultiplier: preset.xpMultiplier,
            streak: 0,
            wrongAttempts: 0,
            isGameOver: false,
            timerPaused: true
          });
        });
        setState.setEscapeTimeLeft(totalTime);
        setState.setIsEscapeTimerRunning(false);
        playSound('correct');
        addToast(t('escape_room.loaded_saved') || '\uD83D\uDCC2 Saved Escape Room loaded! Review and launch when ready.', 'success');
      } catch (e) {
        warnLog('Failed to load saved escape room:', e);
        addToast(t('errors.load_failed') || 'Failed to load saved config', 'error');
      }
    };

    // ── hasSavedEscapeRoom (sync check) ──
    var hasSavedEscapeRoom = function() {
      try { return !!safeGetItem('allo_saved_escape_room'); } catch (e) { return false; }
    };

    // Return public API
    return {
      generateEscapeRoom: generateEscapeRoom,
      launchCollaborativeEscapeRoom: launchCollaborativeEscapeRoom,
      endCollaborativeEscapeRoom: endCollaborativeEscapeRoom,
      handlePuzzleSolved: handlePuzzleSolved,
      handleSelectObject: handleSelectObject,
      handleWrongAnswer: handleWrongAnswer,
      handleEscapeRoomAnswer: handleEscapeRoomAnswer,
      handleSequenceAnswer: handleSequenceAnswer,
      handleCipherAnswer: handleCipherAnswer,
      handleMatchingSelect: handleMatchingSelect,
      handleScrambleAnswer: handleScrambleAnswer,
      handleFillinAnswer: handleFillinAnswer,
      handleFinalDoorAnswer: handleFinalDoorAnswer,
      resetEscapeRoom: resetEscapeRoom,
      handleRevealHint: handleRevealHint,
      openEscapeRoomSettings: openEscapeRoomSettings,
      updateEscapeRoomSetting: updateEscapeRoomSetting,
      launchEscapeRoomWithSettings: launchEscapeRoomWithSettings,
      confirmEscapeRoomPreview: confirmEscapeRoomPreview,
      updateEscapeRoomPuzzle: updateEscapeRoomPuzzle,
      updateEscapeRoomFinalDoor: updateEscapeRoomFinalDoor,
      saveEscapeRoomConfig: saveEscapeRoomConfig,
      loadSavedEscapeRoom: loadSavedEscapeRoom,
      hasSavedEscapeRoom: hasSavedEscapeRoom
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // TIMER EFFECT HOOK (for use from host)
  // ═══════════════════════════════════════════════════════════════

  function useEscapeRoomTimer(deps) {
    var isEscapeTimerRunning = deps.isEscapeTimerRunning;
    var escapeTimeLeft = deps.escapeTimeLeft;
    var setEscapeTimeLeft = deps.setEscapeTimeLeft;
    var setIsEscapeTimerRunning = deps.setIsEscapeTimerRunning;
    var setEscapeRoomState = deps.setEscapeRoomState;
    var addToast = deps.addToast;
    var t = deps.t;

    useEffect(function() {
      var interval = null;
      if (isEscapeTimerRunning && escapeTimeLeft > 0) {
        interval = setInterval(function() {
          setEscapeTimeLeft(function(prevTime) {
            var newTime = prevTime - 1;
            if (newTime === 60) {
              addToast(t('escape_room.one_minute_warning'), 'warning');
            } else if (newTime === 30) {
              addToast(t('escape_room.thirty_seconds_warning'), 'error');
            }
            return newTime;
          });
        }, 1000);
      } else if (escapeTimeLeft === 0 && isEscapeTimerRunning) {
        setIsEscapeTimerRunning(false);
        addToast(t('escape_room.time_up'), 'error');
        setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isActive: false }); });
      }
      return function() { clearInterval(interval); };
    }, [isEscapeTimerRunning, escapeTimeLeft, t, addToast]);
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT: EscapeRoomGameplay
  // ═══════════════════════════════════════════════════════════════

  var EscapeRoomGameplay = React.memo(function EscapeRoomGameplay(props) {
    var escapeRoomState = props.escapeRoomState;
    var setEscapeRoomState = props.setEscapeRoomState;
    var escapeTimeLeft = props.escapeTimeLeft;
    var isEscapeTimerRunning = props.isEscapeTimerRunning;
    var handlers = props.handlers;
    var t = props.t;
    var soundEnabled = props.soundEnabled;
    var setSoundEnabled = props.setSoundEnabled;
    var playSound = props.playSound;
    var handleSetIsEscapeTimerRunningToTrue = props.handleSetIsEscapeTimerRunningToTrue;

    if (!escapeRoomState || !escapeRoomState.isActive) return null;

    // ── Generating spinner ──
    var renderGenerating = function() {
      return h('div', { className: 'flex-grow flex flex-col items-center justify-center gap-4' },
        h(Sparkles, { className: 'animate-spin text-purple-400', size: 48 }),
        h('p', { className: 'text-purple-300 text-lg font-bold' }, t('escape_room.generating')),
        h('p', { className: 'text-slate-500 text-sm' }, t('escape_room.generating_hint'))
      );
    };

    // ── Victory screen ──
    var renderVictory = function() {
      var maxTime = escapeRoomState.maxTime || 300;
      var timeTaken = maxTime - escapeTimeLeft;
      var minutes = Math.floor(timeTaken / 60);
      var seconds = timeTaken % 60;
      var puzzlesSolved = escapeRoomState.solvedPuzzles.size;
      var totalPuzzles = escapeRoomState.totalPuzzles;
      var wrongAttempts = escapeRoomState.wrongAttempts || 0;
      var hintsUsed = escapeRoomState.totalHintsUsed || 0;
      var xpMultiplier = escapeRoomState.xpMultiplier || 1;
      var baseXP = puzzlesSolved * 20;
      var bonusXP = wrongAttempts === 0 ? 50 : 0;
      var hintPenalty = hintsUsed * 5;
      var totalXP = Math.round((baseXP + bonusXP - hintPenalty) * xpMultiplier);
      var rating = 'good';
      var ratingEmoji = '\uD83D\uDC4D';
      var ratingColor = 'text-blue-400';
      if (wrongAttempts === 0 && hintsUsed === 0) {
        rating = 'perfect'; ratingEmoji = '\uD83C\uDFC6'; ratingColor = 'text-yellow-400';
      } else if (wrongAttempts <= 2 && hintsUsed <= 1) {
        rating = 'great'; ratingEmoji = '\u2B50'; ratingColor = 'text-green-400';
      }
      return h('div', { className: 'flex-grow flex flex-col items-center justify-center gap-6 text-center p-6' },
        h('div', { className: 'text-8xl animate-bounce' }, ratingEmoji),
        h('h3', { className: 'text-4xl font-black ' + ratingColor },
          t('escape_room.performance_' + rating) || (rating === 'perfect' ? 'Perfect Escape!' : rating === 'great' ? 'Great Job!' : 'Good Effort!')
        ),
        h('p', { className: 'text-slate-400' }, t('escape_room.escaped_desc')),
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl mt-4' },
          h('div', { className: 'bg-slate-800/70 p-4 rounded-xl border border-slate-700' },
            h('div', { className: 'text-2xl mb-1' }, '\u23F1\uFE0F'),
            h('div', { className: 'text-2xl font-bold text-white' }, minutes + ':' + seconds.toString().padStart(2, '0')),
            h('div', { className: 'text-xs text-slate-400 uppercase' }, t('escape_room.time_taken') || 'Time Taken')
          ),
          h('div', { className: 'bg-slate-800/70 p-4 rounded-xl border border-slate-700' },
            h('div', { className: 'text-2xl mb-1' }, '\u2705'),
            h('div', { className: 'text-2xl font-bold text-green-400' }, puzzlesSolved + '/' + totalPuzzles),
            h('div', { className: 'text-xs text-slate-400 uppercase' }, t('escape_room.puzzles_solved') || 'Puzzles Solved')
          ),
          h('div', { className: 'bg-slate-800/70 p-4 rounded-xl border border-slate-700' },
            h('div', { className: 'text-2xl mb-1' }, '\u274C'),
            h('div', { className: 'text-2xl font-bold ' + (wrongAttempts === 0 ? 'text-green-400' : 'text-red-400') }, wrongAttempts),
            h('div', { className: 'text-xs text-slate-400 uppercase' }, t('escape_room.wrong_attempts') || 'Wrong Attempts')
          ),
          h('div', { className: 'bg-slate-800/70 p-4 rounded-xl border border-slate-700' },
            h('div', { className: 'text-2xl mb-1' }, '\uD83D\uDCA1'),
            h('div', { className: 'text-2xl font-bold ' + (hintsUsed === 0 ? 'text-green-400' : 'text-amber-400') }, hintsUsed),
            h('div', { className: 'text-xs text-slate-400 uppercase' }, t('escape_room.hints_used') || 'Hints Used')
          )
        ),
        h('div', { className: 'bg-gradient-to-r from-purple-900/50 to-indigo-900/50 p-4 rounded-xl border border-purple-500/30 w-full max-w-md' },
          h('div', { className: 'text-lg font-bold text-purple-300 mb-2' }, t('escape_room.xp_earned_label') || 'XP Earned'),
          h('div', { className: 'text-4xl font-black text-purple-400' }, '+' + totalXP + ' XP'),
          h('div', { className: 'text-xs text-slate-400 mt-2' },
            baseXP + ' base' + (bonusXP > 0 ? ' + ' + bonusXP + ' bonus' : '') + (hintPenalty > 0 ? ' - ' + hintPenalty + ' hints' : '') + (xpMultiplier !== 1 ? ' \u00D7 ' + xpMultiplier : '')
          )
        ),
        h('div', { className: 'flex gap-4 mt-4' },
          h('button', {
            'aria-label': t('common.reset_escape_room'),
            onClick: handlers.resetEscapeRoom,
            className: 'bg-purple-600 text-white px-6 py-3 rounded-full font-bold hover:bg-purple-700 transition-colors flex items-center gap-2'
          }, h(RefreshCw, { size: 18 }), t('escape_room.play_again')),
          h('button', {
            onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isActive: false }); }); },
            className: 'bg-slate-700 text-white px-6 py-3 rounded-full font-bold hover:bg-slate-600 transition-colors'
          }, t('escape_room.close') || 'Close')
        )
      );
    };

    // ── Puzzle dialog render helper ──
    var renderPuzzleDialog = function() {
      if (!escapeRoomState.selectedObject) return null;
      var puzzle = escapeRoomState.puzzles.find(function(p) { return p.linkedObjectId === escapeRoomState.selectedObject.id; });
      if (!puzzle) return h('p', { className: 'text-slate-500' }, t('escape_room.no_puzzle'));

      var puzzleContent = [];

      // Close button
      puzzleContent.push(
        h('button', {
          key: 'close-btn',
          'aria-label': t('common.close'),
          onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { selectedObject: null }); }); },
          className: 'absolute top-4 right-4 text-slate-400 hover:text-white'
        }, h(X, { size: 24 }))
      );

      // Header
      puzzleContent.push(
        h('div', { key: 'header', className: 'flex items-center gap-3 mb-6' },
          h('span', { className: 'text-4xl' }, escapeRoomState.selectedObject.emoji),
          h('div', null,
            h('h3', { className: 'text-xl font-bold text-white' }, escapeRoomState.selectedObject.name),
            h('p', { className: 'text-slate-500 text-sm' }, escapeRoomState.selectedObject.description)
          )
        )
      );

      // Question area
      var questionChildren = [];
      // Type badge + hint button
      var typeHintRow = [];
      typeHintRow.push(
        h('span', { key: 'type-badge', className: 'text-xs px-2 py-0.5 bg-purple-600 text-white rounded-full font-bold uppercase' },
          t('escape_room.type_' + (puzzle.type || 'mcq'))
        )
      );
      if (puzzle.hint || (puzzle.hints && puzzle.hints.length > 0)) {
        var hintUsed = escapeRoomState.hintsUsed && escapeRoomState.hintsUsed[puzzle.id];
        var hintsRem = escapeRoomState.hintsRemaining || 0;
        typeHintRow.push(
          h('button', {
            key: 'hint-btn',
            onClick: function() { handlers.handleRevealHint(puzzle.id); },
            disabled: hintsRem <= 0 && !hintUsed,
            className: 'text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ' +
              (hintUsed
                ? 'bg-amber-700 text-white cursor-pointer'
                : hintsRem > 0
                  ? 'bg-amber-900/50 text-amber-400 hover:bg-amber-800 border border-amber-600'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'),
            title: hintUsed ? (t('escape_room.show_hint')) : (t('escape_room.get_hint'))
          },
            h(Lightbulb, { size: 14 }),
            hintUsed
              ? (t('escape_room.show_hint') || 'Show Hint')
              : (t('escape_room.get_hint') || 'Get Hint') + ' (' + hintsRem + ')'
          )
        );
      }
      questionChildren.push(
        h('div', { key: 'type-hint-row', className: 'flex items-center justify-between gap-2 mb-2' }, typeHintRow)
      );
      questionChildren.push(
        h('p', { key: 'question-text', className: 'text-lg text-white font-medium' }, puzzle.question)
      );
      // Show revealed hint
      if (escapeRoomState.hintsUsed && escapeRoomState.hintsUsed[puzzle.id] && (puzzle.hint || (puzzle.hints && puzzle.hints[0]))) {
        questionChildren.push(
          h('p', { key: 'hint-display', className: 'text-amber-400 text-sm mt-3 bg-amber-900/30 p-2 rounded-lg' },
            '\uD83D\uDCA1 ' + (puzzle.hint || puzzle.hints[0]))
        );
      }
      // Show discovered clue
      if (escapeRoomState.discoveredClues && escapeRoomState.discoveredClues[puzzle.id]) {
        questionChildren.push(
          h('p', { key: 'clue-display', className: 'text-yellow-400 text-sm mt-2 bg-yellow-900/30 p-2 rounded-lg' },
            '\uD83D\uDD11 ' + t('escape_room.clue') + ': ' + escapeRoomState.discoveredClues[puzzle.id])
        );
      }
      puzzleContent.push(
        h('div', { key: 'question-area', className: 'bg-slate-900 p-4 rounded-xl mb-6' }, questionChildren)
      );

      // ── MCQ ──
      if ((!puzzle.type || puzzle.type === 'mcq') && puzzle.options) {
        puzzleContent.push(
          h('div', { key: 'mcq', className: 'grid gap-3', role: 'radiogroup', 'aria-label': t('escape_room.answer_options') || 'Answer options' },
            puzzle.options.map(function(opt, idx) {
              return h('button', {
                key: idx,
                onClick: function() { handlers.handleEscapeRoomAnswer(puzzle.id, idx); },
                role: 'radio',
                'aria-checked': 'false',
                className: 'w-full text-left p-4 bg-slate-700 hover:bg-purple-700 rounded-xl text-white font-medium transition-colors border-2 border-transparent hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400'
              },
                h('span', { className: 'inline-block w-8 font-bold text-purple-400', 'aria-hidden': 'true' }, String.fromCharCode(65+idx) + '.'),
                h('span', { className: 'sr-only' }, (t('escape_room.option') || 'Option') + ' ' + String.fromCharCode(65+idx) + ': '),
                opt
              );
            })
          )
        );
      }

      // ── Sequence ──
      if (puzzle.type === 'sequence' && puzzle.items) {
        var seqChildren = [];
        seqChildren.push(h('p', { key: 'seq-instr', className: 'text-slate-500 text-sm' }, t('escape_room.sequence_instructions')));
        // Build the reorderable list
        var currentOrder = (escapeRoomState.sequenceOrder && escapeRoomState.sequenceOrder.length > 0)
          ? escapeRoomState.sequenceOrder
          : (puzzle.shuffledItems || puzzle.items.map(function(_, i) { return i; }));

        var seqItems = currentOrder.map(function(itemIdx, displayIdx) {
          return h('div', {
            key: displayIdx,
            id: 'sequence-item-' + displayIdx,
            role: 'listitem',
            tabIndex: 0,
            draggable: true,
            onDragStart: function(e) { e.dataTransfer.setData('text/plain', displayIdx.toString()); },
            onDragOver: function(e) { e.preventDefault(); },
            onDrop: function(e) {
              e.preventDefault();
              var fromDisplayIdx = parseInt(e.dataTransfer.getData('text/plain'));
              var newOrder = currentOrder.slice();
              var removed = newOrder.splice(fromDisplayIdx, 1)[0];
              newOrder.splice(displayIdx, 0, removed);
              setEscapeRoomState(function(prev) { return Object.assign({}, prev, { sequenceOrder: newOrder }); });
            },
            onKeyDown: function(e) {
              if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                if (displayIdx > 0) {
                  var nOrder = currentOrder.slice();
                  var tmp = nOrder[displayIdx]; nOrder[displayIdx] = nOrder[displayIdx-1]; nOrder[displayIdx-1] = tmp;
                  setEscapeRoomState(function(prev) { return Object.assign({}, prev, { sequenceOrder: nOrder }); });
                  setTimeout(function() { var el = document.getElementById('sequence-item-' + (displayIdx-1)); if(el) el.focus(); }, 50);
                }
              } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                if (displayIdx < currentOrder.length - 1) {
                  var nOrder2 = currentOrder.slice();
                  var tmp2 = nOrder2[displayIdx]; nOrder2[displayIdx] = nOrder2[displayIdx+1]; nOrder2[displayIdx+1] = tmp2;
                  setEscapeRoomState(function(prev) { return Object.assign({}, prev, { sequenceOrder: nOrder2 }); });
                  setTimeout(function() { var el = document.getElementById('sequence-item-' + (displayIdx+1)); if(el) el.focus(); }, 50);
                }
              }
            },
            'aria-label': (t('escape_room.position') || 'Position') + ' ' + (displayIdx + 1) + ': ' + puzzle.items[itemIdx] + '. ' + (t('escape_room.use_arrows') || 'Use arrow keys to reorder.'),
            className: 'flex items-center gap-3 p-4 bg-slate-700 rounded-xl text-white font-medium cursor-move hover:bg-slate-600 border-2 border-transparent hover:border-purple-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all'
          },
            h('div', { className: 'flex flex-col gap-1', role: 'group', 'aria-label': t('escape_room.reorder_buttons') || 'Reorder buttons' },
              h('button', {
                onClick: function(e) {
                  e.stopPropagation();
                  if (displayIdx > 0) {
                    var nO = currentOrder.slice();
                    var t2 = nO[displayIdx]; nO[displayIdx] = nO[displayIdx-1]; nO[displayIdx-1] = t2;
                    setEscapeRoomState(function(prev) { return Object.assign({}, prev, { sequenceOrder: nO }); });
                    setTimeout(function() { var el = document.getElementById('sequence-item-' + (displayIdx-1)); if(el) el.focus(); }, 50);
                  }
                },
                disabled: displayIdx === 0,
                className: 'p-1 rounded hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300',
                'aria-label': (t('escape_room.move_up') || 'Move up') + ': ' + puzzle.items[itemIdx],
                title: t('escape_room.move_up') || 'Move up'
              }, h(ChevronUp, { size: 16, className: 'text-slate-400' })),
              h('button', {
                onClick: function(e) {
                  e.stopPropagation();
                  if (displayIdx < currentOrder.length - 1) {
                    var nO = currentOrder.slice();
                    var t2 = nO[displayIdx]; nO[displayIdx] = nO[displayIdx+1]; nO[displayIdx+1] = t2;
                    setEscapeRoomState(function(prev) { return Object.assign({}, prev, { sequenceOrder: nO }); });
                    setTimeout(function() { var el = document.getElementById('sequence-item-' + (displayIdx+1)); if(el) el.focus(); }, 50);
                  }
                },
                disabled: displayIdx === currentOrder.length - 1,
                className: 'p-1 rounded hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300',
                'aria-label': (t('escape_room.move_down') || 'Move down') + ': ' + puzzle.items[itemIdx],
                title: t('escape_room.move_down') || 'Move down'
              }, h(ChevronDown, { size: 16, className: 'text-slate-400' }))
            ),
            h(GripVertical, { size: 20, className: 'text-slate-500', 'aria-hidden': 'true' }),
            h('span', { className: 'inline-flex w-6 h-6 bg-purple-600 text-white text-sm font-bold rounded-full items-center justify-center', 'aria-hidden': 'true' }, displayIdx + 1),
            h('span', { className: 'flex-grow' }, puzzle.items[itemIdx])
          );
        });

        seqChildren.push(
          h('div', { key: 'seq-list', className: 'space-y-2', role: 'list', 'aria-label': t('escape_room.sequence_list_label') || 'Sequence items to reorder' }, seqItems)
        );
        seqChildren.push(
          h('button', {
            key: 'seq-submit',
            onClick: function() {
              var co = (escapeRoomState.sequenceOrder && escapeRoomState.sequenceOrder.length > 0)
                ? escapeRoomState.sequenceOrder
                : (puzzle.shuffledItems || puzzle.items.map(function(_, i) { return i; }));
              handlers.handleSequenceAnswer(puzzle.id, co);
            },
            className: 'w-full mt-4 p-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors'
          }, t('escape_room.check_sequence'))
        );
        puzzleContent.push(h('div', { key: 'sequence', className: 'space-y-3' }, seqChildren));
      }

      // ── Cipher ──
      if (puzzle.type === 'cipher') {
        var cipherChildren = [];
        cipherChildren.push(
          h('div', { key: 'cipher-box', className: 'bg-slate-900 p-6 rounded-xl border-2 border-purple-500' },
            h('div', { className: 'flex items-center gap-2 mb-4' },
              h('span', { className: 'text-2xl' }, '\uD83D\uDD2E'),
              h('p', { className: 'text-purple-300 text-sm font-bold uppercase tracking-wider' }, t('escape_room.riddle_challenge') || 'Riddle Challenge')
            ),
            h('p', { className: 'text-xl text-white font-medium italic leading-relaxed' }, '"' + (puzzle.encodedText || puzzle.riddle) + '"')
          )
        );
        if (puzzle.wordbank && puzzle.wordbank.length > 0) {
          cipherChildren.push(
            h('div', { key: 'cipher-wordbank', className: 'space-y-3' },
              h('p', { className: 'text-xs text-slate-500 text-center uppercase font-bold' }, t('escape_room.select_answer') || 'Select your answer:'),
              h('div', { className: 'grid grid-cols-2 gap-3', role: 'group', 'aria-label': t('escape_room.answer_options') || 'Answer options' },
                puzzle.wordbank.map(function(word, idx) {
                  var isSelected = escapeRoomState.textInput === word;
                  return h('button', {
                    key: idx,
                    onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: word }); }); },
                    'aria-pressed': isSelected,
                    className: 'p-4 rounded-xl font-bold text-lg transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800 ' +
                      (isSelected
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300 scale-105'
                        : 'bg-slate-700 text-white hover:bg-slate-600 hover:scale-102')
                  },
                    word,
                    isSelected ? h('span', { className: 'sr-only' }, ' - ' + (t('escape_room.selected') || 'selected')) : null
                  );
                })
              )
            )
          );
        } else {
          cipherChildren.push(
            h('input', {
              key: 'cipher-input',
              'aria-label': t('common.escape_room_enter_answer'),
              type: 'text',
              value: escapeRoomState.textInput || '',
              onChange: function(e) { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: e.target.value }); }); },
              placeholder: t('escape_room.enter_answer'),
              className: 'w-full p-4 bg-slate-700 rounded-xl text-white font-medium border-2 border-slate-600 focus:border-purple-400 outline-none'
            })
          );
        }
        cipherChildren.push(
          h('button', {
            key: 'cipher-submit',
            onClick: function() { handlers.handleCipherAnswer(puzzle.id, escapeRoomState.textInput || ''); },
            disabled: !escapeRoomState.textInput,
            className: 'w-full p-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          }, t('escape_room.submit_answer'))
        );
        puzzleContent.push(h('div', { key: 'cipher', className: 'space-y-4' }, cipherChildren));
      }

      // ── Matching ──
      if (puzzle.type === 'matching' && puzzle.pairs) {
        var matchChildren = [];
        matchChildren.push(h('p', { key: 'match-instr', className: 'text-slate-500 text-sm' }, t('escape_room.matching_instructions')));
        matchChildren.push(h('p', { key: 'match-hint', className: 'text-purple-400 text-xs' }, t('escape_room.matching_keyboard_hint') || 'Tip: Use Tab to switch columns, Enter to select'));
        // Show matched pairs
        var mp = escapeRoomState.matchingPairs || [];
        if (mp.length > 0) {
          matchChildren.push(
            h('div', { key: 'matched', className: 'space-y-2 mb-4', role: 'status', 'aria-live': 'polite' },
              h('p', { className: 'text-green-400 text-xs font-bold' }, t('escape_room.matched_pairs')),
              mp.map(function(pair, idx) {
                return h('div', { key: idx, className: 'flex items-center gap-2 p-2 bg-green-900/30 rounded-lg text-green-400 text-sm', role: 'status' },
                  h(CheckCircle, { size: 14, 'aria-hidden': 'true' }),
                  h('span', null, pair[0] + ' \u2194 ' + pair[1])
                );
              })
            )
          );
        }
        // Columns
        var leftItems = (puzzle.leftColumn || puzzle.pairs.map(function(p) { return p.left; })).filter(function(item) {
          return !mp.some(function(pair) { return pair[0] === item; });
        });
        var rightItems = (puzzle.rightColumn || puzzle.pairs.map(function(p) { return p.right; })).filter(function(item) {
          return !mp.some(function(pair) { return pair[1] === item; });
        });
        matchChildren.push(
          h('div', { key: 'columns', className: 'grid grid-cols-2 gap-4', role: 'group', 'aria-label': t('escape_room.matching_columns') || 'Matching columns' },
            h('div', { className: 'space-y-2', role: 'listbox', 'aria-label': t('escape_room.left_column') || 'Left column options' },
              leftItems.map(function(item, idx) {
                var isSel = escapeRoomState.matchingSelected && escapeRoomState.matchingSelected.item === item && escapeRoomState.matchingSelected.column === 'left';
                return h('button', {
                  key: idx,
                  onClick: function() { handlers.handleMatchingSelect(puzzle.id, item, 'left'); },
                  onKeyDown: function(e) {
                    if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      var el = document.querySelector('[data-matching-column="right"] button');
                      if (el) el.focus();
                    }
                  },
                  role: 'option',
                  'aria-selected': isSel,
                  'data-matching-column': 'left',
                  className: 'w-full p-3 rounded-xl text-white text-sm font-medium transition-all border-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800 ' +
                    (isSel ? 'bg-purple-600 border-purple-400' : 'bg-slate-700 border-slate-600 hover:border-purple-400')
                },
                  item,
                  isSel ? h('span', { className: 'sr-only' }, ' - ' + (t('escape_room.selected') || 'selected')) : null
                );
              })
            ),
            h('div', { className: 'space-y-2', role: 'listbox', 'aria-label': t('escape_room.right_column') || 'Right column options', 'data-matching-column': 'right' },
              rightItems.map(function(item, idx) {
                var isSel = escapeRoomState.matchingSelected && escapeRoomState.matchingSelected.item === item && escapeRoomState.matchingSelected.column === 'right';
                return h('button', {
                  key: idx,
                  onClick: function() { handlers.handleMatchingSelect(puzzle.id, item, 'right'); },
                  onKeyDown: function(e) {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      var el = document.querySelector('[data-matching-column="left"]');
                      if (el) el.focus();
                    }
                  },
                  role: 'option',
                  'aria-selected': isSel,
                  className: 'w-full p-3 rounded-xl text-white text-sm font-medium transition-all border-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800 ' +
                    (isSel ? 'bg-purple-600 border-purple-400' : 'bg-slate-700 border-slate-600 hover:border-purple-400')
                },
                  item,
                  isSel ? h('span', { className: 'sr-only' }, ' - ' + (t('escape_room.selected') || 'selected')) : null
                );
              })
            )
          )
        );
        puzzleContent.push(h('div', { key: 'matching', className: 'space-y-4' }, matchChildren));
      }

      // ── Scramble ──
      if (puzzle.type === 'scramble') {
        var scrChildren = [];
        var letters = puzzle.displayLetters || (puzzle.scrambledWord ? puzzle.scrambledWord.split('') : []);
        scrChildren.push(
          h('p', { key: 'scr-sr', className: 'sr-only', 'aria-live': 'polite' },
            (t('escape_room.scramble_sr_desc') || 'Scrambled letters:') + ' ' + letters.join(', ')
          )
        );
        scrChildren.push(
          h('div', { key: 'scr-letters', className: 'flex flex-wrap gap-2 justify-center p-4 bg-slate-900 rounded-xl', role: 'list', 'aria-label': t('escape_room.scrambled_letters') || 'Scrambled letters to unscramble' },
            letters.map(function(letter, idx) {
              return h('span', {
                key: idx,
                role: 'listitem',
                'aria-label': (t('escape_room.letter') || 'Letter') + ' ' + (idx + 1) + ' ' + (t('escape_room.of') || 'of') + ' ' + letters.length + ': ' + letter,
                className: 'w-10 h-10 bg-purple-600 text-white font-bold text-xl rounded-lg flex items-center justify-center shadow-md'
              }, letter);
            })
          )
        );
        scrChildren.push(
          h('label', { key: 'scr-label', className: 'sr-only', htmlFor: 'scramble-input' },
            t('escape_room.enter_unscrambled') || 'Enter the unscrambled word'
          )
        );
        scrChildren.push(
          h('input', {
            key: 'scr-input',
            'aria-label': t('common.enter_escape_room_state'),
            id: 'scramble-input',
            type: 'text',
            value: escapeRoomState.textInput || '',
            onChange: function(e) { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: e.target.value.toUpperCase() }); }); },
            placeholder: t('escape_room.unscramble_placeholder'),
            className: 'w-full p-4 bg-slate-700 rounded-xl text-white font-mono text-xl text-center tracking-widest border-2 border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400 outline-none uppercase',
            'aria-describedby': 'scramble-hint'
          })
        );
        scrChildren.push(
          h('p', { key: 'scr-sr-hint', id: 'scramble-hint', className: 'sr-only' },
            t('escape_room.scramble_hint_sr') || 'Type the correct word using the scrambled letters shown above'
          )
        );
        scrChildren.push(
          h('button', {
            key: 'scr-submit',
            onClick: function() { handlers.handleScrambleAnswer(puzzle.id, escapeRoomState.textInput || ''); },
            className: 'w-full p-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800'
          }, t('escape_room.check_word'))
        );
        puzzleContent.push(h('div', { key: 'scramble', className: 'space-y-4' }, scrChildren));
      }

      // ── Fill-in ──
      if (puzzle.type === 'fillin') {
        var filChildren = [];
        if (puzzle.sentence) {
          filChildren.push(
            h('div', {
              key: 'fil-sentence',
              className: 'bg-slate-900 p-4 rounded-xl text-white text-center text-lg',
              role: 'status',
              'aria-live': 'polite',
              'aria-label': t('escape_room.sentence_with_blank') || 'Sentence with blank',
              id: 'fillin-sentence'
            }, puzzle.sentence.replace('___', escapeRoomState.textInput ? '[' + escapeRoomState.textInput + ']' : '______'))
          );
        }
        if (puzzle.wordbank && puzzle.wordbank.length > 0) {
          filChildren.push(
            h('div', { key: 'fil-wordbank', className: 'space-y-3' },
              h('p', { className: 'text-xs text-slate-500 text-center uppercase font-bold', id: 'fillin-wordbank-label' },
                t('escape_room.select_word') || 'Select the correct word:'
              ),
              h('div', { className: 'flex flex-wrap gap-2 justify-center', role: 'group', 'aria-labelledby': 'fillin-wordbank-label' },
                puzzle.wordbank.map(function(word, idx) {
                  return h('button', {
                    key: idx,
                    onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: word }); }); },
                    'aria-pressed': escapeRoomState.textInput === word,
                    className: 'px-4 py-2 rounded-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 ' +
                      (escapeRoomState.textInput === word
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-slate-700 text-white hover:bg-slate-600')
                  },
                    word,
                    h('span', { className: 'sr-only' }, escapeRoomState.textInput === word ? ' - ' + (t('escape_room.selected') || 'selected') : '')
                  );
                })
              )
            )
          );
        } else {
          filChildren.push(
            h('label', { key: 'fil-label', className: 'sr-only', htmlFor: 'fillin-text-input' },
              t('escape_room.enter_answer_label') || 'Enter your answer'
            )
          );
          filChildren.push(
            h('input', {
              key: 'fil-input',
              'aria-label': t('common.enter_escape_room_state'),
              id: 'fillin-text-input',
              type: 'text',
              autoFocus: true,
              value: escapeRoomState.textInput || '',
              onChange: function(e) { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: e.target.value }); }); },
              placeholder: t('escape_room.enter_answer'),
              className: 'w-full p-4 bg-slate-700 rounded-xl text-white font-medium border-2 border-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-400 outline-none',
              'aria-describedby': 'fillin-sentence'
            })
          );
        }
        filChildren.push(
          h('button', {
            key: 'fil-submit',
            onClick: function() { handlers.handleFillinAnswer(puzzle.id, escapeRoomState.textInput || ''); },
            disabled: !escapeRoomState.textInput,
            className: 'w-full p-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800',
            'aria-disabled': !escapeRoomState.textInput
          }, t('escape_room.submit_answer'))
        );
        puzzleContent.push(h('div', { key: 'fillin', className: 'space-y-4' }, filChildren));
      }

      return puzzleContent;
    };

    // ── Final Door button ──
    var renderFinalDoorButton = function() {
      if (!escapeRoomState.finalDoorUnlocked || !escapeRoomState.finalDoorPuzzle || escapeRoomState.isEscaped) return null;
      return h('div', { className: 'fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500' },
        h('button', {
          onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showFinalDoor: true, textInput: '' }); }); },
          className: 'flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-slate-900 font-bold rounded-2xl shadow-2xl hover:scale-105 transition-transform animate-pulse border-4 border-yellow-300 focus:outline-none focus:ring-4 focus:ring-yellow-200',
          'aria-label': t('escape_room.approach_door') || 'Approach the final door'
        },
          h(DoorOpen, { size: 28, className: 'animate-bounce', 'aria-hidden': 'true' }),
          h('span', { className: 'text-lg' }, t('escape_room.approach_door')),
          h(Sparkles, { size: 20, 'aria-hidden': 'true' })
        )
      );
    };

    // ── Final Door dialog ──
    var renderFinalDoorDialog = function() {
      if (!escapeRoomState.showFinalDoor || !escapeRoomState.finalDoorPuzzle) return null;
      var fdp = escapeRoomState.finalDoorPuzzle;
      var answerContent;
      if (fdp.wordbank && fdp.wordbank.length > 0) {
        answerContent = h(React.Fragment, null,
          h('p', { className: 'text-xs text-slate-500 text-center uppercase font-bold' },
            t('escape_room.select_word') || 'Select the correct answer:'
          ),
          h('div', { className: 'flex flex-wrap gap-2 justify-center' },
            fdp.wordbank.map(function(word, idx) {
              return h('button', {
                key: idx,
                onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: word }); }); },
                'aria-pressed': escapeRoomState.textInput === word,
                className: 'px-4 py-2 rounded-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400 ' +
                  (escapeRoomState.textInput === word
                    ? 'bg-yellow-500 text-slate-900 ring-2 ring-yellow-300'
                    : 'bg-slate-700 text-white hover:bg-slate-600')
              }, word);
            })
          )
        );
      } else {
        answerContent = h(React.Fragment, null,
          h('label', { className: 'sr-only', htmlFor: 'final-door-answer' },
            t('escape_room.final_answer_label') || 'Enter your final answer'
          ),
          h('textarea', {
            id: 'final-door-answer',
            autoFocus: true,
            value: escapeRoomState.textInput || '',
            onChange: function(e) { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { textInput: e.target.value }); }); },
            placeholder: t('escape_room.final_answer_placeholder'),
            rows: 3,
            className: 'w-full p-4 bg-slate-700 rounded-xl text-white font-medium border-2 border-slate-600 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 outline-none resize-none',
            'aria-describedby': 'final-door-question'
          })
        );
      }
      return h('div', {
        className: 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4',
        onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showFinalDoor: false }); }); },
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'final-door-title'
      },
        h('div', {
          role: 'button',
          tabIndex: 0,
          onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } },
          className: 'bg-gradient-to-b from-slate-800 to-slate-900 w-full max-w-2xl rounded-2xl border-4 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)] p-8 relative',
          onClick: function(e) { e.stopPropagation(); }
        },
          h('button', {
            onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showFinalDoor: false }); }); },
            className: 'absolute top-4 right-4 text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded',
            'aria-label': t('escape_room.close') || 'Close'
          }, h(X, { size: 24, 'aria-hidden': 'true' })),
          h('div', { className: 'text-center mb-8' },
            h('div', { className: 'text-6xl mb-4', 'aria-hidden': 'true' }, '\uD83D\uDEAA'),
            h('h3', { id: 'final-door-title', className: 'text-2xl font-bold text-yellow-400' }, t('escape_room.final_door_title')),
            h('p', { className: 'text-slate-500 text-sm mt-2' }, t('escape_room.final_door_desc'))
          ),
          h('div', { className: 'bg-slate-900 p-6 rounded-xl mb-6 border-2 border-yellow-500/30' },
            h('p', { id: 'final-door-question', className: 'text-lg text-white font-medium text-center' },
              fdp.sentence || fdp.question
            )
          ),
          h('div', { className: 'space-y-4' },
            answerContent,
            h('button', {
              onClick: function() { handlers.handleFinalDoorAnswer(escapeRoomState.textInput || ''); },
              disabled: !escapeRoomState.textInput,
              className: 'w-full p-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'
            },
              h(Key, { size: 20, 'aria-hidden': 'true' }),
              t('escape_room.unlock_door')
            )
          )
        )
      );
    };

    // ── Room main content (objects grid or loading error) ──
    var renderRoomContent = function() {
      if (!escapeRoomState.room) {
        return h('div', { className: 'flex-grow flex items-center justify-center' },
          h('p', { className: 'text-slate-500' }, t('escape_room.loading_error'))
        );
      }
      return h('div', { className: 'flex-grow flex flex-col' },
        h('div', { className: 'bg-slate-800/50 p-4 rounded-xl mb-6 text-center border border-slate-700' },
          h('p', { className: 'text-slate-500 italic' }, escapeRoomState.room.description),
          !isEscapeTimerRunning
            ? h('div', { className: 'mt-4' },
                h('button', {
                  'aria-label': t('common.play'),
                  onClick: handleSetIsEscapeTimerRunningToTrue,
                  className: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg shadow-green-900/50 flex items-center gap-3 mx-auto animate-pulse'
                },
                  h(Play, { size: 20 }),
                  t('escape_room.start') || 'Start Escape Room'
                ),
                h('p', { className: 'text-slate-500 text-sm mt-2' }, t('escape_room.start_hint') || 'Start the timer to begin inspecting objects')
              )
            : h('p', { className: 'text-purple-400 text-sm mt-2' }, t('escape_room.click_to_inspect'))
        ),
        h('div', { className: 'flex-grow grid grid-cols-3 md:grid-cols-5 gap-4 place-items-center ' + (!isEscapeTimerRunning ? 'opacity-50 pointer-events-none' : '') },
          (escapeRoomState.objects || []).map(function(obj, idx) {
            var puzzle = escapeRoomState.puzzles.find(function(p) { return p.linkedObjectId === obj.id; });
            var isSolved = puzzle && escapeRoomState.solvedPuzzles.has(puzzle.id);
            var isDisabled = isSolved || !isEscapeTimerRunning;
            return h('button', {
              key: obj.id,
              onClick: function() { if (!isDisabled) handlers.handleSelectObject(obj); },
              disabled: isDisabled,
              className: 'relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all transform ' + (isEscapeTimerRunning ? 'hover:scale-110' : '') + ' ' +
                (isSolved
                  ? 'bg-green-900/50 border-2 border-green-500 opacity-60 cursor-not-allowed'
                  : !isEscapeTimerRunning
                    ? 'bg-slate-800 border-2 border-slate-700 cursor-not-allowed'
                    : 'bg-slate-800 border-2 border-slate-600 hover:border-purple-400 hover:bg-slate-700 cursor-pointer')
            },
              h('span', { className: 'text-4xl' }, obj.emoji),
              h('span', { className: 'text-xs text-slate-400 font-medium text-center' }, obj.name),
              isSolved ? h(CheckCircle, { className: 'absolute top-1 right-1 text-green-400', size: 16 }) : null,
              !isEscapeTimerRunning && !isSolved ? h(Lock, { className: 'absolute top-1 right-1 text-slate-500', size: 14 }) : null
            );
          })
        )
      );
    };

    // ── Main render ──
    var mainContent;
    if (escapeRoomState.isGenerating) {
      mainContent = renderGenerating();
    } else if (escapeRoomState.isEscaped) {
      mainContent = renderVictory();
    } else {
      mainContent = renderRoomContent();
    }

    return h('div', { className: 'animate-in fade-in duration-500' },
      h('div', { className: 'bg-slate-900 p-6 rounded-2xl shadow-2xl border-4 border-purple-500 relative overflow-hidden min-h-[700px] flex flex-col' },
        // Background radial gradient
        h('div', { className: 'absolute inset-0 opacity-10 pointer-events-none' },
          h('div', { className: 'absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.2),transparent_70%)]' })
        ),
        // Top bar
        h('div', { className: 'flex justify-between items-start mb-6 relative z-10' },
          h('div', { className: 'text-left' },
            h('h2', { className: 'text-3xl font-black text-purple-400 tracking-widest uppercase drop-shadow-md flex items-center gap-3' },
              h(DoorOpen, { size: 32 }),
              ' ',
              t('escape_room.title')
            ),
            escapeRoomState.room
              ? h('p', { className: 'text-slate-500 text-sm mt-1 font-medium' }, escapeRoomState.room.theme)
              : null
          ),
          h('div', { className: 'flex gap-2 items-center' },
            // Timer
            h('div', { className: 'px-3 py-1.5 rounded-lg flex items-center gap-2 ' + (escapeTimeLeft <= 60 ? 'bg-red-900/50 animate-pulse' : 'bg-slate-800/50') },
              h(Clock, { size: 16, className: escapeTimeLeft <= 60 ? 'text-red-400' : 'text-slate-400' }),
              h('span', { className: 'font-mono font-bold ' + (escapeTimeLeft <= 60 ? 'text-red-400' : 'text-white') },
                Math.floor(escapeTimeLeft / 60) + ':' + (escapeTimeLeft % 60).toString().padStart(2, '0')
              )
            ),
            // Solved count
            h('div', { className: 'bg-purple-900/50 px-3 py-1.5 rounded-lg flex items-center gap-2' },
              h(Trophy, { size: 16, className: 'text-yellow-400' }),
              h('span', { className: 'text-white font-bold' }, escapeRoomState.solvedPuzzles.size + '/' + escapeRoomState.totalPuzzles)
            ),
            // Hints remaining
            h('div', { className: 'px-3 py-1.5 rounded-lg flex items-center gap-2 ' + ((escapeRoomState.hintsRemaining || 0) > 0 ? 'bg-amber-900/50' : 'bg-slate-800/50') },
              h(Lightbulb, { size: 16, className: (escapeRoomState.hintsRemaining || 0) > 0 ? 'text-amber-400' : 'text-slate-500' }),
              h('span', { className: 'font-bold ' + ((escapeRoomState.hintsRemaining || 0) > 0 ? 'text-amber-400' : 'text-slate-500') },
                escapeRoomState.hintsRemaining || 0
              )
            ),
            // Sound toggle
            h('button', {
              'aria-label': t('common.volume'),
              onClick: function() { setSoundEnabled(!soundEnabled); if (!soundEnabled) playSound('click'); },
              className: 'p-2 rounded-full transition-colors ' + (soundEnabled ? 'bg-purple-700 text-white' : 'bg-slate-700 text-slate-500')
            }, soundEnabled ? h(Volume2, { size: 20 }) : h(MicOff, { size: 20 }))
          )
        ),
        // Main content
        mainContent,
        // Selected object puzzle dialog
        escapeRoomState.selectedObject
          ? h('div', {
              role: 'button',
              'aria-label': 'Close dialog',
              tabIndex: 0,
              onKeyDown: function(e) { if (e.key === 'Escape') e.currentTarget.click(); },
              className: 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4',
              onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { selectedObject: null }); }); }
            },
              h('div', {
                className: 'bg-slate-800 w-full max-w-2xl rounded-2xl border-4 border-purple-500 shadow-2xl p-6 relative',
                role: 'dialog',
                'aria-modal': 'true',
                onClick: function(e) { e.stopPropagation(); }
              }, renderPuzzleDialog())
            )
          : null,
        // Final door button
        renderFinalDoorButton(),
        // Final door dialog
        renderFinalDoorDialog()
      )
    );
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT: EscapeRoomDialogs (Settings + Preview)
  // ═══════════════════════════════════════════════════════════════

  var EscapeRoomDialogs = React.memo(function EscapeRoomDialogs(props) {
    var escapeRoomState = props.escapeRoomState;
    var setEscapeRoomState = props.setEscapeRoomState;
    var handlers = props.handlers;
    var t = props.t;
    var hasSourceOrAnalysis = props.hasSourceOrAnalysis;

    var settingsDialog = null;
    var previewDialog = null;

    // ── Settings Dialog ──
    if (escapeRoomState.showSettings) {
      var hasSaved = typeof handlers.hasSavedEscapeRoom === 'function' ? handlers.hasSavedEscapeRoom() : false;
      settingsDialog = h('div', {
        role: 'button',
        'aria-label': 'Close dialog',
        tabIndex: 0,
        onKeyDown: function(e) { if (e.key === 'Escape') e.currentTarget.click(); },
        className: 'fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300',
        onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showSettings: false }); }); }
      },
        h('div', {
          className: 'bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-amber-400 relative overflow-hidden max-w-md w-full mx-4 transform transition-all animate-in zoom-in-95 duration-300',
          role: 'dialog',
          'aria-modal': 'true',
          onClick: function(e) { e.stopPropagation(); }
        },
          // Close button
          h('button', {
            onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showSettings: false }); }); },
            className: 'absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors',
            'aria-label': t('common.close')
          }, h(X, { size: 20 })),
          // Header
          h('div', { className: 'text-center mb-6 relative' },
            h('div', { className: 'w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm' },
              h(Key, { size: 32, className: 'text-amber-600' })
            ),
            h('h2', { className: 'text-2xl font-black text-slate-800 mb-1' }, t('escape_room.title')),
            h('p', { className: 'text-slate-500 text-sm' }, t('escape_room.settings_btn'))
          ),
          // Settings controls
          h('div', { className: 'space-y-4 mb-6' },
            // Difficulty selector
            h('div', null,
              h('label', { className: 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('escape_room.difficulty')),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                ['easy', 'normal', 'hard'].map(function(diff) {
                  return h('button', {
                    key: diff,
                    onClick: function() { handlers.updateEscapeRoomSetting('difficulty', diff); },
                    className: 'p-3 rounded-xl border-2 font-bold text-sm capitalize transition-all ' +
                      (escapeRoomState.difficulty === diff
                        ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md'
                        : 'border-slate-200 text-slate-600 hover:border-amber-200 hover:bg-amber-50')
                  }, t('escape_room.' + diff));
                })
              ),
              h('p', { className: 'text-xs text-slate-500 mt-2 text-center' },
                escapeRoomState.difficulty === 'easy' ? '45s per puzzle \u2022 99 lives \u2022 5 hints' :
                escapeRoomState.difficulty === 'normal' ? '30s per puzzle \u2022 3 lives \u2022 3 hints' :
                '20s per puzzle \u2022 1 life \u2022 1 hint'
              )
            ),
            // Puzzle count slider
            h('div', null,
              h('label', { className: 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('escape_room.puzzle_count')),
              h('div', { className: 'flex items-center gap-3' },
                h('input', {
                  'aria-label': t('common.adjust_escape_room_state'),
                  type: 'range',
                  min: '5',
                  max: '15',
                  value: escapeRoomState.puzzleCount || 30,
                  onChange: function(e) { handlers.updateEscapeRoomSetting('puzzleCount', parseInt(e.target.value)); },
                  className: 'flex-grow h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500'
                }),
                h('span', { className: 'w-10 text-center font-bold text-amber-800 bg-amber-50 rounded-lg py-1 border border-amber-200' },
                  escapeRoomState.puzzleCount || 30
                )
              )
            )
          ),
          // Action buttons
          h('div', { className: 'flex gap-3' },
            hasSaved
              ? h('button', {
                  'aria-label': t('common.load_saved_escape_room'),
                  onClick: handlers.loadSavedEscapeRoom,
                  className: 'flex-1 py-3 rounded-xl border-2 border-emerald-300 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2'
                }, '\uD83D\uDCC2 ' + (t('escape_room.load_saved') || 'Load Saved'))
              : null,
            h('button', {
              'aria-label': t('common.generate'),
              onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { showSettings: false }); }); },
              className: 'flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors'
            }, t('common.cancel')),
            h('button', {
              'aria-label': t('common.launch_escape_room'),
              onClick: handlers.launchEscapeRoomWithSettings,
              disabled: !hasSourceOrAnalysis,
              className: 'flex-1 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-600 transition-all shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            }, h(Sparkles, { size: 18 }), ' ', t('escape_room.start'))
          )
        )
      );
    }

    // ── Preview Dialog ──
    if (escapeRoomState.isPreview && escapeRoomState.room) {
      previewDialog = h('div', {
        className: 'fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300',
        style: { overflowY: 'auto' }
      },
        h('div', {
          className: 'bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-amber-400 relative overflow-y-auto max-w-3xl w-full mx-4 my-8 max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-300',
          role: 'dialog',
          'aria-modal': 'true',
          onClick: function(e) { e.stopPropagation(); }
        },
          // Close button
          h('button', {
            onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isPreview: false, isActive: false, room: null, puzzles: [], savedEscapeRoom: null }); }); },
            className: 'absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10',
            'aria-label': t('common.close')
          }, h(X, { size: 20 })),
          // Header
          h('div', { className: 'text-center mb-6' },
            h('div', { className: 'w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm' },
              h(Key, { size: 32, className: 'text-amber-600' })
            ),
            h('h2', { className: 'text-2xl font-black text-slate-800 mb-1' },
              '\uD83D\uDC41\uFE0F ' + (t('escape_room.preview_title') || 'Preview Escape Room')
            ),
            h('p', { className: 'text-slate-500 text-sm' }, t('escape_room.preview_desc') || 'Review and edit puzzles before students play. Click any field to edit.')
          ),
          // Room theme banner
          h('div', { className: 'mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200' },
            h('h3', { className: 'font-bold text-amber-800 text-lg' }, '\uD83C\uDFF0 ' + escapeRoomState.room.theme),
            h('p', { className: 'text-amber-700 text-sm mt-1' }, escapeRoomState.room.description)
          ),
          // Puzzles list
          h('div', { className: 'space-y-3 mb-6' },
            escapeRoomState.puzzles.map(function(puzzle, idx) {
              var typeColorClass =
                puzzle.type === 'mcq' ? 'bg-blue-100 text-blue-700' :
                puzzle.type === 'sequence' ? 'bg-purple-100 text-purple-700' :
                puzzle.type === 'cipher' ? 'bg-red-100 text-red-700' :
                puzzle.type === 'matching' ? 'bg-green-100 text-green-700' :
                puzzle.type === 'scramble' ? 'bg-yellow-100 text-yellow-700' :
                'bg-teal-100 text-teal-700';

              var puzzleChildren = [];
              // Header row
              puzzleChildren.push(
                h('div', { key: 'hdr', className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-xl' }, (puzzle.linkedObject && puzzle.linkedObject.emoji) || '\uD83D\uDD2E'),
                  h('span', { className: 'font-bold text-slate-700' }, (puzzle.linkedObject && puzzle.linkedObject.name) || ('Puzzle ' + (idx + 1))),
                  h('span', { className: 'px-2 py-0.5 rounded-full text-xs font-bold uppercase ' + typeColorClass }, puzzle.type)
                )
              );
              // Question input
              puzzleChildren.push(
                h('div', { key: 'q' },
                  h('label', { className: 'text-xs font-bold text-slate-500 uppercase' }, 'Question'),
                  h('input', {
                    type: 'text',
                    value: puzzle.question || puzzle.sentence || puzzle.encodedText || '',
                    onChange: function(e) {
                      handlers.updateEscapeRoomPuzzle(idx, puzzle.sentence ? 'sentence' : puzzle.encodedText ? 'encodedText' : 'question', e.target.value);
                    },
                    className: 'w-full mt-1 p-2 text-sm border border-slate-200 rounded-lg focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none transition-colors'
                  })
                )
              );
              // MCQ options
              if (puzzle.type === 'mcq' && puzzle.options) {
                puzzleChildren.push(
                  h('div', { key: 'opts', className: 'grid grid-cols-2 gap-2' },
                    puzzle.options.map(function(opt, optIdx) {
                      return h('div', { key: optIdx, className: 'flex items-center gap-1' },
                        h('span', {
                          className: 'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ' +
                            (optIdx === puzzle.correctIndex ? 'bg-green-700 text-white' : 'bg-slate-200 text-slate-500')
                        }, String.fromCharCode(65 + optIdx)),
                        h('input', {
                          type: 'text',
                          value: opt,
                          onChange: function(e) { handlers.updateEscapeRoomPuzzle(idx, 'options', { index: optIdx, text: e.target.value }); },
                          className: 'flex-1 p-1.5 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 transition-colors ' +
                            (optIdx === puzzle.correctIndex ? 'border-green-300 bg-green-50' : 'border-slate-200')
                        })
                      );
                    })
                  )
                );
              }
              // Scramble answer
              if (puzzle.type === 'scramble') {
                puzzleChildren.push(
                  h('p', { key: 'scr-ans', className: 'text-xs text-slate-500' },
                    '\u2705 Answer: ', h('strong', null, puzzle.answer)
                  )
                );
              }
              // Fillin/cipher answer
              if (puzzle.type === 'fillin' || puzzle.type === 'cipher') {
                puzzleChildren.push(
                  h('p', { key: 'fil-ans', className: 'text-xs text-slate-500' },
                    '\u2705 Answer: ', h('strong', null, puzzle.answer), ' | Wordbank: ' + ((puzzle.wordbank || []).join(', '))
                  )
                );
              }
              // Sequence order
              if (puzzle.type === 'sequence' && puzzle.items) {
                puzzleChildren.push(
                  h('p', { key: 'seq-ans', className: 'text-xs text-slate-500' },
                    '\uD83D\uDCCB Correct order: ' + puzzle.items.join(' \u2192 ')
                  )
                );
              }
              // Matching pairs
              if (puzzle.type === 'matching' && puzzle.pairs) {
                puzzleChildren.push(
                  h('p', { key: 'match-ans', className: 'text-xs text-slate-500' },
                    '\uD83D\uDD17 Pairs: ' + puzzle.pairs.map(function(p) { return p.left + '\u2194' + p.right; }).join(', ')
                  )
                );
              }
              // Hint input
              if (puzzle.hint) {
                puzzleChildren.push(
                  h('div', { key: 'hint' },
                    h('label', { className: 'text-xs font-bold text-slate-500 uppercase' }, 'Hint'),
                    h('input', {
                      type: 'text',
                      value: puzzle.hint,
                      onChange: function(e) { handlers.updateEscapeRoomPuzzle(idx, 'hint', e.target.value); },
                      className: 'w-full mt-1 p-2 text-xs border border-slate-200 rounded-lg focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none'
                    })
                  )
                );
              }

              return h('div', {
                key: (puzzle.id || idx),
                className: 'p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-300 transition-colors'
              },
                h('div', { className: 'space-y-2' }, puzzleChildren)
              );
            })
          ),
          // Final door puzzle
          escapeRoomState.finalDoorPuzzle
            ? h('div', { className: 'mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-200' },
                h('h4', { className: 'font-bold text-red-800 mb-2' }, '\uD83D\uDEAA Final Door Puzzle'),
                h('input', {
                  type: 'text',
                  value: escapeRoomState.finalDoorPuzzle.sentence || '',
                  onChange: function(e) { handlers.updateEscapeRoomFinalDoor('sentence', e.target.value); },
                  className: 'w-full p-2 text-sm border border-red-200 rounded-lg focus:border-red-400 outline-none mb-2'
                }),
                h('p', { className: 'text-xs text-red-600' },
                  '\u2705 Answer: ', h('strong', null, escapeRoomState.finalDoorPuzzle.answer)
                )
              )
            : null,
          // Action buttons
          h('div', { className: 'flex gap-3' },
            h('button', {
              'aria-label': t('common.discard_preview'),
              onClick: function() { setEscapeRoomState(function(prev) { return Object.assign({}, prev, { isPreview: false, isActive: false, room: null, puzzles: [], savedEscapeRoom: null }); }); },
              className: 'flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors'
            }, t('common.discard') || '\uD83D\uDDD1\uFE0F Discard'),
            h('button', {
              'aria-label': t('common.save_escape_room_configuration'),
              onClick: handlers.saveEscapeRoomConfig,
              className: 'flex-1 py-3 rounded-xl border-2 border-emerald-300 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2'
            }, '\uD83D\uDCBE ' + (t('escape_room.save_config') || 'Save')),
            h('button', {
              'aria-label': t('common.confirm_and_launch_escape_room'),
              onClick: handlers.confirmEscapeRoomPreview,
              className: 'flex-1 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-600 transition-all shadow-lg hover:shadow-amber-500/30 flex items-center justify-center gap-2'
            }, '\uD83D\uDE80 ' + (t('escape_room.launch') || 'Launch!'))
          )
        )
      );
    }

    return h(React.Fragment, null, settingsDialog, previewDialog);
  });

  // ═══════════════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.createEscapeRoomEngine = createEscapeRoomEngine;
  window.AlloModules.EscapeRoomGameplay = EscapeRoomGameplay;
  window.AlloModules.EscapeRoomDialogs = EscapeRoomDialogs;
  window.AlloModules.useEscapeRoomTimer = useEscapeRoomTimer;
  window.AlloModules.EscapeRoomModule = true;

  console.log('[EscapeRoomModule] Loaded successfully');
})();
