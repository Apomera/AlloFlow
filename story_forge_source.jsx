// ═══════════════════════════════════════════════════════════════
// StoryForge — Scaffolded Creative Writing with AI Illustration,
// Narration, Grading, and Storybook Export
// ═══════════════════════════════════════════════════════════════

// ── WCAG 2.4.7 Focus Visible — inject scoped focus-ring CSS once per page ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-sf-focus-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-sf-focus-css';
  st.textContent = '[data-sf-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
  if (document.head) document.head.appendChild(st);
})();

// ── WCAG 4.1.3 Status Messages — debounced polite-announcer for ephemeral status text ──
let _sfAnnounceTimer = null;
function sfAnnounce(text) {
  if (typeof document === 'undefined') return;
  const lr = document.getElementById('allo-live-storyforge');
  if (!lr) return;
  if (_sfAnnounceTimer) clearTimeout(_sfAnnounceTimer);
  lr.textContent = '';
  _sfAnnounceTimer = setTimeout(() => {
    lr.textContent = String(text || '');
    _sfAnnounceTimer = null;
  }, 25);
}

// ── Utilities ──
const cleanJson = (str) => {
  if (!str) return '{}';
  let s = str.trim();
  const fenceStart = s.indexOf('```');
  if (fenceStart !== -1) {
    const afterFence = s.indexOf('\n', fenceStart);
    const fenceEnd = s.lastIndexOf('```');
    if (afterFence !== -1 && fenceEnd > afterFence) {
      s = s.substring(afterFence + 1, fenceEnd).trim();
    }
  }
  const jsonStart = s.search(/[\[{]/);
  const jsonEndBracket = s.lastIndexOf(']');
  const jsonEndBrace = s.lastIndexOf('}');
  const jsonEnd = Math.max(jsonEndBracket, jsonEndBrace);
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    s = s.substring(jsonStart, jsonEnd + 1);
  }
  return s;
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access denied:', err);
    }
  };
  const stopRecording = () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) return resolve(null);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve({ url, base64, mimeType: 'audio/webm' });
        };
        setIsRecording(false);
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
    });
  };
  return { isRecording, startRecording, stopRecording };
};

// ── Speech-to-text dictation hook ──
const useDictation = (onTranscript, lang) => {
  const [isDictating, setIsDictating] = useState(false);
  const isDictatingRef = useRef(false);
  const recognitionRef = useRef(null);
  const startDictation = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang || 'en-US';
    recognition.onresult = (event) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
      }
      if (final && onTranscript) onTranscript(final);
    };
    recognition.onerror = () => { isDictatingRef.current = false; setIsDictating(false); };
    recognition.onend = () => {
      if (recognitionRef.current && isDictatingRef.current) {
        try { recognitionRef.current.start(); } catch(e) { isDictatingRef.current = false; setIsDictating(false); }
      }
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch(e) { /* already started */ }
    isDictatingRef.current = true;
    setIsDictating(true);
  };
  const stopDictation = () => {
    isDictatingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsDictating(false);
  };
  return { isDictating, startDictation, stopDictation };
};

// ── Reduced motion detection ──
const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mq) {
      setPrefersReduced(mq.matches);
      const handler = (e) => setPrefersReduced(e.matches);
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    }
  }, []);
  return prefersReduced;
};

const LAYOUT_MODES = {
  'prose': { label: 'Prose', emoji: '📄', desc: 'Traditional paragraph layout', writeBg: 'bg-white', writeBorder: 'border-slate-200', accent: 'rose' },
  'comic': { label: 'Comic', emoji: '💬', desc: 'Panel grid with speech bubbles', writeBg: 'bg-slate-50', writeBorder: 'border-slate-800', accent: 'blue' },
  'journal': { label: 'Journal', emoji: '📓', desc: 'Lined notebook diary style', writeBg: 'bg-amber-50', writeBorder: 'border-amber-300', accent: 'amber' },
  'dark': { label: 'Dark', emoji: '🌙', desc: 'Dark mode cyberpunk aesthetic', writeBg: 'bg-slate-900', writeBorder: 'border-slate-600', accent: 'cyan' },
};

const VOICE_POOL = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

const ART_STYLE_MAP = {
  'storybook': 'Soft watercolor storybook illustration, rounded shapes, warm palette, family-friendly, whimsical',
  'pixel': '16-bit pixel art retro game style, vibrant colors, clean sprites, nostalgic',
  'cinematic': 'Cinematic digital painting, dramatic lighting, widescreen composition, photorealistic',
  'anime': 'Anime-style illustration, clean linework, expressive characters, vibrant colors, manga-inspired',
  'crayon': "Children's hand-drawn crayon illustration, simple and colorful, playful, sketchy lines",
};

const GENRE_TEMPLATES = {
  'free': { label: 'Free Write', emoji: '✏️', scaffoldHint: '' },
  'adventure': { label: 'Adventure', emoji: '🗺️', scaffoldHint: 'an exciting adventure story with a quest, obstacles, and a triumphant ending' },
  'mystery': { label: 'Mystery', emoji: '🔍', scaffoldHint: 'a mystery story with clues, a suspect, suspense, and a surprising reveal' },
  'fairy-tale': { label: 'Fairy Tale', emoji: '🏰', scaffoldHint: 'a fairy tale with magical elements, a hero, a villain, and a moral lesson' },
  'sci-fi': { label: 'Sci-Fi', emoji: '🚀', scaffoldHint: 'a science fiction story set in the future or space with technology and discovery' },
  'historical': { label: 'Historical', emoji: '📜', scaffoldHint: 'a historical fiction story set in a real time period with accurate details and a fictional character' },
  'persuasive': { label: 'Persuasive Narrative', emoji: '💬', scaffoldHint: 'a persuasive narrative that argues a point through a character\'s experience and storytelling' },
};

const SAVE_KEY = 'alloflow_storyforge_draft';

// Narrative beat options for the per-paragraph Plot Structure dropdown.
// Empty value means "unset" — students can leave blank.
const PLOT_BEATS = [
  { value: '', label: '— Choose beat —' },
  { value: 'setup', label: 'Setup' },
  { value: 'inciting', label: 'Inciting Incident' },
  { value: 'rising', label: 'Rising Action' },
  { value: 'climax', label: 'Climax' },
  { value: 'falling', label: 'Falling Action' },
  { value: 'resolution', label: 'Resolution' },
];

const STORY_STARTERS = {
  'adventure': [
    'The map had been hidden in the library for a hundred years — until today.',
    'Nobody believed the old bridge led anywhere, but I had to find out.',
    'The compass needle spun wildly, then pointed somewhere no compass should point.',
  ],
  'mystery': [
    'The classroom was empty, but someone had left a coded message on the whiteboard.',
    'Every night at exactly 8:13 PM, the light in the abandoned house flickered on.',
    'The package arrived with no return address — and it was addressed to someone who didn\'t exist.',
  ],
  'fairy-tale': [
    'In a kingdom where music was forbidden, one child hummed a melody that changed everything.',
    'The old tree in the garden spoke only to those who asked the right question.',
    'Once upon a time, a girl found a door in the forest that only appeared on rainy days.',
  ],
  'sci-fi': [
    'The new student at school wasn\'t from another country — they were from another century.',
    'When the power grid went dark, the robots didn\'t shut down. They woke up.',
    'The telescope showed a planet that wasn\'t on any map — and it was getting closer.',
  ],
  'historical': [
    'The year was 1776, and a young apprentice overheard something that could change history.',
    'The ship had been at sea for forty days when they spotted land no explorer had charted.',
    'In the heart of the ancient city, a child discovered a scroll that rewrote everything scholars believed.',
  ],
  'persuasive': [
    'Everyone told Maya her idea was impossible — but she had evidence they hadn\'t seen.',
    'The town council was about to make a decision that would affect every student, and one voice rose to speak.',
    'After what happened at recess, I knew I had to convince my classmates that things needed to change.',
  ],
};

// ── Reading level calculation ──
const computeReadingLevel = (text) => {
  if (!text || text.trim().length < 20) return null;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((sum, word) => {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return sum + 1;
    let count = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').match(/[aeiouy]{1,2}/g);
    return sum + Math.max(1, count ? count.length : 1);
  }, 0);
  if (sentences.length === 0 || words.length === 0) return null;
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  const fkGrade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  return {
    grade: Math.max(0, Math.round(fkGrade * 10) / 10),
    sentences: sentences.length,
    words: words.length,
    syllables,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
  };
};

