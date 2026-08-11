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
  const MonitorPlay = window.MonitorPlay || noop;
  const X = window.X || noop;
  const PlayCircle = window.PlayCircle || noop;
  const ExternalLink = window.ExternalLink || noop;
  const AlertTriangle = window.AlertTriangle || noop;

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
  const rootRef = React.useRef(null);

  React.useEffect(() => {
    try { if (rootRef.current) rootRef.current.focus(); } catch (_) {}
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
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
        {video.silent && (
          <p className="mt-2 text-xs text-slate-500">
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
      role="dialog"
      aria-modal="true"
      aria-label={tr('video_library.title', 'Video library')}
    >
      <div
        ref={rootRef}
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <MonitorPlay size={20} className="shrink-0 text-violet-700" aria-hidden="true" />
            <h2 className="truncate text-base font-bold text-slate-800">
              {tr('video_library.title', 'Video library')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-2 py-1 text-2xl leading-none text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label={tr('video_library.close', 'Close video library')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto overscroll-contain p-5">
          <p className="mb-4 text-xs leading-relaxed text-slate-500">
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
                  <span className="mt-1 block text-[11px] text-slate-500">
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
              <p className="mb-3 text-xs text-slate-500">
                {formatDuration(active.durationSec)}
                {active.blurb ? ' · ' + active.blurb : ''}
              </p>
              {renderPlayer(active)}
              {active.transcript && active.transcript.length > 0 && (
                <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <summary className="min-h-11 cursor-pointer select-none py-2 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600">
                    {tr('video_library.transcript', 'Text version')}
                  </summary>
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
