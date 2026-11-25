/* Resource adapters and accessible controls for the shared durable audio service. */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  const adapters = new Map();
  const isBlockedKey = key => key === '__proto__' || key === 'constructor' || key === 'prototype';
  const text = value => typeof value === 'string' ? value.trim() : '';
  const token = value => encodeURIComponent(String(value));
  const modules = () => window.AlloModules || {};
  const spoken = value => {
    const clean = modules().PhaseKHelpers?.toSpokenText;
    const raw = String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    return text(typeof clean === 'function' ? clean(raw) : raw.replace(/\s+/g, ' '));
  };
  const speechSetting = (value, min, max, fallback = 1) => {
    const number = value == null || value === '' ? fallback : Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
  };
  function speechTag(value) {
    const tag = text(value).replace(/_/g, '-');
    if (!/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/i.test(tag)) return '';
    try { return typeof Intl !== 'undefined' && typeof Intl.getCanonicalLocales === 'function' ? Intl.getCanonicalLocales(tag)[0] || '' : tag; } catch (_) { return ''; }
  }
  // The full language utility can arrive after a standalone resource view.
  // Keep common lesson names usable during that interval; tags need no table.
  const deviceLanguageNames = {
    english: 'en-US', spanish: 'es-ES', 'spanish (latin america)': 'es-419', 'spanish (castilian)': 'es-ES',
    french: 'fr-FR', 'french (canadian)': 'fr-CA', german: 'de-DE', italian: 'it-IT',
    portuguese: 'pt-BR', 'portuguese (brazil)': 'pt-BR', 'portuguese (portugal)': 'pt-PT', 'portuguese (angola)': 'pt-AO',
    chinese: 'zh-CN', mandarin: 'zh-CN', 'chinese (simplified)': 'zh-CN', 'chinese (traditional)': 'zh-TW',
    arabic: 'ar-SA', hindi: 'hi-IN', japanese: 'ja-JP', korean: 'ko-KR', russian: 'ru-RU',
    vietnamese: 'vi-VN', ukrainian: 'uk-UA', somali: 'so-SO', 'haitian creole': 'ht-HT'
  };
  function speechLanguage(value) {
    const direct = speechTag(value);
    if (direct) return direct;
    const name = text(value).toLowerCase();
    const resolve = modules().ModuleScopeExtras?.getSpeechLangCode || window.getSpeechLangCode;
    try {
      const resolved = typeof resolve === 'function' ? speechTag(resolve(value)) : '';
      // The shared resolver defaults unknown names to English. Leave those to
      // the device default instead of explicitly assigning the wrong language.
      if (resolved && (resolved.split('-')[0].toLowerCase() !== 'en' || /^english(?:\b|$)/.test(name))) return resolved;
    } catch (_) {}
    return Object.prototype.hasOwnProperty.call(deviceLanguageNames, name) ? deviceLanguageNames[name] : '';
  }
  function configureDeviceSpeech(utterance, language, speed, volume) {
    const tag = speechLanguage(language);
    if (tag) {
      let voices = [];
      try { voices = window.speechSynthesis?.getVoices?.() || []; } catch (_) {}
      const matches = (Array.isArray(voices) ? voices : []).map(voice => ({ voice, tag: speechTag(voice?.lang) })).filter(value => value.tag);
      const voice = matches.find(value => value.tag.toLowerCase() === tag.toLowerCase())?.voice
        || matches.find(value => value.tag.split('-')[0].toLowerCase() === tag.split('-')[0].toLowerCase())?.voice;
      if (voice) utterance.voice = voice;
      utterance.lang = voice ? speechTag(voice.lang) : tag;
    }
    utterance.rate = speechSetting(speed, 0.5, 2);
    utterance.volume = speechSetting(volume, 0, 1);
  }
  function fingerprint(value) { let hash = 2166136261; for (let i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); } return 'txt-' + value.length.toString(36) + '-' + (hash >>> 0).toString(36); }
  function register(type, enumerate) {
    if (typeof type !== 'string' || !type.trim() || isBlockedKey(type) || typeof enumerate !== 'function') throw new Error('A resource adapter needs a type and enumerator.');
    adapters.set(type, enumerate);
  }
  function enumerate(resource, options = {}) {
    if (!resource || typeof resource !== 'object' || typeof resource.type !== 'string' || !adapters.has(resource.type)) return [];
    const savedLanguage = modules().TextPipelineHelpers?.getArtifactPrimaryLanguage;
    const language = typeof savedLanguage === 'function'
      ? savedLanguage(resource, options.defaultLanguage || 'English')
      : text(resource.config?.language || resource.language || resource.instructionalText?.complexity?.language
        || resource.data?.language || resource.data?.lessonRef?.language || options.defaultLanguage) || 'English';
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
      const cue = card.cueNeedsReview ? '' : card.aiExample || card.example || card.scaffoldStarter;
      if (options.mode === 'cue') { add(base + '/cue', cue, extra); return; }
      add(base + '/target', card.target, extra);
      if (card.factVerified === true && card.factLocked !== false) {
        (Array.isArray(card.essentialFacts) ? card.essentialFacts : []).forEach((fact, i) => add(base + '/fact/' + token(fact?.id || i), typeof fact === 'string' ? fact : fact?.text, extra));
        if (!card.cueNeedsReview) add(base + '/mapping', card.mapping, extra);
      }
      if (card.cueNeedsReview) return;
      add(base + '/cue', cue, extra);
      add(base + '/prompt', card.studentPrompt, extra);
      add(base + '/reasoning-prompt', card.reasoningPrompt, extra);
      (Array.isArray(card.scaffoldSteps) ? card.scaffoldSteps : []).forEach((step, i) => add(base + '/support/' + i, step, extra));
      (Array.isArray(card.coachPrompts) ? card.coachPrompts : []).forEach((prompt, i) => add(base + '/coach/' + i, prompt, extra));
      if (!card.visualNeedsReview && card.visualReview?.status === 'approved') add(base + '/visual-description', card.visualAlt, extra);
    });
  });
  register('applied-challenge', (resource, add) => {
    const normalize = modules().AppliedChallenge?._testing?.normalizeAppliedChallengeData;
    const data = typeof normalize === 'function' ? normalize(resource.data) : resource.data || {}, brief = data.brief || {}, supports = data.supports || {};
    add('title', data.title || resource.title); add('directions', data.instructions);
    ['context','role','audience','drivingQuestion','seedDirection','deliverable','evidenceBoundary'].forEach(field => add('brief/' + field, brief[field]));
    ['criteria','constraints','openQuestions','stakeholders'].forEach(field => (Array.isArray(brief[field]) ? brief[field] : []).forEach((value, i) => add('brief/' + field + '/' + i, value)));
    if (brief.factVerified === true && brief.factLocked !== false) (Array.isArray(brief.lockedLessonFacts) ? brief.lockedLessonFacts : []).forEach((fact, i) => add('brief/fact/' + token(fact?.id || i), typeof fact === 'string' ? fact : fact?.text));
    add('support/frame', supports.frameStarter);
    ['frameChoices','coachPrompts'].forEach(field => (Array.isArray(supports[field]) ? supports[field] : []).forEach((value, i) => add('support/' + field + '/' + i, value)));
    ['context','move','whyItHelps'].forEach(field => add('support/example/' + field, supports.parallelExample?.[field]));
    const api = modules().AppliedChallenge?._testing;
    const visible = api?.appliedChallengeVisiblePhases ? api.appliedChallengeVisiblePhases(data.scope).map(phase => phase.id) : phases;
    visible.forEach(phaseId => {
      const prompt = supports.phasePrompts && Object.prototype.hasOwnProperty.call(supports.phasePrompts, phaseId) ? supports.phasePrompts[phaseId] : undefined;
      add('phase/' + phaseId + '/prompt', prompt, { phaseId });
    });
  });

  // This is an egress contract, not a second audio store. Only current,
  // semantically identified reference clips can leave the teacher project.
  const deliveryLimits = Object.freeze({ local: 12 * 1024 * 1024, 'student-pack': 384 * 1024, live: 384 * 1024, qr: 128 * 1024, submission: 0 });
  function portableAudio(resource, channel = 'student-pack', maxBytes) {
    const channelLimit = (typeof channel === 'string' && Object.prototype.hasOwnProperty.call(deliveryLimits, channel)) ? deliveryLimits[channel] : 0;
    const limit = Math.min(channelLimit, Number.isFinite(maxBytes) ? Math.max(0, maxBytes) : Infinity);
    const store = modules().KaraokeAudioStore;
    if (!limit || !store?.validateAudioPayload || !resource || typeof resource !== 'object' || !adapters.has(resource.type)) return null;
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
      const key = store.portableKeyForIdentity(identity);
      if (typeof key !== 'string' || !key || isBlockedKey(key)) continue;
      bytes += audio.bytes.length;
      entries[key] = { identity, audio: audio.clean, mime: audio.mime, source: entry.source, synthesisProfile: profile, createdAt: text(entry.createdAt).slice(0, 80) };
    }
    return Object.keys(entries).length ? { format: 'per-entry', version: 4, entries, legacy: {} } : null;
  }

  function sharingReview(resource, channel = 'qr') {
    const issues = [];
    if (resource?.type === 'memory-aid') {
      const normalize = modules().MemoryAid?._testing?.normalizeMemoryAidCards;
      const cards = normalize ? normalize(resource.data?.cards, resource.data?.authorshipMode) : (Array.isArray(resource.data?.cards) ? resource.data.cards : []);
      cards.forEach(card => {
        if (!card || typeof card !== 'object') return;
        if (!card.essentialFacts?.length || !card.factVerified || card.factLocked === false) issues.push({ code: 'facts', target: 'facts', cardId: card.id, label: card.target });
        if (card.visualImage && (!text(card.visualAlt) || card.visualReview?.status !== 'approved')) issues.push({ code: !text(card.visualAlt) ? 'description' : 'visual_review', target: 'visual', cardId: card.id, label: card.target });
      });
    } else if (resource?.type === 'applied-challenge') {
      const brief = resource.data?.brief || {};
      if (!brief.lockedLessonFacts?.length || !brief.factVerified || brief.factLocked === false) issues.push({ code: 'facts', target: 'facts' });
    }
    const entries = Object.values(resource?.karaokeAudio?.entries || {}).slice(0, 320);
    const current = enumerate(resource);
    const store = modules().KaraokeAudioStore;
    const expectedAdapterId = 'alloflow.' + resource?.type + '.read-aloud';
    const stale = current.filter(segment => {
      const matching = entries.filter(entry => entry?.identity?.segmentId === segment.segmentId && entry.identity.scopeId === segment.scopeId);
      return matching.length && !matching.some(entry => {
        if (entry.quarantine) return false;
        const identity = store?.normalizeIdentity ? store.normalizeIdentity(entry.identity) : entry.identity;
        if (!identity || (identity.adapterId && identity.adapterId !== expectedAdapterId)) return false;
        if (identity.spokenText !== segment.text || identity.spokenFingerprint !== fingerprint(segment.text)) return false;
        const profile = store?.normalizeSynthesisProfile ? store.normalizeSynthesisProfile(entry.synthesisProfile) : entry.synthesisProfile;
        if (profile?.language && profile.language !== segment.language) return false;
        return Boolean(store?.validateAudioPayload(entry.audio, entry.mime)?.ok);
      });
    });
    if (stale.length) issues.push({ code: 'stale', target: 'audio', count: stale.length, cardId: stale[0].cardId });
    const available = Object.keys(portableAudio(resource, 'local')?.entries || {}).length;
    const included = Object.keys(portableAudio(resource, channel)?.entries || {}).length;
    if (available > included) issues.push({ code: 'omitted', target: 'audio', count: available - included });
    return { issues, included, available };
  }
  function SharingCheck(props) {
    const React = window.React, e = React.createElement, ref = React.useRef(null), timerRef = React.useRef(null);
    const [channel, setChannel] = React.useState('qr');
    const [, refresh] = React.useState(0);
    React.useEffect(() => {
      const listener = () => refresh(value => value + 1);
      window.addEventListener('alloflow:karaoke-audio-updated', listener);
      return () => {
        window.removeEventListener('alloflow:karaoke-audio-updated', listener);
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      };
    }, []);
    const tr = (key, fallback) => { const value = props.t?.('studio_sharing.' + key); return value && value !== 'studio_sharing.' + key ? value : fallback; };
    const report = sharingReview(props.resource, channel);
    const descriptions = { facts: tr('facts', 'Check and verify lesson facts'), description: tr('description', 'Add a visual description'), visual_review: tr('visual_review', 'Review the visual before sharing'), stale: tr('stale', 'Update stale or damaged audio'), omitted: tr('omitted', 'Audio clips exceed this sharing limit') };
    const review = issue => {
      props.onReview?.(issue);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!ref.current || ref.current.isConnected === false) return;
        const main = ref.current.closest('main'); if (!main) return;
        const card = issue.cardId ? [...main.querySelectorAll('[data-studio-card-id]')].find(node => node.dataset.studioCardId === issue.cardId) : main;
        const target = card ? [...card.querySelectorAll('[data-studio-review]')].find(node => node.dataset.studioReview === issue.target) : null;
        if (target && target.isConnected !== false) { try { target.focus(); } catch (_) {} try { target.scrollIntoView?.({ block: 'center' }); } catch (_) {} }
      }, 0);
    };
    return e('details', { ref, className: 'studio-sharing mb-4 rounded-2xl border border-amber-300 bg-amber-50 text-slate-900 p-3' },
      e('summary', { className: 'min-h-11 cursor-pointer font-bold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-1' }, tr('heading', 'Ready to share') + ' · ' + report.issues.length + ' ' + tr('items', 'items to review')),
      e('label', { className: 'mt-2 flex flex-wrap items-center gap-2 text-sm' }, tr('channel', 'Sharing method'), e('select', { value: channel, onChange: event => setChannel(event.target.value), className: 'min-h-11 rounded-lg border bg-white text-slate-900 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-1' }, e('option', { value: 'qr' }, tr('qr', 'Homework / QR')), e('option', { value: 'live' }, tr('live', 'Live / student pack')))),
      e('p', { role: 'status', className: 'my-2 text-sm' }, report.issues.length ? tr('review_note', 'Review these items before sharing. You decide when the resource is ready.') : tr('clear', 'No issues found by these checks. Review the content as a teacher before sharing.')),
      report.issues.length > 0 && e('ul', { className: 'space-y-2' }, report.issues.map((issue, index) => e('li', { key: index }, e('button', { type: 'button', className: 'min-h-11 rounded-lg border border-amber-400 bg-white text-slate-900 px-3 py-2 text-start text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-1', onClick: () => review(issue) }, (Object.prototype.hasOwnProperty.call(descriptions, issue.code) ? descriptions[issue.code] : '') + (issue.count ? ' (' + issue.count + ')' : '') + (issue.label ? ': ' + issue.label : ''))))),
      e('p', { className: 'mt-2 text-xs' }, report.included + ' ' + tr('clips', 'current reference clips included. Missing clips can use a device voice.')));
  }

  const CLIP_EXT_BY_MIME = Object.assign(Object.create(null), {
    'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/ogg': '.ogg', 'audio/webm': '.webm', 'audio/mp4': '.m4a'
  });
  function isSafeAudioUrl(raw) {
    return typeof raw === 'string' && !/[\u0000-\u001f\u007f]/.test(raw) && /^(?:blob:|data:audio\/)/i.test(raw.trim());
  }
  function clipExtension(resource, segment) {
    const fp = fingerprint(segment.text);
    const entry = Object.values(resource?.karaokeAudio?.entries || {}).find(entry => entry && !entry.quarantine && entry?.identity?.segmentId === segment.segmentId && entry.identity.scopeId === segment.scopeId && entry.identity.spokenText === segment.text && (!entry.identity.spokenFingerprint || entry.identity.spokenFingerprint === fp));
    const mime = typeof entry?.mime === 'string' ? entry.mime.toLowerCase() : '';
    return Object.prototype.hasOwnProperty.call(CLIP_EXT_BY_MIME, mime) ? CLIP_EXT_BY_MIME[mime] : '';
  }
  function LocalText(props) {
    const React = window.React, e = React.createElement;
    const [playing, setPlaying] = React.useState(false), [paused, setPaused] = React.useState(false);
    const current = React.useRef(null), id = React.useRef('local-' + Math.random().toString(36).slice(2));
    const tr = (key, fallback) => { const value = props.t?.('resource_read_aloud.' + key); return value && value !== 'resource_read_aloud.' + key ? value : fallback; };
    const stop = () => { if (current.current) { current.current.onend = current.current.onerror = null; try { window.speechSynthesis?.cancel(); } catch (_) {} current.current = null; } };
    React.useEffect(() => {
      const other = event => { if (event.detail !== id.current) { stop(); setPlaying(false); setPaused(false); } };
      const onMute = () => { if (window.__alloMuted) { stop(); setPlaying(false); setPaused(false); } };
      const onVis = () => { if (typeof document !== 'undefined' && document.hidden) { stop(); setPlaying(false); setPaused(false); } };
      window.addEventListener('alloflow:resource-read-aloud-start', other);
      window.addEventListener('alloflow:playback-stopped', other);
      window.addEventListener('alloflow-mute-changed', onMute);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
      return () => {
        stop();
        window.removeEventListener('alloflow:resource-read-aloud-start', other);
        window.removeEventListener('alloflow:playback-stopped', other);
        window.removeEventListener('alloflow-mute-changed', onMute);
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
      };
    }, []);
    React.useEffect(() => { stop(); setPlaying(false); setPaused(false); }, [props.text]);
    return e(window.React.Fragment, null, e('button', { type: 'button', className: 'min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1', disabled: !spoken(props.text) || !window.speechSynthesis || typeof SpeechSynthesisUtterance !== 'function', onClick: () => {
      if (playing) { stop(); setPlaying(false); setPaused(false); return; }
      if (window.__alloMuted) return;
      props.stopPlayback?.();
      window.dispatchEvent(new CustomEvent('alloflow:resource-read-aloud-start', { detail: id.current }));
      const utterance = new SpeechSynthesisUtterance(spoken(props.text).slice(0, 12000)); current.current = utterance;
      utterance.onend = utterance.onerror = () => { current.current = null; setPlaying(false); setPaused(false); };
      configureDeviceSpeech(utterance, props.language || props.resource?.language || props.resource?.data?.language || props.resource?.data?.lessonRef?.language || 'English', props.voiceSpeed, props.voiceVolume);
      setPlaying(true); setPaused(false);
      try { window.speechSynthesis.speak(utterance); } catch (_) { current.current = null; setPlaying(false); setPaused(false); }
    } }, playing ? tr('stop', 'Stop reading') : props.cue ? tr('read_cue', 'Read cue aloud') : tr('read_work', 'Read my writing')), playing && e('button', { type: 'button', className: 'ms-2 min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1', onClick: () => { if (!current.current) return; try { if (paused) window.speechSynthesis.resume(); else window.speechSynthesis.pause(); setPaused(!paused); } catch (_) {} } }, paused ? tr('resume', 'Resume reading') : tr('pause', 'Pause reading')));
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
    const [, setTick] = React.useState(0), [active, setActive] = React.useState(-1), [busy, setBusy] = React.useState(false), [progress, setProgress] = React.useState(''), [expanded, setExpanded] = React.useState(false), [message, setMessage] = React.useState('');
    const [paused, setPaused] = React.useState(false), [pauseBetween, setPauseBetween] = React.useState(false), [followFocus, setFollowFocus] = React.useState(true);
    const runtime = React.useRef({ token: 0, audio: null, utterance: null, finish: null, prepare: null, paused: false, resume: null });
    const mounted = React.useRef(true);
    const instance = React.useRef('read-' + Math.random().toString(36).slice(2));
    const segments = enumerate(resource, { cardId, mode });
    const signature = JSON.stringify([resource?.id == null ? '' : String(resource.id), segments]);
    const aiUsableOk = (() => {
      try {
        const sp = window.AlloModules && window.AlloModules.StudentPolicy;
        if (sp && (sp.aiDisabled === true || sp.aiEnabled === false || (typeof sp.isStudentAiDisabled === 'function' && sp.isStudentAiDisabled()) || (typeof sp.hideStudentAiFeatures === 'function' && sp.hideStudentAiFeatures()))) return false;
      } catch (_) { return false; }
      if (typeof window.__alloAiUsable !== 'function') return true;
      try { return Boolean(window.__alloAiUsable('tts')); } catch (_) { return false; }
    })();
    const effectiveRuntimeAi = Boolean(allowRuntimeAi)
      && !window._alloQrBlocked
      && !window.__alloQrStudentMode
      && !window.__alloStudentAiDisabled
      && !window.__alloAiSecretsLocked
      && !window.__alloOfflineOnly
      && !window.hideStudentAiFeatures
      && !(window.ALLOFLOW_MANAGED_AI_POLICY && window.ALLOFLOW_MANAGED_AI_POLICY.enabled === false)
      && aiUsableOk;
    const current = React.useRef(null);
    current.current = { signature, allowRuntimeAi: effectiveRuntimeAi, canPrepare, resourceId: resource?.id, pauseBetween, followFocus };
    const bridge = () => window.__alloGetReadAloudAudioBridge?.();
    const inspect = segment => bridge()?.inspect(segment, 'reference') || { status: 'missing' };
    const states = segments.map(inspect);
    const ready = states.filter(state => state.status === 'ready').length;
    const stale = states.filter(state => state.status === 'stale').length;
    const stop = () => {
      const state = runtime.current; state.token += 1; state.playController?.abort(); state.playController = null;
      if (state.audio) { try { state.audio.pause(); } catch (_) {} state.audio.onended = state.audio.onerror = null; state.audio = null; }
      if (state.utterance) { state.utterance.onend = state.utterance.onerror = null; try { window.speechSynthesis?.cancel(); } catch (_) {} state.utterance = null; }
      if (state.finish) { state.finish(); state.finish = null; }
      state.paused = false; state.resume?.(); state.resume = null;
      if (mounted.current) { setActive(-1); setPaused(false); }
    };
    React.useEffect(() => {
      mounted.current = true;
      const refresh = () => setTick(value => value + 1);
      const other = event => { if (event.detail !== instance.current) stop(); };
      const stopped = () => stop();
      const onMute = () => {
        const st = runtime.current;
        if (st.audio) { try { st.audio.muted = Boolean(window.__alloMuted); } catch (_) {} }
        if (window.__alloMuted && st.utterance) stop();
      };
      const onVis = () => {
        if (typeof document !== 'undefined' && document.hidden && (runtime.current.audio || runtime.current.utterance)) stop();
      };
      window.addEventListener('alloflow:karaoke-audio-updated', refresh);
      window.addEventListener('alloflow:ai-config-changed', refresh);
      window.addEventListener('alloflow:student-ai-config-changed', refresh);
      window.addEventListener('alloflow:ai-key-lock-changed', refresh);
      window.addEventListener('storage', refresh);
      window.addEventListener('alloflow:resource-read-aloud-start', other);
      window.addEventListener('alloflow:playback-stopped', stopped);
      window.addEventListener('alloflow-mute-changed', onMute);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
      return () => {
        mounted.current = false; stop(); runtime.current.prepare?.abort();
        window.removeEventListener('alloflow:karaoke-audio-updated', refresh);
        window.removeEventListener('alloflow:ai-config-changed', refresh);
        window.removeEventListener('alloflow:student-ai-config-changed', refresh);
        window.removeEventListener('alloflow:ai-key-lock-changed', refresh);
        window.removeEventListener('storage', refresh);
        window.removeEventListener('alloflow:resource-read-aloud-start', other);
        window.removeEventListener('alloflow:playback-stopped', stopped);
        window.removeEventListener('alloflow-mute-changed', onMute);
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
      };
    }, []);
    React.useEffect(() => {
      stop();
      if (runtime.current.prepare) {
        runtime.current.prepare.abort();
        runtime.current.prepare = null;
        if (mounted.current) { setBusy(false); setProgress(''); }
      }
    }, [signature, effectiveRuntimeAi, canPrepare]);
    const prepare = async segment => {
      if (!canPrepare || !effectiveRuntimeAi || busy) return;
      const api = bridge(); if (!api) { setMessage(tr('unavailable', 'Read-aloud audio is not available yet.')); return; }
      const controller = new AbortController(); runtime.current.prepare = controller;
      setBusy(true); setMessage('');
      try {
        const result = segment ? await api.regenerate(segment, { signal: controller.signal }) : await api.prepare(segments, (done, total) => { if (mounted.current && runtime.current.prepare === controller) setProgress(done + '/' + total); }, { signal: controller.signal });
        if (!controller.signal.aborted && mounted.current && runtime.current.prepare === controller) setMessage(result && !result.failed && !result.cancelled ? tr('saved', 'Audio saved with this resource.') : tr('save_failed', 'Some audio could not be saved. Try again.'));
      } catch (error) { if (error?.name !== 'AbortError' && mounted.current && runtime.current.prepare === controller) setMessage(tr('save_failed', 'Some audio could not be saved. Try again.')); }
      finally {
        if (runtime.current.prepare === controller) {
          runtime.current.prepare = null;
          if (mounted.current) { setBusy(false); setProgress(''); setTick(value => value + 1); }
        }
      }
    };
    const waitForResume = () => runtime.current.paused ? new Promise(resolve => { runtime.current.resume = resolve; }) : Promise.resolve();
    const togglePause = () => {
      const state = runtime.current;
      state.paused = !state.paused; setPaused(state.paused);
      if (state.paused) { state.audio?.pause(); if (state.utterance) { try { window.speechSynthesis?.pause(); } catch (_) {} } }
      else {
        if (state.audio) Promise.resolve(state.audio.play()).catch(() => { setMessage(tr('play_failed', 'This audio could not play. Save or regenerate the clip, or use a device voice.')); stop(); });
        if (state.utterance) { try { window.speechSynthesis?.resume(); } catch (_) {} }
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
          let rawUrl = saved?.status === 'ready' ? (saved.url || saved.storedUrl) : null;
          if (!rawUrl && current.current.allowRuntimeAi) rawUrl = await api?.resolve(segment, { reason: 'studio-reference-playback', signal: runtime.current.playController.signal });
          const url = isSafeAudioUrl(rawUrl) ? rawUrl : null;
          if (!valid()) break;
          await waitForResume(); if (!valid()) break;
          await new Promise((resolve, reject) => {
            runtime.current.finish = resolve;
            const finish = () => { runtime.current.finish = null; runtime.current.audio = null; runtime.current.utterance = null; resolve(); };
            if (url) {
              const audio = (typeof Audio === 'function' && Audio.prototype && typeof Audio.prototype.play === 'function')
        ? new Audio(url)
        : document.createElement('audio');
      if (typeof Audio !== 'function' || !(audio instanceof Audio)) {
        if (audio && audio.src !== url) audio.src = url;
      } runtime.current.audio = audio;
              audio.playbackRate = speechSetting(voiceSpeed, 0.5, 2); audio.volume = speechSetting(voiceVolume, 0, 1);
              if (window.__alloMuted) audio.muted = true;
              audio.onended = finish; audio.onerror = () => reject(new Error('Audio playback failed'));
              Promise.resolve(audio.play()).catch(reject);
            } else if (window.speechSynthesis && typeof SpeechSynthesisUtterance === 'function') {
              if (window.__alloMuted) { finish(); return; }
              const utterance = new SpeechSynthesisUtterance(segment.text); runtime.current.utterance = utterance;
              configureDeviceSpeech(utterance, segment.language, voiceSpeed, voiceVolume);
              utterance.onend = finish; utterance.onerror = reject;
              try { window.speechSynthesis.speak(utterance); } catch (err) { reject(err); }
            } else reject(new Error('No saved clip or device voice available'));
          });
          if (valid() && i + 1 < end && current.current.pauseBetween) { runtime.current.paused = true; setPaused(true); }
        } catch (_) { if (valid()) setMessage(tr('play_failed', 'This audio could not play. Save or regenerate the clip, or use a device voice.')); break; }
      }
      if (valid()) stop();
    };
    if (!segments.length) return null;
    const buttonClass = 'min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:opacity-50';
    return e('section', { tabIndex: -1, 'data-studio-review': 'audio', className: 'resource-read-aloud my-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 p-3', 'aria-label': tr('label', 'Saved read-aloud audio') },
      e('style', null, '@media print{.resource-read-aloud,.studio-sharing,.studio-recovery{display:none!important}}'),
      e('div', { className: 'flex flex-wrap items-center gap-2' },
        e('button', { type: 'button', className: buttonClass, onClick: () => active >= 0 ? stop() : play(0) }, active >= 0 ? tr('stop', 'Stop reading') : mode === 'cue' ? tr('read_cue', 'Read cue aloud') : tr('listen', 'Read reference aloud')),
        active >= 0 && e('button', { type: 'button', className: buttonClass, onClick: togglePause }, paused ? tr('resume', 'Resume reading') : tr('pause', 'Pause reading')),
        active >= 0 && e('button', { type: 'button', className: buttonClass, onClick: () => play(active, true) }, tr('repeat', 'Repeat this field')),
        canPrepare && e('button', { type: 'button', className: buttonClass, disabled: !effectiveRuntimeAi, 'aria-busy': busy, onClick: () => busy ? runtime.current.prepare?.abort() : prepare() }, busy ? tr('cancel', 'Cancel saving') + ' ' + progress : tr('save', 'Save TTS')),
        e('button', { type: 'button', className: buttonClass, 'aria-expanded': expanded, 'aria-controls': instance.current, onClick: () => setExpanded(value => !value) }, tr('segments', 'Read-along and clips')),
        e('span', { role: 'status', 'aria-live': 'polite', className: 'text-xs text-slate-700' }, ready + '/' + segments.length + ' ' + tr('ready', 'ready') + (stale ? '; ' + stale + ' ' + tr('stale', 'stale') : ''))),
      e('div', { hidden: !expanded, className: 'mt-3 flex flex-wrap gap-3 text-sm' },
        e('label', { className: 'inline-flex min-h-11 items-center gap-2' }, e('input', { type: 'checkbox', className: 'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-1', checked: pauseBetween, onChange: event => setPauseBetween(event.target.checked) }), tr('pause_between', 'Pause after each field')),
        typeof onActiveSegment === 'function' && e('label', { className: 'inline-flex min-h-11 items-center gap-2' }, e('input', { type: 'checkbox', className: 'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-1', checked: followFocus, onChange: event => setFollowFocus(event.target.checked) }), tr('follow_focus', 'Move focus with reading'))),
      e('p', { role: 'status', 'aria-live': 'polite', className: (paused || message) ? 'mt-2 text-sm text-slate-700' : 'sr-only' }, paused ? tr('paused', 'Reading paused. Resume when you are ready.') : (message || '')),
      e('ol', { id: instance.current, hidden: !expanded, className: 'mt-3 max-h-80 space-y-2 overflow-auto' }, segments.map((segment, index) => {
        const downloadHref = states[index].status === 'ready' && isSafeAudioUrl(states[index].url || states[index].storedUrl) ? (states[index].url || states[index].storedUrl) : null;
        return e('li', { key: segment.segmentId, className: 'rounded-xl border p-2 ' + (active === index ? 'border-teal-600 bg-teal-100 text-slate-950' : 'border-slate-200 bg-white text-slate-900'), 'aria-current': active === index ? 'step' : undefined },
          e('button', { type: 'button', className: 'min-h-11 w-full rounded-lg p-2 text-start text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1', onClick: () => play(index) }, segment.text),
          canPrepare && e('button', { type: 'button', className: buttonClass, disabled: busy || !effectiveRuntimeAi, onClick: () => prepare(segment), 'aria-label': tr('regenerate', 'Regenerate clip') + ': ' + segment.text }, tr('regenerate', 'Regenerate clip') + ' · ' + tr(states[index].status, states[index].status)),
          downloadHref && e('a', { className: 'inline-flex min-h-11 items-center rounded-lg px-3 text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1', href: downloadHref, download: 'read-aloud-' + (index + 1) + clipExtension(resource, segment) }, tr('download', 'Download clip')));
      })));
  }
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ResourceReadAloud = Object.freeze({ register, supports: type => adapters.has(type), enumerate, portableAudio, deliveryLimits, sharingReview, SharingCheck, Controls, CueControls, LocalText });
  window.AlloModules.ResourceReadAloudModule = true;
})();
