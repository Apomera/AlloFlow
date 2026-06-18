// cinematic_studio_module.js
// Cinematic Studio (Wave 1: "Cinematic Director" prompt helper) for AlloFlow
// Loaded from GitHub CDN via loadModule('CinematicStudio', ...)
// Purpose: NotebookLM "Cinematic Video Overview" has NO native editor and NO API.
//   You set a steering prompt, then regenerate from scratch (Ultra-only, ~20/day).
//   This tool helps teachers craft a strong steering prompt, diagnose a bad output,
//   and re-prompt tightly so they spend those regenerations wisely. Pure React + callGemini.
//   Heavy post-production (captions, trim, re-voice) is a later wave; see
//   docs/notebooklm_video_editor_design.md.
// Version: 1.0.0 (Jun 2026)
(function () {
  // WCAG 4.1.3: status live region for dynamic announcements
  (function () {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-cinematic-studio')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-cinematic-studio';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // WCAG 2.1 AA: accessibility CSS (reduced motion + visible focus)
  if (typeof document !== 'undefined' && !document.getElementById('cs-a11y-css')) {
    var csA11yStyle = document.createElement('style');
    csA11yStyle.id = 'cs-a11y-css';
    csA11yStyle.textContent = [
      '@media (prefers-reduced-motion: reduce) { .cs-root *, .cs-root *::before, .cs-root *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
      '.cs-root button:focus-visible, .cs-root input:focus-visible, .cs-root select:focus-visible, .cs-root textarea:focus-visible, .cs-root [tabindex]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; border-radius: 6px; }',
      '.cs-root :focus:not(:focus-visible) { outline: none !important; }'
    ].join('\n');
    document.head.appendChild(csA11yStyle);
  }

  if (window.AlloModules && window.AlloModules.CinematicStudio) {
    console.log('[CDN] CinematicStudio already loaded, skipping duplicate');
    return;
  }

  var h = React.createElement;
  var _R = React;
  var useState = _R.useState, useEffect = _R.useEffect, useRef = _R.useRef, useMemo = _R.useMemo;

  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };

  // Tiny translation helper: use t() when present, else the English fallback.
  function makeT(t) {
    return function (key, fallback) {
      if (typeof t === 'function') {
        try { var v = t(key); if (v && v !== key) return v; } catch (_) {}
      }
      return fallback;
    };
  }

  function announce(msg) {
    if (typeof document === 'undefined') return;
    var el = document.getElementById('allo-live-cinematic-studio');
    if (el) el.textContent = msg;
  }

  // ─── Domain data ──────────────────────────────────────────────────────────

  var GRADE_BANDS = [
    { id: 'k2', label: 'Grades K-2 (ages 5-8)' },
    { id: '35', label: 'Grades 3-5 (ages 8-11)' },
    { id: '68', label: 'Grades 6-8 (ages 11-14)' },
    { id: '912', label: 'Grades 9-12 (ages 14-18)' },
    { id: 'adult', label: 'Adult / professional learners' }
  ];

  var LENGTHS = [
    { id: 'short', label: 'Very short (under ~2 min)', clause: 'Keep the video very short, under about 2 minutes. Cover only the single most important idea.' },
    { id: 'std', label: 'Standard (~2-3 min)', clause: 'Aim for about 2 to 3 minutes. Be focused; cut tangents.' },
    { id: 'full', label: 'Fuller (~3-5 min)', clause: 'Up to about 5 minutes is fine, but stay tightly on topic and avoid filler.' }
  ];

  var READING_LEVELS = [
    { id: 'simplest', label: 'Simplest (short sentences, common words)' },
    { id: 'plain', label: 'Plain language (clear, everyday vocabulary)' },
    { id: 'gradelevel', label: 'On grade level' },
    { id: 'rich', label: 'Rich (introduce and define academic terms)' }
  ];

  var TONES = [
    { id: 'warm', label: 'Warm and encouraging' },
    { id: 'neutral', label: 'Calm and neutral' },
    { id: 'curious', label: 'Curious and wondering' },
    { id: 'energetic', label: 'Upbeat and energetic' }
  ];

  // Lesson-type presets. Each seeds the builder and adds type-specific guidance.
  var LESSON_TYPES = [
    {
      id: 'explainer', icon: '💡', label: 'Concept Explainer',
      blurb: 'Introduce or unpack one concept clearly.',
      seed: { length: 'std', reading: 'plain', tone: 'curious' },
      mustInclude: 'A plain-language definition, one concrete everyday example, and a quick check-your-understanding question at the end.',
      clauses: ['Build understanding step by step from a concrete example to the general idea.', 'Do not assume prior knowledge; define every key term the first time it appears.']
    },
    {
      id: 'vocab', icon: '📖', label: 'Vocabulary Preview',
      blurb: 'Front-load key terms before a unit or reading.',
      seed: { length: 'short', reading: 'simplest', tone: 'warm' },
      mustInclude: 'Each target term, a kid-friendly definition, and one sentence using it in context.',
      clauses: ['Introduce no more than 5 to 7 terms so it stays memorable.', 'Pair each term with a visual or example that makes the meaning concrete.']
    },
    {
      id: 'labsafety', icon: '🧪', label: 'Lab Safety Briefing',
      blurb: 'Safety expectations before a hands-on activity.',
      seed: { length: 'std', reading: 'plain', tone: 'neutral' },
      mustInclude: 'The specific hazards of this activity, the required protective equipment, and what to do if something goes wrong.',
      clauses: ['Be accurate and specific to the actual procedure; do not invent generic hazards that do not apply.', 'State each rule as a clear, positive action ("do this") rather than only warnings.']
    },
    {
      id: 'sel', icon: '💛', label: 'SEL Scenario',
      blurb: 'A social-emotional situation to think through.',
      seed: { length: 'std', reading: 'plain', tone: 'warm' },
      mustInclude: 'A relatable everyday situation, the feelings involved, and a couple of healthy ways to respond. End with an open reflection question.',
      clauses: ['Keep it non-judgmental and validating; present choices, not a single "correct" feeling.', 'Avoid clinical labels; describe behavior and feelings in plain, human terms.']
    },
    {
      id: 'phonics', icon: '🔤', label: 'Phonics / Decoding',
      blurb: 'A target sound or spelling pattern.',
      seed: { length: 'short', reading: 'simplest', tone: 'warm' },
      mustInclude: 'The target sound or pattern, several clear example words, and a chance for the learner to say the sound.',
      clauses: ['Pronounce the target sound clearly and slowly; model blending sound by sound.', 'Use accurate, decodable example words; avoid exceptions that contradict the pattern.']
    },
    {
      id: 'mathworked', icon: '🔢', label: 'Math Worked-Example',
      blurb: 'Walk through solving one problem.',
      seed: { length: 'std', reading: 'gradelevel', tone: 'curious' },
      mustInclude: 'One clearly stated problem, each solution step with the reason for it, and a final check of the answer.',
      clauses: ['Show every step; do not skip the algebra or arithmetic the learner needs to see.', 'State the reasoning out loud for each step, not just the result. Verify the final answer.']
    },
    {
      id: 'narrative', icon: '📚', label: 'Story / Narrative',
      blurb: 'Teach through a short story.',
      seed: { length: 'std', reading: 'plain', tone: 'curious' },
      mustInclude: 'A clear beginning, middle, and end, and the lesson or takeaway tied back to the topic.',
      clauses: ['Keep the cast and setting simple so the idea stays in focus.', 'Make the takeaway explicit at the end so it is not just entertainment.']
    },
    {
      id: 'review', icon: '🔁', label: 'Unit Review',
      blurb: 'Recap the big ideas before an assessment.',
      seed: { length: 'std', reading: 'gradelevel', tone: 'energetic' },
      mustInclude: 'The 3 to 5 most important ideas from the unit and one quick self-check for each.',
      clauses: ['Prioritize ruthlessly; review only the highest-leverage ideas, not everything.', 'Connect the ideas to each other so it is a map, not a list.']
    }
  ];

  // Diagnosis: a checked symptom maps to a corrective clause appended to the re-prompt.
  var SYMPTOMS = [
    { id: 'toolong', label: 'Too long / dragged on', fix: 'The previous version was too long. Cut it down hard: keep only the essential idea and remove every tangent, repeat, and filler sentence.' },
    { id: 'halluc', label: 'Showed a wrong or made-up visual', fix: 'The previous version showed inaccurate or invented visuals. Depict only things that are scientifically and factually accurate and supported by the source. Do not invent objects, labels, or scenes that are not in the source material.' },
    { id: 'tooadvanced', label: 'Too advanced for my students', fix: 'The previous version was too advanced. Lower the vocabulary and sentence complexity, slow the pacing, and define every term in plain language.' },
    { id: 'offtopic', label: 'Drifted off the main point', fix: 'The previous version drifted off topic. Stay tightly on the stated focus and do not introduce side topics.' },
    { id: 'ostext', label: 'On-screen text problems', fix: 'The previous version had distracting or wrong-language on-screen text. Minimize on-screen text; any text that appears must be correct, brief, and in the requested language.' },
    { id: 'toofast', label: 'Narration too fast', fix: 'The previous version narrated too quickly. Slow the narration and add brief pauses so learners can follow.' },
    { id: 'missing', label: 'Left out something important', fix: 'The previous version left out key content. Be sure to include the must-have points listed below.' },
    { id: 'tone', label: 'Tone was off', fix: 'The previous version had the wrong tone. Match the requested tone consistently throughout.' }
  ];

  // ─── Prompt assembly (fully deterministic; works with zero AI) ─────────────

  function gradeLabel(id) {
    for (var i = 0; i < GRADE_BANDS.length; i++) if (GRADE_BANDS[i].id === id) return GRADE_BANDS[i].label;
    return id;
  }
  function findById(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  function buildSteeringPrompt(f, preset) {
    var lines = [];
    var typeLabel = preset ? preset.label.toLowerCase() : 'short educational';
    lines.push('Create a ' + typeLabel + ' video overview' + (f.topic ? ' about: ' + f.topic.trim() : '') + '.');
    lines.push('Audience: ' + gradeLabel(f.gradeBand) + '.');

    var rl = findById(READING_LEVELS, f.reading);
    if (rl) {
      if (f.reading === 'simplest') lines.push('Use the simplest possible language: short sentences and common, everyday words.');
      else if (f.reading === 'plain') lines.push('Use plain, clear language and everyday vocabulary.');
      else if (f.reading === 'gradelevel') lines.push('Use language appropriate for this grade level.');
      else if (f.reading === 'rich') lines.push('Introduce academic vocabulary, but define each term the first time it is used.');
    }

    var len = findById(LENGTHS, f.length);
    if (len) lines.push(len.clause);

    var tone = findById(TONES, f.tone);
    if (tone) lines.push('Tone: ' + tone.label.toLowerCase() + '.');

    if (preset && preset.clauses) { for (var i = 0; i < preset.clauses.length; i++) lines.push(preset.clauses[i]); }

    if (f.mustInclude && f.mustInclude.trim()) lines.push('Be sure to include: ' + f.mustInclude.trim());
    if (f.mustAvoid && f.mustAvoid.trim()) lines.push('Avoid: ' + f.mustAvoid.trim());

    if (f.onScreenText === 'none') lines.push('Minimize on-screen text; rely on narration and visuals instead of words on screen.');
    else if (f.onScreenText && f.onScreenText !== 'default') lines.push('Any on-screen text must be brief and written in ' + f.onScreenText + '.');

    if (f.visualAccuracy) lines.push('Visual accuracy is critical: depict only accurate, source-supported images. Do not invent or substitute objects, and do not show anything that could mislead about the facts.');

    if (f.udl) lines.push('Accessibility: narrate at a steady pace with clear enunciation, define key terms, and make sure the visuals reinforce (not distract from) the spoken explanation.');

    return lines.join('\n');
  }

  function buildRePrompt(base, checkedIds, notes, f) {
    var lines = [];
    lines.push('Revise the video with these corrections:');
    for (var i = 0; i < SYMPTOMS.length; i++) {
      if (checkedIds.indexOf(SYMPTOMS[i].id) !== -1) lines.push('- ' + SYMPTOMS[i].fix);
    }
    if (notes && notes.trim()) lines.push('- ' + notes.trim());
    lines.push('');
    lines.push('Keep everything that already worked. Here is the intended brief:');
    lines.push(base);
    if (f && checkedIds.indexOf('missing') !== -1 && f.mustInclude && f.mustInclude.trim()) {
      lines.push('');
      lines.push('Must-have points: ' + f.mustInclude.trim());
    }
    return lines.join('\n');
  }

  // ─── Wave 2: captions / accessibility core ─────────────────────────────────
  // On-device transcription (Whisper-ONNX via transformers.js) in an inline-blob
  // module Worker, cloning the kokoro_tts_loader.js pattern. Everything below the
  // worker (editor, .srt/.vtt, translation) works WITHOUT the model too, so an
  // import/paste path survives even if the in-Canvas model load fails.
  var TRANSCRIBE_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0/+esm';
  var TRANSCRIBE_MODEL = 'onnx-community/whisper-base.en'; // English narration (NotebookLM is English-only)
  // Whisper's encoder is sensitive to quantization; keep it fp32 and only quantize the
  // decoder. If a live smoke shows fp32 encoder weights are absent for this repo, fall
  // back to { encoder_model: 'fp16', decoder_model_merged: 'q8' }. Keep device:'wasm'.
  var TRANSCRIBE_DTYPE = { encoder_model: 'fp32', decoder_model_merged: 'q8' };
  var CAPTION_LANGS = ['Spanish', 'Arabic', 'Somali', 'Portuguese', 'Haitian Creole', 'Vietnamese', 'Chinese (Simplified)', 'French', 'Swahili', 'Kinyarwanda', 'Pashto', 'Dari', 'Ukrainian', 'Russian'];

  function round1(n) { return Math.round((n || 0) * 10) / 10; }
  function pad2(n) { n = Math.floor(n); return (n < 10 ? '0' : '') + n; }
  function pad3(n) { n = Math.floor(n); return (n < 10 ? '00' : n < 100 ? '0' : '') + n; }
  function secsToStamp(t, sep) {
    if (!isFinite(t) || t < 0) t = 0;
    // Carry from integer milliseconds so a sub-ms-before-a-boundary never yields ss=60.
    var total = Math.round(t * 1000);
    var ms = total % 1000, s = (total - ms) / 1000;
    var hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = Math.floor(s % 60);
    return pad2(hh) + ':' + pad2(mm) + ':' + pad2(ss) + sep + pad3(ms);
  }
  // Drop empty cues (Whisper hallucinates text in silence) and never emit end<=start
  // (some players reject reversed/zero-length cues). Applied in every export path.
  function cleanSegs(segs) {
    var out = [];
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i] || {}, txt = (s.text || '').trim();
      if (!txt) continue;
      var start = Math.max(0, s.start || 0);
      var end = Math.max(typeof s.end === 'number' ? s.end : start, start + 0.1);
      out.push({ start: start, end: end, text: txt });
    }
    return out;
  }
  function buildSrt(segs) {
    return cleanSegs(segs).map(function (s, i) {
      return (i + 1) + '\n' + secsToStamp(s.start, ',') + ' --> ' + secsToStamp(s.end, ',') + '\n' + s.text + '\n';
    }).join('\n');
  }
  function buildVtt(segs) {
    return 'WEBVTT\n\n' + cleanSegs(segs).map(function (s) {
      return secsToStamp(s.start, '.') + ' --> ' + secsToStamp(s.end, '.') + '\n' + s.text;
    }).join('\n\n') + '\n';
  }
  // Parse an imported .srt/.vtt back into editable segments (tolerant of ',' or '.').
  function parseTimecodeFile(text) {
    var out = [];
    if (!text) return out;
    var norm = String(text).replace(/\r/g, '');
    var re = /(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})/;
    var blocks = norm.split(/\n\s*\n/);
    for (var b = 0; b < blocks.length; b++) {
      var blk = blocks[b].trim();
      if (!blk) continue;
      // Strip a leading WEBVTT header / NOTE lines rather than skipping the whole
      // block, so a header glued to cue #1 (no blank line after WEBVTT) keeps cue #1.
      blk = blk.replace(/^WEBVTT[^\n]*\n?/i, '').replace(/^NOTE[^\n]*\n?/i, '').trim();
      if (!blk) continue;
      var m = blk.match(re);
      if (!m) continue;
      var start = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / Math.pow(10, m[4].length);
      var end = (+m[5]) * 3600 + (+m[6]) * 60 + (+m[7]) + (+m[8]) / Math.pow(10, m[8].length);
      var lines = blk.split('\n');
      var ti = -1;
      for (var li = 0; li < lines.length; li++) { if (re.test(lines[li])) { ti = li; break; } }
      var txt = lines.slice(ti + 1).join(' ').trim();
      out.push({ id: uid(), start: start, end: end, text: txt });
    }
    return out;
  }
  function segmentsFromChunks(chunks, duration) {
    var segs = [];
    for (var i = 0; i < chunks.length; i++) {
      var c = chunks[i] || {};
      var ts = c.timestamp || [];
      var start = (typeof ts[0] === 'number') ? ts[0] : (segs.length ? segs[segs.length - 1].end : 0);
      var nextStart = (i + 1 < chunks.length && chunks[i + 1] && chunks[i + 1].timestamp && typeof chunks[i + 1].timestamp[0] === 'number') ? chunks[i + 1].timestamp[0] : null;
      var end = (typeof ts[1] === 'number') ? ts[1] : (nextStart != null ? nextStart : (duration || start + 2));
      segs.push({ id: uid(), start: start, end: end, text: (c.text || '').trim() });
    }
    return segs;
  }
  function downloadText(filename, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (_) {} }, 1000);
    } catch (e) {}
  }
  // Pull a string[] out of an AI reply that should be a JSON array but often arrives
  // fenced, wrapped in prose, or with literal newlines inside strings. Tries: whole-text
  // parse -> first balanced [...] (string-aware) -> line split (only if it matches n).
  function parseJsonArrayLoose(text, n) {
    if (!text) return null;
    var t = String(text).replace(/```(?:json)?/gi, '').trim();
    try { var a = JSON.parse(t); if (Array.isArray(a)) return a; } catch (_) {}
    var i = t.indexOf('[');
    if (i !== -1) {
      var depth = 0, inStr = false, esc = false;
      for (var j = i; j < t.length; j++) {
        var ch = t[j];
        if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; }
        else if (ch === '"') inStr = true;
        else if (ch === '[') depth++;
        else if (ch === ']') { depth--; if (depth === 0) { try { var b = JSON.parse(t.slice(i, j + 1)); if (Array.isArray(b)) return b; } catch (_) {} break; } }
      }
    }
    var lines = t.split('\n').map(function (x) { return x.replace(/^\s*[-*\d.]*\s*/, '').trim(); }).filter(function (x) { return x.length; });
    if (n && lines.length === n) return lines;
    return null;
  }
  // Decode the file's audio track and resample to 16kHz mono Float32 (what Whisper wants).
  function extractPcm16k(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read the file')); };
      reader.onload = function () {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { reject(new Error('Web Audio is not supported in this browser')); return; }
        var ac = new AC();
        ac.decodeAudioData(reader.result, function (decoded) {
          try {
            var targetRate = 16000;
            var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            if (!OAC) { try { ac.close(); } catch (_) {} reject(new Error('This browser cannot resample audio for transcription. Import a transcript or .srt instead.')); return; }
            var offline = new OAC(1, Math.max(1, Math.ceil(decoded.duration * targetRate)), targetRate);
            var srcNode = offline.createBufferSource();
            srcNode.buffer = decoded; srcNode.connect(offline.destination); srcNode.start(0);
            offline.startRendering().then(function (rendered) {
              resolve({ pcm: new Float32Array(rendered.getChannelData(0)), duration: decoded.duration, rate: targetRate });
              try { ac.close(); } catch (_) {}
            }, function (err) { try { ac.close(); } catch (_) {} reject(err); });
          } catch (e2) { try { ac.close(); } catch (_) {} reject(e2); }
        }, function () { try { ac.close(); } catch (_) {} reject(new Error('Could not decode audio from this file. Try an MP4, M4A, or WAV.')); });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  var TRANSCRIBE_WORKER_SOURCE = `
    let _asr = null;
    self.onmessage = async ({ data }) => {
      try {
        if (data.type === 'init') {
          self.postMessage({ type: 'progress', stage: 'Loading speech library', pct: 0.03 });
          const mod = await import(data.cdn);
          const pipeline = mod.pipeline;
          if (mod.env) { try { mod.env.allowLocalModels = false; } catch (_) {} }
          self.postMessage({ type: 'progress', stage: 'Downloading speech model (cached after first load)', pct: 0.08 });
          _asr = await pipeline('automatic-speech-recognition', data.modelId, {
            dtype: data.dtype || { encoder_model: 'fp32', decoder_model_merged: 'q8' },
            device: 'wasm',
            progress_callback: (p) => {
              if (!p) return;
              if (typeof p.progress === 'number') self.postMessage({ type: 'progress', stage: 'Downloading speech model', pct: 0.08 + (p.progress / 100) * 0.85 });
              else if (p.status === 'done') self.postMessage({ type: 'progress', stage: 'Loading model into memory', pct: 0.95 });
            }
          });
          self.postMessage({ type: 'progress', stage: 'Ready', pct: 1.0 });
          self.postMessage({ type: 'ready' });
          return;
        }
        if (data.type === 'transcribe') {
          if (!_asr) { self.postMessage({ type: 'error', id: data.id, error: 'Model not initialized' }); return; }
          const out = await _asr(data.pcm, { return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 });
          self.postMessage({ type: 'result', id: data.id, text: (out && out.text) || '', chunks: (out && out.chunks) || [] });
          return;
        }
      } catch (e) {
        self.postMessage({ type: data.type === 'init' ? 'init_error' : 'error', id: data.id, error: (e && e.message) || String(e) });
      }
    };
  `;

  var Transcriber = (function () {
    var worker = null, ready = false, initPromise = null, msgId = 0, onProg = null;
    var pending = {};
    // Reject EVERY outstanding job and tear the worker down so the next load()
    // rebuilds from scratch. Without this, one transient CDN/CSP hiccup leaves a
    // rejected initPromise cached + a dead worker, bricking the feature for the
    // whole session and (for in-flight jobs) hanging the spinner forever.
    function teardown(msg) {
      for (var k in pending) { if (pending[k] && pending[k].reject) { try { pending[k].reject(new Error(msg)); } catch (_) {} } delete pending[k]; }
      try { if (worker) worker.terminate(); } catch (_) {}
      worker = null; ready = false; initPromise = null;
    }
    function ensureWorker() {
      if (worker) return;
      var blob = new Blob([TRANSCRIBE_WORKER_SOURCE], { type: 'application/javascript' });
      var url = URL.createObjectURL(blob);
      worker = new Worker(url, { type: 'module' });
      worker.onmessage = function (ev) {
        var d = ev.data || {};
        if (d.type === 'progress') { if (onProg) onProg(d); return; }
        if (d.type === 'ready') { ready = true; if (pending.__init__) { pending.__init__.resolve(true); delete pending.__init__; } return; }
        if (d.type === 'init_error') { teardown(d.error || 'Speech model failed to load'); return; }
        if (d.type === 'result') { var p = pending[d.id]; if (p) { p.resolve({ text: d.text, chunks: d.chunks }); delete pending[d.id]; } return; }
        if (d.type === 'error') { var q = pending[d.id]; if (q) { q.reject(new Error(d.error)); delete pending[d.id]; } return; }
      };
      worker.onerror = function (e) { teardown((e && e.message) || 'Speech worker crashed'); };
      worker.onmessageerror = function () { teardown('Speech worker sent an unreadable message'); };
    }
    return {
      load: function (progressCb) {
        onProg = progressCb || null;
        if (ready) return Promise.resolve(true);
        if (initPromise) return initPromise;
        ensureWorker();
        initPromise = new Promise(function (resolve, reject) {
          var to = setTimeout(function () { if (pending.__init__) teardown('Speech model load timed out'); }, 90000);
          pending.__init__ = { resolve: function (v) { clearTimeout(to); resolve(v); }, reject: function (e) { clearTimeout(to); reject(e); } };
        });
        worker.postMessage({ type: 'init', cdn: TRANSCRIBE_CDN, modelId: TRANSCRIBE_MODEL, dtype: TRANSCRIBE_DTYPE });
        return initPromise;
      },
      run: function (pcm) {
        ensureWorker();
        var id = 'm' + (++msgId);
        return new Promise(function (resolve, reject) {
          var to = setTimeout(function () { if (pending[id]) teardown('Transcription timed out'); }, 600000);
          pending[id] = { resolve: function (v) { clearTimeout(to); resolve(v); }, reject: function (e) { clearTimeout(to); reject(e); } };
          worker.postMessage({ type: 'transcribe', id: id, pcm: pcm }, [pcm.buffer]);
        });
      }
    };
  })();

  // ─── Component ────────────────────────────────────────────────────────────

  function CinematicStudio(props) {
    var onClose = props.onClose, callGemini = props.callGemini, addToast = props.addToast;
    var T = makeT(props.t);

    var _tab = useState(props.initialTab || 'build'); var tab = _tab[0], setTab = _tab[1];
    var _preset = useState('explainer'); var presetId = _preset[0], setPresetId = _preset[1];

    var initialFields = {
      topic: props.sourceTopic || '',
      gradeBand: '35',
      reading: 'plain',
      length: 'std',
      tone: 'curious',
      mustInclude: '',
      mustAvoid: '',
      onScreenText: 'default',
      visualAccuracy: true,
      udl: true
    };
    var _fields = useState(initialFields); var fields = _fields[0], setFields = _fields[1];
    function setField(k, v) { setFields(function (prev) { var n = {}; for (var kk in prev) n[kk] = prev[kk]; n[k] = v; return n; }); }

    var _ai = useState(''); var aiResult = _ai[0], setAiResult = _ai[1];
    var _busy = useState(false); var busy = _busy[0], setBusy = _busy[1];

    var _sym = useState([]); var checked = _sym[0], setChecked = _sym[1];
    var _notes = useState(''); var notes = _notes[0], setNotes = _notes[1];
    var _re = useState(''); var rePrompt = _re[0], setRePrompt = _re[1];
    var _reBusy = useState(false); var reBusy = _reBusy[0], setReBusy = _reBusy[1];

    // Wave 2: captions / accessibility
    var _vfile = useState(null); var vfile = _vfile[0], setVfile = _vfile[1];
    var _segs = useState([]); var segs = _segs[0], setSegs = _segs[1];
    var _tstatus = useState(''); var tstatus = _tstatus[0], setTstatus = _tstatus[1];
    var _tpct = useState(0); var tpct = _tpct[0], setTpct = _tpct[1];
    var _tbusy = useState(false); var tbusy = _tbusy[0], setTbusy = _tbusy[1];
    var _terr = useState(''); var terr = _terr[0], setTerr = _terr[1];
    var _capLang = useState('Spanish'); var capLang = _capLang[0], setCapLang = _capLang[1];
    var _trBusy = useState(false); var trBusy = _trBusy[0], setTrBusy = _trBusy[1];
    var _trSegs = useState(null); var trSegs = _trSegs[0], setTrSegs = _trSegs[1];

    var headingRef = useRef(null);
    useEffect(function () { if (headingRef.current) { try { headingRef.current.focus(); } catch (_) {} } }, []);
    useEffect(function () {
      function onKey(e) { if (e.key === 'Escape' && onClose) onClose(); }
      if (typeof document !== 'undefined') document.addEventListener('keydown', onKey);
      return function () { if (typeof document !== 'undefined') document.removeEventListener('keydown', onKey); };
    }, [onClose]);

    var preset = useMemo(function () { return findById(LESSON_TYPES, presetId); }, [presetId]);
    var assembled = useMemo(function () { return buildSteeringPrompt(fields, preset); }, [fields, preset]);

    function applyPreset(id) {
      var p = findById(LESSON_TYPES, id);
      setPresetId(id);
      if (p && p.seed) {
        setFields(function (prev) {
          var n = {}; for (var kk in prev) n[kk] = prev[kk];
          if (p.seed.length) n.length = p.seed.length;
          if (p.seed.reading) n.reading = p.seed.reading;
          if (p.seed.tone) n.tone = p.seed.tone;
          if (!prev.mustInclude && p.mustInclude) n.mustInclude = p.mustInclude;
          return n;
        });
      }
      setAiResult('');
      announce(T('cs_preset_applied', 'Template applied: ' + (p ? p.label : id)));
    }

    function copy(text, what) {
      if (!text) return;
      var done = function () { if (addToast) addToast((what || 'Prompt') + ' copied', 'success'); announce((what || 'Prompt') + ' copied to clipboard'); };
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); }); }
        else fallbackCopy(text, done);
      } catch (_) { fallbackCopy(text, done); }
    }
    function fallbackCopy(text, done) {
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
      } catch (e) { if (addToast) addToast('Copy failed; select the text and copy manually', 'error'); }
    }

    function improvePrompt() {
      if (!callGemini) { if (addToast) addToast('AI is not available here; the prompt above already works', 'info'); return; }
      setBusy(true); setAiResult(''); announce('Refining your prompt');
      var meta = 'You are an expert instructional designer helping a teacher write a STEERING PROMPT for a NotebookLM "Cinematic Video Overview" (a 2-5 minute narrated animated video generated from sources). '
        + 'There is no editing after generation, so the prompt must be precise. Improve the steering prompt below: keep it concise, concrete, and faithful to the teacher\'s intent; strengthen any vague guidance; keep all accuracy and accessibility constraints; do not add new topics the teacher did not ask for. '
        + 'Return ONLY the improved steering prompt as plain text, with no preamble, no headings, and no commentary.\n\n--- STEERING PROMPT ---\n' + assembled;
      Promise.resolve()
        .then(function () { return callGemini(meta, false, true); })
        .then(function (res) {
          var text = '';
          if (typeof res === 'string') text = res;
          else if (res && typeof res.text === 'string') text = res.text;
          text = (text || '').trim();
          if (text) { setAiResult(text); announce('Refined prompt ready'); }
          else { if (addToast) addToast('The AI did not return text. Your prompt above still works as-is.', 'info'); announce('No refinement returned'); }
        })
        .catch(function () { if (addToast) addToast('Refine failed. Your prompt above still works as-is.', 'error'); })
        .then(function () { setBusy(false); });
    }

    function toggleSymptom(id) {
      setChecked(function (prev) { var idx = prev.indexOf(id); if (idx === -1) return prev.concat([id]); var c = prev.slice(); c.splice(idx, 1); return c; });
    }

    function makeRePrompt() {
      var base = buildRePrompt(assembled, checked, notes, fields);
      setRePrompt(base);
      announce('Re-prompt drafted');
      if (!callGemini) return;
      setReBusy(true);
      var meta = 'A teacher regenerated a NotebookLM cinematic video and it had problems. Tighten the REVISION PROMPT below so the next regeneration fixes those problems while keeping what worked. Return ONLY the improved revision prompt as plain text, no preamble or commentary.\n\n--- REVISION PROMPT ---\n' + base;
      Promise.resolve()
        .then(function () { return callGemini(meta, false, true); })
        .then(function (res) {
          var text = (typeof res === 'string') ? res : (res && res.text) ? res.text : '';
          text = (text || '').trim();
          if (text) { setRePrompt(text); announce('Polished re-prompt ready'); }
        })
        .catch(function () {})
        .then(function () { setReBusy(false); });
    }

    // ── Wave 2: caption handlers ──
    function updateSeg(id, patch) {
      setSegs(function (prev) { return prev.map(function (s) { return s.id === id ? Object.assign({}, s, patch) : s; }); });
      setTrSegs(null);
    }
    function removeSeg(id) { setSegs(function (prev) { return prev.filter(function (s) { return s.id !== id; }); }); setTrSegs(null); }
    function addBlankSeg() {
      setSegs(function (prev) { var last = prev.length ? prev[prev.length - 1] : null; var start = last ? last.end : 0; return prev.concat([{ id: uid(), start: start, end: start + 3, text: '' }]); });
      setTrSegs(null);
    }
    function onPickVideo(file) {
      if (!file) return;
      setVfile(file); setSegs([]); setTrSegs(null); setTerr(''); setTpct(0); setTstatus('');
      announce('Loaded ' + file.name);
    }
    function runTranscribe() {
      if (!vfile) { if (addToast) addToast('Choose a video or audio file first', 'info'); return; }
      setTbusy(true); setTerr(''); setTpct(0); setTstatus('Reading audio'); announce('Transcription started');
      var dur = 0;
      extractPcm16k(vfile).then(function (res) {
        dur = res.duration || 0;
        setTstatus('Loading speech model (first run downloads it)');
        return Transcriber.load(function (p) { if (p && typeof p.pct === 'number') setTpct(p.pct); if (p && p.stage) setTstatus(p.stage); }).then(function () {
          setTstatus('Transcribing audio (' + Math.round(dur) + 's)');
          return Transcriber.run(res.pcm);
        });
      }).then(function (out) {
        var s = segmentsFromChunks((out && out.chunks) || [], dur);
        if (!s.length && out && out.text) s = [{ id: uid(), start: 0, end: dur || 2, text: out.text.trim() }];
        setSegs(s); setTstatus(''); setTpct(1);
        if (addToast) addToast('Draft captions ready: ' + s.length + ' segments. Review before use.', 'success');
        announce(s.length + ' caption segments ready for review');
      }).catch(function (e) {
        var msg = (e && e.message) || String(e);
        setTerr(msg);
        if (addToast) addToast('Transcription unavailable: ' + msg, 'error');
        announce('Transcription failed: ' + msg);
      }).then(function () { setTbusy(false); });
    }
    function onImportCaptions(file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onerror = function () { if (addToast) addToast('Could not read the file', 'error'); };
      reader.onload = function () {
        var txt = String(reader.result || '');
        var parsed = parseTimecodeFile(txt);
        if (!parsed.length) {
          var blocks = txt.split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean);
          parsed = blocks.map(function (b, i) { return { id: uid(), start: i * 4, end: i * 4 + 4, text: b.replace(/\n/g, ' ') }; });
        }
        if (parsed.length) { setSegs(parsed); setTrSegs(null); if (addToast) addToast('Imported ' + parsed.length + ' segments', 'success'); announce('Imported ' + parsed.length + ' caption segments'); }
        else if (addToast) addToast('Could not find captions or text in that file', 'error');
      };
      reader.readAsText(file);
    }
    function translateCaptions() {
      if (!segs.length) { if (addToast) addToast('No captions to translate yet', 'info'); return; }
      if (!callGemini) { if (addToast) addToast('AI translation is not available here', 'info'); return; }
      setTrBusy(true); setTrSegs(null); announce('Translating captions to ' + capLang);
      var arr = segs.map(function (s) { return s.text || ''; });
      var prompt = 'Translate each caption line into ' + capLang + ' for a K-12 classroom audience. '
        + 'Keep the SAME number of lines in the SAME order. Keep each line natural and concise so it works as a subtitle. '
        + 'Return ONLY a JSON array of strings (the translations in order), nothing else.\n\nLINES:\n' + JSON.stringify(arr);
      Promise.resolve().then(function () { return callGemini(prompt, false, true); }).then(function (res) {
        var text = (typeof res === 'string') ? res : (res && res.text) ? res.text : '';
        var parsed = parseJsonArrayLoose(text, segs.length);
        if (parsed && parsed.length === segs.length) {
          setTrSegs(segs.map(function (s, i) { return { id: s.id, start: s.start, end: s.end, text: String(parsed[i] || '').trim() }; }));
          if (addToast) addToast('Translated to ' + capLang + ' (AI draft, review before use)', 'success');
          announce('Translated captions ready');
        } else {
          if (addToast) addToast('Translation did not line up; try again or translate fewer segments', 'error');
          announce('Translation failed');
        }
      }).catch(function () { if (addToast) addToast('Translation failed', 'error'); }).then(function () { setTrBusy(false); });
    }
    function exportCaptions(kind, translated) {
      var source = translated ? trSegs : segs;
      if (!source || !source.length) { if (addToast) addToast('Nothing to export yet', 'info'); return; }
      var base = (vfile && vfile.name ? vfile.name.replace(/\.[^.]+$/, '') : 'captions') + (translated ? '.' + capLang.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '');
      if (kind === 'srt') downloadText(base + '.srt', buildSrt(source), 'text/plain;charset=utf-8');
      else if (kind === 'vtt') downloadText(base + '.vtt', buildVtt(source), 'text/vtt;charset=utf-8');
      else downloadText(base + '.txt', source.map(function (s) { return s.text; }).join('\n'), 'text/plain;charset=utf-8');
      if (addToast) addToast('Exported ' + base + '.' + kind, 'success');
    }

    // ── small render helpers ──
    function label(text, htmlFor) { return h('label', { className: 'block text-sm font-semibold text-slate-200 mb-1', htmlFor: htmlFor }, text); }
    function selectEl(id, value, onChange, options) {
      return h('select', {
        id: id, value: value, onChange: function (e) { onChange(e.target.value); },
        className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm'
      }, options.map(function (o) { return h('option', { key: o.id, value: o.id }, o.label); }));
    }

    var btn = function (active) {
      return 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors ' + (active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700');
    };

    // ── header ──
    var header = h('div', { className: 'flex items-start justify-between gap-4 mb-3' }, [
      h('div', { key: 'ttl' }, [
        h('h2', { key: 'h', ref: headingRef, tabIndex: -1, className: 'text-xl font-bold text-white flex items-center gap-2' }, [
          h('span', { key: 'i', 'aria-hidden': 'true' }, '🎬'),
          T('cs_title', 'Cinematic Studio')
        ]),
        h('p', { key: 's', className: 'text-sm text-slate-400 mt-1' },
          T('cs_subtitle', 'Craft a strong steering prompt for a NotebookLM Cinematic Video Overview, then diagnose and re-prompt a weak result.'))
      ]),
      h('button', { key: 'x', onClick: onClose, 'aria-label': T('cs_close', 'Close Cinematic Studio'),
        className: 'text-slate-400 hover:text-white text-2xl leading-none px-2' }, '×')
    ]);

    // ── honesty banner ──
    var banner = h('div', { className: 'mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200' },
      T('cs_banner', 'NotebookLM has no editor and no undo: you set a prompt, then regenerate the whole video (Ultra-only, about 20 per day). This tool helps you get the prompt right so you do not waste regenerations. It does not generate the video itself.'));

    // ── tabs ──
    var tabs = h('div', { role: 'tablist', 'aria-label': 'Cinematic Studio sections', className: 'flex flex-wrap gap-2 mb-4' }, [
      h('button', { key: 'b', role: 'tab', 'aria-selected': tab === 'build', className: btn(tab === 'build'), onClick: function () { setTab('build'); } }, T('cs_tab_build', '1. Build a prompt')),
      h('button', { key: 'd', role: 'tab', 'aria-selected': tab === 'diagnose', className: btn(tab === 'diagnose'), onClick: function () { setTab('diagnose'); } }, T('cs_tab_diagnose', '2. Diagnose & re-prompt')),
      h('button', { key: 'c', role: 'tab', 'aria-selected': tab === 'captions', className: btn(tab === 'captions'), onClick: function () { setTab('captions'); } }, T('cs_tab_captions', 'Captions & translate')),
      h('button', { key: 'g', role: 'tab', 'aria-selected': tab === 'guide', className: btn(tab === 'guide'), onClick: function () { setTab('guide'); } }, T('cs_tab_guide', 'Tips'))
    ]);

    // ── BUILD tab ──
    var presetGrid = h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4' }, LESSON_TYPES.map(function (p) {
      var active = p.id === presetId;
      return h('button', {
        key: p.id, onClick: function () { applyPreset(p.id); }, 'aria-pressed': active, title: p.blurb,
        className: 'text-left rounded-lg border px-3 py-2 transition-colors ' + (active ? 'border-indigo-400 bg-indigo-600/20' : 'border-slate-700 bg-slate-800/60 hover:bg-slate-700/60')
      }, [
        h('div', { key: 'i', className: 'text-lg', 'aria-hidden': 'true' }, p.icon),
        h('div', { key: 'l', className: 'text-xs font-semibold text-slate-100' }, p.label)
      ]);
    }));

    var builder = h('div', { className: 'grid sm:grid-cols-2 gap-3' }, [
      h('div', { key: 'topic', className: 'sm:col-span-2' }, [label(T('cs_f_topic', 'Topic / focus'), 'cs-topic'),
        h('input', { id: 'cs-topic', type: 'text', value: fields.topic, onChange: function (e) { setField('topic', e.target.value); },
          placeholder: 'e.g. how the water cycle moves energy', className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm' })]),
      h('div', { key: 'grade' }, [label(T('cs_f_grade', 'Grade band'), 'cs-grade'), selectEl('cs-grade', fields.gradeBand, function (v) { setField('gradeBand', v); }, GRADE_BANDS)]),
      h('div', { key: 'read' }, [label(T('cs_f_read', 'Language level'), 'cs-read'), selectEl('cs-read', fields.reading, function (v) { setField('reading', v); }, READING_LEVELS)]),
      h('div', { key: 'len' }, [label(T('cs_f_len', 'Length'), 'cs-len'), selectEl('cs-len', fields.length, function (v) { setField('length', v); }, LENGTHS)]),
      h('div', { key: 'tone' }, [label(T('cs_f_tone', 'Tone'), 'cs-tone'), selectEl('cs-tone', fields.tone, function (v) { setField('tone', v); }, TONES)]),
      h('div', { key: 'ost', className: 'sm:col-span-2' }, [label(T('cs_f_ost', 'On-screen text'), 'cs-ost'),
        selectEl('cs-ost', fields.onScreenText, function (v) { setField('onScreenText', v); }, [
          { id: 'default', label: 'No preference' },
          { id: 'none', label: 'Minimize on-screen text (best for non-readers / EL)' },
          { id: 'English', label: 'On-screen text in English' },
          { id: 'Spanish', label: 'On-screen text in Spanish' },
          { id: 'the student home language', label: 'On-screen text in the student home language' }
        ])]),
      h('div', { key: 'inc', className: 'sm:col-span-2' }, [label(T('cs_f_inc', 'Must include'), 'cs-inc'),
        h('textarea', { id: 'cs-inc', rows: 2, value: fields.mustInclude, onChange: function (e) { setField('mustInclude', e.target.value); },
          className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm' })]),
      h('div', { key: 'avo', className: 'sm:col-span-2' }, [label(T('cs_f_avo', 'Must avoid'), 'cs-avo'),
        h('textarea', { id: 'cs-avo', rows: 2, value: fields.mustAvoid, onChange: function (e) { setField('mustAvoid', e.target.value); },
          className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm' })]),
      h('label', { key: 'va', className: 'flex items-center gap-2 text-sm text-slate-200', htmlFor: 'cs-va' }, [
        h('input', { key: 'c', id: 'cs-va', type: 'checkbox', checked: fields.visualAccuracy, onChange: function (e) { setField('visualAccuracy', e.target.checked); } }),
        T('cs_f_va', 'Add a visual-accuracy guardrail (recommended)')]),
      h('label', { key: 'udl', className: 'flex items-center gap-2 text-sm text-slate-200', htmlFor: 'cs-udl' }, [
        h('input', { key: 'c', id: 'cs-udl', type: 'checkbox', checked: fields.udl, onChange: function (e) { setField('udl', e.target.checked); } }),
        T('cs_f_udl', 'Add an accessibility / UDL clause (recommended)')])
    ]);

    var preview = h('div', { className: 'mt-4' }, [
      h('div', { key: 'lab', className: 'flex items-center justify-between mb-1' }, [
        h('span', { key: 't', className: 'text-sm font-semibold text-slate-200' }, T('cs_preview', 'Your steering prompt')),
        h('div', { key: 'btns', className: 'flex gap-2' }, [
          h('button', { key: 'c', onClick: function () { copy(assembled, 'Steering prompt'); }, className: 'text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, T('cs_copy', 'Copy')),
          h('button', { key: 'a', onClick: improvePrompt, disabled: busy, className: 'text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50' }, busy ? T('cs_refining', 'Refining...') : T('cs_improve', 'Improve with AI'))
        ])
      ]),
      h('pre', { key: 'pre', className: 'whitespace-pre-wrap text-xs text-slate-200 bg-slate-900/70 border border-slate-700 rounded-lg p-3 max-h-48 overflow-auto' }, assembled),
      aiResult ? h('div', { key: 'ai', className: 'mt-3' }, [
        h('div', { key: 'l', className: 'flex items-center justify-between mb-1' }, [
          h('span', { key: 't', className: 'text-sm font-semibold text-emerald-300' }, T('cs_ai_label', 'AI-refined draft (review before use)')),
          h('button', { key: 'c', onClick: function () { copy(aiResult, 'Refined prompt'); }, className: 'text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, T('cs_copy', 'Copy'))
        ]),
        h('pre', { key: 'p', className: 'whitespace-pre-wrap text-xs text-slate-100 bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3 max-h-48 overflow-auto' }, aiResult)
      ]) : null
    ]);

    var buildTab = h('div', { role: 'tabpanel' }, [presetGrid, builder, preview]);

    // ── DIAGNOSE tab ──
    var symGrid = h('div', { className: 'grid sm:grid-cols-2 gap-2 mb-3' }, SYMPTOMS.map(function (s) {
      var on = checked.indexOf(s.id) !== -1;
      return h('label', { key: s.id, htmlFor: 'cs-sym-' + s.id, className: 'flex items-start gap-2 text-sm text-slate-200 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 cursor-pointer' }, [
        h('input', { key: 'c', id: 'cs-sym-' + s.id, type: 'checkbox', checked: on, onChange: function () { toggleSymptom(s.id); }, className: 'mt-0.5' }),
        h('span', { key: 'l' }, s.label)
      ]);
    }));
    var diagnoseTab = h('div', { role: 'tabpanel' }, [
      h('p', { key: 'i', className: 'text-sm text-slate-400 mb-3' }, T('cs_diag_intro', 'Got a video back that missed the mark? Check what went wrong and add notes. This builds a tight revision prompt to paste back into NotebookLM before you regenerate.')),
      symGrid,
      h('div', { key: 'n', className: 'mb-3' }, [label(T('cs_diag_notes', 'Anything else that was off?'), 'cs-dnotes'),
        h('textarea', { id: 'cs-dnotes', rows: 2, value: notes, onChange: function (e) { setNotes(e.target.value); }, className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm' })]),
      h('button', { key: 'mk', onClick: makeRePrompt, disabled: reBusy, className: 'px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50' }, reBusy ? T('cs_polishing', 'Polishing...') : T('cs_make_reprompt', 'Build revision prompt')),
      rePrompt ? h('div', { key: 'out', className: 'mt-3' }, [
        h('div', { key: 'l', className: 'flex items-center justify-between mb-1' }, [
          h('span', { key: 't', className: 'text-sm font-semibold text-slate-200' }, T('cs_reprompt', 'Revision prompt')),
          h('button', { key: 'c', onClick: function () { copy(rePrompt, 'Revision prompt'); }, className: 'text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, T('cs_copy', 'Copy'))
        ]),
        h('pre', { key: 'p', className: 'whitespace-pre-wrap text-xs text-slate-100 bg-slate-900/70 border border-slate-700 rounded-lg p-3 max-h-56 overflow-auto' }, rePrompt)
      ]) : null
    ]);

    // ── GUIDE tab ──
    var guideItem = function (k, title, body) {
      return h('div', { key: k, className: 'rounded-lg border border-slate-700 bg-slate-800/50 p-3' }, [
        h('div', { key: 't', className: 'text-sm font-semibold text-slate-100 mb-1' }, title),
        h('div', { key: 'b', className: 'text-xs text-slate-300' }, body)
      ]);
    };
    var guideTab = h('div', { role: 'tabpanel', className: 'space-y-2' }, [
      guideItem('a', T('cs_g1_t', 'You cannot edit the video'), T('cs_g1_b', 'NotebookLM gives you a finished MP4. To change anything you must rewrite the steering prompt and regenerate the whole thing. That is why the prompt matters so much.')),
      guideItem('b', T('cs_g2_t', 'Regenerations are limited'), T('cs_g2_b', 'Cinematic videos are an AI Ultra feature with roughly 20 generations per day and can take many minutes each. Get the prompt close before you spend one.')),
      guideItem('c', T('cs_g3_t', 'Watch for made-up visuals'), T('cs_g3_b', 'The model can show inaccurate or invented images. Keep the visual-accuracy guardrail on, and if it happens, use the Diagnose tab to push back specifically.')),
      guideItem('d', T('cs_g4_t', 'It narrates in English'), T('cs_g4_b', 'Narration is English-only today. For multilingual classrooms, use the Captions & translate tab here to transcribe the video and add translated captions in any of dozens of languages.')),
      guideItem('e', T('cs_g5_t', 'Shorter is usually better'), T('cs_g5_b', 'One clear idea in two focused minutes beats five rambling ones. Use the length setting and trim your must-include list.'))
    ]);

    // ── CAPTIONS tab (Wave 2: accessibility core) ──
    var capHonesty = h('div', { className: 'mb-3 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-200' },
      T('cs_cap_honesty', 'These are AI-DRAFT captions. Automatic transcription typically gets roughly 1 word in 7 to 20 wrong (worse with noise, accents, or jargon) and can invent text during silence. Always read and fix them before use, and do not treat them as compliant captions where a standard requires human-verified captioning.'));

    var capSource = h('div', { className: 'rounded-lg border border-slate-700 bg-slate-800/50 p-3 mb-3' }, [
      h('div', { key: 'r1', className: 'flex flex-wrap items-center gap-2 mb-2' }, [
        h('label', { key: 'pick', className: 'text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer' }, [
          T('cs_cap_pick', 'Choose video / audio'),
          h('input', { key: 'in', type: 'file', accept: 'video/*,audio/*', style: { display: 'none' }, onChange: function (e) { onPickVideo(e.target.files && e.target.files[0]); } })
        ]),
        vfile ? h('span', { key: 'fn', className: 'text-xs text-slate-300 truncate max-w-[14rem]' }, vfile.name) : null,
        h('button', { key: 'go', onClick: runTranscribe, disabled: tbusy || !vfile, className: 'text-xs px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40' }, tbusy ? T('cs_cap_working', 'Working...') : T('cs_cap_transcribe', 'Transcribe'))
      ]),
      h('div', { key: 'r2', className: 'flex flex-wrap items-center gap-2 text-xs text-slate-400' }, [
        h('span', { key: 'or' }, T('cs_cap_or', 'or')),
        h('label', { key: 'imp', className: 'px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-100 cursor-pointer' }, [
          T('cs_cap_import', 'Import .srt / .vtt / transcript'),
          h('input', { key: 'in', type: 'file', accept: '.srt,.vtt,.txt,text/plain', style: { display: 'none' }, onChange: function (e) { onImportCaptions(e.target.files && e.target.files[0]); } })
        ]),
        h('button', { key: 'add', onClick: addBlankSeg, className: 'px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, T('cs_cap_addseg', 'Add blank line'))
      ]),
      tbusy ? h('div', { key: 'prog', className: 'mt-2' }, [
        h('div', { key: 'bar', className: 'h-1.5 bg-slate-700 rounded overflow-hidden' }, h('div', { className: 'h-full bg-emerald-500 transition-all', style: { width: Math.round((tpct || 0) * 100) + '%' } })),
        h('div', { key: 'st', role: 'status', 'aria-live': 'polite', className: 'text-xs text-slate-400 mt-1' }, tstatus || '')
      ]) : null,
      terr ? h('div', { key: 'err', className: 'mt-2 text-xs text-rose-300' }, terr + ' ' + T('cs_cap_errhint', '(You can still import a transcript or .srt above and edit it here.)')) : null
    ]);

    var capEditor = segs.length ? h('div', { className: 'rounded-lg border border-slate-700 bg-slate-900/60 p-2 mb-3 max-h-72 overflow-auto' }, [
      h('div', { key: 'hd', className: 'text-xs text-slate-400 mb-1 px-1' }, segs.length + ' ' + T('cs_cap_segcount', 'segments (start / end seconds, then text)')),
      h('div', { key: 'list' }, segs.map(function (s) {
        return h('div', { key: s.id, className: 'flex items-start gap-2 py-1 border-b border-slate-800' }, [
          h('div', { key: 'tc', className: 'flex flex-col gap-1 shrink-0' }, [
            h('input', { key: 'st', type: 'number', step: '0.1', min: '0', value: round1(s.start), 'aria-label': 'Start seconds', onChange: function (e) { updateSeg(s.id, { start: Math.max(0, parseFloat(e.target.value) || 0) }); }, className: 'w-16 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs text-slate-100' }),
            h('input', { key: 'en', type: 'number', step: '0.1', min: '0', value: round1(s.end), 'aria-label': 'End seconds', onChange: function (e) { updateSeg(s.id, { end: Math.max(0, parseFloat(e.target.value) || 0) }); }, className: 'w-16 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs text-slate-100' })
          ]),
          h('textarea', { key: 'tx', rows: 2, value: s.text, 'aria-label': 'Caption text', onChange: function (e) { updateSeg(s.id, { text: e.target.value }); }, className: 'flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100' }),
          h('button', { key: 'rm', onClick: function () { removeSeg(s.id); }, 'aria-label': 'Remove caption line', className: 'text-slate-500 hover:text-rose-400 px-1 text-lg leading-none' }, '×')
        ]);
      }))
    ]) : null;

    var capExport = segs.length ? h('div', { className: 'flex flex-wrap items-center gap-2 mb-3' }, [
      h('span', { key: 'l', className: 'text-xs text-slate-400' }, T('cs_cap_export', 'Export:')),
      h('button', { key: 'srt', onClick: function () { exportCaptions('srt', false); }, className: 'text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, '.srt'),
      h('button', { key: 'vtt', onClick: function () { exportCaptions('vtt', false); }, className: 'text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, '.vtt'),
      h('button', { key: 'txt', onClick: function () { exportCaptions('txt', false); }, className: 'text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, T('cs_cap_transcript', 'transcript'))
    ]) : null;

    var capTranslate = segs.length ? h('div', { className: 'rounded-lg border border-slate-700 bg-slate-800/50 p-3' }, [
      h('div', { key: 'row', className: 'flex flex-wrap items-center gap-2' }, [
        h('span', { key: 'l', className: 'text-xs text-slate-300 font-semibold' }, T('cs_cap_translate', 'Translate captions to:')),
        h('select', { key: 'sel', value: capLang, 'aria-label': 'Translation language', onChange: function (e) { setCapLang(e.target.value); setTrSegs(null); }, className: 'bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100' }, CAPTION_LANGS.map(function (l) { return h('option', { key: l, value: l }, l); })),
        h('button', { key: 'go', onClick: translateCaptions, disabled: trBusy, className: 'text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40' }, trBusy ? T('cs_cap_translating', 'Translating...') : T('cs_cap_dotranslate', 'Translate'))
      ]),
      h('p', { key: 'priv', className: 'mt-2 text-xs text-amber-200/90' },
        T('cs_cap_privacy', 'Privacy: transcription stays on your device, but translation sends the caption TEXT to Google for AI processing. Do not translate captions that contain student names or other identifying details.')),
      trSegs ? h('div', { key: 'out', className: 'mt-2' }, [
        h('div', { key: 'lab', className: 'flex items-center justify-between mb-1' }, [
          h('span', { key: 't', className: 'text-xs font-semibold text-emerald-300' }, capLang + ' ' + T('cs_cap_draftlabel', '(AI draft, review before use)')),
          h('div', { key: 'b', className: 'flex gap-2' }, [
            h('button', { key: 'srt', onClick: function () { exportCaptions('srt', true); }, className: 'text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, '.srt'),
            h('button', { key: 'vtt', onClick: function () { exportCaptions('vtt', true); }, className: 'text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, '.vtt')
          ])
        ]),
        h('div', { key: 'prev', className: 'max-h-40 overflow-auto text-xs text-slate-200 bg-slate-900/70 border border-slate-700 rounded p-2' }, trSegs.map(function (s) {
          return h('div', { key: s.id, className: 'py-0.5' }, [h('span', { key: 'tc', className: 'text-slate-500 mr-2' }, secsToStamp(s.start, ',').slice(3, 8)), s.text]);
        }))
      ]) : null
    ]) : null;

    var captionsTab = h('div', { role: 'tabpanel' }, [
      h('p', { key: 'i', className: 'text-sm text-slate-400 mb-3' }, T('cs_cap_intro', 'Download your NotebookLM video, then add captions and translations it cannot make on its own. Transcription runs on your device; translation uses AI.')),
      capHonesty, capSource, capEditor, capExport, capTranslate
    ]);

    var body = tab === 'build' ? buildTab : (tab === 'diagnose' ? diagnoseTab : (tab === 'captions' ? captionsTab : guideTab));

    return h('div', {
      className: 'cs-root fixed inset-0 z-[60] bg-black/50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-auto',
      role: 'dialog', 'aria-modal': 'true', 'aria-label': T('cs_title', 'Cinematic Studio'),
      onMouseDown: function (e) { if (e.target === e.currentTarget && onClose) onClose(); }
    }, h('div', {
      className: 'bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl p-4 sm:p-6 my-4'
    }, [header, banner, tabs, body]));
  }

  // ─── Module registration ───────────────────────────────────────────────────
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.CinematicStudio = CinematicStudio;
  // Pure, side-effect-free caption helpers exposed for tests.
  window.AlloModules.__cinematicStudioInternals = {
    buildSrt: buildSrt, buildVtt: buildVtt, parseTimecodeFile: parseTimecodeFile,
    secsToStamp: secsToStamp, segmentsFromChunks: segmentsFromChunks,
    cleanSegs: cleanSegs, parseJsonArrayLoose: parseJsonArrayLoose
  };
  console.log('[CinematicStudioModule] Cinematic Studio registered');
})();
