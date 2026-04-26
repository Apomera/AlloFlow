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
                }, illusLoading ? '⏳ Painting…' : '🎨 Illustrate')
              ),
              illustration && e('div', { style: { borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' } },
                e('img', { src: illustration, alt: 'Illustration for the poem ' + (poemTitle || 'Untitled'), style: { width: '100%', display: 'block' } })
              )
            )
          ),

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
