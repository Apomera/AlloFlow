// annotation_suite_source.jsx — extracted from AlloFlowANTI.txt as the
// foundation of the in-app annotation suite.
//
// Phase 2 (this commit): scaffold only. Houses the existing 4-emoji sticker
// overlay (StickerNode, Overlay, Toolbar, createStickerFromClick,
// buildStickerTitle) so the monolith call sites can delegate to the module.
// Behavior is identical to the inline code it replaces.
//
// Phase 3 (next): extend the annotation data shape so `type` can be
// 'highlight' or 'note' alongside the existing sticker types, and add the
// corresponding toolbar tools + overlay renderers here. The save/load and
// author-attribution plumbing fixed in Phase 1 already covers the new
// types — they ride the same {id, type, author, authorName, createdAt}
// envelope.
//
// Phase 4 (later): port the same data shape to the exported HTML via the
// doc_pipeline so annotations made in-app round-trip to the standalone
// HTML handout.

const STICKER_ICONS = { star: '⭐', check: '✅', idea: '💡', love: '❤️' };
const STICKER_TYPES = ['star', 'check', 'idea', 'love'];

// Annotation kinds. 'sticker' is the legacy 4-emoji overlay; 'note' is a
// click-to-place sticky-note bubble with editable text content;
// 'highlight' wraps a text-selection bounding box; 'voice' is a recorded
// audio note stored as base64 (local-only, never network).
const ANNOTATION_KINDS = ['sticker', 'note', 'highlight', 'voice'];

// Voice-note recording cap. Mirrors a reasonable audio-clip length for
// teacher feedback or student reflection. Enforced at recording-start
// time (auto-stop fires at this duration).
const VOICE_MAX_SECONDS = 60;

// Refuse to attach voice clips above this size (the base64 string length,
// not the raw audio bytes). Project JSON gets unwieldy past this and
// localStorage exports start hitting browser caps.
const VOICE_MAX_BYTES = 500 * 1024;

// One-shot CSS injection (Tier 2C). Keyframes were previously scoped
// inside the Sidebar's <style> tag — meaning the pulse animation only
// existed in the DOM when the sidebar was open. Moving them to a single
// <style id="..."> in <head> at module load makes them available to
// every component (Sidebar focus pulse, Undo button flash, future
// uses). Idempotent — re-running the IIFE skips if already present.
(function injectAnnotationSuiteStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('alloflow-anno-suite-styles')) return;
  const s = document.createElement('style');
  s.id = 'alloflow-anno-suite-styles';
  s.textContent = '@keyframes alloflow-anno-pulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }\n' +
    '@keyframes alloflow-undo-flash { 0% { background-color: rgba(99,102,241,0.55); transform: scale(0.94); } 60% { background-color: rgba(99,102,241,0.25); } 100% { background-color: transparent; transform: scale(1); } }\n' +
    '.alloflow-undo-flash { animation: alloflow-undo-flash 0.45s ease-out; }';
  document.head.appendChild(s);
})();

// Sticky-note color palette. Light pastel fills with darker text for AA
// contrast on both light + dark export themes. Chosen to match the export
// HTML theme switcher's expected colors (yellow first = most common).
const NOTE_COLORS = {
  yellow: { fill: '#fef9c3', border: '#facc15', text: '#713f12' },
  green:  { fill: '#dcfce7', border: '#4ade80', text: '#14532d' },
  blue:   { fill: '#dbeafe', border: '#60a5fa', text: '#1e3a8a' },
  pink:   { fill: '#fce7f3', border: '#f472b6', text: '#831843' },
};
const NOTE_COLOR_KEYS = ['yellow', 'green', 'blue', 'pink'];

// Note templates: one-click feedback stamps. Splits by role so teachers
// get grading-oriented phrases and students get reflection-oriented ones.
// Stays editable after placement — these are starting points, not locks.
const TEACHER_NOTE_TEMPLATES = [
  { label: 'Great work!',       content: '⭐ Great work!' },
  { label: 'Strong evidence',   content: '✅ Strong use of evidence here.' },
  { label: 'Clear writing',     content: '✅ Clear, well-organized writing.' },
  { label: 'Add detail',        content: '✏️ Can you add more specific detail or an example?' },
  { label: 'Cite your source',  content: '📚 Where did this come from? Add a citation.' },
  { label: 'Try again',         content: '🔁 Take another look at this — something is off.' },
  { label: 'Show your work',    content: '🧮 Show the steps that got you to this answer.' },
  { label: 'Reflect',           content: '🤔 How would you explain this in your own words?' },
  { label: 'Talk to me',        content: '💬 Let’s discuss this together at our next check-in.' },
];
const STUDENT_NOTE_TEMPLATES = [
  { label: 'Question',          content: '❓ I have a question about this.' },
  { label: 'Important',         content: '⭐ This part feels important.' },
  { label: 'Unclear',           content: '🤔 I’m not sure I understand this.' },
  { label: 'Surprised',         content: '😯 This surprised me — I didn’t expect this.' },
  { label: 'Reminds me of',     content: '💡 This reminds me of…' },
  { label: 'Need help',         content: '🙋 Can you help me with this part?' },
];

// Highlight color palette. Semi-transparent fills so the underlying text
// stays readable through the overlay. Same 4-color scheme as notes so the
// two tools feel visually paired.
const HIGHLIGHT_COLORS = {
  yellow: { fill: 'rgba(250, 204, 21, 0.40)', border: 'rgba(202, 138, 4, 0.55)' },
  green:  { fill: 'rgba(74, 222, 128, 0.38)', border: 'rgba(22, 163, 74, 0.55)' },
  blue:   { fill: 'rgba(96, 165, 250, 0.36)', border: 'rgba(37, 99, 235, 0.55)' },
  pink:   { fill: 'rgba(244, 114, 182, 0.36)', border: 'rgba(219, 39, 119, 0.55)' },
};
const HIGHLIGHT_COLOR_KEYS = ['yellow', 'green', 'blue', 'pink'];

// Legacy shape migrator: old saved annotations don't have a `kind` field
// (they're all stickers). Stamp it here so the rest of the module can
// switch on `kind` without back-compat checks scattered everywhere.
// Idempotent — running it twice produces the same result.
function migrateLegacyShape(annotations) {
  if (!Array.isArray(annotations)) return [];
  return annotations.map(function (a) {
    if (!a) return a;
    if (a.kind) return a; // already migrated
    // Pre-Phase-3 saves only had stickers; type was the icon (star/check/...).
    // If type is a STICKER_TYPES member, mark as sticker. Otherwise leave
    // untouched (defensive — unknown future kinds shouldn't be molested).
    if (STICKER_TYPES.indexOf(a.type) !== -1) {
      return Object.assign({}, a, { kind: 'sticker' });
    }
    return a;
  });
}

