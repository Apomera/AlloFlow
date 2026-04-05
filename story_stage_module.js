/**
 * AlloFlow LitLab Module
 *
 * Fiction performance & literary analysis — bring stories to life with character voices,
 * karaoke performance mode, and grade-responsive literary analysis scaffolds.
 *
 * Source: story_stage_module.js
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.LitLab) {
    console.log('[CDN] LitLab already loaded, skipping');
    return;
  }

  var warnLog = function () { console.warn.apply(console, ['[LitLab]'].concat(Array.prototype.slice.call(arguments))); };

  // ── Constants ─────────────────────────────────────────────────────────
  var STORAGE_SCRIPTS = 'alloLitLabScripts';
  var STORAGE_PERFORMANCES = 'alloLitLabPerformances';

  var GENRES = [
    { id: 'fairy-tale', label: 'Fairy Tale', icon: '🧚', desc: 'Once upon a time...' },
    { id: 'mystery', label: 'Mystery', icon: '🔍', desc: 'Whodunit suspense' },
    { id: 'adventure', label: 'Adventure', icon: '⚔️', desc: 'Epic quests & journeys' },
    { id: 'sci-fi', label: 'Science Fiction', icon: '🚀', desc: 'Future worlds & technology' },
    { id: 'fantasy', label: 'Fantasy', icon: '🐉', desc: 'Magic & mythical worlds' },
    { id: 'realistic', label: 'Realistic Fiction', icon: '🏠', desc: 'Everyday life & relationships' },
    { id: 'historical', label: 'Historical Fiction', icon: '🏛️', desc: 'Stories set in the past' },
    { id: 'humor', label: 'Comedy', icon: '😂', desc: 'Funny & lighthearted' },
    { id: 'fable', label: 'Fable / Myth', icon: '🦊', desc: 'Lessons through allegory' },
    { id: 'poetry', label: 'Poetry / Spoken Word', icon: '📜', desc: 'Verse & rhythm' },
  ];

  // Default character voice assignments (rotate through distinct voices)
  var VOICE_POOL = ['Kore', 'Charon', 'Puck', 'Aoede', 'Fenrir', 'Leda', 'Orus', 'Zephyr', 'Enceladus', 'Despina', 'Achernar', 'Gacrux'];

  function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }
  function load(key, fallback) { try { var s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  // ── Main Component ────────────────────────────────────────────────────
  var LitLab = React.memo(function LitLab(props) {
    var onClose = props.onClose;
    var onCallGemini = props.onCallGemini;
    var onCallTTS = props.onCallTTS;
    var onCallImagen = props.onCallImagen;
    var onCallGeminiImageEdit = props.onCallGeminiImageEdit;
    var selectedVoice = props.selectedVoice;
    var gradeLevel = props.gradeLevel || '5th Grade';
    var addToast = props.addToast;
    var geminiVoices = props.geminiVoices || [];
    var kokoroVoices = props.kokoroVoices || [];
    var studentNickname = props.studentNickname || '';
    var handleScoreUpdate = props.handleScoreUpdate;

    var e = React.createElement;
    var useState = React.useState;
    var useCallback = React.useCallback;
    var useRef = React.useRef;

    // ── Codename system ──
    var CN_ADJ = ['Alpine','Arctic','Bold','Brave','Bright','Calm','Clever','Cool','Cosmic','Daring','Eager','Epic','Fair','Fast','Fierce','Gentle','Grand','Happy','Heroic','Jolly','Kind','Lively','Lucky','Magic','Mighty','Neon','Noble','Proud','Quick','Rapid','Royal','Silent','Smart','Solar','Sonic','Steady','Super','Swift','Tough','Turbo','Unique','Vivid','Wild','Wise','Zealous'];
    var CN_ANI = ['Badger','Bear','Beaver','Bison','Cat','Cobra','Cougar','Crane','Crow','Deer','Dingo','Dolphin','Dragon','Eagle','Elk','Falcon','Ferret','Fox','Gecko','Hawk','Heron','Horse','Husky','Jaguar','Koala','Lemur','Leopard','Lion','Lynx','Moose','Otter','Owl','Panda','Panther','Parrot','Penguin','Puma','Rabbit','Raven','Seal','Shark','Sloth','Tiger','Turtle','Wolf'];

    var PURPLE = '#7c3aed';
    var LIGHT_PURPLE = '#f5f3ff';

    // ── State ──
    var _phase = useState('input'); var phase = _phase[0]; var setPhase = _phase[1];
    // input → script → assign → perform → analyze

    // Input state
    var _inputMode = useState('paste'); var inputMode = _inputMode[0]; var setInputMode = _inputMode[1];
    var _sourceText = useState(''); var sourceText = _sourceText[0]; var setSourceText = _sourceText[1];
    var _storyTitle = useState(''); var storyTitle = _storyTitle[0]; var setStoryTitle = _storyTitle[1];
    var _isLoading = useState(false); var isLoading = _isLoading[0]; var setIsLoading = _isLoading[1];
    var _loadingMsg = useState(''); var loadingMsg = _loadingMsg[0]; var setLoadingMsg = _loadingMsg[1];
    // AI generation
    var _genGenre = useState('fairy-tale'); var genGenre = _genGenre[0]; var setGenGenre = _genGenre[1];
    var _genPrompt = useState(''); var genPrompt = _genPrompt[0]; var setGenPrompt = _genPrompt[1];
    var _genCharCount = useState(3); var genCharCount = _genCharCount[0]; var setGenCharCount = _genCharCount[1];
    var _genGradeLevel = useState(gradeLevel || '5th Grade'); var genGradeLevel = _genGradeLevel[0]; var setGenGradeLevel = _genGradeLevel[1];
    var _genLength = useState('medium'); var genLength = _genLength[0]; var setGenLength = _genLength[1];
    var GRADE_OPTIONS = ['K', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];
    var LENGTH_OPTIONS = [
      { id: 'short', label: 'Short', words: '200-400', desc: 'Quick read, 1-2 scenes' },
      { id: 'medium', label: 'Medium', words: '500-800', desc: 'Standard story arc' },
      { id: 'long', label: 'Long', words: '900-1500', desc: 'Detailed with subplots' },
    ];

    // Script state
    var _script = useState(null); var script = _script[0]; var setScript = _script[1];
    // script = { title, characters: [{id, name, voice, color, portrait}], lines: [{id, speaker, text, type:'dialogue'|'narration'|'stage-direction'}] }

    // Voice assignment
    var _previewingVoice = useState(null); var previewingVoice = _previewingVoice[0]; var setPreviewingVoice = _previewingVoice[1];

    // Performance state
    var _currentLine = useState(0); var currentLine = _currentLine[0]; var setCurrentLine = _currentLine[1];
    var _isPlaying = useState(false); var isPlaying = _isPlaying[0]; var setIsPlaying = _isPlaying[1];
    var _isPaused = useState(false); var isPaused = _isPaused[0]; var setIsPaused = _isPaused[1];
    var _playbackSpeed = useState(1); var playbackSpeed = _playbackSpeed[0]; var setPlaybackSpeed = _playbackSpeed[1];
    var _myRole = useState(null); var myRole = _myRole[0]; var setMyRole = _myRole[1]; // character id the student "plays"
    var audioRef = useRef(null);
    var playingRef = useRef(false);
    var lineContainerRef = useRef(null);

    // Analysis state
    var _analysisResponses = useState({}); var analysisResponses = _analysisResponses[0]; var setAnalysisResponses = _analysisResponses[1];
    var _analysisFeedback = useState(null); var analysisFeedback = _analysisFeedback[0]; var setAnalysisFeedback = _analysisFeedback[1];

    // Saved scripts
    var _savedScripts = useState(function () { return load(STORAGE_SCRIPTS, []); });
    var savedScripts = _savedScripts[0]; var setSavedScripts = _savedScripts[1];

    // Scene illustration
    var _sceneImage = useState(null); var sceneImage = _sceneImage[0]; var setSceneImage = _sceneImage[1];
    var _sceneImageLoading = useState(false); var sceneImageLoading = _sceneImageLoading[0]; var setSceneImageLoading = _sceneImageLoading[1];

    // Emotion tracking (per-line emoji reactions during performance)
    var _emotionLog = useState({}); var emotionLog = _emotionLog[0]; var setEmotionLog = _emotionLog[1];
    var EMOTIONS = ['😊','😢','😠','😨','😂','🤔','😮','❤️'];

    // Recording
    var _isRecording = useState(false); var isRecording = _isRecording[0]; var setIsRecording = _isRecording[1];
    var _recordedChunks = useState([]); var recordedChunks = _recordedChunks[0]; var setRecordedChunks = _recordedChunks[1];
    var _recordingUrl = useState(null); var recordingUrl = _recordingUrl[0]; var setRecordingUrl = _recordingUrl[1];
    var mediaRecorderRef = useRef(null);

    // Codename
    var _performerName = useState(studentNickname || ''); var performerName = _performerName[0]; var setPerformerName = _performerName[1];

    // Standards selection
    var _selectedStandard = useState(''); var selectedStandard = _selectedStandard[0]; var setSelectedStandard = _selectedStandard[1];

    // CCSS ELA Standards for Literature
    var CCSS_STANDARDS = {
      'K-2': [
        'RL.K.1 Ask and answer questions about key details',
        'RL.1.3 Describe characters, settings, and major events',
        'RL.2.3 Describe how characters respond to events',
        'RL.2.6 Acknowledge differences in the points of view of characters',
      ],
      '3-5': [
        'RL.3.3 Describe characters and explain how their actions contribute to events',
        'RL.4.2 Determine a theme from details; summarize the text',
        'RL.4.3 Describe a character, setting, or event, drawing on specific details',
        'RL.5.2 Determine a theme; explain how it is conveyed through details',
        'RL.5.6 Describe how a narrator or speaker\'s point of view influences events',
      ],
      '6-8': [
        'RL.6.3 Describe how a plot unfolds and how characters respond or change',
        'RL.6.6 Explain how an author develops the point of view of the narrator',
        'RL.7.2 Determine a theme; analyze its development over the course of the text',
        'RL.8.3 Analyze how dialogue or incidents propel the action or reveal character',
      ],
      '9-12': [
        'RL.9-10.2 Determine a theme; analyze in detail its development',
        'RL.9-10.3 Analyze how complex characters develop and interact with other elements',
        'RL.9-10.5 Analyze how an author\'s choices concerning structure create effects',
        'RL.11-12.3 Analyze the impact of the author\'s choices regarding development of elements',
        'RL.11-12.6 Analyze a case in which grasping point of view requires distinguishing what is stated from what is meant',
      ],
    };

    // ── Helpers ──
    var allVoices = geminiVoices.concat(kokoroVoices || []);

    function cleanJson(text) {
      if (!text) return text;
      var s = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var first = s.indexOf('{') !== -1 ? s.indexOf('{') : s.indexOf('[');
      var last = s.lastIndexOf('}') !== -1 ? s.lastIndexOf('}') : s.lastIndexOf(']');
      if (first !== -1 && last !== -1 && last >= first) return s.substring(first, last + 1);
      return s;
    }

    // ── Phase 1: Extract characters & build script ──
    var extractScript = useCallback(async function (text) {
      if (!onCallGemini || !text.trim()) return;
      setIsLoading(true);
      setLoadingMsg('Analyzing text and extracting characters...');
      try {
        var gl = genGradeLevel || gradeLevel || '5th Grade';
        var isElem = /k|1st|2nd|3rd|4th|5th/i.test(gl);
        var prompt = 'You are an expert drama teacher and literary analyst. Analyze this fiction text and convert it into a performable script.\n\n'
          + 'Text:\n"""\n' + text.substring(0, 12000) + '\n"""\n\n'
          + 'Target audience: ' + gl + ' students.\n\n'
          + 'Extract:\n'
          + '1. TITLE: A title for this story/scene\n'
          + '2. CHARACTERS: Every distinct character who speaks or is referenced. For each character provide:\n'
          + '   - A unique id (lowercase, no spaces)\n'
          + '   - Their name as it appears in the text\n'
          + '   - A brief description (personality, role)\n'
          + '   - A suggested color (hex) for their dialogue highlighting\n'
          + '3. SCRIPT LINES: Convert the entire text into sequential lines. Each line is one of:\n'
          + '   - "dialogue": A character speaking (include the speaker\'s character id)\n'
          + '   - "narration": Narrator description/action (speaker = "narrator")\n'
          + '   - "stage-direction": Brief action/emotion cues in brackets (speaker = "stage")\n'
          + (isElem ? '   Keep narration lines short (1-2 sentences each). Split long passages.\n' : '')
          + '4. SETTING: A brief description of the setting for illustration generation\n'
          + '5. THEME: The central theme or message\n'
          + '6. LITERARY_ELEMENTS: Key literary devices used (foreshadowing, metaphor, etc.)\n\n'
          + 'Return ONLY JSON:\n'
          + '{\n'
          + '  "title": "Story Title",\n'
          + '  "setting": "brief setting description",\n'
          + '  "theme": "central theme",\n'
          + '  "literaryElements": ["element1", "element2"],\n'
          + '  "characters": [\n'
          + '    {"id": "char_id", "name": "Character Name", "description": "brief description", "color": "#hex"}\n'
          + '  ],\n'
          + '  "lines": [\n'
          + '    {"id": "l1", "speaker": "char_id_or_narrator_or_stage", "text": "The line text", "type": "dialogue|narration|stage-direction"}\n'
          + '  ]\n'
          + '}';
        var result = await onCallGemini(prompt, true);
        var parsed = JSON.parse(cleanJson(result));
        if (!parsed.characters || !parsed.lines) throw new Error('Invalid script format');
        // Assign default voices to characters
        parsed.characters.forEach(function (ch, i) {
          ch.voice = VOICE_POOL[i % VOICE_POOL.length];
          ch.portrait = null;
        });
        // Add narrator as a "character" for voice assignment
        if (!parsed.characters.find(function (c) { return c.id === 'narrator'; })) {
          parsed.characters.unshift({ id: 'narrator', name: 'Narrator', description: 'The storyteller', color: '#64748b', voice: 'Aoede', portrait: null });
        }
        // Ensure all lines have ids
        parsed.lines.forEach(function (line, i) { if (!line.id) line.id = 'l' + (i + 1); });
        setScript(parsed);
        setStoryTitle(parsed.title || 'Untitled');
        setPhase('assign');
        addToast && addToast('Script created! ' + parsed.characters.length + ' characters, ' + parsed.lines.length + ' lines.', 'success');
      } catch (err) {
        warnLog('Script extraction failed:', err);
        addToast && addToast('Script extraction failed: ' + err.message, 'error');
      } finally { setIsLoading(false); setLoadingMsg(''); }
    }, [onCallGemini, gradeLevel, addToast]);

    // ── AI Story Generation ──
    var generateStory = useCallback(async function () {
      if (!onCallGemini) return;
      setIsLoading(true);
      var genreObj = GENRES.find(function (g) { return g.id === genGenre; }) || GENRES[0];
      setLoadingMsg('Writing a ' + genreObj.label + ' story...');
      try {
        var gl = genGradeLevel || gradeLevel || '5th Grade';
        var isElem = /k|1st|2nd|3rd|4th|5th/i.test(gl);
        var isMid = /6th|7th|8th/i.test(gl);
        var lenObj = LENGTH_OPTIONS.find(function (l) { return l.id === genLength; }) || LENGTH_OPTIONS[1];
        var wordRange = lenObj.words;
        var vocabGuide = isElem
          ? 'Keep vocabulary simple and sentences short (' + gl + ' reading level).'
          : isMid
          ? 'Use grade-appropriate vocabulary for ' + gl + ' students. Include descriptive language and character development.'
          : 'Use rich, literary language appropriate for ' + gl + '. Include at least one literary device (metaphor, foreshadowing, irony).';
        var prompt = 'You are a talented fiction writer for ' + gl + ' students.\n\n'
          + 'Write a ' + genreObj.label + ' story'
          + (genPrompt.trim() ? ' with these instructions: "' + genPrompt.trim() + '"' : '') + '.\n\n'
          + 'Requirements:\n'
          + '- Include ' + genCharCount + ' distinct characters with dialogue\n'
          + '- ' + vocabGuide + ' Target length: ' + wordRange + ' words.\n'
          + '- Include a clear beginning, middle, and end\n'
          + '- Use dialogue tags ("said", "whispered", "exclaimed") so characters are clearly identified\n'
          + '- Include sensory details and setting description\n\n'
          + 'Return ONLY the story text — no title header, no commentary.';
        var result = await onCallGemini(prompt, false);
        if (result && result.trim().length > 50) {
          setSourceText(result.trim());
          setInputMode('paste');
          addToast && addToast('Story generated! Review it, then click "Create Script" to continue.', 'success');
        } else {
          addToast && addToast('Generation returned too little text. Try again.', 'error');
        }
      } catch (err) {
        addToast && addToast('Story generation failed: ' + err.message, 'error');
      } finally { setIsLoading(false); setLoadingMsg(''); }
    }, [onCallGemini, gradeLevel, genGradeLevel, genGenre, genPrompt, genCharCount, genLength, addToast]);

    // ── TTS Playback ──
    var speakLine = useCallback(function (text, voice, speed) {
      return new Promise(function (resolve) {
        if (!text || !text.trim()) { resolve(); return; }
        if (onCallTTS) {
          onCallTTS(text, voice || selectedVoice || 'Kore', speed || playbackSpeed).then(function (url) {
            if (url) {
              var a = new Audio(url);
              audioRef.current = a;
              a.playbackRate = speed || playbackSpeed;
              a.onended = function () { audioRef.current = null; resolve(); };
              a.onerror = function () { audioRef.current = null; resolve(); };
              a.play().catch(function () { resolve(); });
            } else { resolve(); }
          }).catch(function () {
            // Fallback to browser TTS
            if (window.speechSynthesis) {
              window.speechSynthesis.cancel();
              var utt = new SpeechSynthesisUtterance(text);
              utt.rate = speed || playbackSpeed;
              utt.onend = function () { resolve(); };
              window.speechSynthesis.speak(utt);
            } else { resolve(); }
          });
        } else if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          var utt = new SpeechSynthesisUtterance(text);
          utt.rate = speed || playbackSpeed;
          utt.onend = function () { resolve(); };
          window.speechSynthesis.speak(utt);
        } else { resolve(); }
      });
    }, [onCallTTS, selectedVoice, playbackSpeed]);

    // ── Performance Playback (full script) ──
    var playFromLine = useCallback(async function (startIdx) {
      if (!script || !script.lines) return;
      playingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      for (var i = startIdx; i < script.lines.length; i++) {
        if (!playingRef.current) break;
        setCurrentLine(i);
        // Scroll into view
        var lineEl = document.getElementById('ss-line-' + i);
        if (lineEl) lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var line = script.lines[i];
        // If student is playing a role, skip TTS for their character
        if (myRole && line.speaker === myRole) {
          // Wait for student to read (3 seconds per line or they click next)
          await new Promise(function (r) { setTimeout(r, 3000); });
          continue;
        }
        if (line.type === 'stage-direction') {
          await new Promise(function (r) { setTimeout(r, 1000); });
          continue;
        }
        var character = script.characters.find(function (c) { return c.id === line.speaker; });
        var voice = character ? character.voice : 'Aoede';
        await speakLine(line.text, voice, playbackSpeed);
        // Brief pause between lines
        if (playingRef.current) await new Promise(function (r) { setTimeout(r, 300); });
      }
      playingRef.current = false;
      setIsPlaying(false);
      if (handleScoreUpdate) handleScoreUpdate(20, 'LitLab Performance', 'storystage-perform-' + (script.title || 'untitled'));
    }, [script, speakLine, playbackSpeed, myRole, handleScoreUpdate]);

    var stopPlayback = useCallback(function () {
      playingRef.current = false;
      setIsPlaying(false);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }, []);

    // ── Save/Load Scripts ──
    var saveScript = useCallback(function () {
      if (!script) return;
      var entry = { id: uid(), title: storyTitle, script: script, sourceText: sourceText, savedAt: new Date().toISOString() };
      var updated = [entry].concat(savedScripts.slice(0, 19));
      setSavedScripts(updated);
      store(STORAGE_SCRIPTS, updated);
      addToast && addToast('Script saved!', 'success');
    }, [script, storyTitle, sourceText, savedScripts, addToast]);

    var loadScript = useCallback(function (entry) {
      setScript(entry.script);
      setStoryTitle(entry.title);
      setSourceText(entry.sourceText || '');
      setPhase('assign');
    }, []);

    // ── Generate Character Portraits ──
    var generatePortrait = useCallback(async function (charId) {
      if (!onCallImagen || !script) return;
      var ch = script.characters.find(function (c) { return c.id === charId; });
      if (!ch) return;
      try {
        var prompt = 'Character portrait illustration: ' + ch.name + ' — ' + ch.description + '. '
          + 'Style: warm, expressive, children\'s book illustration. Circular frame. White background. STRICTLY NO TEXT.';
        var url = await onCallImagen(prompt, 256, 0.85);
        if (url) {
          var updatedChars = script.characters.map(function (c) { return c.id === charId ? Object.assign({}, c, { portrait: url }) : c; });
          setScript(Object.assign({}, script, { characters: updatedChars }));
        }
      } catch (err) { warnLog('Portrait gen failed:', err.message); }
    }, [onCallImagen, script]);

    // ── Literary Analysis Feedback ──
    var getAnalysisFeedback = useCallback(async function () {
      if (!onCallGemini || !script) return;
      setAnalysisFeedback('loading');
      try {
        var isElem = /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel);
        var isMid = /6th|7th|8th/i.test(gradeLevel);
        var respSummary = Object.entries(analysisResponses).map(function (pair) { return pair[0] + ': "' + pair[1] + '"'; }).join('\n');
        var gradeGuide = isElem
          ? 'Elementary: Praise any character or story observations. Use simple language. "exemplary" = identifies a character trait with a reason from the story.'
          : isMid
          ? 'Middle School: Expect character analysis with text evidence. Push toward theme identification. Use clear academic language.'
          : 'High School: Expect analysis of literary devices, theme development, character arc, and author\'s craft. Push toward sophisticated interpretation.';
        var emotionSummary = Object.keys(emotionLog).length > 0
          ? '\nStudent\'s emotional reactions during performance: ' + Object.entries(emotionLog).filter(function (p) { return p[1]; }).map(function (p) { var line = script.lines.find(function (l) { return l.id === p[0]; }); return p[1] + ' at "' + (line ? line.text.substring(0, 30) : '') + '..."'; }).join(', ')
          : '';
        var standardFocus = selectedStandard ? '\nFocused standard: ' + selectedStandard + '. Evaluate their analysis specifically against this standard.' : '';
        var prompt = 'You are a warm, encouraging ELA teacher providing feedback on a ' + gradeLevel + ' student\'s literary analysis of "' + storyTitle + '".\n\n'
          + 'Story characters: ' + script.characters.filter(function (c) { return c.id !== 'narrator' && c.id !== 'stage'; }).map(function (c) { return c.name + ' (' + c.description + ')'; }).join(', ') + '\n'
          + 'Theme: ' + (script.theme || 'not specified') + '\n'
          + 'Literary elements: ' + (script.literaryElements || []).join(', ') + '\n'
          + emotionSummary + standardFocus + '\n\n'
          + 'Student responses:\n' + respSummary + '\n\n'
          + 'Grade expectations: ' + gradeGuide + '\n\n'
          + 'Return JSON: {"overallRating":"developing|proficient|exemplary","strengths":["1-2 things done well"],"nudges":["1-2 guiding questions"],"characterInsight":"feedback on character understanding","themeInsight":"feedback on theme analysis","craftInsight":"feedback on literary craft awareness"}\n\n'
          + 'Score according to ' + gradeLevel + ' expectations. Match vocabulary to their level.';
        var result = await onCallGemini(prompt, true);
        var parsed = JSON.parse(cleanJson(result));
        setAnalysisFeedback(parsed);
        if (handleScoreUpdate) {
          var xp = parsed.overallRating === 'exemplary' ? 30 : parsed.overallRating === 'proficient' ? 20 : 10;
          handleScoreUpdate(xp, 'LitLab Literary Analysis', 'storystage-analysis-' + (script.title || 'untitled'));
        }
        addToast && addToast('Feedback received!', 'success');
      } catch (err) {
        setAnalysisFeedback({ error: 'Could not generate feedback.' });
        addToast && addToast('Feedback failed: ' + err.message, 'error');
      }
    }, [onCallGemini, script, storyTitle, gradeLevel, analysisResponses, handleScoreUpdate, addToast]);

    // ── Scene Illustration ──
    var generateSceneImage = useCallback(async function () {
      if (!onCallImagen || !script) return;
      setSceneImageLoading(true);
      try {
        var prompt = 'Illustration for a story scene: ' + (script.setting || storyTitle || 'a fictional setting') + '. '
          + 'Style: warm, colorful, children\'s book illustration. Wide landscape composition. Rich detail. STRICTLY NO TEXT.';
        var url = await onCallImagen(prompt, 600, 0.85);
        if (url) setSceneImage(url);
      } catch (err) { warnLog('Scene image failed:', err.message); }
      setSceneImageLoading(false);
    }, [onCallImagen, script, storyTitle]);

    // ── Recording ──
    var startRecording = useCallback(async function () {
      try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        var mr = new MediaRecorder(stream);
        var chunks = [];
        mr.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data); };
        mr.onstop = function () {
          var blob = new Blob(chunks, { type: 'audio/webm' });
          var url = URL.createObjectURL(blob);
          setRecordingUrl(url);
          setRecordedChunks(chunks);
          stream.getTracks().forEach(function (t) { t.stop(); });
          addToast && addToast('Recording saved!', 'success');
          if (handleScoreUpdate) handleScoreUpdate(15, 'LitLab Recording', 'storystage-record-' + (storyTitle || 'untitled'));
        };
        mediaRecorderRef.current = mr;
        mr.start();
        setIsRecording(true);
        addToast && addToast('Recording started — read your lines!', 'info');
      } catch (err) {
        addToast && addToast('Microphone access denied. Please allow microphone to record.', 'error');
      }
    }, [storyTitle, handleScoreUpdate, addToast]);

    var stopRecording = useCallback(function () {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    }, []);

    // ── Get grade band for standards ──
    var getGradeBand = function () {
      if (/k|1st|2nd/i.test(gradeLevel)) return 'K-2';
      if (/3rd|4th|5th/i.test(gradeLevel)) return '3-5';
      if (/6th|7th|8th/i.test(gradeLevel)) return '6-8';
      return '9-12';
    };

    // ── Export script as printable HTML ──
    var exportScript = useCallback(function () {
      if (!script) return;
      var chars = script.characters.filter(function (c) { return c.id !== 'stage'; });
      var html = '<html><head><title>' + storyTitle + ' — LitLab Script</title>'
        + '<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:20px;color:#1e293b;line-height:1.8}'
        + '.char-name{font-weight:bold;font-variant:small-caps;margin-right:8px}'
        + '.narration{font-style:italic;color:#475569;margin:12px 0}'
        + '.stage{font-style:italic;color:#9ca3af;font-size:0.9em;margin:8px 0 8px 20px}'
        + '.dialogue{margin:8px 0;padding-left:20px}'
        + '.cast{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:20px 0}'
        + '.cast-card{border:2px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}'
        + 'h1{text-align:center;border-bottom:2px solid #7c3aed;padding-bottom:12px}'
        + '@media print{body{margin:20px}}</style></head><body>';
      html += '<h1>🎭 ' + storyTitle + '</h1>';
      if (performerName) html += '<p style="text-align:center;color:#6b7280">Performer: ' + performerName + '</p>';
      html += '<h2>Cast of Characters</h2><div class="cast">';
      chars.forEach(function (c) {
        html += '<div class="cast-card" style="border-color:' + c.color + '">'
          + (c.portrait ? '<img src="' + c.portrait + '" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-bottom:8px" />' : '')
          + '<div style="font-weight:bold;color:' + c.color + '">' + c.name + '</div>'
          + '<div style="font-size:0.85em;color:#6b7280">' + (c.description || '') + '</div></div>';
      });
      html += '</div><hr><h2>Script</h2>';
      script.lines.forEach(function (line) {
        var ch = script.characters.find(function (c) { return c.id === line.speaker; });
        if (line.type === 'stage-direction') {
          html += '<div class="stage">[' + line.text + ']</div>';
        } else if (line.type === 'narration') {
          html += '<div class="narration">' + line.text + '</div>';
        } else {
          html += '<div class="dialogue"><span class="char-name" style="color:' + (ch ? ch.color : '#374151') + '">' + (ch ? ch.name : 'Unknown') + ':</span>' + line.text + '</div>';
        }
      });
      if (script.theme) html += '<hr><p><strong>Theme:</strong> ' + script.theme + '</p>';
      html += '<div style="margin-top:30px;text-align:center;font-size:0.8em;color:#9ca3af">Generated with AlloFlow LitLab</div>';
      html += '</body></html>';
      var w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }, [script, storyTitle, performerName]);

    // ── Styles ──
    var S = {
      modal: { position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
      container: { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '1000px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' },
      header: { background: 'linear-gradient(135deg, #7c3aed, #a855f7)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', shrink: 0 },
      body: { flex: 1, overflowY: 'auto', padding: '20px' },
      btn: function (bg, fg, dis) { return { padding: '8px 16px', background: dis ? '#e5e7eb' : bg, color: dis ? '#9ca3af' : fg, border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: dis ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }; },
      card: { background: '#f9fafb', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '12px' },
      input: { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' },
    };

    // ═══════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════

    return e('div', { style: S.modal, onClick: function (ev) { if (ev.target === ev.currentTarget) onClose(); } },
      e('div', { style: S.container, onClick: function (ev) { ev.stopPropagation(); } },
        // Header
        e('div', { style: S.header },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            e('span', { style: { fontSize: '24px' } }, '🎭'),
            e('div', null,
              e('h2', { style: { fontWeight: 900, fontSize: '18px', margin: 0 } }, 'LitLab'),
              e('p', { style: { fontSize: '11px', opacity: 0.8, margin: 0 } }, storyTitle || 'Bring stories to life')
            )
          ),
          e('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
            phase !== 'input' && e('button', { onClick: function () {
              if (phase === 'assign') setPhase('input');
              else if (phase === 'perform') { stopPlayback(); setPhase('assign'); }
              else if (phase === 'analyze') setPhase('perform');
            }, style: S.btn('rgba(255,255,255,0.2)', '#fff', false), 'aria-label': 'Back' }, '← Back'),
            e('button', { onClick: onClose, style: { color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '5px 11px', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }, 'aria-label': 'Close' }, '×')
          )
        ),
        // Body
        e('div', { style: S.body },

          // ═══ INPUT PHASE ═══
          phase === 'input' && e('div', { style: { maxWidth: '700px', margin: '0 auto' } },
            // Codename bar
            e('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', padding: '8px 16px', background: LIGHT_PURPLE, borderRadius: '12px', border: '1px solid #c4b5fd' } },
              e('span', { style: { fontSize: '11px', fontWeight: 700, color: PURPLE } }, '🎭 Performer:'),
              e('select', { value: performerName.split(' ')[0] || '', onChange: function (ev) {
                var animal = performerName.split(' ').slice(1).join(' ') || CN_ANI[0];
                setPerformerName(ev.target.value ? ev.target.value + ' ' + animal : animal);
              }, style: { fontSize: '11px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #c4b5fd', color: PURPLE, fontWeight: 600 }, 'aria-label': 'Codename adjective' },
                e('option', { value: '' }, '— Adjective —'),
                CN_ADJ.map(function (a) { return e('option', { key: a, value: a }, a); })
              ),
              e('select', { value: performerName.split(' ').slice(1).join(' ') || '', onChange: function (ev) {
                var adj = performerName.split(' ')[0] || CN_ADJ[0];
                setPerformerName(ev.target.value ? adj + ' ' + ev.target.value : adj);
              }, style: { fontSize: '11px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #c4b5fd', color: PURPLE, fontWeight: 600 }, 'aria-label': 'Codename animal' },
                e('option', { value: '' }, '— Animal —'),
                CN_ANI.map(function (a) { return e('option', { key: a, value: a }, a); })
              ),
              e('button', { onClick: function () { setPerformerName(CN_ADJ[Math.floor(Math.random() * CN_ADJ.length)] + ' ' + CN_ANI[Math.floor(Math.random() * CN_ANI.length)]); },
                style: { fontSize: '11px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }, 'aria-label': 'Randomize codename' }, '🎲')
            ),
            e('div', { style: { textAlign: 'center', marginBottom: '24px' } },
              e('h3', { style: { fontSize: '22px', fontWeight: 800, color: '#1e293b' } }, '🎭 Create Your Performance'),
              e('p', { style: { color: '#64748b', fontSize: '14px' } }, 'Paste a story, import from URL, or let AI write one — then bring it to life with character voices.')
            ),
            // Mode selector
            e('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' } },
              [['paste', '📋 Paste Text'], ['generate', '✨ AI Generate']].map(function (pair) {
                return e('button', { key: pair[0], onClick: function () { setInputMode(pair[0]); },
                  style: Object.assign({}, S.btn(inputMode === pair[0] ? PURPLE : '#f1f5f9', inputMode === pair[0] ? '#fff' : '#374151', false), { padding: '10px 20px' })
                }, pair[1]);
              })
            ),

            // Paste mode
            inputMode === 'paste' && e('div', { style: S.card },
              e('textarea', { value: sourceText, onChange: function (ev) { setSourceText(ev.target.value); },
                onPaste: async function (ev) {
                  var items = ev.clipboardData && ev.clipboardData.items;
                  if (!items || !props.onCallGeminiVision) return;
                  for (var ii = 0; ii < items.length; ii++) {
                    if (items[ii].type.startsWith('image/')) {
                      ev.preventDefault();
                      var blob = items[ii].getAsFile();
                      if (!blob) return;
                      setIsLoading(true); setLoadingMsg('Extracting text from image...');
                      var reader = new FileReader();
                      reader.onload = async function () {
                        try {
                          var base64 = reader.result.split(',')[1];
                          var text = await props.onCallGeminiVision('You are an OCR expert. Extract ALL readable text from this image. Preserve paragraph structure. Return ONLY the extracted text.', base64, items[ii].type);
                          if (text && text.trim().length > 10) { setSourceText(function (prev) { return prev ? prev + '\n\n' + text.trim() : text.trim(); }); addToast && addToast('Text extracted from image!', 'success'); }
                          else { addToast && addToast('Could not extract text.', 'error'); }
                        } catch (err) { addToast && addToast('OCR failed.', 'error'); }
                        setIsLoading(false); setLoadingMsg('');
                      };
                      reader.readAsDataURL(blob);
                      return;
                    }
                  }
                },
                placeholder: 'Paste a story, chapter, poem, or play excerpt here...\n\nYou can also paste an image (screenshot of a book page) — the text will be extracted automatically.',
                rows: 10, style: Object.assign({}, S.input, { resize: 'vertical', fontFamily: 'Georgia, serif', lineHeight: 1.7 }),
                'aria-label': 'Story text input' }),
              e('div', { style: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' } },
                e('button', { onClick: function () { if (sourceText.trim()) extractScript(sourceText); },
                  disabled: !sourceText.trim() || isLoading,
                  style: S.btn(PURPLE, '#fff', !sourceText.trim() || isLoading) }, isLoading ? '⏳ ' + loadingMsg : '🎭 Create Script'),
                // URL import
                e('button', { onClick: async function () {
                  var url = prompt('Paste a URL to import text from:');
                  if (!url || !url.trim()) return;
                  setIsLoading(true); setLoadingMsg('Fetching from URL...');
                  try {
                    var text = await window.__alloUtils.fetchAndCleanUrl(url.trim(), onCallGemini, addToast);
                    if (text) { setSourceText(function (prev) { return prev ? prev + '\n\n' + text : text; }); addToast && addToast('Text imported from URL!', 'success'); }
                  } catch (err) { addToast && addToast('Import failed: ' + err.message, 'error'); }
                  setIsLoading(false); setLoadingMsg('');
                }, style: S.btn('#f1f5f9', '#374151', false) }, '🔗 Import URL'),
                // File upload
                e('button', { onClick: function () {
                  var input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,.txt,.md,.pdf';
                  input.onchange = async function (ev) {
                    var file = ev.target.files && ev.target.files[0];
                    if (!file) return;
                    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                      var reader = new FileReader();
                      reader.onload = function (e2) { setSourceText(function (prev) { return prev ? prev + '\n\n' + e2.target.result : e2.target.result; }); };
                      reader.readAsText(file);
                    } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                      if (!props.onCallGeminiVision) { addToast && addToast('Vision API not available.', 'error'); return; }
                      setIsLoading(true); setLoadingMsg('Extracting text from file...');
                      var reader2 = new FileReader();
                      reader2.onload = async function () {
                        try {
                          var base64 = reader2.result.split(',')[1];
                          var text = await props.onCallGeminiVision('Extract all readable text from this document. Preserve paragraph structure. Return ONLY the text.', base64, file.type);
                          if (text) { setSourceText(function (prev) { return prev ? prev + '\n\n' + text.trim() : text.trim(); }); addToast && addToast('Text extracted!', 'success'); }
                        } catch (err) { addToast && addToast('Extraction failed.', 'error'); }
                        setIsLoading(false); setLoadingMsg('');
                      };
                      reader2.readAsDataURL(file);
                    }
                  };
                  input.click();
                }, style: S.btn('#f1f5f9', '#374151', false) }, '📁 Upload File')
              )
            ),

            // Generate mode
            inputMode === 'generate' && e('div', { style: S.card },
              e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px', display: 'block' } }, 'Genre'),
              e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px', marginBottom: '12px' } },
                GENRES.map(function (g) {
                  return e('button', { key: g.id, onClick: function () { setGenGenre(g.id); },
                    style: { padding: '8px', borderRadius: '10px', border: '2px solid ' + (genGenre === g.id ? PURPLE : '#e5e7eb'), background: genGenre === g.id ? LIGHT_PURPLE : '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '11px' }
                  },
                    e('div', { style: { fontWeight: 700, color: genGenre === g.id ? PURPLE : '#374151' } }, g.icon + ' ' + g.label),
                    e('div', { style: { color: '#9ca3af', fontSize: '10px' } }, g.desc)
                  );
                })
              ),
              e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px', display: 'block' } }, 'Custom Instructions (optional)'),
              e('textarea', { value: genPrompt, onChange: function (ev) { setGenPrompt(ev.target.value); },
                placeholder: 'e.g. "A story about a girl who discovers she can talk to animals" or "Set in ancient Egypt with a mystery about a missing artifact"',
                rows: 3, style: Object.assign({}, S.input, { marginBottom: '12px', resize: 'vertical' }),
                'aria-label': 'Story generation instructions' }),
              e('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' } },
                e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151' } }, 'Characters:'),
                [2, 3, 4, 5, 6].map(function (n) {
                  return e('button', { key: n, onClick: function () { setGenCharCount(n); },
                    style: { width: '32px', height: '32px', borderRadius: '50%', border: '2px solid ' + (genCharCount === n ? PURPLE : '#d1d5db'), background: genCharCount === n ? PURPLE : '#fff', color: genCharCount === n ? '#fff' : '#374151', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
                  }, n);
                })
              ),
              // Grade level selector
              e('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' } },
                e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', flexShrink: 0 } }, 'Grade Level:'),
                e('select', { value: genGradeLevel, onChange: function (ev) { setGenGradeLevel(ev.target.value); },
                  style: Object.assign({}, S.input, { flex: 1 }),
                  'aria-label': 'Story grade level'
                },
                  GRADE_OPTIONS.map(function (g) { return e('option', { key: g, value: g }, g); })
                )
              ),
              // Length selector
              e('div', { style: { display: 'flex', gap: '6px', marginBottom: '12px' } },
                e('label', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', flexShrink: 0, paddingTop: '6px' } }, 'Length:'),
                LENGTH_OPTIONS.map(function (lo) {
                  return e('button', { key: lo.id, onClick: function () { setGenLength(lo.id); },
                    'aria-label': lo.label + ' story: ' + lo.words + ' words',
                    style: { flex: 1, padding: '6px 10px', borderRadius: '10px', border: '2px solid ' + (genLength === lo.id ? PURPLE : '#e5e7eb'), background: genLength === lo.id ? LIGHT_PURPLE : '#fff', cursor: 'pointer', textAlign: 'center', fontSize: '11px' }
                  },
                    e('div', { style: { fontWeight: 700, color: genLength === lo.id ? PURPLE : '#374151' } }, lo.label),
                    e('div', { style: { color: '#9ca3af', fontSize: '9px' } }, lo.words + ' words')
                  );
                })
              ),
              e('button', { onClick: generateStory, disabled: isLoading,
                style: S.btn(PURPLE, '#fff', isLoading) }, isLoading ? '⏳ ' + loadingMsg : '✨ Generate Story'),
              sourceText && e('p', { style: { fontSize: '11px', color: '#16a34a', marginTop: '8px', fontWeight: 600 } }, '✅ Story generated! Switch to "Paste Text" tab to review, then click "Create Script".')
            ),

            // Saved scripts
            savedScripts.length > 0 && e('div', { style: Object.assign({}, S.card, { marginTop: '16px' }) },
              e('h4', { style: { fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '📂 Saved Scripts (' + savedScripts.length + ')'),
              e('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' } },
                savedScripts.map(function (s) {
                  return e('button', { key: s.id, onClick: function () { loadScript(s); },
                    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '12px' }
                  },
                    e('span', { style: { fontWeight: 600, color: '#1e293b' } }, s.title),
                    e('span', { style: { color: '#9ca3af', fontSize: '10px' } }, new Date(s.savedAt).toLocaleDateString())
                  );
                })
              )
            )
          ),

          // ═══ VOICE ASSIGNMENT PHASE ═══
          phase === 'assign' && script && e('div', null,
            e('div', { style: { textAlign: 'center', marginBottom: '20px' } },
              e('h3', { style: { fontSize: '20px', fontWeight: 800, color: '#1e293b' } }, '🎤 Assign Voices'),
              e('p', { style: { color: '#64748b', fontSize: '13px' } }, 'Choose a distinct voice for each character. Click preview to hear them.')
            ),
            e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' } },
              script.characters.map(function (ch) {
                return e('div', { key: ch.id, style: { background: '#fff', borderRadius: '14px', padding: '16px', border: '3px solid ' + (ch.color || '#e5e7eb'), boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } },
                  e('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' } },
                    ch.portrait
                      ? e('img', { src: ch.portrait, alt: ch.name, style: { width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid ' + ch.color } })
                      : e('div', { style: { width: '48px', height: '48px', borderRadius: '50%', background: ch.color || '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', fontWeight: 800 } }, ch.name.charAt(0)),
                    e('div', { style: { flex: 1 } },
                      e('div', { style: { fontWeight: 800, fontSize: '14px', color: '#1e293b' } }, ch.name),
                      e('div', { style: { fontSize: '11px', color: '#6b7280' } }, ch.description || '')
                    ),
                    onCallImagen && !ch.portrait && e('button', { onClick: function () { generatePortrait(ch.id); },
                      style: { fontSize: '10px', background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' },
                      'aria-label': 'Generate portrait' }, '🎨')
                  ),
                  e('select', { value: ch.voice || '',
                    onChange: function (ev) {
                      var updated = script.characters.map(function (c) { return c.id === ch.id ? Object.assign({}, c, { voice: ev.target.value }) : c; });
                      setScript(Object.assign({}, script, { characters: updated }));
                    },
                    style: Object.assign({}, S.input, { marginBottom: '6px' }),
                    'aria-label': 'Voice for ' + ch.name
                  },
                    e('option', { value: '' }, '— Select Voice —'),
                    allVoices.map(function (v) { return e('option', { key: v.id, value: v.id }, v.label || v.id); })
                  ),
                  e('button', { onClick: function () {
                    setPreviewingVoice(ch.id);
                    speakLine('Hello, I am ' + ch.name + '.', ch.voice).then(function () { setPreviewingVoice(null); });
                  }, disabled: previewingVoice === ch.id,
                    style: S.btn('#f1f5f9', '#374151', previewingVoice === ch.id)
                  }, previewingVoice === ch.id ? '🔊 Playing...' : '▶ Preview Voice')
                );
              })
            ),
            e('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
              e('button', { onClick: saveScript, style: S.btn('#f1f5f9', '#374151', false) }, '💾 Save Script'),
              e('button', { onClick: function () { setPhase('perform'); setCurrentLine(0); }, style: S.btn(PURPLE, '#fff', false) }, '🎭 Start Performance →')
            )
          ),

          // ═══ PERFORMANCE PHASE ═══
          phase === 'perform' && script && e('div', null,
            // Controls bar
            e('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb' } },
              !isPlaying
                ? e('button', { onClick: function () { playFromLine(currentLine); }, style: S.btn('#22c55e', '#fff', false) }, '▶ Play')
                : e('button', { onClick: stopPlayback, style: S.btn('#ef4444', '#fff', false) }, '⏹ Stop'),
              e('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' } },
                e('span', null, 'Speed:'),
                [0.75, 1, 1.25, 1.5].map(function (spd) {
                  return e('button', { key: spd, onClick: function () { setPlaybackSpeed(spd); },
                    style: { padding: '3px 8px', borderRadius: '6px', border: '1px solid ' + (playbackSpeed === spd ? PURPLE : '#d1d5db'), background: playbackSpeed === spd ? LIGHT_PURPLE : '#fff', color: playbackSpeed === spd ? PURPLE : '#6b7280', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }
                  }, spd + 'x');
                })
              ),
              e('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' } },
                e('span', { style: { fontSize: '11px', color: '#6b7280' } }, 'My Role:'),
                e('select', { value: myRole || '', onChange: function (ev) { setMyRole(ev.target.value || null); },
                  style: { fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db' },
                  'aria-label': 'Select your character role'
                },
                  e('option', { value: '' }, 'Audience (listen only)'),
                  script.characters.filter(function (c) { return c.id !== 'narrator' && c.id !== 'stage'; }).map(function (c) {
                    return e('option', { key: c.id, value: c.id }, '🎤 ' + c.name);
                  })
                )
              ),
              !isRecording
                ? e('button', { onClick: startRecording, style: S.btn('#dc2626', '#fff', false) }, '⏺ Record')
                : e('button', { onClick: stopRecording, style: S.btn('#dc2626', '#fff', false) }, '⏹ Stop Recording'),
              recordingUrl && e('audio', { controls: true, src: recordingUrl, style: { height: '28px', maxWidth: '150px' }, 'aria-label': 'Your recording' }),
              e('button', { onClick: exportScript, style: S.btn('#f1f5f9', '#374151', false) }, '🖨️ Print Script'),
              e('button', { onClick: function () { setPhase('analyze'); }, style: S.btn('#f1f5f9', '#374151', false) }, '📝 Analyze →')
            ),
            // Scene illustration
            sceneImage && e('div', { style: { marginBottom: '12px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' } },
              e('img', { src: sceneImage, alt: 'Scene illustration', style: { width: '100%', maxHeight: '200px', objectFit: 'cover' } })
            ),
            !sceneImage && onCallImagen && e('button', { onClick: generateSceneImage, disabled: sceneImageLoading,
              style: { fontSize: '11px', color: '#6b7280', background: 'none', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '6px 12px', cursor: sceneImageLoading ? 'wait' : 'pointer', marginBottom: '12px', display: 'block' }
            }, sceneImageLoading ? '⏳ Generating scene...' : '🎨 Generate Scene Illustration'),
            // Progress bar
            e('div', { style: { height: '4px', background: '#e5e7eb', borderRadius: '2px', marginBottom: '12px', overflow: 'hidden' } },
              e('div', { style: { height: '100%', width: (script.lines.length > 0 ? Math.round(((currentLine + 1) / script.lines.length) * 100) : 0) + '%', background: 'linear-gradient(90deg, ' + PURPLE + ', #a855f7)', borderRadius: '2px', transition: 'width 0.3s' } })
            ),
            // Script lines
            e('div', { ref: lineContainerRef, style: { maxHeight: '55vh', overflowY: 'auto', padding: '8px' } },
              script.lines.map(function (line, idx) {
                var isCurrent = idx === currentLine;
                var character = script.characters.find(function (c) { return c.id === line.speaker; });
                var isMyLine = myRole && line.speaker === myRole;
                var bgColor = isCurrent ? (isMyLine ? '#fef3c7' : character ? character.color + '15' : '#f0fdf4') : 'transparent';
                var borderColor = isCurrent ? (isMyLine ? '#f59e0b' : character ? character.color : '#22c55e') : 'transparent';
                return e('div', { key: line.id, id: 'ss-line-' + idx,
                  onClick: function () { if (!isPlaying) { setCurrentLine(idx); speakLine(line.text, character ? character.voice : 'Aoede'); } },
                  style: { padding: line.type === 'stage-direction' ? '4px 16px' : '10px 16px', borderLeft: '4px solid ' + borderColor, background: bgColor, borderRadius: '0 8px 8px 0', marginBottom: '4px', cursor: 'pointer', transition: 'all 0.2s', transform: isCurrent ? 'scale(1.01)' : 'scale(1)' }
                },
                  line.type === 'stage-direction'
                    ? e('p', { style: { fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', margin: 0 } }, '[' + line.text + ']')
                    : e('div', null,
                        e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' } },
                          character && character.portrait && e('img', { src: character.portrait, alt: '', style: { width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' } }),
                          e('span', { style: { fontSize: '11px', fontWeight: 800, color: character ? character.color : '#64748b' } },
                            character ? character.name : 'Unknown'),
                          isMyLine && e('span', { style: { fontSize: '9px', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 } }, '🎤 YOUR LINE')
                        ),
                        e('p', { style: { fontSize: line.type === 'narration' ? '13px' : '14px', color: '#1e293b', margin: 0, fontStyle: line.type === 'narration' ? 'italic' : 'normal', lineHeight: 1.6 } }, line.text),
                        // Emotion reaction buttons (visible on current/past lines)
                        (isCurrent || idx < currentLine) && e('div', { style: { display: 'flex', gap: '2px', marginTop: '4px' } },
                          EMOTIONS.map(function (em) {
                            var isSelected = emotionLog[line.id] === em;
                            return e('button', { key: em, onClick: function (ev) { ev.stopPropagation(); setEmotionLog(function (prev) { var n = Object.assign({}, prev); n[line.id] = isSelected ? null : em; return n; }); },
                              style: { fontSize: '14px', padding: '1px 3px', borderRadius: '4px', border: 'none', background: isSelected ? '#fef3c7' : 'transparent', cursor: 'pointer', opacity: isSelected ? 1 : 0.4, transition: 'all 0.1s' },
                              'aria-label': 'React with ' + em, title: 'How does this line make you feel?' }, em);
                          })
                        )
                      )
                );
              })
            )
          ),

          // ═══ ANALYSIS PHASE ═══
          phase === 'analyze' && script && e('div', { style: { maxWidth: '700px', margin: '0 auto' } },
            e('div', { style: { textAlign: 'center', marginBottom: '20px' } },
              e('h3', { style: { fontSize: '20px', fontWeight: 800, color: '#1e293b' } }, '📝 Literary Analysis'),
              e('p', { style: { color: '#64748b', fontSize: '13px' } }, 'Reflect on the story, its characters, and the author\'s craft.')
            ),
            // Standards alignment
            e('div', { style: { marginBottom: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px' } },
              e('div', { style: { fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '6px' } }, '📐 CCSS ELA Standards — Literature (' + getGradeBand() + ')'),
              e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                (CCSS_STANDARDS[getGradeBand()] || []).map(function (std, i) {
                  return e('span', { key: i, style: { fontSize: '9px', background: selectedStandard === std ? '#3b82f6' : '#dbeafe', color: selectedStandard === std ? '#fff' : '#1e40af', padding: '3px 8px', borderRadius: '8px', cursor: 'pointer', border: '1px solid ' + (selectedStandard === std ? '#2563eb' : '#93c5fd'), fontWeight: selectedStandard === std ? 700 : 500 },
                    onClick: function () { setSelectedStandard(selectedStandard === std ? '' : std); } }, std);
                })
              ),
              selectedStandard && e('p', { style: { fontSize: '10px', color: '#1e40af', marginTop: '6px', fontStyle: 'italic' } }, 'Focus your analysis on this standard: ' + selectedStandard)
            ),
            // Emotion summary from performance
            Object.keys(emotionLog).length > 0 && e('div', { style: { marginBottom: '16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px' } },
              e('div', { style: { fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '6px' } }, '🎭 Your Emotional Journey'),
              e('div', { style: { display: 'flex', gap: '3px', flexWrap: 'wrap', fontSize: '18px' } },
                script.lines.map(function (line, i) {
                  var em = emotionLog[line.id];
                  return em ? e('span', { key: i, title: (script.characters.find(function (c) { return c.id === line.speaker; }) || {}).name + ': "' + line.text.substring(0, 40) + '..."', style: { cursor: 'help' } }, em) : null;
                }).filter(Boolean)
              ),
              e('p', { style: { fontSize: '10px', color: '#92400e', marginTop: '6px' } }, 'You reacted to ' + Object.keys(emotionLog).filter(function (k) { return emotionLog[k]; }).length + ' moments in the story. Consider how these emotions connect to the theme.')
            ),
            // Character analysis
            e('div', { style: S.card },
              e('h4', { style: { fontSize: '14px', fontWeight: 700, color: PURPLE, marginBottom: '10px' } }, '👥 Character Analysis'),
              script.characters.filter(function (c) { return c.id !== 'narrator' && c.id !== 'stage'; }).map(function (ch) {
                var key = 'char_' + ch.id;
                return e('div', { key: ch.id, style: { marginBottom: '12px' } },
                  e('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
                    e('span', { style: { width: '12px', height: '12px', borderRadius: '50%', background: ch.color, display: 'inline-block' } }),
                    e('span', { style: { fontSize: '13px', fontWeight: 700, color: '#1e293b' } }, ch.name)
                  ),
                  e('textarea', { value: analysisResponses[key] || '', onChange: function (ev) { setAnalysisResponses(function (prev) { var n = Object.assign({}, prev); n[key] = ev.target.value; return n; }); },
                    placeholder: /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel) ? 'What is ' + ch.name + ' like? How do you know?' : /6th|7th|8th/i.test(gradeLevel) ? 'Describe ' + ch.name + '\'s personality and motivations. Use evidence from the text.' : 'Analyze ' + ch.name + '\'s character arc, motivations, and how they contribute to the theme. Cite specific dialogue or actions.',
                    rows: 2, style: Object.assign({}, S.input, { resize: 'vertical' }),
                    'aria-label': 'Analysis of ' + ch.name })
                );
              })
            ),
            // Theme
            e('div', { style: S.card },
              e('h4', { style: { fontSize: '14px', fontWeight: 700, color: '#059669', marginBottom: '6px' } }, '💡 Theme & Message'),
              e('textarea', { value: analysisResponses.theme || '', onChange: function (ev) { setAnalysisResponses(function (prev) { return Object.assign({}, prev, { theme: ev.target.value }); }); },
                placeholder: /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel) ? 'What is the lesson or big idea of this story?' : /6th|7th|8th/i.test(gradeLevel) ? 'What is the theme of this story? How do the characters and events develop this theme?' : 'Identify the central theme(s). How does the author develop the theme through character, conflict, setting, and symbolism?',
                rows: 3, style: Object.assign({}, S.input, { resize: 'vertical' }),
                'aria-label': 'Theme analysis' })
            ),
            // Literary craft
            script.literaryElements && script.literaryElements.length > 0 && e('div', { style: S.card },
              e('h4', { style: { fontSize: '14px', fontWeight: 700, color: '#d97706', marginBottom: '6px' } }, '✍️ Author\'s Craft'),
              e('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' } },
                script.literaryElements.map(function (el, i) { return e('span', { key: i, style: { fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '8px', border: '1px solid #fde68a' } }, el); })
              ),
              e('textarea', { value: analysisResponses.craft || '', onChange: function (ev) { setAnalysisResponses(function (prev) { return Object.assign({}, prev, { craft: ev.target.value }); }); },
                placeholder: /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel) ? 'What did the author do to make the story interesting or exciting?' : /6th|7th|8th/i.test(gradeLevel) ? 'Choose one literary element from above. Find an example in the story and explain how it affects the reader.' : 'Analyze the author\'s use of the literary elements listed above. How do these choices contribute to meaning, mood, or reader experience? Cite specific passages.',
                rows: 3, style: Object.assign({}, S.input, { resize: 'vertical' }),
                'aria-label': 'Literary craft analysis' })
            ),
            // Personal response
            e('div', { style: S.card },
              e('h4', { style: { fontSize: '14px', fontWeight: 700, color: '#2563eb', marginBottom: '6px' } }, '💬 Personal Response'),
              e('textarea', { value: analysisResponses.personal || '', onChange: function (ev) { setAnalysisResponses(function (prev) { return Object.assign({}, prev, { personal: ev.target.value }); }); },
                placeholder: /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel) ? 'What was your favorite part? How did the story make you feel?' : 'What is your personal response to this text? How does it connect to your own experience, other texts, or the world?',
                rows: 2, style: Object.assign({}, S.input, { resize: 'vertical' }),
                'aria-label': 'Personal response' })
            ),
            // Submit for feedback
            e('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' } },
              e('button', { onClick: getAnalysisFeedback, disabled: analysisFeedback === 'loading' || !Object.values(analysisResponses).some(function (v) { return v && v.trim(); }),
                style: S.btn('#059669', '#fff', analysisFeedback === 'loading' || !Object.values(analysisResponses).some(function (v) { return v && v.trim(); }))
              }, analysisFeedback === 'loading' ? '⏳ Analyzing...' : '✨ Get Feedback'),
              e('button', { onClick: function () { setPhase('perform'); }, style: S.btn('#f1f5f9', '#374151', false) }, '← Back to Performance')
            ),
            // Feedback display
            analysisFeedback && typeof analysisFeedback === 'object' && !analysisFeedback.error && e('div', { style: { marginTop: '16px', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '2px solid #86efac', borderRadius: '14px', padding: '20px' } },
              e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
                e('h4', { style: { fontSize: '15px', fontWeight: 800, color: '#166534' } }, '📝 Literary Analysis Feedback'),
                e('span', { style: { fontSize: '12px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', background: analysisFeedback.overallRating === 'exemplary' ? '#dcfce7' : analysisFeedback.overallRating === 'proficient' ? '#dbeafe' : '#fef3c7', color: analysisFeedback.overallRating === 'exemplary' ? '#166534' : analysisFeedback.overallRating === 'proficient' ? '#1e40af' : '#92400e', border: '1px solid ' + (analysisFeedback.overallRating === 'exemplary' ? '#86efac' : analysisFeedback.overallRating === 'proficient' ? '#93c5fd' : '#fde68a') } },
                  analysisFeedback.overallRating === 'exemplary' ? '⭐ Exemplary' : analysisFeedback.overallRating === 'proficient' ? '✅ Proficient' : '📈 Developing')
              ),
              analysisFeedback.characterInsight && e('div', { style: { background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', border: '1px solid #bbf7d0' } }, e('div', { style: { fontSize: '10px', fontWeight: 700, color: PURPLE, marginBottom: '2px' } }, 'CHARACTERS'), e('p', { style: { fontSize: '13px', color: '#374151', margin: 0 } }, analysisFeedback.characterInsight)),
              analysisFeedback.themeInsight && e('div', { style: { background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', border: '1px solid #bbf7d0' } }, e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#059669', marginBottom: '2px' } }, 'THEME'), e('p', { style: { fontSize: '13px', color: '#374151', margin: 0 } }, analysisFeedback.themeInsight)),
              analysisFeedback.craftInsight && e('div', { style: { background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', border: '1px solid #bbf7d0' } }, e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#d97706', marginBottom: '2px' } }, 'CRAFT'), e('p', { style: { fontSize: '13px', color: '#374151', margin: 0 } }, analysisFeedback.craftInsight)),
              analysisFeedback.strengths && analysisFeedback.strengths.length > 0 && e('div', { style: { marginBottom: '8px' } }, e('div', { style: { fontSize: '11px', fontWeight: 700, color: '#16a34a', marginBottom: '4px' } }, '💪 Strengths'), e('ul', { style: { margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#166534' } }, analysisFeedback.strengths.map(function (s, i) { return e('li', { key: i }, s); }))),
              analysisFeedback.nudges && analysisFeedback.nudges.length > 0 && e('div', null, e('div', { style: { fontSize: '11px', fontWeight: 700, color: '#d97706', marginBottom: '4px' } }, '🤔 Think Deeper'), e('ul', { style: { margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#92400e' } }, analysisFeedback.nudges.map(function (s, i) { return e('li', { key: i }, s); })))
            ),
            analysisFeedback && analysisFeedback.error && e('p', { style: { color: '#dc2626', fontSize: '13px', marginTop: '12px' } }, analysisFeedback.error)
          )
        )
      )
    );
  });

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LitLab = LitLab;
  console.log('[CDN] LitLab module loaded');
})();
