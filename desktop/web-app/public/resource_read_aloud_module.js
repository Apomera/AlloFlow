/* Resource adapters and accessible controls for the shared durable audio service. */
(function () {
  'use strict';
  const adapters = new Map();
  const text = value => typeof value === 'string' ? value.trim() : '';
  const token = value => encodeURIComponent(String(value));
  const modules = () => window.AlloModules || {};
  const spoken = value => {
    const clean = modules().PhaseKHelpers?.toSpokenText;
    return text(typeof clean === 'function' ? clean(String(value || '')) : String(value || '').replace(/\s+/g, ' '));
  };
  function fingerprint(value) { let hash = 2166136261; for (let i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); } return 'txt-' + value.length.toString(36) + '-' + (hash >>> 0).toString(36); }
  function register(type, enumerate) {
    if (!type || typeof enumerate !== 'function') throw new Error('A resource adapter needs a type and enumerator.');
    adapters.set(type, enumerate);
  }
  function enumerate(resource, options = {}) {
    if (!resource || !adapters.has(resource.type)) return [];
    const language = text(options.defaultLanguage || resource.language || resource.data?.language || resource.data?.lessonRef?.language) || 'English';
    const segments = [];
    const add = (id, value, extra = {}) => {
      const valueText = spoken(value);
      if (!valueText) return;
      segments.push({ segmentId: id, scopeId: 'reference', text: valueText.slice(0, 12000), language, visibility: 'reference', ...extra });
    };
    adapters.get(resource.type)(resource, add, options);
    return segments.slice(0, 320);
  }
  const phases = ['workingQuestion', 'stakeholders', 'possibilities', 'evidence', 'assumptions', 'tradeoffs', 'response', 'testReflection', 'revision', 'transferReflection'];
  register('memory-aid', (resource, add, options) => {
    const data = resource.data || {};
    const normalize = modules().MemoryAid?._testing?.normalizeMemoryAidCards;
    const cards = typeof normalize === 'function' ? normalize(data.cards, data.authorshipMode) : (Array.isArray(data.cards) ? data.cards : []);
    cards.slice(0, 8).forEach((card, index) => {
      if (options.cardId && card.id !== options.cardId) return;
      const base = 'card/' + token(card.id || index);
      const extra = { cardId: card.id };
      const cue = card.aiExample || card.example || card.scaffoldStarter;
      if (options.mode === 'cue') { add(base + '/cue', cue, extra); return; }
      add(base + '/target', card.target, extra);
      if (card.factVerified === true && card.factLocked !== false) {
        (card.essentialFacts || []).forEach((fact, i) => add(base + '/fact/' + token(fact?.id || i), typeof fact === 'string' ? fact : fact?.text, extra));
        add(base + '/mapping', card.mapping, extra);
      }
      add(base + '/cue', cue, extra);
      add(base + '/prompt', card.studentPrompt, extra);
      add(base + '/reasoning-prompt', card.reasoningPrompt, extra);
      (card.scaffoldSteps || []).forEach((step, i) => add(base + '/support/' + i, step, extra));
      (card.coachPrompts || []).forEach((prompt, i) => add(base + '/coach/' + i, prompt, extra));
      if (card.visualReview?.status === 'approved') add(base + '/visual-description', card.visualAlt, extra);
    });
  });
  register('applied-challenge', (resource, add) => {
    const normalize = modules().AppliedChallenge?._testing?.normalizeAppliedChallengeData;
    const data = typeof normalize === 'function' ? normalize(resource.data) : resource.data || {}, brief = data.brief || {}, supports = data.supports || {};
    add('title', data.title || resource.title); add('directions', data.instructions);
    ['context','role','audience','drivingQuestion','seedDirection','deliverable','evidenceBoundary'].forEach(field => add('brief/' + field, brief[field]));
    ['criteria','constraints','openQuestions','stakeholders'].forEach(field => (brief[field] || []).forEach((value, i) => add('brief/' + field + '/' + i, value)));
    if (brief.factVerified === true && brief.factLocked !== false) (brief.lockedLessonFacts || []).forEach((fact, i) => add('brief/fact/' + token(fact?.id || i), typeof fact === 'string' ? fact : fact?.text));
    add('support/frame', supports.frameStarter);
    ['frameChoices','coachPrompts'].forEach(field => (supports[field] || []).forEach((value, i) => add('support/' + field + '/' + i, value)));
    ['context','move','whyItHelps'].forEach(field => add('support/example/' + field, supports.parallelExample?.[field]));
    const api = modules().AppliedChallenge?._testing;
    const visible = api?.appliedChallengeVisiblePhases ? api.appliedChallengeVisiblePhases(data.scope).map(phase => phase.id) : phases;
    visible.forEach(phaseId => add('phase/' + phaseId + '/prompt', supports.phasePrompts?.[phaseId], { phaseId }));
  });

  // This is an egress contract, not a second audio store. Only current,
  // semantically identified reference clips can leave the teacher project.
  const deliveryLimits = Object.freeze({ local: 12 * 1024 * 1024, 'student-pack': 384 * 1024, live: 384 * 1024, qr: 128 * 1024, submission: 0 });
  function portableAudio(resource, channel = 'student-pack', maxBytes) {
    const limit = Math.min(deliveryLimits[channel] || 0, Number.isFinite(maxBytes) ? Math.max(0, maxBytes) : Infinity);
    const store = modules().KaraokeAudioStore;
    if (!limit || !store?.validateAudioPayload || !adapters.has(resource?.type)) return null;
    const raw = resource.karaokeAudio;
    if (raw?.version !== 4 || raw.format !== 'per-entry' || !raw.entries || typeof raw.entries !== 'object') return null;
    const current = new Map(enumerate(resource).map(segment => [segment.scopeId + ':' + segment.segmentId, segment]));
    let bytes = 0;
    const entries = {};
    for (const entry of Object.values(raw.entries).slice(0, 320)) {
      if (!entry || entry.quarantine || !['ai-generated','ai-played','ai','human-teacher'].includes(entry.source)) continue;
      const identity = store.normalizeIdentity(entry.identity);
      if (!identity || identity.adapterId !== 'alloflow.' + resource.type + '.read-aloud') continue;
      const segment = current.get(identity.scopeId + ':' + identity.segmentId);
      if (!segment || identity.spokenText !== segment.text || identity.spokenFingerprint !== fingerprint(segment.text)) continue;
      const audio = store.validateAudioPayload(entry.audio, entry.mime);
      if (!audio.ok || audio.bytes.length > Math.min(limit, 2 * 1024 * 1024) || bytes + audio.bytes.length > limit) continue;
      const profile = store.normalizeSynthesisProfile(entry.synthesisProfile);
      if (profile?.language && profile.language !== segment.language) continue;
      bytes += audio.bytes.length;
      const key = store.portableKeyForIdentity(identity);
      entries[key] = { identity, audio: audio.clean, mime: audio.mime, source: entry.source, synthesisProfile: profile, createdAt: text(entry.createdAt).slice(0, 80) };
    }
    return Object.keys(entries).length ? { format: 'per-entry', version: 4, entries, legacy: {} } : null;
  }

  function sharingReview(resource, channel = 'qr') {
    const issues = [];
    if (resource?.type === 'memory-aid') {
      const normalize = modules().MemoryAid?._testing?.normalizeMemoryAidCards;
      const cards = normalize ? normalize(resource.data?.cards, resource.data?.authorshipMode) : resource.data?.cards || [];
      cards.forEach(card => {
        if (!card.essentialFacts?.length || !card.factVerified || card.factLocked === false) issues.push({ code: 'facts', target: 'facts', cardId: card.id, label: card.target });
        if (card.visualImage && (!text(card.visualAlt) || card.visualReview?.status !== 'approved')) issues.push({ code: !text(card.visualAlt) ? 'description' : 'visual_review', target: 'visual', cardId: card.id, label: card.target });
      });
    } else if (resource?.type === 'applied-challenge') {
      const brief = resource.data?.brief || {};
      if (!brief.lockedLessonFacts?.length || !brief.factVerified || brief.factLocked === false) issues.push({ code: 'facts', target: 'facts' });
    }
    const entries = Object.values(resource?.karaokeAudio?.entries || {});
    const current = enumerate(resource);
    const stale = current.filter(segment => {
      const matching = entries.filter(entry => entry?.identity?.segmentId === segment.segmentId && entry.identity.scopeId === segment.scopeId);
      return matching.length && !matching.some(entry => !entry.quarantine && entry.identity.spokenText === segment.text && entry.identity.spokenFingerprint === fingerprint(segment.text) && modules().KaraokeAudioStore?.validateAudioPayload(entry.audio, entry.mime)?.ok);
    });
    if (stale.length) issues.push({ code: 'stale', target: 'audio', count: stale.length, cardId: stale[0].cardId });
    const available = Object.keys(portableAudio(resource, 'local')?.entries || {}).length;
    const included = Object.keys(portableAudio(resource, channel)?.entries || {}).length;
    if (available > included) issues.push({ code: 'omitted', target: 'audio', count: available - included });
    return { issues, included, available };
  }
  function SharingCheck(props) {
    const React = window.React, e = React.createElement, ref = React.useRef(null);
    const [channel, setChannel] = React.useState('qr');
    const [, refresh] = React.useState(0);
    React.useEffect(() => { const listener = () => refresh(value => value + 1); window.addEventListener('alloflow:karaoke-audio-updated', listener); return () => window.removeEventListener('alloflow:karaoke-audio-updated', listener); }, []);
    const tr = (key, fallback) => { const value = props.t?.('studio_sharing.' + key); return value && value !== 'studio_sharing.' + key ? value : fallback; };
    const report = sharingReview(props.resource, channel);
    const descriptions = { facts: tr('facts', 'Check and verify lesson facts'), description: tr('description', 'Add a visual description'), visual_review: tr('visual_review', 'Review the visual before sharing'), stale: tr('stale', 'Update stale or damaged audio'), omitted: tr('omitted', 'Audio clips exceed this sharing limit') };
    const review = issue => {
      props.onReview?.(issue);
      setTimeout(() => {
        const main = ref.current?.closest('main'); if (!main) return;
        const card = issue.cardId ? [...main.querySelectorAll('[data-studio-card-id]')].find(node => node.dataset.studioCardId === issue.cardId) : main;
        const target = card?.querySelector('[data-studio-review="' + issue.target + '"]');
        if (target) { target.focus(); target.scrollIntoView?.({ block: 'center' }); }
      }, 0);
    };
    return e('details', { ref, className: 'studio-sharing mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3' },
      e('summary', { className: 'min-h-11 cursor-pointer font-bold focus-visible:ring-2' }, tr('heading', 'Ready to share') + ' · ' + report.issues.length + ' ' + tr('items', 'items to review')),
      e('label', { className: 'mt-2 flex flex-wrap items-center gap-2 text-sm' }, tr('channel', 'Sharing method'), e('select', { value: channel, onChange: event => setChannel(event.target.value), className: 'min-h-11 rounded-lg border bg-white px-2' }, e('option', { value: 'qr' }, tr('qr', 'Homework / QR')), e('option', { value: 'live' }, tr('live', 'Live / student pack')))),
      e('p', { role: 'status', className: 'my-2 text-sm' }, report.issues.length ? tr('review_note', 'Review these items before sharing. You decide when the resource is ready.') : tr('clear', 'No issues found by these checks. Review the content as a teacher before sharing.')),
      report.issues.length > 0 && e('ul', { className: 'space-y-2' }, report.issues.map((issue, index) => e('li', { key: index }, e('button', { type: 'button', className: 'min-h-11 rounded-lg border border-amber-400 bg-white px-3 py-2 text-start text-sm underline focus-visible:ring-2', onClick: () => review(issue) }, descriptions[issue.code] + (issue.count ? ' (' + issue.count + ')' : '') + (issue.label ? ': ' + issue.label : ''))))),
      e('p', { className: 'mt-2 text-xs' }, report.included + ' ' + tr('clips', 'current reference clips included. Missing clips can use a device voice.')));
  }

  function clipExtension(resource, segment) {
    const entry = Object.values(resource?.karaokeAudio?.entries || {}).find(entry => entry?.identity?.segmentId === segment.segmentId && entry.identity.scopeId === segment.scopeId && entry.identity.spokenText === segment.text);
    const mime = entry?.mime || '';
    return ({'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/ogg': '.ogg', 'audio/webm': '.webm', 'audio/mp4': '.m4a'})[mime] || '';
  }
  function LocalText(props) {
    const React = window.React, e = React.createElement;
    const [playing, setPlaying] = React.useState(false), [paused, setPaused] = React.useState(false);
    const current = React.useRef(null), id = React.useRef('local-' + Math.random().toString(36).slice(2));
    const tr = (key, fallback) => { const value = props.t?.('resource_read_aloud.' + key); return value && value !== 'resource_read_aloud.' + key ? value : fallback; };
    const stop = () => { if (current.current) { current.current.onend = current.current.onerror = null; window.speechSynthesis?.cancel(); current.current = null; } };
    React.useEffect(() => {
      const other = event => { if (event.detail !== id.current) { stop(); setPlaying(false); setPaused(false); } };
      window.addEventListener('alloflow:resource-read-aloud-start', other);
      window.addEventListener('alloflow:playback-stopped', other);
      return () => { stop(); window.removeEventListener('alloflow:resource-read-aloud-start', other); window.removeEventListener('alloflow:playback-stopped', other); };
    }, []);
    React.useEffect(() => { stop(); setPlaying(false); setPaused(false); }, [props.text]);
    return e(window.React.Fragment, null, e('button', { type: 'button', className: 'min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:ring-2 focus-visible:ring-teal-600', disabled: !spoken(props.text) || !window.speechSynthesis || typeof SpeechSynthesisUtterance !== 'function', onClick: () => {
      if (playing) { stop(); setPlaying(false); setPaused(false); return; }
      props.stopPlayback?.();
      window.dispatchEvent(new CustomEvent('alloflow:resource-read-aloud-start', { detail: id.current }));
      const utterance = new SpeechSynthesisUtterance(spoken(props.text)); current.current = utterance;
      utterance.onend = utterance.onerror = () => { current.current = null; setPlaying(false); setPaused(false); };
      utterance.rate = Math.max(0.5, Math.min(2, Number(props.voiceSpeed) || 1));
      utterance.volume = Math.max(0, Math.min(1, Number(props.voiceVolume ?? 1)));
      setPlaying(true); setPaused(false); window.speechSynthesis.speak(utterance);
    } }, playing ? tr('stop', 'Stop reading') : props.cue ? tr('read_cue', 'Read cue aloud') : tr('read_work', 'Read my writing')), playing && e('button', { type: 'button', className: 'ms-2 min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:ring-2 focus-visible:ring-teal-600', onClick: () => { if (!current.current) return; if (paused) window.speechSynthesis.resume(); else window.speechSynthesis.pause(); setPaused(!paused); } }, paused ? tr('resume', 'Resume reading') : tr('pause', 'Pause reading')));
  }
  function CueControls(props) {
    const segment = enumerate(props.resource, { cardId: props.cardId, mode: 'cue' })[0];
    return segment && segment.text === spoken(props.text)
      ? window.React.createElement(Controls, { ...props, mode: 'cue', canPrepare: false })
      : window.React.createElement(LocalText, { ...props, cue: true });
  }
  function Controls(props) {
    const React = window.React, e = React.createElement;
    const { resource, cardId, mode = 'reference', canPrepare = false, allowRuntimeAi = false, t, onActiveSegment, stopPlayback, voiceSpeed = 1, voiceVolume = 1 } = props;
    const tr = (key, fallback) => { const translated = t?.('resource_read_aloud.' + key); return translated && translated !== 'resource_read_aloud.' + key ? translated : fallback; };
    const [tick, setTick] = React.useState(0), [active, setActive] = React.useState(-1), [busy, setBusy] = React.useState(false), [progress, setProgress] = React.useState(''), [expanded, setExpanded] = React.useState(false), [message, setMessage] = React.useState('');
    const [paused, setPaused] = React.useState(false), [pauseBetween, setPauseBetween] = React.useState(false), [followFocus, setFollowFocus] = React.useState(true);
    const runtime = React.useRef({ token: 0, audio: null, utterance: null, finish: null, prepare: null, paused: false, resume: null });
    const mounted = React.useRef(true);
    const instance = React.useRef('read-' + Math.random().toString(36).slice(2));
    const segments = enumerate(resource, { cardId, mode });
    const signature = JSON.stringify([resource?.id, segments]);
    const current = React.useRef(null);
    current.current = { signature, allowRuntimeAi, canPrepare, resourceId: resource?.id, pauseBetween, followFocus };
    const bridge = () => window.__alloGetReadAloudAudioBridge?.();
    const inspect = segment => bridge()?.inspect(segment, 'reference') || { status: 'missing' };
    const states = segments.map(inspect);
    const ready = states.filter(state => state.status === 'ready').length;
    const stale = states.filter(state => state.status === 'stale').length;
    const stop = () => {
      const state = runtime.current; state.token += 1; state.playController?.abort();
      if (state.audio) { state.audio.pause(); state.audio.onended = state.audio.onerror = null; state.audio = null; }
      if (state.utterance) { window.speechSynthesis?.cancel(); state.utterance = null; }
      if (state.finish) { state.finish(); state.finish = null; }
      state.paused = false; state.resume?.(); state.resume = null;
      if (mounted.current) { setActive(-1); setPaused(false); }
    };
    React.useEffect(() => {
      mounted.current = true;
      const refresh = () => setTick(value => value + 1);
      const other = event => { if (event.detail !== instance.current) stop(); };
      const stopped = () => stop();
      window.addEventListener('alloflow:karaoke-audio-updated', refresh);
      window.addEventListener('alloflow:resource-read-aloud-start', other);
      window.addEventListener('alloflow:playback-stopped', stopped);
      return () => { mounted.current = false; stop(); runtime.current.prepare?.abort(); window.removeEventListener('alloflow:karaoke-audio-updated', refresh); window.removeEventListener('alloflow:resource-read-aloud-start', other); window.removeEventListener('alloflow:playback-stopped', stopped); };
    }, []);
    React.useEffect(() => { stop(); runtime.current.prepare?.abort(); }, [signature, allowRuntimeAi, canPrepare]);
    const prepare = async segment => {
      if (!canPrepare || !allowRuntimeAi || busy) return;
      const api = bridge(); if (!api) { setMessage(tr('unavailable', 'Read-aloud audio is not available yet.')); return; }
      const controller = new AbortController(); runtime.current.prepare = controller;
      setBusy(true); setMessage('');
      try {
        const result = segment ? await api.regenerate(segment, { signal: controller.signal }) : await api.prepare(segments, (done, total) => { if (mounted.current) setProgress(done + '/' + total); }, { signal: controller.signal });
        if (!controller.signal.aborted && mounted.current) setMessage(result && !result.failed && !result.cancelled ? tr('saved', 'Audio saved with this resource.') : tr('save_failed', 'Some audio could not be saved. Try again.'));
      } catch (error) { if (error?.name !== 'AbortError' && mounted.current) setMessage(tr('save_failed', 'Some audio could not be saved. Try again.')); }
      finally { if (runtime.current.prepare === controller) runtime.current.prepare = null; if (mounted.current) { setBusy(false); setProgress(''); setTick(value => value + 1); } }
    };
    const waitForResume = () => runtime.current.paused ? new Promise(resolve => { runtime.current.resume = resolve; }) : Promise.resolve();
    const togglePause = () => {
      const state = runtime.current;
      state.paused = !state.paused; setPaused(state.paused);
      if (state.paused) { state.audio?.pause(); if (state.utterance) window.speechSynthesis?.pause(); }
      else {
        if (state.audio) Promise.resolve(state.audio.play()).catch(() => { setMessage(tr('play_failed', 'This audio could not play. Save or regenerate the clip, or use a device voice.')); stop(); });
        if (state.utterance) window.speechSynthesis?.resume();
        state.resume?.(); state.resume = null;
      }
    };
    const play = async (start, single = false) => {
      stopPlayback?.(); stop();
      window.dispatchEvent(new CustomEvent('alloflow:resource-read-aloud-start', { detail: instance.current }));
      runtime.current.playController = new AbortController();
      const run = runtime.current.token, fingerprint = current.current.signature;
      const valid = () => mounted.current && run === runtime.current.token && fingerprint === current.current.signature;
      setExpanded(true); setMessage('');
      const end = single ? start + 1 : segments.length;
      for (let i = start; i < end && valid(); i++) {
        await waitForResume(); if (!valid()) break;
        const segment = segments[i]; setActive(i); if (current.current.followFocus) onActiveSegment?.(segment);
        try {
          const api = bridge(); const saved = api?.inspect(segment, 'reference');
          let url = saved?.status === 'ready' ? (saved.url || saved.storedUrl) : null;
          if (!url && current.current.allowRuntimeAi) url = await api?.resolve(segment, { reason: 'studio-reference-playback', signal: runtime.current.playController.signal });
          if (!valid()) break;
          await waitForResume(); if (!valid()) break;
          await new Promise((resolve, reject) => {
            runtime.current.finish = resolve;
            const finish = () => { runtime.current.finish = null; runtime.current.audio = null; runtime.current.utterance = null; resolve(); };
            if (url) {
              const audio = new Audio(url); runtime.current.audio = audio;
              audio.playbackRate = Math.max(0.5, Math.min(2, Number(voiceSpeed) || 1)); audio.volume = Math.max(0, Math.min(1, Number(voiceVolume) || 0));
              audio.onended = finish; audio.onerror = () => reject(new Error('Audio playback failed'));
              Promise.resolve(audio.play()).catch(reject);
            } else if (window.speechSynthesis && typeof SpeechSynthesisUtterance === 'function') {
              const utterance = new SpeechSynthesisUtterance(segment.text); runtime.current.utterance = utterance;
              const voice = window.speechSynthesis.getVoices().find(voice => voice.lang === segment.language || voice.name.toLowerCase().includes(segment.language.toLowerCase()));
              if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
              else if (/^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(segment.language)) utterance.lang = segment.language;
              utterance.rate = Math.max(0.5, Math.min(2, Number(voiceSpeed) || 1)); utterance.onend = finish; utterance.onerror = reject; window.speechSynthesis.speak(utterance);
            } else reject(new Error('No saved clip or device voice available'));
          });
          if (valid() && i + 1 < end && current.current.pauseBetween) { runtime.current.paused = true; setPaused(true); }
        } catch (_) { if (valid()) setMessage(tr('play_failed', 'This audio could not play. Save or regenerate the clip, or use a device voice.')); break; }
      }
      if (valid()) stop();
    };
    if (!segments.length) return null;
    const buttonClass = 'min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50';
    return e('section', { tabIndex: -1, 'data-studio-review': 'audio', className: 'resource-read-aloud my-3 rounded-2xl border border-slate-200 bg-slate-50 p-3', 'aria-label': tr('label', 'Saved read-aloud audio') },
      e('style', null, '@media print{.resource-read-aloud,.studio-sharing,.studio-recovery{display:none!important}}'),
      e('div', { className: 'flex flex-wrap items-center gap-2' },
        e('button', { type: 'button', className: buttonClass, onClick: () => active >= 0 ? stop() : play(0) }, active >= 0 ? tr('stop', 'Stop reading') : mode === 'cue' ? tr('read_cue', 'Read cue aloud') : tr('listen', 'Read reference aloud')),
        active >= 0 && e('button', { type: 'button', className: buttonClass, onClick: togglePause }, paused ? tr('resume', 'Resume reading') : tr('pause', 'Pause reading')),
        active >= 0 && e('button', { type: 'button', className: buttonClass, onClick: () => play(active, true) }, tr('repeat', 'Repeat this field')),
        canPrepare && e('button', { type: 'button', className: buttonClass, disabled: !allowRuntimeAi, 'aria-busy': busy, onClick: () => busy ? runtime.current.prepare?.abort() : prepare() }, busy ? tr('cancel', 'Cancel saving') + ' ' + progress : tr('save', 'Save TTS')),
        e('button', { type: 'button', className: buttonClass, 'aria-expanded': expanded, 'aria-controls': instance.current, onClick: () => setExpanded(value => !value) }, tr('segments', 'Read-along and clips')),
        e('span', { role: 'status', 'aria-live': 'polite', className: 'text-xs text-slate-700' }, ready + '/' + segments.length + ' ' + tr('ready', 'ready') + (stale ? '; ' + stale + ' ' + tr('stale', 'stale') : ''))),
      e('div', { hidden: !expanded, className: 'mt-3 flex flex-wrap gap-3 text-sm' },
        e('label', { className: 'inline-flex min-h-11 items-center gap-2' }, e('input', { type: 'checkbox', checked: pauseBetween, onChange: event => setPauseBetween(event.target.checked) }), tr('pause_between', 'Pause after each field')),
        typeof onActiveSegment === 'function' && e('label', { className: 'inline-flex min-h-11 items-center gap-2' }, e('input', { type: 'checkbox', checked: followFocus, onChange: event => setFollowFocus(event.target.checked) }), tr('follow_focus', 'Move focus with reading'))),
      paused && e('p', { role: 'status', className: 'mt-2 text-sm' }, tr('paused', 'Reading paused. Resume when you are ready.')),
      message && e('p', { role: 'status', className: 'mt-2 text-sm text-slate-700' }, message),
      e('ol', { id: instance.current, hidden: !expanded, className: 'mt-3 max-h-80 space-y-2 overflow-auto' }, segments.map((segment, index) => e('li', { key: segment.segmentId, className: 'rounded-xl border p-2 ' + (active === index ? 'border-teal-600 bg-teal-100 text-slate-950' : 'border-slate-200 bg-white'), 'aria-current': active === index ? 'step' : undefined },
        e('button', { type: 'button', className: 'min-h-11 w-full rounded-lg p-2 text-start text-sm focus-visible:ring-2 focus-visible:ring-teal-600', onClick: () => play(index) }, segment.text),
        canPrepare && e('button', { type: 'button', className: buttonClass, disabled: busy || !allowRuntimeAi, onClick: () => prepare(segment), 'aria-label': tr('regenerate', 'Regenerate clip') + ': ' + segment.text }, tr('regenerate', 'Regenerate clip') + ' · ' + tr(states[index].status, states[index].status)),
        states[index].status === 'ready' && e('a', { className: 'inline-flex min-h-11 items-center rounded-lg px-3 text-sm underline focus-visible:ring-2 focus-visible:ring-teal-600', href: states[index].url || states[index].storedUrl, download: 'read-aloud-' + (index + 1) + clipExtension(resource, segment) }, tr('download', 'Download clip'))))));
  }
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ResourceReadAloud = { register, supports: type => adapters.has(type), enumerate, portableAudio, deliveryLimits, sharingReview, SharingCheck, Controls, CueControls, LocalText };
  window.AlloModules.ResourceReadAloudModule = true;
})();
