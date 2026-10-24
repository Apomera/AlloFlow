/* Shared classroom presenter and portable HTML player. */
(function (root) {
  'use strict';
  const CSS = `
.awp,.awp *{box-sizing:border-box}.awp{font:1rem/1.5 system-ui,sans-serif;color:#14213d;background:#f5f7fb;overflow-wrap:anywhere;color-scheme:light}.awp-overlay{position:fixed;inset:0;z-index:2147483000;padding:20px;display:flex;align-items:center;justify-content:center;background:#14213dcc}.awp-dialog{width:min(100%,1100px);max-height:calc(100dvh - 40px);overflow:auto;border-radius:20px;background:#f5f7fb;padding:1.5rem;box-shadow:0 16px 80px #0005}.awp h1,.awp p{margin:0 0 .75rem}.awp h1{font-size:1.625rem;line-height:1.2}.awp button,.awp input,.awp textarea,.awp select{font:inherit;color:#14213d}.awp button{min-height:44px;padding:.5625rem .9375rem;border:1px solid #a8b4c7;border-radius:9px;background:white;cursor:pointer;white-space:normal}.awp button:hover:not(:disabled){background:#e9effa}.awp button:disabled{color:#596579;background:#e7ebf2;cursor:default}.awp .awp-primary{color:white;background:#294fc3;border-color:#294fc3}.awp .awp-primary:hover:not(:disabled){background:#1e3d99}.awp .awp-aa{min-width:44px;font-weight:700}.awp :focus-visible{outline:3px solid #bc4a00;outline-offset:3px}.awp input:not([type=checkbox]):not([type=radio]):not([type=range]),.awp textarea,.awp select{width:100%;max-width:100%;border:1px solid #8191a9;background:white;border-radius:7px;padding:.5625rem}.awp textarea{resize:vertical;min-height:10.625rem}.awp label{display:block;font-weight:600}.awp label>span{display:block;margin-bottom:.3125rem}.awp label:has(input[type=checkbox]){display:flex;align-items:center;gap:.5625rem;font-weight:400}.awp input[type=checkbox]{width:1.25rem;height:1.25rem;flex-shrink:0;accent-color:#294fc3}.awp-head,.awp-row{display:flex;align-items:center;gap:.625rem;flex-wrap:wrap}.awp-head{justify-content:space-between;margin-bottom:1.25rem}.awp-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1.5rem}.awp-fields{display:grid;gap:.8125rem}.awp-note{font-size:.875rem;color:#45536a}.awp-status{min-height:1.5625rem;margin-top:.875rem!important;color:#263e6c}.awp-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.125rem}.awp-surface{border:1px solid #bdc8da;border-radius:14px;background:white;padding:1.125rem;min-width:0}.awp-player{width:100%;max-width:1400px;margin:auto;padding:1.25rem}.awp-stage{position:relative;display:flex;align-items:center;justify-content:center;min-height:48vh;padding:2.125rem;border:1px solid #bac6d9;border-radius:16px;background:white;margin:1rem 0;overflow:hidden}.awp-card{max-width:100%;width:100%;text-align:center}.awp-word{font-weight:750;font-size:clamp(2.125rem,9vw,7rem);line-height:1.2;overflow-wrap:anywhere;white-space:normal}.awp-stage[data-position^=top]{align-items:flex-start}.awp-stage[data-position^=bottom]{align-items:flex-end}.awp-stage[data-position$=left] .awp-card{text-align:left}.awp-stage[data-position$=right] .awp-card{text-align:right}.awp-detail{font-size:clamp(1.25rem,3vw,2.125rem);line-height:1.5;white-space:pre-wrap}.awp-phonemes{display:flex;justify-content:center;flex-wrap:wrap;gap:.875rem;font-size:clamp(1.75rem,6vw,4.5rem);font-weight:650}.awp-phoneme{padding:.125rem .75rem;border-bottom:4px solid #294fc3}.awp-choices{display:flex;justify-content:center;flex-wrap:wrap;gap:.625rem;margin-top:1.5rem}.awp-choices button{font-size:clamp(1.25rem,3vw,1.875rem);min-width:5.625rem}.awp-feedback{font-size:1.25rem;min-height:1.875rem;margin-top:.875rem!important}.awp-progress{font-variant-numeric:tabular-nums}.awp-footer{display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap}.awp:fullscreen{overflow:auto;background:#f5f7fb}.awp [hidden]{display:none!important}.awp .awp-gap{margin-top:.875rem}.awp .awp-review[aria-pressed=true]{background:#fdf0cf;border-color:#926300;color:#664500}
.awp-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.awp-meaning-choices{min-width:0;margin:0;padding:.75rem;border:1px solid #bdc8da;border-radius:9px}.awp-meaning-choices label{min-height:44px;padding:.375rem 0;align-items:flex-start!important}.awp-meaning-choices input{margin-top:.25rem}.awp-meaning-choices legend{font-weight:650;padding:0 .25rem}
@media(max-width:640px){.awp-overlay{padding:6px}.awp-dialog{padding:.9375rem;max-height:calc(100dvh - 12px);border-radius:12px}.awp-grid{grid-template-columns:minmax(0,1fr);gap:1rem}.awp-player{padding:.5rem}.awp-stage{padding:1.125rem .625rem;min-height:42vh}.awp-head{gap:.5rem}.awp h1{font-size:1.375rem}.awp button{padding:.5625rem .6875rem}.awp-word{font-size:clamp(1.875rem,11vw,4.5rem)}}
@media(prefers-reduced-motion:reduce){.awp *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`;

  // This factory is embedded verbatim in the offline file; keep it dependency-free.
  function mountPlayer(host, pack, options, initialSequence, core, hooks = {}) {
    const doc = host.ownerDocument, win = doc.defaultView;
    const labels = (hooks && hooks.labels) || {};
    const uiLanguage = core.languageInfo(hooks.uiLanguage || labels.__uiLanguage || (Object.keys(labels).length ? '' : 'English'));
    const labelLanguages = labels.__languages || {}, resolvedLabels = new Map();
    const language = (node, value) => { const info = typeof value === 'object' ? value : core.languageInfo(value); node.lang = info.tag || 'und'; node.dir = info.dir || 'auto'; return node; };
    const L = (key, fallback, params) => { const supplied = typeof labels[key] === 'string' && labels[key]; let text = supplied || fallback; Object.keys(params || {}).forEach(p => { text = text.split('{' + p + '}').join(String(params[p])); }); resolvedLabels.set(text, labelLanguages[key] || (supplied && supplied !== fallback ? uiLanguage : core.languageInfo('English'))); return text; };
    const setLabel = (node, key, fallback, params) => { node.textContent = L(key, fallback, params); return language(node, resolvedLabels.get(node.textContent)); };
    const fieldLanguage = (item, field) => core.fieldLanguage(item, field, pack.language);
    let sequence = initialSequence.slice(), index = 0, revealed = false, running = false, timer = null, dead = false;
    let audio = null, audioRun = 0, finishAudio = null;
    const review = new Set(), items = new Map(pack.items.map(item => [item.id, item]));
    host.classList.add('awp', 'awp-player');
    language(host, uiLanguage);
    const make = (tag, text, cls, parent) => { const node = doc.createElement(tag); if (text != null) { node.textContent = text; if (resolvedLabels.has(text)) language(node, resolvedLabels.get(text)); } if (cls) node.className = cls; (parent || host).appendChild(node); return node; };
    const passage = (parent, text, value, cls, tag = 'span') => language(make(tag, text, cls || '', parent), value);
    function labeledPassage(node, key, fallback, name, text, value) {
      const marker = '\ufff0', template = L(key, fallback, { [name]: marker });
      const parts = template.split(marker);
      node.replaceChildren(); language(node, resolvedLabels.get(template));
      if (parts.length === 2) { node.appendChild(doc.createTextNode(parts[0])); passage(node, text, value); node.appendChild(doc.createTextNode(parts[1])); }
      else { node.appendChild(doc.createTextNode(template + ' ')); passage(node, text, value); }
    }
    const button = (text, callback, parent, cls) => { const node = make('button', text, cls, parent); node.type = 'button'; node.addEventListener('click', callback); return node; };
    const header = make('div', null, 'awp-head');
    if (pack.title === 'Word Fluency Pop-Up') make('h1', L('mode_popup', 'Word Fluency Pop-Up'), '', header);
    else passage(header, pack.title, pack.language, '', 'h1');
    const headerActions = make('div', null, 'awp-row', header);
    if (hooks.onBack) button(L('back_to_setup', 'Back to setup'), () => { destroy(); hooks.onBack(); }, headerActions);
    const fullscreen = button(L('full_screen', 'Full screen'), async () => { try { if (doc.fullscreenElement) await doc.exitFullscreen(); else if (host.requestFullscreen) await host.requestFullscreen(); else setLabel(status, 'full_screen_unavailable', 'Full screen is unavailable in this browser.'); } catch (_) { setLabel(status, 'full_screen_unavailable', 'Full screen is unavailable in this browser.'); } }, headerActions);
    if (typeof hooks.openReadingSettings === 'function') { const reading = button('Aa', event => hooks.openReadingSettings(event.currentTarget), headerActions, 'awp-aa'); reading.setAttribute('aria-label', L('reading_settings', 'Reading settings')); reading.setAttribute('aria-haspopup', 'dialog'); }
    const progress = make('p', '', 'awp-progress');
    const omitted = options.includeAudio ? (hooks.audioIssues || core.audioIssueCounts(pack)).staleLanguage : 0;
    if (omitted) { const warning = make('p', L(omitted === 1 ? 'audio_language_omitted_one' : 'audio_language_omitted', omitted === 1 ? '{count} saved recording uses a different language and is not played. Prepare replacement audio in Present & Export.' : '{count} saved recordings use a different language and are not played. Prepare replacement audio in Present & Export.', { count: omitted }), 'awp-note awp-audio-warning'); warning.setAttribute('role', 'status'); }
    const stage = make('div', null, 'awp-stage');
    stage.setAttribute('aria-label', L('practice_card', 'Practice card'));
    const card = make('div', null, 'awp-card', stage);
    const announcement = make('p', '', 'awp-sr'); announcement.setAttribute('role', 'status'); announcement.setAttribute('aria-live', 'polite'); announcement.setAttribute('aria-atomic', 'true');
    const toolbar = make('div', null, 'awp-row');
    const previous = button(L('previous', 'Previous'), () => move(-1), toolbar);
    const next = button(L('next', 'Next'), () => move(1), toolbar, 'awp-primary');
    const reveal = button(L('reveal_answer', 'Reveal answer'), () => { revealed = true; renderCard(); schedule(); }, toolbar);
    const wordButton = button(L('hear_word', 'Hear word'), () => playClips([current().wordAudio]), toolbar);
    const soundsButton = button(L('hear_sounds', 'Hear sounds'), () => playClips(current().phonemes.map(sound => sound.audio)), toolbar);
    const timerButton = button(L('start_timer', 'Start timer'), () => { running = !running; updateTimer(); schedule(); }, toolbar);
    timerButton.hidden = !options.autoAdvance;
    const reviewButton = button(L('add_to_review', 'Add to review'), () => { const id = current().id; if (review.has(id)) review.delete(id); else review.add(id); updateReview(); }, toolbar, 'awp-review');
    const footer = make('div', null, 'awp-footer awp-gap');
    const roundButtons = make('div', null, 'awp-row', footer);
    const newRound = button(L('new_round', 'New round'), () => { sequence = core.createSequence(pack, options); index = 0; running = false; render(); }, roundButtons);
    const reviewRound = button(L('start_review', 'Start review ({count})', { count: 0 }), () => { sequence = core.createSequence({ items: pack.items.filter(item => review.has(item.id)) }, { ...options, repetitions: 1 }); index = 0; running = false; render(); }, roundButtons);
    make('p', options.autoAdvance ? L('keys_help_timed', 'Arrow keys: move · Space: start or pause timer · R: reveal') : L('keys_help_manual', 'Arrow keys: move · Space: next card · R: reveal'), 'awp-note', footer);
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
      if (!clips.length || clips.some(clip => !core.safeAudio(clip))) { setLabel(status, 'recording_unavailable', 'The complete recording is not available for this word.'); return; }
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
        if (!ok) { if (!dead && run === audioRun) setLabel(status, 'recording_failed', 'This browser could not play the recording.'); return; }
      }
      if (run === audioRun) { audio = null; finishAudio = null; }
    }
    function updateTimer() { setLabel(timerButton, running ? 'pause_timer' : 'start_timer', running ? 'Pause timer' : 'Start timer'); timerButton.setAttribute('aria-pressed', String(running)); }
    function schedule() {
      if (timer) win.clearTimeout(timer); timer = null;
      if (!running || dead) return;
      if ((options.mode === 'sentence' || options.mode === 'spelling') && !revealed) return;
      timer = win.setTimeout(() => move(1), options.intervalSeconds * 1000);
    }
    function updateReview() {
      const marked = current() && review.has(current().id);
      setLabel(reviewButton, marked ? 'remove_from_review' : 'add_to_review', marked ? 'Remove from review' : 'Add to review');
      reviewButton.setAttribute('aria-pressed', String(!!marked));
      setLabel(reviewRound, 'start_review', 'Start review ({count})', { count: review.size }); reviewRound.disabled = !review.size;
    }
    function appendTranslation(parent, translation) {
      if (translation.language) passage(parent, translation.language + ': ', '', 'awp-language-name');
      passage(parent, translation.text, translation.language, 'awp-translation');
    }
    function renderCard() {
      // Choices are replaced on every card/reveal. Keep keyboard focus inside
      // the player when its focused choice is removed by that replacement.
      const hadCardFocus = card.contains(doc.activeElement);
      const choiceIndex = Array.from(card.querySelectorAll('.awp-choices button')).indexOf(doc.activeElement);
      const item = current(), frame = sequence[index]; card.replaceChildren();
      stage.dataset.position = frame.position;
      const showWord = () => { const word = passage(card, item.word, fieldLanguage(item, 'term'), 'awp-word', 'div'); word.style.fontSize = 'clamp(1.875rem,' + (9 * frame.scale) + 'vw,' + (7 * frame.scale) + 'rem)'; };
      if (options.mode === 'sentence') {
        const activity = item.sentenceActivity;
        passage(card, activity.prompt, fieldLanguage(item, 'sentence'), 'awp-detail', 'p');
        const choices = make('div', null, 'awp-choices', card);
        const feedback = make('p', '', 'awp-feedback', card); feedback.setAttribute('role', 'status');
        if (revealed) labeledPassage(feedback, 'answer', 'Answer: {answer}', 'answer', activity.answer, fieldLanguage(item, 'term'));
        activity.choices.forEach(choice => language(button(choice, () => {
          if (core.key(choice) === core.key(activity.answer)) { labeledPassage(feedback, 'sentence_correct', 'Yes. {answer} completes the sentence.', 'answer', activity.answer, fieldLanguage(item, 'term')); revealed = true; reveal.disabled = true; updateAudioControls(); schedule(); }
          else setLabel(feedback, 'sentence_try_again', 'Try another word. Read the whole sentence again.');
        }, choices), fieldLanguage(item, 'term')));
      } else if (options.mode === 'spelling' && !revealed) {
        make('p', item.wordAudio && options.includeAudio ? L('spell_listen', 'Listen, then spell the word.') : L('spell_teacher', 'Ask your teacher to say the word, then spell it.'), 'awp-detail', card);
      } else if (options.mode === 'blend' && !revealed && item.phonemes.length) {
        const sounds = make('div', null, 'awp-phonemes', card);
        item.phonemes.forEach(sound => passage(sounds, sound.label, fieldLanguage(item, 'term'), 'awp-phoneme'));
        make('p', L('blend_help', 'Say the sounds, then blend the word.'), 'awp-note awp-gap', card);
      } else {
        showWord();
        if (options.mode === 'vocabulary' && revealed) {
          if (item.definition) passage(card, item.definition, fieldLanguage(item, 'definition'), 'awp-detail awp-gap awp-definition', 'p');
          if (item.example) passage(card, item.example, fieldLanguage(item, 'example'), 'awp-detail awp-example', 'p');
          item.translations.forEach(translation => appendTranslation(make('p', null, 'awp-detail', card), translation));
          if (!item.definition && !item.example && !item.translations.length) make('p', L('no_meaning', 'No meaning or example has been prepared for this word.'), 'awp-note awp-gap', card);
        }
      }
      reveal.hidden = options.mode === 'popup' || (options.mode === 'blend' && !item.phonemes.length);
      setLabel(reveal, options.mode === 'vocabulary' ? 'show_meaning' : options.mode === 'blend' ? 'show_word' : 'reveal_answer', options.mode === 'vocabulary' ? 'Show meaning' : options.mode === 'blend' ? 'Show word' : 'Reveal answer'); reveal.disabled = revealed;
      // Keep every visible passage in its own language in the live announcement.
      // Hidden spelling/sentence answers are never added before reveal.
      const marker = '\ufff0', template = L('card_announce', 'Card {n} of {total}. {visible}', { n: index + 1, total: sequence.length, visible: marker });
      const parts = template.split(marker); announcement.replaceChildren(); language(announcement, resolvedLabels.get(template));
      announcement.appendChild(doc.createTextNode(parts.length === 2 ? parts[0] : ''));
      const separator = () => announcement.appendChild(doc.createTextNode('. '));
      if (options.mode === 'spelling' && !revealed) {
        const recorded = item.wordAudio && options.includeAudio;
        make('span', recorded ? L('spell_listen', 'Listen, then spell the word.') : L('spell_teacher', 'Ask your teacher to say the word, then spell it.'), '', announcement);
      } else if (options.mode === 'sentence') {
        passage(announcement, item.sentenceActivity.prompt, fieldLanguage(item, 'sentence'));
        if (revealed) { separator(); labeledPassage(make('span', '', '', announcement), 'answer', 'Answer: {answer}', 'answer', item.sentenceActivity.answer, fieldLanguage(item, 'term')); }
      } else if (options.mode === 'blend' && !revealed && item.phonemes.length) {
        passage(announcement, item.phonemes.map(sound => sound.label).join(', '), fieldLanguage(item, 'term')); separator();
        make('span', L('blend_help', 'Say the sounds, then blend the word.'), '', announcement);
      } else {
        passage(announcement, item.word, fieldLanguage(item, 'term'), 'awp-announced-word');
        if (options.mode === 'vocabulary' && revealed) {
          if (item.definition) { separator(); passage(announcement, item.definition, fieldLanguage(item, 'definition'), 'awp-definition'); }
          if (item.example) { separator(); passage(announcement, item.example, fieldLanguage(item, 'example'), 'awp-example'); }
          item.translations.forEach(translation => { separator(); appendTranslation(announcement, translation); });
        }
      }
      if (parts.length === 2) announcement.appendChild(doc.createTextNode(parts[1]));
      updateAudioControls();
      if (hadCardFocus) {
        const choices = card.querySelectorAll('.awp-choices button');
        const target = choiceIndex >= 0 && choices.length ? choices[Math.min(choiceIndex, choices.length - 1)] : host;
        target.focus({ preventScroll: true });
      }
    }
    function render() {
      stopAudio(); revealed = false; status.textContent = '';
      const item = current();
      if (!item) { stage.textContent = L('add_words', 'Add words to begin practice.'); [previous, next, reveal, wordButton, soundsButton, timerButton, reviewButton, newRound, reviewRound].forEach(button => button.disabled = true); return; }
      setLabel(progress, 'card_progress', 'Card {n} of {total}', { n: index + 1, total: sequence.length });
      previous.disabled = index === 0; next.disabled = index >= sequence.length - 1;
      renderCard(); updateReview(); updateTimer(); schedule();
    }
    function move(direction) {
      if (index + direction >= sequence.length) { running = false; updateTimer(); schedule(); stopAudio(); setLabel(status, 'round_complete', 'Round complete. Start a new round or review the words you marked.'); return; }
      if (index + direction < 0) return;
      index += direction; render();
    }
    function keydown(event) {
      if (dead || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      // A panel opened inside the full-screen player keeps its own keys.
      const panel = event.target.closest && event.target.closest('[role="dialog"]'); if (panel && host.contains(panel)) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      else if (event.key === ' ' && event.target.tagName !== 'BUTTON') { event.preventDefault(); if (options.autoAdvance) { running = !running; updateTimer(); schedule(); } else move(1); }
      else if (event.key.toLowerCase() === 'r' && !reveal.hidden) { event.preventDefault(); revealed = true; renderCard(); schedule(); }
    }
    function visibility() { if (doc.hidden) { running = false; stopAudio(); updateTimer(); schedule(); } }
    function fullscreenChange() { setLabel(fullscreen, doc.fullscreenElement ? 'exit_full_screen' : 'full_screen', doc.fullscreenElement ? 'Exit full screen' : 'Full screen'); }
    function destroy() { dead = true; if (timer) win.clearTimeout(timer); stopAudio(); host.removeEventListener('keydown', keydown); doc.removeEventListener('visibilitychange', visibility); doc.removeEventListener('fullscreenchange', fullscreenChange); win.removeEventListener('pagehide', destroy); if (doc.fullscreenElement === host && doc.exitFullscreen) doc.exitFullscreen().catch(() => {}); }
    host.tabIndex = -1; host.addEventListener('keydown', keydown); doc.addEventListener('visibilitychange', visibility); doc.addEventListener('fullscreenchange', fullscreenChange); win.addEventListener('pagehide', destroy);
    render(); host.focus();
    return { destroy };
  }

  function withoutAudio(pack, includeAudio) {
    if (includeAudio) return pack;
    return { ...pack, items: pack.items.map(item => {
      const clean = { ...item, wordAudio: '', wordAudioStatus: 'missing', phonemes: item.phonemes.map(sound => { const clean = { ...sound, audio: '', audioStatus: 'missing' }; delete clean.audioOriginal; delete clean.provenance; return clean; }) };
      delete clean.wordAudioOriginal; delete clean.wordAudioProvenance; return clean;
    }) };
  }
  function withoutOriginalAudio(pack) {
    return { ...pack, items: pack.items.map(item => {
      const clean = { ...item, phonemes: item.phonemes.map(sound => { const clean = { ...sound }; delete clean.audioOriginal; return clean; }) };
      delete clean.wordAudioOriginal; return clean;
    }) };
  }
  // reader: optional { css, fontCss } from the host's reading settings; an embedded font needs font-src data:.
  function buildHtml(input, value, suppliedSequence, labels, reader, uiLanguageName) {
    const core = root.AlloWordPracticeCore;
    const normalized = core.normalizeInput(input), options = core.normalizeOptions(value || normalized.options);
    const pack = withoutOriginalAudio(withoutAudio({ ...normalized, options }, options.includeAudio));
    const sequence = suppliedSequence || core.createSequence(pack, options);
    const playerLabels = labels && typeof labels === 'object' ? labels : {};
    const uiName = uiLanguageName || playerLabels.__uiLanguage || (Object.keys(playerLabels).length ? '' : 'English');
    const uiLanguage = core.languageInfo(uiName), language = uiLanguage.tag || 'und';
    const audioIssues = options.includeAudio ? core.audioIssueCounts(normalized) : {};
    const cssText = part => typeof part === 'string' ? part.replace(/</g, '\\3c ') : '';
    const fontCss = reader ? cssText(reader.fontCss) : '', readerCss = reader ? cssText(reader.css) : '';
    return '<!doctype html><html lang="' + core.escapeHtml(language) + '" dir="' + uiLanguage.dir + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; media-src data: blob:; img-src data:' + (fontCss ? '; font-src data:' : '') + '"><title>' + core.escapeHtml(pack.title) + '</title><style>body{margin:0;background:#f5f7fb}' + CSS + (fontCss || readerCss ? '\n' + fontCss + '\n' + readerCss : '') + '</style></head><body><main id="practice" aria-label="' + core.escapeHtml(playerLabels.practice_label || 'Word practice') + '"></main><script>\n(function(){"use strict";const core=(' + core.createCore.toString() + ')();const pack=core.normalizeInput(' + core.safeJson(pack) + ');const options=core.normalizeOptions(' + core.safeJson(options) + ');(' + mountPlayer.toString() + ')(document.getElementById("practice"),pack,options,' + core.safeJson(sequence) + ',core,{labels:' + core.safeJson(playerLabels) + ',uiLanguage:' + core.safeJson(uiName) + ',audioIssues:' + core.safeJson(audioIssues) + '});})();\n</script></body></html>';
  }

  // The player's strings, translated once per dialog and handed to the player (and
  // to the offline file). English stays inline in the player as the fallback.
  const PLAYER_STRINGS = [["word_practice.back_to_setup","Back to setup"],["word_practice.full_screen","Full screen"],["word_practice.exit_full_screen","Exit full screen"],["word_practice.full_screen_unavailable","Full screen is unavailable in this browser."],["word_practice.practice_card","Practice card"],["word_practice.previous","Previous"],["word_practice.next","Next"],["word_practice.reveal_answer","Reveal answer"],["word_practice.hear_word","Hear word"],["word_practice.hear_sounds","Hear sounds"],["word_practice.start_timer","Start timer"],["word_practice.pause_timer","Pause timer"],["word_practice.add_to_review","Add to review"],["word_practice.remove_from_review","Remove from review"],["word_practice.new_round","New round"],["word_practice.start_review","Start review ({count})"],["word_practice.keys_help_timed","Arrow keys: move · Space: start or pause timer · R: reveal"],["word_practice.keys_help_manual","Arrow keys: move · Space: next card · R: reveal"],["word_practice.recording_unavailable","The complete recording is not available for this word."],["word_practice.recording_failed","This browser could not play the recording."],["word_practice.answer","Answer: {answer}"],["word_practice.sentence_correct","Yes. {answer} completes the sentence."],["word_practice.sentence_try_again","Try another word. Read the whole sentence again."],["word_practice.spell_listen","Listen, then spell the word."],["word_practice.spell_teacher","Ask your teacher to say the word, then spell it."],["word_practice.blend_help","Say the sounds, then blend the word."],["word_practice.no_meaning","No meaning or example has been prepared for this word."],["word_practice.show_meaning","Show meaning"],["word_practice.show_word","Show word"],["word_practice.card_announce","Card {n} of {total}. {visible}"],["word_practice.card_progress","Card {n} of {total}"],["word_practice.add_words","Add words to begin practice."],["word_practice.round_complete","Round complete. Start a new round or review the words you marked."],["word_practice.practice_label","Word practice"]];
  PLAYER_STRINGS.push(['word_practice.audio_language_omitted', '{count} saved recordings use a different language and are not played. Prepare replacement audio in Present & Export.']);
  PLAYER_STRINGS.push(['word_practice.audio_language_omitted_one', '{count} saved recording uses a different language and is not played. Prepare replacement audio in Present & Export.']);
  PLAYER_STRINGS.push(['word_practice.mode_popup', 'Word Fluency Pop-Up']);
  let active = null, nextDialogId = 0;
  function open(context = {}) {
    if (context.signal && context.signal.aborted) return { close() {} };
    if (active) active.close();
    const core = root.AlloWordPracticeCore, doc = root.document, previousFocus = doc.activeElement;
    const fieldPrefix = 'awp-' + (++nextDialogId) + '-'; let nextFieldId = 0;
    let pack = core.normalizeInput(context), player = null, closed = false, busy = false;
    // The visible list is a selection, not the metadata store. A word removed
    // during editing can be restored without discarding its prepared content.
    const catalogue = new Map();
    function remember(current) { current.items.forEach(item => catalogue.set(item.id, item)); }
    let nextEditedId = 0;
    const newEntryId = () => { let id; do { id = 'edit:' + (++nextEditedId); } while (catalogue.has(id)); return id; };
    remember(pack);
    // Names and equivalent tags identify the same bank, while a saved script,
    // dialect or region remains part of that identity.
    const languageKey = value => core.languageInfo(value).tag.toLowerCase() || core.key(value).replace(/_/g, '-');
    const sourceLanguage = languageKey(pack.language);
    // A saved set can replace the teaching language. Inherited recordings then
    // belong to the launcher, while the imported set's embedded clips stay valid.
    const inheritedBanks = () => languageKey(pack.language) === sourceLanguage
      ? { phonemeBank: context.phonemeBank, wordBank: context.wordBank }
      : { phonemeBank: {}, wordBank: {} };
    const abort = new root.AbortController();
    // Host t() echoes a missing key; the English beside each key is the fallback.
    const uiLanguageName = context.currentUiLanguage || context.uiLanguage || (typeof context.t === 'function' ? '' : 'English');
    const uiLanguage = core.languageInfo(uiLanguageName), dialogTextLanguages = new Map();
    const setLanguage = (node, value) => { const info = typeof value === 'object' ? value : core.languageInfo(value); node.lang = info.tag || 'und'; node.dir = info.dir; return node; };
    const tx = (key, fallback, params) => {
      let value = '';
      try { value = typeof context.t === 'function' ? context.t(key) : ''; } catch (_) { value = ''; }
      let text = typeof value === 'string' && value && value !== key ? value : fallback;
      Object.keys(params || {}).forEach(p => { text = text.split('{' + p + '}').join(String(params[p])); });
      dialogTextLanguages.set(text, value && value !== key && value !== fallback ? uiLanguage : core.languageInfo('English'));
      return text;
    };
    const playerLabels = () => {
      const labels = {}, languages = {};
      PLAYER_STRINGS.forEach(([key, english]) => { const name = key.replace('word_practice.', ''), text = tx(key, english); labels[name] = text; languages[name] = dialogTextLanguages.get(text); });
      return { ...labels, __uiLanguage: uiLanguageName, __languages: languages };
    };
    const overlay = doc.createElement('div'); overlay.className = 'awp awp-overlay';
    const style = doc.createElement('style'); style.textContent = CSS; overlay.appendChild(style);
    const dialog = doc.createElement('section'); dialog.className = 'awp-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', tx('word_practice.title', 'Present & Export')); overlay.appendChild(dialog);
    setLanguage(dialog, uiLanguage);
    const hiddenSiblings = Array.from(doc.body.children).filter(node => node !== overlay && !['SCRIPT', 'STYLE'].includes(node.tagName)).map(node => ({ node, inert: node.inert }));
    hiddenSiblings.forEach(({ node }) => { node.inert = true; });
    const priorOverflow = doc.body.style.overflow; doc.body.style.overflow = 'hidden'; doc.body.appendChild(overlay);
    const make = (tag, text, parent, cls) => { const node = doc.createElement(tag); if (text != null) { node.textContent = text; if (dialogTextLanguages.has(text)) setLanguage(node, dialogTextLanguages.get(text)); } if (cls) node.className = cls; (parent || dialog).appendChild(node); return node; };
    const header = make('div', null, dialog, 'awp-head'); make('h1', tx('word_practice.title', 'Present & Export'), header);
    const headerActions = make('div', null, header, 'awp-row');
    // The host's reading settings, checked now: a host without the bridge gets no button.
    const readingLibrary = () => { try { const lib = root.AlloModules && root.AlloModules.UIFontLibrary; return lib && typeof lib.openReadingSettings === 'function' && lib.readingSettingsAvailable() ? lib : null; } catch (_) { return null; } };
    const openReading = opener => { const lib = readingLibrary(); if (lib) lib.openReadingSettings({ opener, t: context.t }); };
    const closeReading = () => { const lib = root.AlloModules && root.AlloModules.UIFontLibrary; if (lib && typeof lib.closeReadingSettings === 'function' && overlay.querySelector('[data-allo-reading-settings]')) lib.closeReadingSettings(); };
    const readingButton = readingLibrary() ? make('button', 'Aa', headerActions, 'awp-aa') : null;
    if (readingButton) { readingButton.type = 'button'; readingButton.setAttribute('aria-label', tx('reading_settings.title', 'Reading settings')); readingButton.setAttribute('aria-haspopup', 'dialog'); readingButton.onclick = event => openReading(event.currentTarget); }
    const closeButton = make('button', tx('word_practice.close', 'Close'), headerActions); closeButton.type = 'button'; closeButton.onclick = close;
    const setup = make('div', null, dialog), playerHost = make('div', null, dialog); playerHost.hidden = true;
    make('p', tx('word_practice.intro', 'Turn a word list into a short class practice routine. Use prepared audio and activities when they are available.'), setup, 'awp-note');
    const grid = make('div', null, setup, 'awp-grid');
    const left = make('div', null, grid, 'awp-fields');
    function field(parent, labelText, tag, type) {
      const label = make('label', null, parent), name = make('span', labelText, label);
      const control = make(tag || 'input', null, label), id = fieldPrefix + (++nextFieldId);
      control.id = id; label.htmlFor = id; name.id = id + '-label'; control.setAttribute('aria-labelledby', name.id);
      if (type) control.type = type; return control;
    }
    const titleInput = field(left, tx('word_practice.practice_title', 'Practice title')); titleInput.maxLength = 160;
    const wordsInput = field(left, tx('word_practice.words_label', 'Words (one per line)'), 'textarea'); wordsInput.maxLength = 100000;
    setLanguage(wordsInput, '');
    make('p', tx('word_practice.words_note', 'Up to 200 words or short phrases. Existing meanings, activities and recordings stay with words you keep.'), left, 'awp-note');
    const meaningChoices = make('fieldset', null, left, 'awp-meaning-choices'); meaningChoices.hidden = true;
    const right = make('div', null, grid, 'awp-fields');
    const mode = field(right, tx('word_practice.activity', 'Practice activity'), 'select');
    [['popup', tx('word_practice.mode_popup', 'Word Fluency Pop-Up')], ['blend', tx('word_practice.mode_blend', 'Sound & Blend')], ['vocabulary', tx('word_practice.mode_vocabulary', 'Word Meaning')], ['spelling', tx('word_practice.mode_spelling', 'Listen & Spell')], ['sentence', tx('word_practice.mode_sentence', 'Finish the Sentence')]].forEach(([value, label]) => { const option = make('option', label, mode); option.value = value; });
    const repetitions = field(right, tx('word_practice.repetitions', 'Repetitions per word'), 'input', 'number'); repetitions.min = '1'; repetitions.max = '10';
    const pacing = field(right, tx('word_practice.pacing', 'Pacing'), 'select'); [['manual', tx('word_practice.pacing_manual', 'Teacher advances')], ['timed', tx('word_practice.pacing_timed', 'Timed cards')]].forEach(([value, label]) => { const option = make('option', label, pacing); option.value = value; });
    const interval = field(right, tx('word_practice.seconds_per_card', 'Seconds per card'), 'input', 'number'); interval.min = '1'; interval.max = '30'; interval.step = '0.5';
    function checkbox(text) {
      const label = make('label', null, right), input = make('input', null, label), name = make('span', text, label), id = fieldPrefix + (++nextFieldId);
      input.type = 'checkbox'; input.id = id; label.htmlFor = id; name.id = id + '-label'; input.setAttribute('aria-labelledby', name.id); return input;
    }
    const shuffle = checkbox(tx('word_practice.shuffle', 'Shuffle each repetition'));
    const position = checkbox(tx('word_practice.vary_position', 'Vary word position'));
    const size = checkbox(tx('word_practice.vary_size', 'Vary word size'));
    const includeAudio = checkbox(tx('word_practice.include_audio', 'Include prepared audio'));
    const useReading = readingButton ? checkbox(tx('reading_settings.use_mine', 'Use my reading settings')) : null;
    if (useReading) { const help = make('p', tx('word_practice.use_mine_help', 'The HTML file uses your font, text size and spacing.'), right, 'awp-note'); help.id = useReading.id + '-help'; useReading.setAttribute('aria-describedby', help.id); }
    const coverage = make('p', '', setup, 'awp-note awp-gap');
    const audioWarning = make('p', '', setup, 'awp-note awp-audio-warning'); audioWarning.hidden = true; audioWarning.setAttribute('role', 'status'); audioWarning.setAttribute('aria-live', 'polite');
    make('p', tx('word_practice.formats_note', 'HTML keeps interactive practice and works offline. PowerPoint uses fixed slides and embeds available recordings. Sentence activities use only prepared boards; PowerPoint includes prompt and answer slides.'), setup, 'awp-note');
    const actions = make('div', null, setup, 'awp-actions');
    const status = make('p', '', setup, 'awp-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const fileInput = make('input', null, setup); fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.hidden = true;
    function options() { return core.normalizeOptions({ mode: mode.value, repetitions: repetitions.value, autoAdvance: pacing.value === 'timed', intervalSeconds: interval.value, shuffle: shuffle.checked, varyPosition: position.checked, varySize: size.checked, includeAudio: includeAudio.checked }); }
    function readPack() {
      // Match each written occurrence to a distinct authored entry. Current
      // selection order wins; removed entries remain available for restoration.
      const candidates = new Map(), seen = new Set();
      [...pack.items, ...catalogue.values()].forEach(item => { if (seen.has(item.id)) return; seen.add(item.id); const key = core.key(item.word); if (!candidates.has(key)) candidates.set(key, []); candidates.get(key).push(item); });
      const used = new Map(), newWords = new Map();
      const words = core.parseWords(wordsInput.value, { lineSeparated: true }).map(word => {
        const key = core.key(word), choices = candidates.get(key) || [], index = used.get(key) || 0; used.set(key, index + 1);
        if (choices.length) return index < choices.length ? { ...choices[index], word } : null;
        if (!newWords.has(key)) newWords.set(key, { id: newEntryId(), word });
        return { ...newWords.get(key), word };
      }).filter(Boolean);
      pack = core.normalizeInput({ title: titleInput.value, language: pack.language, words, options: options(), phonemeBank: inheritedBanks().phonemeBank });
      remember(pack);
      return pack;
    }
    function renderMeaningChoices() {
      const focused = meaningChoices.contains(doc.activeElement) && doc.activeElement.dataset.entryId;
      const groups = new Map(); catalogue.forEach(item => { const key = core.key(item.word); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item); });
      const duplicates = [...groups.values()].filter(items => items.length > 1);
      meaningChoices.replaceChildren(); meaningChoices.hidden = !duplicates.length;
      if (!duplicates.length) return;
      make('legend', tx('word_practice.meaning_choices', 'Choose meanings'), meaningChoices);
      make('p', tx('word_practice.meaning_choices_help', 'Entries with the same spelling stay separate. Select the meanings to include.'), meaningChoices, 'awp-note');
      const selected = new Set(pack.items.map(item => item.id));
      duplicates.forEach(items => items.forEach((item, index) => {
        const label = make('label', null, meaningChoices), input = make('input', null, label); input.type = 'checkbox'; input.checked = selected.has(item.id); input.disabled = busy; input.dataset.entryId = item.id;
        const labelText = make('span', null, label);
        make('span', tx('word_practice.meaning_number', 'Meaning {n}: ', { n: index + 1 }), labelText);
        setLanguage(make('span', item.word, labelText), core.fieldLanguage(item, 'term', pack.language));
        if (item.definition) { make('span', ' — ', labelText); setLanguage(make('span', item.definition.length > 160 ? item.definition.slice(0, 157) + '…' : item.definition, labelText), core.fieldLanguage(item, 'definition', pack.language)); }
        else if (item.termLanguage) { make('span', ' — ', labelText); setLanguage(make('span', item.termLanguage, labelText), ''); }
        input.addEventListener('change', event => {
          event.stopPropagation();
          try {
            const current = readPack();
            const words = input.checked ? [...current.items.filter(value => value.id !== item.id), catalogue.get(item.id)] : current.items.filter(value => value.id !== item.id);
            pack = core.normalizeInput({ ...current, words, options: options() }); remember(pack); wordsInput.value = pack.items.map(value => value.word).join('\n'); updateCoverage();
          } catch (error) { updateCoverage(); status.textContent = error.message || tx('word_practice.action_failed', 'Unable to finish this action.'); setLanguage(status, 'English'); }
        });
      }));
      if (focused) [...meaningChoices.querySelectorAll('input')].find(input => input.dataset.entryId === focused)?.focus({ preventScroll: true });
    }
    function updateCoverage() {
      try { const current = readPack(), counts = core.audioCoverage(current), sentences = current.items.filter(item => item.sentenceActivity).length; coverage.textContent = tx('word_practice.coverage', '{count} words · Word audio: {audio}/{total} · Complete sound sequences: {complete}/{total} · Sentence activities: {sentences}', { count: current.items.length, audio: counts.words, total: counts.totalWords, complete: counts.completePhonemeWords, sentences: sentences }); setLanguage(coverage, dialogTextLanguages.get(coverage.textContent));
        const stale = includeAudio.checked ? core.audioIssueCounts(current).staleLanguage : 0; audioWarning.hidden = !stale;
        if (stale) { audioWarning.textContent = tx(stale === 1 ? 'word_practice.audio_language_omitted_one' : 'word_practice.audio_language_omitted', stale === 1 ? '{count} saved recording uses a different language and is not played. Prepare replacement audio in Present & Export.' : '{count} saved recordings use a different language and are not played. Prepare replacement audio in Present & Export.', { count: stale }); setLanguage(audioWarning, dialogTextLanguages.get(audioWarning.textContent)); }
        renderMeaningChoices(); }
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
      try { await callback(); } catch (error) { if (!closed && error.name !== 'AbortError') status.textContent = error.message || tx('word_practice.action_failed', 'Unable to finish this action.'); }
      finally { if (!closed) { setBusy(false); updateCoverage(); } }
    }
    function actionButton(label, callback, primary) { const button = make('button', label, actions, primary ? 'awp-primary' : ''); button.type = 'button'; button.onclick = () => action(callback); return button; }
    function ready() { const current = readPack(); if (!current.items.length) throw new Error(tx('word_practice.need_words', 'Add at least one word to begin.')); return current; }
    function filename(extension) { return (pack.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').slice(0, 80).trim() || 'word-practice') + extension; }
    function download(contents, mime, extension) {
      if (closed) return;
      const url = root.URL.createObjectURL(new root.Blob([contents], { type: mime }));
      const link = doc.createElement('a'); link.href = url; link.download = filename(extension); doc.body.appendChild(link); link.click(); link.remove();
      // Not revoked on close: closing right after a click used to cancel the download.
      root.setTimeout(() => { root.URL.revokeObjectURL(url); }, 30000);
    }
    actionButton(tx('word_practice.present', 'Present'), () => {
      const current = ready(), opts = options(), sequence = core.createSequence(current, opts);
      setup.hidden = true; playerHost.hidden = false;
      const hooks = { onBack() { closeReading(); player = null; playerHost.replaceChildren(); playerHost.hidden = true; setup.hidden = false; header.hidden = false; if (readingButton) readingButton.hidden = false; present.focus(); }, labels: playerLabels(), uiLanguage: uiLanguageName };
      // One "Aa" while presenting: the player's, which also works in full screen.
      if (readingButton) { closeReading(); readingButton.hidden = true; hooks.labels.reading_settings = tx('reading_settings.title', 'Reading settings'); hooks.openReadingSettings = openReading; }
      player = mountPlayer(playerHost, current, opts, sequence, core, hooks);
    }, true);
    const present = actions.lastChild;
    // The reader's CSS plus the font embedded as data; a font that cannot be embedded leaves the system font.
    async function readerStyles() {
      let css = '', fontCss = '', fontMissing = false;
      try {
        const lib = readingLibrary(), settings = lib && root.__alloReadingSettings.get();
        if (!settings) return { reader: null, fontMissing: true };
        css = lib.readerExportCss(settings) || '';
        const linked = await lib.exportFontFaceCss(settings.fontId);
        if (linked && (linked.head || linked.css)) { const embedded = await lib.exportFontFaceCss(settings.fontId, { embed: true }); fontCss = (embedded && embedded.css) || ''; fontMissing = !fontCss; }
      } catch (_) { fontMissing = true; }
      return { reader: { css, fontCss }, fontMissing };
    }
    actionButton(tx('word_practice.download_html', 'Download HTML'), async () => {
      const current = ready(), opts = options(), labels = playerLabels();
      let reader = null, fontMissing = false;
      if (useReading && useReading.checked) {
        status.textContent = tx('word_practice.preparing_reading', 'Adding your reading settings…');
        ({ reader, fontMissing } = await readerStyles());
        if (closed) return;
      }
      download(buildHtml(current, opts, undefined, labels, reader, uiLanguageName), 'text/html;charset=utf-8', '.html');
      status.textContent = tx('word_practice.html_downloaded', 'HTML downloaded. Open the file in a browser to practice offline.') + (fontMissing ? ' ' + tx('word_practice.font_not_embedded', 'Your font could not be added to the file, so it uses the system font.') : '');
    });
    actionButton(tx('word_practice.download_pptx', 'Download PowerPoint'), async () => {
      const current = ready(), opts = options();
      const media = root.AlloWordPracticeMedia; if (!media || !media.buildPptx) throw new Error(tx('word_practice.pptx_unavailable', 'The PowerPoint exporter is unavailable. Try reopening Present & Export.'));
      status.textContent = tx('word_practice.building_pptx', 'Building PowerPoint…');
      const pptx = await media.buildPptx(current, opts, core.createSequence(current, opts), { ...context, labels: playerLabels(), signal: abort.signal });
      if (closed) return;
      await pptx.writeFile({ fileName: filename('.pptx') });
      if (!closed) status.textContent = tx('word_practice.pptx_downloaded', 'PowerPoint downloaded.') + (pptx.wordPracticeWarnings && pptx.wordPracticeWarnings.length ? ' ' + pptx.wordPracticeWarnings.join(' ') : '');
    });
    actionButton(tx('word_practice.prepare_audio', 'Prepare audio'), async () => {
      const current = ready(), media = root.AlloWordPracticeMedia;
      if (!media || !media.prepareAudio) throw new Error(tx('word_practice.audio_unavailable', 'Audio preparation is unavailable. Try reopening Present & Export.'));
      status.textContent = tx('word_practice.preparing_missing', 'Preparing missing recordings…');
      const prepared = await media.prepareAudio(current, { ...context, ...inheritedBanks(), signal: abort.signal }, progress => {
        if (closed) return;
        if (typeof progress === 'string') status.textContent = core.text(progress, 240);
        else if (progress && Number.isFinite(progress.completed) && Number.isFinite(progress.total)) status.textContent = progress.word ? tx('word_practice.preparing_progress_word', 'Preparing recordings: {completed} of {total} — {word}.', { completed: progress.completed, total: progress.total, word: core.text(progress.word, 120) }) : tx('word_practice.preparing_progress', 'Preparing recordings: {completed} of {total}.', { completed: progress.completed, total: progress.total });
        else status.textContent = tx('word_practice.preparing', 'Preparing recordings…');
      });
      if (closed) return;
      const audioStatus = prepared.audioStatus || {}, errors = Array.isArray(audioStatus.errors) ? [...new Set(audioStatus.errors.map(value => core.text(value, 180)).filter(Boolean))] : [];
      pack = core.normalizeInput(prepared); remember(pack); fill();
      const counts = core.audioCoverage(pack);
      status.textContent = tx('word_practice.audio_ready', 'Audio ready for {words} of {total} words. Complete sound sequences: {complete}.', { words: counts.words, total: counts.totalWords, complete: counts.completePhonemeWords }) + ' '
        + (core.text(audioStatus.message, 240) || (counts.words < counts.totalWords || counts.phonemes < counts.totalPhonemes ? tx('word_practice.missing_silent', 'Missing recordings remain silent.') : tx('word_practice.all_ready', 'All prepared recordings are ready.')))
        + (errors.length ? ' ' + errors.slice(0, 2).join(' ') + (errors.length > 2 ? ' ' + tx('word_practice.more_issues', '{count} more recording issues.', { count: errors.length - 2 }) : '') : '');
    });
    actionButton(tx('word_practice.save_set', 'Save word set'), () => { const current = ready(); download(core.serializePack(withoutAudio({ ...current, options: options() }, includeAudio.checked)), 'application/json', '.json'); status.textContent = tx('word_practice.set_saved', 'Word set saved with its practice settings.'); });
    const openSet = actionButton(tx('word_practice.open_set', 'Open word set'), () => {});
    openSet.onclick = () => { if (!busy) { fileInput.value = ''; fileInput.click(); } };
    fileInput.addEventListener('change', () => action(async () => {
      const file = fileInput.files && fileInput.files[0]; if (!file) return;
      if (file.size > 32 * 1024 * 1024) throw new Error(tx('word_practice.set_too_large', 'This word set is too large. Use a file smaller than 32 MB.'));
      const imported = core.normalizeInput(JSON.parse(await file.text()));
      if (closed) return;
      if (!imported.items.length) throw new Error(tx('word_practice.set_no_words', 'This file does not contain a word list.'));
      // A file starts a new set, even when its language/word spelling matches.
      // Neither removed words nor their recordings belong to the imported set.
      pack = imported; catalogue.clear(); remember(pack); fill(); status.textContent = tx('word_practice.set_opened', 'Word set opened.');
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
      closeReading(); overlay.remove();
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
