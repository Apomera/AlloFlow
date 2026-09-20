/** Teacher-only teaching script attached to an existing lesson plan. */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.LessonTeachingScriptView) return;
  var React = window.React;
  if (!React) throw new Error('[LessonTeachingScriptView] React is required');
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function LessonSpokenDirections({
  planId,
  version,
  draft,
  onBack,
  createAudio,
  t,
  audioVoice,
  audioSpeed,
  audioLanguage,
  onOpenVoiceSettings,
  initialStepIndex = 0,
  onStepChange
}) {
  const tr = (key, fallback) => {
    const value = t?.('lesson_script.' + key);
    return value && value !== 'lesson_script.' + key ? value : fallback;
  };
  const runtime = window.AlloModules?.LessonTeachingScript;
  const segments = runtime?.spokenSegments?.(version) || [];
  const [stepIndex, setStepIndex] = React.useState(() => Math.max(0, Math.min(version.steps.length - 1, Number.isInteger(initialStepIndex) ? initialStepIndex : 0))),
    [large, setLarge] = React.useState(false);
  const [exportScope, setExportScope] = React.useState('all');
  const exportSegments = segments.filter(segment => exportScope === 'all' || segment.stepIndex === stepIndex);
  const downloads = React.useRef(new Map());
  const playbackRevision = React.useRef(0);
  const [status, setStatus] = React.useState(''),
    [working, setWorking] = React.useState(''),
    [active, setActive] = React.useState('');
  const [summary, setSummary] = React.useState(null),
    [progress, setProgress] = React.useState(null);
  const audioController = React.useRef(null),
    request = React.useRef(null),
    player = React.useRef(null),
    surface = React.useRef(null),
    back = React.useRef(null);
  const alive = React.useRef(true);
  const ownsFullscreen = React.useRef(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const stop = () => {
    playbackRevision.current += 1;
    request.current?.abort();
    request.current = null;
    if (player.current) {
      player.current.onended = null;
      player.current.onerror = null;
      player.current.pause();
      player.current = null;
    }
    if (alive.current) {
      setWorking('');
      setActive('');
    }
  };
  const controller = () => {
    if (draft) throw new Error(tr('audio_save_edits', 'Save script edits before preparing audio.'));
    if (!audioController.current) {
      if (typeof createAudio !== 'function') throw new Error(tr('audio_loading', 'Audio tools are still loading. Try again.'));
      audioController.current = createAudio(planId, version.id);
    }
    return audioController.current;
  };
  const refresh = () => {
    try {
      setSummary(controller().summary());
    } catch (_) {}
  };
  React.useEffect(() => {
    alive.current = true;
    if (typeof surface.current?.showModal === 'function') surface.current.showModal();else surface.current?.setAttribute('open', '');
    back.current?.focus();
    refresh();
    const changed = () => {
      setFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) ownsFullscreen.current = false;
    };
    document.addEventListener('fullscreenchange', changed);
    return () => {
      alive.current = false;
      downloads.current.forEach((timer, url) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      });
      downloads.current.clear();
      document.removeEventListener('fullscreenchange', changed);
      if (ownsFullscreen.current && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      stop();
      audioController.current?.dispose?.();
      audioController.current = null;
    };
  }, []);
  const play = async segment => {
    stop();
    const pending = new AbortController();
    request.current = pending;
    setWorking('play');
    setActive(segment.id);
    setStatus(tr('audio_preparing', 'Preparing audio…'));
    try {
      const url = await controller().resolve(segment.id, {
        signal: pending.signal
      });
      if (!alive.current || request.current !== pending) return;
      const audio = new Audio(url);
      player.current = audio;
      audio.onended = () => {
        if (request.current === pending) {
          stop();
          setStatus(tr('audio_paused', 'Paused for student participation. Choose the next spoken block when ready.'));
        }
      };
      audio.onerror = async () => {
        if (request.current === pending) {
          stop();
          const revision = playbackRevision.current;
          try {
            await controller().quarantine(segment.id, {
              reason: 'The saved spoken clip could not be decoded or loaded.'
            });
          } catch (_) {}
          if (alive.current && playbackRevision.current === revision) {
            refresh();
            setStatus(tr('audio_play_failed', 'Audio could not play. Use Save TTS to rebuild missing audio, then try again.'));
          }
        }
      };
      await audio.play();
      if (!alive.current || request.current !== pending) {
        audio.pause();
        return;
      }
      setStatus(tr('audio_playing', 'Playing the highlighted spoken block.'));
    } catch (error) {
      if (alive.current && request.current === pending) {
        stop();
        setStatus(_ltsText(error?.message || error) || tr('audio_failed', 'Audio could not be prepared. Try again.'));
      }
    }
  };
  const saveAudio = async () => {
    stop();
    const pending = new AbortController();
    request.current = pending;
    setWorking('save');
    setProgress(null);
    setStatus(tr('audio_saving', 'Saving spoken audio…'));
    try {
      const result = await controller().prepareAll({
        signal: pending.signal,
        onProgress: value => {
          if (alive.current && request.current === pending) setProgress(value);
        }
      });
      if (!alive.current || request.current !== pending) return;
      setStatus(result.failed ? tr('audio_partial', 'Some audio could not be saved. Save TTS again to retry missing clips.') : tr('audio_saved', 'Spoken audio is saved with this lesson plan.'));
    } catch (error) {
      if (alive.current && request.current === pending) setStatus(_ltsText(error?.message || error) || tr('audio_failed', 'Audio could not be prepared. Try again.'));
    } finally {
      if (alive.current && request.current === pending) {
        request.current = null;
        setWorking('');
        refresh();
      }
    }
  };
  const exportSpeech = async kind => {
    if (!exportSegments.length) return;
    const draftLabel = tr('draft_export_label', 'UNSAVED DRAFT — not validated');
    const draftHint = tr('draft_export_hint', 'This text includes unfinished edits. It does not update the saved script.');
    const content = (draft ? [draftLabel, draftHint, ''] : []).concat(exportSegments.map(segment => segment.spokenText)).join('\n\n');
    try {
      if (kind === 'copy') {
        if (typeof navigator.clipboard?.writeText !== 'function') throw new Error(tr('copy_unavailable', 'Copy is unavailable here. Download the text instead.'));
        await navigator.clipboard.writeText(content);
        if (alive.current) setStatus(tr('spoken_copied', 'Spoken directions copied.'));
        return;
      }
      if (kind === 'download') {
        const url = URL.createObjectURL(new Blob([content], {
          type: 'text/plain;charset=utf-8'
        }));
        const timer = setTimeout(() => {
          URL.revokeObjectURL(url);
          downloads.current.delete(url);
        }, 1000);
        downloads.current.set(url, timer);
        const link = document.createElement('a');
        const title = _ltsText(version.title).replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 100).trim() || 'teaching-script';
        link.href = url;
        link.download = title + '-spoken' + (exportScope === 'step' ? '-step-' + (stepIndex + 1) : '') + (draft ? '-draft' : '') + '.txt';
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
        setStatus(tr('downloaded', 'Script text downloaded.'));
        return;
      }
      const popup = window.open('', '_blank', 'width=800,height=700');
      if (!popup) throw new Error(tr('print_blocked', 'Allow the print window, then try again.'));
      const escape = value => String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char]);
      popup.opener = null;
      const sections = version.steps.map((step, index) => {
        const spoken = exportSegments.filter(segment => segment.stepIndex === index);
        return spoken.length ? '<section><h2 dir="auto">' + escape(index + 1 + '. ' + step.title) + '</h2>' + spoken.map(segment => '<p dir="auto">' + escape(segment.spokenText) + '</p>').join('') + '</section>' : '';
      }).join('');
      popup.document.write('<!doctype html><html lang="' + escape(document.documentElement.lang || 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escape(version.title) + '</title><style>*{box-sizing:border-box}body{font:18px/1.6 system-ui;color:#111;background:#fff;margin:0;padding:24px}main{max-width:48rem;margin:auto}p{white-space:pre-wrap;overflow-wrap:anywhere}section{break-inside:avoid}h1,h2{overflow-wrap:anywhere}h1{font-size:24px}h2{font-size:20px}@page{margin:18mm}@media print{body{padding:0}main{max-width:none}}</style></head><body><main><h1 dir="auto">' + escape(version.title) + '</h1>' + (draft ? '<p><strong>' + escape(draftLabel) + '</strong><br>' + escape(draftHint) + '</p>' : '') + sections + '</main></body></html>');
      popup.document.close();
      popup.focus();
      popup.print();
      if (alive.current) setStatus(tr('print_opened', 'The script print view is open.'));
    } catch (error) {
      if (alive.current) setStatus(_ltsText(error?.message || error) || tr('export_failed', 'The script could not be exported. Please try again.'));
    }
  };
  const button = 'min-h-11 rounded-lg border border-indigo-600 bg-white px-3 py-2 text-sm font-bold text-indigo-900 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50';
  const step = version.steps[stepIndex];
  const move = next => {
    if (!Number.isInteger(next) || next < 0 || next >= version.steps.length) return;
    stop();
    setStatus('');
    setStepIndex(next);
    onStepChange?.(next);
    refresh();
  };
  return /*#__PURE__*/React.createElement("dialog", {
    ref: surface,
    "data-spoken-directions": true,
    "aria-modal": "true",
    onCancel: event => {
      event.preventDefault();
      onBack();
    },
    style: {
      position: 'fixed',
      inset: 0,
      margin: 0,
      width: '100vw',
      maxWidth: 'none',
      height: '100dvh',
      maxHeight: 'none',
      overflowY: 'auto'
    },
    className: "min-w-0 space-y-4 border-0 bg-white p-4 text-slate-900 sm:p-6",
    "aria-label": tr('spoken_view', 'Spoken directions')
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    ref: back,
    type: "button",
    className: button,
    onClick: onBack
  }, tr('full_script', 'Full script')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    "aria-pressed": large,
    onClick: () => setLarge(value => !value)
  }, tr('larger_text', 'Larger text')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    "aria-pressed": fullscreen,
    onClick: async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          if (!alive.current) {
            await document.exitFullscreen();
            return;
          }
          ownsFullscreen.current = true;
        } else throw new Error(tr('fullscreen_unavailable', 'Full screen is unavailable in this browser.'));
      } catch (error) {
        if (alive.current) setStatus(error.message);
      }
    }
  }, fullscreen ? tr('exit_fullscreen', 'Exit full screen') : tr('fullscreen', 'Full screen'))), /*#__PURE__*/React.createElement("h3", {
    className: "break-words text-xl font-black"
  }, version.title), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('spoken_hint', 'Only wording addressed to students is shown. Playback stops after each spoken block. Review older scripts for delivery notes before playing.')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 text-sm text-slate-700"
  }, /*#__PURE__*/React.createElement("span", null, tr('voice_summary', 'Voice:'), " ", audioVoice || tr('voice_default', 'App default'), " · ", tr('language', 'Script language:'), " ", audioLanguage || 'English', " · ", audioSpeed || 1, "×"), typeof onOpenVoiceSettings === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    onClick: () => {
      stop();
      onBack();
      onOpenVoiceSettings();
    }
  }, tr('voice_settings', 'Voice settings'))), /*#__PURE__*/React.createElement("details", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("summary", {
    className: button + ' cursor-pointer'
  }, tr('spoken_export_menu', 'Export directions')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-end gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "min-w-0 text-sm font-bold"
  }, tr('spoken_export_scope', 'Directions to export'), /*#__PURE__*/React.createElement("select", {
    "aria-label": tr('spoken_export_scope', 'Directions to export'),
    className: "mt-1 block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600",
    value: exportScope,
    onChange: event => setExportScope(event.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, tr('spoken_export_all', 'All steps')), /*#__PURE__*/React.createElement("option", {
    value: "step"
  }, tr('spoken_export_step', 'Current step')))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    disabled: !exportSegments.length,
    onClick: () => exportSpeech('copy')
  }, tr('copy_spoken', 'Copy spoken directions')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    disabled: !exportSegments.length,
    onClick: () => exportSpeech('download')
  }, tr('download_spoken', 'Download spoken directions')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    disabled: !exportSegments.length,
    onClick: () => exportSpeech('print')
  }, tr('print_spoken', 'Print spoken directions')))), draft && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "rounded-lg bg-amber-50 p-3 text-amber-950"
  }, tr('audio_save_edits', 'Save script edits before preparing audio.')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    disabled: !!draft || !!working || !segments.length,
    onClick: saveAudio
  }, tr('save_tts', 'Save TTS')), working && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    onClick: () => {
      stop();
      refresh();
      setStatus(tr('audio_stopped', 'Stopped. Saved clips are kept; Save TTS resumes missing clips.'));
    }
  }, tr('stop_audio', 'Stop audio')), summary && /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, summary.ready, "/", summary.total, " ", tr('audio_clips_saved', 'spoken clips saved')), working === 'save' && progress && /*#__PURE__*/React.createElement("span", {
    role: "status"
  }, progress.completed, "/", progress.total)), /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-sm text-indigo-950"
  }, status), /*#__PURE__*/React.createElement("nav", {
    className: "flex flex-wrap items-center justify-between gap-2",
    "aria-label": tr('spoken_steps', 'Spoken step navigation')
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    disabled: stepIndex === 0,
    onClick: () => move(stepIndex - 1)
  }, tr('previous_step', 'Previous step')), /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, stepIndex + 1, " / ", version.steps.length), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    disabled: stepIndex >= version.steps.length - 1,
    onClick: () => move(stepIndex + 1)
  }, tr('next_step', 'Next step'))), /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold"
  }, tr('jump_step', 'Go to step'), /*#__PURE__*/React.createElement("select", {
    "aria-label": tr('jump_step', 'Go to step'),
    className: "mt-1 block min-h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-400 bg-white p-2 text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600",
    value: stepIndex,
    onChange: event => move(Number(event.target.value))
  }, version.steps.map((item, index) => /*#__PURE__*/React.createElement("option", {
    key: item.id || index,
    value: index
  }, index + 1, ". ", item.title)))), /*#__PURE__*/React.createElement("h4", {
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "break-words text-lg font-bold"
  }, stepIndex + 1, ". ", step?.title), !segments.some(segment => segment.stepIndex === stepIndex) && /*#__PURE__*/React.createElement("p", {
    className: "rounded-lg bg-slate-100 p-3 text-slate-700"
  }, tr('spoken_step_empty', 'This step has no spoken directions. Choose another step or edit the full script.')), segments.filter(segment => segment.stepIndex === stepIndex).map(segment => /*#__PURE__*/React.createElement("div", {
    key: segment.id,
    "data-spoken-block": segment.field,
    className: 'space-y-3 rounded-xl border-2 p-4 ' + (active === segment.id ? 'border-indigo-700 bg-indigo-100' : 'border-indigo-300 bg-indigo-50')
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "❝ "), segment.field === 'checkQuestion' ? tr('ask_aloud', 'Ask aloud') : tr('say_aloud', 'Say aloud')), /*#__PURE__*/React.createElement("p", {
    dir: "auto",
    className: 'whitespace-pre-wrap break-words leading-relaxed ' + (large ? 'text-2xl' : 'text-xl')
  }, segment.spokenText), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: button,
    disabled: !!draft || working === 'save',
    onClick: () => play(segment),
    "aria-label": tr('play_block', 'Play spoken block') + ': ' + (segment.field === 'checkQuestion' ? tr('ask_aloud', 'Ask aloud') : tr('say_aloud', 'Say aloud'))
  }, tr('play_block', 'Play spoken block')))));
}

