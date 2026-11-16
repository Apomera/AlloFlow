/**
 * AlloFlow Video Reference Player
 *
 * Presentation and local-file playback for Video Studio `video-ref` history
 * cards. Pack JSON carries only metadata; video bytes are never uploaded or
 * stored here. The host owns the selected card and toast/translation services.
 */
const VIDEO_REF_MAX_DESCRIPTION_BYTES = 262144;
const VIDEO_REF_MAX_DESCRIPTION_COUNT = 24;
const VIDEO_REF_MAX_DESCRIPTION_LENGTH = 280;
const VIDEO_REF_MAX_DURATION_SEC = 86400;

function videoRefFormatClock(seconds, includeHours) {
  const totalMs = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (includeHours || hours) {
    return [hours, minutes, secs]
      .map(value => String(value).padStart(2, '0'))
      .join(':') + '.' + String(totalMs % 1000).padStart(3, '0');
  }
  return minutes + ':' + String(secs).padStart(2, '0');
}

function videoRefSanitizeVisualDescriptions(raw, durationSec) {
  const list = Array.isArray(raw)
    ? raw
    : raw && Array.isArray(raw.descriptions)
      ? raw.descriptions
      : raw && Array.isArray(raw.segments)
        ? raw.segments
        : null;
  if (!list) return null;

  const suppliedDuration = Number(durationSec);
  const durationLimit = Number.isFinite(suppliedDuration) && suppliedDuration > 0
    ? Math.min(suppliedDuration, VIDEO_REF_MAX_DURATION_SEC)
    : VIDEO_REF_MAX_DURATION_SEC;
  const descriptions = [];
  for (let index = 0; index < list.length && descriptions.length < VIDEO_REF_MAX_DESCRIPTION_COUNT; index += 1) {
    const entry = list[index];
    if (!entry || typeof entry !== 'object' || entry.checked !== true) continue;
    const description = String(entry.description || '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, VIDEO_REF_MAX_DESCRIPTION_LENGTH);
    const rawStart = entry.start != null ? entry.start : entry.t;
    if (rawStart == null || String(rawStart).trim() === '') continue;
    let start = Number(rawStart);
    let end = Number(entry.end);
    if (!description || !Number.isFinite(start)) continue;
    start = Math.max(0, Math.min(durationLimit, start));
    end = Number.isFinite(end) ? end : start + 4;
    end = Math.min(durationLimit, Math.max(start + 0.8, end));
    if (end <= start) continue;
    descriptions.push({ start, end, description });
  }
  descriptions.sort((left, right) => left.start - right.start || left.end - right.end);
  return descriptions;
}

function videoRefParseVisualDescriptions(entry, durationSec) {
  if (!entry || !entry.data || typeof entry.data.byteLength !== 'number'
      || entry.data.byteLength > VIDEO_REF_MAX_DESCRIPTION_BYTES) {
    return { descriptions: [], invalid: true };
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(entry.data));
    const descriptions = videoRefSanitizeVisualDescriptions(parsed, durationSec);
    return descriptions ? { descriptions, invalid: false } : { descriptions: [], invalid: true };
  } catch (_) {
    return { descriptions: [], invalid: true };
  }
}