// Hover tooltip text: surfaces author + timestamp so a student loading a
// saved project can tell at a glance which marks came from their teacher
// and which were their own.
function buildStickerTitle(s) {
  const parts = [];
  if (s && s.author === 'teacher') parts.push('Teacher feedback');
  else if (s && s.author === 'student') parts.push(s.authorName || 'Student');
  if (s && s.createdAt) {
    try {
      const d = new Date(s.createdAt);
      if (!isNaN(d.getTime())) parts.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    } catch (_) { /* invalid date — skip */ }
  }
  return parts.join(' • ');
}

// Reusable drag handler. Returns an onPointerDown handler the component
// attaches when draggable. During the drag, mutates the rendered element's
// inline style directly — NO React state updates. On pointerup, fires
// onMove(id, x, y, true) exactly once with the clamped final position so
// the host can commit via setState. This deliberately avoids re-renders +
// undo-stack pollution during drag (one drag = one undo step).
//
// wasDraggedRef (optional): the component's hoisted ref. Set to true if
// the pointer moved >2px during drag so the component's onClick can
// suppress accidental click-through (e.g., not expanding the note bubble
// just because the user released the drag over it).
function makeDragHandler(s, hostFinder, onMove, wasDraggedRef) {
  return function (e) {
    if (!onMove) return;
    if (e.button !== undefined && e.button !== 0) return; // primary button only
    const host = hostFinder ? hostFinder(e.currentTarget) : null;
    if (!host) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    // Preserve whatever offset the rendered element uses relative to the
    // logical (s.x, s.y). Sticker = -15, note/voice = -14. Computing from
    // current style preserves that automatically.
    const startTop = parseFloat(el.style.top) || (s.y);
    const startLeft = parseFloat(el.style.left) || (s.x);
    const offsetTop = startTop - s.y;
    const offsetLeft = startLeft - s.x;
    const startCX = e.clientX;
    const startCY = e.clientY;
    if (wasDraggedRef) wasDraggedRef.current = false;
    let didMove = false;
    const moveHandler = function (mv) {
      const dx = mv.clientX - startCX;
      const dy = mv.clientY - startCY;
      if (!didMove && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        didMove = true;
        if (wasDraggedRef) wasDraggedRef.current = true;
      }
      // Direct DOM mutation only — no React churn.
      el.style.left = (s.x + dx + offsetLeft) + 'px';
      el.style.top = (s.y + dy + offsetTop) + 'px';
    };
    const upHandler = function (mv) {
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);
      if (!didMove) {
        // Click-without-drag — restore exact original style (in case a
        // jitter pixel was applied) and let the component's onClick fire.
        el.style.left = startLeft + 'px';
        el.style.top = startTop + 'px';
        return;
      }
      const dx = mv.clientX - startCX;
      const dy = mv.clientY - startCY;
      // Host-bounds clamp: prevent annotations from being dragged off the
      // bottom-right. 14 matches the half-bubble offset used by the
      // note/voice render (sticker is 15 — close enough that the clamp
      // doesn't visually misbehave).
      const sw = host.scrollWidth || host.clientWidth || 999999;
      const sh = host.scrollHeight || host.clientHeight || 999999;
      const finalX = Math.max(0, Math.min(sw - 14, s.x + dx));
      const finalY = Math.max(0, Math.min(sh - 14, s.y + dy));
      // Single commit — host's onMove triggers exactly one setStickers,
      // which produces exactly one undo snapshot.
      onMove(s.id, finalX, finalY, true);
    };
    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
  };
}

// Find the absolute-positioning host of an annotation element. Walks up
// looking for `data-allo-anno-host` (set by the caller) or falls back to
// the nearest positioned ancestor. Used by drag math to convert client
// coords → host-relative coords.
function findAnnoHost(el) {
  let cur = el;
  while (cur && cur !== document.body) {
    if (cur.getAttribute && cur.getAttribute('data-allo-anno-host') === 'true') return cur;
    cur = cur.parentNode;
  }
  return null;
}

// Single sticker overlay element. Pure presentation. Pointer-events stay
// off by default so the sticker never blocks clicks on the content
// underneath — but when `draggable` is true (annotation mode is off and
// caller wired an onMove), they flip to auto so the user can grab one.
// Teacher stickers get a subtle indigo ring so they're scannable at a
// glance vs. student-placed stickers.
function StickerNode({ s, draggable, onMove }) {
  if (!s) return null;
  const title = buildStickerTitle(s);
  const icon = STICKER_ICONS[s.type] || '';
  const ringClass = s.author === 'teacher'
    ? ' ring-2 ring-indigo-400/70 rounded-full bg-white/80 p-0.5'
    : '';
  const isDraggable = !!(draggable && onMove);
  const pointerClass = isDraggable ? '' : ' pointer-events-none';
  const dragClass = isDraggable ? ' cursor-grab active:cursor-grabbing' : '';
  return (
    <div
      className={'absolute text-3xl drop-shadow-md animate-[ping_0.4s_ease-out_reverse_forwards] select-none z-50 hover:scale-110 transition-transform' + pointerClass + dragClass + ringClass}
      style={{ top: s.y - 15, left: s.x - 15, touchAction: isDraggable ? 'none' : undefined }}
      title={title || icon}
      aria-label={title ? (icon + ' — ' + title) : icon}
      onPointerDown={isDraggable ? makeDragHandler(s, findAnnoHost, onMove) : undefined}
    >
      {icon}
    </div>
  );
}