// Teacher-only, lesson-aware teaching script attached to a saved lesson plan. Generation and persistence belong to the host.
const _LTS_GRADES = ['Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade', 'College', 'Graduate Level'];
const _LTS_SUBJECTS = [['mathematics', 'Mathematics'], ['reading', 'Reading and literacy'], ['writing', 'Writing'], ['science', 'Science'], ['social-studies', 'Social studies and history'], ['world-languages', 'World languages'], ['arts', 'Arts and music'], ['health-pe', 'Health and physical education'], ['technology', 'Technology and computer science'], ['other', 'Other or interdisciplinary']];
const _LTS_SCOPES = {
  segment: {
    minSteps: 3,
    maxSteps: 8,
    minMinutes: 5,
    maxMinutes: 60,
    maxStepMinutes: 30
  },
  lesson: {
    minSteps: 4,
    maxSteps: 24,
    minMinutes: 15,
    maxMinutes: 240,
    maxStepMinutes: 60
  }
};
const _LTS_PHASES = {
  hook: 'Hook',
  directInstruction: 'Direct instruction',
  guidedPractice: 'Guided practice',
  independentPractice: 'Independent practice',
  closure: 'Closure'
};
function _ltsText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') return _ltsText(value.en || value.text || value.title);
  return '';
}
function _ltsSafeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch (_) {
    return '';
  }
}
function _ltsGradeLabel(value) {
  // Pilot versions stored a bare number; show it in the app's grade vocabulary.
  const n = typeof value === 'number' ? value : /^\d{1,2}$/.test(String(value || '').trim()) ? Number(value) : NaN;
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n + ({
    1: 'st',
    2: 'nd',
    3: 'rd'
  }[n % 10] && !(n >= 11 && n <= 13) ? {
    1: 'st',
    2: 'nd',
    3: 'rd'
  }[n % 10] : 'th') + ' Grade';
  return _ltsText(value);
}
function _ltsRules(version) {
  if (!version) return _LTS_SCOPES.segment;
  if (version.schemaVersion === 1) return {
    minSteps: 3,
    maxSteps: 6,
    maxStepMinutes: 20
  };
  return _LTS_SCOPES[version.scope === 'lesson' ? 'lesson' : 'segment'];
}
// Recovery is limited to this tab, teacher/workspace scope, and saved plan.
const _LTS_SESSION_LIMIT = 800000;
const _LTS_TEXT_FIELDS = ['teacherSays', 'studentDoes', 'checkQuestion', 'possibleResponse', 'ifStruggling', 'ifReady'];
const _ltsRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
const _ltsBoundedString = (value, limit) => typeof value === 'string' && value.length <= limit;
function _ltsSessionKey(scope, planId) {
  return _ltsBoundedString(scope, 2048) && scope.trim() && _ltsBoundedString(planId, 160) && planId ? 'alloflow:lesson-script-session:v1:' + encodeURIComponent(scope) + ':' + encodeURIComponent(planId) : '';
}
function _ltsSessionSettings(value) {
  return _ltsRecord(value) && [['goal', 1200], ['grade', 200], ['subject', 80], ['topic', 200], ['priorKnowledge', 2000], ['standard', 4000]].every(([key, limit]) => _ltsBoundedString(value[key], limit)) && ['segment', 'lesson'].includes(value.scope) && typeof value.researchEnabled === 'boolean' && (value.durationMinutes === '' || typeof value.durationMinutes === 'number' && Number.isFinite(value.durationMinutes) && Math.abs(value.durationMinutes) <= 1000000) && Array.isArray(value.materialIds) && value.materialIds.length <= 500 && value.materialIds.every(id => _ltsBoundedString(id, 160));
}
function _ltsSessionSteps(steps) {
  return Array.isArray(steps) && steps.length > 0 && steps.length <= 24 && steps.every(step => _ltsRecord(step) && _ltsBoundedString(step.id, 160) && _ltsBoundedString(step.title, 1000) && (step.phase == null || _ltsBoundedString(step.phase, 100)) && (step.minutes === '' || ['string', 'number'].includes(typeof step.minutes) && String(step.minutes).length <= 32 && Number.isFinite(Number(step.minutes))) && _LTS_TEXT_FIELDS.every(key => _ltsBoundedString(step[key], 20000)) && ['resourceIds', 'recommendationIds'].every(key => Array.isArray(step[key]) && step[key].length <= 500 && step[key].every(id => _ltsBoundedString(id, 160))));
}
const _ltsOptionalStrings = (value, keys, limit) => keys.every(key => value[key] == null || _ltsBoundedString(value[key], limit));
function _ltsSessionSource(source) {
  return _ltsRecord(source) && _ltsOptionalStrings(source, ['id', 'title', 'url', 'author', 'publishedAt', 'evidenceKind', 'scope', 'evidenceLevel', 'retrievedAt'], 4000) && (source.recommendations == null || Array.isArray(source.recommendations) && source.recommendations.length <= 100 && source.recommendations.every(item => _ltsRecord(item) && _ltsOptionalStrings(item, ['id', 'text', 'locator', 'evidenceLevel'], 20000)));
}
function _ltsSessionVersion(version) {
  const snapshot = version?.inputSnapshot,
    settings = snapshot?.settings;
  return _ltsRecord(version) && _ltsBoundedString(version.id, 160) && version.id && [1, 2].includes(version.schemaVersion) && _ltsBoundedString(version.title, 1000) && Number.isFinite(version.durationMinutes) && version.durationMinutes > 0 && version.durationMinutes <= 240 && _ltsOptionalStrings(version, ['createdAt', 'researchStatus'], 100) && (!version.scope || ['segment', 'lesson'].includes(version.scope)) && (version.sources == null || Array.isArray(version.sources) && version.sources.length <= 100 && version.sources.every(_ltsSessionSource)) && (version.warnings == null || Array.isArray(version.warnings) && version.warnings.length <= 100 && version.warnings.every(item => _ltsBoundedString(item, 20000))) && (snapshot == null || _ltsRecord(snapshot) && _ltsOptionalStrings(snapshot, ['planFingerprint'], 1000) && (settings == null || _ltsRecord(settings) && _ltsOptionalStrings(settings, ['subject'], 200) && (settings.grade == null || _ltsBoundedString(settings.grade, 200) || typeof settings.grade === 'number' && Number.isFinite(settings.grade)))) && _ltsSessionSteps(version.steps);
}
function _ltsSessionValue(value) {
  return _ltsRecord(value) && value.schemaVersion === 1 && _ltsBoundedString(value.scope, 2048) && _ltsBoundedString(value.planId, 160) && _ltsSessionSettings(value.settings) && _ltsRecord(value.defaults) && ['goal', 'grade', 'subject', 'topic', 'standard'].every(key => _ltsBoundedString(value.defaults[key], 4000)) && _ltsBoundedString(value.selectedId, 160) && (value.draft == null || _ltsRecord(value.draft) && _ltsSessionVersion(value.draft.version) && _ltsBoundedString(value.draft.baseline, _LTS_SESSION_LIMIT) && _ltsSessionSteps(JSON.parse(value.draft.baseline)) && _ltsSessionSteps(value.draft.steps));
}
function _ltsReadSession(key, scope, planId) {
  if (!key) return {
    value: null,
    status: 'unavailable'
  };
  let raw;
  try {
    raw = window.sessionStorage.getItem(key);
  } catch (_) {
    return {
      value: null,
      status: 'unavailable'
    };
  }
  if (!raw) return {
    value: null,
    status: ''
  };
  try {
    if (raw.length > _LTS_SESSION_LIMIT) throw new Error('Oversized recovery data');
    const value = JSON.parse(raw);
    if (!_ltsSessionValue(value) || value.scope !== scope || value.planId !== planId) throw new Error('Invalid recovery data');
    return {
      value,
      status: 'restored'
    };
  } catch (_) {
    return {
      value: null,
      status: 'invalid'
    };
  }
}
function _ltsWriteSession(key, value) {
  if (!key) return 'unavailable';
  try {
    if (!_ltsSessionValue(value)) return 'large';
    const raw = JSON.stringify(value);
    if (raw.length > _LTS_SESSION_LIMIT) return 'large';
    window.sessionStorage.setItem(key, raw);
    return '';
  } catch (_) {
    return 'unavailable';
  }
}
// A save may finish after navigation. Clear only the submitted recovery draft,
// never edits made by a newly mounted view while the request was pending.
function _ltsClearSubmittedDraft(key, scope, planId, submitted) {
  const stored = _ltsReadSession(key, scope, planId).value;
  if (!stored?.draft || JSON.stringify(stored.draft.steps) !== JSON.stringify(submitted.steps) || stored.draft.baseline !== submitted.baseline || stored.draft.version.id !== submitted.version.id) return '';
  return _ltsWriteSession(key, {
    ...stored,
    draft: null
  });
}
function LessonTeachingScriptView(props) {
  if (!props.isTeacherMode || props.isParentMode || props.isIndependentMode || !props.generatedContent?.id || props.generatedContent.type !== 'lesson-plan') return null;
  return /*#__PURE__*/React.createElement(LessonTeachingScriptPanel, _extends({
    key: JSON.stringify([props.draftScope || '', String(props.generatedContent.id)])
  }, props));
}
function LessonTeachingScriptPanel(props) {
  const {
    generatedContent: plan,
    history = [],
    capabilities = {},
    defaultSettings = {},
    scriptRun = {},
    onGenerateTeachingScript,
    onCancelTeachingScript,
    onUpdateTeachingScript,
    onOpenTeachingMaterial
  } = props;
  const tr = (key, fallback) => {
    const value = props.t?.('lesson_script.' + key);
    return value && value !== 'lesson_script.' + key ? value : fallback;
  };
  const id = React.useId();
  const planId = String(plan.id);
  const draftScope = typeof props.draftScope === 'string' ? props.draftScope : '';
  const recoveryKey = _ltsSessionKey(draftScope, planId);
  const [recovery] = React.useState(() => _ltsReadSession(recoveryKey, draftScope, planId));
  const restored = recovery.value;
  const [recoveryStatus, setRecoveryStatus] = React.useState(recovery.status);
  const [showRecoveryNotice, setShowRecoveryNotice] = React.useState(!!restored);
  const savedVersions = Array.isArray(plan.data?.teachingScripts) ? plan.data.teachingScripts : [];
  const versions = savedVersions.filter(version => version && version.id && Array.isArray(version.steps) && version.steps.length && version.steps.every(step => step && typeof step === 'object' && !Array.isArray(step)));
  const hasIncompleteVersions = versions.length !== savedVersions.length;
  const runtime = window.AlloModules?.LessonTeachingScript;
  const materials = (Array.isArray(history) ? history : []).filter(item => item && item.id != null && String(item.id) !== planId);
  const materialAvailable = material => materials.filter(item => String(item.id) === String(material.id)).length === 1 && (typeof runtime?.hasTeachingMaterialText !== 'function' || runtime.hasTeachingMaterialText(material));
  const gradeOptions = Array.isArray(defaultSettings.gradeOptions) && defaultSettings.gradeOptions.length ? defaultSettings.gradeOptions.map(_ltsText) : _LTS_GRADES;
  const subjectOptions = Array.isArray(defaultSettings.subjectOptions) && defaultSettings.subjectOptions.length ? defaultSettings.subjectOptions.map(item => [String(item.id), _ltsText(item.label)]) : _LTS_SUBJECTS;
  const scopes = defaultSettings.scopes && defaultSettings.scopes.segment && defaultSettings.scopes.lesson ? defaultSettings.scopes : _LTS_SCOPES;
  const initialGrade = _ltsText(defaultSettings.grade);
  const suggested = defaultSettings.suggestedDuration || {};
  const detectedDefaults = {
    goal: ((Array.isArray(plan.data?.objectives) ? plan.data.objectives.map(_ltsText).filter(Boolean).join('; ') : _ltsText(plan.data?.objectives)) || _ltsText(plan.data?.essentialQuestion)).slice(0, 1200),
    grade: initialGrade,
    subject: subjectOptions.some(([value]) => value === defaultSettings.subject) ? defaultSettings.subject : 'other',
    topic: _ltsText(defaultSettings.topic).slice(0, 200),
    standard: _ltsText(defaultSettings.standard)
  };
  const [spokenOnly, setSpokenOnly] = React.useState(false);
  const [spokenPosition, setSpokenPosition] = React.useState(null);
  const [deleteCandidate, setDeleteCandidate] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const discardToggle = React.useRef(null);
  const deleteToggle = React.useRef(null);
  const versionSelect = React.useRef(null);
  const restoreDeleteFocus = React.useRef(false);
  const deletingRequest = React.useRef(false);
  const editActions = React.useRef(null);
  const focusNewDraft = React.useRef(false);
  const spokenToggle = React.useRef(null);
  const [expanded, setExpanded] = React.useState(!!restored);
  const [settingsExpanded, setSettingsExpanded] = React.useState(() => restored ? !restored.draft : versions.length === 0);
  const settingsToggle = React.useRef(null);
  const panelToggle = React.useRef(null);
  const editToggle = React.useRef(null);
  const restoreEditFocus = React.useRef(false);
  const previousDefaults = React.useRef(restored?.defaults || detectedDefaults);
  const [defaultsChanged, setDefaultsChanged] = React.useState(false);
  const [, refreshDefaultsRecord] = React.useState(0);
  const [goal, setGoal] = React.useState(restored?.settings.goal ?? detectedDefaults.goal);
  const [grade, setGrade] = React.useState(restored?.settings.grade ?? initialGrade);
  const [subject, setSubject] = React.useState(() => restored?.settings.subject ?? detectedDefaults.subject);
  const [topic, setTopic] = React.useState(restored?.settings.topic ?? detectedDefaults.topic);
  const [scope, setScope] = React.useState(restored?.settings.scope || 'segment');
  const [durationMinutes, setDurationMinutes] = React.useState(() => restored?.settings.durationMinutes ?? (Number(suggested.segment) || 15));
  const [priorKnowledge, setPriorKnowledge] = React.useState(restored?.settings.priorKnowledge || '');
  const [standard, setStandard] = React.useState(restored?.settings.standard ?? detectedDefaults.standard);
  const [researchEnabled, setResearchEnabled] = React.useState(restored?.settings.researchEnabled ?? true);
  const [materialIds, setMaterialIds] = React.useState(() => restored?.settings.materialIds || materials.filter(materialAvailable).slice(0, 3).map(item => String(item.id)));
  const [selectedId, setSelectedId] = React.useState(() => restored?.draft?.version.id || restored?.selectedId || String(versions[versions.length - 1]?.id || ''));
  const [draft, setDraft] = React.useState(restored?.draft?.steps || null);
  const [draftSnapshot, setDraftSnapshot] = React.useState(restored?.draft?.version || null);
  const [draftBase, setDraftBase] = React.useState(restored?.draft?.baseline || '');
  const [draftVersionId, setDraftVersionId] = React.useState(restored?.draft?.version.id || '');
  const [localBusy, setLocalBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [localError, setLocalError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const mounted = React.useRef(true);
  const requestOwner = React.useRef(0);
  const generatingRequest = React.useRef(false);
  const savingRequest = React.useRef(false);
  const downloads = React.useRef(new Map());
  const previousVersions = React.useRef(versions.map(version => String(version.id)));
  const canonicalVersion = versions.find(item => String(item.id) === (draft ? draftVersionId : selectedId)) || (!draft ? versions[versions.length - 1] : null) || null;
  const version = canonicalVersion || (draft ? draftSnapshot : null);
  const hostRun = String(scriptRun.planId || '') === planId ? scriptRun : {};
  const busy = !!hostRun.busy || localBusy;
  const error = localError || _ltsText(hostRun.error?.message || hostRun.error);
  const canGenerate = capabilities.canGenerate === true && typeof onGenerateTeachingScript === 'function';
  const canResearch = capabilities.canResearch === true;
  const rules = scopes[scope] || _LTS_SCOPES.segment;
  const durationValid = Number.isInteger(Number(durationMinutes)) && Number(durationMinutes) >= rules.minMinutes && Number(durationMinutes) <= rules.maxMinutes;
  const sourceSteps = canonicalVersion?.steps || [];
  const steps = draft || sourceSteps;
  const versionRules = _ltsRules(version);
  const timings = steps.reduce((sum, step) => sum + Number(step.minutes || 0), 0);
  const invalidTiming = !!draft && (draft.some(step => !Number.isInteger(Number(step.minutes)) || Number(step.minutes) < 1 || Number(step.minutes) > versionRules.maxStepMinutes) || timings !== Number(version?.durationMinutes));
  const invalidDraftText = !!draft && draft.some(step => _ltsText(step.title).trim().length < 2 || _ltsText(step.title).trim().length > 240 || ['teacherSays', 'studentDoes', 'checkQuestion', 'possibleResponse', 'ifStruggling', 'ifReady'].some(key => _ltsText(step[key]).trim().length < (key === 'teacherSays' ? 60 : 12)));
  const invalidDraftLength = !!draft && draft.some(step => ['teacherSays', 'studentDoes', 'checkQuestion', 'possibleResponse', 'ifStruggling', 'ifReady'].some(key => _ltsText(step[key]).trim().length > 16000));
  const draftChanged = !!draft && JSON.stringify(draft.map(step => ({
    ...step,
    minutes: Number(step.minutes)
  }))) !== draftBase;
  const staleDraft = !!draft && (!canonicalVersion || String(canonicalVersion.id) !== draftVersionId || JSON.stringify(sourceSteps) !== draftBase);
  const selectedMaterials = materials.filter(item => materialIds.includes(String(item.id)) && materialAvailable(item));
  const unavailableMaterialIds = materialIds.filter(id => !selectedMaterials.some(item => String(item.id) === id));
  let inputWarnings = [],
    planChangedSinceScript = false,
    materialStatus = null;
  try {
    if (version && typeof runtime?.getMaterialStatus === 'function') materialStatus = runtime.getMaterialStatus(version, materials);
    if (typeof runtime?.captureInputs === 'function') {
      const preview = runtime.captureInputs(plan, {
        goal,
        grade,
        subject,
        topic,
        scope,
        durationMinutes,
        standard
      }, selectedMaterials);
      if (typeof runtime.getInputWarnings === 'function') inputWarnings = runtime.getInputWarnings(preview);
      planChangedSinceScript = !!version?.inputSnapshot?.planFingerprint && preview.planFingerprint !== version.inputSnapshot.planFingerprint;
    }
  } catch (_) {/* Optional input previews must not prevent reading saved scripts while dependencies load. */}
  const sources = Array.isArray(version?.sources) ? version.sources.filter(source => source && typeof source === 'object') : [];
  const recommendationById = new Map();
  sources.forEach(source => (Array.isArray(source.recommendations) ? source.recommendations : []).filter(recommendation => recommendation && typeof recommendation === 'object').forEach(recommendation => recommendationById.set(String(recommendation.id), {
    source,
    recommendation
  })));
  const subjectLabel = value => (subjectOptions.find(([key]) => key === value) || [])[1] || _ltsText(value);
  const scopeLabel = item => item && item.schemaVersion !== 1 && item.scope === 'lesson' ? tr('scope_lesson', 'Whole lesson') : tr('scope_segment', 'Direct-instruction segment');
  const formReady = !!goal.trim() && !!grade && !!subject && (subject !== 'other' || !!topic.trim()) && durationValid && selectedMaterials.length > 0 && unavailableMaterialIds.length === 0;
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestOwner.current += 1;
      downloads.current.forEach((timer, url) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      });
      downloads.current.clear();
    };
  }, []);
  const defaultsKey = JSON.stringify(detectedDefaults);
  React.useEffect(() => {
    if (busy || saving || JSON.stringify(previousDefaults.current) === defaultsKey) return;
    const previous = previousDefaults.current;
    [[setGoal, 'goal'], [setGrade, 'grade'], [setSubject, 'subject'], [setTopic, 'topic'], [setStandard, 'standard']].forEach(([setValue, key]) => setValue(current => current === previous[key] ? detectedDefaults[key] : current));
    previousDefaults.current = detectedDefaults;
    setDefaultsChanged(true);
    refreshDefaultsRecord(revision => revision + 1);
  }, [defaultsKey, busy, saving]);
  React.useEffect(() => {
    if (!draft && restoreEditFocus.current) {
      restoreEditFocus.current = false;
      (editToggle.current || settingsToggle.current || panelToggle.current)?.focus();
    }
  }, [draft]);
  React.useEffect(() => {
    if (draft && focusNewDraft.current && !spokenOnly) {
      focusNewDraft.current = false;
      document.getElementById(id + '-edit-0-title')?.focus();
    }
  }, [!!draft, spokenOnly]);
  React.useEffect(() => {
    if (!deleteCandidate && !deleting && restoreDeleteFocus.current) {
      restoreDeleteFocus.current = false;
      (versionSelect.current || settingsToggle.current || panelToggle.current)?.focus();
    }
  }, [deleteCandidate, deleting]);
  const useCurrentDefaults = () => {
    setGoal(detectedDefaults.goal);
    setGrade(detectedDefaults.grade);
    setSubject(detectedDefaults.subject);
    setTopic(detectedDefaults.topic);
    setStandard(detectedDefaults.standard);
    setDefaultsChanged(false);
  };
  const recoveryValue = {
    schemaVersion: 1,
    scope: draftScope,
    planId,
    settings: {
      goal,
      grade,
      subject,
      topic,
      scope,
      durationMinutes,
      priorKnowledge,
      standard,
      researchEnabled,
      materialIds
    },
    defaults: previousDefaults.current,
    selectedId,
    draft: draft ? {
      version: draftSnapshot,
      baseline: draftBase,
      steps: draft
    } : null
  };
  const recoveryPayload = JSON.stringify(recoveryValue);
  const initialPayload = React.useRef(recoveryPayload);
  const lastWrittenPayload = React.useRef(restored ? recoveryPayload : '');
  const hasSessionWork = !!restored || !!lastWrittenPayload.current || recoveryPayload !== initialPayload.current;
  React.useLayoutEffect(() => {
    if (!hasSessionWork || recoveryPayload === lastWrittenPayload.current) return;
    const status = _ltsWriteSession(recoveryKey, recoveryValue);
    if (!status) lastWrittenPayload.current = recoveryPayload;
    setRecoveryStatus(status);
  }, [recoveryPayload, hasSessionWork, recoveryKey]);
  React.useEffect(() => {
    if (!draft || !['unavailable', 'large'].includes(recoveryStatus)) return;
    const protectUnrecoverableDraft = event => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectUnrecoverableDraft);
    return () => window.removeEventListener('beforeunload', protectUnrecoverableDraft);
  }, [!!draft, recoveryStatus]);
  const versionIds = versions.map(item => String(item.id)).join('|');
  React.useEffect(() => {
    const added = versions.filter(item => !previousVersions.current.includes(String(item.id)));
    previousVersions.current = versions.map(item => String(item.id));
    if (added.length && !draft) {
      setSelectedId(String(added[added.length - 1].id));
      setNotice(tr('added', 'Script added to this plan.'));
      setSettingsExpanded(false);
      // Keep keyboard focus visible when the generation form closes after success.
      settingsToggle.current?.focus();
    }
  }, [versionIds]);
  const toggleMaterial = resourceId => setMaterialIds(previous => previous.includes(resourceId) ? previous.filter(item => item !== resourceId) : previous.concat(resourceId));
  const chooseScope = next => {
    if (next === scope) return;
    setScope(next);
    // Each scope has its own realistic default; the teacher can still edit the minutes afterwards.
    setDurationMinutes(Number(suggested[next]) || (next === 'lesson' ? 45 : 15));
  };
  const generate = async event => {
    event?.preventDefault();
    if (generatingRequest.current || deletingRequest.current || deleting || busy || saving || draft || !canGenerate || researchEnabled && !canResearch || !formReady) return;
    const owner = ++requestOwner.current;
    generatingRequest.current = true;
    setLocalBusy(true);
    setLocalError('');
    setNotice('');
    try {
      const result = await onGenerateTeachingScript({
        goal: goal.trim(),
        grade,
        subject,
        topic: topic.trim(),
        scope,
        durationMinutes: Number(durationMinutes),
        priorKnowledge: priorKnowledge.trim(),
        researchEnabled,
        materialIds: selectedMaterials.map(item => item.id),
        language: _ltsText(defaultSettings.language) || 'English',
        standard: standard.trim()
      });
      if (result?.ok === false && mounted.current && owner === requestOwner.current) setLocalError(_ltsText(result.error?.message || result.error) || tr('generate_failed', 'The script could not be generated. Your lesson plan is still available.'));
    } catch (failure) {
      if (mounted.current && owner === requestOwner.current) setLocalError(_ltsText(failure?.message) || tr('generate_failed', 'The script could not be generated. Your lesson plan is still available.'));
    } finally {
      if (mounted.current && owner === requestOwner.current) {
        generatingRequest.current = false;
        setLocalBusy(false);
      }
    }
  };
  const cancel = () => {
    requestOwner.current += 1;
    generatingRequest.current = false;
    setLocalBusy(false);
    if (typeof onCancelTeachingScript === 'function') onCancelTeachingScript(plan.id);
    setNotice(tr('cancelled', 'Generation cancelled.'));
    (expanded ? settingsToggle.current : panelToggle.current)?.focus();
  };
  const edit = () => {
    if (!version || busy || saving || deleting) return;
    setConfirmDiscard(false);
    setDeleteCandidate(null);
    focusNewDraft.current = true;
    setDraft(JSON.parse(JSON.stringify(sourceSteps)));
    setDraftSnapshot(JSON.parse(JSON.stringify(version)));
    setDraftBase(JSON.stringify(sourceSteps));
    setDraftVersionId(String(version.id));
    setShowRecoveryNotice(false);
    setLocalError('');
    setNotice('');
  };
  const updateStep = (index, key, value) => {
    setConfirmDiscard(false);
    setDraft(previous => previous.map((step, offset) => offset === index ? {
      ...step,
      [key]: value
    } : step));
  };
  const discardEdits = () => {
    if (saving) return;
    setConfirmDiscard(false);
    restoreEditFocus.current = true;
    setDraft(null);
    setDraftSnapshot(null);
    setDraftBase('');
    setDraftVersionId('');
    setShowRecoveryNotice(false);
    setLocalError('');
  };
  const keepEditing = () => {
    setConfirmDiscard(false);
    setTimeout(() => discardToggle.current?.focus(), 0);
  };
  const saveEdits = async () => {
    if (savingRequest.current || !draft || !version || saving || staleDraft || invalidTiming || invalidDraftText || invalidDraftLength || typeof onUpdateTeachingScript !== 'function') return;
    const owner = ++requestOwner.current;
    savingRequest.current = true;
    setConfirmDiscard(false);
    setSaving(true);
    setLocalError('');
    setNotice('');
    const submittedDraft = {
      version: draftSnapshot,
      baseline: draftBase,
      steps: draft
    };
    try {
      const result = await onUpdateTeachingScript(plan.id, version.id, draft.map(step => ({
        ...step,
        minutes: Number(step.minutes)
      })), JSON.parse(draftBase));
      if (result !== false && result?.ok !== false) {
        const clearStatus = _ltsClearSubmittedDraft(recoveryKey, draftScope, planId, submittedDraft);
        if (mounted.current && clearStatus) setRecoveryStatus(clearStatus);
      }
      if (!mounted.current || owner !== requestOwner.current) return;
      if (result === false || result?.ok === false) {
        setLocalError(_ltsText(result?.error?.message || result?.error) || tr('save_failed', 'Edits could not be added to the plan. Your draft is still here.'));
        return;
      }
      restoreEditFocus.current = true;
      setDraft(null);
      setDraftSnapshot(null);
      setDraftBase('');
      setDraftVersionId('');
      setShowRecoveryNotice(false);
      setNotice(tr('edits_added', 'Script edits added to this plan.'));
    } catch (failure) {
      if (mounted.current && owner === requestOwner.current) setLocalError(_ltsText(failure?.message) || tr('save_failed', 'Edits could not be added to the plan. Your draft is still here.'));
    } finally {
      if (mounted.current && owner === requestOwner.current) {
        savingRequest.current = false;
        setSaving(false);
      }
    }
  };
  const exportText = async kind => {
    const runtime = window.AlloModules?.LessonTeachingScript;
    if (!version || !draft && typeof runtime?.toPlainText !== 'function') {
      setLocalError(tr('export_unavailable', 'Text export is still loading. Please try again.'));
      return;
    }
    const exportVersion = draft ? {
      ...version,
      steps: draft
    } : version;
    try {
      const text = draft ? draftText() : runtime.toPlainText(exportVersion);
      if (typeof text !== 'string' || !text.trim()) throw new Error(tr('export_incomplete', 'This script could not be exported because its saved data or draft is incomplete. Review the script fields and try again.'));
      if (kind === 'copy') {
        if (typeof navigator.clipboard?.writeText !== 'function') throw new Error(tr('copy_unavailable', 'Copy is unavailable here. Download the text instead.'));
        await navigator.clipboard.writeText(text);
        if (mounted.current) setNotice(tr('copied', 'Script text copied.'));
      } else if (kind === 'print') {
        const popup = window.open('', '_blank', 'width=850,height=800');
        if (!popup) throw new Error(tr('print_blocked', 'Allow the print window, then try again.'));
        const escape = value => String(value).replace(/[&<>"']/g, char => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[char]);
        popup.opener = null;
        popup.document.write('<!doctype html><html lang="' + escape(document.documentElement.lang || 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + escape(version.title) + '</title><style>*{box-sizing:border-box}body{font:16px/1.55 system-ui,sans-serif;color:#111;background:#fff;margin:0;padding:24px}main{max-width:50rem;margin:auto}h1{font-size:24px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}@page{margin:18mm}@media print{body{padding:0}main{max-width:none}}</style></head><body><main><h1>' + escape(tr('print_title', 'Full teaching script')) + '</h1><pre dir="auto">' + escape(text) + '</pre></main></body></html>');
        popup.document.close();
        popup.focus();
        popup.print();
        if (mounted.current) setNotice(tr('print_opened', 'The script print view is open.'));
      } else {
        const url = URL.createObjectURL(new Blob([text], {
          type: 'text/plain;charset=utf-8'
        }));
        const timer = setTimeout(() => {
          URL.revokeObjectURL(url);
          downloads.current.delete(url);
        }, 1000);
        downloads.current.set(url, timer);
        const link = document.createElement('a');
        link.href = url;
        link.download = (_ltsText(version.title) || 'teaching-script').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 100) + (draft ? '-draft' : '') + '.txt';
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
        setNotice(tr('downloaded', 'Script text downloaded.'));
      }
      if (mounted.current) setLocalError('');
    } catch (failure) {
      if (mounted.current) setLocalError(_ltsText(failure?.message) || tr('export_failed', 'The script could not be exported. Please try again.'));
    }
  };
  const keepVersion = () => {
    if (deletingRequest.current) return;
    setDeleteCandidate(null);
    setTimeout(() => deleteToggle.current?.focus(), 0);
  };
  const deleteScript = async () => {
    if (deletingRequest.current || !deleteCandidate || deleting || draft || busy || saving || typeof props.onDeleteTeachingScript !== 'function') return;
    deletingRequest.current = true;
    setDeleting(true);
    setLocalError('');
    setNotice('');
    try {
      const result = await props.onDeleteTeachingScript(plan.id, deleteCandidate.id, deleteCandidate);
      if (!mounted.current) return;
      if (result === false || result?.ok === false) {
        setLocalError(_ltsText(result?.error?.message || result?.error) || tr('delete_failed', 'The version could not be deleted. Try again.'));
        return;
      }
      restoreDeleteFocus.current = true;
      setDeleteCandidate(null);
      setNotice(tr('version_deleted', 'Script version and its saved audio deleted.'));
    } catch (error) {
      if (mounted.current) setLocalError(_ltsText(error?.message || error) || tr('delete_failed', 'The version could not be deleted. Try again.'));
    } finally {
      deletingRequest.current = false;
      if (mounted.current) setDeleting(false);
    }
  };
  const fieldClass = 'w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:bg-slate-100';
  const buttonClass = 'min-h-11 rounded-lg border border-indigo-600 px-3 py-2 text-sm font-bold text-indigo-900 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50';
  const stepFields = [['teacherSays', tr('teacher_says', 'Teacher says')], ['studentDoes', tr('student_does', 'Learners do')], ['checkQuestion', tr('check_question', 'Check for understanding')], ['possibleResponse', tr('possible_response', 'Possible learner response')], ['ifStruggling', tr('if_struggling', 'If learners need support (likely misconception)')], ['ifReady', tr('if_ready', 'If learners are ready to go further')]];
  const fieldIssue = (step, key) => {
    if (key === 'minutes') return Number.isInteger(Number(step.minutes)) && Number(step.minutes) >= 1 && Number(step.minutes) <= versionRules.maxStepMinutes ? '' : tr('field_minutes', 'Use whole minutes from 1 to {max}.').replace('{max}', String(versionRules.maxStepMinutes));
    const length = _ltsText(step[key]).trim().length;
    const min = key === 'title' ? 2 : key === 'teacherSays' ? 60 : 12,
      max = key === 'title' ? 240 : 16000;
    return length < min || length > max ? tr('field_length', 'Use {min}–{max} characters; currently {count}.').replace('{min}', String(min)).replace('{max}', String(max)).replace('{count}', String(length)) : '';
  };
  const editFieldProps = (step, index, key) => ({
    id: id + '-edit-' + index + '-' + key,
    'aria-invalid': !!fieldIssue(step, key),
    'aria-describedby': fieldIssue(step, key) ? id + '-edit-' + index + '-' + key + '-error' : undefined
  });
  const editFieldError = (step, index, key) => fieldIssue(step, key) ? /*#__PURE__*/React.createElement("span", {
    id: id + '-edit-' + index + '-' + key + '-error',
    className: "mt-1 block text-sm font-normal text-red-900"
  }, fieldIssue(step, key)) : null;
  const focusEditIssue = () => {
    const list = document.getElementById(id + '-steps');
    (list?.querySelector('[aria-invalid="true"]') || document.getElementById(id + '-edit-0-minutes'))?.focus();
  };
  const jumpToStep = value => {
    if (value === '') return;
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) return;
    const target = document.getElementById(id + '-script-step-' + index);
    target?.scrollIntoView?.({
      block: 'start'
    });
    target?.querySelector('[data-script-step-heading], input')?.focus();
  };
  const materialName = resourceId => {
    const recorded = version?.inputSnapshot?.materialTitles?.find?.(item => String(item?.id) === String(resourceId));
    const current = materials.filter(item => String(item.id) === String(resourceId));
    return _ltsText(recorded?.title) || (current.length === 1 ? _ltsText(current[0].title || current[0].data?.title) : '') || String(resourceId);
  };
  const draftText = () => {
    const snapshot = draftSnapshot || version;
    const settings = snapshot?.inputSnapshot?.settings || {};
    const lines = [tr('draft_export_label', 'UNSAVED DRAFT — not validated'), tr('draft_export_hint', 'This text includes unfinished edits. It does not update the saved script.'), _ltsText(snapshot?.title), scopeLabel(snapshot) + ' · ' + _ltsText(snapshot?.durationMinutes) + ' ' + tr('minutes', 'minutes')];
    [['goal', tr('goal', 'Learning goal')], ['priorKnowledge', tr('prior', 'Relevant prior learning')], ['standard', tr('standard', 'Standard or target')], ['language', tr('language', 'Script language:').replace(/[:：]\s*$/, '')]].forEach(([key, label]) => {
      if (_ltsText(settings[key])) lines.push(label + ': ' + _ltsText(settings[key]));
    });
    (draft || []).forEach((step, index) => {
      lines.push('', index + 1 + '. ' + _ltsText(step.title) + (step.phase ? ' · ' + (phaseLabel(step.phase) || _ltsText(step.phase)) : ''), tr('step_minutes', 'Minutes') + ': ' + _ltsText(step.minutes));
      stepFields.forEach(([key, label]) => lines.push(label + ': ' + _ltsText(step[key])));
      if (Array.isArray(step.resourceIds) && step.resourceIds.length) lines.push(tr('step_materials', 'Lesson resources:') + ' ' + step.resourceIds.map(resourceId => {
        const recorded = snapshot?.inputSnapshot?.materialTitles?.find?.(item => String(item?.id) === String(resourceId));
        return _ltsText(recorded?.title) || String(resourceId);
      }).join('; '));
      if (Array.isArray(step.recommendationIds) && step.recommendationIds.length) lines.push(tr('draft_recommendations', 'Teaching guidance IDs:') + ' ' + step.recommendationIds.map(String).join('; '));
    });
    lines.push('', tr('sources', 'Teaching sources and evidence'));
    (Array.isArray(snapshot?.sources) ? snapshot.sources : []).forEach(source => {
      if (!source || typeof source !== 'object') return;
      lines.push([_ltsText(source.id), _ltsText(source.title), _ltsSafeUrl(source.url), _ltsText(source.author), _ltsText(source.scope)].filter(Boolean).join(' · '));
      (Array.isArray(source.recommendations) ? source.recommendations : []).forEach(rec => {
        if (rec && typeof rec === 'object') lines.push([_ltsText(rec.id), _ltsText(rec.text), _ltsText(rec.locator)].filter(Boolean).join(' · '));
      });
    });
    (Array.isArray(snapshot?.warnings) ? snapshot.warnings : []).forEach(warning => lines.push(_ltsText(warning)));
    return lines.join('\n');
  };
  const researchLabels = {
    off: tr('research_off', 'Research turned off'),
    disabled: tr('research_off', 'Research turned off'),
    unavailable: tr('research_unavailable_status', 'Live research unavailable'),
    curated: tr('research_curated', 'Curated teaching guidance'),
    fresh: tr('research_fresh', 'Research sources retrieved'),
    completed: tr('research_fresh', 'Research sources retrieved'),
    researched: tr('research_fresh', 'Research sources retrieved'),
    retrieved: tr('research_fresh', 'Research sources retrieved')
  };
  const phaseLabel = phase => phase && _LTS_PHASES[phase] ? tr('phase_' + phase, _LTS_PHASES[phase]) : '';
  const detectedNote = [defaultSettings.subjectDetected ? tr('context_subject_detected', 'Subject detected from the saved plan') : tr('context_subject_unknown', 'Subject could not be detected; choose it below'), defaultSettings.gradeSource === 'plan' ? tr('context_grade_plan', 'Grade from the saved plan') : tr('context_grade_missing', 'The saved plan has no grade; choose one below'), Array.isArray(defaultSettings.phases) && defaultSettings.phases.length ? tr('context_phases', 'Plan phases:') + ' ' + defaultSettings.phases.map(phaseLabel).filter(Boolean).join(', ') : ''].filter(Boolean);
  if (spokenOnly && version) return /*#__PURE__*/React.createElement(LessonSpokenDirections, {
    key: JSON.stringify([version.id, runtime?.spokenSegments?.({
      ...version,
      steps
    }), !!draft, props.audioProfile, version.inputSnapshot?.settings?.language, plan.config?.language]),
    initialStepIndex: spokenPosition?.versionId === String(version.id) ? spokenPosition.index : 0,
    onStepChange: index => setSpokenPosition({
      versionId: String(version.id),
      index
    }),
    planId: planId,
    version: {
      ...version,
      steps
    },
    draft: !!draft,
    createAudio: props.createTeachingScriptAudio,
    t: props.t,
    audioVoice: props.audioVoice,
    audioSpeed: props.audioSpeed,
    audioLanguage: version.inputSnapshot?.settings?.language || plan.config?.language || defaultSettings.language,
    onOpenVoiceSettings: props.onOpenVoiceSettings,
    onBack: () => {
      setSpokenOnly(false);
      setTimeout(() => spokenToggle.current?.focus(), 0);
    }
  });
  return /*#__PURE__*/React.createElement("section", {
    className: "rounded-xl border border-indigo-200 bg-white shadow-sm",
    "aria-labelledby": id + '-title',
    "data-teaching-script-plan": planId
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-5"
  }, /*#__PURE__*/React.createElement("h3", {
    id: id + '-title',
    className: "text-lg font-black text-indigo-950"
  }, /*#__PURE__*/React.createElement("button", {
    ref: panelToggle,
    type: "button",
    className: "flex min-h-11 w-full items-center justify-between gap-3 text-left focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg",
    "aria-expanded": expanded,
    "aria-controls": id + '-panel',
    onClick: () => setExpanded(!expanded)
  }, /*#__PURE__*/React.createElement("span", null, tr('title', 'Teaching script')), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, expanded ? '−' : '+'))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('tagline', 'Word-for-word teacher wording for this lesson · any subject and grade · a teaching segment or the whole lesson')), showRecoveryNotice && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "mt-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-950"
  }, draft ? tr('recovered_draft', 'Recovered unsaved script edits and settings from this tab. Save edits to add them to the lesson plan.') : tr('recovered_settings', 'Recovered your script settings from this tab.')), (recoveryStatus === 'invalid' || hasSessionWork && ['unavailable', 'large'].includes(recoveryStatus)) && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
  }, recoveryStatus === 'invalid' ? tr('recovery_invalid', 'A recovery copy could not be restored. Your saved lesson and script versions are still available.') : tr('recovery_unavailable', 'This tab could not keep a recovery copy of the latest changes. Save script edits before leaving this lesson; your current edits are still on this page.')), hasIncompleteVersions && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "mt-2 text-sm text-amber-950"
  }, tr('incomplete_saved', 'A saved script has incomplete data and could not be displayed. Your lesson plan and other script versions are still available.')), version && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 break-words text-sm font-semibold text-indigo-900"
  }, tr('saved_script', 'Saved script:'), " ", _ltsText(version.title) || tr('title', 'Teaching script'), " · ", version.durationMinutes, " ", tr('minutes', 'minutes')), busy && !expanded && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "mt-2 text-sm text-indigo-900"
  }, _ltsText(hostRun.stage) || tr('generating', 'Preparing the teaching script…')), busy && !expanded && typeof onCancelTeachingScript === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass + ' mt-2 no-print',
    onClick: cancel
  }, tr('cancel', 'Cancel generation')), error && !expanded && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "mt-2 text-sm text-red-900"
  }, error)), expanded && /*#__PURE__*/React.createElement("div", {
    id: id + '-panel',
    className: "space-y-5 border-t border-indigo-100 p-4 sm:p-5"
  }, !version && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('intro', 'Review the detected lesson context, then build a scripted teaching sequence from the resources you select. Each generated version is attached to this plan.')), /*#__PURE__*/React.createElement("div", {
    className: "no-print"
  }, /*#__PURE__*/React.createElement("button", {
    ref: settingsToggle,
    type: "button",
    className: buttonClass + ' flex w-full items-center justify-between gap-3 text-left',
    "aria-expanded": settingsExpanded,
    "aria-controls": id + '-settings',
    onClick: () => setSettingsExpanded(previous => !previous)
  }, /*#__PURE__*/React.createElement("span", null, version ? tr('create_another', 'Create another script') : tr('generation_settings', 'Script settings')), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, settingsExpanded ? '−' : '+')), /*#__PURE__*/React.createElement("div", {
    id: id + '-settings',
    hidden: !settingsExpanded,
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("form", {
    onSubmit: generate,
    className: "space-y-4"
  }, defaultsChanged && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950"
  }, /*#__PURE__*/React.createElement("p", {
    role: "status"
  }, tr('defaults_updated', 'The saved lesson changed. Unedited script settings were refreshed; your custom settings were kept.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass + ' mt-2',
    disabled: busy || saving,
    onClick: useCurrentDefaults
  }, tr('use_current_defaults', 'Use current lesson defaults'))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-950",
    "data-teaching-context": true
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold"
  }, tr('context_title', 'Detected lesson context')), /*#__PURE__*/React.createElement("ul", {
    className: "mt-1 list-disc space-y-0.5 pl-5"
  }, detectedNote.map((line, index) => /*#__PURE__*/React.createElement("li", {
    key: index
  }, line)))), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-4 sm:grid-cols-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-subject',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('subject', 'Subject area')), /*#__PURE__*/React.createElement("select", {
    id: id + '-subject',
    required: true,
    className: fieldClass,
    value: subject,
    disabled: busy || saving,
    onChange: event => setSubject(event.target.value)
  }, subjectOptions.map(([value, label]) => /*#__PURE__*/React.createElement("option", {
    key: value,
    value: value
  }, tr('subject_' + value.replace(/-/g, '_'), label))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-topic',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('topic', 'Lesson topic')), /*#__PURE__*/React.createElement("input", {
    id: id + '-topic',
    maxLength: 200,
    className: fieldClass,
    value: topic,
    disabled: busy || saving,
    required: subject === 'other',
    onChange: event => setTopic(event.target.value),
    placeholder: tr('topic_hint', 'For example: blending CVC words, photosynthesis, causes of the French Revolution')
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-goal',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('goal', 'Learning goal')), /*#__PURE__*/React.createElement("textarea", {
    id: id + '-goal',
    required: true,
    maxLength: 1200,
    rows: 2,
    className: fieldClass,
    value: goal,
    disabled: busy || saving,
    onChange: event => setGoal(event.target.value)
  })), /*#__PURE__*/React.createElement("fieldset", {
    className: "space-y-2",
    disabled: busy || saving
  }, /*#__PURE__*/React.createElement("legend", {
    className: "mb-1 text-sm font-bold text-slate-900"
  }, tr('scope', 'What to script')), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-2 sm:grid-cols-2"
  }, [['segment', tr('scope_segment', 'Direct-instruction segment'), tr('scope_segment_hint', 'One modelling or explanation segment inside this lesson.')], ['lesson', tr('scope_lesson', 'Whole lesson'), tr('scope_lesson_hint', 'Every phase of the saved plan, from hook to closure.')]].map(([value, label, hint]) => /*#__PURE__*/React.createElement("label", {
    key: value,
    className: 'flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-2 ' + (scope === value ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300')
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: id + '-scope',
    className: "mt-1 h-4 w-4",
    value: value,
    checked: scope === value,
    onChange: () => chooseScope(value)
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-900"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, label), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-700"
  }, hint)))))), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-4 sm:grid-cols-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-grade',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('grade', 'Grade or age group')), /*#__PURE__*/React.createElement("select", {
    id: id + '-grade',
    required: true,
    className: fieldClass,
    value: grade,
    disabled: busy || saving,
    onChange: event => setGrade(event.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, tr('choose_grade', 'Choose grade or age group')), (gradeOptions.includes(grade) || !grade ? gradeOptions : gradeOptions.concat(grade)).map(value => /*#__PURE__*/React.createElement("option", {
    key: value,
    value: value
  }, value)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-duration',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('duration', 'Teaching time'), " (", tr('minutes', 'minutes'), ")"), /*#__PURE__*/React.createElement("input", {
    id: id + '-duration',
    type: "number",
    inputMode: "numeric",
    min: rules.minMinutes,
    max: rules.maxMinutes,
    step: 1,
    required: true,
    className: fieldClass,
    value: durationMinutes,
    disabled: busy || saving,
    onChange: event => setDurationMinutes(event.target.value === '' ? '' : Number(event.target.value))
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, tr('duration_hint', 'Whole minutes between'), " ", rules.minMinutes, " ", tr('and', 'and'), " ", rules.maxMinutes, "."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-prior',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('prior', 'Relevant prior learning')), /*#__PURE__*/React.createElement("textarea", {
    id: id + '-prior',
    maxLength: 2000,
    rows: 2,
    className: fieldClass,
    value: priorKnowledge,
    disabled: busy || saving,
    onChange: event => setPriorKnowledge(event.target.value),
    placeholder: tr('prior_hint', 'For example: learners can already name the parts, but confuse the two key terms.')
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-standard',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('standard', 'Target standard (optional)')), /*#__PURE__*/React.createElement("input", {
    id: id + '-standard',
    maxLength: 1000,
    className: fieldClass,
    value: standard,
    disabled: busy || saving,
    onChange: event => setStandard(event.target.value)
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, tr('standard_hint', 'Your standard provides context for the script. Retrieved research is matched to the subject and grade, not verified against this standard.'))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('language', 'Script language:'), " ", _ltsText(defaultSettings.language) || 'English'), /*#__PURE__*/React.createElement("fieldset", {
    className: "space-y-2 rounded-lg border border-slate-300 p-3",
    disabled: busy || saving
  }, /*#__PURE__*/React.createElement("legend", {
    className: "px-1 text-sm font-bold text-slate-900"
  }, tr('materials', 'Use lesson resources')), materials.length ? materials.map((material, index) => /*#__PURE__*/React.createElement("label", {
    key: String(material.id) + ':' + index,
    className: "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-indigo-50"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    className: "mt-1 h-4 w-4",
    disabled: !materialAvailable(material),
    checked: materialIds.includes(String(material.id)),
    onChange: () => toggleMaterial(String(material.id))
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-800"
  }, _ltsText(material.title || material.data?.title) || tr('untitled_resource', 'Lesson resource') + ' ' + (index + 1), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, "(", _ltsText(material.type).replace(/-/g, ' '), ")"), !materialAvailable(material) && /*#__PURE__*/React.createElement("span", {
    className: "block text-xs text-amber-950"
  }, tr('material_unusable', 'This resource has no readable teaching content or its ID is duplicated.'))))) : /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600"
  }, tr('no_materials', 'No matching resources are available for this lesson. Add a relevant lesson resource before creating a script.'))), unavailableMaterialIds.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
  }, /*#__PURE__*/React.createElement("p", {
    role: "status"
  }, tr('selected_material_unavailable', 'A selected resource was removed, changed lessons, or no longer has readable content. Review the available resources before generating.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass + ' mt-2',
    disabled: busy || saving,
    onClick: () => setMaterialIds(selectedMaterials.map(item => String(item.id)))
  }, tr('remove_unavailable', 'Remove unavailable selections'))), inputWarnings.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "list-disc rounded-lg bg-amber-50 py-3 pl-7 pr-3 text-sm text-amber-950",
    "aria-label": tr('input_limits', 'Content supplied to the script')
  }, inputWarnings.map((warning, index) => /*#__PURE__*/React.createElement("li", {
    key: index
  }, _ltsText(warning)))), !selectedMaterials.length && materials.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-amber-950"
  }, tr('choose_material', 'Choose at least one lesson resource for the script.')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "flex min-h-11 items-center gap-3 text-sm font-bold text-slate-900"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    className: "h-4 w-4",
    checked: researchEnabled,
    disabled: busy || saving,
    onChange: event => setResearchEnabled(event.target.checked)
  }), tr('research', 'Use research to inform teaching choices')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, tr('research_hint', 'Public practice guides are matched to the subject, topic and grade above and read in full; if none can be verified, generation stops so you can decide.')), !researchEnabled && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm text-slate-700"
  }, tr('resources_only', 'The script will use your saved lesson and selected resources without retrieved research.')), researchEnabled && !canResearch && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('research_unavailable', 'Live research is unavailable here. Turn off research to generate from the lesson, or try again when research is available.'))), !canGenerate && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "rounded-lg bg-amber-50 p-3 text-sm text-amber-950"
  }, tr('ai_unavailable', 'Script generation needs an available AI connection. Saved versions remain available to read, edit and export.')), !!draft && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-900"
  }, tr('finish_edits', 'Save or discard your script edits before generating another version.')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, tr('history_retention', 'Script versions are kept until you delete them. Deleting a version also removes its saved audio.')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: buttonClass + ' bg-indigo-50',
    disabled: !canGenerate || researchEnabled && !canResearch || busy || saving || deleting || !!draft || !formReady
  }, error ? tr('retry', 'Try generating again') : tr('generate', 'Generate script')))))), /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "text-sm font-bold text-indigo-950"
  }, busy ? _ltsText(hostRun.stage) || tr('generating', 'Preparing the teaching script…') : notice), busy && typeof onCancelTeachingScript === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass + ' no-print',
    onClick: cancel
  }, tr('cancel', 'Cancel generation')), error && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900"
  }, error), version && /*#__PURE__*/React.createElement("div", {
    className: "space-y-5 border-t border-slate-200 pt-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-end gap-3 no-print"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full min-w-0 sm:w-auto sm:flex-1"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-version',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('version', 'Script version')), /*#__PURE__*/React.createElement("select", {
    ref: versionSelect,
    id: id + '-version',
    className: fieldClass,
    value: String(version.id),
    disabled: !!draft || saving || busy || deleting,
    onChange: event => {
      setDeleteCandidate(null);
      setSelectedId(event.target.value);
      setNotice('');
      setLocalError('');
    }
  }, !canonicalVersion && draftSnapshot && /*#__PURE__*/React.createElement("option", {
    value: String(draftSnapshot.id)
  }, tr('recovered_version', 'Recovered draft version')), versions.map((item, index) => /*#__PURE__*/React.createElement("option", {
    key: item.id,
    value: String(item.id)
  }, [tr('version_number', 'Version') + ' ' + (index + 1), _ltsText(item.title) || tr('title', 'Teaching script'), scopeLabel(item), Number(item.durationMinutes) > 0 ? item.durationMinutes + ' ' + tr('minutes', 'minutes') : ''].filter(Boolean).join(' · '))))), !draft && typeof onUpdateTeachingScript === 'function' && /*#__PURE__*/React.createElement("button", {
    ref: editToggle,
    type: "button",
    className: buttonClass,
    disabled: busy || saving || deleting,
    onClick: edit
  }, tr('edit', 'Edit script')), /*#__PURE__*/React.createElement("button", {
    ref: spokenToggle,
    type: "button",
    className: buttonClass,
    disabled: saving || deleting,
    onClick: () => setSpokenOnly(true)
  }, tr('spoken_view', 'Spoken directions')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: saving,
    onClick: () => exportText('copy')
  }, tr('copy', 'Copy text')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: saving,
    onClick: () => exportText('download')
  }, tr('download', 'Download text')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: saving,
    onClick: () => exportText('print')
  }, tr('print_script', 'Print script'))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('history_retention', 'Script versions are kept until you delete them. Deleting a version also removes its saved audio.')), !draft && typeof props.onDeleteTeachingScript === 'function' && /*#__PURE__*/React.createElement("div", {
    className: "no-print space-y-2"
  }, deleteCandidate ? /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": tr('delete_confirm', 'Delete this script version and its saved audio?'),
    className: "rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950",
    onKeyDown: event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        keepVersion();
      }
    }
  }, /*#__PURE__*/React.createElement("p", null, tr('delete_confirm', 'Delete this script version and its saved audio?'), " ", _ltsText(deleteCandidate.title)), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: deleting || busy,
    onClick: deleteScript
  }, tr('confirm_delete', 'Delete version and audio')), /*#__PURE__*/React.createElement("button", {
    autoFocus: true,
    type: "button",
    className: buttonClass,
    disabled: deleting,
    onClick: keepVersion
  }, tr('keep_version', 'Keep version')))) : /*#__PURE__*/React.createElement("button", {
    ref: deleteToggle,
    type: "button",
    className: buttonClass,
    disabled: saving || busy || deleting,
    onClick: () => {
      setLocalError('');
      setNotice('');
      setDeleteCandidate(JSON.parse(JSON.stringify(version)));
    }
  }, tr('delete_version', 'Delete this version'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-lg font-black text-slate-900"
  }, _ltsText(version.title) || tr('title', 'Teaching script')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, scopeLabel(version), " · ", version.durationMinutes, " ", tr('minutes', 'minutes'), version.inputSnapshot?.settings?.grade ? ' · ' + _ltsGradeLabel(version.inputSnapshot.settings.grade) : '', version.inputSnapshot?.settings?.subject ? ' · ' + subjectLabel(version.inputSnapshot.settings.subject) : '', " · ", researchLabels[version.researchStatus] || _ltsText(version.researchStatus).replace(/[-_]/g, ' ') || tr('research_unspecified', 'Research status not recorded')), version.editedAt && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, tr('last_edited', 'Last edited:'), " ", /*#__PURE__*/React.createElement("time", {
    dateTime: _ltsText(version.editedAt)
  }, _ltsText(version.editedAt).replace('T', ' ').replace(/\.\d+Z$/, ' UTC'))), version.createdAt && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, /*#__PURE__*/React.createElement("time", {
    dateTime: _ltsText(version.createdAt)
  }, _ltsText(version.createdAt).replace('T', ' ').replace(/\.\d+Z$/, ' UTC')))), materialStatus && (materialStatus.changed.length > 0 || materialStatus.missing.length > 0 || materialStatus.ambiguous.length > 0) && /*#__PURE__*/React.createElement("div", {
    role: "status",
    className: "space-y-2 break-words rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950",
    "data-script-material-warning": true
  }, /*#__PURE__*/React.createElement("p", null, tr('materials_changed', 'Materials used for this script have changed, are missing, or have duplicate IDs. Review the current resources and script before teaching, or create a new version.')), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc space-y-1 pl-5"
  }, [['changed', tr('source_changed', 'Content changed')], ['missing', tr('source_missing', 'Not available')], ['ambiguous', tr('source_ambiguous', 'Duplicate resource ID')]].flatMap(([kind, label]) => materialStatus[kind].map(resourceId => /*#__PURE__*/React.createElement("li", {
    key: kind + ':' + resourceId
  }, label, ": ", materialName(resourceId)))))), materialStatus?.untracked && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('materials_untracked', 'This older script has no recorded content versions for some source materials. Review those resources before teaching.')), planChangedSinceScript && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
  }, tr('plan_changed', 'The saved lesson differs from the lesson content captured for this script. Review the script against the current plan, or create a new version.')), Array.isArray(version.warnings) && version.warnings.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "list-disc space-y-1 rounded-lg bg-amber-50 py-3 pl-7 pr-3 text-sm text-amber-950"
  }, version.warnings.map((warning, index) => /*#__PURE__*/React.createElement("li", {
    key: index
  }, _ltsText(warning)))), draft && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 rounded-lg border border-indigo-300 bg-indigo-50 p-3 no-print"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-indigo-950"
  }, tr('unsaved_edits', 'Unsaved script edits')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('draft_export_available', 'Copy, download or print your draft text at any point, even before all fields are complete. Exports are labeled as unsaved drafts.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    onClick: () => {
      editActions.current?.scrollIntoView?.({
        block: 'start'
      });
      editActions.current?.focus();
    }
  }, tr('review_save', 'Go to save and discard controls')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800"
  }, tr('edit_timing', 'Step total:'), " ", Number.isFinite(timings) ? timings : '—', " / ", version.durationMinutes, " ", tr('minutes', 'minutes')), (invalidTiming || invalidDraftText || invalidDraftLength) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-red-900"
  }, tr('review_fields', 'Review the highlighted fields and step timing before saving.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    onClick: focusEditIssue
  }, tr('first_issue', 'Go to first issue')))), steps.length > 1 && /*#__PURE__*/React.createElement("nav", {
    className: "no-print",
    "aria-label": tr('script_navigation', 'Script step navigation')
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold text-slate-900"
  }, tr('jump_script_step', 'Go to script step'), /*#__PURE__*/React.createElement("select", {
    "aria-label": tr('jump_script_step', 'Go to script step'),
    className: fieldClass + ' mt-1 min-h-11 min-w-0 max-w-full',
    value: "",
    onChange: event => jumpToStep(event.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, tr('choose_step', 'Choose a step…')), steps.map((step, index) => /*#__PURE__*/React.createElement("option", {
    key: step.id || index,
    value: index
  }, index + 1, ". ", _ltsText(step.title)))))), /*#__PURE__*/React.createElement("ol", {
    id: id + '-steps',
    className: "space-y-4"
  }, steps.map((step, index) => /*#__PURE__*/React.createElement("li", {
    key: step.id || index,
    className: "min-w-0 space-y-3 break-words rounded-xl border border-slate-300 p-3 sm:p-4",
    "data-teaching-step": step.id || index,
    id: id + '-script-step-' + index
  }, draft ? /*#__PURE__*/React.createElement("div", {
    className: "grid gap-3 sm:grid-cols-[1fr_8rem]"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold"
  }, tr('step_title', 'Step title'), " ", index + 1, /*#__PURE__*/React.createElement("input", _extends({}, editFieldProps(step, index, "title"), {
    "aria-label": tr("step_title", "Step title") + " " + (index + 1),
    className: fieldClass + ' mt-1',
    value: step.title || '',
    maxLength: 240,
    disabled: saving,
    onChange: event => updateStep(index, 'title', event.target.value)
  })), editFieldError(step, index, 'title')), /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold"
  }, tr('step_minutes', 'Minutes'), " ", index + 1, /*#__PURE__*/React.createElement("input", _extends({}, editFieldProps(step, index, "minutes"), {
    "aria-label": tr("step_minutes", "Minutes") + " " + (index + 1),
    className: fieldClass + ' mt-1',
    type: "number",
    min: 1,
    max: versionRules.maxStepMinutes,
    step: 1,
    value: step.minutes,
    disabled: saving,
    onChange: event => updateStep(index, 'minutes', event.target.value)
  })), editFieldError(step, index, 'minutes'))) : /*#__PURE__*/React.createElement("h5", {
    "data-script-step-heading": true,
    tabIndex: -1,
    className: "rounded font-black text-indigo-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
  }, index + 1, ". ", _ltsText(step.title), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-normal"
  }, "· ", step.minutes, " ", tr('minutes', 'minutes'), phaseLabel(step.phase) ? ' · ' + phaseLabel(step.phase) : '')), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-3 sm:grid-cols-2"
  }, stepFields.map(([key, label]) => /*#__PURE__*/React.createElement("div", {
    key: key,
    className: (key === 'teacherSays' ? 'sm:col-span-2 ' : '') + (['teacherSays', 'checkQuestion'].includes(key) ? 'rounded-lg border-l-4 border-indigo-600 bg-indigo-50 p-3' : '')
  }, ['teacherSays', 'checkQuestion'].includes(key) && /*#__PURE__*/React.createElement("p", {
    className: "mb-1 text-xs font-bold text-indigo-900"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "❝ "), key === 'teacherSays' ? tr('say_aloud', 'Say aloud') : tr('ask_aloud', 'Ask aloud')), draft ? /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold text-slate-900"
  }, label, " · ", index + 1, /*#__PURE__*/React.createElement("textarea", _extends({}, editFieldProps(step, index, key), {
    "aria-label": label + " · " + (index + 1),
    className: fieldClass + ' mt-1',
    rows: 3,
    value: step[key] || '',
    maxLength: 16000,
    disabled: saving,
    onChange: event => updateStep(index, key, event.target.value)
  })), editFieldError(step, index, key)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h6", {
    className: "text-xs font-black uppercase tracking-wide text-slate-600"
  }, label), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 whitespace-pre-wrap text-sm text-slate-900"
  }, _ltsText(step[key]) || '—'))))), Array.isArray(step.resourceIds) && step.resourceIds.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-700"
  }, tr('step_materials', 'Lesson resources:')), step.resourceIds.map(resourceId => {
    const matches = materials.filter(item => String(item.id) === String(resourceId));
    const material = matches.length === 1 ? matches[0] : null;
    return material && typeof onOpenTeachingMaterial === 'function' ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: resourceId,
      className: buttonClass + ' no-print',
      disabled: !!draft || saving,
      onClick: () => onOpenTeachingMaterial(material.id)
    }, _ltsText(material.title || material.data?.title) || _ltsText(material.type)) : /*#__PURE__*/React.createElement("span", {
      key: resourceId,
      className: "text-sm text-slate-700"
    }, material ? _ltsText(material.title || material.data?.title) || _ltsText(material.type) : matches.length > 1 ? tr('source_ambiguous', 'Duplicate resource ID') + ': ' + materialName(resourceId) : tr('missing_material', 'Resource no longer available in this lesson') + ': ' + materialName(resourceId));
  })), Array.isArray(step.recommendationIds) && step.recommendationIds.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "space-y-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-950",
    "aria-label": tr('step_evidence', 'Teaching guidance used in this step')
  }, step.recommendationIds.map(recommendationId => {
    const entry = recommendationById.get(String(recommendationId));
    if (!entry) return /*#__PURE__*/React.createElement("li", {
      key: recommendationId
    }, tr('missing_recommendation', 'The cited teaching guidance is unavailable. Review this step.'));
    const href = _ltsSafeUrl(entry.source.url);
    return /*#__PURE__*/React.createElement("li", {
      key: recommendationId
    }, /*#__PURE__*/React.createElement("p", null, _ltsText(entry.recommendation.text)), /*#__PURE__*/React.createElement("p", {
      className: "mt-1 text-xs"
    }, href ? /*#__PURE__*/React.createElement("a", {
      href: href,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "font-bold underline"
    }, _ltsText(entry.source.title)) : _ltsText(entry.source.title), entry.recommendation.locator ? ' · ' + _ltsText(entry.recommendation.locator) : '', entry.recommendation.evidenceLevel ? ' · ' + _ltsText(entry.recommendation.evidenceLevel) : ''));
  }))))), draft && /*#__PURE__*/React.createElement("div", {
    ref: editActions,
    tabIndex: -1,
    role: "region",
    "aria-label": tr('edit_actions', 'Save or discard script edits'),
    className: "space-y-3 rounded-lg border border-indigo-300 bg-indigo-50 p-3 no-print focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
  }, invalidTiming && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-sm text-red-900"
  }, tr('timing_error', 'Step times must be positive whole minutes and add up to the version’s teaching time.'), " (", timings, " / ", version.durationMinutes, " ", tr('minutes', 'minutes'), ")"), invalidDraftText && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-sm text-red-900"
  }, tr('text_error', 'Give each step a title and complete every teaching field. Expand each teacher prompt into the words you will say (at least 60 characters).')), invalidDraftLength && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-sm text-red-900"
  }, tr('step_too_long', 'Keep each teaching field within 16,000 characters before saving.')), staleDraft && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-sm text-red-900"
  }, tr('stale_edits', 'This saved version changed while you were editing. Copy your draft if needed, then discard edits to review the current version.')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: saving || invalidTiming || invalidDraftText || invalidDraftLength || staleDraft,
    onClick: saveEdits
  }, saving ? tr('saving', 'Adding edits…') : tr('save', 'Save edits')), !confirmDiscard && /*#__PURE__*/React.createElement("button", {
    ref: discardToggle,
    type: "button",
    className: buttonClass,
    disabled: saving,
    onClick: () => draftChanged ? setConfirmDiscard(true) : discardEdits()
  }, tr('discard', 'Discard edits')), confirmDiscard && /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": tr('discard_question', 'Discard your unsaved script changes?'),
    className: "w-full space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950",
    onKeyDown: event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        keepEditing();
      }
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, tr('discard_question', 'Discard your unsaved script changes?')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    autoFocus: true,
    type: "button",
    className: buttonClass,
    disabled: saving,
    onClick: keepEditing
  }, tr('keep_editing', 'Keep editing')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: saving,
    onClick: discardEdits
  }, tr('discard_confirm', 'Discard changes')))))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 border-t border-slate-200 pt-4"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-black text-slate-900"
  }, tr('sources', 'Teaching sources and evidence')), sources.length ? /*#__PURE__*/React.createElement("ul", {
    className: "space-y-3"
  }, sources.map((source, index) => {
    const href = _ltsSafeUrl(source.url);
    return /*#__PURE__*/React.createElement("li", {
      key: source.id || index,
      className: "rounded-lg border border-slate-200 p-3 text-sm text-slate-800"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-bold"
    }, href ? /*#__PURE__*/React.createElement("a", {
      href: href,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "text-indigo-800 underline"
    }, _ltsText(source.title) || href) : _ltsText(source.title) || tr('source_unavailable', 'Source link unavailable')), /*#__PURE__*/React.createElement("p", null, [_ltsText(source.author), _ltsText(source.publishedAt), source.evidenceKind === 'general-practice' ? tr('evidence_general', 'General instructional practice') : source.evidenceKind === 'content-specific' ? tr('evidence_content', 'Content-specific guidance') : ''].filter(Boolean).join(' · ')), source.scope && /*#__PURE__*/React.createElement("p", {
      className: "mt-1"
    }, tr('scope_label', 'Scope:'), " ", _ltsText(source.scope)), source.evidenceLevel && /*#__PURE__*/React.createElement("p", null, tr('evidence_level', 'Evidence level:'), " ", _ltsText(source.evidenceLevel)), source.retrievedAt && /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600"
    }, tr('retrieved', 'Retrieved:'), " ", _ltsText(source.retrievedAt)), Array.isArray(source.recommendations) && source.recommendations.length > 0 && /*#__PURE__*/React.createElement("ul", {
      className: "mt-2 list-disc space-y-1 pl-5"
    }, source.recommendations.filter(recommendation => recommendation && typeof recommendation === 'object').map((recommendation, offset) => /*#__PURE__*/React.createElement("li", {
      key: recommendation.id || offset
    }, _ltsText(recommendation.text), recommendation.locator ? ' (' + _ltsText(recommendation.locator) + ')' : ''))));
  })) : /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('no_sources', 'No research sources are attached to this version. Review the teaching choices against your lesson and learners.'))))));
}
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LessonTeachingScriptView = LessonTeachingScriptView;
  window.AlloModules.ViewLessonTeachingScriptModule = true;
})();
