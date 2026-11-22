/**
 * AlloFlow Video Library — curated product videos.
 *
 * Streamed from the AlloFlow Cloudflare origin (the same host every lazy CDN
 * module already loads from), NOT from a third-party video platform. That keeps
 * the app's network surface to one origin and avoids the tracking cookies an
 * embedded player would set — which matters because the Privacy tab sits two
 * tabs away from the card that opens this.
 *
 * Nothing here uploads. Nothing here is stored. The <video> element streams and
 * that is the whole data path.
 *
 * Opened by a CustomEvent ('alloflow:open-video-library') dispatched from the
 * About tab's "Start here" grid, mirroring how that grid already opens the
 * command palette. The host owns the open/closed state; this module is pure view.
 */

const VIDEO_CDN_BASE = 'https://alloflow-cdn.pages.dev/video';

/**
 * Catalog entries.
 *
 * `silent: true` means the video carries no spoken audio, so there is nothing to
 * caption. We say so in the UI rather than shipping an empty captions track,
 * and we ship the on-screen text as a transcript so a screen-reader user gets
 * the same content. If narration is ever added, set `silent: false` and point
 * `captions` at a .vtt on the same origin.
 */
const VIDEO_CATALOG = [
  {
    id: 'alloflow-trailer',
    title: 'AlloFlow in under two minutes',
    blurb: 'A tour of what AlloFlow does: differentiated materials, live sessions, the STEM and SEL labs, and the local-first deployment paths.',
    durationSec: 113,
    src: VIDEO_CDN_BASE + '/alloflow-trailer-1080p.mp4',
    captions: null,
    silent: true,
    transcript: [
      'AlloBot introduces AlloFlow.',
      'The problem: differentiating one lesson for every reading level costs hours a teacher does not have.',
      'The solution: paste source material once, generate leveled text, glossaries, quizzes and scaffolds together.',
      'Feature tour: leveled texts, translation, immersive reader, read-aloud, rubric builder, oral fluency checks.',
      'Live Sessions: a teacher pushes resources to joined student devices in real time.',
      'The belief, from a school psychologist in Maine: what if every student had access to the same caliber of tools, regardless of their school’s budget?',
      'By the numbers: the STEM and SEL tool counts, supported languages, and deployment options.',
      'Open source, AGPL v3. Find the project at github.com/Apomera/AlloFlow.',
    ],
  },
];

const formatDuration = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