// Sticky-note bubble. Click → expand for editing; blur → collapse.
// Has pointer-events:auto so the student can interact with it (unlike
// stickers which are pure decoration). Drag-from-corner reposition is
// deferred to a future polish pass.
function NoteBubble({ a, onChange, onDelete, draggable, onMove }) {
  if (!a) return null;
  const palette = NOTE_COLORS[a.color] || NOTE_COLORS.yellow;
  const [expanded, setExpanded] = React.useState(!a.content);
  const [draft, setDraft] = React.useState(a.content || '');
  const taRef = React.useRef(null);
  // Drag-tracking ref hoisted to the top of the component so it's not
  // called conditionally (Rules of Hooks). Set by the drag handler when
  // movement >2px; checked by the click handler in the collapsed branch
  // to suppress the click→expand after a drag.
  const wasDraggedRef = React.useRef(false);
  React.useEffect(function () {
    if (expanded && taRef.current) {
      try { taRef.current.focus(); } catch (_) {}
    }
  }, [expanded]);
  const title = buildStickerTitle(a) || 'Note';
  const commit = function () {
    setExpanded(false);
    if (draft !== a.content && typeof onChange === 'function') {
      onChange(a.id, { content: draft });
    }
  };
  // Compact collapsed view: 28×28 colored square with 📝 icon and a tooltip
  // showing the note's text + author/date. Click to expand, drag to move.
  if (!expanded) {
    const isDraggable = !!(draggable && onMove);
    // Suppress click→expand after a drag. wasDraggedRef is hoisted to the
    // top of the component (Rules of Hooks). makeDragHandler accepts it
    // as an optional 4th arg and sets it true during a non-trivial move.
    const handleDown = isDraggable ? makeDragHandler(a, findAnnoHost, onMove, wasDraggedRef) : undefined;
    const handleClick = function () {
      if (wasDraggedRef.current) { wasDraggedRef.current = false; return; }
      setExpanded(true);
    };
    return (
      <div
        className={'absolute z-50 select-none transition-transform ' + (isDraggable ? 'cursor-grab active:cursor-grabbing hover:scale-110' : 'cursor-pointer hover:scale-110')}
        style={{ top: a.y - 14, left: a.x - 14, width: 28, height: 28, touchAction: isDraggable ? 'none' : undefined }}
        title={(a.content ? a.content + ' — ' : '') + title}
        aria-label={'Sticky note from ' + title + (a.content ? ': ' + a.content : '')}
        onPointerDown={handleDown}
        onClick={handleClick}
        onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(true); } }}
        tabIndex={0}
        role="button"
      >
        <div
          className="w-full h-full rounded-md flex items-center justify-center text-sm shadow-md"
          style={{ background: palette.fill, border: '2px solid ' + palette.border, color: palette.text }}
        >📝</div>
      </div>
    );
  }
  // Expanded editable view. Stop click propagation so clicking inside the
  // note doesn't drop a NEW sticker/note via the host's content-click
  // handler.
  return (
    <div
      className="absolute z-50 select-text shadow-lg rounded-lg"
      style={{
        top: a.y - 14, left: a.x - 14,
        minWidth: 180, maxWidth: 260,
        background: palette.fill,
        border: '2px solid ' + palette.border,
        color: palette.text,
      }}
      onClick={function (e) { e.stopPropagation(); }}
    >
      <div
        className="flex items-center justify-between gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-t-lg"
        style={{ background: palette.border, color: palette.text }}
      >
        <span>📝 {a.author === 'teacher' ? 'Teacher note' : (a.authorName || 'Student note')}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={commit}
            className="px-1.5 py-0.5 rounded bg-white/70 hover:bg-white text-[10px] font-bold"
            aria-label="Save and close note"
            title="Save & close"
          >✓</button>
          {typeof onDelete === 'function' && (
            <button
              type="button"
              onClick={function () { onDelete(a.id); }}
              className="px-1.5 py-0.5 rounded bg-white/70 hover:bg-red-100 text-[10px] font-bold"
              aria-label="Delete note"
              title="Delete"
            >✕</button>
          )}
        </div>
      </div>
      <textarea
        ref={taRef}
        value={draft}
        onChange={function (e) { setDraft(e.target.value); }}
        onBlur={commit}
        placeholder="Type your note…"
        rows={3}
        className="w-full p-2 text-xs resize-y bg-transparent outline-none"
        style={{ color: palette.text, minHeight: 60 }}
        aria-label="Note content"
      />
    </div>
  );
}

// Voice-note bubble. Click → expand for playback. Audio is stored as base64
// inside the annotation so it persists with the project JSON + export HTML
// (no cloud round-trip). Render is purely local; the <audio> element is
// pointed at a data: URL built from audioBase64 + mimeType on the fly.
function VoiceNoteBubble({ a, onDelete, draggable, onMove }) {
  if (!a) return null;
  const [expanded, setExpanded] = React.useState(false);
  // Drag-tracking ref hoisted (Rules of Hooks). Same pattern as NoteBubble.
  const wasDraggedRef = React.useRef(false);
  const title = buildStickerTitle(a) || 'Voice note';
  const dur = typeof a.durationSec === 'number' ? Math.round(a.durationSec) : null;
  // If audio is missing (placeholder during recording, or storage error),
  // render the bubble in a dim state and skip the player.
  const hasAudio = !!a.audioBase64;
  // Author color: teacher = indigo accent; student = amber accent.
  const isT = a.author === 'teacher';
  const accent = isT ? '#6366f1' : '#f59e0b';
  if (!expanded) {
    const isDraggable = !!(draggable && onMove);
    const handleDown = isDraggable ? makeDragHandler(a, findAnnoHost, onMove, wasDraggedRef) : undefined;
    const handleClick = function () {
      if (wasDraggedRef.current) { wasDraggedRef.current = false; return; }
      setExpanded(true);
    };
    return (
      <div
        className={'absolute z-50 select-none transition-transform ' + (isDraggable ? 'cursor-grab active:cursor-grabbing hover:scale-110' : 'cursor-pointer hover:scale-110')}
        style={{ top: a.y - 14, left: a.x - 14, width: 28, height: 28, touchAction: isDraggable ? 'none' : undefined }}
        title={title + (dur != null ? ' • ' + dur + 's' : '')}
        aria-label={'Voice note from ' + title + (dur != null ? ', ' + dur + ' seconds' : '')}
        onPointerDown={handleDown}
        onClick={handleClick}
        onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(true); } }}
        tabIndex={0}
        role="button"
      >
        <div
          className="w-full h-full rounded-md flex items-center justify-center text-sm shadow-md"
          style={{ background: 'white', border: '2px solid ' + accent, color: accent }}
        >🎤</div>
      </div>
    );
  }
  // Expanded: header + audio player + delete. Stop propagation so clicks
  // inside the bubble don't bubble to host (which might drop a new note).
  return (
    <div
      className="absolute z-50 select-text shadow-lg rounded-lg"
      style={{
        top: a.y - 14, left: a.x - 14,
        minWidth: 240, maxWidth: 320,
        background: 'white',
        border: '2px solid ' + accent,
        color: '#1e293b',
      }}
      onClick={function (e) { e.stopPropagation(); }}
    >
      <div
        className="flex items-center justify-between gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-t-lg"
        style={{ background: accent, color: 'white' }}
      >
        <span>🎤 {isT ? 'Teacher voice note' : (a.authorName || 'Voice note')}{dur != null ? ' • ' + dur + 's' : ''}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={function () { setExpanded(false); }}
            className="px-1.5 py-0.5 rounded bg-white/70 hover:bg-white text-[10px] font-bold"
            style={{ color: accent }}
            aria-label="Close voice note"
            title="Close"
          >✓</button>
          {typeof onDelete === 'function' && (
            <button
              type="button"
              onClick={function () { onDelete(a.id); }}
              className="px-1.5 py-0.5 rounded bg-white/70 hover:bg-red-100 text-[10px] font-bold"
              style={{ color: accent }}
              aria-label="Delete voice note"
              title="Delete"
            >✕</button>
          )}
        </div>
      </div>
      <div className="p-2">
        {hasAudio ? (
          <audio
            controls
            preload="metadata"
            src={'data:' + (a.mimeType || 'audio/webm') + ';base64,' + a.audioBase64}
            className="w-full"
            style={{ height: 32 }}
          />
        ) : (
          <div className="text-[11px] text-slate-500 italic px-1 py-2">No audio attached (recording may have failed).</div>
        )}
      </div>
    </div>
  );
}

