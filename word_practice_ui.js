/* Shared classroom presenter and portable HTML player. */
(function (root) {
  'use strict';
  const CSS = `
.awp,.awp *{box-sizing:border-box}.awp{font:16px/1.5 system-ui,sans-serif;color:#14213d;background:#f5f7fb;overflow-wrap:anywhere;color-scheme:light}.awp-overlay{position:fixed;inset:0;z-index:2147483000;padding:20px;display:flex;align-items:center;justify-content:center;background:#14213dcc}.awp-dialog{width:min(100%,1100px);max-height:calc(100dvh - 40px);overflow:auto;border-radius:20px;background:#f5f7fb;padding:24px;box-shadow:0 16px 80px #0005}.awp h1,.awp h2,.awp p{margin:0 0 12px}.awp h1{font-size:26px;line-height:1.2}.awp h2{font-size:21px}.awp button,.awp input,.awp textarea,.awp select{font:inherit;color:#14213d}.awp button{min-height:44px;padding:9px 15px;border:1px solid #a8b4c7;border-radius:9px;background:white;cursor:pointer;white-space:normal}.awp button:hover:not(:disabled){background:#e9effa}.awp button:disabled{color:#596579;background:#e7ebf2;cursor:default}.awp .awp-primary{color:white;background:#294fc3;border-color:#294fc3}.awp .awp-primary:hover:not(:disabled){background:#1e3d99}.awp :focus-visible{outline:3px solid #bc4a00;outline-offset:3px}.awp input:not([type=checkbox]),.awp textarea,.awp select{width:100%;max-width:100%;border:1px solid #8191a9;background:white;border-radius:7px;padding:9px}.awp textarea{resize:vertical;min-height:170px}.awp label{display:block;font-weight:600}.awp label>span{display:block;margin-bottom:5px}.awp label:has(input[type=checkbox]){display:flex;align-items:center;gap:9px;font-weight:400}.awp input[type=checkbox]{width:20px;height:20px;flex-shrink:0;accent-color:#294fc3}.awp-head,.awp-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.awp-head{justify-content:space-between;margin-bottom:20px}.awp-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}.awp-fields{display:grid;gap:13px}.awp-note{font-size:14px;color:#45536a}.awp-status{min-height:25px;margin-top:14px!important;color:#263e6c}.awp-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.awp-surface{border:1px solid #bdc8da;border-radius:14px;background:white;padding:18px;min-width:0}.awp-player{width:100%;max-width:1400px;margin:auto;padding:20px}.awp-stage{position:relative;display:flex;align-items:center;justify-content:center;min-height:48vh;padding:34px;border:1px solid #bac6d9;border-radius:16px;background:white;margin:16px 0;overflow:hidden}.awp-card{max-width:100%;width:100%;text-align:center}.awp-word{font-weight:750;font-size:clamp(34px,9vw,112px);line-height:1.2;overflow-wrap:anywhere;white-space:normal}.awp-stage[data-position^=top]{align-items:flex-start}.awp-stage[data-position^=bottom]{align-items:flex-end}.awp-stage[data-position$=left] .awp-card{text-align:left}.awp-stage[data-position$=right] .awp-card{text-align:right}.awp-detail{font-size:clamp(20px,3vw,34px);line-height:1.5;white-space:pre-wrap}.awp-phonemes{display:flex;justify-content:center;flex-wrap:wrap;gap:14px;font-size:clamp(28px,6vw,72px);font-weight:650}.awp-phoneme{padding:2px 12px;border-bottom:4px solid #294fc3}.awp-choices{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:24px}.awp-choices button{font-size:clamp(20px,3vw,30px);min-width:90px}.awp-feedback{font-size:20px;min-height:30px;margin-top:14px!important}.awp-progress{font-variant-numeric:tabular-nums}.awp-footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.awp:fullscreen{overflow:auto;background:#f5f7fb}.awp [hidden]{display:none!important}.awp .awp-gap{margin-top:14px}.awp .awp-review[aria-pressed=true]{background:#fdf0cf;border-color:#926300;color:#664500}
.awp-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
@media(max-width:640px){.awp-overlay{padding:6px}.awp-dialog{padding:15px;max-height:calc(100dvh - 12px);border-radius:12px}.awp-grid{grid-template-columns:minmax(0,1fr);gap:16px}.awp-player{padding:8px}.awp-stage{padding:18px 10px;min-height:42vh}.awp-head{gap:8px}.awp h1{font-size:22px}.awp button{padding:9px 11px}.awp-word{font-size:clamp(30px,11vw,72px)}}
@media(prefers-reduced-motion:reduce){.awp *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`;

  // This factory is embedded verbatim in the offline file; keep it dependency-free.
  function mountPlayer(host, pack, options, initialSequence, core, hooks = {}) {
    const doc = host.ownerDocument, win = doc.defaultView;
    let sequence = initialSequence.slice(), index = 0, revealed = false, running = false, timer = null, dead = false;
    let audio = null, audioRun = 0, finishAudio = null;
    const review = new Set(), items = new Map(pack.items.map(item => [item.id, item]));
    host.classList.add('awp', 'awp-player');
    const make = (tag, text, cls, parent) => { const node = doc.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; (parent || host).appendChild(node); return node; };
    const button = (text, callback, parent, cls) => { const node = make('button', text, cls, parent); node.type = 'button'; node.addEventListener('click', callback); return node; };
    const header = make('div', null, 'awp-head');
    make('h1', pack.title, '', header);
    const headerActions = make('div', null, 'awp-row', header);
    if (hooks.onBack) button('Back to setup', () => { destroy(); hooks.onBack(); }, headerActions);
    const fullscreen = button('Full screen', async () => { try { if (doc.fullscreenElement) await doc.exitFullscreen(); else if (host.requestFullscreen) await host.requestFullscreen(); else status.textContent = 'Full screen is unavailable in this browser.'; } catch (_) { status.textContent = 'Full screen is unavailable in this browser.'; } }, headerActions);
    const progress = make('p', '', 'awp-progress');
    const stage = make('div', null, 'awp-stage');
    stage.setAttribute('aria-label', 'Practice card');
    const card = make('div', null, 'awp-card', stage);
    const announcement = make('p', '', 'awp-sr'); announcement.setAttribute('role', 'status'); announcement.setAttribute('aria-live', 'polite'); announcement.setAttribute('aria-atomic', 'true');
    const toolbar = make('div', null, 'awp-row');
    const previous = button('Previous', () => move(-1), toolbar);
    const next = button('Next', () => move(1), toolbar, 'awp-primary');
    const reveal = button('Reveal answer', () => { revealed = true; renderCard(); schedule(); }, toolbar);
    const wordButton = button('Hear word', () => playClips([current().wordAudio]), toolbar);
    const soundsButton = button('Hear sounds', () => playClips(current().phonemes.map(sound => sound.audio)), toolbar);
    const timerButton = button('Start timer', () => { running = !running; updateTimer(); schedule(); }, toolbar);
    timerButton.hidden = !options.autoAdvance;
    const reviewButton = button('Add to review', () => { const id = current().id; if (review.has(id)) review.delete(id); else review.add(id); updateReview(); }, toolbar, 'awp-review');
    const footer = make('div', null, 'awp-footer awp-gap');
    const roundButtons = make('div', null, 'awp-row', footer);
    const newRound = button('New round', () => { sequence = core.createSequence(pack, options); index = 0; running = false; render(); }, roundButtons);
    const reviewRound = button('Start review (0)', () => { sequence = core.createSequence({ items: pack.items.filter(item => review.has(item.id)) }, { ...options, repetitions: 1 }); index = 0; running = false; render(); }, roundButtons);
    make('p', 'Arrow keys: move · Space: ' + (options.autoAdvance ? 'start or pause timer' : 'next card') + ' · R: reveal', 'awp-note', footer);
    const status = make('p', '', 'awp-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    function current() { return items.get(sequence[index] && sequence[index].itemId); }
    function updateAudioControls() {
      const item = current(), hideAnswer = options.mode === 'sentence' && !revealed;
      wordButton.hidden = !options.includeAudio || hideAnswer; soundsButton.hidden = !options.includeAudio || hideAnswer;
      wordButton.disabled = !item || !core.safeAudio(item.wordAudio);
      soundsButton.disabled = !item || !item.phonemes.length || item.phonemes.some(sound => !core.safeAudio(sound.audio));
    }
    function stopAudio() { audioRun++; if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); audio = null; } if (finishAudio) { finishAudio(); finishAudio = null; } }
    async function playClips(clips) {
      stopAudio();
      if (!clips.length || clips.some(clip => !core.safeAudio(clip))) { status.textContent = 'The complete recording is not available for this word.'; return; }
      const run = audioRun;
      for (const clip of clips) {
        if (dead || run !== audioRun) return;
        const sound = new win.Audio(clip); audio = sound;
        const ok = await new Promise(resolve => {
          let settled = false;
          const done = value => { if (settled) return; settled = true; sound.onended = null; sound.onerror = null; resolve(value); };
          finishAudio = () => done(false); sound.onended = () => done(true); sound.onerror = () => done(false);
          try { const promise = sound.play(); if (promise && promise.catch) promise.catch(() => done(false)); } catch (_) { done(false); }
        });
        if (!ok) { if (!dead && run === audioRun) status.textContent = 'This browser could not play the recording.'; return; }
      }
      if (run === audioRun) { audio = null; finishAudio = null; }
    }
    function updateTimer() { timerButton.textContent = running ? 'Pause timer' : 'Start timer'; timerButton.setAttribute('aria-pressed', String(running)); }
    function schedule() {
      if (timer) win.clearTimeout(timer); timer = null;
      if (!running || dead) return;
      if ((options.mode === 'sentence' || options.mode === 'spelling') && !revealed) return;
      timer = win.setTimeout(() => move(1), options.intervalSeconds * 1000);
    }
    function updateReview() {
      const marked = current() && review.has(current().id);
      reviewButton.textContent = marked ? 'Remove from review' : 'Add to review';
      reviewButton.setAttribute('aria-pressed', String(!!marked));
      reviewRound.textContent = 'Start review (' + review.size + ')'; reviewRound.disabled = !review.size;
    }
    function renderCard() {
      const item = current(), frame = sequence[index]; card.replaceChildren();
      stage.dataset.position = frame.position;
      const showWord = () => { const word = make('div', item.word, 'awp-word', card); word.style.fontSize = 'clamp(30px,' + (9 * frame.scale) + 'vw,' + (112 * frame.scale) + 'px)'; word.setAttribute('dir', 'auto'); };
      if (options.mode === 'sentence') {
        const activity = item.sentenceActivity;
        make('p', activity.prompt, 'awp-detail', card);
        const choices = make('div', null, 'awp-choices', card);
        const feedback = make('p', revealed ? 'Answer: ' + activity.answer : '', 'awp-feedback', card); feedback.setAttribute('role', 'status');
        activity.choices.forEach(choice => button(choice, () => {
          if (core.key(choice) === core.key(activity.answer)) { feedback.textContent = 'Yes. ' + activity.answer + ' completes the sentence.'; revealed = true; reveal.disabled = true; updateAudioControls(); schedule(); }
          else feedback.textContent = 'Try another word. Read the whole sentence again.';
        }, choices));
      } else if (options.mode === 'spelling' && !revealed) {
        make('p', item.wordAudio && options.includeAudio ? 'Listen, then spell the word.' : 'Ask your teacher to say the word, then spell it.', 'awp-detail', card);
      } else if (options.mode === 'blend' && !revealed && item.phonemes.length) {
        const sounds = make('div', null, 'awp-phonemes', card);
        item.phonemes.forEach(sound => make('span', sound.label, 'awp-phoneme', sounds));
        make('p', 'Say the sounds, then blend the word.', 'awp-note awp-gap', card);
      } else {
        showWord();
        if (options.mode === 'vocabulary' && revealed) {
          if (item.definition) make('p', item.definition, 'awp-detail awp-gap', card);
          if (item.example) make('p', item.example, 'awp-detail', card);
          item.translations.forEach(translation => make('p', (translation.language ? translation.language + ': ' : '') + translation.text, 'awp-detail', card));
          if (!item.definition && !item.example && !item.translations.length) make('p', 'No meaning or example has been prepared for this word.', 'awp-note awp-gap', card);
        }
      }
      reveal.hidden = options.mode === 'popup' || (options.mode === 'blend' && !item.phonemes.length);
      reveal.textContent = options.mode === 'vocabulary' ? 'Show meaning' : options.mode === 'blend' ? 'Show word' : 'Reveal answer'; reveal.disabled = revealed;
      // Announce exactly what is visible; concealed answers must stay concealed.
      const visible = options.mode === 'spelling' && !revealed ? 'Listen, then spell the word.'
        : options.mode === 'sentence' ? item.sentenceActivity.prompt + (revealed ? ' Answer: ' + item.sentenceActivity.answer : '')
        : options.mode === 'blend' && !revealed && item.phonemes.length ? item.phonemes.map(sound => sound.label).join(', ') + '. Say the sounds, then blend the word.'
        : item.word + (options.mode === 'vocabulary' && revealed ? '. ' + [item.definition, item.example, ...item.translations.map(value => (value.language ? value.language + ': ' : '') + value.text)].filter(Boolean).join('. ') : '');
      announcement.textContent = 'Card ' + (index + 1) + ' of ' + sequence.length + '. ' + visible;
      updateAudioControls();
    }
    function render() {
      stopAudio(); revealed = false; status.textContent = '';
      const item = current();
      if (!item) { stage.textContent = 'Add words to begin practice.'; [previous, next, reveal, wordButton, soundsButton, timerButton, reviewButton, newRound, reviewRound].forEach(button => button.disabled = true); return; }
      progress.textContent = 'Card ' + (index + 1) + ' of ' + sequence.length;
      previous.disabled = index === 0; next.disabled = index >= sequence.length - 1;
      renderCard(); updateReview(); updateTimer(); schedule();
    }
    function move(direction) {
      if (index + direction >= sequence.length) { running = false; updateTimer(); schedule(); stopAudio(); status.textContent = 'Round complete. Start a new round or review the words you marked.'; return; }
      if (index + direction < 0) return;
      index += direction; render();
    }
    function keydown(event) {
      if (dead || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      else if (event.key === ' ' && event.target.tagName !== 'BUTTON') { event.preventDefault(); if (options.autoAdvance) { running = !running; updateTimer(); schedule(); } else move(1); }
      else if (event.key.toLowerCase() === 'r' && !reveal.hidden) { event.preventDefault(); revealed = true; renderCard(); schedule(); }
    }
    function visibility() { if (doc.hidden) { running = false; stopAudio(); updateTimer(); schedule(); } }
    function fullscreenChange() { fullscreen.textContent = doc.fullscreenElement ? 'Exit full screen' : 'Full screen'; }
    function destroy() { dead = true; if (timer) win.clearTimeout(timer); stopAudio(); host.removeEventListener('keydown', keydown); doc.removeEventListener('visibilitychange', visibility); doc.removeEventListener('fullscreenchange', fullscreenChange); win.removeEventListener('pagehide', destroy); if (doc.fullscreenElement === host && doc.exitFullscreen) doc.exitFullscreen().catch(() => {}); }
    host.tabIndex = -1; host.addEventListener('keydown', keydown); doc.addEventListener('visibilitychange', visibility); doc.addEventListener('fullscreenchange', fullscreenChange); win.addEventListener('pagehide', destroy);
    render(); host.focus();
    return { destroy };
  }

  function withoutAudio(pack, includeAudio) {
    if (includeAudio) return pack;
    return { ...pack, items: pack.items.map(item => ({ ...item, wordAudio: '', phonemes: item.phonemes.map(sound => ({ ...sound, audio: '' })) })) };
  }
  function buildHtml(input, value, suppliedSequence) {
    const core = root.AlloWordPracticeCore;
    const normalized = core.normalizeInput(input), options = core.normalizeOptions(value || normalized.options);
    const pack = withoutAudio({ ...normalized, options }, options.includeAudio);
    const sequence = suppliedSequence || core.createSequence(pack, options);
    const language = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(pack.language) ? pack.language : 'en';
    return '<!doctype html><html lang="' + core.escapeHtml(language) + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; media-src data: blob:; img-src data:"><title>' + core.escapeHtml(pack.title) + '</title><style>body{margin:0;background:#f5f7fb}' + CSS + '</style></head><body><main id="practice" aria-label="Word practice"></main><script>\n(function(){"use strict";const core=(' + core.createCore.toString() + ')();const pack=core.normalizeInput(' + core.safeJson(pack) + ');const options=core.normalizeOptions(' + core.safeJson(options) + ');(' + mountPlayer.toString() + ')(document.getElementById("practice"),pack,options,' + core.safeJson(sequence) + ',core);})();\n</script></body></html>';
  }

  let active = null, nextDialogId = 0;
  function open(context = {}) {
    if (context.signal && context.signal.aborted) return { close() {} };
    if (active) active.close();
    const core = root.AlloWordPracticeCore, doc = root.document, previousFocus = doc.activeElement;
    const fieldPrefix = 'awp-' + (++nextDialogId) + '-'; let nextFieldId = 0;
    let pack = core.normalizeInput(context), player = null, closed = false, busy = false;
    const languageKey = value => { const normalized = core.key(value).replace(/_/g, '-'); return /^(?:en(?:-|$)|english$)/.test(normalized) ? 'en' : normalized; };
    const sourceLanguage = languageKey(pack.language);
    // A saved set can replace the teaching language. Inherited recordings then
    // belong to the launcher, while the imported set's embedded clips stay valid.
    const inheritedBanks = () => languageKey(pack.language) === sourceLanguage
      ? { phonemeBank: context.phonemeBank, wordBank: context.wordBank }
      : { phonemeBank: {}, wordBank: {} };
    const abort = new root.AbortController(), urls = new Set();
    const overlay = doc.createElement('div'); overlay.className = 'awp awp-overlay';
    const style = doc.createElement('style'); style.textContent = CSS; overlay.appendChild(style);
    const dialog = doc.createElement('section'); dialog.className = 'awp-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', 'Present & Export'); overlay.appendChild(dialog);
    const hiddenSiblings = Array.from(doc.body.children).filter(node => node !== overlay && !['SCRIPT', 'STYLE'].includes(node.tagName)).map(node => ({ node, inert: node.inert }));
    hiddenSiblings.forEach(({ node }) => { node.inert = true; });
    const priorOverflow = doc.body.style.overflow; doc.body.style.overflow = 'hidden'; doc.body.appendChild(overlay);
    const make = (tag, text, parent, cls) => { const node = doc.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; (parent || dialog).appendChild(node); return node; };
    const header = make('div', null, dialog, 'awp-head'); make('h1', 'Present & Export', header);
    const closeButton = make('button', 'Close', header); closeButton.type = 'button'; closeButton.onclick = close;
    const setup = make('div', null, dialog), playerHost = make('div', null, dialog); playerHost.hidden = true;
    make('p', 'Turn a word list into a short class practice routine. Use prepared audio and activities when they are available.', setup, 'awp-note');
    const grid = make('div', null, setup, 'awp-grid');
    const left = make('div', null, grid, 'awp-fields');
    function field(parent, labelText, tag, type) {
      const label = make('label', null, parent), name = make('span', labelText, label);
      const control = make(tag || 'input', null, label), id = fieldPrefix + (++nextFieldId);
      control.id = id; label.htmlFor = id; name.id = id + '-label'; control.setAttribute('aria-labelledby', name.id);
      if (type) control.type = type; return control;
    }
    const titleInput = field(left, 'Practice title'); titleInput.maxLength = 160;
    const wordsInput = field(left, 'Words (one per line)', 'textarea'); wordsInput.maxLength = 100000;
    make('p', 'Up to 200 words or short phrases. Existing meanings, activities and recordings stay with words you keep.', left, 'awp-note');
    const right = make('div', null, grid, 'awp-fields');
    const mode = field(right, 'Practice activity', 'select');
    [['popup', 'Word Fluency Pop-Up'], ['blend', 'Sound & Blend'], ['vocabulary', 'Word Meaning'], ['spelling', 'Listen & Spell'], ['sentence', 'Finish the Sentence']].forEach(([value, label]) => { const option = make('option', label, mode); option.value = value; });
    const repetitions = field(right, 'Repetitions per word', 'input', 'number'); repetitions.min = '1'; repetitions.max = '10';
    const pacing = field(right, 'Pacing', 'select'); [['manual', 'Teacher advances'], ['timed', 'Timed cards']].forEach(([value, label]) => { const option = make('option', label, pacing); option.value = value; });
    const interval = field(right, 'Seconds per card', 'input', 'number'); interval.min = '1'; interval.max = '30'; interval.step = '0.5';
    function checkbox(text) {
      const label = make('label', null, right), input = make('input', null, label), name = make('span', text, label), id = fieldPrefix + (++nextFieldId);
      input.type = 'checkbox'; input.id = id; label.htmlFor = id; name.id = id + '-label'; input.setAttribute('aria-labelledby', name.id); return input;
    }
    const shuffle = checkbox('Shuffle each repetition');
    const position = checkbox('Vary word position');
    const size = checkbox('Vary word size');
    const includeAudio = checkbox('Include prepared audio');
    const coverage = make('p', '', setup, 'awp-note awp-gap');
    make('p', 'HTML keeps interactive practice and works offline. PowerPoint uses fixed slides and embeds available recordings. Sentence activities use only prepared boards; PowerPoint includes prompt and answer slides.', setup, 'awp-note');
    const actions = make('div', null, setup, 'awp-actions');
    const status = make('p', '', setup, 'awp-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const fileInput = make('input', null, setup); fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.hidden = true;
    function options() { return core.normalizeOptions({ mode: mode.value, repetitions: repetitions.value, autoAdvance: pacing.value === 'timed', intervalSeconds: interval.value, shuffle: shuffle.checked, varyPosition: position.checked, varySize: size.checked, includeAudio: includeAudio.checked }); }
    function readPack() {
      const retained = new Map(pack.items.map(item => [core.key(item.word), item]));
      const words = core.parseWords(wordsInput.value).map(word => ({ ...(retained.get(core.key(word)) || {}), word }));
      pack = core.normalizeInput({ title: titleInput.value, language: pack.language, words, options: options(), phonemeBank: inheritedBanks().phonemeBank });
      return pack;
    }
    function updateCoverage() {
      try { const current = readPack(), counts = core.audioCoverage(current), sentences = current.items.filter(item => item.sentenceActivity).length; coverage.textContent = current.items.length + ' words · Word audio: ' + counts.words + '/' + counts.totalWords + ' · Complete sound sequences: ' + counts.completePhonemeWords + '/' + counts.totalWords + ' · Sentence activities: ' + sentences; }
      catch (error) { coverage.textContent = error.message; }
      interval.disabled = pacing.value !== 'timed';
    }
    function fill() {
      titleInput.value = pack.title; wordsInput.value = pack.items.map(item => item.word).join('\n');
      const opts = pack.options; mode.value = opts.mode; repetitions.value = opts.repetitions; pacing.value = opts.autoAdvance ? 'timed' : 'manual'; interval.value = opts.intervalSeconds;
      shuffle.checked = opts.shuffle; position.checked = opts.varyPosition; size.checked = opts.varySize; includeAudio.checked = opts.includeAudio;
      updateCoverage();
    }
    function setBusy(value) { busy = value; setup.setAttribute('aria-busy', String(value)); setup.querySelectorAll('button,input,textarea,select').forEach(control => { control.disabled = value; }); if (!value) interval.disabled = pacing.value !== 'timed'; }
    async function action(callback) {
      if (busy || closed) return;
      status.textContent = ''; setBusy(true);
      try { await callback(); } catch (error) { if (!closed && error.name !== 'AbortError') status.textContent = error.message || 'Unable to finish this action.'; }
      finally { if (!closed) { setBusy(false); updateCoverage(); } }
    }
    function actionButton(label, callback, primary) { const button = make('button', label, actions, primary ? 'awp-primary' : ''); button.type = 'button'; button.onclick = () => action(callback); return button; }
    function ready() { const current = readPack(); if (!current.items.length) throw new Error('Add at least one word to begin.'); return current; }
    function filename(extension) { return (pack.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').slice(0, 80).trim() || 'word-practice') + extension; }
    function download(contents, mime, extension) {
      if (closed) return;
      const url = root.URL.createObjectURL(new root.Blob([contents], { type: mime })); urls.add(url);
      const link = doc.createElement('a'); link.href = url; link.download = filename(extension); doc.body.appendChild(link); link.click(); link.remove();
      root.setTimeout(() => { root.URL.revokeObjectURL(url); urls.delete(url); }, 30000);
    }
    actionButton('Present', () => {
      const current = ready(), opts = options(), sequence = core.createSequence(current, opts);
      setup.hidden = true; playerHost.hidden = false;
      player = mountPlayer(playerHost, current, opts, sequence, core, { onBack() { player = null; playerHost.replaceChildren(); playerHost.hidden = true; setup.hidden = false; header.hidden = false; present.focus(); } });
    }, true);
    const present = actions.lastChild;
    actionButton('Download HTML', () => { const current = ready(); download(buildHtml(current, options()), 'text/html;charset=utf-8', '.html'); status.textContent = 'HTML downloaded. Open the file in a browser to practice offline.'; });
    actionButton('Download PowerPoint', async () => {
      const current = ready(), opts = options();
      const media = root.AlloWordPracticeMedia; if (!media || !media.buildPptx) throw new Error('The PowerPoint exporter is unavailable. Try reopening Present & Export.');
      status.textContent = 'Building PowerPoint…';
      const pptx = await media.buildPptx(current, opts, core.createSequence(current, opts), { ...context, signal: abort.signal });
      if (closed) return;
      await pptx.writeFile({ fileName: filename('.pptx') });
      if (!closed) status.textContent = 'PowerPoint downloaded.' + (pptx.wordPracticeWarnings && pptx.wordPracticeWarnings.length ? ' ' + pptx.wordPracticeWarnings.join(' ') : '');
    });
    actionButton('Prepare audio', async () => {
      const current = ready(), media = root.AlloWordPracticeMedia;
      if (!media || !media.prepareAudio) throw new Error('Audio preparation is unavailable. Try reopening Present & Export.');
      status.textContent = 'Preparing missing recordings…';
      const prepared = await media.prepareAudio(current, { ...context, ...inheritedBanks(), signal: abort.signal }, progress => {
        if (closed) return;
        if (typeof progress === 'string') status.textContent = core.text(progress, 240);
        else if (progress && Number.isFinite(progress.completed) && Number.isFinite(progress.total)) status.textContent = 'Preparing recordings: ' + progress.completed + ' of ' + progress.total + (progress.word ? ' — ' + core.text(progress.word, 120) : '') + '.';
        else status.textContent = 'Preparing recordings…';
      });
      if (closed) return;
      const audioStatus = prepared.audioStatus || {}, errors = Array.isArray(audioStatus.errors) ? [...new Set(audioStatus.errors.map(value => core.text(value, 180)).filter(Boolean))] : [];
      pack = core.normalizeInput(prepared); fill();
      const counts = core.audioCoverage(pack);
      status.textContent = 'Audio ready for ' + counts.words + ' of ' + counts.totalWords + ' words. Complete sound sequences: ' + counts.completePhonemeWords + '. '
        + (core.text(audioStatus.message, 240) || (counts.words < counts.totalWords || counts.phonemes < counts.totalPhonemes ? 'Missing recordings remain silent.' : 'All prepared recordings are ready.'))
        + (errors.length ? ' ' + errors.slice(0, 2).join(' ') + (errors.length > 2 ? ' ' + (errors.length - 2) + ' more recording issues.' : '') : '');
    });
    actionButton('Save word set', () => { const current = ready(); download(core.serializePack(withoutAudio({ ...current, options: options() }, includeAudio.checked)), 'application/json', '.json'); status.textContent = 'Word set saved with its practice settings.'; });
    const openSet = actionButton('Open word set', () => {});
    openSet.onclick = () => { if (!busy) { fileInput.value = ''; fileInput.click(); } };
    fileInput.addEventListener('change', () => action(async () => {
      const file = fileInput.files && fileInput.files[0]; if (!file) return;
      if (file.size > 32 * 1024 * 1024) throw new Error('This word set is too large. Use a file smaller than 32 MB.');
      const imported = core.normalizeInput(JSON.parse(await file.text()));
      if (closed) return;
      if (!imported.items.length) throw new Error('This file does not contain a word list.');
      pack = imported; fill(); status.textContent = 'Word set opened.';
    }));
    setup.addEventListener('change', updateCoverage);
    function trap(event) {
      if (event.key === 'Escape' && !doc.fullscreenElement) { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const scope = doc.fullscreenElement && doc.fullscreenElement.contains(playerHost) ? doc.fullscreenElement : dialog;
      const candidates = Array.from(scope.querySelectorAll('button,input,textarea,select,a[href],[tabindex="0"]')).filter(node => !node.disabled && !node.hidden && node.getClientRects().length);
      if (!candidates.length) { event.preventDefault(); return; }
      const first = candidates[0], last = candidates[candidates.length - 1];
      if (event.shiftKey && (doc.activeElement === first || !candidates.includes(doc.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (doc.activeElement === last || !candidates.includes(doc.activeElement))) { event.preventDefault(); first.focus(); }
    }
    function close() {
      if (closed) return; closed = true; abort.abort(); if (player) player.destroy(); overlay.removeEventListener('keydown', trap);
      if (context.signal) context.signal.removeEventListener('abort', close);
      urls.forEach(url => root.URL.revokeObjectURL(url)); urls.clear(); overlay.remove();
      hiddenSiblings.forEach(({ node, inert }) => { if (node.isConnected) node.inert = inert; }); doc.body.style.overflow = priorOverflow;
      if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus(); if (active === controller) active = null;
    }
    overlay.addEventListener('keydown', trap); fill(); titleInput.focus();
    const controller = { close }; active = controller;
    if (context.signal) context.signal.addEventListener('abort', close, { once: true });
    return controller;
  }
  root.AlloModules = root.AlloModules || {};
  root.AlloModules.WordPractice = { open, buildHtml };
})(typeof window !== 'undefined' ? window : globalThis);