function VideoLibraryOverlay({ onClose, t }) {
  const noop = () => null;
  const _w = typeof window !== 'undefined' ? window : {};
  const _icons = _w.AlloIcons || {};
  const MonitorPlay = _icons.MonitorPlay || _w.MonitorPlay || noop;
  const X = _icons.X || _w.X || noop;
  const PlayCircle = _icons.PlayCircle || _w.PlayCircle || noop;
  const ExternalLink = _icons.ExternalLink || _w.ExternalLink || noop;
  const AlertTriangle = _icons.AlertTriangle || _w.AlertTriangle || noop;
  const isGlobalMuted = () => {
    if (typeof window === 'undefined') return false;
    try {
      if (window.__alloMuted === true || window._alloGlobalMute === true || window._alloGlobalMuted === true) return true;
      if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) return true;
    } catch (_) {}
    return false;
  };

  const tr = (key, fallback) => {
    if (typeof t === 'function') {
      try {
        const v = t(key);
        // ctx.t is single-arg and returns undefined for a missing key; never
        // let that reach the DOM as the string "undefined".
        if (v && v !== key && v !== 'undefined') return v;
      } catch (_) {}
    }
    return fallback;
  };

  const [activeId, setActiveId] = React.useState(VIDEO_CATALOG.length === 1 ? VIDEO_CATALOG[0].id : null);
  const [failed, setFailed] = React.useState({});
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [isSpeakingTranscript, setIsSpeakingTranscript] = React.useState(false);
  const [transcriptCopied, setTranscriptCopied] = React.useState(false);
  const rootRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const mountedRef = React.useRef(true);
  const speechTokenRef = React.useRef(0);
  const copyTimerRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  const hasSpeechBackend = typeof window !== 'undefined' && (
    (window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function')
    || (typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function')
  );

  const stopTranscriptSpeech = React.useCallback(() => {
    speechTokenRef.current += 1;
    try {
      if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.stop === 'function') {
        window.AlloSpeechPlayer.stop();
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}
    if (mountedRef.current) setIsSpeakingTranscript(false);
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    const onSpeechState = (event) => {
      const detail = (event && event.detail) || {};
      const st = detail.state;
      if (detail.isPlaying === false || st === 'idle' || st === 'stopped' || st === 'ended' || st === 'error') {
        if (mountedRef.current) setIsSpeakingTranscript(false);
      }
    };
    const onMuteChanged = () => {
      const muted = isGlobalMuted();
      const video = videoRef.current || (rootRef.current && rootRef.current.querySelector('video'));
      if (video) { try { video.muted = muted; } catch (_) {} }
      if (muted) stopTranscriptSpeech();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('allo-speech-state', onSpeechState);
      window.addEventListener('alloflow-mute-changed', onMuteChanged);
    }
    return () => {
      mountedRef.current = false;
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (typeof window !== 'undefined') {
        window.removeEventListener('allo-speech-state', onSpeechState);
        window.removeEventListener('alloflow-mute-changed', onMuteChanged);
      }
      try { videoRef.current?.pause(); } catch (_) {}
      stopTranscriptSpeech();
    };
  }, [stopTranscriptSpeech]);

  React.useEffect(() => {
    setPlaybackRate(1);
    setTranscriptCopied(false);
    stopTranscriptSpeech();
  }, [activeId, stopTranscriptSpeech]);

  React.useEffect(() => {
    const video = videoRef.current || (rootRef.current && rootRef.current.querySelector('video'));
    if (!video) return;
    try { video.playbackRate = playbackRate; } catch (_) {}
    try { if (isGlobalMuted()) video.muted = true; } catch (_) {}
  }, [activeId, playbackRate, failed]);

  const jumpVideoSeconds = (delta) => {
    const video = videoRef.current || (rootRef.current && rootRef.current.querySelector('video'));
    if (!video) return;
    try {
      const current = Number(video.currentTime) || 0;
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : Infinity;
      video.currentTime = Math.max(0, Math.min(duration, current + delta));
    } catch (_) {}
  };

  const toggleListenTranscript = (lines) => {
    if (isSpeakingTranscript) { stopTranscriptSpeech(); return; }
    if (isGlobalMuted()) return;
    const speechText = (Array.isArray(lines) ? lines : []).map((s) => String(s || '').trim()).filter(Boolean).join(' ');
    if (!speechText || typeof window === 'undefined') return;
    const token = ++speechTokenRef.current;
    try {
      if (window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') {
        window.AlloSpeechPlayer.stop?.();
        setIsSpeakingTranscript(true);
        const res = window.AlloSpeechPlayer.speak(speechText);
        if (res && typeof res.then === 'function') {
          res.catch(() => {}).finally(() => {
            if (mountedRef.current && speechTokenRef.current === token) setIsSpeakingTranscript(false);
          });
        }
      } else if (window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
        window.speechSynthesis.cancel();
        const utter = new window.SpeechSynthesisUtterance(speechText);
        utter.onend = () => { if (mountedRef.current && speechTokenRef.current === token) setIsSpeakingTranscript(false); };
        utter.onerror = () => { if (mountedRef.current && speechTokenRef.current === token) setIsSpeakingTranscript(false); };
        setIsSpeakingTranscript(true);
        window.speechSynthesis.speak(utter);
      }
    } catch (_) {
      if (mountedRef.current) setIsSpeakingTranscript(false);
    }
  };

  const copyTranscriptText = (lines) => {
    const text = (Array.isArray(lines) ? lines : []).map((s) => String(s || '').trim()).filter(Boolean).join('\n');
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        Promise.resolve(navigator.clipboard.writeText(text)).then(() => {
          if (!mountedRef.current) return;
          setTranscriptCopied(true);
          if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
          copyTimerRef.current = setTimeout(() => { if (mountedRef.current) setTranscriptCopied(false); }, 2000);
        }).catch(() => {});
      }
    } catch (_) {}
  };

  React.useEffect(() => {
    const dialog = rootRef.current;
    if (!dialog || typeof document === 'undefined') return undefined;
    const previousFocus = document.activeElement;
    const trap = { root: dialog };
    const trapStack = typeof window !== 'undefined' ? (window.__alloFocusTrapStack = window.__alloFocusTrapStack || []) : null;
    if (trapStack) trapStack.push(trap);
    const isolated = [];
    const seenSiblings = new Set();
    let cursor = dialog;
    while (cursor && cursor.parentElement) {
      const parent = cursor.parentElement;
      Array.from(parent.children).forEach((sibling) => {
        if (!sibling || sibling === cursor || seenSiblings.has(sibling) || !sibling.tagName || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(sibling.tagName) || (typeof sibling.matches === 'function' && sibling.matches('[aria-live], [role="status"], [role="alert"], [data-toast-region]'))) return;
        seenSiblings.add(sibling);
        isolated.push({
          sibling,
          hadInert: sibling.hasAttribute('inert'),
          prevInert: sibling.inert,
          ariaHidden: sibling.getAttribute('aria-hidden'),
        });
        try { sibling.inert = true; } catch (_) {}
        try { sibling.setAttribute('inert', ''); } catch (_) {}
        try { sibling.setAttribute('aria-hidden', 'true'); } catch (_) {}
      });
      if (parent === document.body) break;
      cursor = parent;
    }
    const body = document.body;
    const scrollLock = typeof window !== 'undefined' ? (window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '', overflow: '' })) : null;
    let scrollLocked = false;
    try {
      if (body && scrollLock) {
        scrollLocked = true;
        if (++scrollLock.count === 1) { scrollLock.prev = body.style.overflow; scrollLock.overflow = scrollLock.prev; body.style.overflow = 'hidden'; }
      }
    } catch (_) {}
    const getFocusable = () => Array.from(dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, video[controls], audio[controls], [tabindex]:not([tabindex="-1"])'))
      .filter((el) => {
        if (!el || el.hidden || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        let ancestor = el.parentElement;
        while (ancestor && ancestor !== dialog) {
          if (ancestor.matches && ancestor.matches('details:not([open])')) {
            const directSummary = ancestor.querySelector(':scope > summary');
            if (el !== directSummary) return false;
          }
          try {
            const aSt = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(ancestor) : null;
            if (aSt && (aSt.display === 'none' || aSt.visibility === 'hidden')) return false;
          } catch (_) {}
          ancestor = ancestor.parentElement;
        }
        try {
          const st = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(el) : null;
          if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
        } catch (_) {}
        return true;
      });
    try { (getFocusable()[0] || dialog).focus(); } catch (_) {}
    const onKey = (e) => {
      if (!dialog.isConnected || e.defaultPrevented) return;
      if (trapStack && trapStack[trapStack.length - 1] !== trap) return;
      if (e.key === 'Escape') {
        if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof onCloseRef.current === 'function') onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        e.preventDefault();
        try { dialog.focus(); } catch (_) {}
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active) || active === dialog) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      try {
        if (scrollLocked && body && scrollLock) {
          scrollLock.count = Math.max(0, scrollLock.count - 1);
          if (scrollLock.count === 0) body.style.overflow = scrollLock.prev ?? scrollLock.overflow ?? '';
        }
      } catch (_) {}
      isolated.forEach(({ sibling, hadInert, prevInert, ariaHidden }) => {
        if (!sibling || !sibling.isConnected) return;
        if (!hadInert) {
          try { sibling.inert = false; } catch (_) {}
          try { sibling.removeAttribute('inert'); } catch (_) {}
        } else {
          /* already inert when this dialog opened: leave it as it is now */
        }
        if (ariaHidden == null) { try { sibling.removeAttribute('aria-hidden'); } catch (_) {} }
        else { try { if (ariaHidden !== 'true') sibling.setAttribute('aria-hidden', ariaHidden); } catch (_) {} }
      });
      const wasTopTrap = !trapStack || trapStack[trapStack.length - 1] === trap;
      if (trapStack) {
        const idx = trapStack.lastIndexOf(trap);
        if (idx >= 0) trapStack.splice(idx, 1);
      }
      if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus !== document.documentElement && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
        try { previousFocus.focus(); } catch (_) {}
      }
    };
  }, []);

  const active = VIDEO_CATALOG.filter((v) => v.id === activeId)[0] || null;

  const renderPlayer = (video) => {
    if (failed[video.id]) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle size={16} aria-hidden="true" />
            {tr('video_library.unavailable_title', 'This video could not be loaded')}
          </p>
          <p className="mt-1 text-xs leading-relaxed">
            {tr('video_library.unavailable_body', 'It may not have finished uploading, or this device is offline. The video streams from the AlloFlow CDN and is not bundled with the app.')}
          </p>
          <a
            href="https://apomera.github.io/AlloFlow/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
          >
            {tr('video_library.open_site', 'Open the AlloFlow site')}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      );
    }
    return (
      <div>
        <video
          ref={videoRef}
          key={video.id}
          src={video.src}
          controls
          playsInline
          preload="none"
          className="w-full rounded-xl bg-black"
          style={{ maxHeight: '56vh' }}
          onError={() => setFailed((prev) => ({ ...prev, [video.id]: true }))}
        >
          {video.captions && (
            <track
              kind="captions"
              src={video.captions}
              default
              label={tr('video_library.captions_track', 'Captions')}
            />
          )}
        </video>
        <div data-video-library-controls="true" className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={tr('video_library.skip_controls_group', 'Skip playback time')}>
            <button
              type="button"
              data-video-library-rewind="true"
              onClick={() => jumpVideoSeconds(-10)}
              aria-label={tr('video_library.rewind_10s_aria', 'Rewind 10 seconds')}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              ↺ 10s
            </button>
            <button
              type="button"
              data-video-library-forward="true"
              onClick={() => jumpVideoSeconds(10)}
              aria-label={tr('video_library.forward_10s_aria', 'Skip forward 10 seconds')}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              10s ↻
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={tr('video_library.playback_speed_group', 'Playback speed')}>
            <span className="text-xs font-semibold text-slate-700">{tr('video_library.speed_label', 'Speed:')}</span>
            {[0.75, 1, 1.25, 1.5].map((rate) => {
              const selected = playbackRate === rate;
              return (
                <button
                  key={rate}
                  type="button"
                  data-video-library-speed={String(rate)}
                  aria-pressed={selected}
                  aria-label={tr('video_library.speed_aria', 'Playback speed {rate}x').replace('{rate}', String(rate))}
                  onClick={() => setPlaybackRate(rate)}
                  className={'min-h-11 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-indigo-600 ' + (selected ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100')}
                >
                  {rate}×
                </button>
              );
            })}
          </div>
        </div>
        {video.silent && (
          <p className="mt-2 text-xs text-slate-600">
            {tr('video_library.silent_note', 'This video has no narration or soundtrack, so there is nothing to caption. The full on-screen text is below.')}
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.72)' }}
      role="presentation"
    >
      <div
        ref={rootRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-library-title"
        className="allo-docsuite flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600 focus-visible:outline-offset-2"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <MonitorPlay size={20} className="shrink-0 text-violet-700" aria-hidden="true" />
            <h2 id="video-library-title" className="truncate text-base font-bold text-slate-800">
              {tr('video_library.title', 'Video library')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg px-2 py-1 text-2xl leading-none text-slate-600 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label={tr('video_library.close', 'Close video library')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto overscroll-contain p-5">
          <p className="mb-4 text-xs leading-relaxed text-slate-600">
            {tr('video_library.intro', 'These stream from the AlloFlow CDN, not from a video platform. No account, no cookies, nothing recorded about what you watch.')}
          </p>

          {VIDEO_CATALOG.length > 1 && (
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {VIDEO_CATALOG.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setActiveId(video.id)}
                  aria-pressed={activeId === video.id}
                  className={
                    'min-h-11 rounded-lg border p-3 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ' +
                    (activeId === video.id
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-300')
                  }
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <PlayCircle size={15} className="shrink-0 text-indigo-600" aria-hidden="true" />
                    {video.title}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-600">
                    {formatDuration(video.durationSec)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {active && (
            <div>
              {VIDEO_CATALOG.length > 1 && (
                <h3 className="mb-1 text-sm font-bold text-slate-800">{active.title}</h3>
              )}
              <p className="mb-3 text-xs text-slate-600">
                {formatDuration(active.durationSec)}
                {active.blurb ? ' · ' + active.blurb : ''}
              </p>
              {renderPlayer(active)}
              {active.transcript && active.transcript.length > 0 && (
                <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <summary className="min-h-11 cursor-pointer select-none py-2 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600">
                    {tr('video_library.transcript', 'Text version')}
                  </summary>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {hasSpeechBackend && (
                      <button
                        type="button"
                        data-video-library-listen="true"
                        aria-pressed={isSpeakingTranscript}
                        onClick={() => toggleListenTranscript(active.transcript)}
                        className={'min-h-11 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-indigo-600 ' + (isSpeakingTranscript ? 'border-indigo-700 bg-indigo-700 text-white hover:bg-indigo-800' : 'border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100')}
                      >
                        {isSpeakingTranscript ? tr('video_library.stop_transcript', '⏹ Stop') : tr('video_library.listen_transcript', '🔊 Listen to text version')}
                      </button>
                    )}
                    <button
                      type="button"
                      data-video-library-copy="true"
                      onClick={() => copyTranscriptText(active.transcript)}
                      className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-600"
                    >
                      {transcriptCopied ? tr('video_library.copied_transcript', '✓ Copied') : tr('video_library.copy_transcript', '📋 Copy text')}
                    </button>
                  </div>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-600">
                    {active.transcript.map((line, i) => (
                      <li key={'tr-' + i}>{line}</li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