// Recording overlay: in-place UI shown while a voice note is being
// recorded. Pinned at the placeholder's x/y. Lets the user see elapsed
// time + the auto-stop cap, then stop or cancel. The host owns the actual
// MediaRecorder lifecycle; this is just the chrome.
function RecordingOverlay({ x, y, elapsedSec, onStop, onCancel }) {
  const pct = Math.min(100, ((elapsedSec || 0) / VOICE_MAX_SECONDS) * 100);
  return (
    <div
      className="absolute z-[55] shadow-xl rounded-lg"
      style={{
        top: (y || 0) - 14, left: (x || 0) - 14,
        minWidth: 220, maxWidth: 280,
        background: 'white',
        border: '2px solid #dc2626',
      }}
      onClick={function (e) { e.stopPropagation(); }}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-t-lg" style={{ background: '#dc2626', color: 'white' }}>
        <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse"></span>
        <span>RECORDING</span>
        <span className="ml-auto font-mono">{Math.floor(elapsedSec || 0)}s / {VOICE_MAX_SECONDS}s</span>
      </div>
      <div className="px-3 py-2">
        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
          <div className="h-full bg-red-500 transition-all" style={{ width: pct + '%' }}></div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1 rounded text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
            aria-label="Cancel recording"
          >Cancel</button>
          <button
            type="button"
            onClick={onStop}
            className="px-3 py-1 rounded text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-1"
            aria-label="Stop recording and save"
          ><span className="inline-block w-2 h-2 bg-white"></span> Stop</button>
        </div>
      </div>
    </div>
  );
}

// HighlightOverlay: renders one annotation as a stack of semi-transparent
// colored rectangles (one per line of the original selection). Each rect
// is positioned absolutely relative to the host content area. Pointer
// events are scoped to a tiny hover-revealed delete X at the top-right
// of the FIRST rect so the underlying content stays readable + clickable.
function HighlightOverlay({ a, onDelete }) {
  if (!a || !Array.isArray(a.rects) || a.rects.length === 0) return null;
  const palette = HIGHLIGHT_COLORS[a.color] || HIGHLIGHT_COLORS.yellow;
  const title = buildStickerTitle(a) || 'Highlight';
  const titleText = (a.text ? '"' + a.text.slice(0, 80) + (a.text.length > 80 ? '…' : '') + '"  ' : '') + title;
  return (
    <React.Fragment>
      {a.rects.map(function (r, idx) {
        const isFirst = idx === 0;
        return (
          <div
            key={a.id + ':' + idx}
            className="absolute pointer-events-none z-40"
            style={{
              top: r.y,
              left: r.x,
              width: r.w,
              height: r.h,
              background: palette.fill,
              borderRadius: 2,
              boxShadow: 'inset 0 -1px 0 ' + palette.border,
            }}
            title={titleText}
            aria-label={'Highlight: ' + titleText}
          >
            {isFirst && typeof onDelete === 'function' && (
              <button
                type="button"
                onClick={function (e) { e.stopPropagation(); onDelete(a.id); }}
                className="absolute pointer-events-auto opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                style={{
                  top: -10, right: -10,
                  width: 18, height: 18,
                  borderRadius: '50%',
                  background: 'white',
                  border: '1px solid ' + palette.border,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  lineHeight: 1,
                }}
                aria-label="Delete highlight"
                title="Delete highlight"
              >✕</button>
            )}
          </div>
        );
      })}
      {/* Invisible wrapper that catches hover so the X reveals when the
          user hovers anywhere over any of the rects, not just the first. */}
      <div
        className="absolute pointer-events-auto z-30 hover:opacity-100"
        style={{
          top: a.rects[0].y,
          left: a.rects[0].x,
          width: a.rects[0].w,
          height: a.rects[0].h,
          background: 'transparent',
        }}
        onMouseEnter={function (e) {
          // Find the sibling X button and reveal it. CSS :hover on the
          // rect itself would be simpler but pointer-events:none on the
          // rect blocks :hover entirely.
          const btn = e.currentTarget.parentNode.querySelector('button[aria-label="Delete highlight"]');
          if (btn) btn.style.opacity = '1';
        }}
        onMouseLeave={function (e) {
          const btn = e.currentTarget.parentNode.querySelector('button[aria-label="Delete highlight"]');
          if (btn) btn.style.opacity = '0';
        }}
      />
    </React.Fragment>
  );
}

// Overlay layer: renders every annotation in the given array dispatched by
// `kind`. The parent content area must be position:relative so absolute
// children land in the right place. Migrates legacy shape on the fly so
// projects saved before Phase 3 still render correctly.
function Overlay({ annotations, mode, isTeacher, onNoteChange, onNoteDelete, onHighlightDelete, onVoiceDelete, onMove }) {
  if (!Array.isArray(annotations) || annotations.length === 0) return null;
  const migrated = migrateLegacyShape(annotations);
  // Drag is only enabled when no annotation-creation mode is active
  // (otherwise the user is mid-create and dragging would conflict with
  // mode UX). Permission: students can drag their own; teachers can
  // drag anything.
  const dragMode = !mode || mode === 'off';
  function canDrag(a) {
    if (!dragMode || !onMove) return false;
    if (isTeacher) return true;
    return a && a.author === 'student';
  }
  return (
    <React.Fragment>
      {migrated.map(function (a) {
        if (!a) return null;
        if (a.kind === 'note') {
          return <NoteBubble key={a.id} a={a} onChange={onNoteChange} onDelete={onNoteDelete} draggable={canDrag(a)} onMove={onMove} />;
        }
        if (a.kind === 'highlight') {
          return <HighlightOverlay key={a.id} a={a} onDelete={onHighlightDelete} />;
        }
        if (a.kind === 'voice') {
          // Pending voice notes (recording in progress) skip the bubble —
          // the RecordingOverlay shows in their place. Bubble appears only
          // once audio is attached.
          if (a.pending) return null;
          return <VoiceNoteBubble key={a.id} a={a} onDelete={onVoiceDelete} draggable={canDrag(a)} onMove={onMove} />;
        }
        // Default = sticker (kind missing on legacy data is caught by migrator).
        return <StickerNode key={a.id} s={a} draggable={canDrag(a)} onMove={onMove} />;
      })}
    </React.Fragment>
  );
}