function videoRefBuildDescriptionsVtt(descriptions) {
  const cues = (Array.isArray(descriptions) ? descriptions : []).map((entry, index) => {
    const safeText = String(entry.description || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return [
      'description-' + (index + 1),
      videoRefFormatClock(entry.start, true) + ' --> ' + videoRefFormatClock(entry.end, true),
      safeText
    ].join('\n');
  });
  return cues.length ? 'WEBVTT\n\n' + cues.join('\n\n') + '\n' : '';
}

function VideoRefPlayerOverlay({ item, onClose, addToast, t }) {
  const MonitorPlay = window.MonitorPlay || (() => null);
  const ExternalLink = window.ExternalLink || (() => null);
  const ref = (item && item.data) || {};
  const [videoUrl, setVideoUrl] = React.useState(null);
  const [vttUrl, setVttUrl] = React.useState(null);
  const [descriptionVttUrl, setDescriptionVttUrl] = React.useState(null);
  const [visualDescriptions, setVisualDescriptions] = React.useState([]);
  const [activeDescriptionText, setActiveDescriptionText] = React.useState('');
  const [verify, setVerify] = React.useState(null); // null | 'match' | 'mismatch' | 'unknown'
  const [busy, setBusy] = React.useState(false);
  const urlsRef = React.useRef([]);
  const rootRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  const revokeObjectUrls = (urls) => {
    (Array.isArray(urls) ? urls : []).forEach(url => {
      try { URL.revokeObjectURL(url); } catch (_) {}
    });
  };

  const replaceObjectUrls = (nextUrls) => {
    const previous = urlsRef.current.splice(0);
    urlsRef.current.push(...nextUrls);
    revokeObjectUrls(previous);
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
        if (!sibling || sibling === cursor || seenSiblings.has(sibling) || !sibling.tagName || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(sibling.tagName)) return;
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
    const scrollLock = typeof window !== 'undefined' ? (window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '' })) : null;
    let scrollLocked = false;
    try {
      if (body && scrollLock) {
        scrollLocked = true;
        if (++scrollLock.count === 1) { scrollLock.prev = body.style.overflow; body.style.overflow = 'hidden'; }
      }
    } catch (_) {}
    const getFocusable = () => Array.from(dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'))
      .filter((el) => {
        if (!el || el.hidden || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        let ancestor = el.parentElement;
        while (ancestor && ancestor !== dialog) {
          if (ancestor.matches && ancestor.matches('details:not([open])')) {
            const directSummary = ancestor.querySelector(':scope > summary');
            if (el !== directSummary) return false;
          }
          ancestor = ancestor.parentElement;
        }
        try {
          const st = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(el) : null;
          if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
        } catch (_) {}
        return true;
      });
    try { (getFocusable()[0] || dialog).focus(); } catch (_) {}
    const onKey = (event) => {
      if (!dialog.isConnected || event.defaultPrevented) return;
      const topTrap = trapStack && trapStack[trapStack.length - 1];
      if (topTrap && topTrap !== trap && !(topTrap.root && typeof topTrap.root.contains === 'function' && topTrap.root.contains(dialog))) return;
      if (event.key === 'Escape') {
        if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof onCloseRef.current === 'function') onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        try { dialog.focus(); } catch (_) {}
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active) || active === dialog) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      try {
        if (scrollLocked && body && scrollLock) {
          scrollLock.count = Math.max(0, scrollLock.count - 1);
          if (scrollLock.count === 0) body.style.overflow = scrollLock.prev;
        }
      } catch (_) {}
      isolated.forEach(({ sibling, hadInert, prevInert, ariaHidden }) => {
        if (!sibling || !sibling.isConnected) return;
        if (!hadInert) {
          try { sibling.inert = false; } catch (_) {}
          try { sibling.removeAttribute('inert'); } catch (_) {}
        } else {
          try { sibling.inert = Boolean(prevInert); } catch (_) {}
        }
        if (ariaHidden == null) { try { sibling.removeAttribute('aria-hidden'); } catch (_) {} }
        else { try { sibling.setAttribute('aria-hidden', ariaHidden); } catch (_) {} }
      });
      const wasTopTrap = !trapStack || trapStack[trapStack.length - 1] === trap;
      if (trapStack) {
        const idx = trapStack.lastIndexOf(trap);
        if (idx >= 0) trapStack.splice(idx, 1);
      }
      revokeObjectUrls(urlsRef.current.splice(0));
      if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus !== document.documentElement && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
        try { previousFocus.focus(); } catch (_) {}
      }
    };
  }, []);

  React.useEffect(() => {
    const input = rootRef.current && rootRef.current.querySelector('input[type=file]');
    const picker = input && input.parentElement;
    if (!input || !picker) return undefined;
    picker.tabIndex = 0;
    picker.setAttribute('role', 'button');
    const activate = event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      try { input.click(); } catch (_) {}
    };
    picker.addEventListener('keydown', activate);
    return () => picker.removeEventListener('keydown', activate);
  }, []);

  const loadStudioHelpers = () => new Promise((resolve, reject) => {
    try { if (window.__alloLazyVideoStudio) window.__alloLazyVideoStudio(); } catch (_) {}
    const loadedApi = window.AlloModules && window.AlloModules.VideoStudio;
    if (loadedApi && typeof loadedApi.vsReadZip === 'function') {
      resolve(loadedApi);
      return;
    }
    let waited = 0;
    const timer = setInterval(() => {
      const moduleApi = window.AlloModules && window.AlloModules.VideoStudio;
      if (moduleApi && typeof moduleApi.vsReadZip === 'function') {
        clearInterval(timer);
        resolve(moduleApi);
      } else if ((waited += 200) > 12000) {
        clearInterval(timer);
        reject(new Error('Video Studio helpers did not load'));
      }
    }, 200);
  });

  const handleFile = async (file) => {
    if (!file || busy) return;
    setBusy(true);
    let createdUrls = [];
    try {
      let bytes = new Uint8Array(await file.arrayBuffer());
      let vttText = null;
      let descriptions = [];
      let descriptionsInvalid = false;
      let videoName = file.name;
      if (/\.allopack$/i.test(file.name)) {
        const moduleApi = await loadStudioHelpers();
        const entries = moduleApi.vsReadZip(bytes) || [];
        const video = entries
          .filter(entry => /\.(webm|mp4|mov|m4v|mkv)$/i.test(entry.name))
          .sort((a, b) => b.data.length - a.data.length)[0];
        if (!video) throw new Error('no video file inside this .allopack');
        const vttEntries = entries.filter(entry => /\.vtt$/i.test(String(entry.name || '')));
        const vtt = vttEntries.find(entry => /(?:caption|subtitle)/i.test(String(entry.name || '')))
          || vttEntries.find(entry => !/(?:description|visual)/i.test(String(entry.name || '')));
        if (vtt) vttText = new TextDecoder().decode(vtt.data);
        const descriptionEntry = entries.find(entry => /(?:^|[\\/])visual_descriptions\.json$/i.test(String(entry.name || '')));
        if (descriptionEntry) {
          const parsedDescriptions = videoRefParseVisualDescriptions(descriptionEntry, ref.durationSec);
          descriptions = parsedDescriptions.descriptions;
          descriptionsInvalid = parsedDescriptions.invalid;
        }
        bytes = video.data;
        videoName = video.name;
      }

      let verdict = 'unknown';
      if (ref.sha256 && window.crypto && window.crypto.subtle) {
        const digest = await window.crypto.subtle.digest('SHA-256', bytes);
        const hex = Array.from(new Uint8Array(digest))
          .map(byte => byte.toString(16).padStart(2, '0'))
          .join('');
        verdict = hex === ref.sha256 ? 'match' : 'mismatch';
      }

      const mime = /\.(mp4|m4v)$/i.test(videoName)
        ? 'video/mp4'
        : /\.mov$/i.test(videoName)
          ? 'video/quicktime'
          : 'video/webm';
      const nextVideoUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
      createdUrls.push(nextVideoUrl);
      const nextVttUrl = vttText
        ? URL.createObjectURL(new Blob([vttText], { type: 'text/vtt' }))
        : null;
      if (nextVttUrl) createdUrls.push(nextVttUrl);
      const descriptionsVtt = videoRefBuildDescriptionsVtt(descriptions);
      const nextDescriptionVttUrl = descriptionsVtt
        ? URL.createObjectURL(new Blob([descriptionsVtt], { type: 'text/vtt' }))
        : null;
      if (nextDescriptionVttUrl) createdUrls.push(nextDescriptionVttUrl);

      replaceObjectUrls(createdUrls);
      createdUrls = [];
      setVideoUrl(nextVideoUrl);
      setVttUrl(nextVttUrl);
      setDescriptionVttUrl(nextDescriptionVttUrl);
      setVisualDescriptions(descriptions);
      setActiveDescriptionText('');
      setVerify(verdict);
      if (descriptionsInvalid) {
        addToast(
          t('video_ref.descriptions_ignored')
            || 'Video opened, but its visual descriptions were ignored because that file was not valid.',
          'warning'
        );
      }
    } catch (error) {
      revokeObjectUrls(createdUrls);
      addToast(
        (t('video_ref.attach_failed') || 'Could not open that file: ')
          + String((error && error.message) || error).slice(0, 120),
        'error'
      );
    }
    setBusy(false);
  };

  const syncActiveDescription = (event) => {
    const currentTime = Number(event && event.currentTarget && event.currentTarget.currentTime);
    const nextText = Number.isFinite(currentTime)
      ? visualDescriptions
        .filter(entry => currentTime >= entry.start && currentTime < entry.end)
        .map(entry => entry.description)
        .join(' ')
      : '';
    setActiveDescriptionText(previous => previous === nextText ? previous : nextText);
  };

  const seekToDescription = (entry) => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.currentTime = entry.start;
      setActiveDescriptionText(entry.description);
      video.focus();
    } catch (_) {}
  };

  React.useEffect(() => {
    const video = rootRef.current && rootRef.current.querySelector('video');
    if (!video) return undefined;
    videoRef.current = video;
    video.tabIndex = 0;
    const sync = () => syncActiveDescription({ currentTarget: video });
    ['timeupdate', 'seeked', 'loadedmetadata'].forEach(name => video.addEventListener(name, sync));
    const clear = () => setActiveDescriptionText('');
    video.addEventListener('ended', clear);
    video.setAttribute('aria-label', String(ref.title || item.title || t('video_ref.player_title') || 'Video reference'));
    if (visualDescriptions.length) video.setAttribute('aria-describedby', 'video-ref-description-summary');
    else video.removeAttribute('aria-describedby');

    let track = null;
    if (descriptionVttUrl) {
      track = document.createElement('track');
      track.kind = 'descriptions';
      track.src = descriptionVttUrl;
      track.label = t('video_ref.descriptions_track') || 'Visual descriptions';
      video.appendChild(track);
    }
    return () => {
      ['timeupdate', 'seeked', 'loadedmetadata'].forEach(name => video.removeEventListener(name, sync));
      video.removeEventListener('ended', clear);
      if (track && track.parentNode === video) video.removeChild(track);
      if (videoRef.current === video) videoRef.current = null;
    };
  }, [videoUrl, descriptionVttUrl, visualDescriptions]);

  const badges = [
    ref.hasCaptions && (t('video_ref.badge_captions') || 'captions'),
    ref.hasChapters && (t('video_ref.badge_chapters') || 'chapters'),
    ref.hasVisualDescriptions && (t('video_ref.badge_descriptions') || 'visual descriptions'),
    ref.hasLocalizations && (t('video_ref.badge_localizations') || 'localizations')
  ].filter(Boolean).join(' · ');
  const durationLabel = `${Math.floor((ref.durationSec || 0) / 60)}:${String((ref.durationSec || 0) % 60).padStart(2, '0')}`;
  const hostedUrl = typeof ref.hostedUrl === 'string' && /^https?:\/\//i.test(ref.hostedUrl.trim())
    ? ref.hostedUrl.trim()
    : '';

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.72)' }} role="dialog" aria-modal="true" aria-label={t('video_ref.player_title') || 'Video reference'}>
      <div ref={rootRef} tabIndex={-1} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center gap-2 min-w-0">
            <MonitorPlay size={20} className="text-violet-700 shrink-0" />
            <h2 className="font-bold text-slate-800 text-base truncate">{String(ref.title || item.title || 'Teacher video')}</h2>
          </div>
          <button type="button" onClick={onClose} data-alloflow-close-on-escape="true" className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-700 text-2xl leading-none px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" aria-label={t('video_ref.close') || 'Close video card'}>×</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-xs text-slate-600 mb-3">
            {durationLabel}{ref.sizeBytes ? ` · ${(ref.sizeBytes / 1048576).toFixed(1)} MB` : ''}{badges ? ` · ${badges}` : ''}{ref.fileName ? ` · ${ref.fileName}` : ''}
          </p>
          {videoUrl ? (
            <div className="mb-3">
              <video src={videoUrl} controls playsInline className="w-full rounded-xl bg-black" style={{ maxHeight: '52vh' }} crossOrigin="anonymous">
                {vttUrl && <track kind="captions" src={vttUrl} default label={t('video_ref.captions_track') || 'Captions'} />}
              </video>
              {visualDescriptions.length > 0 && (
                <section className='mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3' aria-labelledby='video-ref-visual-descriptions-title'>
                  <h3 id='video-ref-visual-descriptions-title' className='text-sm font-bold text-violet-950'>
                    {t('video_ref.descriptions_title') || 'Reviewed visual descriptions'}
                  </h3>
                  <p id='video-ref-description-summary' className='text-xs text-violet-800 mt-1'>
                    {t('video_ref.descriptions_summary')
                      || 'Descriptions are separate from captions. They appear at their reviewed timestamps; choose a time to move the video there.'}
                  </p>
                  <div
                    role='status'
                    aria-live='polite'
                    aria-atomic='true'
                    className={activeDescriptionText ? 'mt-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-800' : 'sr-only'}
                  >
                    {activeDescriptionText && (
                      <>
                        <span className='sr-only'>{t('video_ref.current_description') || 'Current visual description: '}</span>
                        {activeDescriptionText}
                      </>
                    )}
                  </div>
                  <ol className='mt-2 space-y-1'>
                    {visualDescriptions.map((entry, index) => (
                      <li key={entry.start + '-' + entry.end + '-' + index}>
                        <button
                          type='button'
                          onClick={() => seekToDescription(entry)}
                          className='min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600'
                        >
                          <time className='font-mono font-semibold text-violet-800' dateTime={'PT' + entry.start + 'S'}>
                            {videoRefFormatClock(entry.start, false)}–{videoRefFormatClock(entry.end, false)}
                          </time>
                          <span className='ml-2'>{entry.description}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {verify === 'match' && <p className="text-xs text-emerald-700 mt-2">✓ {t('video_ref.verified') || 'File verified — matches the checksum saved with this card.'}</p>}
              {verify === 'mismatch' && <p className="text-xs text-amber-700 mt-2">⚠ {t('video_ref.mismatch') || 'This file does not match the saved checksum. It may be a different export of the same lesson — check before sharing.'}</p>}
            </div>
          ) : (
            ref.thumb && <img src={ref.thumb} alt={t('video_ref.thumb_alt') || 'Video thumbnail'} className="w-full max-h-64 object-contain rounded-xl bg-slate-900 mb-3" />
          )}
          {hostedUrl && (
            <a href={hostedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-lg bg-violet-700 text-white text-sm font-semibold hover:bg-violet-600 mb-3">
              ▶ {t('video_ref.watch_hosted') || 'Watch hosted video'} <ExternalLink size={14} />
            </a>
          )}
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center text-sm text-slate-600"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFile(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]);
            }}
          >
            <p className="mb-2">{busy
              ? (t('video_ref.attach_busy') || 'Opening the file…')
              : (t('video_ref.attach_hint') || 'Have the downloaded file? Drop the .webm/.mp4 or .allopack here to play it on this device — nothing is uploaded.')}</p>
            <label className="inline-flex items-center min-h-11 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer">
              {t('video_ref.attach_btn') || 'Choose file…'}
              <input type="file" accept="video/*,.webm,.mp4,.mov,.m4v,.mkv,.allopack" hidden onChange={(event) => {
                handleFile(event.target.files && event.target.files[0]);
                event.target.value = '';
              }} />
            </label>
          </div>
          {!hostedUrl && !videoUrl && (
            <p className="text-xs text-slate-600 mt-3">{t('video_ref.no_hosted_hint') || 'Tip: in Video Studio’s gallery you can paste a hosted link (YouTube/Drive/LMS) so colleagues can watch without the file.'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
