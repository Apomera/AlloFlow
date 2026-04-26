/**
 * AlloFlow PoetTree Module
 *
 * A poetry-writing workshop for middle-school and adolescent writers, with
 * built-in form scaffolds, syllable counting, rhyme-scheme detection, and
 * Gemini-powered feedback on imagery, meter, and revision opportunities.
 *
 * Designed for King Middle School pilot — grade-responsive, accessibility-first,
 * works for sighted and screen-reader users alike.
 *
 * Source: poet_tree_module.js
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.PoetTree) {
    console.log('[CDN] PoetTree already loaded, skipping');
    return;
  }

  // ── Live region (WCAG 4.1.3) ──
  (function () {
    if (document.getElementById('allo-live-poettree')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-poettree';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  function announcePT(msg) {
    try {
      var lr = document.getElementById('allo-live-poettree');
      if (lr) { lr.textContent = ''; setTimeout(function () { lr.textContent = msg; }, 50); }
    } catch (e) {}
  }

  // ── Reduced-motion CSS scoped to .pt-tool (defense-in-depth alongside host CSS) ──
  (function () {
    if (document.getElementById('pt-a11y-css')) return;
    var st = document.createElement('style');
    st.id = 'pt-a11y-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { .pt-tool *, .pt-tool *::before, .pt-tool *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  var warnLog = function () { console.warn.apply(console, ['[PoetTree]'].concat(Array.prototype.slice.call(arguments))); };

  // ── Constants ─────────────────────────────────────────────────────────
  var STORAGE_POEMS = 'alloPoetTreePoems';
  var STORAGE_PREFS = 'alloPoetTreePrefs';

  // Poetic forms — middle-school friendly progression from no-rules to structured.
  var FORMS = [
    {
      id: 'free',
      name: 'Free Verse',
      icon: '🌬️',
      tagline: 'No rules — just feeling and image.',
      structure: 'No required line count, no required rhyme, no required meter. Free verse is poetry that earns its shape from the words themselves.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: 'so much depends\nupon\n\na red wheel\nbarrow\n\nglazed with rain\nwater\n\nbeside the white\nchickens.\n\n— William Carlos Williams',
      tips: [
        'Cut anything that does not earn its place.',
        'Use line breaks to control the reader\'s breath.',
        'A specific image (the red wheelbarrow) beats a vague feeling (sadness).'
      ]
    },
    {
      id: 'haiku',
      name: 'Haiku',
      icon: '🍃',
      tagline: '3 lines. 5–7–5 syllables. A single moment.',
      structure: '3 lines. Line 1 has 5 syllables, line 2 has 7, line 3 has 5. Traditionally captures a single moment in nature, often with a turn or shift in line 3.',
      lineCount: 3,
      syllablesPerLine: [5, 7, 5],
      rhymeScheme: null,
      example: 'an old silent pond\na frog jumps into the pond —\nsplash! silence again.\n\n— Matsuo Bashō',
      tips: [
        'No need to rhyme — haiku rarely does in Japanese.',
        'A haiku is one moment, not a story.',
        'The third line often contains a surprise or a small shift in perspective.'
      ]
    },
    {
      id: 'limerick',
      name: 'Limerick',
      icon: '🍀',
      tagline: '5 lines, AABBA, funny.',
      structure: '5 lines. Lines 1, 2, and 5 rhyme (A) and have ~7–10 syllables. Lines 3 and 4 rhyme (B) and have ~5–7 syllables. Anapestic-leaning rhythm. Almost always humorous.',
      lineCount: 5,
      syllablesPerLine: [9, 9, 6, 6, 9],
      rhymeScheme: 'AABBA',
      example: 'There once was a man from Peru\nWho dreamed he was eating his shoe.\nHe woke in a fright\nIn the middle of the night\nAnd found that his dream had come true.',
      tips: [
        'The funnier the better. Limericks reward bold choices.',
        'Line 3 and 4 should set up the punch in line 5.',
        'Read it out loud to feel the rhythm.'
      ]
    },
    {
      id: 'sonnet',
      name: 'Sonnet (Shakespearean)',
      icon: '🎭',
      tagline: '14 lines, ABAB CDCD EFEF GG, iambic pentameter.',
      structure: '14 lines, divided into three quatrains (4 lines each) and a final couplet. Rhyme scheme: ABAB CDCD EFEF GG. Each line is roughly 10 syllables in iambic pentameter (unstressed-stressed × 5). The final couplet typically delivers a turn or insight.',
      lineCount: 14,
      syllablesPerLine: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      rhymeScheme: 'ABAB CDCD EFEF GG',
      example: 'Shall I compare thee to a summer\'s day?\nThou art more lovely and more temperate:\nRough winds do shake the darling buds of May,\nAnd summer\'s lease hath all too short a date.\n\n— Shakespeare, Sonnet 18',
      tips: [
        'Iambic pentameter sounds like a heartbeat: da-DUM da-DUM da-DUM da-DUM da-DUM.',
        'Use the final couplet for a turn — the volta — that resolves or twists the poem.',
        'Don\'t force rhymes; let the meaning lead.'
      ]
    },
    {
      id: 'ballad',
      name: 'Ballad',
      icon: '🪕',
      tagline: 'Tells a story. Quatrains, ABAB or ABCB.',
      structure: 'Stanzas of 4 lines (quatrains). Common rhyme scheme: ABAB or ABCB. Lines alternate longer (~8 syllables, tetrameter) and shorter (~6 syllables, trimeter). Tells a story, often with refrain.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: 'ABCB (per stanza)',
      example: 'It is an ancient Mariner,\nAnd he stoppeth one of three.\n"By thy long grey beard and glittering eye,\nNow wherefore stopp\'st thou me?"\n\n— Coleridge, "The Rime of the Ancient Mariner"',
      tips: [
        'A ballad is a poem that tells a story.',
        'A repeated line or phrase (refrain) gives it a song-like quality.',
        'Strong nouns and verbs do more work than adjectives.'
      ]
    },
    {
      id: 'found',
      name: 'Found Poetry',
      icon: '✂️',
      tagline: 'A poem made from words you didn\'t write.',
      structure: 'Take an existing text — a news article, a textbook page, a letter — and select words/phrases to form a poem. The art is in the selection and arrangement, not the original writing.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: 'From a cereal box:\n\nMade with whole grain.\nNo high fructose corn syrup.\nA part of\nThis complete\nBreakfast.',
      tips: [
        'Pick a source text with strong vocabulary and varied sentence structure.',
        'You can change line breaks freely. You cannot add words that aren\'t in the source.',
        'Found poetry can change the meaning of a text just by what you choose to keep.'
      ]
    },
    {
      id: 'acrostic',
      name: 'Acrostic',
      icon: '🔤',
      tagline: 'The first letters of each line spell a word or phrase.',
      structure: 'Pick a word (a name, a season, a feeling). Each line of the poem starts with the next letter of that word. The lines themselves describe or relate to the chosen word.',
      lineCount: null,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: 'Quiet at sunrise, before the day begins,\nUnder a sky still pale with stars,\nIt waits, the world, just for a moment,\nEvery breath held —\nThen morning happens.',
      tips: [
        'Pick a subject first (often a single word). Write that word vertically before you start.',
        'You don\'t need to rhyme — focus on filling each letter with an image.',
        'For a longer poem, use a phrase instead of a single word.'
      ]
    },
    {
      id: 'cinquain',
      name: 'Cinquain',
      icon: '🪆',
      tagline: '5 lines: 2–4–6–8–2 syllables. A small structure with a sting.',
      structure: '5 lines. Line 1 has 2 syllables, line 2 has 4, line 3 has 6, line 4 has 8, line 5 has 2. (Adelaide Crapsey form.) The final 2-syllable line often gives the poem its shape — a turn, a surprise, or a quiet conclusion.',
      lineCount: 5,
      syllablesPerLine: [2, 4, 6, 8, 2],
      rhymeScheme: null,
      example: 'Listen…\nWith faint dry sound,\nLike steps of passing ghosts,\nThe leaves, frost-crisp\'d, break from the trees\nAnd fall.\n\n— Adelaide Crapsey, "November Night"',
      tips: [
        'The two-syllable opening and closing lines work best when they hint at something larger.',
        'A cinquain doesn\'t have to rhyme. The shape does the work.',
        'Read it aloud — if a line feels rushed or stretched, count syllables again.'
      ]
    },
    {
      id: 'diamante',
      name: 'Diamante',
      icon: '💎',
      tagline: '7 lines, diamond-shaped. Often pairs opposites.',
      structure: '7 lines forming a diamond. Line 1: one noun (your starting topic). Line 2: two adjectives describing line 1. Line 3: three -ing verbs about line 1. Line 4: four nouns — the first two relate to line 1, the last two transition toward line 7. Line 5: three -ing verbs about line 7. Line 6: two adjectives describing line 7. Line 7: one contrasting (or related) noun.',
      lineCount: 7,
      syllablesPerLine: null,
      rhymeScheme: null,
      example: 'Day\nBright, busy\nRunning, laughing, working\nSunlight, voices — silence, shadows\nSettling, slowing, dreaming\nQuiet, cool\nNight',
      tips: [
        'Diamantes are great for opposites: hot/cold, summer/winter, love/hate, child/adult.',
        'The middle line (line 4) is the pivot — first two words belong to line 1, last two belong to line 7.',
        'Verbs end in -ing on lines 3 and 5. That repetition is the form\'s rhythm.'
      ]
    },
    {
      id: 'tanka',
      name: 'Tanka',
      icon: '🌸',
      tagline: 'Haiku\'s longer cousin: 5–7–5–7–7 syllables.',
      structure: '5 lines. Syllables per line: 5, 7, 5, 7, 7. Like haiku, often grounded in a sensory image — but with two extra lines that allow for emotion or reflection. The first three lines often paint the scene; the last two turn inward.',
      lineCount: 5,
      syllablesPerLine: [5, 7, 5, 7, 7],
      rhymeScheme: null,
      example: 'How shallow the snow,\nhow simple the moonlight on\nthe shoulders of stone —\nbut one breath caught in my chest\nremembers what cold can mean.',
      tips: [
        'The first 3 lines work like a haiku — image, breath, image.',
        'The last 2 lines (the "lower phrase") add emotion or a personal note.',
        'No need to rhyme — tanka relies on rhythm and image, not sound matching.'
      ]
    },
    {
      id: 'couplet',
      name: 'Couplet',
      icon: '🪞',
      tagline: 'Two lines that rhyme. The smallest finished poem.',
      structure: '2 lines (occasionally extended to multiple couplets). The two lines rhyme at the end (AA). Lines are usually similar in length and rhythm. A couplet is the simplest possible rhymed unit — and the building block of sonnets, ballads, and heroic verse.',
      lineCount: 2,
      syllablesPerLine: null,
      rhymeScheme: 'AA',
      example: 'Hope is the thing with feathers\nThat perches in the soul.\n\n(Famous opening — Emily Dickinson, slant rhyme)\n\nor:\n\nThe road was long, the morning new,\nThe world was waking, soft with dew.',
      tips: [
        'A couplet works because two ideas balance each other — consider what the second line ADDS to the first.',
        'You can chain couplets (AA BB CC…) into longer poems. Many epics are entirely couplets.',
        'Try writing a couplet as a small "thought of the day" exercise — low pressure, big payoff.'
      ]
    }
  ];

  // ── Syllable counter (heuristic, no dictionary) ──
  // Reasonably accurate for English. Counts vowel groups, adjusts for silent-e and common suffixes.
  function countSyllables(word) {
    if (!word) return 0;
    var w = String(word).toLowerCase().trim().replace(/[^a-z']/g, '');
    if (w.length === 0) return 0;
    if (w.length <= 3) return 1;
    // Strip silent e
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    // Strip trailing y as separate syllable trigger (cherry → 2)
    w = w.replace(/^y/, '');
    var matches = w.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  function countLineSyllables(line) {
    if (!line) return 0;
    var words = String(line).split(/\s+/).filter(Boolean);
    var total = 0;
    for (var i = 0; i < words.length; i++) total += countSyllables(words[i]);
    return total;
  }

  // ── Rhyme grouping (heuristic, last 2-3 phonemes) ──
  // Returns array of group letters (A, B, C…) per line based on last-word ending.
  function detectRhymeScheme(lines) {
    var endings = lines.map(function (line) {
      var trimmed = String(line || '').trim().replace(/[^\w\s']/g, '').toLowerCase();
      var words = trimmed.split(/\s+/).filter(Boolean);
      if (!words.length) return '';
      var last = words[words.length - 1];
      // Take last 3 chars as a rough rhyme key
      return last.length >= 3 ? last.slice(-3) : last;
    });
    var groups = [];
    var keys = [];
    var letters = 'ABCDEFGHIJKLMNOP';
    for (var i = 0; i < endings.length; i++) {
      if (!endings[i]) { groups.push(''); continue; }
      var found = -1;
      for (var k = 0; k < keys.length; k++) {
        // Match if endings share last 2-3 letters
        if (keys[k].slice(-2) === endings[i].slice(-2)) { found = k; break; }
      }
      if (found === -1) {
        keys.push(endings[i]);
        groups.push(letters[keys.length - 1] || '?');
      } else {
        groups.push(letters[found] || '?');
      }
    }
    return groups;
  }

  // ── Main Component ────────────────────────────────────────────────────
  var PoetTree = React.memo(function PoetTree(props) {
    var onClose = props.onClose;
    var onCallGemini = props.onCallGemini;
    var onCallTTS = props.onCallTTS;
    var onCallImagen = props.onCallImagen;
    var selectedVoice = props.selectedVoice;
    var gradeLevel = props.gradeLevel || '7th Grade';
    var addToast = props.addToast;
    var studentNickname = props.studentNickname || '';
    var handleScoreUpdate = props.handleScoreUpdate;

    var e = React.createElement;
    var useState = React.useState;
    var useCallback = React.useCallback;
    var useRef = React.useRef;
    var useEffect = React.useEffect;

    var TEAL = '#0d9488';
    var TEAL_LIGHT = '#f0fdfa';
    var TEAL_DARK = '#115e59';
    var AMBER = '#d97706';

    // ── State ──
    var _activeTab = useState('form'); var activeTab = _activeTab[0]; var setActiveTab = _activeTab[1];
    var _form = useState(null); var form = _form[0]; var setForm = _form[1];
    var _poemTitle = useState(''); var poemTitle = _poemTitle[0]; var setPoemTitle = _poemTitle[1];
    var _poemText = useState(''); var poemText = _poemText[0]; var setPoemText = _poemText[1];
    var _foundSource = useState(''); var foundSource = _foundSource[0]; var setFoundSource = _foundSource[1];

    // AI feedback state
    var _aiFeedback = useState(null); var aiFeedback = _aiFeedback[0]; var setAiFeedback = _aiFeedback[1];
    var _aiLoading = useState(false); var aiLoading = _aiLoading[0]; var setAiLoading = _aiLoading[1];
    var _meterAnalysis = useState(null); var meterAnalysis = _meterAnalysis[0]; var setMeterAnalysis = _meterAnalysis[1];
    var _meterLoading = useState(false); var meterLoading = _meterLoading[0]; var setMeterLoading = _meterLoading[1];

    // Performance state
    var _ttsPlaying = useState(false); var ttsPlaying = _ttsPlaying[0]; var setTtsPlaying = _ttsPlaying[1];
    // Read-aloud (silent recital) mode — large text, line-by-line, student paces themselves.
    var _readAloud = useState(false); var readAloudActive = _readAloud[0]; var setReadAloudActive = _readAloud[1];
    var _readIdx = useState(0); var readIdx = _readIdx[0]; var setReadIdx = _readIdx[1];
    var _readCount = useState(0); var readCountdown = _readCount[0]; var setReadCountdown = _readCount[1];
    var _emotion = useState('neutral'); var emotion = _emotion[0]; var setEmotion = _emotion[1];
    var _illustration = useState(null); var illustration = _illustration[0]; var setIllustration = _illustration[1];
    var _illusLoading = useState(false); var illusLoading = _illusLoading[0]; var setIllusLoading = _illusLoading[1];

    // Saved poems
    var _saved = useState(function () { try { return JSON.parse(localStorage.getItem(STORAGE_POEMS) || '[]'); } catch (e) { return []; } });
    var saved = _saved[0]; var setSaved = _saved[1];

    // Reading-friendly text mode (carry-over pattern from LitLab)
    var _largeText = useState(function () { try { var p = JSON.parse(localStorage.getItem(STORAGE_PREFS) || '{}'); return !!p.largeText; } catch (e) { return false; } });
    var largeText = _largeText[0]; var setLargeText = _largeText[1];

    var ttsCancelRef = useRef(false);

    // Writing helpers (Daily Prompt / Rhymes / Stronger Verbs)
    var _helpersOpen = useState(false); var helpersOpen = _helpersOpen[0]; var setHelpersOpen = _helpersOpen[1];
    var _dailyPrompt = useState(''); var dailyPrompt = _dailyPrompt[0]; var setDailyPrompt = _dailyPrompt[1];
    var _dailyPromptLoading = useState(false); var dailyPromptLoading = _dailyPromptLoading[0]; var setDailyPromptLoading = _dailyPromptLoading[1];
    var _rhymeQuery = useState(''); var rhymeQuery = _rhymeQuery[0]; var setRhymeQuery = _rhymeQuery[1];
    var _rhymeResults = useState(null); var rhymeResults = _rhymeResults[0]; var setRhymeResults = _rhymeResults[1];
    var _rhymeLoading = useState(false); var rhymeLoading = _rhymeLoading[0]; var setRhymeLoading = _rhymeLoading[1];
    var _verbSuggestions = useState(null); var verbSuggestions = _verbSuggestions[0]; var setVerbSuggestions = _verbSuggestions[1];
    var _verbLoading = useState(false); var verbLoading = _verbLoading[0]; var setVerbLoading = _verbLoading[1];

    // ── Persistence helpers ──
    var savePrefs = useCallback(function (next) {
      try { localStorage.setItem(STORAGE_PREFS, JSON.stringify(next)); } catch (e) {}
    }, []);

    var savePoem = useCallback(function () {
      if (!poemText.trim()) { addToast && addToast('Write something first!', 'info'); return; }
      var entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: poemTitle.trim() || 'Untitled',
        text: poemText,
        formId: form ? form.id : 'free',
        savedAt: new Date().toISOString()
      };
      var updated = [entry].concat(saved).slice(0, 50);
      setSaved(updated);
      try { localStorage.setItem(STORAGE_POEMS, JSON.stringify(updated)); } catch (e) {}
      addToast && addToast('Poem saved.', 'success');
      announcePT('Poem saved as "' + entry.title + '."');
    }, [poemText, poemTitle, form, saved, addToast]);

    var loadPoem = useCallback(function (entry) {
      setPoemTitle(entry.title || '');
      setPoemText(entry.text || '');
      var f = FORMS.find(function (ff) { return ff.id === entry.formId; });
      if (f) setForm(f);
      setActiveTab('write');
      announcePT('Loaded poem: ' + (entry.title || 'Untitled') + '.');
    }, []);

    var deletePoem = useCallback(function (id) {
      var updated = saved.filter(function (p) { return p.id !== id; });
      setSaved(updated);
      try { localStorage.setItem(STORAGE_POEMS, JSON.stringify(updated)); } catch (e) {}
    }, [saved]);

    // ── AI feedback ──
    var getAiFeedback = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setAiLoading(true);
      setAiFeedback(null);
      try {
        var formContext = form
          ? 'The student is writing in the form: ' + form.name + '. Structure: ' + form.structure
          : 'The form is open / free verse.';
        var isElem = /K|1st|2nd|3rd|4th|5th/i.test(gradeLevel);
        var isMid = /6th|7th|8th/i.test(gradeLevel);
        var gradeGuide = isElem
          ? 'Elementary student. Use simple, encouraging language. Praise specific images. Suggest one small revision.'
          : isMid
          ? 'Middle-school student. Be warm and specific. Identify the strongest line. Suggest one image-strengthening revision and one structural observation.'
          : 'High-school or older student. Engage seriously with craft. Identify strongest line, weakest line, and offer one targeted suggestion for each. Note any form adherence issues.';
        var prompt = 'You are a warm, encouraging poetry mentor giving feedback to a ' + gradeLevel + ' student.\n\n'
          + formContext + '\n\n'
          + 'The student\'s poem:\n"""\n' + poemText + '\n"""\n\n'
          + 'Title: ' + (poemTitle || '(untitled)') + '\n\n'
          + gradeGuide + '\n\n'
          + 'Return JSON: {"strongestLine":"<one line from the poem the student wrote>","strongestWhy":"<one sentence on why it works>","imagery":"<one sentence on the imagery: praise or strengthen>","formNotes":"<one sentence on adherence to ' + (form ? form.name : 'their chosen form') + '>","suggestion":"<one specific, kind, concrete revision idea — a word swap, a line cut, an image to add>","encouragement":"<one short closing sentence>"}\n\n'
          + 'Be specific and kind. Never invent lines that are not in the poem. Match vocabulary to ' + gradeLevel + '.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setAiFeedback(parsed);
        if (handleScoreUpdate) handleScoreUpdate(15, 'PoetTree feedback', 'poettree-feedback-' + entry_safe(poemTitle));
        announcePT('Feedback received.');
      } catch (err) {
        warnLog('AI feedback failed:', err && err.message);
        setAiFeedback({ error: 'Could not generate feedback. Try again in a moment.' });
        addToast && addToast('Feedback unavailable.', 'error');
      } finally {
        setAiLoading(false);
      }
    }, [onCallGemini, poemText, poemTitle, form, gradeLevel, handleScoreUpdate, addToast]);

    function entry_safe(s) { return String(s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30); }

    // ── Writing helpers ──

    var generateDailyPrompt = useCallback(async function () {
      if (!onCallGemini) return;
      setDailyPromptLoading(true);
      try {
        var formHint = form ? ' They are writing in the form: ' + form.name + '.' : '';
        var prompt = 'You are a creative-writing teacher for a ' + gradeLevel + ' student.' + formHint + ' Generate ONE inspiring poem prompt — concrete, image-rich, emotionally accessible, age-appropriate. Avoid abstractions. Avoid trauma topics unless gently. 1-2 sentences. Return only the prompt itself, no quotes, no preamble.';
        var result = await onCallGemini(prompt, false);
        var clean = String(result || '').trim().replace(/^["“]|["”]$/g, '').replace(/^prompt:\s*/i, '');
        setDailyPrompt(clean);
        announcePT('New writing prompt: ' + clean);
      } catch (err) {
        warnLog('Daily prompt failed:', err && err.message);
        addToast && addToast('Couldn\'t fetch a prompt right now.', 'error');
      } finally {
        setDailyPromptLoading(false);
      }
    }, [onCallGemini, form, gradeLevel, addToast]);

    var fetchRhymes = useCallback(async function () {
      if (!onCallGemini || !rhymeQuery.trim()) return;
      setRhymeLoading(true);
      setRhymeResults(null);
      try {
        var word = rhymeQuery.trim().toLowerCase().replace(/[^a-z'-]/g, '');
        var prompt = 'Return JSON: {"perfect":["..."],"slant":["..."]} — 6-8 perfect rhymes (same vowel and ending consonants) and 4-6 slant rhymes (similar but not exact) for the word "' + word + '". Skip vulgarity, slurs, and offensive words. Order each list from most useful to less useful for poetry. If no rhymes are possible (rare words), return both arrays empty.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setRhymeResults({ word: word, perfect: parsed.perfect || [], slant: parsed.slant || [] });
        announcePT((parsed.perfect || []).length + ' perfect rhymes and ' + (parsed.slant || []).length + ' slant rhymes for ' + word + '.');
      } catch (err) {
        warnLog('Rhymes failed:', err && err.message);
        setRhymeResults({ error: 'Couldn\'t fetch rhymes. Try a more common word.' });
      } finally {
        setRhymeLoading(false);
      }
    }, [onCallGemini, rhymeQuery]);

    var copyRhyme = useCallback(function (word) {
      try {
        navigator.clipboard.writeText(word);
        addToast && addToast('"' + word + '" copied to clipboard.', 'success');
        announcePT('Copied ' + word + ' to clipboard.');
      } catch (e) {
        addToast && addToast('Copy failed — long-press the word instead.', 'info');
      }
    }, [addToast]);

    var findStrongerVerbs = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setVerbLoading(true);
      setVerbSuggestions(null);
      try {
        var prompt = 'Read this poem. Identify up to 5 lines that rely on weak verbs (forms of "to be" — is, was, were, am, are; or "have", "has", "do", "get", "got", "make"). For each, return the original line, the weak verb, and 2-3 stronger more specific alternatives that would fit the poem\'s tone and image.\n\n'
          + 'Poem:\n"""\n' + poemText + '\n"""\n\n'
          + 'Return JSON: {"suggestions":[{"line":"<exact original line from the poem>","weakVerb":"<verb>","alternatives":["<verb1>","<verb2>","<verb3>"]}]}\n\n'
          + 'Only suggest where the line genuinely benefits — sometimes "is" is the right word. If no weak verbs are found, return {"suggestions":[]}.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setVerbSuggestions(parsed.suggestions || []);
        var n = (parsed.suggestions || []).length;
        announcePT(n === 0 ? 'No weak verbs detected — your verbs are working hard.' : n + ' verb suggestion' + (n === 1 ? '' : 's') + '.');
      } catch (err) {
        warnLog('Verb booster failed:', err && err.message);
        setVerbSuggestions({ error: 'Couldn\'t analyze verbs right now.' });
      } finally {
        setVerbLoading(false);
      }
    }, [onCallGemini, poemText]);

    // ── Meter analysis (Gemini-on-demand) ──
    var analyzeMeter = useCallback(async function () {
      if (!onCallGemini || !poemText.trim()) return;
      setMeterLoading(true);
      setMeterAnalysis(null);
      try {
        var lines = poemText.split('\n').filter(function (l) { return l.trim().length > 0; });
        var prompt = 'Analyze the meter and stress pattern of these poem lines. For each line, return:\n'
          + '- syllableCount (your count, may differ from a heuristic)\n'
          + '- stressPattern: a string using \'/\' for stressed and \'u\' for unstressed syllables (e.g., "u/u/u/u/u/" for iambic pentameter)\n'
          + '- meterName: one of "iambic", "trochaic", "anapestic", "dactylic", "spondaic", "mixed", or "unclear"\n'
          + '- footCount: number of metrical feet\n\n'
          + 'Lines:\n' + lines.map(function (l, i) { return (i + 1) + '. ' + l; }).join('\n') + '\n\n'
          + 'Return JSON: {"lines":[{"text":"<line text>","syllableCount":N,"stressPattern":"u/u/...","meterName":"iambic","footCount":N}]}\n\n'
          + 'Be honest — if a line\'s meter is unclear or mixed, say so. Use stress patterns the student can verify by reading aloud.';
        var result = await onCallGemini(prompt, true);
        var clean = String(result).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
        var parsed = JSON.parse(clean);
        setMeterAnalysis(parsed);
        announcePT('Meter analysis complete for ' + (parsed.lines ? parsed.lines.length : 0) + ' lines.');
      } catch (err) {
        warnLog('Meter analysis failed:', err && err.message);
        setMeterAnalysis({ error: 'Could not analyze meter.' });
      } finally {
        setMeterLoading(false);
      }
    }, [onCallGemini, poemText]);

    // ── TTS performance ──
    var playPoem = useCallback(async function () {
      if (!onCallTTS || !poemText.trim()) return;
      ttsCancelRef.current = false;
      setTtsPlaying(true);
      announcePT('Playing poem.');
      try {
        var emotionPreface = emotion === 'somber' ? '(read this poem somberly, slowly)\n'
          : emotion === 'joyful' ? '(read this poem joyfully)\n'
          : emotion === 'urgent' ? '(read this poem with urgency)\n'
          : emotion === 'contemplative' ? '(read this poem contemplatively, with pauses)\n'
          : '';
        var lines = poemText.split('\n');
        for (var i = 0; i < lines.length; i++) {
          if (ttsCancelRef.current) break;
          var line = lines[i].trim();
          if (!line) {
            await new Promise(function (r) { setTimeout(r, 600); }); // Stanza break
            continue;
          }
          await new Promise(function (resolve) {
            try {
              var p = onCallTTS(emotionPreface + line, selectedVoice || 'Aoede');
              if (p && typeof p.then === 'function') p.then(resolve).catch(resolve);
              else resolve();
            } catch (err) { resolve(); }
          });
          if (ttsCancelRef.current) break;
          await new Promise(function (r) { setTimeout(r, 350); }); // Line break pause
        }
      } finally {
        setTtsPlaying(false);
        ttsCancelRef.current = false;
      }
    }, [onCallTTS, poemText, emotion, selectedVoice]);

    var stopPoem = useCallback(function () {
      ttsCancelRef.current = true;
      setTtsPlaying(false);
      try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
      announcePT('Stopped.');
    }, []);

    // ── Illustration ──
    var generateIllustration = useCallback(async function () {
      if (!onCallImagen || !poemText.trim()) return;
      setIllusLoading(true);
      try {
        var prompt = 'Illustration for a poem titled "' + (poemTitle || 'Untitled') + '". Poem text: ' + poemText.slice(0, 400) + '. Style: dreamy, evocative, watercolor and ink. Single image. STRICTLY NO TEXT in the image.';
        var url = await onCallImagen(prompt, 600, 0.85);
        if (url) { setIllustration(url); announcePT('Illustration generated.'); }
      } catch (err) {
        warnLog('Illustration failed:', err && err.message);
        addToast && addToast('Illustration failed.', 'error');
      } finally {
        setIllusLoading(false);
      }
    }, [onCallImagen, poemText, poemTitle, addToast]);

    // ── Read-aloud mode (silent recital — student performs live, no TTS) ──
    var startReadAloud = useCallback(function () {
      if (!poemText.trim()) return;
      setReadIdx(0);
      setReadCountdown(3);
      announcePT('Read-aloud starting in 3…');
      var c = 3;
      var tick = function () {
        c -= 1;
        if (c > 0) {
          setReadCountdown(c);
          announcePT(c + '…');
          setTimeout(tick, 900);
        } else {
          setReadCountdown(0);
          setReadAloudActive(true);
          announcePT('Begin reading.');
        }
      };
      setTimeout(tick, 900);
    }, [poemText]);

    var stopReadAloud = useCallback(function () {
      setReadAloudActive(false);
      setReadCountdown(0);
      setReadIdx(0);
      announcePT('Read-aloud ended.');
    }, []);

    var advanceReadAloud = useCallback(function () {
      var allLines = poemText.split('\n');
      // Skip blank lines automatically (treat as stanza pauses)
      var next = readIdx + 1;
      while (next < allLines.length && !allLines[next].trim()) next++;
      if (next >= allLines.length) {
        // Done
        setReadAloudActive(false);
        announcePT('You finished. Well read.');
        if (handleScoreUpdate) handleScoreUpdate(15, 'PoetTree read-aloud', 'poettree-recital');
      } else {
        setReadIdx(next);
      }
    }, [poemText, readIdx, handleScoreUpdate]);

    var rewindReadAloud = useCallback(function () {
      var allLines = poemText.split('\n');
      var prev = readIdx - 1;
      while (prev >= 0 && !allLines[prev].trim()) prev--;
      if (prev >= 0) setReadIdx(prev);
    }, [poemText, readIdx]);

    // ── Print as broadside (single-page printable poster style; uses browser Print → Save as PDF) ──
    // Semantically structured HTML5 — lang on root, <main>/<article>/<header>/<footer> landmarks,
    // proper heading hierarchy, <figure>+<figcaption> for illustration. Modern browsers (Chrome, Edge)
    // produce reasonably tagged PDFs from semantic HTML when the user uses Print → Save as PDF.
    // For strict PDF/UA-1 compliance, route through doc_pipeline_module's createTaggedPdf instead.
    var printBroadside = useCallback(function () {
      if (!poemText.trim()) return;
      var w = window.open('', '_blank', 'width=720,height=900');
      if (!w) { addToast && addToast('Pop-up blocked. Allow pop-ups to print.', 'error'); return; }
      // Escape user content for HTML.
      var escHtml = function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
      var safeTitle = escHtml(poemTitle || 'Untitled');
      var safeAuthor = escHtml(studentNickname || '');
      var safeFormName = form ? escHtml(form.name) : '';
      var safeFormIcon = form ? form.icon : '';
      // Wrap poem in <article>; lines as <p>; stanza breaks as visible spacer with role="separator".
      var poemHtml = poemText
        .split('\n').map(function (l) {
          var t = l.trim();
          if (t) return '<p class="line">' + escHtml(l) + '</p>';
          return '<div class="stanza-break" role="separator" aria-label="stanza break"></div>';
        }).join('\n');
      // Illustration: <figure> + <figcaption> for proper PDF tag-tree mapping; descriptive alt.
      var illusHtml = illustration
        ? '<figure class="art-fig"><img src="' + escHtml(illustration) + '" alt="' + escHtml('AI illustration inspired by the poem ' + (poemTitle || 'Untitled')) + '" /><figcaption>Illustration generated for this poem.</figcaption></figure>'
        : '';
      var html = '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>' + safeTitle + (safeAuthor ? ' by ' + safeAuthor : '') + '</title>'
        + '<meta name="author" content="' + safeAuthor + '">'
        + '<meta name="description" content="A poem' + (safeFormName ? ' in the ' + safeFormName.toLowerCase() + ' form' : '') + (safeAuthor ? ' by ' + safeAuthor : '') + '. Generated with PoetTree.">'
        + '<style>'
        // Skip-link styles (visible on focus only)
        + '.skip-link{position:absolute;left:-9999px;top:0;padding:8px 14px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700}'
        + '.skip-link:focus{left:0;top:0;z-index:1000}'
        + 'html,body{margin:0;padding:0;background:#fff;color:#1e293b;font-family:Georgia,serif}'
        + 'main{display:block}'
        + 'figure{margin:0}'
        + '.page{max-width:680px;margin:0 auto;padding:48px 56px}'
        + '.toolbar{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:10px 20px;display:flex;gap:10px;align-items:center;font-family:system-ui,sans-serif;font-size:12px}'
        + '.toolbar button{padding:6px 14px;border-radius:6px;border:none;background:#0d9488;color:#fff;font-weight:700;cursor:pointer;font-size:12px}'
        + '.toolbar button:focus{outline:2px solid #0f172a;outline-offset:2px}'
        + '.toolbar button.secondary{background:#fff;color:#115e59;border:1px solid #0d9488}'
        + '.toolbar .help{margin-left:auto;color:#334155}'
        + '.poem-header{margin-bottom:28px}'
        + '.title{font-size:32px;font-weight:800;text-align:center;margin:0 0 6px;letter-spacing:-0.5px;line-height:1.2}'
        + '.byline{text-align:center;font-size:13px;color:#334155;font-style:italic;margin:0 0 4px}'
        // Form tag: ~8.6:1 contrast (was 4.47:1 — bumped from teal-600 to teal-800 for AA on small text)
        + '.formtag{display:block;text-align:center;font-size:11px;color:#115e59;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 16px}'
        + '.line{font-size:18px;line-height:1.85;margin:0;text-align:left}'
        + '.stanza-break{height:18px}'
        + '.art-fig{margin:32px 0 0}'
        + '.art-fig img{display:block;max-width:100%;margin:0 auto;border-radius:8px}'
        + '.art-fig figcaption{text-align:center;font-size:11px;color:#475569;font-style:italic;margin-top:6px}'
        // Footer: ~7.4:1 contrast (was 3.46:1 — bumped from slate-400 to slate-600 for AA at 11px)
        + '.site-footer{margin-top:36px;padding-top:14px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#475569;font-family:system-ui,sans-serif}'
        + '@media print{.toolbar,.skip-link{display:none}.page{padding:24px}html,body{background:#fff !important}}'
        + '@media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important}}'
        + '</style></head><body>'
        // Skip link for keyboard users (lands on focus)
        + '<a class="skip-link" href="#poem-content">Skip to poem</a>'
        // Toolbar — role="banner" places it as an explicit landmark before main
        + '<div class="toolbar" role="banner">'
        +   '<button type="button" onclick="window.print()" aria-label="Print this broadside or save as PDF">🖨️ Print / Save as PDF</button>'
        +   '<button type="button" class="secondary" onclick="window.close()" aria-label="Close window">✕ Close</button>'
        +   '<span class="help" aria-hidden="true">Use Ctrl+P (⌘+P) → Save as PDF</span>'
        + '</div>'
        // Main content
        + '<main class="page" id="poem-content" role="main" aria-labelledby="poem-title">'
        +   '<article aria-labelledby="poem-title">'
        +     '<header class="poem-header">'
        +       (safeFormName ? '<p class="formtag" aria-label="Poem form: ' + safeFormName + '">' + (safeFormIcon ? '<span aria-hidden="true">' + safeFormIcon + '</span> ' : '') + safeFormName + '</p>' : '')
        +       '<h1 class="title" id="poem-title">' + safeTitle + '</h1>'
        +       (safeAuthor ? '<p class="byline">by ' + safeAuthor + '</p>' : '')
        +     '</header>'
        +     '<div class="poem-body" role="document">' + poemHtml + '</div>'
        +     illusHtml
        +   '</article>'
        + '</main>'
        + '<footer class="site-footer" role="contentinfo">PoetTree · AlloFlow</footer>'
        + '</body></html>';
      try { w.document.open(); w.document.write(html); w.document.close(); announcePT('Broadside ready in a new window.'); }
      catch (er) { addToast && addToast('Broadside failed.', 'error'); }
    }, [poemText, poemTitle, studentNickname, form, illustration, addToast]);

    // ── Found poetry helper: pick word ──
    var addFoundWord = useCallback(function (word) {
      var clean = String(word || '').replace(/[^\w'-]/g, '');
      if (!clean) return;
      setPoemText(function (prev) { return prev + (prev && !prev.endsWith('\n') ? ' ' : '') + clean; });
    }, []);

    // ── Render ──
    var lines = poemText.split('\n');
    var nonEmptyLines = lines.filter(function (l) { return l.trim().length > 0; });
    var rhymeGroups = detectRhymeScheme(lines);

    var TABS = [
      { id: 'form',     icon: '📐', label: 'Form' },
      { id: 'write',    icon: '✍️', label: 'Write' },
      { id: 'feedback', icon: '✨', label: 'Feedback' },
      { id: 'perform',  icon: '🎙️', label: 'Perform' },
      { id: 'share',    icon: '📚', label: 'Library' }
    ];

    var modalStyle = {
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
    };
    var panelStyle = {
      width: '100%', maxWidth: '900px', height: '92vh', background: '#fff',
      borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    };

    return e('div', { className: 'fixed inset-0 pt-tool', style: modalStyle, onClick: function (ev) { if (ev.target === ev.currentTarget && onClose) onClose(); } },
      e('div', { style: panelStyle, role: 'dialog', 'aria-label': 'PoetTree poetry workshop' },
        // Header
        e('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg, #f0fdfa, #ecfeff)' } },
          e('span', { style: { fontSize: '32px' }, 'aria-hidden': 'true' }, '🌳'),
          e('div', { style: { flex: 1 } },
            e('h2', { style: { fontSize: '18px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, 'PoetTree'),
            e('p', { style: { fontSize: '11px', color: '#475569', margin: 0 } }, 'Form, write, hear, share — your poems with structure and AI feedback.')
          ),
          onClose && e('button', { onClick: onClose, 'aria-label': 'Close PoetTree',
            style: { padding: '6px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }
          }, '✕ Close')
        ),

        // Tabs
        e('div', { role: 'tablist', 'aria-label': 'PoetTree sections',
          style: { display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', overflowX: 'auto' }
        },
          TABS.map(function (t) {
            var active = activeTab === t.id;
            return e('button', { key: t.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
              onClick: function () { setActiveTab(t.id); },
              style: { padding: '8px 14px', borderRadius: '10px', border: 'none', background: active ? TEAL : 'transparent', color: active ? '#fff' : '#374151', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }
            }, t.icon + ' ' + t.label);
          })
        ),

        // Tab content
        e('div', { style: { flex: 1, overflowY: 'auto', padding: '20px' } },
          // ── FORM TAB ──
          activeTab === 'form' && e('div', { style: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' } },
            e('h3', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 4px' } }, 'Pick a form to start'),
            e('p', { style: { fontSize: '12px', color: '#475569', margin: 0 } }, 'Each form has its own rules. Free verse has none. Pick what fits your idea, or try one you\'ve never written before.'),
            e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '6px' } },
              FORMS.map(function (f) {
                var selected = form && form.id === f.id;
                return e('button', { key: f.id,
                  onClick: function () { setForm(f); announcePT('Selected form: ' + f.name); },
                  'aria-pressed': selected ? 'true' : 'false',
                  'aria-label': 'Choose form ' + f.name + ' — ' + f.tagline,
                  style: { textAlign: 'left', padding: '14px', borderRadius: '12px', border: selected ? '2px solid ' + TEAL : '1px solid #e5e7eb', background: selected ? TEAL_LIGHT : '#fff', cursor: 'pointer' }
                },
                  e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } },
                    e('span', { style: { fontSize: '24px' }, 'aria-hidden': 'true' }, f.icon),
                    e('h4', { style: { fontSize: '14px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, f.name)
                  ),
                  e('p', { style: { fontSize: '11px', color: '#475569', margin: '0 0 6px', fontStyle: 'italic' } }, f.tagline),
                  e('p', { style: { fontSize: '11px', color: '#374151', margin: 0, lineHeight: 1.5 } }, f.structure)
                );
              })
            ),
            // Selected form details
            form && e('div', { style: { background: TEAL_LIGHT, borderRadius: '12px', padding: '14px', border: '1px solid #99f6e4', marginTop: '10px' } },
              e('h4', { style: { fontSize: '13px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 6px' } }, '📖 Example: ' + form.name),
              e('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '13px', color: '#1e293b', margin: '0 0 10px', lineHeight: 1.6 } }, form.example),
              e('h4', { style: { fontSize: '13px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 4px' } }, '💡 Tips'),
              e('ul', { style: { margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#374151', lineHeight: 1.6 } },
                form.tips.map(function (tip, i) { return e('li', { key: i }, tip); })
              ),
              e('button', { onClick: function () { setActiveTab('write'); announcePT('Ready to write a ' + form.name + '.'); },
                style: { marginTop: '10px', padding: '8px 18px', background: TEAL, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
              }, 'Start writing →')
            )
          ),

          // ── WRITE TAB ──
          activeTab === 'write' && e('div', { style: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' } },
            // Form badge + reading-mode toggle
            e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' } },
              form
                ? e('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: TEAL_LIGHT, borderRadius: '14px', border: '1px solid #99f6e4', fontSize: '12px', fontWeight: 700, color: TEAL_DARK } },
                    e('span', { 'aria-hidden': 'true' }, form.icon), form.name,
                    e('button', { onClick: function () { setForm(null); }, 'aria-label': 'Switch form', style: { background: 'transparent', border: 'none', color: TEAL_DARK, cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', marginLeft: '4px' } }, 'switch'))
                : e('span', { style: { fontSize: '12px', color: '#6b7280', fontStyle: 'italic' } }, 'No form chosen — free verse'),
              e('button', { onClick: function () { var next = !largeText; setLargeText(next); savePrefs({ largeText: next }); announcePT(next ? 'Reading-friendly text on.' : 'Reading-friendly text off.'); },
                'aria-pressed': largeText ? 'true' : 'false',
                'aria-label': largeText ? 'Turn off reading-friendly text' : 'Turn on reading-friendly text',
                style: { padding: '4px 10px', borderRadius: '6px', border: '1px solid ' + (largeText ? TEAL : '#d1d5db'), background: largeText ? TEAL_LIGHT : '#fff', color: largeText ? TEAL_DARK : '#475569', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }
              }, '🔠 ' + (largeText ? 'Reading mode on' : 'Reading mode'))
            ),

            // Title
            e('label', { htmlFor: 'pt-title', style: { fontSize: '11px', fontWeight: 700, color: '#374151' } }, 'Title (optional)'),
            e('input', { id: 'pt-title', type: 'text', value: poemTitle, onChange: function (ev) { setPoemTitle(ev.target.value); },
              placeholder: 'Untitled',
              style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: largeText ? '15px' : '13px', fontFamily: largeText ? 'system-ui, -apple-system, sans-serif' : 'inherit' }
            }),

            // Found-poetry source (only when form is found)
            form && form.id === 'found' && e('div', null,
              e('label', { htmlFor: 'pt-found-source', style: { fontSize: '11px', fontWeight: 700, color: '#374151' } }, 'Source text (paste any text here, then click words to add)'),
              e('textarea', { id: 'pt-found-source', value: foundSource, onChange: function (ev) { setFoundSource(ev.target.value); },
                rows: 6, placeholder: 'Paste a news article, a textbook page, a letter…',
                style: { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: largeText ? '14px' : '12px', fontFamily: 'Georgia, serif', resize: 'vertical', boxSizing: 'border-box' }
              }),
              foundSource && e('div', { style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px', marginTop: '6px', maxHeight: '160px', overflowY: 'auto' } },
                e('p', { style: { fontSize: '10px', color: '#78350f', margin: '0 0 6px', fontWeight: 700 } }, 'Click words to add them to your poem:'),
                e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                  foundSource.split(/\s+/).filter(Boolean).slice(0, 200).map(function (w, wi) {
                    return e('button', { key: wi, onClick: function () { addFoundWord(w); },
                      'aria-label': 'Add word ' + w + ' to poem',
                      style: { padding: '2px 6px', background: '#fff', border: '1px solid #fde68a', borderRadius: '4px', fontSize: largeText ? '13px' : '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', color: '#1e293b' }
                    }, w);
                  })
                )
              )
            ),

            // Editor
            e('label', { htmlFor: 'pt-editor', style: { fontSize: '11px', fontWeight: 700, color: '#374151' } }, 'Your poem'),
            e('textarea', { id: 'pt-editor', value: poemText, onChange: function (ev) { setPoemText(ev.target.value); },
              autoFocus: true,
              rows: 12, placeholder: form && form.id === 'haiku' ? 'Line 1 (5 syllables)\nLine 2 (7 syllables)\nLine 3 (5 syllables)' : 'Start writing…',
              style: { width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid ' + TEAL, fontSize: largeText ? '17px' : '15px', fontFamily: largeText ? 'system-ui, -apple-system, sans-serif' : 'Georgia, serif', lineHeight: largeText ? 1.85 : 1.7, letterSpacing: largeText ? '0.02em' : 'normal', resize: 'vertical', minHeight: '180px', boxSizing: 'border-box' }
            }),

            // Live structure check
            e('div', { style: { background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', border: '1px solid #e2e8f0' } },
              e('h4', { style: { fontSize: '11px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Live structure check'),
              // Per-line table
              lines.length > 0 && e('div', { style: { fontFamily: 'monospace', fontSize: '11px', color: '#374151', maxHeight: '200px', overflowY: 'auto' } },
                lines.map(function (line, li) {
                  if (!line.trim()) return e('div', { key: li, style: { color: '#94a3b8', padding: '2px 0' } }, '— stanza break —');
                  var sylCount = countLineSyllables(line);
                  var expected = form && form.syllablesPerLine && form.syllablesPerLine[li];
                  var sylStatus = expected ? (sylCount === expected ? '✓' : '✗ ' + sylCount + '/' + expected) : sylCount + ' syl';
                  var rg = rhymeGroups[li];
                  return e('div', { key: li, style: { padding: '3px 0', display: 'flex', gap: '8px', alignItems: 'center' } },
                    e('span', { style: { color: '#94a3b8', minWidth: '20px' } }, (li + 1) + '.'),
                    e('span', { style: { flex: 1, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, line),
                    rg && e('span', { style: { color: TEAL, fontWeight: 700, minWidth: '14px' }, 'aria-label': 'rhymes as group ' + rg }, rg),
                    e('span', { style: { color: expected && sylCount !== expected ? AMBER : '#475569', fontWeight: 700, minWidth: '60px', textAlign: 'right' } }, sylStatus)
                  );
                })
              ),
              // Form-level summary
              form && e('div', { style: { marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '11px', color: '#475569' } },
                form.lineCount && e('span', null, 'Lines: ' + nonEmptyLines.length + (form.lineCount ? ' / ' + form.lineCount : '') + ' · '),
                form.rhymeScheme && e('span', null, 'Expected rhyme: ' + form.rhymeScheme + ' · Detected: ' + rhymeGroups.filter(Boolean).join(' '))
              )
            ),

            // Actions
            e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
              e('button', { onClick: savePoem, disabled: !poemText.trim(),
                style: { padding: '8px 14px', background: poemText.trim() ? TEAL : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: poemText.trim() ? 'pointer' : 'not-allowed' }
              }, '💾 Save'),
              onCallGemini && e('button', { onClick: function () { setActiveTab('feedback'); getAiFeedback(); }, disabled: !poemText.trim(),
                style: { padding: '8px 14px', background: poemText.trim() ? '#7c3aed' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: poemText.trim() ? 'pointer' : 'not-allowed' }
              }, '✨ Get feedback'),
              onCallGemini && e('button', { onClick: analyzeMeter, disabled: !poemText.trim() || meterLoading,
                'aria-busy': meterLoading ? 'true' : 'false',
                style: { padding: '8px 14px', background: poemText.trim() && !meterLoading ? '#0891b2' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: poemText.trim() && !meterLoading ? 'pointer' : 'not-allowed' }
              }, meterLoading ? '⏳ Analyzing meter…' : '📏 Analyze meter'),
              onCallTTS && e('button', { onClick: function () { setActiveTab('perform'); },
                style: { padding: '8px 14px', background: '#fff', color: TEAL_DARK, border: '1px solid ' + TEAL, borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
              }, '🎙️ Perform')
            ),

            // Inline meter analysis (rendered here so writers see it next to their text)
            meterAnalysis && !meterAnalysis.error && meterAnalysis.lines && e('div', { style: { background: '#ecfeff', borderRadius: '10px', padding: '12px', border: '1px solid #67e8f9' } },
              e('h4', { style: { fontSize: '12px', fontWeight: 800, color: '#155e75', margin: '0 0 8px' } }, '📏 Meter analysis'),
              e('table', { style: { width: '100%', fontSize: '11px', borderCollapse: 'collapse' } },
                e('thead', null, e('tr', null,
                  e('th', { style: { textAlign: 'left', padding: '4px', color: '#475569' } }, 'Line'),
                  e('th', { style: { textAlign: 'left', padding: '4px', color: '#475569' } }, 'Stress'),
                  e('th', { style: { textAlign: 'left', padding: '4px', color: '#475569' } }, 'Syl'),
                  e('th', { style: { textAlign: 'left', padding: '4px', color: '#475569' } }, 'Meter'),
                  e('th', { style: { textAlign: 'left', padding: '4px', color: '#475569' } }, 'Feet')
                )),
                e('tbody', null,
                  meterAnalysis.lines.map(function (ln, li) {
                    return e('tr', { key: li, style: { borderTop: '1px solid #cffafe' } },
                      e('td', { style: { padding: '4px', color: '#1e293b', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, ln.text),
                      e('td', { style: { padding: '4px', fontFamily: 'monospace', color: '#155e75' }, 'aria-label': 'Stress pattern: ' + ln.stressPattern }, ln.stressPattern),
                      e('td', { style: { padding: '4px', color: '#475569' } }, ln.syllableCount),
                      e('td', { style: { padding: '4px', color: '#475569' } }, ln.meterName),
                      e('td', { style: { padding: '4px', color: '#475569' } }, ln.footCount)
                    );
                  })
                )
              ),
              e('p', { style: { fontSize: '10px', color: '#475569', fontStyle: 'italic', margin: '6px 0 0' } }, '/ = stressed syllable, u = unstressed. Read the line aloud to verify.')
            ),

            // ── Writing helpers (collapsible panel: Daily Prompt, Rhymes, Stronger Verbs) ──
            onCallGemini && e('div', { style: { background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' } },
              e('button', {
                onClick: function () { setHelpersOpen(!helpersOpen); },
                'aria-expanded': helpersOpen ? 'true' : 'false',
                'aria-controls': 'pt-helpers-panel',
                'aria-label': helpersOpen ? 'Collapse writing helpers' : 'Expand writing helpers',
                style: { width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '13px', fontWeight: 800, color: TEAL_DARK }
              },
                e('span', null, '✨ Writing helpers'),
                e('span', { 'aria-hidden': 'true', style: { fontSize: '11px', color: '#475569' } }, helpersOpen ? '▼' : '▶')
              ),
              helpersOpen && e('div', { id: 'pt-helpers-panel', style: { padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #e2e8f0' } },
                // ── Daily Prompt ──
                e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', marginTop: '10px' } },
                    e('h4', { style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '💡 Daily Prompt'),
                    e('button', { onClick: generateDailyPrompt, disabled: dailyPromptLoading,
                      'aria-busy': dailyPromptLoading ? 'true' : 'false',
                      'aria-label': dailyPromptLoading ? 'Fetching prompt, please wait' : (dailyPrompt ? 'Get another prompt' : 'Get a prompt'),
                      style: { padding: '4px 12px', borderRadius: '6px', border: 'none', background: dailyPromptLoading ? '#cbd5e1' : TEAL, color: '#fff', fontSize: '11px', fontWeight: 700, cursor: dailyPromptLoading ? 'wait' : 'pointer' }
                    }, dailyPromptLoading ? '⏳…' : (dailyPrompt ? '🔄 New prompt' : '💡 Inspire me'))
                  ),
                  dailyPrompt && e('div', { role: 'region', 'aria-live': 'polite', 'aria-label': 'Daily prompt', style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#78350f', fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.5 } },
                    '"' + dailyPrompt + '"',
                    e('button', { onClick: function () { try { navigator.clipboard.writeText(dailyPrompt); addToast && addToast('Prompt copied.', 'success'); } catch (er) {} },
                      'aria-label': 'Copy prompt to clipboard',
                      style: { marginLeft: '8px', padding: '2px 8px', background: 'transparent', border: '1px solid #fcd34d', color: '#78350f', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', verticalAlign: 'middle' }
                    }, '📋 copy')
                  ),
                  !dailyPrompt && e('p', { style: { fontSize: '11px', color: '#475569', margin: 0, fontStyle: 'italic' } }, 'Stuck? Get a fresh idea to start from.')
                ),

                // ── Rhymes ──
                e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
                    e('label', { htmlFor: 'pt-rhyme-input', style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🔁 Rhymes for…')
                  ),
                  e('div', { style: { display: 'flex', gap: '6px' } },
                    e('input', { id: 'pt-rhyme-input', type: 'text', value: rhymeQuery,
                      onChange: function (ev) { setRhymeQuery(ev.target.value); },
                      onKeyDown: function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); fetchRhymes(); } },
                      placeholder: 'word to rhyme (e.g. orange, light, hope)',
                      style: { flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px' }
                    }),
                    e('button', { onClick: fetchRhymes, disabled: !rhymeQuery.trim() || rhymeLoading,
                      'aria-busy': rhymeLoading ? 'true' : 'false',
                      'aria-label': rhymeLoading ? 'Fetching rhymes' : 'Find rhymes',
                      style: { padding: '6px 12px', borderRadius: '6px', border: 'none', background: rhymeQuery.trim() && !rhymeLoading ? TEAL : '#cbd5e1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: rhymeQuery.trim() && !rhymeLoading ? 'pointer' : 'not-allowed' }
                    }, rhymeLoading ? '⏳' : '🔍')
                  ),
                  rhymeResults && rhymeResults.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: '6px 0 0' } }, rhymeResults.error),
                  rhymeResults && !rhymeResults.error && e('div', { role: 'region', 'aria-label': 'Rhyme results', 'aria-live': 'polite', style: { marginTop: '8px' } },
                    rhymeResults.perfect && rhymeResults.perfect.length > 0 && e('div', { style: { marginBottom: '6px' } },
                      e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '4px' } }, 'Perfect rhymes for "' + rhymeResults.word + '"'),
                      e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                        rhymeResults.perfect.map(function (w, wi) {
                          return e('button', { key: 'p' + wi, onClick: function () { copyRhyme(w); },
                            'aria-label': 'Rhyme ' + w + ' — copy to clipboard',
                            style: { padding: '3px 10px', background: TEAL_LIGHT, border: '1px solid #99f6e4', borderRadius: '12px', fontSize: '12px', cursor: 'pointer', color: TEAL_DARK, fontFamily: 'Georgia, serif' }
                          }, w);
                        })
                      )
                    ),
                    rhymeResults.slant && rhymeResults.slant.length > 0 && e('div', null,
                      e('div', { style: { fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '4px' } }, 'Slant rhymes (close, not exact)'),
                      e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                        rhymeResults.slant.map(function (w, wi) {
                          return e('button', { key: 's' + wi, onClick: function () { copyRhyme(w); },
                            'aria-label': 'Slant rhyme ' + w + ' — copy to clipboard',
                            style: { padding: '3px 10px', background: '#fff', border: '1px dashed #99f6e4', borderRadius: '12px', fontSize: '12px', cursor: 'pointer', color: TEAL_DARK, fontFamily: 'Georgia, serif' }
                          }, w);
                        })
                      )
                    ),
                    (!rhymeResults.perfect || rhymeResults.perfect.length === 0) && (!rhymeResults.slant || rhymeResults.slant.length === 0) && e('p', { style: { fontSize: '11px', color: '#475569', fontStyle: 'italic', margin: 0 } }, 'No rhymes found — try a more common word.')
                  )
                ),

                // ── Stronger Verbs ──
                e('div', null,
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' } },
                    e('h4', { style: { fontSize: '12px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '💪 Stronger Verbs'),
                    e('button', { onClick: findStrongerVerbs, disabled: !poemText.trim() || verbLoading,
                      'aria-busy': verbLoading ? 'true' : 'false',
                      'aria-label': verbLoading ? 'Analyzing verbs' : 'Find stronger verbs',
                      style: { padding: '4px 12px', borderRadius: '6px', border: 'none', background: poemText.trim() && !verbLoading ? TEAL : '#cbd5e1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: poemText.trim() && !verbLoading ? 'pointer' : 'not-allowed' }
                    }, verbLoading ? '⏳…' : '🔍 Scan')
                  ),
                  verbSuggestions && verbSuggestions.error && e('p', { style: { fontSize: '11px', color: '#b91c1c', fontStyle: 'italic', margin: 0 } }, verbSuggestions.error),
                  verbSuggestions && Array.isArray(verbSuggestions) && verbSuggestions.length === 0 && e('p', { style: { fontSize: '12px', color: '#166534', fontStyle: 'italic', margin: 0, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '8px 10px' } }, '✓ No weak verbs detected — your verbs are working hard.'),
                  verbSuggestions && Array.isArray(verbSuggestions) && verbSuggestions.length > 0 && e('div', { role: 'region', 'aria-label': 'Verb suggestions', 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                    verbSuggestions.map(function (s, si) {
                      return e('div', { key: si, style: { background: '#fff', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 10px' } },
                        e('p', { style: { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#1e293b', margin: '0 0 4px', fontStyle: 'italic' } }, '"' + s.line + '"'),
                        e('div', { style: { fontSize: '10px', color: '#475569' } },
                          e('span', null, 'Weak verb: '),
                          e('span', { style: { fontWeight: 700, color: '#b45309' } }, s.weakVerb),
                          e('span', null, ' → try: '),
                          (s.alternatives || []).map(function (alt, ai) {
                            return e('button', { key: ai, onClick: function () { copyRhyme(alt); },
                              'aria-label': 'Stronger verb ' + alt + ' — copy to clipboard',
                              style: { display: 'inline-block', margin: '0 3px 2px 0', padding: '2px 8px', background: TEAL_LIGHT, border: '1px solid #99f6e4', borderRadius: '10px', fontSize: '11px', cursor: 'pointer', color: TEAL_DARK }
                            }, alt);
                          })
                        )
                      );
                    })
                  ),
                  !verbSuggestions && e('p', { style: { fontSize: '11px', color: '#475569', margin: 0, fontStyle: 'italic' } }, 'Find weak verbs (is, was, have…) and get stronger alternatives.')
                )
              )
            )
          ),

          // ── FEEDBACK TAB ──
          activeTab === 'feedback' && e('div', { style: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' } },
            e('h3', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, '✨ AI Feedback'),
            !poemText.trim() && e('p', { style: { color: '#475569', fontSize: '13px', margin: 0 } }, 'Write a poem in the Write tab first, then come back for feedback.'),
            poemText.trim() && e('button', { onClick: getAiFeedback, disabled: aiLoading,
              'aria-busy': aiLoading ? 'true' : 'false',
              'aria-label': aiLoading ? 'Getting feedback, please wait' : 'Get AI feedback on this poem',
              style: { padding: '10px 18px', background: aiLoading ? '#cbd5e1' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: aiLoading ? 'wait' : 'pointer', alignSelf: 'flex-start' }
            }, aiLoading ? '⏳ Reading your poem…' : '✨ Get feedback'),
            aiFeedback && aiFeedback.error && e('p', { style: { color: '#b91c1c', fontSize: '12px', fontStyle: 'italic' } }, aiFeedback.error),
            aiFeedback && !aiFeedback.error && e('div', { role: 'region', 'aria-label': 'AI feedback', 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              aiFeedback.strongestLine && e('div', { style: { background: '#f0fdf4', borderRadius: '10px', padding: '12px', border: '1px solid #86efac' } },
                e('h4', { style: { fontSize: '11px', fontWeight: 800, color: '#166534', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Strongest line'),
                e('p', { style: { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#1e293b', margin: '0 0 6px', fontStyle: 'italic' } }, '"' + aiFeedback.strongestLine + '"'),
                aiFeedback.strongestWhy && e('p', { style: { fontSize: '12px', color: '#166534', margin: 0 } }, aiFeedback.strongestWhy)
              ),
              aiFeedback.imagery && e('div', { style: { background: TEAL_LIGHT, borderRadius: '10px', padding: '12px', border: '1px solid #99f6e4' } },
                e('h4', { style: { fontSize: '11px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Imagery'),
                e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, aiFeedback.imagery)
              ),
              aiFeedback.formNotes && e('div', { style: { background: '#fffbeb', borderRadius: '10px', padding: '12px', border: '1px solid #fde68a' } },
                e('h4', { style: { fontSize: '11px', fontWeight: 800, color: '#78350f', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Form'),
                e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, aiFeedback.formNotes)
              ),
              aiFeedback.suggestion && e('div', { style: { background: '#faf5ff', borderRadius: '10px', padding: '12px', border: '1px solid #d8b4fe' } },
                e('h4', { style: { fontSize: '11px', fontWeight: 800, color: '#581c87', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'One revision idea'),
                e('p', { style: { fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 } }, aiFeedback.suggestion)
              ),
              aiFeedback.encouragement && e('p', { style: { fontSize: '13px', color: '#475569', fontStyle: 'italic', margin: '4px 0 0', textAlign: 'center' } }, aiFeedback.encouragement)
            )
          ),

          // ── PERFORM TAB ──
          activeTab === 'perform' && e('div', { style: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' } },
            e('h3', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, '🎙️ Perform'),
            !poemText.trim() && e('p', { style: { color: '#475569', fontSize: '13px', margin: 0 } }, 'Write a poem first.'),
            poemText.trim() && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              // Poem display
              e('div', { style: { background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', minHeight: '200px' } },
                poemTitle && e('h4', { style: { fontFamily: 'Georgia, serif', fontSize: largeText ? '20px' : '17px', fontWeight: 800, color: '#1e293b', margin: '0 0 12px', textAlign: 'center' } }, poemTitle),
                e('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: largeText ? 'system-ui, -apple-system, sans-serif' : 'Georgia, serif', fontSize: largeText ? '17px' : '15px', color: '#1e293b', margin: 0, lineHeight: largeText ? 1.85 : 1.7, letterSpacing: largeText ? '0.02em' : 'normal' } }, poemText)
              ),
              // Emotion picker
              e('div', null,
                e('label', { style: { fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' } }, 'Reading mood'),
                e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                  ['neutral', 'somber', 'joyful', 'urgent', 'contemplative'].map(function (em) {
                    var sel = emotion === em;
                    return e('button', { key: em, onClick: function () { setEmotion(em); },
                      'aria-pressed': sel ? 'true' : 'false',
                      'aria-label': 'Reading mood: ' + em,
                      style: { padding: '4px 10px', borderRadius: '14px', border: '1px solid ' + (sel ? TEAL : '#d1d5db'), background: sel ? TEAL_LIGHT : '#fff', color: sel ? TEAL_DARK : '#475569', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
                    }, em);
                  })
                )
              ),
              // Controls
              e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                !ttsPlaying
                  ? e('button', { onClick: playPoem, disabled: !onCallTTS,
                      autoFocus: true,
                      'aria-label': 'Play poem with text-to-speech',
                      style: { padding: '10px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: onCallTTS ? 'pointer' : 'not-allowed', opacity: onCallTTS ? 1 : 0.5 }
                    }, '▶ Play')
                  : e('button', { onClick: stopPoem, 'aria-label': 'Stop playback',
                      style: { padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }
                    }, '⏹ Stop'),
                onCallImagen && e('button', { onClick: generateIllustration, disabled: illusLoading,
                  'aria-busy': illusLoading ? 'true' : 'false',
                  'aria-label': illusLoading ? 'Generating illustration, please wait' : 'Generate illustration with AI',
                  style: { padding: '10px 16px', background: illusLoading ? '#cbd5e1' : '#a78bfa', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: illusLoading ? 'wait' : 'pointer' }
                }, illusLoading ? '⏳ Painting…' : '🎨 Illustrate'),
                e('button', { onClick: startReadAloud, disabled: !poemText.trim() || readCountdown > 0,
                  'aria-label': 'Read aloud yourself in large-text recital mode',
                  style: { padding: '10px 16px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: poemText.trim() && !readCountdown ? 'pointer' : 'not-allowed', opacity: poemText.trim() ? 1 : 0.5 }
                }, readCountdown > 0 ? ('… ' + readCountdown) : '🎤 Read aloud'),
                e('button', { onClick: printBroadside, disabled: !poemText.trim(),
                  'aria-label': 'Open a printable broadside of this poem in a new window',
                  style: { padding: '10px 16px', background: '#fff', color: '#0d9488', border: '1px solid #0d9488', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: poemText.trim() ? 'pointer' : 'not-allowed', opacity: poemText.trim() ? 1 : 0.5 }
                }, '🖨️ Broadside')
              ),
              illustration && e('div', { style: { borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' } },
                e('img', { src: illustration, alt: 'Illustration for the poem ' + (poemTitle || 'Untitled'), style: { width: '100%', display: 'block' } })
              )
            )
          ),

          // ── Read-aloud overlay (full-screen line-by-line, student paces themselves) ──
          (readAloudActive || readCountdown > 0) && (function () {
            var allLines = poemText.split('\n');
            var line = readAloudActive ? (allLines[readIdx] || '') : '';
            var totalLines = allLines.filter(function (l) { return l.trim(); }).length;
            var currentNonBlankIdx = allLines.slice(0, readIdx + 1).filter(function (l) { return l.trim(); }).length;
            return e('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Read-aloud recital mode',
              onClick: function () { if (readAloudActive) advanceReadAloud(); },
              onKeyDown: function (ev) {
                if (!readAloudActive) return;
                if (ev.key === 'Escape') { ev.preventDefault(); stopReadAloud(); }
                else if (ev.key === 'ArrowRight' || ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); advanceReadAloud(); }
                else if (ev.key === 'ArrowLeft') { ev.preventDefault(); rewindReadAloud(); }
              },
              tabIndex: 0,
              style: { position: 'fixed', inset: 0, zIndex: 70, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '40px', cursor: readAloudActive ? 'pointer' : 'default' }
            },
              // Countdown
              readCountdown > 0 && e('div', { style: { fontSize: '120px', fontWeight: 900, color: '#0d9488', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }, 'aria-live': 'assertive' }, readCountdown),
              // Active line
              readAloudActive && e('div', { style: { width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' } },
                // Top bar
                e('div', { onClick: function (ev) { ev.stopPropagation(); }, style: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' } },
                  e('span', { style: { color: '#94a3b8', fontSize: '13px', fontFamily: 'system-ui, sans-serif' } }, (poemTitle || 'Untitled') + (studentNickname ? ' · ' + studentNickname : '')),
                  e('span', { style: { color: '#94a3b8', fontSize: '12px', fontFamily: 'system-ui, sans-serif' } }, currentNonBlankIdx + ' / ' + totalLines)
                ),
                // Line display
                e('p', { style: { fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 5vw, 56px)', color: '#fff', margin: 0, lineHeight: 1.4, textAlign: 'center', maxWidth: '100%', wordWrap: 'break-word' }, 'aria-live': 'polite' },
                  line.trim() ? line : '— pause —'
                ),
                // Hint + controls (don't propagate clicks to advance)
                e('div', { onClick: function (ev) { ev.stopPropagation(); }, style: { display: 'flex', gap: '14px', alignItems: 'center', cursor: 'default' } },
                  e('button', { onClick: rewindReadAloud, 'aria-label': 'Previous line',
                    style: { padding: '8px 14px', background: 'transparent', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
                  }, '◀ Back'),
                  e('button', { onClick: advanceReadAloud, autoFocus: true, 'aria-label': 'Next line',
                    style: { padding: '12px 28px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }
                  }, 'Next ▶'),
                  e('button', { onClick: stopReadAloud, 'aria-label': 'Exit read-aloud mode',
                    style: { padding: '8px 14px', background: 'transparent', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
                  }, '✕ Done')
                ),
                e('p', { style: { color: '#64748b', fontSize: '11px', fontFamily: 'system-ui, sans-serif', margin: 0, textAlign: 'center' } }, 'Tap or press Space to advance · ← / → to step · Esc to exit')
              )
            );
          })(),

          // ── LIBRARY (SHARE) TAB ──
          activeTab === 'share' && e('div', { style: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' } },
            e('h3', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, '📚 Library'),
            saved.length === 0
              ? e('p', { style: { color: '#475569', fontSize: '13px', fontStyle: 'italic' } }, 'No poems saved yet. Save one from the Write tab to see it here.')
              : e('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                  saved.map(function (p) {
                    var f = FORMS.find(function (ff) { return ff.id === p.formId; });
                    return e('div', { key: p.id, style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px' } },
                      e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' } },
                        e('div', null,
                          e('h4', { style: { fontSize: '14px', fontWeight: 800, color: '#1e293b', margin: 0 } }, p.title),
                          e('p', { style: { fontSize: '10px', color: '#475569', margin: '2px 0 0' } },
                            (f ? f.icon + ' ' + f.name : 'Free verse') + ' · ' + new Date(p.savedAt).toLocaleDateString())
                        ),
                        e('div', { style: { display: 'flex', gap: '6px' } },
                          e('button', { onClick: function () { loadPoem(p); }, 'aria-label': 'Load ' + p.title, style: { padding: '4px 10px', background: TEAL, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, 'Open'),
                          e('button', { onClick: function () { if (confirm('Delete "' + p.title + '"?')) deletePoem(p.id); }, 'aria-label': 'Delete ' + p.title, style: { padding: '4px 10px', background: '#fff', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, 'Delete')
                        )
                      ),
                      e('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '12px', color: '#374151', margin: 0, maxHeight: '120px', overflowY: 'auto', lineHeight: 1.5 } }, p.text.length > 320 ? p.text.slice(0, 320) + '…' : p.text)
                    );
                  })
                )
          )
        )
      )
    );
  });

  // Expose to AlloFlow shell
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.PoetTree = PoetTree;
})();