// Toolbar: annotation-mode switch (off / sticker / note) + per-tool
// sub-controls. Icons load lazily off window.AlloIcons; emoji fallbacks
// keep the toolbar functional before AlloIcons hydrates.
//
// Mode contract: `mode` is one of '' (off), 'sticker', 'note'. Callers
// pass `onSetMode(newMode)` — clicking the active mode again toggles it
// off. Back-compat: if `isStickerMode` (legacy boolean) is passed instead
// of `mode`, it's translated to mode = 'sticker' | ''.
function Toolbar(props) {
  const Smile = (window.AlloIcons && window.AlloIcons.Smile) || null;
  const StickyNote = (window.AlloIcons && window.AlloIcons.StickyNote) || null;
  const Highlighter = (window.AlloIcons && window.AlloIcons.Highlighter) || null;
  const Mic = (window.AlloIcons && window.AlloIcons.Mic) || null;
  const Trash2 = (window.AlloIcons && window.AlloIcons.Trash2) || null;
  const tt = typeof props.t === 'function' ? props.t : (k) => k;
  // Resolve mode (new API) with fallback to isStickerMode (legacy API).
  let mode = props.mode;
  if (mode == null) mode = props.isStickerMode ? 'sticker' : '';
  const stickerType = props.stickerType || 'star';
  const noteColor = props.noteColor || 'yellow';
  const highlightColor = props.highlightColor || 'yellow';
  const onSetMode = props.onSetMode || function () {};
  const onPickType = props.onPickType || function () {};
  const onPickNoteColor = props.onPickNoteColor || function () {};
  const onPickHighlightColor = props.onPickHighlightColor || function () {};
  const onClear = props.onClear || function () {};
  const onPickTemplate = props.onPickTemplate || function () {};
  const noteTemplate = props.noteTemplate || ''; // empty = freeform
  const isTeacher = !!props.isTeacher;
  // Pick role-appropriate templates so students see reflection prompts
  // and teachers see grading-oriented feedback stamps.
  const templateSet = isTeacher ? TEACHER_NOTE_TEMPLATES : STUDENT_NOTE_TEMPLATES;
  // Back-compat: legacy callers wired onToggleMode which flipped the
  // boolean. Translate it to onSetMode('sticker' or '').
  const onToggleMode = props.onToggleMode;
  const toggleStickerMode = function () {
    if (onToggleMode) { onToggleMode(); return; }
    onSetMode(mode === 'sticker' ? '' : 'sticker');
  };
  const toggleNoteMode = function () {
    onSetMode(mode === 'note' ? '' : 'note');
  };
  const toggleHighlightMode = function () {
    onSetMode(mode === 'highlight' ? '' : 'highlight');
  };
  const toggleVoiceMode = function () {
    onSetMode(mode === 'voice' ? '' : 'voice');
  };
  return (
    <React.Fragment>
      {/* Sticker mode toggle */}
      <button
        onClick={toggleStickerMode}
        className={'p-1.5 rounded-full transition-all flex items-center gap-1 text-xs font-bold px-2 mr-1 ' + (mode === 'sticker' ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200' : 'text-slate-600 hover:bg-slate-100')}
        title={tt('toolbar.stickers_tooltip')}
        aria-pressed={mode === 'sticker'}
      >
        {Smile ? <Smile size={14} /> : <span>🙂</span>}
        {' '}
        {tt('toolbar.stickers_label')}
      </button>
      {/* Note mode toggle */}
      <button
        onClick={toggleNoteMode}
        className={'p-1.5 rounded-full transition-all flex items-center gap-1 text-xs font-bold px-2 mr-1 ' + (mode === 'note' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-200' : 'text-slate-600 hover:bg-slate-100')}
        title="Sticky note: click anywhere to leave a note"
        aria-pressed={mode === 'note'}
      >
        {StickyNote ? <StickyNote size={14} /> : <span>📝</span>}
        {' '}
        Note
      </button>
      {/* Highlight mode toggle */}
      <button
        onClick={toggleHighlightMode}
        className={'p-1.5 rounded-full transition-all flex items-center gap-1 text-xs font-bold px-2 mr-1 ' + (mode === 'highlight' ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-300' : 'text-slate-600 hover:bg-slate-100')}
        title="Highlighter: select text to highlight"
        aria-pressed={mode === 'highlight'}
      >
        {Highlighter ? <Highlighter size={14} /> : <span>🖍</span>}
        {' '}
        Highlight
      </button>
      {/* Voice mode toggle */}
      <button
        onClick={toggleVoiceMode}
        className={'p-1.5 rounded-full transition-all flex items-center gap-1 text-xs font-bold px-2 mr-1 ' + (mode === 'voice' ? 'bg-red-100 text-red-700 ring-2 ring-red-200' : 'text-slate-600 hover:bg-slate-100')}
        title="Voice note: click to start recording (max 60s, stays local)"
        aria-pressed={mode === 'voice'}
      >
        {Mic ? <Mic size={14} /> : <span>🎤</span>}
        {' '}
        Voice
      </button>
      {/* Sticker sub-controls */}
      {mode === 'sticker' && (
        <div className="flex items-center gap-1 animate-in slide-in-from-left-2 duration-200 border-l border-slate-200 pl-1">
          {STICKER_TYPES.map(function (type) {
            return (
              <button
                aria-label={type}
                key={type}
                onClick={function () { onPickType(type); }}
                className={'w-6 h-6 flex items-center justify-center rounded-full text-sm hover:scale-125 transition-transform ' + (stickerType === type ? 'bg-indigo-50 shadow-sm scale-110 ring-1 ring-indigo-200' : 'opacity-60 hover:opacity-100')}
              >
                {STICKER_ICONS[type]}
              </button>
            );
          })}
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <button
            onClick={onClear}
            className="p-1 text-slate-600 hover:text-red-500 rounded-full"
            title={tt('toolbar.clear_stickers')}
            aria-label={tt('toolbar.clear_stickers')}
          >
            {Trash2 ? <Trash2 size={12} /> : <span>🗑</span>}
          </button>
        </div>
      )}
      {/* Note color + template sub-controls */}
      {mode === 'note' && (
        <div className="flex items-center gap-1 animate-in slide-in-from-left-2 duration-200 border-l border-slate-200 pl-1">
          {NOTE_COLOR_KEYS.map(function (key) {
            const palette = NOTE_COLORS[key];
            return (
              <button
                key={key}
                aria-label={'Note color ' + key}
                onClick={function () { onPickNoteColor(key); }}
                className={'w-5 h-5 rounded transition-transform hover:scale-125 ' + (noteColor === key ? 'ring-2 ring-amber-500 scale-110' : 'opacity-70 hover:opacity-100')}
                style={{ background: palette.fill, border: '2px solid ' + palette.border }}
                title={key}
              />
            );
          })}
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          {/* Templates dropdown — one-click stamps. Stays "sticky" until
              the user picks 'Custom' so a teacher can rapid-fire the same
              feedback across many spots (e.g., grading a class set). */}
          <select
            value={noteTemplate}
            onChange={function (e) { onPickTemplate(e.target.value); }}
            className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 max-w-[150px]"
            aria-label="Note template"
            title={noteTemplate ? 'Template active: next note auto-fills' : 'Pick a template to auto-fill the next note'}
            style={{ height: 22 }}
          >
            <option value="">Custom (type)</option>
            {templateSet.map(function (tmpl) {
              return <option key={tmpl.label} value={tmpl.content}>{tmpl.label}</option>;
            })}
          </select>
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <button
            onClick={onClear}
            className="p-1 text-slate-600 hover:text-red-500 rounded-full"
            title="Clear all annotations"
            aria-label="Clear all annotations"
          >
            {Trash2 ? <Trash2 size={12} /> : <span>🗑</span>}
          </button>
        </div>
      )}
      {/* Highlight color sub-controls */}
      {mode === 'highlight' && (
        <div className="flex items-center gap-1 animate-in slide-in-from-left-2 duration-200 border-l border-slate-200 pl-1">
          {HIGHLIGHT_COLOR_KEYS.map(function (key) {
            const palette = HIGHLIGHT_COLORS[key];
            return (
              <button
                key={key}
                aria-label={'Highlight color ' + key}
                onClick={function () { onPickHighlightColor(key); }}
                className={'w-5 h-5 rounded transition-transform hover:scale-125 ' + (highlightColor === key ? 'ring-2 ring-yellow-500 scale-110' : 'opacity-70 hover:opacity-100')}
                style={{ background: palette.fill, border: '2px solid ' + palette.border }}
                title={key}
              />
            );
          })}
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <button
            onClick={onClear}
            className="p-1 text-slate-600 hover:text-red-500 rounded-full"
            title="Clear all annotations"
            aria-label="Clear all annotations"
          >
            {Trash2 ? <Trash2 size={12} /> : <span>🗑</span>}
          </button>
        </div>
      )}
    </React.Fragment>
  );
}

// Helper: build a new sticker annotation from a click event on the host
// content area. Skips placement when the click landed on an interactive
// element (button/input/textarea) so the student can still operate quiz
// radios, text fields, etc., while sticker mode is on.
// Returns the new sticker object — caller appends to state.
function createStickerFromClick(hostEl, evt, opts) {
  if (!hostEl || !evt) return null;
  const target = evt.target;
  if (!target) return null;
  if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return null;
  if (target.closest && target.closest('button')) return null;
  const rect = hostEl.getBoundingClientRect();
  const x = evt.clientX - rect.left + (hostEl.scrollLeft || 0);
  const y = evt.clientY - rect.top + (hostEl.scrollTop || 0);
  const o = opts || {};
  return {
    id: Date.now(),
    kind: 'sticker',
    type: o.stickerType || 'star',
    x: x,
    y: y,
    author: o.isTeacher ? 'teacher' : 'student',
    authorName: !o.isTeacher ? (o.authorName || '') : '',
    createdAt: new Date().toISOString(),
  };
}

// Helper: build a new sticky-note annotation from a click event. Same
// safety filter as createStickerFromClick (skip interactive elements).
// Notes start empty; the user fills in content via the expanded editor.
function createNoteFromClick(hostEl, evt, opts) {
  if (!hostEl || !evt) return null;
  const target = evt.target;
  if (!target) return null;
  if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return null;
  if (target.closest && target.closest('button')) return null;
  // Don't drop a new note if the click landed inside an existing expanded note.
  if (target.closest && target.closest('[data-allo-note-expanded]')) return null;
  const rect = hostEl.getBoundingClientRect();
  const x = evt.clientX - rect.left + (hostEl.scrollLeft || 0);
  const y = evt.clientY - rect.top + (hostEl.scrollTop || 0);
  const o = opts || {};
  const color = NOTE_COLORS[o.color] ? o.color : 'yellow';
  return {
    id: Date.now(),
    kind: 'note',
    x: x,
    y: y,
    // Template support: if caller passes a pre-filled content string
    // (from the Templates picker), use it. Otherwise start empty and let
    // the inline editor open for typing.
    content: typeof o.templateContent === 'string' ? o.templateContent : '',
    color: color,
    author: o.isTeacher ? 'teacher' : 'student',
    authorName: !o.isTeacher ? (o.authorName || '') : '',
    createdAt: new Date().toISOString(),
  };
}

// Helper: build a voice-note placeholder annotation from a click event.
// Audio is attached separately via attachAudioToVoiceNote once recording
// finishes. Same safety filter as the other click factories (skip
// interactive elements).
function createVoicePlaceholder(hostEl, evt, opts) {
  if (!hostEl || !evt) return null;
  const target = evt.target;
  if (!target) return null;
  if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return null;
  if (target.closest && target.closest('button')) return null;
  if (target.closest && target.closest('[data-allo-anno]')) return null;
  const rect = hostEl.getBoundingClientRect();
  const x = evt.clientX - rect.left + (hostEl.scrollLeft || 0);
  const y = evt.clientY - rect.top + (hostEl.scrollTop || 0);
  const o = opts || {};
  return {
    id: Date.now(),
    kind: 'voice',
    x: x,
    y: y,
    audioBase64: null,     // filled by attachAudioToVoiceNote on stop
    mimeType: null,
    durationSec: null,
    pending: true,         // flag: don't render the bubble until audio attached
    author: o.isTeacher ? 'teacher' : 'student',
    authorName: !o.isTeacher ? (o.authorName || '') : '',
    createdAt: new Date().toISOString(),
  };
}

// Helper: attach recorded audio to a placeholder voice annotation. Refuses
// clips above VOICE_MAX_BYTES so the project JSON stays manageable; caller
// should surface that with a toast. Returns the updated annotations array
// (immutable). If the clip is over-size, removes the placeholder so we
// don't leave a broken bubble.
function attachAudioToVoiceNote(annotations, id, payload) {
  if (!Array.isArray(annotations)) return annotations;
  const ab = (payload && payload.audioBase64) || '';
  if (!ab) {
    return annotations.filter(function (a) { return a && a.id !== id; });
  }
  if (ab.length > VOICE_MAX_BYTES) {
    return { error: 'too-large', size: ab.length, list: annotations.filter(function (a) { return a && a.id !== id; }) };
  }
  return annotations.map(function (a) {
    if (!a || a.id !== id) return a;
    return Object.assign({}, a, {
      audioBase64: ab,
      mimeType: payload.mimeType || 'audio/webm',
      durationSec: typeof payload.durationSec === 'number' ? payload.durationSec : null,
      pending: false,
    });
  });
}

// Helper: build a highlight annotation from a text Selection on the host
// content area. Captures the selection's bounding rects (multi-line
// selections produce multiple rects) PLUS the selected text for tooltip
// + a11y. Returns null if the selection is empty, collapsed, or doesn't
// belong to the host element. Caller should clear the selection after
// appending (so the visible "blue selection" goes away in favor of the
// rendered highlight overlay).
function createHighlightFromSelection(hostEl, selection, opts) {
  if (!hostEl || !selection) return null;
  if (selection.isCollapsed) return null;
  if (selection.rangeCount === 0) return null;
  const text = (selection.toString() || '').trim();
  if (!text) return null;
  const range = selection.getRangeAt(0);
  if (!range) return null;
  // Containment check: only capture selections that started/ended inside
  // the host. Prevents stray selections in the chrome (toolbar, headers,
  // etc.) from creating highlights.
  const anchor = range.commonAncestorContainer;
  if (!anchor) return null;
  const anchorEl = anchor.nodeType === 1 ? anchor : anchor.parentNode;
  if (!anchorEl || !hostEl.contains(anchorEl)) return null;
  // getClientRects returns one rect per visible line of the selection.
  // Each rect is in viewport coordinates; convert to host-relative.
  const clientRects = range.getClientRects();
  if (!clientRects || clientRects.length === 0) return null;
  const hostRect = hostEl.getBoundingClientRect();
  const scrollLeft = hostEl.scrollLeft || 0;
  const scrollTop = hostEl.scrollTop || 0;
  const rects = [];
  for (let i = 0; i < clientRects.length; i++) {
    const cr = clientRects[i];
    // Filter zero-width/height rects (some browsers emit them for line
    // breaks between visible lines).
    if (cr.width <= 1 || cr.height <= 1) continue;
    rects.push({
      x: Math.round(cr.left - hostRect.left + scrollLeft),
      y: Math.round(cr.top - hostRect.top + scrollTop),
      w: Math.round(cr.width),
      h: Math.round(cr.height),
    });
  }
  if (rects.length === 0) return null;
  const o = opts || {};
  const color = HIGHLIGHT_COLORS[o.color] ? o.color : 'yellow';
  return {
    id: Date.now(),
    kind: 'highlight',
    rects: rects,
    text: text.slice(0, 500), // cap to keep saved JSON manageable
    color: color,
    author: o.isTeacher ? 'teacher' : 'student',
    authorName: !o.isTeacher ? (o.authorName || '') : '',
    createdAt: new Date().toISOString(),
  };
}

// Helper: import an annotations payload (the shape produced by the
// export's "Save mine" download) into an existing annotations array.
// Validates shape, dedupes by id, optionally rebrands authors so a
// teacher loading a student's file sees them as student-authored. Returns
// { list, added, skipped, error? } so the caller can surface counts.
function importAnnotations(existing, payload, opts) {
  const o = opts || {};
  const out = { list: Array.isArray(existing) ? existing.slice() : [], added: 0, skipped: 0, error: null };
  if (!payload) { out.error = 'no-payload'; return out; }
  // Accept either a raw array OR the wrapped {docTitle, annotations:[...]} shape.
  let incoming = null;
  if (Array.isArray(payload)) incoming = payload;
  else if (payload && Array.isArray(payload.annotations)) incoming = payload.annotations;
  if (!incoming) { out.error = 'bad-shape'; return out; }
  const existingIds = {};
  out.list.forEach(function (a) { if (a && a.id != null) existingIds[String(a.id)] = true; });
  incoming.forEach(function (raw) {
    if (!raw || typeof raw !== 'object') { out.skipped++; return; }
    if (!raw.kind && !STICKER_TYPES.includes(raw.type)) { out.skipped++; return; }
    // ID collision: regenerate so we don't overwrite an existing annotation.
    let id = raw.id;
    if (id == null || existingIds[String(id)]) {
      id = Date.now() + Math.floor(Math.random() * 1000);
    }
    existingIds[String(id)] = true;
    // Author rebrand: if the importer says "treat all imported as student"
    // (e.g., teacher loading a student's file), force author='student'.
    let author = raw.author || 'student';
    let authorName = raw.authorName || '';
    if (o.forceAuthor) {
      author = o.forceAuthor;
      if (o.forceAuthorName != null) authorName = o.forceAuthorName;
    }
    const merged = Object.assign({}, raw, {
      id: id,
      author: author,
      authorName: authorName,
      // Mark as imported so future diff tools can tell where it came from.
      importedFrom: (payload && payload.docTitle) || raw.importedFrom || 'unknown',
      importedAt: new Date().toISOString(),
    });
    out.list.push(merged);
    out.added++;
  });
  return out;
}

// Helper: scroll a host content area to make an annotation visible and
// briefly pulse it for findability. Works with any annotation kind. The
// host must be scrollable (overflow: auto/scroll) for the scroll to take
// effect; if not, this is a no-op aside from the pulse.
function focusAnnotation(hostEl, a) {
  if (!hostEl || !a) return;
  // Compute focus point: stickers/notes use (x, y); highlights use the
  // first rect's center.
  let fx = a.x, fy = a.y;
  if (a.kind === 'highlight' && Array.isArray(a.rects) && a.rects.length > 0) {
    fx = a.rects[0].x + (a.rects[0].w || 0) / 2;
    fy = a.rects[0].y + (a.rects[0].h || 0) / 2;
  }
  if (typeof fy === 'number' && typeof hostEl.scrollTo === 'function') {
    // Scroll so the focus point sits ~30% from the top of the visible area.
    const targetTop = Math.max(0, fy - (hostEl.clientHeight || 0) * 0.30);
    try { hostEl.scrollTo({ top: targetTop, behavior: 'smooth' }); }
    catch (_) { hostEl.scrollTop = targetTop; }
  }
  // Pulse: drop a temporary ring at the focus point that fades out.
  // Pure DOM so it works regardless of which annotation library renders.
  try {
    const pulse = document.createElement('div');
    pulse.style.cssText = 'position:absolute;top:' + (fy - 24) + 'px;left:' + (fx - 24) + 'px;width:48px;height:48px;border-radius:50%;border:3px solid #6366f1;pointer-events:none;z-index:60;animation:alloflow-anno-pulse 1.2s ease-out forwards;';
    hostEl.appendChild(pulse);
    setTimeout(function () { try { pulse.remove(); } catch (_) {} }, 1300);
  } catch (_) {}
}

// Helper: count annotations by author for the sidebar's header badge.
// Returns { teacher: N, student: N, total: N }.
function countByAuthor(annotations) {
  const out = { teacher: 0, student: 0, total: 0 };
  if (!Array.isArray(annotations)) return out;
  const migrated = migrateLegacyShape(annotations);
  migrated.forEach(function (a) {
    if (!a) return;
    out.total++;
    if (a.author === 'teacher') out.teacher++;
    else out.student++;
  });
  return out;
}

// Helper: format a one-line preview of an annotation's content.
function annotationPreview(a) {
  if (!a) return '';
  const kind = a.kind || 'sticker';
  if (kind === 'sticker') return (STICKER_ICONS[a.type] || '') + ' ' + (a.type || 'sticker');
  if (kind === 'note') {
    const c = (a.content || '').trim();
    return '📝 ' + (c ? (c.length > 60 ? c.slice(0, 60) + '…' : c) : '(empty note)');
  }
  if (kind === 'highlight') {
    const c = (a.text || '').trim();
    return '🖍 ' + (c ? '"' + (c.length > 60 ? c.slice(0, 60) + '…' : c) + '"' : '(highlight)');
  }
  if (kind === 'voice') {
    const d = typeof a.durationSec === 'number' ? Math.round(a.durationSec) + 's' : '';
    return '🎤 Voice note' + (d ? ' (' + d + ')' : '');
  }
  return '';
}

// Sidebar component: lists every annotation grouped by author, with
// filter pills, click-to-focus, and per-item delete (gated by permission).
// Caller owns the visibility state — the sidebar itself just renders a
// floating fixed panel. Permission rule: a user can delete annotations
// they authored. `isTeacher=true` callers can also delete student
// annotations (teacher reviewing a submission, for instance).
function Sidebar(props) {
  const ChevronRight = (window.AlloIcons && window.AlloIcons.ChevronRight) || null;
  const X = (window.AlloIcons && window.AlloIcons.X) || null;
  const annotations = Array.isArray(props.annotations) ? migrateLegacyShape(props.annotations) : [];
  const isTeacher = !!props.isTeacher;
  const onFocus = props.onFocus || function () {};
  const onDelete = props.onDelete || function () {};
  const onClose = props.onClose || function () {};
  const onImport = typeof props.onImport === 'function' ? props.onImport : null;
  const [filter, setFilter] = React.useState('all'); // 'all' | 'teacher' | 'mine'
  const counts = countByAuthor(annotations);
  const visible = annotations.filter(function (a) {
    if (!a) return false;
    if (filter === 'teacher') return a.author === 'teacher';
    if (filter === 'mine') {
      return isTeacher ? a.author === 'teacher' : a.author === 'student';
    }
    return true;
  });
  // Sort: teacher first, then by createdAt desc within group.
  visible.sort(function (a, b) {
    if ((a.author === 'teacher') !== (b.author === 'teacher')) {
      return a.author === 'teacher' ? -1 : 1;
    }
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
  const Pill = function (key, label, count) {
    const active = filter === key;
    return (
      <button
        key={key}
        type="button"
        onClick={function () { setFilter(key); }}
        className={'px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ' + (active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
        aria-pressed={active}
      >
        {label} {count > 0 ? '(' + count + ')' : ''}
      </button>
    );
  };
  const mineCount = isTeacher ? counts.teacher : counts.student;
  return (
    <div
      className="fixed top-16 right-3 z-[60] bg-white border border-slate-300 rounded-xl shadow-2xl flex flex-col"
      style={{ width: 300, maxHeight: 'calc(100vh - 120px)' }}
      role="region"
      aria-label="Annotation list"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50 rounded-t-xl">
        <div className="text-xs font-bold text-slate-700">
          📋 Annotations <span className="text-slate-400 font-normal">({counts.total})</span>
        </div>
        <div className="flex items-center gap-1">
          {onImport && (
            <button
              type="button"
              onClick={onImport}
              className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-indigo-700 rounded hover:bg-white border border-slate-300"
              aria-label="Import annotations from a saved file"
              title="Import annotations from a file (e.g., a student's downloaded annotations)"
            >📂 Import</button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-red-500 rounded-full hover:bg-white"
            aria-label="Close annotation list"
            title="Close"
          >{X ? <X size={14} /> : <span>✕</span>}</button>
        </div>
      </div>
      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200">
        {Pill('all', 'All', counts.total)}
        {Pill('teacher', 'Teacher', counts.teacher)}
        {Pill('mine', isTeacher ? 'Teacher' : 'Mine', mineCount)}
      </div>
      <div className="overflow-y-auto flex-1 px-1 py-1" style={{ minHeight: 100 }}>
        {visible.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-slate-400 italic">
            No annotations match this filter.
          </div>
        )}
        {visible.map(function (a) {
          const isTeacherAnno = a.author === 'teacher';
          const canDelete = isTeacher || a.author === 'student';
          const title = buildStickerTitle(a);
          return (
            <div
              key={a.id}
              className={'group px-2 py-1.5 mb-0.5 rounded-md text-xs cursor-pointer transition-colors ' + (isTeacherAnno ? 'bg-indigo-50/60 hover:bg-indigo-100 border-l-2 border-indigo-400' : 'bg-amber-50/40 hover:bg-amber-100 border-l-2 border-amber-300')}
              onClick={function () { onFocus(a.id); }}
              role="button"
              tabIndex={0}
              onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus(a.id); } }}
              aria-label={'Jump to ' + annotationPreview(a) + ' from ' + title}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">{annotationPreview(a)}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">{title || (isTeacherAnno ? 'Teacher' : 'Student')}</div>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={function (e) { e.stopPropagation(); onDelete(a.id); }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-red-500 rounded"
                    aria-label={'Delete ' + annotationPreview(a)}
                    title="Delete"
                  >{X ? <X size={12} /> : <span>✕</span>}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Pulse keyframe moved to module-level CSS injection (2C). */}
    </div>
  );
}

// Helper: update a single annotation by id with a partial patch. Returns
// the new array (immutable — caller can pass directly to setStickers).
function updateAnnotation(annotations, id, patch) {
  if (!Array.isArray(annotations)) return annotations;
  return annotations.map(function (a) {
    if (!a || a.id !== id) return a;
    return Object.assign({}, a, patch || {});
  });
}

// Helper: remove a single annotation by id.
function removeAnnotation(annotations, id) {
  if (!Array.isArray(annotations)) return annotations;
  return annotations.filter(function (a) { return a && a.id !== id; });
}

// Module surface area. Phase 3b will add: createHighlightFromSelection,
// HighlightOverlay. Phase 4 will add: renderAnnotationToHTML(annotation),
// serializeForExport(annotations) for the doc_pipeline.
window.AlloModules = window.AlloModules || {};
window.AlloModules.AnnotationSuite = {
  STICKER_ICONS: STICKER_ICONS,
  STICKER_TYPES: STICKER_TYPES,
  ANNOTATION_KINDS: ANNOTATION_KINDS,
  NOTE_COLORS: NOTE_COLORS,
  NOTE_COLOR_KEYS: NOTE_COLOR_KEYS,
  HIGHLIGHT_COLORS: HIGHLIGHT_COLORS,
  HIGHLIGHT_COLOR_KEYS: HIGHLIGHT_COLOR_KEYS,
  TEACHER_NOTE_TEMPLATES: TEACHER_NOTE_TEMPLATES,
  STUDENT_NOTE_TEMPLATES: STUDENT_NOTE_TEMPLATES,
  VOICE_MAX_SECONDS: VOICE_MAX_SECONDS,
  VOICE_MAX_BYTES: VOICE_MAX_BYTES,
  StickerNode: StickerNode,
  NoteBubble: NoteBubble,
  HighlightOverlay: HighlightOverlay,
  VoiceNoteBubble: VoiceNoteBubble,
  RecordingOverlay: RecordingOverlay,
  Overlay: Overlay,
  Toolbar: Toolbar,
  Sidebar: Sidebar,
  createStickerFromClick: createStickerFromClick,
  createNoteFromClick: createNoteFromClick,
  createHighlightFromSelection: createHighlightFromSelection,
  createVoicePlaceholder: createVoicePlaceholder,
  attachAudioToVoiceNote: attachAudioToVoiceNote,
  importAnnotations: importAnnotations,
  updateAnnotation: updateAnnotation,
  removeAnnotation: removeAnnotation,
  buildStickerTitle: buildStickerTitle,
  migrateLegacyShape: migrateLegacyShape,
  focusAnnotation: focusAnnotation,
  countByAuthor: countByAuthor,
  annotationPreview: annotationPreview,
};