const PHASES = ['configure', 'write', 'illustrate', 'narrate', 'review', 'export'];
const PHASE_LABELS = ['Setup', 'Write', 'Illustrate', 'Narrate', 'Review', 'Export'];
const LANG_OPTIONS = [
  { code: 'en', label: 'English', bcp47: 'en-US' },
  { code: 'es', label: 'Español', bcp47: 'es-ES' },
  { code: 'fr', label: 'Français', bcp47: 'fr-FR' },
  { code: 'de', label: 'Deutsch', bcp47: 'de-DE' },
  { code: 'pt', label: 'Português', bcp47: 'pt-BR' },
  { code: 'zh', label: '中文', bcp47: 'zh-CN' },
  { code: 'ja', label: '日本語', bcp47: 'ja-JP' },
  { code: 'ko', label: '한국어', bcp47: 'ko-KR' },
  { code: 'ar', label: 'العربية', bcp47: 'ar-SA' },
  { code: 'hi', label: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'vi', label: 'Tiếng Việt', bcp47: 'vi-VN' },
  { code: 'tl', label: 'Filipino', bcp47: 'tl-PH' },
  { code: 'uk', label: 'Українська', bcp47: 'uk-UA' },
  { code: 'ru', label: 'Русский', bcp47: 'ru-RU' },
  { code: 'it', label: 'Italiano', bcp47: 'it-IT' },
  { code: 'pl', label: 'Polski', bcp47: 'pl-PL' },
  { code: 'tr', label: 'Türkçe', bcp47: 'tr-TR' },
  { code: 'th', label: 'ไทย', bcp47: 'th-TH' },
  { code: 'other', label: 'Other…', bcp47: 'en-US' },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const StoryForge = React.memo(({
  isOpen,
  onClose,
  onCallImagen,
  onCallGeminiImageEdit,
  onCallGemini,
  onCallTTS,
  onCallGeminiVision,
  selectedVoice,
  gradeLevel,
  sourceTopic,
  glossaryTerms,
  addToast,
  t: tFunc,
  isCanvasEnv,
  liveSession,
  // ── Resource integration props ──
  initialConfig,        // Pre-loaded storyforge-config from teacher assignment
  onSaveConfig,         // Callback to save config as resource: (configObj) => void
  onSaveSubmission,     // Callback to save completed story as resource: (submissionObj) => void
  lessonResources,      // Array of available lesson resources for "Import from Lesson"
  codename,             // Student codename (e.g., "Bright Tiger") — used instead of real name
  onAnalyzeFluency,     // Optional: (audioBase64, mimeType, referenceText) => Promise<result> — ORF analysis
}) => {
  // ── Safe translate ──
  const t = tFunc || ((k) => k);

  // ── Phase state ──
  const [phase, setPhase] = useState('configure');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Configure state ──
  const [storyTitle, setStoryTitle] = useState('');
  const authorName = codename || 'Creative Writer';
  const [genre, setGenre] = useState('free');
  const [vocabTerms, setVocabTerms] = useState([]);
  const [artStyle, setArtStyle] = useState('storybook');
  const [customArtStyle, setCustomArtStyle] = useState('');
  const [storyPrompt, setStoryPrompt] = useState('');
  const [rubricText, setRubricText] = useState('');
  const [minParagraphs] = useState(3);
  const [maxParagraphs] = useState(8);

  // ── Write state ──
  const [paragraphs, setParagraphs] = useState([{ id: 'p-0', text: '', scaffoldFrame: '', plotBeat: '' }]);
  const [scaffoldsGenerated, setScaffoldsGenerated] = useState(false);
  const [helpMeResult, setHelpMeResult] = useState(null);
  const [helpMeParagraphIdx, setHelpMeParagraphIdx] = useState(-1);
  const [layoutMode, setLayoutMode] = useState('prose');
  const [dictatingParagraphIdx, setDictatingParagraphIdx] = useState(-1);
  const [focusMode, setFocusMode] = useState(false);
  const [focusParagraphIdx, setFocusParagraphIdx] = useState(0);
  const [language, setLanguage] = useState('en');
  const [customLanguage, setCustomLanguage] = useState('');
  const [hasExported, setHasExported] = useState(false);

  // ── Writing timer ──
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDuration, setTimerDuration] = useState(300); // 5 min default
  const timerRef = useRef(null);

  // ── Revision tracking ──
  const [revisionSnapshot, setRevisionSnapshot] = useState(null);

  // ── Grammar/style checker ──
  const [grammarResults, setGrammarResults] = useState({}); // keyed by paragraph id
  const [grammarLoading, setGrammarLoading] = useState(false);

  // ── XP & Streaks ──
  const XP_KEY = 'alloflow_storyforge_xp';
  const LEVELS = [
    { name: 'Apprentice', min: 0, emoji: '✏️' },
    { name: 'Storyteller', min: 50, emoji: '📖' },
    { name: 'Author', min: 150, emoji: '📚' },
    { name: 'Master Author', min: 300, emoji: '🏅' },
    { name: 'Legend', min: 500, emoji: '👑' },
  ];
  const [xpData, setXpData] = useState(() => {
    try {
      const saved = localStorage.getItem(XP_KEY);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return { totalXP: 0, streak: 0, lastWriteDate: null, xpLog: [] };
  });

  const awardXP = (amount, reason) => {
    setXpData(prev => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let streak = prev.streak;
      if (prev.lastWriteDate === yesterday) streak += 1;
      else if (prev.lastWriteDate !== today) streak = 1;
      const updated = { totalXP: prev.totalXP + amount, streak, lastWriteDate: today, xpLog: [...(prev.xpLog || []).slice(-20), { amount, reason, date: today }] };
      try { localStorage.setItem(XP_KEY, JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
  };

  const currentLevel = useMemo(() => {
    const lvl = [...LEVELS].reverse().find(l => xpData.totalXP >= l.min);
    return lvl || LEVELS[0];
  }, [xpData.totalXP]);

  const nextLevel = useMemo(() => {
    const idx = LEVELS.findIndex(l => l.name === currentLevel.name);
    return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  }, [currentLevel]);

  // ── Image refinement ──
  const [imageEditState, setImageEditState] = useState(null); // { paragraphId, prompt }

  // ── Comic panel stickers + dialogue/thought/narration per panel ──
  const [panelStickers, setPanelStickers] = useState({});
  const [panelDialogue, setPanelDialogue] = useState({}); // keyed by paragraph id: { speaker, speech, thought, narration }
  const updatePanelDialogue = (pId, field, value) => {
    setPanelDialogue(prev => ({ ...prev, [pId]: { ...(prev[pId] || {}), [field]: value } }));
  };

  // ── Illustrate state ──
  const [illustrations, setIllustrations] = useState({});
  const [coverArt, setCoverArt] = useState(null);
  const [coverArtLoading, setCoverArtLoading] = useState(false);
  const characterPortraitRef = useRef(null);

  // ── Ref for async loops (prevents stale closure over paragraphs) ──
  const paragraphsRef = useRef(paragraphs);
  useEffect(() => { paragraphsRef.current = paragraphs; }, [paragraphs]);

  // ── Narrate state ──
  const [characters, setCharacters] = useState([]);
  const [audioSegments, setAudioSegments] = useState({});
  const [playbackIdx, setPlaybackIdx] = useState(-1);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const audioRef = useRef(null);
  const recorder = useAudioRecorder();
  const [recordingParagraphId, setRecordingParagraphId] = useState(null);

  // ── Sentence splitter for karaoke narration ──
  const splitSentences = (text) => {
    if (!text) return [''];
    // Split on sentence-ending punctuation followed by space or end of string
    // Handles: "Dr. Smith said hello." correctly by not splitting on "Dr."
    const raw = text.match(/[^.!?]*[.!?]+[\s]?|[^.!?]+$/g);
    if (!raw) return [text.trim()];
    return raw.map(s => s.trim()).filter(s => s.length > 0);
  };

  // ── Narration voice ──
  const [narratorVoice, setNarratorVoice] = useState(selectedVoice || 'Puck');

  // ── ORF Fluency Reading ──
  const [fluencyReadingId, setFluencyReadingId] = useState(null);
  const [fluencyResult, setFluencyResult] = useState(null);
  const [fluencyRecording, setFluencyRecording] = useState(false);
  const fluencyRecorderRef = useRef(null);
  const fluencyChunksRef = useRef([]);

  const startFluencyReading = async (paragraphId) => {
    if (!onAnalyzeFluency) { if (addToast) addToast('Fluency analysis not available in this mode', 'info'); return; }
    setFluencyReadingId(paragraphId);
    setFluencyResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      fluencyRecorderRef.current = new MediaRecorder(stream);
      fluencyChunksRef.current = [];
      fluencyRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) fluencyChunksRef.current.push(e.data); };
      fluencyRecorderRef.current.start();
      setFluencyRecording(true);
    } catch (err) {
      console.warn('Microphone access denied:', err);
      setFluencyReadingId(null);
    }
  };

  const stopFluencyReading = async (paragraphId, text) => {
    if (!fluencyRecorderRef.current) return;
    setFluencyRecording(false);
    return new Promise((resolve) => {
      fluencyRecorderRef.current.onstop = async () => {
        const blob = new Blob(fluencyChunksRef.current, { type: 'audio/webm' });
        fluencyRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          if (addToast) addToast('Analyzing your reading...', 'info');
          try {
            const result = await onAnalyzeFluency(base64, 'audio/webm', text);
            if (result) {
              setFluencyResult({ paragraphId, ...result });
              awardXP(8, 'Fluency practice');
              if (result.confidence?.overall >= 7 && addToast) addToast('Great reading! Check your results below.', 'success');
            }
          } catch (err) {
            console.warn('Fluency analysis failed:', err);
            if (addToast) addToast('Analysis failed — try again with clearer audio', 'error');
          }
          setFluencyReadingId(null);
          resolve();
        };
      };
      fluencyRecorderRef.current.stop();
    });
  };

  // ── Handwriting Capture ──
  const [hwPenmanshipOn, setHwPenmanshipOn] = useState(false);
  const [hwLoading, setHwLoading] = useState(false);
  const [hwResult, setHwResult] = useState(null);
  const [hwTargetParagraph, setHwTargetParagraph] = useState(null); // which paragraph index to fill

  const handleHandwritingCapture = (e, paragraphIdx) => {
    const file = e.target.files?.[0];
    if (!file || !onCallGeminiVision) return;
    e.target.value = '';
    setHwLoading(true);
    setHwTargetParagraph(paragraphIdx);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const mimeType = file.type || 'image/png';
      const showPenmanship = hwPenmanshipOn;
      const gl = gradeLevel || '5th Grade';

      let prompt = 'You are an expert at reading student handwriting.\n\n' +
        'TASK 1 — TRANSCRIBE: Extract ALL handwritten text from this image exactly as written. ' +
        'Preserve the student\'s original wording, spelling, and punctuation �� do NOT correct anything. ' +
        'If text is unclear, make your best guess and note uncertainty with [?].\n\n';

      if (showPenmanship) {
        prompt += 'TASK 2 — PENMANSHIP EVALUATION:\n' +
          'This student is in ' + gl + '.\n' +
          'CRITICAL: Score relative to what is EXPECTED at ' + gl + ' level, NOT against adult writing.\n' +
          'Score these areas (each 0-25, total 0-100):\n' +
          '- LETTER FORMATION (0-25): Are letters shaped correctly for this grade level?\n' +
          '- SPACING (0-25): Appropriate space between words?\n' +
          '- ALIGNMENT (0-25): Writing follows the line? Consistent baseline?\n' +
          '- NEATNESS (0-25): Overall legibility? Clean strokes?\n\n' +
          'Be encouraging and grade-appropriate.\n\n' +
          'Return ONLY JSON:\n' +
          '{"text":"the transcribed handwriting exactly as written",' +
          '"penmanship":{"score":0-100,' +
          '"letterFormation":0-25,"spacing":0-25,"alignment":0-25,"neatness":0-25,' +
          '"strengths":"1-2 specific things done well",' +
          '"tips":"1-2 encouraging suggestions for improvement",' +
          '"legibility":"easy|moderate|difficult"}}';
      } else {
        prompt += 'Return ONLY JSON:\n{"text":"the transcribed handwriting exactly as written"}';
      }

      try {
        const result = await onCallGeminiVision(prompt, base64, mimeType);
        let parsed;
        try {
          parsed = JSON.parse(cleanJson(result));
        } catch {
          parsed = { text: result.trim() };
        }
        if (parsed.text && paragraphIdx != null) {
          updateParagraph(paragraphIdx, parsed.text);
        }
        setHwResult(parsed);
        setHwLoading(false);
        if (addToast) addToast('✍️ Handwriting converted!' + (parsed.penmanship ? ' Penmanship: ' + parsed.penmanship.score + '/100' : ''), 'success');
      } catch {
        setHwLoading(false);
        if (addToast) addToast('Could not read handwriting — try a clearer photo', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Unsaved changes guard ──
  const [isDirty, setIsDirty] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const safeClose = () => {
    if (isDirty && paragraphs.some(p => p.text.trim().length > 0)) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // ── Advanced config collapse ──
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // ── Image prompt preview/edit state ──
  const [promptPreview, setPromptPreview] = useState(null); // { paragraphId, text, idx, prompt }

  // ── Phase content ref for focus management ──
  const phaseContentRef = useRef(null);

  // ── Accessibility ──
  const prefersReducedMotion = useReducedMotion();
  const animClass = prefersReducedMotion ? '' : 'animate-in fade-in duration-300';

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      // Stop any active dictation
      if (dictation.isDictating) dictation.stopDictation();
      // Stop any active recording
      if (recorder.isRecording) recorder.stopRecording();
      // Revoke object URLs from audio segments
      Object.values(audioSegments).forEach(seg => {
        if (seg?.studentAudioUrl && seg.studentAudioUrl.startsWith('blob:')) {
          try { URL.revokeObjectURL(seg.studentAudioUrl); } catch(e) {}
        }
      });
    };
  }, []);

  // ── Dictation ──
  const langLabel = language === 'other' ? customLanguage : (LANG_OPTIONS.find(l => l.code === language)?.label || 'English');
  const langBcp47 = language === 'other' ? 'en-US' : (LANG_OPTIONS.find(l => l.code === language)?.bcp47 || 'en-US');
  const langInstruction = language !== 'en' ? `\nIMPORTANT: Respond entirely in ${langLabel}. All text output must be in ${langLabel}.` : '';

  const dictation = useDictation((transcript) => {
    if (dictatingParagraphIdx >= 0 && dictatingParagraphIdx < paragraphs.length) {
      setParagraphs(prev => prev.map((p, i) => {
        if (i !== dictatingParagraphIdx) return p;
        const spacer = p.text.length > 0 && !p.text.endsWith(' ') ? ' ' : '';
        return { ...p, text: p.text + spacer + transcript };
      }));
    }
  }, langBcp47);

  const toggleDictation = (idx) => {
    if (dictation.isDictating) {
      dictation.stopDictation();
      setDictatingParagraphIdx(-1);
      sfAnnounce('Dictation stopped');
    } else {
      setDictatingParagraphIdx(idx);
      dictation.startDictation();
      sfAnnounce(`Dictation started for paragraph ${idx + 1}`);
    }
  };

  // ── Review state ──
  const [gradingResult, setGradingResult] = useState(null);
  // Senses Check (sensory imagery audit, ported from PoetTree)
  const [sensesResult, setSensesResult] = useState(null);
  const [sensesLoading, setSensesLoading] = useState(false);
  // Pre-grade Self-Assessment — student rates self before AI grade for metacognition
  const [selfAssessment, setSelfAssessment] = useState({});
  const [selfAssessmentSubmitted, setSelfAssessmentSubmitted] = useState(false);
  // Mentor Match — Serper-grounded recommendation of a public-domain short-story excerpt
  const [mentorMatch, setMentorMatch] = useState(null);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [draftCount, setDraftCount] = useState(1);

  // ── Init vocab from glossary ──
  useEffect(() => {
    if (glossaryTerms && glossaryTerms.length > 0 && vocabTerms.length === 0) {
      setVocabTerms(glossaryTerms.map(g => ({
        term: g.term || g.word || '',
        definition: g.def || g.definition || '',
      })).filter(v => v.term));
    }
  }, [glossaryTerms]);

  // ── Vocab usage tracking ──
  const vocabUsage = useMemo(() => {
    const fullText = paragraphs.map(p => p.text).join(' ').toLowerCase();
    const usage = {};
    vocabTerms.forEach(v => {
      usage[v.term] = fullText.includes(v.term.toLowerCase());
    });
    return usage;
  }, [paragraphs, vocabTerms]);

  const vocabUsedCount = useMemo(() => Object.values(vocabUsage).filter(Boolean).length, [vocabUsage]);
  const totalWords = useMemo(() => paragraphs.reduce((sum, p) => sum + p.text.trim().split(/\s+/).filter(Boolean).length, 0), [paragraphs]);

  // ── Reading level ──
  const readingLevel = useMemo(() => {
    const fullText = paragraphs.map(p => p.text).join(' ');
    return computeReadingLevel(fullText);
  }, [paragraphs]);

  // ── Per-paragraph stats ──
  const paragraphStats = useMemo(() => paragraphs.map(p => {
    const words = p.text.trim().split(/\s+/).filter(Boolean);
    const sentences = p.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const pVocab = vocabTerms.filter(v => p.text.toLowerCase().includes(v.term.toLowerCase()));
    return { wordCount: words.length, sentenceCount: sentences.length, vocabUsed: pVocab.length };
  }), [paragraphs, vocabTerms]);

  // ── Word frequency analysis (for Review phase) ──
  const wordFrequency = useMemo(() => {
    const fullText = paragraphs.map(p => p.text).join(' ');
    const words = fullText.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/).filter(w => w.length > 3);
    const stopWords = new Set(['that','this','with','from','your','have','they','been','their','were','will','would','could','should','about','which','there','these','those','than','what','when','then','into','also','very','just','more','some','only','over','such','after','other','like','most','each','made','them','does','many','much','well','back','even','here','come','make','good','know','take','said','much']);
    const freq = {};
    words.forEach(w => { if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [paragraphs]);

  const overusedWords = useMemo(() => wordFrequency.filter(([, count]) => count >= 4).map(([word]) => word), [wordFrequency]);

  // ── Sentence variety analysis ──
  const sentenceVariety = useMemo(() => paragraphs.map(p => {
    const sentences = p.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 3) return { varied: true, issues: [] };
    const issues = [];
    // Check repeated sentence starters
    const starters = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase());
    const starterCounts = {};
    starters.forEach(s => { if (s) starterCounts[s] = (starterCounts[s] || 0) + 1; });
    const repeated = Object.entries(starterCounts).filter(([, c]) => c >= 3).map(([w]) => w);
    if (repeated.length > 0) issues.push(`Sentences often start with "${repeated[0]}" — try varying your openings`);
    // Check sentence length uniformity
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const allSimilar = lengths.every(l => Math.abs(l - avgLen) < 3);
    if (allSimilar && sentences.length >= 3) issues.push('Sentences are similar length — mix short punchy ones with longer descriptive ones');
    return { varied: issues.length === 0, issues };
  }), [paragraphs]);

  // ── Character name consistency check ──
  const characterIssues = useMemo(() => {
    if (characters.length === 0) return [];
    const issues = [];
    const fullText = paragraphs.map(p => p.text).join(' ');
    const words = fullText.split(/\s+/);
    const charNames = characters.map(c => c.name.toLowerCase());
    // Find capitalized words that are close to character names but not exact
    const capitalWords = [...new Set(words.filter(w => w[0] && w[0] === w[0].toUpperCase() && w.length > 2).map(w => w.replace(/[^a-zA-Z]/g, '')))];
    capitalWords.forEach(word => {
      if (!word || word.length < 3) return;
      const wLower = word.toLowerCase();
      charNames.forEach(name => {
        if (wLower === name) return; // exact match, fine
        if (wLower.length < 3 || name.length < 3) return;
        // Simple Levenshtein-ish: same first letter, similar length, off by 1-2 chars
        if (wLower[0] === name[0] && Math.abs(wLower.length - name.length) <= 2) {
          let diff = 0;
          for (let i = 0; i < Math.min(wLower.length, name.length); i++) {
            if (wLower[i] !== name[i]) diff++;
          }
          diff += Math.abs(wLower.length - name.length);
          if (diff > 0 && diff <= 2) {
            issues.push({ found: word, expected: characters.find(c => c.name.toLowerCase() === name)?.name, });
          }
        }
      });
    });
    return issues;
  }, [paragraphs, characters]);

  // ── Transition words ──
  const TRANSITIONS = ['Furthermore,', 'Meanwhile,', 'However,', 'Suddenly,', 'After that,', 'In addition,', 'As a result,', 'Eventually,', 'On the other hand,', 'Despite this,', 'Soon after,', 'At the same time,', 'In contrast,', 'Therefore,', 'Finally,'];
  const suggestTransition = (idx) => {
    if (idx === 0) return null;
    const prevText = paragraphs[idx - 1]?.text || '';
    const currText = paragraphs[idx]?.text || '';
    if (currText.length > 0) return null; // don't suggest if already writing
    const hasConflict = prevText.toLowerCase().match(/but|however|though|although|yet/);
    const hasAction = prevText.toLowerCase().match(/ran|jumped|shouted|grabbed|rushed|fell|crashed/);
    if (hasAction) return 'Suddenly,';
    if (hasConflict) return 'Despite this,';
    if (idx === paragraphs.length - 1) return 'Finally,';
    return TRANSITIONS[idx % TRANSITIONS.length];
  };

  // ── Writing timer ──
  useEffect(() => {
    if (timerActive && timerSeconds < timerDuration) {
      timerRef.current = setTimeout(() => setTimerSeconds(s => s + 1), 1000);
      return () => clearTimeout(timerRef.current);
    } else if (timerSeconds >= timerDuration && timerActive) {
      setTimerActive(false);
      if (addToast) addToast('Writing sprint complete!', 'success');
    }
  }, [timerActive, timerSeconds, timerDuration]);

  const startTimer = (minutes) => {
    setTimerDuration(minutes * 60);
    setTimerSeconds(0);
    setTimerActive(true);
  };

  const formatTime = (secs) => {
    const remaining = Math.max(0, timerDuration - secs);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) { safeClose(); e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isOpen) {
        e.preventDefault();
        try {
          const draft = { storyTitle, genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText, paragraphs, scaffoldsGenerated, draftCount, phase, language };
          localStorage.setItem(SAVE_KEY, JSON.stringify(draft));
          setIsDirty(false);
          if (addToast) addToast('Draft saved!', 'success');
        } catch(err) {
          if (addToast) addToast('Could not save draft \u2014 browser storage may be full. Export your story as JSON to avoid losing work!', 'error');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, storyTitle, genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText, paragraphs, scaffoldsGenerated, draftCount, phase, language]);

  // ── Auto-save to localStorage ──
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const draft = { storyTitle, genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText, paragraphs, scaffoldsGenerated, draftCount, phase, language };
        localStorage.setItem(SAVE_KEY, JSON.stringify(draft));
      } catch (e) { /* localStorage full or unavailable */ }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [storyTitle, genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText, paragraphs, scaffoldsGenerated, phase, draftCount, language]);

  // ── Load saved draft on mount ──
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const savedDraftRef = useRef(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.paragraphs && data.paragraphs.some(p => p.text.trim().length > 0)) {
          savedDraftRef.current = data;
          setShowRestorePrompt(true);
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  const restoreDraft = () => {
    const d = savedDraftRef.current;
    if (!d) return;
    if (d.storyTitle) setStoryTitle(d.storyTitle);
    if (d.genre) setGenre(d.genre);
    if (d.vocabTerms) setVocabTerms(d.vocabTerms);
    if (d.artStyle) setArtStyle(d.artStyle);
    if (d.customArtStyle) setCustomArtStyle(d.customArtStyle);
    if (d.storyPrompt) setStoryPrompt(d.storyPrompt);
    if (d.rubricText) setRubricText(d.rubricText);
    if (d.paragraphs) setParagraphs(d.paragraphs);
    if (d.scaffoldsGenerated) setScaffoldsGenerated(true);
    if (d.draftCount) setDraftCount(d.draftCount);
    if (d.phase) setPhase(d.phase);
    if (d.language) setLanguage(d.language);
    setShowRestorePrompt(false);
    if (addToast) addToast('Draft restored!', 'success');
    sfAnnounce('Draft restored');
  };

  const discardDraft = () => {
    localStorage.removeItem(SAVE_KEY);
    savedDraftRef.current = null;
    setShowRestorePrompt(false);
  };

  // ── Load initial config from teacher assignment ──
  useEffect(() => {
    if (initialConfig && initialConfig.vocabTerms) {
      if (initialConfig.storyTitle) setStoryTitle(initialConfig.storyTitle);
      if (initialConfig.genre) setGenre(initialConfig.genre);
      if (initialConfig.vocabTerms) setVocabTerms(initialConfig.vocabTerms);
      if (initialConfig.artStyle) setArtStyle(initialConfig.artStyle);
      if (initialConfig.customArtStyle) setCustomArtStyle(initialConfig.customArtStyle);
      if (initialConfig.storyPrompt) setStoryPrompt(initialConfig.storyPrompt);
      if (initialConfig.rubricText) setRubricText(initialConfig.rubricText);
      if (initialConfig.language) setLanguage(initialConfig.language);
      if (initialConfig.minParagraphs) {
        setParagraphs(Array.from({ length: initialConfig.minParagraphs }, (_, i) => ({ id: `p-${i}`, text: '', scaffoldFrame: '', plotBeat: '' })));
      }
      if (addToast) addToast('Assignment loaded from teacher!', 'success');
    }
  }, [initialConfig]);

  // ── Save as teacher assignment (config resource) ──
  const saveAsConfig = () => {
    if (!onSaveConfig) return;
    const config = {
      storyTitle: storyTitle || sourceTopic || 'Story Assignment',
      genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText, language,
      minParagraphs: paragraphs.length,
      maxParagraphs: 8,
      scaffoldsGenerated,
      scaffoldFrames: scaffoldsGenerated ? paragraphs.map(p => p.scaffoldFrame).filter(Boolean) : [],
    };
    onSaveConfig(config);
    if (addToast) addToast('StoryForge assignment saved to lesson!', 'success');
  };

  // ── Save completed story as submission resource ──
  const saveAsSubmission = () => {
    if (!onSaveSubmission) return;
    const submission = {
      storyTitle: storyTitle || 'My Story',
      authorName: authorName || 'Student',
      genre, language, vocabTerms,
      paragraphs: paragraphs.map(p => ({ id: p.id, text: p.text, scaffoldFrame: p.scaffoldFrame })),
      illustrations: Object.fromEntries(
        Object.entries(illustrations).filter(([, v]) => v?.imageUrl).map(([k, v]) => [k, { imageUrl: v.imageUrl }])
      ),
      coverArt,
      gradingResult,
      analytics: {
        totalWords, vocabUsedCount, vocabTotal: vocabTerms.length,
        readingLevel: readingLevel ? { grade: readingLevel.grade } : null,
        draftCount,
      },
      achievements: achievements.filter(a => a.earned).map(a => a.name),
      xp: { totalXP: xpData.totalXP, level: currentLevel.name },
    };
    onSaveSubmission(submission);
    if (addToast) addToast('Story saved to your portfolio!', 'success');
    awardXP(10, 'Saved story to portfolio');
  };

  // ── Import from lesson resources ──
  const importFromResource = (resource) => {
    if (!resource) return;
    if (resource.type === 'glossary') {
      const terms = resource.data?.terms || resource.data || [];
      if (Array.isArray(terms) && terms.length > 0) {
        setVocabTerms(terms.map(g => ({ term: g.term || g.word || '', definition: g.def || g.definition || '' })).filter(v => v.term));
        if (addToast) addToast(`Imported ${terms.length} glossary terms!`, 'success');
      }
    } else if (resource.type === 'simplified') {
      const text = typeof resource.data === 'string' ? resource.data : resource.data?.originalText || '';
      if (text) {
        setStoryPrompt('Write a creative story inspired by this text: ' + text.substring(0, 300));
        if (addToast) addToast('Imported topic from reading passage!', 'success');
      }
    } else if (resource.type === 'sentence-frames') {
      const frames = typeof resource.data === 'string' ? resource.data.split('\n').filter(Boolean) : [];
      if (frames.length > 0) {
        setParagraphs(frames.slice(0, 8).map((f, i) => ({ id: `p-${i}`, text: '', scaffoldFrame: f.replace(/^[\d.)\-\s]+/, '').trim(), plotBeat: '' })));
        setScaffoldsGenerated(true);
        if (addToast) addToast(`Imported ${frames.length} scaffold frames!`, 'success');
      }
    } else if (resource.type === 'lesson-plan') {
      const planText = typeof resource.data === 'string' ? resource.data : '';
      if (planText) {
        setStoryPrompt(planText.substring(0, 500));
        if (addToast) addToast('Imported lesson plan as story prompt!', 'success');
      }
    } else if (resource.type === 'timeline') {
      const timelineText = typeof resource.data === 'string' ? resource.data : '';
      if (timelineText) {
        const events = timelineText.split('\n').filter(l => l.trim().length > 10).slice(0, 8);
        setParagraphs(events.map((e, i) => ({ id: `p-${i}`, text: '', scaffoldFrame: e.trim(), plotBeat: '' })));
        setScaffoldsGenerated(true);
        if (addToast) addToast(`Imported ${events.length} timeline events as scaffolds!`, 'success');
      }
    }
  };

  // ── Phase navigation with focus management ──
  const phaseIdx = PHASES.indexOf(phase);
  const canGoNext = () => {
    if (phase === 'configure') return vocabTerms.length > 0;
    if (phase === 'write') return paragraphs.some(p => p.text.trim().length >= 20);
    return true;
  };
  const changePhase = (newPhase) => {
    setPhase(newPhase);
    // Move focus to phase content area for screen readers
    setTimeout(() => {
      if (phaseContentRef.current) {
        phaseContentRef.current.focus();
        phaseContentRef.current.scrollTop = 0;
      }
    }, 100);
  };
  const goNext = () => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) changePhase(PHASES[idx + 1]);
  };
  const goBack = () => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) changePhase(PHASES[idx - 1]);
  };

  // ═══════════════════════════════════════════════════════════
  // CONFIGURE PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const [newTerm, setNewTerm] = useState('');
  const [newDef, setNewDef] = useState('');

  const addVocabTerm = () => {
    if (!newTerm.trim()) return;
    const t = newTerm.trim();
    setVocabTerms(prev => [...prev, { term: t, definition: newDef.trim() }]);
    setNewTerm('');
    setNewDef('');
    sfAnnounce(`Term added: ${t}`);
  };

  const removeVocabTerm = (idx) => {
    const removed = vocabTerms[idx];
    setVocabTerms(prev => prev.filter((_, i) => i !== idx));
    if (removed) sfAnnounce(`Term removed: ${removed.term}`);
  };

  // ═══════════════════════════════════════════════════════════
  // WRITE PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const updateParagraph = (idx, text) => {
    setParagraphs(prev => prev.map((p, i) => i === idx ? { ...p, text } : p));
    if (!isDirty) setIsDirty(true);
  };

  const updateParagraphBeat = (idx, beat) => {
    setParagraphs(prev => prev.map((p, i) => i === idx ? { ...p, plotBeat: beat } : p));
    if (!isDirty) setIsDirty(true);
  };

  const addParagraph = () => {
    if (paragraphs.length >= maxParagraphs) return;
    const newId = `p-${Date.now()}`;
    setParagraphs(prev => [...prev, { id: newId, text: '', scaffoldFrame: '', plotBeat: '' }]);
    if (!isDirty) setIsDirty(true);
    // Auto-scroll to new paragraph after render
    setTimeout(() => {
      const el = document.getElementById('sf-para-' + newId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const removeParagraph = (idx) => {
    if (paragraphs.length <= 1) return;
    setParagraphs(prev => prev.filter((_, i) => i !== idx));
  };

  const moveParagraph = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= paragraphs.length) return;
    setParagraphs(prev => {
      const arr = [...prev];
      const temp = arr[idx];
      arr[idx] = arr[newIdx];
      arr[newIdx] = temp;
      return arr;
    });
  };

  const generateScaffolds = async () => {
    if (!onCallGemini) return;
    setIsProcessing(true);
    try {
      const genreHint = GENRE_TEMPLATES[genre]?.scaffoldHint;
      const prompt = `You are helping a ${gradeLevel || '5th grade'} student write a creative story about "${sourceTopic || 'a topic of their choice'}".
Required vocabulary terms the student must use: ${vocabTerms.map(v => v.term).join(', ')}.
${storyPrompt ? `Story theme/prompt: "${storyPrompt}"` : ''}
${genreHint ? `Genre: Write ${genreHint}.` : ''}

Generate exactly ${Math.max(minParagraphs, paragraphs.length)} paragraph scaffold frames (opening sentences that guide the student through a narrative arc: beginning, middle, end).
Each frame should naturally encourage using 1-2 of the vocabulary terms.
Frame 1 should set the scene. The middle frames should develop conflict/action. The last frame should resolve the story.
${langInstruction}
Return ONLY JSON: { "frames": ["Frame 1 text...", "Frame 2 text...", ...] }`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      if (data.frames && Array.isArray(data.frames)) {
        const newParagraphs = data.frames.map((frame, i) => ({
          id: paragraphs[i]?.id || `p-${Date.now()}-${i}`,
          text: paragraphs[i]?.text || '',
          scaffoldFrame: frame,
        }));
        setParagraphs(newParagraphs);
        setScaffoldsGenerated(true);
        if (addToast) addToast('Scaffold frames generated!', 'success');
        awardXP(5, 'Generated scaffolds');
      }
    } catch (err) {
      console.warn('Scaffold generation failed:', err);
      if (addToast) addToast('Failed to generate scaffolds', 'error');
    }
    setIsProcessing(false);
  };

  // ── Help Me Write — AI coaching per paragraph ──
  const helpMeWrite = async (idx) => {
    if (!onCallGemini) return;
    setHelpMeParagraphIdx(idx);
    setHelpMeResult(null);
    const p = paragraphs[idx];
    const prevContext = paragraphs.slice(0, idx).map(pp => pp.text).join('\n');
    const unusedTerms = vocabTerms.filter(v => !vocabUsage[v.term]).map(v => v.term);
    try {
      const prompt = `You are a helpful writing coach for a ${gradeLevel || '5th grade'} student.
They are writing paragraph ${idx + 1} of a creative story about "${sourceTopic || 'their topic'}".
${GENRE_TEMPLATES[genre]?.scaffoldHint ? `Genre: ${GENRE_TEMPLATES[genre].label}` : ''}
${p.scaffoldFrame ? `Scaffold frame: "${p.scaffoldFrame}"` : ''}
${prevContext ? `Story so far:\n"""${prevContext.substring(0, 800)}"""` : ''}
${p.text ? `Their current draft for this paragraph:\n"""${p.text}"""` : 'They have not started this paragraph yet.'}
${unusedTerms.length > 0 ? `Unused vocabulary they still need to include: ${unusedTerms.join(', ')}` : 'All vocabulary terms have been used.'}

Give 3 brief, encouraging suggestions to help them write or improve this paragraph. Each should be 1-2 sentences max. Be specific and actionable, not generic. If they haven't started, help them get started. If they have text, help them make it stronger.
${langInstruction}
Return ONLY JSON: { "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"] }`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      setHelpMeResult(data.suggestions || []);
    } catch (err) {
      console.warn('Help Me Write failed:', err);
      setHelpMeResult(['Try starting with a strong action verb.', 'Describe what the character sees, hears, or feels.', `Try using the word "${unusedTerms[0] || vocabTerms[0]?.term || 'your vocabulary term'}" in this paragraph.`]);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // GRAMMAR / STYLE CHECKER + SHOW DON'T TELL
  // ═══════════════════════════════════════════════════════════

  const checkGrammarAndStyle = async () => {
    if (!onCallGemini) return;
    setGrammarLoading(true);
    try {
      const fullText = paragraphs.map((p, i) => `[P${i + 1}] ${p.text}`).join('\n\n');
      const prompt = `You are an expert writing coach for a ${gradeLevel || '5th grade'} student. Analyze this creative story for:
1. Grammar and spelling errors
2. Weak or vague verbs (e.g., "walked" → "strolled", "said" → "whispered")
3. Passive voice that could be active
4. "Telling" instead of "showing" (e.g., "She was sad" → "Her shoulders slumped and she stared at the floor")
5. Sentence variety issues (repeated starters, monotonous rhythm)

Story:
"""
${fullText}
"""
${langInstruction}
For each issue found, specify which paragraph it's in. Be encouraging — frame suggestions positively. Max 3 issues per paragraph, max 15 total. Only flag genuine improvements, not style preferences.

Return ONLY JSON:
{
  "paragraphs": {
    "P1": [{"type": "grammar|weak_verb|passive|show_dont_tell|variety", "original": "the problematic phrase", "suggestion": "improved version", "tip": "brief friendly explanation"}],
    "P2": [...]
  },
  "overallTip": "One encouraging overall writing tip"
}`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      const results = {};
      if (data.paragraphs) {
        paragraphs.forEach((p, i) => {
          const key = `P${i + 1}`;
          if (data.paragraphs[key] && data.paragraphs[key].length > 0) {
            results[p.id] = data.paragraphs[key];
          }
        });
      }
      setGrammarResults({ ...results, _overallTip: data.overallTip || '' });
      awardXP(5, 'Checked writing style');
      if (addToast) addToast('Writing check complete!', 'success');
    } catch (err) {
      console.warn('Grammar check failed:', err);
      if (addToast) addToast('Writing check failed — try again', 'error');
    }
    setGrammarLoading(false);
  };

  // ═══════════════════════════════════════════════════════════
  // ILLUSTRATE PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const getStyleDesc = () => {
    if (artStyle === 'custom' && customArtStyle) return customArtStyle;
    return ART_STYLE_MAP[artStyle] || ART_STYLE_MAP['storybook'];
  };

  const generateImagePrompt = async (paragraphId, text, idx) => {
    if (!onCallGemini) return;
    const style = getStyleDesc();
    const promptResult = await onCallGemini(
      `Given this paragraph from a student's creative story:\n"${text.substring(0, 500)}"\n\nWrite a concise image generation prompt (max 80 words) that captures the key visual scene described. Focus on the setting, characters, and action. Do NOT include any text, words, or letters in the image.\nArt style: ${style}.\nReturn ONLY the image prompt text, nothing else.`
    );
    const imgPrompt = promptResult.trim() + ' STRICTLY NO TEXT, NO LABELS, NO WORDS IN THE IMAGE.';
    setPromptPreview({ paragraphId, text, idx, prompt: imgPrompt });
  };

  const confirmIllustration = async (customPrompt) => {
    if (!promptPreview || !onCallImagen) return;
    const { paragraphId, idx } = promptPreview;
    const imgPrompt = customPrompt || promptPreview.prompt;
    setPromptPreview(null);
    setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: true } }));
    try {
      const style = getStyleDesc();
      let imageUrl = await onCallImagen(imgPrompt, 400, 0.8);

      if (imageUrl && characterPortraitRef.current && idx > 0 && onCallGeminiImageEdit) {
        try {
          const rawBase64 = imageUrl.split(',')[1];
          const refined = await onCallGeminiImageEdit(
            `Refine this illustration to maintain consistent character appearance with the reference. ${style}. Remove any text or labels.`,
            rawBase64, 400, 0.8, characterPortraitRef.current
          );
          if (refined) imageUrl = refined;
        } catch (e) { /* consistency pass is best-effort */ }
      }

      if (imageUrl && idx === 0 && !characterPortraitRef.current) {
        characterPortraitRef.current = imageUrl.split(',')[1];
      }

      setIllustrations(prev => ({ ...prev, [paragraphId]: { imageUrl, prompt: imgPrompt, isLoading: false } }));
    } catch (err) {
      console.warn('Illustration failed:', err);
      setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: false, error: true } }));
      if (addToast) addToast('Illustration generation failed', 'error');
    }
  };

  const illustrateParagraph = async (paragraphId, text, idx) => {
    if (!onCallImagen || !onCallGemini) return;
    setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: true } }));
    try {
      const style = getStyleDesc();
      const promptResult = await onCallGemini(
        `Given this paragraph from a student's creative story:\n"${text.substring(0, 500)}"\n\nWrite a concise image generation prompt (max 80 words) that captures the key visual scene described. Focus on the setting, characters, and action. Do NOT include any text, words, or letters in the image.\nArt style: ${style}.\nReturn ONLY the image prompt text, nothing else.`
      );
      const imgPrompt = promptResult.trim() + ' STRICTLY NO TEXT, NO LABELS, NO WORDS IN THE IMAGE.';
      let imageUrl = await onCallImagen(imgPrompt, 400, 0.8);

      if (imageUrl && characterPortraitRef.current && idx > 0 && onCallGeminiImageEdit) {
        try {
          const rawBase64 = imageUrl.split(',')[1];
          const refined = await onCallGeminiImageEdit(
            `Refine this illustration to maintain consistent character appearance with the reference. ${style}. Remove any text or labels.`,
            rawBase64, 400, 0.8, characterPortraitRef.current
          );
          if (refined) imageUrl = refined;
        } catch (e) { /* consistency pass is best-effort */ }
      }

      if (imageUrl && idx === 0 && !characterPortraitRef.current) {
        characterPortraitRef.current = imageUrl.split(',')[1];
      }

      setIllustrations(prev => ({ ...prev, [paragraphId]: { imageUrl, prompt: imgPrompt, isLoading: false } }));
    } catch (err) {
      console.warn('Illustration failed:', err);
      setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: false, error: true } }));
      if (addToast) addToast('Illustration generation failed', 'error');
    }
  };

  const illustrateAll = async () => {
    setIsProcessing(true);
    const current = paragraphsRef.current;
    for (let i = 0; i < current.length; i++) {
      const p = current[i];
      if (p.text.trim().length >= 20 && !illustrations[p.id]?.imageUrl) {
        await illustrateParagraph(p.id, p.text, i);
        if (i < current.length - 1) await new Promise(r => setTimeout(r, 500));
      }
    }
    setIsProcessing(false);
    if (addToast) addToast('All illustrations generated!', 'success');
    awardXP(10, 'Illustrated all paragraphs');
  };

  const regenerateIllustration = async (paragraphId, text, idx) => {
    // Save previous image for undo
    setIllustrations(prev => ({
      ...prev,
      [paragraphId]: { ...prev[paragraphId], previousImageUrl: prev[paragraphId]?.imageUrl }
    }));
    setIllustrations(prev => ({ ...prev, [paragraphId]: { previousImageUrl: prev[paragraphId]?.previousImageUrl, isLoading: true } }));
    await illustrateParagraph(paragraphId, text, idx);
  };

  const undoIllustration = (paragraphId) => {
    setIllustrations(prev => {
      const current = prev[paragraphId];
      if (!current?.previousImageUrl) return prev;
      return { ...prev, [paragraphId]: { ...current, imageUrl: current.previousImageUrl, previousImageUrl: null } };
    });
  };

  // ── Student-directed image refinement ──
  const refineIllustration = async (paragraphId, editPrompt) => {
    if (!onCallGeminiImageEdit) { if (addToast) addToast('Image editing not available', 'error'); return; }
    const current = illustrations[paragraphId];
    if (!current?.imageUrl) return;
    setImageEditState(null);
    setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], previousImageUrl: prev[paragraphId]?.imageUrl, isLoading: true } }));
    try {
      const rawBase64 = current.imageUrl.split(',')[1];
      const style = getStyleDesc();
      const refined = await onCallGeminiImageEdit(
        `${editPrompt}. Maintain the ${style} art style. Do NOT add any text, words, or labels to the image.`,
        rawBase64, 400, 0.8
      );
      if (refined) {
        setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], imageUrl: refined, prompt: editPrompt, isLoading: false } }));
        awardXP(3, 'Refined illustration');
      } else {
        setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: false } }));
        if (addToast) addToast('Refinement didn\'t produce changes — try a different prompt', 'error');
      }
    } catch (err) {
      console.warn('Image refinement failed:', err);
      setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: false } }));
      if (addToast) addToast('Image refinement failed', 'error');
    }
  };

  const generateCoverArt = async () => {
    if (!onCallImagen || !onCallGemini) return;
    setCoverArtLoading(true);
    try {
      const style = getStyleDesc();
      const title = storyTitle || sourceTopic || 'My Story';
      const storySnippet = paragraphs.map(p => p.text).join(' ').substring(0, 300);
      const promptResult = await onCallGemini(
        `Create a book cover image prompt for a story titled "${title}". Story excerpt: "${storySnippet}". Art style: ${style}. The image should be a dramatic, eye-catching book cover scene that captures the story's essence. Do NOT include any text, title, or words in the image — just the visual scene. Max 80 words. Return ONLY the image prompt text.`
      );
      const imgPrompt = promptResult.trim() + ' STRICTLY NO TEXT, NO TITLE, NO WORDS IN THE IMAGE. Book cover composition.';
      const imageUrl = await onCallImagen(imgPrompt, 400, 0.9);
      if (imageUrl) setCoverArt(imageUrl);
    } catch (err) {
      console.warn('Cover art generation failed:', err);
      if (addToast) addToast('Cover art generation failed', 'error');
    }
    setCoverArtLoading(false);
  };

  // ═══════════════════════════════════════════════════════════
  // NARRATE PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const detectCharacters = async () => {
    if (!onCallGemini) return;
    setIsProcessing(true);
    try {
      const fullText = paragraphs.map(p => p.text).join('\n\n');
      const result = await onCallGemini(
        `Analyze this student story and identify all named characters (not "the narrator" or generic pronouns). If there are no named characters, return an empty array.\nStory:\n"""${fullText}"""${langInstruction}\nReturn ONLY JSON: { "characters": [{"name": "CharName", "description": "brief 5-word personality/role description"}] }`,
        true
      );
      const data = JSON.parse(cleanJson(result));
      const chars = (data.characters || []).map(c => {
        const hash = c.name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return { ...c, voice: VOICE_POOL[hash % VOICE_POOL.length] };
      });
      setCharacters(chars);
    } catch (err) {
      console.warn('Character detection failed:', err);
    }
    setIsProcessing(false);
  };

  const narrateParagraph = async (paragraphId, text) => {
    if (!onCallTTS) return;
    setAudioSegments(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], aiLoading: true } }));
    try {
      const nVoice = narratorVoice || selectedVoice || 'Puck';
      const sentences = splitSentences(text);
      const sentenceAudios = [];

      // Generate TTS for each sentence individually
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (sentence.trim().length === 0) { sentenceAudios.push(null); continue; }
        try {
          const audioUrl = await onCallTTS(sentence, nVoice, 0.9);
          sentenceAudios.push(audioUrl);
        } catch (e) {
          console.warn('Sentence TTS failed for:', sentence, e);
          sentenceAudios.push(null);
        }
      }

      // Store sentence-level audio + first sentence as the legacy aiAudioUrl for backward compat
      setAudioSegments(prev => ({
        ...prev,
        [paragraphId]: {
          ...prev[paragraphId],
          aiAudioUrl: sentenceAudios[0] || null,
          sentenceAudios: sentenceAudios,
          sentences: sentences,
          aiLoading: false
        }
      }));
    } catch (err) {
      console.warn('Narration failed:', err);
      setAudioSegments(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], aiLoading: false } }));
    }
  };

  const narrateAll = async () => {
    setIsProcessing(true);
    const current = paragraphsRef.current;
    for (const p of current) {
      if (p.text.trim().length > 0 && !audioSegments[p.id]?.aiAudioUrl) {
        await narrateParagraph(p.id, p.text);
      }
    }
    setIsProcessing(false);
    if (addToast) addToast('Narration complete!', 'success');
    awardXP(10, 'Narrated story');
  };

  const startRecordingParagraph = async (paragraphId) => {
    setRecordingParagraphId(paragraphId);
    await recorder.startRecording();
  };

  const stopRecordingParagraph = async () => {
    const result = await recorder.stopRecording();
    if (result && recordingParagraphId) {
      setAudioSegments(prev => ({
        ...prev,
        [recordingParagraphId]: {
          ...prev[recordingParagraphId],
          studentAudioUrl: result.url,
          studentAudioBase64: result.base64,
        }
      }));
    }
    setRecordingParagraphId(null);
  };

  // ── Playback (sentence-level with paragraph chaining) ──
  useEffect(() => {
    if (playbackIdx < 0 || playbackIdx >= paragraphs.length) return;
    const pid = paragraphs[playbackIdx].id;
    const seg = audioSegments[pid];

    // Sentence-level audio available?
    if (seg?.sentenceAudios && seg.sentenceAudios.length > 0) {
      const safeIdx = Math.min(sentenceIdx, seg.sentenceAudios.length - 1);
      const src = seg.sentenceAudios[safeIdx];
      if (src && audioRef.current) {
        audioRef.current.src = src;
        audioRef.current.play().catch(() => {});
        return;
      }
      // This sentence has no audio — skip to next
      if (safeIdx < seg.sentenceAudios.length - 1) {
        setSentenceIdx(safeIdx + 1);
      } else {
        // End of paragraph — advance
        if (playbackIdx < paragraphs.length - 1) { setPlaybackIdx(playbackIdx + 1); setSentenceIdx(0); }
        else { setPlaybackIdx(-1); setSentenceIdx(0); }
      }
      return;
    }

    // Fallback: student recording or single paragraph audio
    const src = seg?.studentAudioUrl || seg?.aiAudioUrl;
    if (src && audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.play().catch(() => {});
    } else {
      // No audio for this paragraph — skip
      if (playbackIdx < paragraphs.length - 1) { setPlaybackIdx(playbackIdx + 1); setSentenceIdx(0); }
      else { setPlaybackIdx(-1); setSentenceIdx(0); }
    }
  }, [playbackIdx, sentenceIdx, paragraphs, audioSegments]);

  const handleAudioEnded = () => {
    if (playbackIdx < 0 || playbackIdx >= paragraphs.length) { setPlaybackIdx(-1); setSentenceIdx(0); return; }
    const pid = paragraphs[playbackIdx].id;
    const seg = audioSegments[pid];

    // If sentence-level audio: advance to next sentence within paragraph
    if (seg?.sentenceAudios && seg.sentenceAudios.length > 0) {
      if (sentenceIdx < seg.sentenceAudios.length - 1) {
        setSentenceIdx(sentenceIdx + 1);
        return;
      }
    }
    // End of paragraph — advance to next paragraph
    if (playbackIdx < paragraphs.length - 1) { setPlaybackIdx(playbackIdx + 1); setSentenceIdx(0); }
    else { setPlaybackIdx(-1); setSentenceIdx(0); }
  };

  // ═══════════════════════════════════════════════════════════
  // REVIEW PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const gradeStory = async () => {
    if (!onCallGemini) return;
    setIsProcessing(true);
    try {
      const fullText = paragraphs.map((p, i) => `[Paragraph ${i + 1}] ${p.text}`).join('\n\n');
      const vocabReport = vocabTerms.map(v => {
        const ft = paragraphs.map(p => p.text).join(' ').toLowerCase();
        const used = ft.includes(v.term.toLowerCase());
        const sample = paragraphs.find(p => p.text.toLowerCase().includes(v.term.toLowerCase()))?.text.substring(0, 100) || null;
        return { term: v.term, used, contextSample: sample };
      });

      const defaultRubric = `| Criteria | 1 - Beginning | 3 - Developing | 5 - Exemplary |
|----------|---------------|----------------|---------------|
| Vocabulary Usage | Few required terms used | Some terms used correctly | All terms used accurately in context |
| Story Structure | No clear beginning/middle/end | Partial narrative arc | Complete narrative arc with resolution |
| Creativity & Detail | Minimal description | Some descriptive language | Vivid, engaging descriptions |
| Grammar & Mechanics | Many errors | Some errors | Few or no errors |`;

      const prompt = `You are a fair and encouraging teacher grading a creative writing assignment.
Target Audience: ${gradeLevel || '5th grade'} students.
Topic: "${sourceTopic || 'Creative Story'}"
This is draft #${draftCount}.

Required Vocabulary Terms: ${vocabTerms.map(v => `${v.term} (${v.definition})`).join('; ')}
Vocabulary Usage Report: ${JSON.stringify(vocabReport)}

Rubric:
"""
${rubricText || defaultRubric}
"""

Student Story:
"""
${fullText}
"""

Task:
1. Evaluate against each rubric criterion. Assign a score for each (X/5).
2. Check that required vocabulary terms are used correctly in context (not just mentioned randomly).
3. Give a total score.
4. Provide 2 specific Glow compliments and 1 specific Grow suggestion. Be encouraging.
${langInstruction}
Return ONLY JSON:
{
  "scores": [{"criteria": "Name", "score": "X/5", "comment": "Brief justification"}],
  "totalScore": "X/20",
  "vocabScores": [{"term": "word", "status": "correct|partial|missing", "comment": "How it was used or what's missing"}],
  "feedback": {"glow": "Two specific compliments...", "grow": "One specific suggestion..."}
}`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      setGradingResult(data);
      if (addToast) addToast('Feedback ready!', 'success');
      awardXP(15, 'Got AI feedback');
    } catch (err) {
      console.warn('Grading failed:', err);
      if (addToast) addToast('Grading failed — try again', 'error');
    }
    setIsProcessing(false);
  };

  const reviseStory = () => {
    // Save snapshot of current draft for delta comparison
    setRevisionSnapshot({ words: totalWords, vocabUsed: vocabUsedCount, paragraphCount: paragraphs.length, grade: readingLevel?.grade || null });
    setDraftCount(d => d + 1);
    setGradingResult(null);
    setSelfAssessment({});
    setSelfAssessmentSubmitted(false);
    setSensesResult(null);
    setMentorMatch(null);
    changePhase('write');
  };

  // ── Mentor Match: pair the student's story with a public-domain master excerpt ──
  // Same proven pattern as PoetTree (commit 574767a):
  //   1. Gemini extracts 3-5 keywords from the student's draft
  //   2. WebSearchProvider (Serper → SearXNG → DDG) fetches real PD candidates
  //   3. Gemini picks the best mentor, anchored to a real sourceUrl
  // Anti-fabrication: hard-restricts to authors-died-pre-1929 + traditional/anonymous;
  // uncertain flag asks Gemini to skip text rather than invent.
  const findMentorStory = async () => {
    if (!onCallGemini) return;
    const fullText = paragraphs.map(p => p.text.trim()).filter(Boolean).join('\n\n');
    if (fullText.length < 80) {
      if (addToast) addToast('Write a bit more before finding a mentor', 'info');
      return;
    }
    setMentorLoading(true);
    setMentorMatch(null);
    try {
      // Stage 1 — extract keywords
      let keywords = '';
      try {
        const queryPrompt = `Extract 3-5 keywords from this story draft that would help find a similar PUBLIC-DOMAIN master short story online. Focus on concrete images, themes, setting, character archetype, and emotional tone, not function words. Return JSON: {"keywords":["...","..."]}\n\nStory:\n"""\n${fullText.slice(0, 2400)}\n"""`;
        const queryResult = await onCallGemini(queryPrompt, true);
        const queryParsed = JSON.parse(cleanJson(queryResult));
        keywords = (queryParsed.keywords || []).slice(0, 5).join(' ');
      } catch (e) { console.warn('Mentor keyword extract failed:', e && e.message); }

      // Stage 2 — Serper-grounded web search for real PD short fiction
      let searchContext = '';
      let searchResults = [];
      if (window.WebSearchProvider && keywords) {
        try {
          const genreLabel = GENRE_TEMPLATES[genre]?.label || '';
          const searchQuery = `${keywords} ${genreLabel ? genreLabel + ' ' : ''}famous public domain short story excerpt gutenberg`;
          sfAnnounce('Searching for similar master stories…');
          const searchResult = await window.WebSearchProvider.search(searchQuery, 8);
          if (searchResult && searchResult.results && searchResult.results.length > 0) {
            searchResults = searchResult.results.slice(0, 8);
            searchContext = '\n\nWeb search results for similar public-domain short fiction. Treat these as your candidate set — strongly prefer suggesting a story from this list because the URL anchors the recommendation in something the student can actually read. Reject results that are clearly behind a paywall, modern (post-1929), or not actually fiction (e.g. study guides, summaries).\n\n'
              + searchResults.map((r, i) =>
                `${i + 1}. ${r.title || 'Untitled'}\n   URL: ${r.url || r.link || ''}\n   ${String(r.snippet || '').slice(0, 220)}`
              ).join('\n\n');
          }
        } catch (e) {
          console.warn('Mentor web search failed, falling back to Gemini-only:', e && e.message);
        }
      }

      // Stage 3 — Gemini picks the best mentor, ideally from the real results
      const genreLabel = GENRE_TEMPLATES[genre]?.label || 'creative';
      const targetGrade = gradeLevel || '5th grade';
      const prompt = `You are a writing mentor for a ${targetGrade} student. Pair their story with ONE public-domain master short-story excerpt that they could study alongside their own work.

Student story (${genreLabel}):
"""
${fullText}
"""${searchContext}

CRITICAL anti-fabrication rules:
- ONLY suggest authors who died before 1929 (US PD-safe), anonymous traditional folk tales, or canonical translations of pre-modern works (Aesop, Grimm Brothers, Hans Christian Andersen, Andrew Lang fairy tale collections, etc.).
- Safe bets by genre: Adventure → Twain, Stevenson, Conan Doyle (early), Kipling (early). Mystery → Poe, Conan Doyle (early). Fairy tale → Grimms, Andersen, Lang. Sci-fi → H.G. Wells, Jules Verne. Historical → Hawthorne, Dickens. Persuasive → Aesop's fables.
${searchContext ? '- Strongly prefer one of the search results above. Include its URL in "sourceUrl".\n' : ''}- Choose ONE short, vivid excerpt (40-150 words), not a summary. If you cannot supply an exact attributed excerpt, set "uncertain":true and LEAVE THE TEXT FIELD BLANK — describe the story in prose. Never fabricate.

Return JSON:
{
  "mentor": {
    "title": "<title>",
    "author": "<author>",
    "year": <number or null>,
    "text": "<exact excerpt with line breaks as \\\\n; BLANK if uncertain>",
    "sourceUrl": "<URL from search results, or null>",
    "uncertain": false
  },
  "sharedTheme": "<one sentence on what your two stories share — image, conflict, character type, mood>",
  "craftToBorrow": "<one specific craft move from the master worth trying — sentence rhythm, dialogue tag, sensory detail, etc.>",
  "studentEcho": "<where the student is already doing something similar, with a quoted phrase from their own story>"
}

Match register and reading level to a ${targetGrade} student. Be specific, be honest, never invent.`;

      const result = await onCallGemini(prompt, true);
      const parsed = JSON.parse(cleanJson(result));
      parsed._grounding = { searchUsed: searchResults.length > 0, resultCount: searchResults.length, keywords: keywords };
      setMentorMatch(parsed);
      if (addToast) addToast('Mentor story found!', 'success');
      sfAnnounce('Mentor story found: ' + (parsed.mentor && parsed.mentor.title) + ' by ' + (parsed.mentor && parsed.mentor.author) + (searchResults.length > 0 ? ' — verified via web search.' : '.'));
      awardXP(8, 'Studied a mentor text');
    } catch (err) {
      console.warn('Mentor match failed:', err && err.message);
      setMentorMatch({ error: "Couldn't find a mentor story right now. Try again in a moment." });
      if (addToast) addToast('Mentor search failed — try again', 'error');
    }
    setMentorLoading(false);
  };

  // ── Senses & Imagery Checker (ported from PoetTree, retargeted for prose) ──
  const checkSenses = async () => {
    if (!onCallGemini) return;
    const fullText = paragraphs.map(p => p.text.trim()).filter(Boolean).join('\n\n');
    if (fullText.length < 30) {
      if (addToast) addToast('Write a bit more before checking senses', 'info');
      return;
    }
    setSensesLoading(true);
    try {
      const prompt = `You are a writing coach analyzing sensory imagery in a student's story.

Story:
"""
${fullText}
"""

Count concrete sensory details across all paragraphs combined for each of these categories:
- sight (visual descriptions: color, shape, light)
- sound (heard things: noises, voices, music, silence)
- smell (scents, odors)
- taste (flavors, textures in the mouth)
- touch (physical textures, temperature, pressure on skin)
- motion (movement, kinesthetic action)
- emotion (named feelings: fear, joy, embarrassment)

Then identify the strongest sense (most-used) and the weakest/missing sense (under-used).
Offer ONE specific, kind, concrete revision suggestion that names a paragraph and a sense ("In paragraph 3, what does the bedroom actually smell like?").

Return ONLY JSON in this shape:
{
  "counts": {"sight": N, "sound": N, "smell": N, "taste": N, "touch": N, "motion": N, "emotion": N},
  "strongest": "sight",
  "missing": "smell",
  "suggestion": "Specific, concrete revision tip naming a paragraph and a sense."
}`;
      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      setSensesResult(data);
      if (addToast) addToast('Senses check ready!', 'success');
      sfAnnounce('Senses check complete. Strongest sense: ' + (data.strongest || 'unknown') + '. Missing: ' + (data.missing || 'unknown'));
      awardXP(5, 'Used senses checker');
    } catch (err) {
      console.warn('Senses check failed:', err);
      if (addToast) addToast('Senses check failed — try again', 'error');
    }
    setSensesLoading(false);
  };

  // Pull criteria names out of the rubric markdown table; fall back to defaults.
  const getRubricCriteria = () => {
    const fallback = ['Vocabulary Usage', 'Story Structure', 'Creativity & Detail', 'Grammar & Mechanics'];
    const text = rubricText || '';
    if (!text.trim()) return fallback;
    const rows = text.split('\n').filter(l => l.includes('|') && !/^\s*\|?\s*-{3,}/.test(l));
    const names = rows
      .map(r => r.split('|').map(s => s.trim()).filter(Boolean)[0])
      .filter(n => n && n.toLowerCase() !== 'criteria' && !/^[-:]+$/.test(n));
    return names.length >= 2 ? names.slice(0, 6) : fallback;
  };

  // ═══════════════════════════════════════════════════════════
  // EXPORT PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const exportStorybook = () => {
    const title = escapeHtml(storyTitle || storyPrompt || sourceTopic || 'My Story');
    const author = escapeHtml(authorName || 'A Creative Student');
    const date = new Date().toLocaleDateString();
    const styleDesc = getStyleDesc();

    setHasExported(true);
    awardXP(20, 'Exported storybook');

    let chaptersHtml = '';
    const isComic = layoutMode === 'comic';
    if (isComic) chaptersHtml += '<div class="comic-grid">';
    paragraphs.forEach((p, idx) => {
      const img = illustrations[p.id]?.imageUrl;
      const audio = audioSegments[p.id];
      const safeText = escapeHtml(p.text);
      if (isComic) {
        // Pull dialogue/sticker overlay data — these were rendered in-app but previously dropped on export.
        const panel = panelDialogue[p.id] || {};
        const safeSpeaker = panel.speaker ? escapeHtml(panel.speaker) : '';
        const safeSpeech = panel.speech ? escapeHtml(panel.speech) : '';
        const safeThought = panel.thought ? escapeHtml(panel.thought) : '';
        const safeSfx = panel.sfx ? escapeHtml(panel.sfx) : '';
        const sticker = panelStickers[p.id] || '';
        chaptersHtml += `<article class="panel" aria-label="Comic panel ${idx + 1}">`;
        if (img) chaptersHtml += `<div class="panel-img-wrap">`;
        if (img) chaptersHtml += `<img src="${img}" class="panel-img" loading="lazy" alt="Comic panel ${idx + 1} illustration" />`;
        if (img && safeSfx) chaptersHtml += `<span class="sfx-tag" aria-label="Sound effect: ${safeSfx}">${safeSfx}</span>`;
        if (img && sticker) chaptersHtml += `<span class="panel-sticker" aria-hidden="true">${escapeHtml(sticker)}</span>`;
        if (img) chaptersHtml += `</div>`;
        if (safeSpeech) {
          chaptersHtml += `<div class="dialogue-bubble">`;
          if (safeSpeaker) chaptersHtml += `<div class="dialogue-speaker">${safeSpeaker}:</div>`;
          chaptersHtml += `<div class="dialogue-speech">${safeSpeech}</div>`;
          chaptersHtml += `</div>`;
        }
        if (safeThought) chaptersHtml += `<div class="thought-bubble" aria-label="Inner thought">💭 ${safeThought}</div>`;
        chaptersHtml += `<div class="speech-bubble panel-caption">${safeText.length > 200 ? safeText.substring(0, 200) + '...' : safeText.replace(/\n/g, '<br/>')}</div>`;
        chaptersHtml += `</article>`;
      } else {
        chaptersHtml += `<article class="chapter" aria-label="Paragraph ${idx + 1}">`;
        if (img) chaptersHtml += `<img src="${img}" class="scene-img" loading="lazy" alt="Illustration for paragraph ${idx + 1}" />`;
        const beatLabel = (PLOT_BEATS.find(b => b.value === p.plotBeat) || {}).label;
        if (beatLabel && p.plotBeat) {
          chaptersHtml += `<div class="beat-label" aria-label="Narrative beat: ${escapeHtml(beatLabel)}">${escapeHtml(beatLabel)}</div>`;
        }
        chaptersHtml += `<p class="story-text">${safeText.replace(/\n/g, '<br/>')}</p>`;
        if (audio?.studentAudioBase64) {
          chaptersHtml += `<audio controls src="data:audio/webm;base64,${audio.studentAudioBase64}" style="width:100%;margin-top:8px;" aria-label="Audio narration for paragraph ${idx + 1}"></audio>`;
        }
        chaptersHtml += `</article>`;
        if (idx < paragraphs.length - 1) chaptersHtml += `<div class="separator" aria-hidden="true">&mdash;</div>`;
      }
    });
    if (isComic) chaptersHtml += '</div>';

    let vocabHtml = '<div class="vocab-section"><h2 id="vocab-heading">Vocabulary Terms Used</h2><div class="vocab-grid">';
    vocabTerms.forEach(v => {
      const used = vocabUsage[v.term];
      vocabHtml += `<div class="vocab-chip ${used ? 'used' : 'unused'}">${used ? '✓' : '✗'} ${escapeHtml(v.term)}</div>`;
    });
    vocabHtml += '</div></div>';

    let feedbackHtml = '';
    if (gradingResult) {
      feedbackHtml = `<div class="feedback-section">
        <h2 id="feedback-heading">Teacher Feedback</h2>
        <div class="score-badge" aria-label="Score: ${escapeHtml(gradingResult.totalScore || '')}">${escapeHtml(gradingResult.totalScore || '')}</div>
        <div class="glow-grow">
          <div class="glow"><strong>✨ Glow:</strong> ${escapeHtml(gradingResult.feedback?.glow || '')}</div>
          <div class="grow"><strong>🌱 Grow:</strong> ${escapeHtml(gradingResult.feedback?.grow || '')}</div>
        </div>
      </div>`;
    }

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<meta name="author" content="${author}">
<meta name="description" content="A storybook by ${author}, made with StoryForge.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
.skip-link{position:absolute;left:-9999px;top:0;padding:8px 14px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700}
.skip-link:focus{left:0;top:0;z-index:1000}
body{font-family:Georgia,'Times New Roman',serif;line-height:1.8;color:#1e293b;max-width:800px;margin:0 auto;padding:40px 20px;background:#fefce8}
main{display:block}
.cover{text-align:center;padding:60px 20px;border:4px double #d4af37;border-radius:12px;margin-bottom:40px;background:linear-gradient(135deg,#fffbeb,#fef3c7)}
.cover h1{font-size:2.5em;color:#92400e;margin-bottom:8px}
.cover .meta{color:#78716c;font-size:0.9em;font-style:italic}
.chapter{margin:30px 0;padding:20px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #d4af37}
.scene-img{width:100%;max-width:600px;display:block;margin:0 auto 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1)}
.story-text{font-size:1.1em;text-indent:2em}
.beat-label{display:inline-block;font-size:0.7em;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#4338ca;background:#eef2ff;border:1px solid #c7d2fe;padding:3px 10px;border-radius:999px;margin-bottom:10px}
.separator{text-align:center;color:#d4af37;font-size:1.5em;margin:20px 0}
.vocab-section{margin-top:40px;padding:20px;background:#f0fdf4;border-radius:12px;border:2px solid #bbf7d0}
.vocab-section h3{color:#166534;margin-bottom:12px}
.vocab-grid{display:flex;flex-wrap:wrap;gap:8px}
.vocab-chip{padding:4px 12px;border-radius:20px;font-size:0.85em;font-weight:bold}
.vocab-chip.used{background:#dcfce7;color:#166534;border:1px solid #86efac}
.vocab-chip.unused{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5}
.feedback-section{margin-top:30px;padding:20px;background:#eff6ff;border-radius:12px;border:2px solid #bfdbfe}
.feedback-section h3{color:#1e40af;margin-bottom:12px}
.score-badge{display:inline-block;background:#4f46e5;color:white;padding:4px 16px;border-radius:20px;font-weight:bold;margin-bottom:12px}
.glow-grow{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.glow{background:#f0fdf4;padding:12px;border-radius:8px;border:1px solid #bbf7d0;font-size:0.9em}
.grow{background:#fffbeb;padding:12px;border-radius:8px;border:1px solid #fde68a;font-size:0.9em}
.colophon{text-align:center;margin-top:40px;color:#475569;font-size:0.8em;padding-top:20px;border-top:1px solid #e5e7eb}
.print-btn{position:fixed;top:16px;right:16px;padding:8px 20px;background:#4f46e5;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:0.9em;box-shadow:0 2px 8px rgba(79,70,229,0.3);z-index:100}
.print-btn:hover{background:#4338ca}
.print-btn:focus{outline:3px solid #fbbf24;outline-offset:2px}
.comic-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:20px;background:#1e293b;border-radius:8px}
.panel{background:white;border:3px solid #0f172a;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;position:relative}
.panel-img-wrap{position:relative}
.panel-img{width:100%;aspect-ratio:1;object-fit:cover;display:block}
.sfx-tag{position:absolute;top:8px;right:8px;background:#fbbf24;color:#7c2d12;font-weight:900;font-style:italic;padding:4px 12px;border-radius:8px;border:2px solid #7c2d12;font-family:'Comic Sans MS','Marker Felt',sans-serif;font-size:0.95em;transform:rotate(-6deg);box-shadow:2px 2px 0 #7c2d12;text-transform:uppercase;letter-spacing:0.05em}
.panel-sticker{position:absolute;bottom:8px;left:8px;font-size:2em;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))}
.dialogue-bubble{margin:8px;padding:10px 14px;background:#fff;border:2px solid #1e293b;border-radius:14px;font-size:0.92em;line-height:1.4;position:relative}
.dialogue-speaker{font-weight:bold;color:#1d4ed8;font-size:0.78em;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px}
.dialogue-speech{color:#1e293b}
.thought-bubble{margin:8px;padding:8px 12px;background:#f0f9ff;border:2px dashed #7c3aed;border-radius:14px;color:#5b21b6;font-style:italic;font-size:0.88em;line-height:1.4}
.panel-caption{font-size:0.85em;color:#475569;font-style:italic}
.speech-bubble{padding:12px;font-size:0.95em;line-height:1.5;border-top:2px solid #e2e8f0;position:relative;background:#fff}
@media print{.skip-link,.print-btn{display:none}.chapter,.panel{break-inside:avoid}body{background:#fff !important}.cover{background:#fffbeb !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.comic-grid{background:#1e293b !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important}}
</style></head><body>
<a class="skip-link" href="#story-content">Skip to story</a>
<button class="print-btn" onclick="window.print()" aria-label="Print this storybook or save as PDF">🖨️ Print</button>
<header class="cover" role="banner">
  ${coverArt ? `<img src="${coverArt}" style="max-width:300px;border-radius:12px;margin:0 auto 16px;display:block;box-shadow:0 4px 16px rgba(0,0,0,0.15)" alt="Cover illustration for ${title}" />` : ''}
  <h1 id="story-title">${title}</h1>
  <p class="meta">Written by ${author}</p>
  <p class="meta">${escapeHtml(date)} · ${escapeHtml(GENRE_TEMPLATES[genre]?.label || 'Creative Writing')} · Art style: ${escapeHtml(artStyle)}</p>
</header>
<main id="story-content" role="main" aria-labelledby="story-title">
${chaptersHtml}
</main>
<aside class="vocab-aside" aria-labelledby="vocab-heading">
${vocabHtml}
</aside>
${feedbackHtml ? `<aside class="feedback-aside" aria-label="Teacher feedback">${feedbackHtml}</aside>` : ''}
<footer class="colophon" role="contentinfo">Created with StoryForge · AlloFlow</footer>
</body></html>`;

    try {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
      else if (addToast) addToast('Pop-up blocked — allow pop-ups to export', 'error');
    } catch (e) {
      if (addToast) addToast('Export failed', 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // SLIDESHOW EXPORT
  // ═══════════════════════════════════════════════════════════

  const exportSlideshow = () => {
    const title = escapeHtml(storyTitle || storyPrompt || sourceTopic || 'My Story');
    const author = escapeHtml(authorName || 'A Creative Student');
    let slidesHtml = '';

    setHasExported(true);

    // Title slide
    slidesHtml += `<div class="slide title-slide">
      ${coverArt ? `<img src="${coverArt}" class="cover-img" alt="Cover" />` : ''}
      <h1>${title}</h1>
      <p class="author">By ${author}</p>
    </div>`;

    // Content slides
    paragraphs.forEach((p, idx) => {
      const img = illustrations[p.id]?.imageUrl;
      const beatLabel = (PLOT_BEATS.find(b => b.value === p.plotBeat) || {}).label;
      const beatHtml = (beatLabel && p.plotBeat)
        ? `<div class="beat-label" aria-label="Narrative beat: ${escapeHtml(beatLabel)}">${escapeHtml(beatLabel)}</div>`
        : '';
      slidesHtml += `<div class="slide">
        ${img ? `<img src="${img}" class="slide-img" alt="Scene ${idx + 1}" />` : ''}
        ${beatHtml}
        <div class="slide-text">${escapeHtml(p.text).replace(/\n/g, '<br/>')}</div>
        <div class="slide-num">${idx + 1} / ${paragraphs.length}</div>
      </div>`;
    });

    // Vocab slide
    slidesHtml += `<div class="slide vocab-slide"><h2>Vocabulary Used</h2><div class="vocab-flex">`;
    vocabTerms.forEach(v => {
      const used = vocabUsage[v.term];
      slidesHtml += `<span class="v-chip ${used ? 'used' : ''}">${used ? '✓' : '✗'} ${escapeHtml(v.term)}</span>`;
    });
    slidesHtml += `</div></div>`;

    if (gradingResult) {
      slidesHtml += `<div class="slide feedback-slide">
        <h2>Feedback</h2>
        <div class="score">${escapeHtml(gradingResult.totalScore || '')}</div>
        <div class="fb-grid">
          <div class="fb-glow">✨ ${escapeHtml(gradingResult.feedback?.glow || '')}</div>
          <div class="fb-grow">🌱 ${escapeHtml(gradingResult.feedback?.grow || '')}</div>
        </div>
      </div>`;
    }

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Slideshow</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f172a;color:white;overflow:hidden;height:100vh}
.slide{display:none;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:40px 60px;text-align:center;animation:fadeIn 0.5s}
.slide.active{display:flex}
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.title-slide h1{font-size:3em;margin:16px 0 8px}
.title-slide .author{font-size:1.2em;color:#94a3b8;font-style:italic}
.cover-img{max-width:300px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.4)}
.slide-img{max-height:50vh;max-width:80%;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.3);margin-bottom:24px}
.slide-text{font-size:1.4em;line-height:1.8;max-width:700px;text-indent:2em;text-align:left}
.beat-label{display:inline-block;font-size:0.75em;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#fde68a;background:rgba(67,56,202,0.5);border:1px solid #a78bfa;padding:4px 14px;border-radius:999px;margin-bottom:12px}
.slide-num{position:absolute;bottom:20px;right:30px;color:#cbd5e1;font-size:0.8em}
.vocab-slide h2,.feedback-slide h2{font-size:2em;margin-bottom:24px;color:#fbbf24}
.vocab-flex{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.v-chip{padding:8px 20px;border-radius:30px;font-weight:bold;background:#334155;border:2px solid #475569}
.v-chip.used{background:#166534;border-color:#22c55e;color:#bbf7d0}
.score{font-size:3em;font-weight:900;color:#a78bfa;margin-bottom:20px}
.fb-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:700px}
.fb-glow{background:#14532d;padding:20px;border-radius:12px;text-align:left;font-size:1.1em;line-height:1.6}
.fb-grow{background:#713f12;padding:20px;border-radius:12px;text-align:left;font-size:1.1em;line-height:1.6}
.nav{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:12px;z-index:10}
.nav button{padding:10px 24px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:1em}
.nav .prev{background:#334155;color:white}
.nav .next{background:#e11d48;color:white}
.nav button:hover{outline:2px solid #fbbf24;outline-offset:2px}
.nav button:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}
</style></head><body>
${slidesHtml}
<div class="nav">
  <button class="prev" onclick="go(-1)">← Back</button>
  <button class="next" onclick="go(1)">Next →</button>
</div>
<script>
var slides=document.querySelectorAll('.slide'),idx=0;
function show(){slides.forEach(function(s,i){s.classList.toggle('active',i===idx);})}
function go(d){idx=Math.max(0,Math.min(slides.length-1,idx+d));show();}
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' ')go(1);if(e.key==='ArrowLeft')go(-1);});
show();
</script></body></html>`;

    try {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
      else if (addToast) addToast('Pop-up blocked — allow pop-ups', 'error');
    } catch (e) {
      if (addToast) addToast('Slideshow export failed', 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // SHARE TO TEACHER DASHBOARD
  // ═══════════════════════════════════════════════════════════

  const shareToSession = async () => {
    if (!liveSession || !liveSession.push) return;
    if (isCanvasEnv) {
      if (addToast) addToast('Sharing is disabled in Canvas environment (FERPA)', 'error');
      return;
    }
    try {
      const title = storyTitle || storyPrompt || sourceTopic || 'My Story';
      await liveSession.push({
        type: 'storyforge',
        title,
        author: authorName || 'Student',
        genre: GENRE_TEMPLATES[genre]?.label || 'Creative Writing',
        paragraphCount: paragraphs.length,
        wordCount: totalWords,
        vocabUsed: vocabUsedCount,
        vocabTotal: vocabTerms.length,
        coverArt: coverArt || null,
        preview: paragraphs[0]?.text?.substring(0, 200) || '',
        // Portfolio gallery data
        fullStory: paragraphs.map(p => ({ text: p.text.substring(0, 500), illustration: illustrations[p.id]?.imageUrl || null })),
        gradingScore: gradingResult?.totalScore || null,
        readingGrade: readingLevel?.grade || null,
        draftCount,
      });
      if (addToast) addToast('Storybook shared to class!', 'success');
      awardXP(10, 'Shared to class');
    } catch (err) {
      console.warn('Share failed:', err);
      if (addToast) addToast('Failed to share — try again', 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // COLLABORATIVE JSON SAVE / LOAD ("Pass the Torch")
  // ═══════════════════════════════════════════════════════════

  const exportDraftJSON = () => {
    const draft = {
      _storyForgeVersion: 2,
      // ── Story content ──
      storyTitle, codename: authorName, genre, language, vocabTerms, artStyle, customArtStyle,
      storyPrompt, rubricText, paragraphs, scaffoldsGenerated, draftCount,
      illustrations: Object.fromEntries(
        Object.entries(illustrations).filter(([, v]) => v?.imageUrl).map(([k, v]) => [k, { imageUrl: v.imageUrl, prompt: v.prompt }])
      ),
      coverArt,
      // ── Progress & analytics data (for teacher review) ──
      gradingResult,
      analytics: {
        totalWords,
        vocabUsedCount,
        vocabTotal: vocabTerms.length,
        vocabUsage: Object.fromEntries(vocabTerms.map(v => [v.term, vocabUsage[v.term] || false])),
        readingLevel: readingLevel ? { grade: readingLevel.grade, sentences: readingLevel.sentences, words: readingLevel.words, avgWordsPerSentence: readingLevel.avgWordsPerSentence } : null,
        paragraphStats: paragraphStats.map((ps, i) => ({ paragraph: i + 1, ...ps })),
        wordFrequency: wordFrequency.slice(0, 10),
        overusedWords,
        sentenceVariety: sentenceVariety.map((sv, i) => ({ paragraph: i + 1, varied: sv.varied, issues: sv.issues })),
        characterIssues: characterIssues.length > 0 ? characterIssues : null,
        characters: characters.length > 0 ? characters : null,
      },
      // ── Achievement & XP data ──
      achievements: achievements.map(a => ({ id: a.id, name: a.name, earned: a.earned })),
      xp: { totalXP: xpData.totalXP, level: currentLevel.name, streak: xpData.streak },
      // ── Narration status ──
      narration: {
        aiNarratedCount: Object.values(audioSegments).filter(s => s?.aiAudioUrl).length,
        studentRecordedCount: Object.values(audioSegments).filter(s => s?.studentAudioUrl).length,
        narratorVoice,
      },
      // ── Grammar check results (if any) ──
      grammarResults: Object.keys(grammarResults).length > 1 ? grammarResults : null,
      // ── Export metadata ──
      exportedAt: new Date().toISOString(),
      exportedBy: authorName || 'Student',
    };
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(storyTitle || 'story').replace(/[^a-zA-Z0-9]/g, '_')}_draft.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (addToast) addToast('Draft exported as JSON — share with a classmate!', 'success');
  };

  const importDraftJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const d = JSON.parse(ev.target.result);
          if (!d._storyForgeVersion) { if (addToast) addToast('Invalid StoryForge file', 'error'); return; }
          if (d.storyTitle) setStoryTitle(d.storyTitle);
          // authorName derived from codename prop — no need to restore
          if (d.genre) setGenre(d.genre);
          if (d.language) setLanguage(d.language);
          if (d.vocabTerms) setVocabTerms(d.vocabTerms);
          if (d.artStyle) setArtStyle(d.artStyle);
          if (d.customArtStyle) setCustomArtStyle(d.customArtStyle);
          if (d.storyPrompt) setStoryPrompt(d.storyPrompt);
          if (d.rubricText) setRubricText(d.rubricText);
          if (d.paragraphs) setParagraphs(d.paragraphs);
          if (d.scaffoldsGenerated) setScaffoldsGenerated(true);
          if (d.draftCount) setDraftCount(d.draftCount);
          if (d.illustrations) setIllustrations(d.illustrations);
          if (d.coverArt) setCoverArt(d.coverArt);
          if (d.gradingResult) setGradingResult(d.gradingResult);
          if (d.grammarResults) setGrammarResults(d.grammarResults);
          if (d.characters) setCharacters(d.characters);
          // If this is a v2 file with analytics, go to review phase so teacher can see progress
          if (d._storyForgeVersion >= 2 && d.analytics) {
            setPhase('review');
            if (addToast) addToast(`Student progress loaded from ${d.exportedBy || 'student'} — review their work!`, 'success');
          } else {
            setPhase('write');
            if (addToast) addToast(`Draft loaded from ${d.exportedBy || 'classmate'} — keep writing!`, 'success');
          }
        } catch (err) {
          if (addToast) addToast('Could not read that file', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ═══════════════════════════════════════════════════════════
  // ACHIEVEMENT BADGES
  // ═══════════════════════════════════════════════════════════

  const achievements = useMemo(() => {
    const illustratedCount = Object.values(illustrations).filter(ill => ill?.imageUrl).length;
    const narratedCount = Object.values(audioSegments).filter(seg => seg?.aiAudioUrl || seg?.studentAudioUrl).length;
    const recordedCount = Object.values(audioSegments).filter(seg => seg?.studentAudioUrl).length;
    return [
      { id: 'first_words', name: 'First Words', icon: '✏️', desc: 'Write 50+ words', earned: totalWords >= 50 },
      { id: 'storyteller', name: 'Storyteller', icon: '📖', desc: 'Write 200+ words', earned: totalWords >= 200 },
      { id: 'novelist', name: 'Novelist', icon: '📚', desc: 'Write 500+ words', earned: totalWords >= 500 },
      { id: 'vocab_star', name: 'Vocab Star', icon: '⭐', desc: 'Use all vocabulary terms', earned: vocabTerms.length > 0 && vocabUsedCount === vocabTerms.length },
      { id: 'illustrator', name: 'Illustrator', icon: '🎨', desc: 'Generate an illustration', earned: illustratedCount > 0 },
      { id: 'gallery', name: 'Full Gallery', icon: '🖼️', desc: 'Illustrate every paragraph', earned: illustratedCount >= paragraphs.length && paragraphs.length > 0 },
      { id: 'narrator', name: 'Narrator', icon: '🎙️', desc: 'Narrate a paragraph', earned: narratedCount > 0 },
      { id: 'voice_actor', name: 'Voice Actor', icon: '🎤', desc: 'Record your own voice', earned: recordedCount > 0 },
      { id: 'reviser', name: 'Reviser', icon: '🔄', desc: 'Write multiple drafts', earned: draftCount >= 2 },
      { id: 'published', name: 'Published Author', icon: '🏆', desc: 'Export your storybook', earned: hasExported },
    ];
  }, [totalWords, vocabUsedCount, vocabTerms.length, illustrations, audioSegments, paragraphs.length, draftCount, hasExported]);

  const earnedCount = useMemo(() => achievements.filter(a => a.earned).length, [achievements]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (!isOpen) return null;

  const phaseIcons = [Sparkles, Type, ImageIcon, Volume2, Star, Download];

  return (
    <div className={`sf-modal-root fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-sm flex flex-col ${animClass}`} role="dialog" aria-modal="true" aria-label="StoryForge Creative Writing Studio">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />
      {/* Screen reader playback announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {playbackIdx >= 0 && paragraphs[playbackIdx] ? (
          `Now reading paragraph ${playbackIdx + 1}${audioSegments[paragraphs[playbackIdx].id]?.sentences?.[sentenceIdx] ? ': ' + audioSegments[paragraphs[playbackIdx].id].sentences[sentenceIdx] : ''}`
        ) : ''}
      </div>
      {/* WCAG 4.1.3 — top-level announcer for ephemeral status messages (sfAnnounce target) */}
      <div id="allo-live-storyforge" aria-live="polite" aria-atomic="true" className="sr-only" />
      {/* WCAG 2.3.3 — reduced-motion safety net: kills persistent animations within StoryForge under prefers-reduced-motion */}
      <style>{`@media (prefers-reduced-motion: reduce){ .sf-modal-root .animate-pulse,.sf-modal-root .animate-spin,.sf-modal-root .animate-bounce{animation:none!important} }`}</style>

      {/* ── Restore Draft Prompt ── */}
      {showRestorePrompt && (
        <div className="fixed inset-0 z-[210] bg-black/60 flex items-center justify-center animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="sf-restore-title">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl text-center">
            <div className="text-3xl mb-3" aria-hidden="true">📖</div>
            <h3 id="sf-restore-title" className="text-lg font-black text-slate-800 mb-2">Continue Where You Left Off?</h3>
            <p className="text-sm text-slate-600 mb-4">A saved draft was found. Would you like to restore it?</p>
            <div className="flex gap-3 justify-center">
              <button data-sf-focusable onClick={discardDraft} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors">Start Fresh</button>
              <button data-sf-focusable onClick={restoreDraft} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors">Restore Draft</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unsaved changes confirmation ── */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[210] bg-black/60 flex items-center justify-center animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="sf-close-confirm-title">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl text-center">
            <div className="text-3xl mb-3">{'\u270F\uFE0F'}</div>
            <h3 id="sf-close-confirm-title" className="text-lg font-black text-slate-800 mb-2">You Have Unsaved Changes</h3>
            <p className="text-sm text-slate-600 mb-4">Your story progress hasn't been exported or saved. Are you sure you want to close?</p>
            <div className="flex gap-3 justify-center">
              <button data-sf-focusable onClick={() => setShowCloseConfirm(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors">Keep Writing</button>
              <button data-sf-focusable onClick={() => { setShowCloseConfirm(false); try { const draft = { storyTitle, genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText, paragraphs, scaffoldsGenerated, draftCount, phase, language }; localStorage.setItem(SAVE_KEY, JSON.stringify(draft)); } catch(e) {} onClose(); }} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors">Save Draft & Close</button>
              <button data-sf-focusable onClick={() => { setShowCloseConfirm(false); onClose(); }} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors">Close Anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-4 text-white flex justify-between items-center shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen size={24} />
          <div>
            <h2 className="text-xl font-black">StoryForge</h2>
            <p className="text-rose-200 text-xs font-medium">Creative Writing Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* XP / Level badge */}
          <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2" title={`${xpData.totalXP} XP · ${currentLevel.name}${xpData.streak > 1 ? ` · ${xpData.streak}-day streak` : ''}`}>
            <span>{currentLevel.emoji} {currentLevel.name}</span>
            <span className="text-rose-200">{xpData.totalXP} XP</span>
            {xpData.streak > 1 && <span className="text-amber-300">🔥{xpData.streak}</span>}
            {nextLevel && (
              <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-amber-300 rounded-full transition-all" style={{ width: `${Math.min(100, ((xpData.totalXP - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)}%` }} />
              </div>
            )}
          </div>
          {totalWords > 0 && (
            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
              <span>{totalWords} words</span>
              <span>·</span>
              <span>{vocabUsedCount}/{vocabTerms.length} terms</span>
              {readingLevel && <><span>·</span><span>Grade {readingLevel.grade}</span></>}
            </div>
          )}
          <button
            data-sf-focusable
            onClick={() => { if (typeof window.AlloToggleTheme === 'function') window.AlloToggleTheme(); }}
            className="hover:bg-white/20 p-2 rounded-full transition-colors flex items-center gap-1"
            aria-label="Toggle theme"
            title={(() => { try { return document.querySelector('.theme-contrast') ? 'High Contrast' : document.querySelector('.theme-dark') ? 'Dark Mode' : 'Light Mode'; } catch(e) { return 'Toggle theme'; } })()}
          >
            <span className="text-sm">{(() => { try { return document.querySelector('.theme-contrast') ? '\uD83D\uDC41' : document.querySelector('.theme-dark') ? '\uD83C\uDF19' : '\u2600\uFE0F'; } catch(e) { return '\u2600\uFE0F'; } })()}</span>
          </button>
          <button data-sf-focusable onClick={safeClose} className="hover:bg-white/20 p-2 rounded-full transition-colors" aria-label="Close StoryForge">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* ── Stepper ── */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-center gap-1 shrink-0 overflow-x-auto" role="navigation" aria-label="Story creation phases">
        {PHASES.map((p, i) => {
          const Icon = phaseIcons[i];
          const isCurrent = i === phaseIdx;
          const isDone = i < phaseIdx;
          return (
            <React.Fragment key={p}>
              {i > 0 && <div className={`w-8 h-0.5 ${isDone ? 'bg-rose-400' : 'bg-slate-200'}`} aria-hidden="true" />}
              <button
                data-sf-focusable
                onClick={() => { if (isDone || isCurrent) changePhase(p); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isCurrent ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' :
                  isDone ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' :
                  'bg-slate-100 text-slate-600'
                }`}
                disabled={!isDone && !isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${PHASE_LABELS[i]}${isDone ? ' (completed)' : isCurrent ? ' (current step)' : ''}`}
              >
                <Icon size={14} aria-hidden="true" />
                <span className="hidden sm:inline">{PHASE_LABELS[i]}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* ── Phase Content ── */}
      <div className="flex-grow overflow-y-auto" ref={phaseContentRef} tabIndex={-1} role="region" aria-label={`${PHASE_LABELS[phaseIdx]} phase`} aria-live="polite">
        <div className="max-w-4xl mx-auto p-6">

          {/* ═══ CONFIGURE PHASE ═══ */}
          {phase === 'configure' && (
            <div className={`space-y-6 ${animClass}`}>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-slate-800">Set Up Your Story</h3>
                <p className="text-slate-600 text-sm mt-1">Name your story, choose a genre, and set your vocabulary ingredients</p>
                <div className="flex gap-2 justify-center mt-2 flex-wrap">
                  <button onClick={importDraftJSON} className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-[11px] font-bold hover:bg-cyan-200 transition-colors inline-flex items-center gap-1">
                    <Plus size={10} /> Import classmate's draft
                  </button>
                  {onSaveConfig && (
                    <button onClick={saveAsConfig} disabled={vocabTerms.length === 0} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[11px] font-bold hover:bg-indigo-200 transition-colors inline-flex items-center gap-1 disabled:opacity-40">
                      <Download size={10} /> Save as Assignment
                    </button>
                  )}
                </div>
              </div>

              {/* ── Import from Lesson Resources ── */}
              {lessonResources && lessonResources.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-2xl p-4">
                  <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <BookOpen size={12} /> Import from Lesson Resources
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {lessonResources.filter(r => ['glossary', 'simplified', 'sentence-frames', 'lesson-plan', 'timeline'].includes(r.type)).map((r, ri) => (
                      <button
                        key={ri}
                        onClick={() => importFromResource(r)}
                        className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                      >
                        {r.type === 'glossary' ? '📖' : r.type === 'simplified' ? '📄' : r.type === 'sentence-frames' ? '✏️' : r.type === 'lesson-plan' ? '📋' : '📅'}
                        {r.title || r.type}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-indigo-400 mt-1.5">Click to auto-fill vocabulary, prompts, or scaffolds from your lesson</p>
                </div>
              )}

              {/* Title & Author */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sf-title" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Story Title</label>
                    <input
                      id="sf-title"
                      type="text" value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)}
                      placeholder="Give your story a title..."
                      className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-300 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Pen Name</label>
                    <div className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 flex items-center gap-2">
                      <span className="text-base">✍️</span> {authorName}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Your codename is your pen name — it keeps your identity private</p>
                  </div>
                </div>
              </div>

              {/* Genre Picker */}
              <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen size={16} /> Genre
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(GENRE_TEMPLATES).map(([key, g]) => (
                    <button
                      key={key}
                      onClick={() => setGenre(key)}
                      className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                        genre === key ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {g.emoji}<br/>{g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vocab Terms */}
              <div className="bg-white rounded-2xl border-2 border-rose-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen size={16} /> Story Ingredients ({vocabTerms.length} terms)
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {vocabTerms.map((v, i) => (
                    <div key={i} className="bg-rose-50 border border-rose-200 rounded-full px-3 py-1 text-sm font-bold text-rose-800 flex items-center gap-2 group">
                      <span>{v.term}</span>
                      <button onClick={() => removeVocabTerm(i)} className="text-rose-400 hover:text-rose-600 opacity-60 group-hover:opacity-100 focus:opacity-100 transition-opacity" aria-label={`Remove ${v.term}`}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {vocabTerms.length === 0 && (
                    <p className="text-slate-400 text-sm italic">No vocabulary terms yet — add some below or they'll come from your glossary</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text" value={newTerm} onChange={(e) => setNewTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addVocabTerm()}
                    placeholder="Add a term..."
                    aria-label="Vocabulary term"
                    className="flex-1 text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-300 outline-none"
                  />
                  <input
                    type="text" value={newDef} onChange={(e) => setNewDef(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addVocabTerm()}
                    placeholder="Definition (optional)"
                    aria-label="Term definition"
                    className="flex-1 text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-300 outline-none"
                  />
                  <button onClick={addVocabTerm} disabled={!newTerm.trim()} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center gap-1">
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvancedConfig(prev => !prev)}
                className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                aria-expanded={showAdvancedConfig}
              >
                <span className="flex items-center gap-2"><Palette size={16} /> Advanced Settings</span>
                <span className={`transition-transform ${showAdvancedConfig ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showAdvancedConfig && (
              <div className="space-y-6">

              {/* Art Style */}
              <div className="bg-white rounded-2xl border-2 border-purple-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Palette size={16} /> Art Style
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.keys(ART_STYLE_MAP).map(style => (
                    <button
                      key={style}
                      onClick={() => setArtStyle(style)}
                      className={`p-3 rounded-xl border-2 text-center text-xs font-bold capitalize transition-all ${
                        artStyle === style ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' : 'border-slate-200 text-slate-600 hover:border-purple-300'
                      }`}
                    >
                      {style === 'storybook' ? '📚' : style === 'pixel' ? '👾' : style === 'cinematic' ? '🎬' : style === 'anime' ? '✨' : '🖍️'}<br/>{style}
                    </button>
                  ))}
                  <button
                    onClick={() => setArtStyle('custom')}
                    className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                      artStyle === 'custom' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' : 'border-slate-200 text-slate-600 hover:border-purple-300'
                    }`}
                  >
                    🎨<br/>Custom
                  </button>
                </div>
                {artStyle === 'custom' && (
                  <input
                    type="text" value={customArtStyle} onChange={(e) => setCustomArtStyle(e.target.value)}
                    placeholder="Describe your custom art style..."
                    aria-label="Custom art style description"
                    className="mt-3 w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none"
                  />
                )}
              </div>

              {/* Language */}
              <div className="bg-white rounded-2xl border-2 border-teal-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Type size={16} /> Writing Language
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {LANG_OPTIONS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={`p-2.5 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                        language === l.code ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md' : 'border-slate-200 text-slate-600 hover:border-teal-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                {language === 'other' && (
                  <input
                    type="text" value={customLanguage} onChange={(e) => setCustomLanguage(e.target.value)}
                    placeholder="Type your language (e.g., Swahili, Haitian Creole, Hmong...)"
                    aria-label="Custom writing language"
                    className="mt-3 w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-300 outline-none"
                  />
                )}
                {language !== 'en' && <p className="mt-2 text-[11px] text-teal-500 font-medium">AI scaffolds, coaching, grading, and dictation will use {langLabel}</p>}
              </div>

              {/* Story Prompt */}
              <div className="bg-white rounded-2xl border-2 border-amber-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles size={16} /> Story Prompt (Optional)
                </h4>
                <textarea
                  value={storyPrompt} onChange={(e) => setStoryPrompt(e.target.value)}
                  placeholder="Give your students a theme or starting scenario... e.g., 'Write about a scientist who discovers something unexpected'"
                  aria-label="Story prompt"
                  className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none resize-none h-20"
                />

                {/* Story Starters */}
                {genre !== 'free' && STORY_STARTERS[genre] && (
                  <div className="mt-3 pt-3 border-t border-amber-100">
                    <div className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-2">💡 {GENRE_TEMPLATES[genre]?.label} Story Starters — click to use</div>
                    <div className="space-y-2">
                      {STORY_STARTERS[genre].map((starter, si) => (
                        <button
                          key={si}
                          onClick={() => setStoryPrompt(starter)}
                          className={`w-full text-left text-xs p-2.5 rounded-lg border transition-all ${
                            storyPrompt === starter ? 'bg-amber-100 border-amber-400 text-amber-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          "{starter}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Rubric */}
              <div className="bg-white rounded-2xl border-2 border-emerald-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Star size={16} /> Custom Rubric (Optional)
                </h4>
                <p className="text-xs text-slate-600 mb-2">Paste a custom grading rubric. If empty, the default 4-criteria rubric is used.</p>
                <textarea
                  id="sf-rubric"
                  value={rubricText} onChange={(e) => setRubricText(e.target.value)}
                  placeholder={"| Criteria | 1 - Beginning | 3 - Developing | 5 - Exemplary |\n|----------|---------------|----------------|---------------|\n| Vocabulary | Few terms used | Some terms used | All terms used correctly |"}
                  className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-300 outline-none resize-none h-24 font-mono"
                  aria-label="Custom grading rubric"
                />
              </div>

              </div>
              )}

            </div>
          )}

          {/* ═══ WRITE PHASE ═══ */}
          {phase === 'write' && (
            <div className={`space-y-4 ${animClass}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Write Your Story</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Use your vocabulary ingredients in each paragraph
                    {revisionSnapshot && <span className="text-indigo-500 ml-2">Draft #{draftCount} — revising!</span>}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {/* Writing timer */}
                  {timerActive ? (
                    <div className="flex items-center gap-2 bg-rose-100 border border-rose-300 rounded-full px-3 py-1">
                      <span className={`text-xs font-black tabular-nums ${timerDuration - timerSeconds <= 30 ? 'text-red-600 animate-pulse' : 'text-rose-700'}`}>{formatTime(timerSeconds)}</span>
                      <button onClick={() => { setTimerActive(false); clearTimeout(timerRef.current); }} className="text-[11px] font-bold text-rose-500 hover:text-rose-700">Stop</button>
                    </div>
                  ) : (
                    <div className="flex bg-slate-100 rounded-full p-0.5">
                      {[3, 5, 10].map(min => (
                        <button key={min} onClick={() => startTimer(min)} className="px-2 py-1 rounded-full text-[11px] font-bold text-slate-600 hover:text-rose-600 hover:bg-white transition-all" title={`${min}-minute writing sprint`}>
                          {min}m
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Layout toggle */}
                  <div className="flex bg-slate-100 rounded-full p-0.5">
                    {Object.entries(LAYOUT_MODES).map(([key, m]) => (
                      <button
                        key={key}
                        onClick={() => setLayoutMode(key)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                          layoutMode === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'
                        }`}
                        aria-label={m.desc}
                        title={m.desc}
                      >
                        {m.emoji} {m.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={generateScaffolds}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-xs font-bold hover:bg-rose-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles size={14} /> {scaffoldsGenerated ? 'Regenerate Scaffolds' : 'Generate Scaffolds'}
                  </button>
                  {/* Focus Mode Toggle — write one paragraph at a time */}
                  <button
                    onClick={() => { setFocusMode(!focusMode); setFocusParagraphIdx(0); }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2 ${
                      focusMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                    title={focusMode ? 'Show all paragraphs at once' : 'Focus on one paragraph at a time — less overwhelming!'}
                  >
                    <Target size={14} /> {focusMode ? 'Focus ON' : 'Focus Mode'}
                  </button>
                  {totalWords >= 30 && (
                    <button
                      onClick={checkGrammarAndStyle}
                      disabled={grammarLoading || isProcessing}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> {grammarLoading ? 'Checking...' : 'Check Writing'}
                    </button>
                  )}
                </div>
              </div>

              {/* Grammar overall tip */}
              {grammarResults._overallTip && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2">
                  <Sparkles size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Writing Coach Tip</div>
                    <p className="text-xs text-emerald-800 mt-0.5">{grammarResults._overallTip}</p>
                  </div>
                  <button onClick={() => setGrammarResults({})} className="text-emerald-400 hover:text-emerald-600 ml-auto shrink-0"><X size={14} /></button>
                </div>
              )}

              {/* Vocab Ingredients Bar — STICKY so it's always visible while writing */}
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-3 sticky top-0 z-30 shadow-sm" style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,241,242,0.92)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Story Ingredients — click to copy</div>
                  <div className="text-[11px] font-bold text-rose-400">
                    {vocabTerms.filter(v => vocabUsage[v.term]).length}/{vocabTerms.length} used
                  </div>
                </div>
                {/* Progress bar showing vocab completion */}
                <div className="w-full h-1.5 bg-rose-100 rounded-full mb-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: vocabTerms.length > 0 ? Math.round((vocabTerms.filter(v => vocabUsage[v.term]).length / vocabTerms.length) * 100) + '%' : '0%',
                    background: vocabTerms.filter(v => vocabUsage[v.term]).length === vocabTerms.length ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #f43f5e, #e11d48)'
                  }} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {vocabTerms.map((v, i) => {
                    const used = vocabUsage[v.term];
                    return (
                      <div key={i} className="relative group">
                        <div
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border-2 transition-all cursor-pointer select-none ${
                            used ? 'bg-green-100 border-green-400 text-green-800 shadow-sm' : 'bg-white border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-400'
                          }`}
                          onClick={() => { navigator.clipboard?.writeText(v.term).then(() => { if (addToast) addToast(`"${v.term}" copied — paste into your story!`, 'success'); }).catch(() => {}); }}
                        >
                          {used ? <CheckCircle2 size={11} className="inline mr-1" /> : <span className="inline-block w-2 h-2 rounded-full bg-rose-300 mr-1.5" />}
                          {v.term}
                        </div>
                        {/* Hover Tooltip Word Bank */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 text-white rounded-xl p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                          <div className="text-xs font-bold text-amber-300 mb-1">{v.term}</div>
                          {v.definition && <div className="text-[11px] text-slate-300 leading-relaxed mb-1">{v.definition}</div>}
                          <div className="text-[11px] text-slate-400 italic">Click to copy · Paste into your paragraph</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Focus Mode Navigation Bar */}
              {focusMode && (
                <div className="flex items-center justify-between bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3">
                  <button
                    onClick={() => setFocusParagraphIdx(Math.max(0, focusParagraphIdx - 1))}
                    disabled={focusParagraphIdx === 0}
                    className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-30 transition-colors flex items-center gap-1"
                  >
                    ← Previous
                  </button>
                  <div className="text-center">
                    <div className="text-xs font-bold text-indigo-700">Paragraph {focusParagraphIdx + 1} of {paragraphs.length}</div>
                    <div className="text-[11px] text-indigo-400 mt-0.5">
                      {paragraphs[focusParagraphIdx]?.scaffoldFrame ? paragraphs[focusParagraphIdx].scaffoldFrame.substring(0, 60) + (paragraphs[focusParagraphIdx].scaffoldFrame.length > 60 ? '...' : '') : 'Free write'}
                    </div>
                    {/* Mini progress dots */}
                    <div className="flex justify-center gap-1 mt-1.5">
                      {paragraphs.map((pp, pi) => (
                        <button
                          key={pi}
                          onClick={() => setFocusParagraphIdx(pi)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            pi === focusParagraphIdx ? 'bg-indigo-600 scale-125' : pp.text.trim().length > 10 ? 'bg-green-400' : 'bg-slate-300'
                          }`}
                          title={`Jump to paragraph ${pi + 1}${pp.text.trim().length > 10 ? ' (written)' : ' (empty)'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (focusParagraphIdx >= paragraphs.length - 1) {
                        // Add new paragraph if at end
                        if (paragraphs.length < maxParagraphs) { addParagraph(); setFocusParagraphIdx(paragraphs.length); }
                      } else {
                        setFocusParagraphIdx(focusParagraphIdx + 1);
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                  >
                    {focusParagraphIdx >= paragraphs.length - 1 ? '+ New ¶' : 'Next →'}
                  </button>
                </div>
              )}

              {/* Paragraph Cards */}
              {paragraphs.map((p, idx) => (
                focusMode && idx !== focusParagraphIdx ? null :
                <React.Fragment key={p.id}>
                <div id={'sf-para-' + p.id} className={`rounded-2xl border-2 shadow-sm overflow-hidden transition-colors ${
                  focusMode ? 'border-indigo-300 shadow-lg ring-2 ring-indigo-100' :
                  layoutMode === 'dark' ? 'bg-slate-800 border-slate-600 text-slate-100' :
                  layoutMode === 'journal' ? 'bg-amber-50 border-amber-200' :
                  'bg-white border-slate-200 hover:border-rose-200'
                }`}>
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Paragraph {idx + 1}</span>
                      {/* Reorder buttons */}
                      <div className="flex gap-0.5">
                        <button onClick={() => moveParagraph(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5 rounded text-[11px] font-bold transition-colors" aria-label="Move paragraph up" title="Move up">▲</button>
                        <button onClick={() => moveParagraph(idx, 1)} disabled={idx === paragraphs.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5 rounded text-[11px] font-bold transition-colors" aria-label="Move paragraph down" title="Move down">▼</button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleDictation(idx)}
                        className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors ${
                          dictation.isDictating && dictatingParagraphIdx === idx
                            ? 'bg-red-100 border-red-300 text-red-600 animate-pulse'
                            : 'bg-blue-50 border-blue-200/50 text-blue-500 hover:bg-blue-100 hover:text-blue-700'
                        }`}
                        aria-label={dictation.isDictating && dictatingParagraphIdx === idx ? 'Stop dictation' : 'Start dictation'}
                      >
                        <Mic size={10} /> {dictation.isDictating && dictatingParagraphIdx === idx ? 'Stop' : 'Dictate'}
                      </button>
                      <button
                        onClick={() => helpMeWrite(idx)}
                        disabled={isProcessing}
                        className="text-amber-500 hover:text-amber-700 text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/50 transition-colors disabled:opacity-40"
                        aria-label="Get writing suggestions"
                      >
                        <Sparkles size={10} /> Help Me
                      </button>
                      {paragraphs.length > 1 && (
                        <button onClick={() => removeParagraph(idx)} className="text-slate-400 hover:text-red-500 focus:text-red-500 p-1 rounded transition-colors" aria-label={`Remove paragraph ${idx + 1}`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {p.scaffoldFrame && (
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 italic flex items-center gap-2">
                      <HelpCircle size={12} className="shrink-0" /> {p.scaffoldFrame}
                    </div>
                  )}
                  {/* ── Plot Structure beat (optional narrative-arc tag) ── */}
                  {genre !== 'free' && (
                    <div className="px-4 py-2 bg-indigo-50/60 border-b border-indigo-100 flex items-center gap-2">
                      <label htmlFor={`sf-beat-${p.id}`} className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest shrink-0">
                        📐 Plot Beat
                      </label>
                      <select
                        id={`sf-beat-${p.id}`}
                        value={p.plotBeat || ''}
                        onChange={(e) => updateParagraphBeat(idx, e.target.value)}
                        className="text-xs px-2 py-1 rounded-md border border-indigo-200 bg-white text-indigo-800 font-medium outline-none focus:border-indigo-500"
                        aria-label={`Plot beat for paragraph ${idx + 1} (optional)`}
                      >
                        {PLOT_BEATS.map(b => (
                          <option key={b.value || 'none'} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                      {p.plotBeat && (
                        <span className="text-[11px] text-indigo-600 italic">tagged</span>
                      )}
                    </div>
                  )}
                  {/* Help Me Write suggestions */}
                  {helpMeParagraphIdx === idx && helpMeResult && (
                    <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
                      <div className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1"><Sparkles size={10} /> Writing Coach Suggestions</div>
                      <div className="space-y-1.5">
                        {helpMeResult.map((s, si) => (
                          <div key={si} className="text-xs text-amber-800 flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">💡</span>
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => { setHelpMeParagraphIdx(-1); setHelpMeResult(null); }} className="mt-2 text-[11px] text-amber-500 hover:text-amber-700 font-bold">Dismiss</button>
                    </div>
                  )}
                  {layoutMode === 'comic' ? (
                    /* ── Comic Panel Writing Mode — dialogue, thought, narration fields ── */
                    <div className="p-3 space-y-2 bg-gradient-to-b from-slate-50 to-white">
                      {/* Narration caption — top yellow bar */}
                      <div>
                        <label className="text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                          📖 Narration Caption
                        </label>
                        <textarea
                          value={p.text}
                          onChange={(e) => updateParagraph(idx, e.target.value)}
                          className="w-full p-2.5 text-xs resize-none outline-none border-2 border-amber-200 rounded-lg bg-amber-50 focus:border-amber-400 transition-colors italic"
                          style={{ minHeight: '50px' }}
                          placeholder="What's happening in this panel? (narrator voice)"
                          aria-label={`Panel ${idx + 1} narration`}
                        />
                      </div>
                      {/* Speech bubble */}
                      <div>
                        <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                          💬 Speech Bubble
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={(panelDialogue[p.id] || {}).speaker || ''}
                            onChange={(e) => updatePanelDialogue(p.id, 'speaker', e.target.value)}
                            className="w-20 p-1.5 text-[11px] border border-blue-200 rounded-lg outline-none focus:border-blue-400 font-bold text-blue-700"
                            placeholder="Who?"
                            aria-label={`Panel ${idx + 1} speaker name`}
                          />
                          <textarea
                            value={(panelDialogue[p.id] || {}).speech || ''}
                            onChange={(e) => updatePanelDialogue(p.id, 'speech', e.target.value)}
                            className="flex-1 p-2 text-xs resize-none outline-none border-2 border-blue-200 rounded-xl bg-white focus:border-blue-400 transition-colors"
                            style={{ minHeight: '36px', borderRadius: '16px' }}
                            placeholder={'"What the character says out loud..."'}
                            aria-label={`Panel ${idx + 1} speech`}
                          />
                        </div>
                      </div>
                      {/* Thought bubble */}
                      <div>
                        <label className="text-[11px] font-bold text-purple-600 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                          💭 Thought Bubble
                        </label>
                        <textarea
                          value={(panelDialogue[p.id] || {}).thought || ''}
                          onChange={(e) => updatePanelDialogue(p.id, 'thought', e.target.value)}
                          className="w-full p-2 text-xs resize-none outline-none border-2 border-purple-200 rounded-xl bg-purple-50/30 focus:border-purple-400 transition-colors italic"
                          style={{ minHeight: '30px', borderRadius: '20px', borderStyle: 'dashed' }}
                          placeholder="What the character is thinking..."
                          aria-label={`Panel ${idx + 1} thought`}
                        />
                      </div>
                      {/* Sound effect */}
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-red-500 uppercase tracking-widest">💥 SFX</label>
                        <input
                          type="text"
                          value={(panelDialogue[p.id] || {}).sfx || ''}
                          onChange={(e) => updatePanelDialogue(p.id, 'sfx', e.target.value)}
                          className="flex-1 p-1.5 text-xs border border-red-200 rounded-lg outline-none focus:border-red-400 font-black text-red-600 uppercase"
                          placeholder="BOOM! CRASH! WHOOSH!"
                          aria-label={`Panel ${idx + 1} sound effect`}
                        />
                      </div>
                    </div>
                  ) : (
                    /* ── Prose / Journal / Dark Writing Mode — styled textarea ── */
                    <textarea
                      value={p.text}
                      onChange={(e) => updateParagraph(idx, e.target.value)}
                      className={`w-full p-4 text-sm resize-none outline-none transition-colors ${
                        layoutMode === 'dark' ? 'bg-slate-800 text-slate-100 placeholder:text-slate-600 focus:bg-slate-750 caret-cyan-400' :
                        layoutMode === 'journal' ? 'bg-amber-50 text-amber-900 placeholder:text-amber-400 focus:bg-amber-100/50' :
                        'focus:bg-rose-50/30'
                      }`}
                      style={{
                        minHeight: '120px',
                        fontFamily: layoutMode === 'journal' ? "'Georgia', 'Times New Roman', serif" : 'inherit',
                        fontSize: layoutMode === 'journal' ? '14px' : undefined,
                        lineHeight: layoutMode === 'journal' ? '2.0' : undefined,
                        backgroundImage: layoutMode === 'journal' ? 'repeating-linear-gradient(transparent, transparent 27px, #d4a574 27px, #d4a574 28px)' : undefined,
                        backgroundPosition: layoutMode === 'journal' ? '0 8px' : undefined,
                      }}
                      placeholder={p.scaffoldFrame ? "Continue from the scaffold above..." : layoutMode === 'journal' ? "Dear diary..." : layoutMode === 'dark' ? "Begin your story..." : "Write your paragraph here..."}
                      aria-label={`Paragraph ${idx + 1} text`}
                    />
                  )}
                  {/* ── Handwriting Capture Row ── */}
                  {onCallGeminiVision && (
                    <div className={`px-4 py-1.5 border-t flex items-center gap-2 flex-wrap ${
                      layoutMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'
                    }`}>
                      <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-dashed rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        hwLoading && hwTargetParagraph === idx ? 'opacity-50 pointer-events-none' : ''
                      } ${
                        layoutMode === 'dark' ? 'border-cyan-700 text-cyan-400 hover:bg-cyan-900/30' : 'border-violet-300 text-violet-600 hover:bg-violet-50 hover:border-violet-400'
                      }`}
                        aria-label={`Snap or upload handwriting for paragraph ${idx + 1}`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleHandwritingCapture(e, idx)}
                          className="sr-only"
                          disabled={hwLoading}
                          aria-hidden="true"
                        />
                        {hwLoading && hwTargetParagraph === idx ? <span className="animate-spin">⏳</span> : '📷'}
                        {hwLoading && hwTargetParagraph === idx ? ' Reading...' : ' Snap Your Writing'}
                      </label>
                      <button
                        onClick={() => setHwPenmanshipOn(!hwPenmanshipOn)}
                        aria-label={`${hwPenmanshipOn ? 'Disable' : 'Enable'} penmanship feedback`}
                        aria-pressed={hwPenmanshipOn}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          hwPenmanshipOn
                            ? (layoutMode === 'dark' ? 'bg-cyan-900 border-cyan-600 text-cyan-300' : 'bg-violet-100 border-violet-300 text-violet-700')
                            : (layoutMode === 'dark' ? 'bg-slate-800 border-slate-600 text-slate-600 hover:border-cyan-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-500')
                        }`}
                      >
                        ✏️ Penmanship Tips {hwPenmanshipOn ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  )}
                  {/* Penmanship Feedback Card */}
                  {hwResult?.penmanship && hwTargetParagraph === idx && (
                    <div className={`px-4 py-3 border-t ${
                      layoutMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-violet-50 to-fuchsia-50 border-violet-200'
                    }`} role="region" aria-label="Penmanship feedback">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${layoutMode === 'dark' ? 'text-cyan-400' : 'text-violet-600'}`}>✏️ Penmanship Feedback</span>
                        <span className="text-lg font-black" style={{ color: hwResult.penmanship.score >= 75 ? '#eab308' : hwResult.penmanship.score >= 50 ? '#8b5cf6' : hwResult.penmanship.score >= 25 ? '#3b82f6' : '#94a3b8' }}>
                          {hwResult.penmanship.score}<span className="text-xs opacity-60">/100</span>
                        </span>
                      </div>
                      <div className="flex gap-2 mb-2">
                        {[['letterFormation', 'Letters'], ['spacing', 'Spacing'], ['alignment', 'Alignment'], ['neatness', 'Neatness']].map(([key, label]) => (
                          <div key={key} className="flex-1 text-center">
                            <div className={`text-sm font-black ${(hwResult.penmanship[key] || 0) >= 18 ? 'text-green-600' : (hwResult.penmanship[key] || 0) >= 12 ? 'text-amber-600' : 'text-slate-600'}`}>
                              {hwResult.penmanship[key] || 0}<span className="text-[11px] opacity-60">/25</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-bold uppercase">{label}</div>
                          </div>
                        ))}
                      </div>
                      {hwResult.penmanship.strengths && <p className="text-xs text-green-700 font-medium mb-1">💪 {hwResult.penmanship.strengths}</p>}
                      {hwResult.penmanship.tips && <p className={`text-xs font-medium ${layoutMode === 'dark' ? 'text-cyan-400' : 'text-violet-600'}`}>💡 {hwResult.penmanship.tips}</p>}
                      <button onClick={() => setHwResult(null)} className="text-[11px] text-slate-400 hover:text-slate-600 font-bold mt-1" aria-label="Dismiss penmanship feedback">Dismiss</button>
                    </div>
                  )}
                  {/* Per-paragraph strength indicator + vocab reminder */}
                  {p.text.length > 0 && (
                    <div className={`px-4 py-1.5 border-t flex flex-wrap items-center gap-3 text-[11px] font-medium ${
                      layoutMode === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}>
                      <span>{paragraphStats[idx]?.wordCount || 0} words</span>
                      <span>·</span>
                      <span>{paragraphStats[idx]?.sentenceCount || 0} sentences</span>
                      <span>·</span>
                      <span className={paragraphStats[idx]?.vocabUsed > 0 ? 'text-green-500' : 'text-slate-400'}>{paragraphStats[idx]?.vocabUsed || 0} vocab terms</span>
                      {overusedWords.length > 0 && p.text.toLowerCase().split(/\s+/).some(w => overusedWords.includes(w.replace(/[^a-z'-]/g, ''))) && (
                        <span className="text-amber-500" title={`Overused: ${overusedWords.join(', ')}`}>· Repeated words</span>
                      )}
                      {sentenceVariety[idx] && !sentenceVariety[idx].varied && (
                        <span className="text-orange-500" title={sentenceVariety[idx].issues.join('; ')}>· Vary sentences</span>
                      )}
                    </div>
                  )}
                  {/* Vocab still needed — shows unused terms as a gentle reminder */}
                  {vocabTerms.length > 0 && (() => {
                    const allText = paragraphs.map(pp => pp.text).join(' ').toLowerCase();
                    const unused = vocabTerms.filter(v => !allText.includes(v.term.toLowerCase()));
                    if (unused.length === 0 || unused.length === vocabTerms.length) return null;
                    return (
                      <div className={`px-4 py-1.5 border-t text-[11px] ${
                        layoutMode === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-600' : 'bg-rose-50/50 border-rose-100 text-rose-400'
                      }`}>
                        <span className="font-bold">Still needed: </span>
                        {unused.map((v, vi) => (
                          <span key={vi}>
                            <button
                              onClick={() => { navigator.clipboard?.writeText(v.term); if (addToast) addToast(`"${v.term}" copied!`, 'success'); }}
                              className={`font-bold underline decoration-dotted cursor-pointer ${layoutMode === 'dark' ? 'text-cyan-500 hover:text-cyan-300' : 'text-rose-600 hover:text-rose-800'}`}
                              title={v.definition || 'Click to copy'}
                            >{v.term}</button>
                            {vi < unused.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  {/* Grammar/Style results */}
                  {grammarResults[p.id] && grammarResults[p.id].length > 0 && (
                    <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 space-y-1.5">
                      {grammarResults[p.id].map((issue, gi) => (
                        <div key={gi} className="flex items-start gap-2 text-[11px]">
                          <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold uppercase ${
                            issue.type === 'grammar' ? 'bg-red-100 text-red-700' :
                            issue.type === 'show_dont_tell' ? 'bg-purple-100 text-purple-700' :
                            issue.type === 'weak_verb' ? 'bg-amber-100 text-amber-700' :
                            issue.type === 'passive' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{issue.type === 'show_dont_tell' ? 'show' : issue.type?.replace('_', ' ') || 'tip'}</span>
                          <div className="flex-1">
                            {issue.original && <span className="line-through text-slate-400 mr-1">"{issue.original}"</span>}
                            {issue.suggestion && <span className="text-emerald-700 font-bold">→ "{issue.suggestion}"</span>}
                            {issue.tip && <div className="text-slate-600 mt-0.5">{issue.tip}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transition suggestion */}
                {idx < paragraphs.length - 1 && suggestTransition(idx + 1) && (
                  <div className="flex items-center justify-center py-1">
                    <button
                      onClick={() => updateParagraph(idx + 1, suggestTransition(idx + 1) + ' ')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-600 font-medium hover:bg-indigo-50 px-3 py-1 rounded-full transition-colors"
                      title="Click to insert this transition word"
                    >
                      Tip: Start next paragraph with "{suggestTransition(idx + 1)}"
                    </button>
                  </div>
                )}
                </React.Fragment>
              ))}

              {!focusMode && paragraphs.length < maxParagraphs && (
                <button onClick={addParagraph} className="w-full p-3 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold text-sm hover:border-rose-400 hover:text-rose-500 transition-colors flex items-center justify-center gap-2">
                  <Plus size={16} /> Add Paragraph
                </button>
              )}
            </div>
          )}

          {/* ═══ ILLUSTRATE PHASE ═══ */}
          {phase === 'illustrate' && (
            <div className={`space-y-4 ${animClass}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Illustrate Your Story</h3>
                  <p className="text-slate-600 text-sm mt-1">AI will create artwork for each paragraph</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={generateCoverArt}
                    disabled={isProcessing || coverArtLoading}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-xs font-bold hover:bg-purple-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles size={14} /> {coverArtLoading ? 'Generating...' : coverArt ? 'Redo Cover' : 'Cover Art'}
                  </button>
                  <button
                    onClick={illustrateAll}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-purple-600 text-white rounded-full text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <ImageIcon size={14} /> {isProcessing ? 'Generating...' : 'Illustrate All'}
                  </button>
                </div>
              </div>

              {/* Cover Art Preview */}
              {(coverArt || coverArtLoading) && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-4 text-center">
                  <div className="text-[11px] font-bold text-purple-500 uppercase tracking-widest mb-2">Book Cover</div>
                  {coverArtLoading ? (
                    <div className="w-48 h-48 mx-auto bg-purple-100 rounded-xl flex items-center justify-center border-2 border-dashed border-purple-300">
                      <RefreshCw size={32} className="text-purple-400 animate-spin" />
                    </div>
                  ) : coverArt && (
                    <img src={coverArt} alt="Book cover" className="max-w-xs mx-auto rounded-xl shadow-lg border-2 border-purple-200" />
                  )}
                </div>
              )}

              {/* Image Prompt Preview Modal */}
              {promptPreview && (
                <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Eye size={14} /> Preview Image Prompt — Paragraph {promptPreview.idx + 1}
                  </div>
                  <p className="text-[11px] text-slate-600 mb-2">Edit the prompt below before generating, or click Generate to proceed.</p>
                  <textarea
                    value={promptPreview.prompt}
                    onChange={(e) => setPromptPreview(prev => ({ ...prev, prompt: e.target.value }))}
                    className="w-full text-sm p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none resize-none h-20"
                    aria-label="Image generation prompt"
                  />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => confirmIllustration()} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-2">
                      <ImageIcon size={14} /> Generate Image
                    </button>
                    <button onClick={() => setPromptPreview(null)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {paragraphs.map((p, idx) => (
                <div key={p.id} className="bg-white rounded-2xl border-2 border-purple-100 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-purple-600 mb-1">Paragraph {idx + 1}</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{p.text || <span className="italic text-slate-400">Empty paragraph</span>}</p>
                      {/* Show the prompt used */}
                      {illustrations[p.id]?.prompt && !illustrations[p.id]?.isLoading && (
                        <div className="mt-2 text-[11px] text-purple-400 italic truncate" title={illustrations[p.id].prompt}>
                          Prompt: {illustrations[p.id].prompt.substring(0, 80)}...
                        </div>
                      )}
                    </div>
                    <div className="w-48 shrink-0">
                      {illustrations[p.id]?.isLoading ? (
                        <div className="w-48 h-36 bg-purple-50 rounded-xl flex items-center justify-center border-2 border-dashed border-purple-200">
                          <RefreshCw size={24} className="text-purple-400 animate-spin" />
                        </div>
                      ) : illustrations[p.id]?.imageUrl ? (
                        <div className="relative group">
                          <img src={illustrations[p.id].imageUrl} alt={`Illustration ${idx + 1}`} className="w-48 rounded-xl shadow-md border border-purple-100" />
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {illustrations[p.id]?.previousImageUrl && (
                              <button
                                onClick={() => undoIllustration(p.id)}
                                className="p-1.5 bg-white/90 rounded-full shadow-md hover:bg-amber-100"
                                title="Undo — restore previous illustration"
                                aria-label="Undo illustration"
                              >
                                <ArrowLeft size={12} className="text-amber-600" />
                              </button>
                            )}
                            <button
                              onClick={() => setImageEditState({ paragraphId: p.id, prompt: '' })}
                              className="p-1.5 bg-white/90 rounded-full shadow-md hover:bg-teal-100"
                              title="Edit illustration with AI"
                              aria-label="Edit illustration"
                            >
                              <Sparkles size={12} className="text-teal-600" />
                            </button>
                            <button
                              onClick={() => regenerateIllustration(p.id, p.text, idx)}
                              disabled={isProcessing}
                              className="p-1.5 bg-white/90 rounded-full shadow-md hover:bg-purple-100"
                              title="Regenerate illustration"
                              aria-label="Regenerate illustration"
                            >
                              <RefreshCw size={12} className="text-purple-600" />
                            </button>
                          </div>
                          {/* Image edit input */}
                          {imageEditState?.paragraphId === p.id && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-2 border-t border-purple-200 rounded-b-xl">
                              <input
                                type="text"
                                value={imageEditState.prompt}
                                onChange={(e) => setImageEditState(prev => ({ ...prev, prompt: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter' && imageEditState.prompt.trim()) refineIllustration(p.id, imageEditState.prompt); }}
                                placeholder="e.g., make sky purple, add a dog..."
                                className="w-full text-[11px] p-1.5 border border-purple-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-300"
                                aria-label="Describe illustration changes"
                                autoFocus
                              />
                              <div className="flex gap-1 mt-1">
                                <button onClick={() => { if (imageEditState.prompt.trim()) refineIllustration(p.id, imageEditState.prompt); }} disabled={!imageEditState.prompt.trim()} className="flex-1 text-[11px] font-bold bg-teal-600 text-white rounded py-1 hover:bg-teal-700 disabled:opacity-40">Apply</button>
                                <button onClick={() => setImageEditState(null)} className="text-[11px] font-bold bg-slate-200 text-slate-600 rounded py-1 px-2 hover:bg-slate-300">Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : illustrations[p.id]?.error ? (
                        <div className="w-48 h-28 bg-red-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-red-200 gap-1">
                          <span className="text-red-400 text-lg">{'\u26A0\uFE0F'}</span>
                          <span className="text-[11px] font-bold text-red-500">Generation failed</span>
                          <button
                            onClick={() => { setIllustrations(prev => ({ ...prev, [p.id]: {} })); illustrateParagraph(p.id, p.text, idx); }}
                            disabled={isProcessing}
                            className="text-[11px] font-bold text-red-600 hover:text-red-800 underline disabled:opacity-40"
                          >
                            Try Again
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => illustrateParagraph(p.id, p.text, idx)}
                            disabled={p.text.trim().length < 20 || isProcessing}
                            className="w-48 h-28 bg-purple-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-100 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <ImageIcon size={24} className="text-purple-400 mb-1" />
                            <span className="text-xs font-bold text-purple-500">Auto-Generate</span>
                          </button>
                          <button
                            onClick={() => generateImagePrompt(p.id, p.text, idx)}
                            disabled={p.text.trim().length < 20 || isProcessing}
                            className="w-48 py-1.5 bg-purple-100 rounded-lg text-[11px] font-bold text-purple-600 hover:bg-purple-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                          >
                            <Eye size={10} /> Preview Prompt First
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ NARRATE PHASE ═══ */}
          {phase === 'narrate' && (
            <div className={`space-y-4 ${animClass}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Narrate Your Story</h3>
                  <p className="text-slate-600 text-sm mt-1">AI reads your story aloud — or record your own voice</p>
                </div>
                <div className="flex gap-2 items-center">
                  {/* Voice selector */}
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="sf-voice" className="text-[11px] font-bold text-indigo-500 uppercase">Voice:</label>
                    <select
                      id="sf-voice"
                      value={narratorVoice}
                      onChange={(e) => setNarratorVoice(e.target.value)}
                      className="text-xs p-1 border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-300 outline-none font-bold text-indigo-700"
                    >
                      {VOICE_POOL.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  {characters.length === 0 && (
                    <button onClick={detectCharacters} disabled={isProcessing} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold hover:bg-indigo-200 transition-colors disabled:opacity-50 flex items-center gap-2">
                      <Eye size={14} /> Detect Characters
                    </button>
                  )}
                  <button onClick={narrateAll} disabled={isProcessing} className="px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <Volume2 size={14} /> {isProcessing ? 'Narrating...' : 'Narrate All'}
                  </button>
                  <button
                    onClick={() => { if (playbackIdx === -1) { setSentenceIdx(0); setPlaybackIdx(0); } else { setPlaybackIdx(-1); setSentenceIdx(0); } }}
                    className="px-4 py-2 bg-green-600 text-white rounded-full text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Play size={14} /> {playbackIdx >= 0 ? 'Stop' : 'Play All'}
                  </button>
                </div>
              </div>

              {/* Characters detected */}
              {characters.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Characters Detected</div>
                  <div className="flex flex-wrap gap-3">
                    {characters.map((c, i) => (
                      <div key={i} className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs">
                        <span className="font-bold text-indigo-800">{c.name}</span>
                        <span className="text-slate-400 ml-2">Voice: {c.voice}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paragraphs.map((p, idx) => {
                const seg = audioSegments[p.id];
                const isCurrentPlayback = playbackIdx === idx;
                const hasSentenceAudio = seg?.sentenceAudios && seg.sentenceAudios.length > 0;
                const displaySentences = hasSentenceAudio ? seg.sentences : splitSentences(p.text);
                return (
                  <div key={p.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 transition-colors ${isCurrentPlayback ? 'border-green-400 bg-green-50/30' : 'border-indigo-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-600">Paragraph {idx + 1} {isCurrentPlayback && '\u25B6 Playing'}</span>
                      <div className="flex gap-2">
                        {/* AI Narrate button */}
                        {hasSentenceAudio ? (
                          <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> AI Narrated ({seg.sentenceAudios.filter(Boolean).length} sentences)</span>
                        ) : seg?.aiLoading ? (
                          <span className="text-xs text-indigo-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Generating...</span>
                        ) : (
                          <button onClick={() => narrateParagraph(p.id, p.text)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                            <Volume2 size={12} /> Narrate
                          </button>
                        )}
                        {/* Play this paragraph */}
                        {hasSentenceAudio && (
                          <button
                            onClick={() => {
                              if (isCurrentPlayback) { setPlaybackIdx(-1); setSentenceIdx(0); }
                              else { setPlaybackIdx(idx); setSentenceIdx(0); }
                            }}
                            className="text-xs font-bold text-green-600 hover:text-green-800 flex items-center gap-1"
                          >
                            <Play size={12} /> {isCurrentPlayback ? 'Stop' : 'Play'}
                          </button>
                        )}
                        {/* Record button */}
                        <button
                          onClick={() => recordingParagraphId === p.id ? stopRecordingParagraph() : startRecordingParagraph(p.id)}
                          className={`text-xs font-bold flex items-center gap-1 transition-colors ${
                            recordingParagraphId === p.id ? 'text-red-600 animate-pulse' : 'text-rose-500 hover:text-rose-700'
                          }`}
                        >
                          <Mic size={12} /> {recordingParagraphId === p.id ? 'Stop' : seg?.studentAudioUrl ? 'Re-record' : 'Record'}
                        </button>
                        {/* ORF Fluency Reading button */}
                        {onAnalyzeFluency && (
                          <button
                            onClick={() => fluencyReadingId === p.id ? stopFluencyReading(p.id, p.text) : startFluencyReading(p.id)}
                            className={`text-xs font-bold flex items-center gap-1 transition-colors ${
                              fluencyReadingId === p.id && fluencyRecording ? 'text-orange-600 animate-pulse' : 'text-teal-500 hover:text-teal-700'
                            }`}
                            aria-label={fluencyReadingId === p.id ? 'Stop fluency reading' : 'Read aloud for fluency practice'}
                          >
                            <BookOpen size={12} /> {fluencyReadingId === p.id && fluencyRecording ? 'Stop Reading' : '📖 Read Aloud'}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Karaoke-style sentence rendering */}
                    <p className="text-sm leading-relaxed">
                      {displaySentences.map((sentence, sIdx) => {
                        const isActiveSentence = isCurrentPlayback && sentenceIdx === sIdx;
                        return (
                          <span
                            key={sIdx}
                            className={`transition-all duration-300 ${
                              isActiveSentence
                                ? 'bg-yellow-200 text-green-900 font-semibold rounded px-0.5 py-0.5 shadow-sm'
                                : isCurrentPlayback && sIdx < sentenceIdx
                                  ? 'text-green-700/60'
                                  : 'text-slate-700'
                            }`}
                            style={isActiveSentence ? { boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' } : undefined}
                          >
                            {sentence}{' '}
                          </span>
                        );
                      })}
                    </p>
                    {seg?.studentAudioUrl && (
                      <div className="mt-2">
                        <audio controls src={seg.studentAudioUrl} className="w-full h-8" />
                      </div>
                    )}
                    {/* ORF Fluency Results */}
                    {fluencyResult && fluencyResult.paragraphId === p.id && (
                      <div className="mt-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-center">
                            <div className={`text-2xl font-black ${fluencyResult.accuracy >= 90 ? 'text-green-600' : fluencyResult.accuracy >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{fluencyResult.accuracy || 0}%</div>
                            <div className="text-[11px] text-slate-600 font-bold">Accuracy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-indigo-600">{fluencyResult.wcpm || 0}</div>
                            <div className="text-[11px] text-slate-600 font-bold">WCPM</div>
                          </div>
                          {fluencyResult.confidence && (
                            <div className="text-center">
                              <div className={`text-2xl font-black ${fluencyResult.confidence.overall >= 7 ? 'text-green-600' : fluencyResult.confidence.overall >= 4 ? 'text-amber-600' : 'text-red-600'}`}>{fluencyResult.confidence.overall}/10</div>
                              <div className="text-[11px] text-slate-600 font-bold">Confidence</div>
                            </div>
                          )}
                          {fluencyResult.prosody && (
                            <div className="flex gap-2 ml-auto">
                              {[{k:'pacing',l:'Pace'},{k:'expression',l:'Expr'},{k:'phrasing',l:'Phrase'}].map(({k,l}) => (
                                <div key={k} className="text-center">
                                  <div className="text-sm font-bold text-slate-700">{fluencyResult.prosody[k]}/5</div>
                                  <div className="text-[11px] text-slate-400">{l}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Word-by-word display */}
                        {fluencyResult.wordData && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {fluencyResult.wordData.map((w, wi) => (
                              <span key={wi} title={w.said ? `Said: "${w.said}"${w.lowConfidence ? ' (⚠ uncertain)' : ''}` : (w.lowConfidence ? '⚠ AI uncertain' : '')}
                                className={`px-1 py-0.5 rounded text-xs font-medium ${w.lowConfidence ? 'ring-1 ring-amber-400 ' : ''}${
                                  w.status === 'correct' ? 'text-green-700 bg-green-100' :
                                  w.status === 'missed' ? 'text-white bg-red-500' :
                                  w.status === 'stumbled' ? 'text-amber-800 bg-amber-100' :
                                  w.status === 'self_corrected' ? 'text-blue-700 bg-blue-100' :
                                  w.status === 'mispronounced' ? 'text-red-700 bg-red-100' : 'text-slate-600'
                                }`}>{w.word}</span>
                            ))}
                          </div>
                        )}
                        {/* Confidence note */}
                        {fluencyResult.confidence?.note && (
                          <div className="mt-2 text-[11px] text-slate-600 italic">{fluencyResult.confidence.note}</div>
                        )}
                        {fluencyResult.confidence?.accentDetected && (
                          <div className="mt-1 text-[11px] text-teal-600 font-medium">🌍 Accent patterns detected — scores adjusted conservatively to respect linguistic diversity.</div>
                        )}
                        {fluencyResult.feedback && (
                          <div className="mt-2 text-xs text-teal-800 bg-white rounded-lg p-2 border border-teal-200">{fluencyResult.feedback}</div>
                        )}
                        <button onClick={() => setFluencyResult(null)} className="mt-2 text-[11px] text-slate-400 hover:text-slate-600 font-bold">Dismiss</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ REVIEW PHASE ═══ */}
          {phase === 'review' && (
            <div className={`space-y-6 ${animClass}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Review & Feedback</h3>
                  <p className="text-slate-600 text-sm mt-1">Draft #{draftCount} — Get AI feedback on your story</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!gradingResult && (
                    <button onClick={checkSenses} disabled={sensesLoading || isProcessing} className="px-4 py-2.5 bg-rose-100 text-rose-700 rounded-full text-sm font-bold hover:bg-rose-200 transition-colors disabled:opacity-50 flex items-center gap-2 border border-rose-200" title="Check sensory imagery (sight, sound, smell, etc.)">
                      🌈 {sensesLoading ? 'Checking...' : 'Senses Check'}
                    </button>
                  )}
                  {!gradingResult && (
                    <button onClick={gradeStory} disabled={isProcessing || (!selfAssessmentSubmitted)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2" title={!selfAssessmentSubmitted ? 'Complete or skip self-assessment first' : 'Get AI feedback'}>
                      <Sparkles size={16} /> {isProcessing ? 'Grading...' : 'Get Feedback'}
                    </button>
                  )}
                  {gradingResult && (
                    <button onClick={reviseStory} className="px-5 py-2.5 bg-amber-500 text-white rounded-full text-sm font-bold hover:bg-amber-600 transition-colors flex items-center gap-2">
                      <RefreshCw size={16} /> Revise Story
                    </button>
                  )}
                </div>
              </div>

              {/* ═══ Pre-grade Self-Assessment ═══ */}
              {!gradingResult && !selfAssessmentSubmitted && (
                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-base font-black text-violet-800 flex items-center gap-2">
                        <Star size={18} /> Self-Assessment First
                      </h4>
                      <p className="text-xs text-violet-700 mt-1">Rate your own story on each criterion (1-5) before the AI grades it. This builds reflection skills.</p>
                    </div>
                    <button
                      onClick={() => { setSelfAssessmentSubmitted(true); sfAnnounce('Self-assessment skipped. AI grading is now available.'); }}
                      className="text-[11px] text-violet-500 hover:text-violet-700 font-bold underline shrink-0"
                    >
                      Skip self-assessment
                    </button>
                  </div>
                  <div className="space-y-2">
                    {getRubricCriteria().map((c) => (
                      <div key={c} className="flex items-center gap-3 bg-white border border-violet-100 rounded-xl px-3 py-2">
                        <label htmlFor={`sf-self-${c}`} className="text-xs font-bold text-violet-800 flex-1 min-w-0 truncate">{c}</label>
                        <input
                          id={`sf-self-${c}`}
                          type="range" min="1" max="5" step="1"
                          value={selfAssessment[c] || 3}
                          onChange={(e) => setSelfAssessment(prev => ({ ...prev, [c]: parseInt(e.target.value, 10) }))}
                          className="w-32 accent-violet-600"
                          aria-label={`Self-rating for ${c}: ${selfAssessment[c] || 3} out of 5`}
                        />
                        <div className="bg-violet-100 text-violet-800 text-xs font-black px-2 py-0.5 rounded-full min-w-[2.25rem] text-center">
                          {selfAssessment[c] || 3}/5
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      // Fill any unset criteria with 3 (the slider's visual default) so comparison works.
                      const filled = {};
                      getRubricCriteria().forEach(c => { filled[c] = selfAssessment[c] || 3; });
                      setSelfAssessment(filled);
                      setSelfAssessmentSubmitted(true);
                      sfAnnounce('Self-assessment submitted. You can now get AI feedback.');
                      awardXP(8, 'Completed self-assessment');
                    }}
                    className="mt-3 px-4 py-2 bg-violet-600 text-white rounded-full text-xs font-bold hover:bg-violet-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 size={14} /> Submit Self-Assessment
                  </button>
                </div>
              )}

              {/* ═══ Senses Check Result ═══ */}
              {sensesResult && (
                <div className="bg-white border-2 border-rose-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">🌈 Senses & Imagery</h4>
                    <button onClick={() => setSensesResult(null)} className="text-[11px] text-slate-400 hover:text-slate-700 font-bold" aria-label="Dismiss senses result">Dismiss</button>
                  </div>
                  {(() => {
                    const counts = sensesResult.counts || {};
                    const max = Math.max(1, ...Object.values(counts).map(n => Number(n) || 0));
                    const SENSE_LABELS = { sight: '👁️ Sight', sound: '👂 Sound', smell: '👃 Smell', taste: '👅 Taste', touch: '✋ Touch', motion: '🏃 Motion', emotion: '💗 Emotion' };
                    return (
                      <div className="space-y-1.5">
                        {Object.entries(SENSE_LABELS).map(([k, label]) => {
                          const n = Number(counts[k]) || 0;
                          const pct = (n / max) * 100;
                          const isStrongest = sensesResult.strongest === k;
                          const isMissing = sensesResult.missing === k;
                          return (
                            <div key={k} className="flex items-center gap-2">
                              <div className="text-xs font-bold text-slate-700 w-24 shrink-0">{label}</div>
                              <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${isStrongest ? 'bg-teal-500' : isMissing ? 'bg-amber-400' : 'bg-rose-300'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="text-xs text-slate-700 font-bold w-8 text-right">{n}</div>
                              {isStrongest && <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-full">strongest</span>}
                              {isMissing && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">missing</span>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {sensesResult.suggestion && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-900 leading-relaxed">
                      <strong>Try this:</strong> {sensesResult.suggestion}
                    </div>
                  )}
                </div>
              )}

              {/* Character Name Consistency */}
              {characterIssues.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-2">Character Name Check</h4>
                  <div className="space-y-1">
                    {characterIssues.map((issue, i) => (
                      <div key={i} className="text-xs text-orange-800">
                        Did you mean <strong>"{issue.expected}"</strong> instead of <span className="line-through text-orange-500">"{issue.found}"</span>?
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-orange-500 mt-2">Tip: Check your character names are spelled consistently throughout the story</p>
                </div>
              )}

              {/* Revision Delta */}
              {revisionSnapshot && draftCount >= 2 && (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Revision Progress (vs. Draft #{draftCount - 1})</div>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const wordDelta = totalWords - (revisionSnapshot.words || 0);
                      const vocabDelta = vocabUsedCount - (revisionSnapshot.vocabUsed || 0);
                      return (
                        <>
                          <span className={`text-xs font-bold ${wordDelta > 0 ? 'text-green-600' : wordDelta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {wordDelta > 0 ? '+' : ''}{wordDelta} words
                          </span>
                          <span className={`text-xs font-bold ${vocabDelta > 0 ? 'text-green-600' : vocabDelta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {vocabDelta > 0 ? '+' : ''}{vocabDelta} vocab terms
                          </span>
                          {readingLevel && revisionSnapshot.grade && (
                            <span className="text-xs font-bold text-indigo-600">
                              Grade level: {revisionSnapshot.grade} → {readingLevel.grade}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Writing Analytics */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Writing Analytics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-2xl font-black text-slate-800">{totalWords}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Words</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-2xl font-black text-slate-800">{readingLevel?.sentences || 0}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Sentences</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-2xl font-black text-slate-800">{paragraphs.length}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Paragraphs</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-2xl font-black text-slate-800">{vocabUsedCount}/{vocabTerms.length}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Vocab Used</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className={`text-2xl font-black ${readingLevel ? 'text-indigo-600' : 'text-slate-300'}`}>
                      {readingLevel ? `${readingLevel.grade}` : '—'}
                    </div>
                    <div className="text-[11px] text-slate-600 font-bold">Reading Grade</div>
                  </div>
                </div>
                {readingLevel && (
                  <div className="mt-3 text-xs text-slate-600">
                    Avg {readingLevel.avgWordsPerSentence} words/sentence · Flesch-Kincaid Grade Level: {readingLevel.grade}
                    {gradeLevel && <span>{readingLevel.grade <= parseInt(gradeLevel) + 1 ? ' · ✓ On target' : ' · ⚠ May be above target level'}</span>}
                  </div>
                )}

                {/* Story Arc Visualization */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">Story Arc</div>
                  <div className="flex items-end gap-1 h-16">
                    {paragraphs.map((p, idx) => {
                      const wordCount = p.text.trim().split(/\s+/).filter(Boolean).length;
                      const maxWords = Math.max(...paragraphs.map(pp => pp.text.trim().split(/\s+/).filter(Boolean).length), 1);
                      const heightPct = Math.max(8, (wordCount / maxWords) * 100);
                      const isMiddle = idx > 0 && idx < paragraphs.length - 1;
                      const bgColor = idx === 0 ? 'bg-blue-500' : idx === paragraphs.length - 1 ? 'bg-orange-500' : isMiddle ? 'bg-slate-500' : 'bg-slate-300';
                      const barLabel = idx === 0 ? 'Beginning' : idx === paragraphs.length - 1 ? 'Resolution' : `Paragraph ${idx + 1}`;
                      return (
                        <div key={p.id} className="flex-1 flex flex-col items-center gap-1">
                          <div className="text-[7px] text-slate-600 font-bold">{wordCount}</div>
                          <div className={`w-full ${bgColor} rounded-t-md transition-all`} style={{ height: `${heightPct}%` }} title={`${barLabel}: ${wordCount} words`} role="img" aria-label={`${barLabel}: ${wordCount} words`} />
                          <span className="text-[11px] text-slate-400">{idx === 0 ? 'Start' : idx === paragraphs.length - 1 ? 'End' : `P${idx + 1}`}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Beginning</span><span>Rising Action</span><span>Climax</span><span>Resolution</span>
                  </div>
                </div>
              </div>

              {/* Word Frequency Analysis */}
              {wordFrequency.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Word Frequency</h4>
                  <div className="flex flex-wrap gap-2">
                    {wordFrequency.slice(0, 12).map(([word, count]) => (
                      <div key={word} className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                        count >= 4 ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`} title={`"${word}" used ${count} times`}>
                        {word} <span className="text-[11px] opacity-60">×{count}</span>
                      </div>
                    ))}
                  </div>
                  {overusedWords.length > 0 && (
                    <p className="mt-2 text-[11px] text-amber-600 font-medium">
                      Tip: Try varying your word choice — <strong>{overusedWords.join(', ')}</strong> {overusedWords.length === 1 ? 'appears' : 'appear'} 4+ times. Use synonyms for variety!
                    </p>
                  )}
                </div>
              )}

              {!gradingResult && !isProcessing && (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center">
                  <Star size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 font-bold">Click "Get Feedback" to receive AI-powered Glow & Grow feedback on your story</p>
                </div>
              )}

              {isProcessing && (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-12 text-center">
                  <RefreshCw size={48} className="text-indigo-400 mx-auto mb-4 animate-spin" />
                  <p className="text-indigo-600 font-bold">Reading your story and preparing feedback...</p>
                </div>
              )}

              {gradingResult && (
                <div className="space-y-4">
                  {/* Score Badge */}
                  <div className="text-center">
                    <div className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-2xl text-2xl font-black shadow-lg">
                      {gradingResult.totalScore}
                    </div>
                  </div>

                  {/* Glow / Grow */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
                      <h4 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={16} /> Glow
                      </h4>
                      <p className="text-sm text-green-800 leading-relaxed">{gradingResult.feedback?.glow}</p>
                    </div>
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                      <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <HelpCircle size={16} /> Grow
                      </h4>
                      <p className="text-sm text-amber-800 leading-relaxed">{gradingResult.feedback?.grow}</p>
                    </div>
                  </div>

                  {/* Per-criteria scores (with optional side-by-side Self vs AI) */}
                  {gradingResult.scores && (
                    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700">Score Breakdown</h4>
                        {Object.keys(selfAssessment).length > 0 && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-3">
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-violet-400" /> You</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-indigo-500" /> AI</span>
                          </div>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {gradingResult.scores.map((s, i) => {
                          const aiScoreNum = (() => {
                            const m = String(s.score || '').match(/(\d+(?:\.\d+)?)/);
                            return m ? parseFloat(m[1]) : null;
                          })();
                          const selfScore = selfAssessment[s.criteria];
                          const showCompare = Object.keys(selfAssessment).length > 0 && selfScore != null && aiScoreNum != null;
                          const delta = showCompare ? (aiScoreNum - selfScore) : null;
                          return (
                            <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-800">{s.criteria}</div>
                                <div className="text-xs text-slate-600">{s.comment}</div>
                              </div>
                              {showCompare ? (
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full text-xs font-bold" title="Your self-rating">{selfScore}/5</div>
                                  <span className="text-slate-400 text-xs">→</span>
                                  <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold" title="AI score">{s.score}</div>
                                  {Math.abs(delta) >= 1 && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${delta > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`} title={delta > 0 ? 'AI rated higher than you did' : 'AI rated lower than you did'}>
                                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">{s.score}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Vocab usage */}
                  {gradingResult.vocabScores && (
                    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700">Vocabulary Usage</h4>
                      </div>
                      <div className="p-4 flex flex-wrap gap-2">
                        {gradingResult.vocabScores.map((vs, i) => (
                          <div key={i} className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                            vs.status === 'correct' ? 'bg-green-100 border-green-300 text-green-800' :
                            vs.status === 'partial' ? 'bg-amber-100 border-amber-300 text-amber-800' :
                            'bg-red-100 border-red-300 text-red-800'
                          }`} title={vs.comment}>
                            {vs.status === 'correct' ? '✓' : vs.status === 'partial' ? '~' : '✗'} {vs.term}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ EXPORT PHASE ═══ */}
          {phase === 'export' && (
            <div className={`space-y-6 ${animClass}`}>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-slate-800">Your Storybook is Ready!</h3>
                <p className="text-slate-600 text-sm mt-1">Preview your illustrated story and export it</p>
              </div>

              {/* Layout Toggle */}
              <div className="flex justify-center gap-2 mb-4">
                {Object.entries(LAYOUT_MODES).map(([key, m]) => (
                  <button
                    key={key}
                    onClick={() => setLayoutMode(key)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      layoutMode === key ? 'bg-amber-600 text-white shadow-md' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="bg-gradient-to-b from-amber-50 to-white border-2 border-amber-200 rounded-2xl overflow-hidden shadow-lg">
                <div className="text-center p-8 border-b border-amber-200 bg-gradient-to-r from-amber-100/50 to-rose-100/50">
                  {coverArt && <img src={coverArt} alt="Book cover" className="max-w-[200px] mx-auto rounded-xl shadow-lg mb-4 border-2 border-amber-200" />}
                  <h3 className="text-3xl font-black text-amber-900">{storyTitle || storyPrompt || sourceTopic || 'My Story'}</h3>
                  {authorName && <p className="text-amber-800 text-sm mt-1 font-bold">By {authorName}</p>}
                  <p className="text-amber-700 text-sm mt-1 italic">{GENRE_TEMPLATES[genre]?.label || 'Creative Writing'} · {vocabTerms.length} vocabulary terms</p>
                </div>

                {layoutMode === 'comic' ? (
                  /* ── Comic Panel Grid ── */
                  <div className="p-4 grid grid-cols-2 gap-3 bg-slate-900">
                    {paragraphs.map((p, idx) => (
                      <div key={p.id} className="bg-white rounded-lg overflow-hidden shadow-md relative" style={{ border: '3px solid #1e293b' }}>
                        {illustrations[p.id]?.imageUrl && (
                          <img src={illustrations[p.id].imageUrl} alt={`Panel ${idx + 1}`} className="w-full aspect-square object-cover" />
                        )}
                        {/* Sticker overlay */}
                        {panelStickers[p.id] && (
                          <div className="absolute top-2 right-2 text-3xl drop-shadow-lg select-none pointer-events-none" style={{ transform: 'rotate(12deg)' }}>
                            {panelStickers[p.id]}
                          </div>
                        )}
                        {/* SFX overlay */}
                        {(panelDialogue[p.id] || {}).sfx && (
                          <div className="absolute top-3 left-3 font-black text-red-500 text-lg drop-shadow-lg select-none pointer-events-none" style={{ transform: 'rotate(-8deg)', textShadow: '2px 2px 0 #fff, -1px -1px 0 #fff' }}>
                            {panelDialogue[p.id].sfx}
                          </div>
                        )}
                        <div className="p-2.5 relative space-y-1.5">
                          {/* Narration caption — yellow bar */}
                          {p.text.trim() && (
                            <div className="bg-amber-50 border border-amber-200 rounded-md px-2 py-1 text-[11px] text-amber-800 italic leading-snug">
                              {p.text.length > 200 ? p.text.substring(0, 200) + '...' : p.text}
                            </div>
                          )}
                          {/* Speech bubble */}
                          {(panelDialogue[p.id] || {}).speech && (
                            <div className="relative">
                              {(panelDialogue[p.id] || {}).speaker && (
                                <div className="text-[11px] font-bold text-blue-600 mb-0.5">{panelDialogue[p.id].speaker}:</div>
                              )}
                              <div className="bg-white border-2 border-slate-800 rounded-2xl p-2 text-xs text-slate-800 leading-relaxed" style={{ borderRadius: '18px' }}>
                                {panelDialogue[p.id].speech}
                              </div>
                              {/* Speech bubble tail */}
                              <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white border-b-2 border-r-2 border-slate-800" style={{ transform: 'rotate(45deg)' }} />
                            </div>
                          )}
                          {/* Thought bubble */}
                          {(panelDialogue[p.id] || {}).thought && (
                            <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-2 text-[11px] text-purple-700 italic leading-relaxed" style={{ borderRadius: '20px', borderStyle: 'dashed' }}>
                              💭 {panelDialogue[p.id].thought}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex gap-0.5">
                              {['💥', '❤️', '⭐', '😂', '😱', '🔥', '💀', '🌟'].map(emoji => (
                                <button key={emoji} onClick={() => setPanelStickers(prev => ({ ...prev, [p.id]: prev[p.id] === emoji ? null : emoji }))} className={`text-sm hover:scale-125 transition-transform ${panelStickers[p.id] === emoji ? 'scale-125' : 'opacity-50 hover:opacity-100'}`} title={`Add ${emoji} sticker`}>{emoji}</button>
                              ))}
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold">Panel {idx + 1}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* ── Prose Layout ── */
                  <div className="p-6 space-y-6">
                    {paragraphs.map((p, idx) => (
                      <div key={p.id} className="flex flex-col items-center gap-4">
                        {illustrations[p.id]?.imageUrl && (
                          <img src={illustrations[p.id].imageUrl} alt={`Scene ${idx + 1}`} className="max-w-md rounded-xl shadow-md" />
                        )}
                        <p className="text-sm text-slate-800 leading-relaxed max-w-lg text-center" style={{ textIndent: '2em', textAlign: 'left' }}>{p.text}</p>
                        {idx < paragraphs.length - 1 && <div className="text-amber-400 text-lg">—</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Achievement Badges */}
              <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Star size={16} /> Achievements ({earnedCount}/{achievements.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {achievements.map(a => (
                    <div key={a.id} className={`text-center p-2.5 rounded-xl border-2 transition-all ${
                      a.earned ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-50'
                    }`} title={a.desc}>
                      <div className="text-2xl">{a.icon}</div>
                      <div className="text-[11px] font-bold text-slate-700 mt-1">{a.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <button
                  onClick={exportStorybook}
                  className="px-8 py-4 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-2xl text-lg font-black hover:from-rose-700 hover:to-pink-700 transition-all shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-3"
                >
                  <Download size={24} /> Export Storybook
                </button>
                <button
                  onClick={exportSlideshow}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                >
                  <Play size={18} /> Slideshow
                </button>
                {liveSession && !isCanvasEnv && (
                  <button
                    onClick={shareToSession}
                    className="px-6 py-3 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2"
                  >
                    <Eye size={18} /> Share to Class
                  </button>
                )}
                {onSaveSubmission && (
                  <button
                    onClick={saveAsSubmission}
                    className="px-6 py-3 bg-amber-600 text-white rounded-2xl text-sm font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 flex items-center gap-2"
                  >
                    <Star size={18} /> Save to Portfolio
                  </button>
                )}
              </div>
              <p className="text-slate-400 text-xs text-center">Storybook & slideshow open in new tabs — print or save as PDF</p>

              {/* ── Class Portfolio Gallery (teacher view) ── */}
              {liveSession && !isCanvasEnv && (
                <div className="bg-white rounded-2xl border-2 border-violet-200 p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-violet-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Eye size={16} /> Class Portfolio
                  </h4>
                  <p className="text-xs text-slate-600 mb-3">Share your storybook to the class gallery so your teacher and classmates can view it. Teacher sees all shared stories as a gallery wall.</p>
                  <button
                    onClick={shareToSession}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors flex items-center gap-2"
                  >
                    <Star size={14} /> Publish to Class Gallery
                  </button>
                  <p className="text-[11px] text-violet-400 mt-2">Your cover art, title, word count, and grade will be visible to the class.</p>
                </div>
              )}

              {/* ── Pass the Torch — Collaborative JSON Save/Load ── */}
              <div className="bg-white rounded-2xl border-2 border-cyan-200 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <RefreshCw size={16} /> Pass the Torch
                </h4>
                <p className="text-xs text-slate-600 mb-3">Export your draft as a file and share it with a classmate — they can continue where you left off!</p>
                <div className="flex gap-3">
                  <button onClick={exportDraftJSON} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-colors flex items-center gap-2">
                    <Download size={14} /> Export Draft (.json)
                  </button>
                  <button onClick={importDraftJSON} className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg text-xs font-bold hover:bg-cyan-200 transition-colors flex items-center gap-2">
                    <Plus size={14} /> Import Classmate's Draft
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Navigation ── */}
      <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={goBack}
          disabled={phaseIdx === 0}
          className="px-5 py-2.5 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30 flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-xs text-slate-400 font-medium">
          {PHASE_LABELS[phaseIdx]} · Step {phaseIdx + 1} of {PHASES.length}
        </div>
        {phaseIdx < PHASES.length - 1 ? (
          <button
            onClick={goNext}
            disabled={!canGoNext()}
            className="px-5 py-2.5 rounded-full text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-rose-200"
          >
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={safeClose} className="px-5 py-2.5 rounded-full text-sm font-bold bg-slate-600 text-white hover:bg-slate-700 transition-colors flex items-center gap-2">
            Done <CheckCircle2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
});
