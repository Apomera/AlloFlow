// anchor_charts_source.jsx
// Anchor Charts — EL Education classroom-staple visual reference.
//
// A poster-style class-co-created artifact (title + N labeled sections with
// bullets + simple icons). AI-generated structure, student/teacher-refined,
// peer-critiqued via the annotation suite's I-notice/I-wonder protocol.
//
// Hand-drawn aesthetic: marker palette, Patrick Hand / Permanent Marker
// display fonts, paper texture, slight section-block jitter.
//
// Per architectural directive, lives as a standalone CDN module — NOT inline
// in AlloFlowANTI.txt. Mirrors the Note-Taking Templates module shape.

// ── Helpers ─────────────────────────────────────────────────────────────
const _ac_genId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// Marker palette — warm classroom colors. Index by section position.
const MARKER_PALETTE = [
  { name: 'red',    hex: '#c53030', soft: 'rgba(197,48,48,0.08)',  ink: '#7b1d1d' },
  { name: 'blue',   hex: '#2b6cb0', soft: 'rgba(43,108,176,0.08)', ink: '#1a3f6b' },
  { name: 'green',  hex: '#2f855a', soft: 'rgba(47,133,90,0.08)',  ink: '#1c4d36' },
  { name: 'orange', hex: '#dd6b20', soft: 'rgba(221,107,32,0.10)', ink: '#8a4014' },
  { name: 'purple', hex: '#6b46c1', soft: 'rgba(107,70,193,0.08)', ink: '#3f2a73' },
  { name: 'teal',   hex: '#2c7a7b', soft: 'rgba(44,122,123,0.08)', ink: '#1c4f50' },
];

const _markerFor = (idx) => MARKER_PALETTE[idx % MARKER_PALETTE.length];

// Stable pseudo-random jitter per section so sections don't twitch on every render.
const _jitterFor = (sectionId, sectionLabel) => {
  const key = String(sectionId || sectionLabel || 'x');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const rot = ((h % 21) - 10) / 10;
  return rot * 0.9;
};

// Bias the icon prompt toward the hand-drawn marker look so generated icons
// match the aesthetic of the rest of the chart.
const _iconPromptBiased = (basePrompt, markerName) => {
  const safe = (basePrompt || 'simple object').toString().trim();
  return `${safe}. Simple hand-drawn classroom-anchor-chart marker sketch in ${markerName} ink. White background. No text or letters. Single subject, centered, clean outline, no shading. Thick marker strokes. Children's classroom poster style.`;
};

// ── Critique Overlay (wraps annotation suite with EL preset) ────────────
const AnchorChartCritiqueOverlay = React.memo((props) => {
  const isOpen = !!props.isOpen;
  const onClose = props.onClose || (() => {});
  const chartId = props.chartId;
  const annotations = Array.isArray(props.annotations) ? props.annotations : [];
  const onAnnotationsChange = props.onAnnotationsChange || (() => {});
  const isTeacherMode = !!props.isTeacherMode;
  const annoApi = (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AnnotationSuite) || null;

  if (!isOpen) return null;
  if (!annoApi) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md text-center">
          <p className="text-sm text-slate-700">Critique overlay is loading. Please try again in a moment.</p>
          <button onClick={onClose} className="mt-4 px-4 py-1.5 text-sm font-bold bg-slate-200 rounded-full">Close</button>
        </div>
      </div>
    );
  }

  // EL "I notice / I wonder" preset — two sticky-note templates pinned to the
  // top of the toolbar. Falls back gracefully if the annotation suite API
  // doesn't expose template injection in this version.
  const elTemplates = [
    { id: 'el-notice', label: 'I notice…', prefill: 'I notice ', color: 'amber' },
    { id: 'el-wonder', label: 'I wonder…', prefill: 'I wonder ', color: 'sky' },
  ];

  // Render the annotation-suite Overlay + Toolbar. Annotation suite manages
  // its own click-handling and node placement; we pass annotations through
  // and listen for changes.
  const Overlay = annoApi.Overlay;
  const Toolbar = annoApi.Toolbar;
  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto">
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-amber-50 to-transparent p-3 border-b border-amber-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📌</span>
            <div>
              <div className="font-black text-sm text-amber-900">Critique Mode</div>
              <div className="text-[11px] text-amber-700">Drop sticky notes anywhere on the chart. Use the I notice / I wonder protocol.</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded-full hover:bg-amber-100"
            aria-label="Close critique mode"
          >Done</button>
        </div>
        {Toolbar ? <Toolbar templates={elTemplates} isTeacherMode={isTeacherMode} /> : null}
        {Overlay ? (
          <Overlay
            scopeId={`anchor-chart-${chartId || 'unknown'}`}
            annotations={annotations}
            onAnnotationsChange={onAnnotationsChange}
            isTeacherMode={isTeacherMode}
            presetTemplates={elTemplates}
          />
        ) : null}
      </div>
    </div>
  );
});

// ── Section block ───────────────────────────────────────────────────────
const AnchorChartSection = React.memo((props) => {
  const section = props.section || {};
  const sectionIndex = props.sectionIndex || 0;
  const marker = _markerFor(sectionIndex);
  const jitter = _jitterFor(section.id, section.label);
  const isEditing = !!props.isEditing;
  const onChange = props.onChange || (() => {});
  const onRegenIcon = props.onRegenIcon || null;
  const isRegeneratingIcon = !!props.isRegeneratingIcon;
  const label = section.label || '';
  const bullets = Array.isArray(section.bullets) ? section.bullets : [];
  const iconUrl = section.iconUrl || '';
  const iconPrompt = section.iconPrompt || '';

  const updateLabel = (e) => onChange({ ...section, label: e.target.value });
  const updateBullet = (idx, text) => {
    const next = bullets.slice();
    while (next.length <= idx) next.push('');
    next[idx] = text;
    onChange({ ...section, bullets: next });
  };
  const addBullet = () => onChange({ ...section, bullets: bullets.concat(['']) });
  const removeBullet = (idx) => onChange({ ...section, bullets: bullets.filter((_, i) => i !== idx) });

  return (
    <div
      className="ac-section relative"
      style={{
        borderLeft: `6px solid ${marker.hex}`,
        background: `linear-gradient(180deg, ${marker.soft} 0%, rgba(255,255,255,0.85) 60%)`,
        boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)',
        transform: `rotate(${jitter}deg)`,
        borderRadius: '6px',
        padding: '14px 14px 14px 18px',
        margin: '12px 6px',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="ac-icon-slot flex-shrink-0" style={{
          width: 78,
          height: 78,
          background: '#fff',
          border: `2px solid ${marker.hex}`,
          borderRadius: '8px',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          {iconUrl ? (
            <img src={iconUrl} alt={iconPrompt || label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : isRegeneratingIcon ? (
            <span className="text-[10px] text-slate-400 animate-pulse">Drawing…</span>
          ) : (
            <span className="text-[10px] text-slate-400 italic text-center leading-tight">{iconPrompt || 'icon'}</span>
          )}
          {isEditing && onRegenIcon ? (
            <button
              onClick={() => onRegenIcon(sectionIndex)}
              disabled={isRegeneratingIcon}
              title="Regenerate icon"
              aria-label="Regenerate icon"
              className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-white border-2 text-xs flex items-center justify-center hover:bg-amber-50"
              style={{ borderColor: marker.hex, color: marker.hex }}
            >↻</button>
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={label}
              onChange={updateLabel}
              className="ac-section-label w-full bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-slate-600 py-0.5"
              style={{
                fontFamily: '"Permanent Marker", "Patrick Hand", cursive',
                fontSize: '22px',
                color: marker.ink,
                letterSpacing: '0.02em',
              }}
              aria-label="Section label"
            />
          ) : (
            <div
              className="ac-section-label"
              style={{
                fontFamily: '"Permanent Marker", "Patrick Hand", cursive',
                fontSize: '22px',
                color: marker.ink,
                letterSpacing: '0.02em',
                lineHeight: 1.1,
              }}
            >{label}</div>
          )}
          <ul className="ac-bullets mt-2 space-y-1">
            {bullets.length === 0 && !isEditing ? (
              <li className="text-xs text-slate-400 italic">(no items yet)</li>
            ) : null}
            {bullets.map((b, idx) => (
              <li key={idx} className="flex items-start gap-2 group">
                <span style={{ color: marker.hex, fontWeight: 'bold', marginTop: 4 }}>•</span>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={b}
                      onChange={(e) => updateBullet(idx, e.target.value)}
                      className="flex-1 bg-transparent outline-none border-b border-dotted border-slate-200 focus:border-slate-400 py-0.5"
                      style={{ fontFamily: '"Patrick Hand", "Caveat", cursive', fontSize: '18px', color: '#2d3748' }}
                      aria-label={`Bullet ${idx + 1}`}
                    />
                    <button
                      onClick={() => removeBullet(idx)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs px-1"
                      aria-label="Remove bullet"
                    >✕</button>
                  </>
                ) : (
                  <span style={{ fontFamily: '"Patrick Hand", "Caveat", cursive', fontSize: '18px', color: '#2d3748', lineHeight: 1.3 }}>{b}</span>
                )}
              </li>
            ))}
          </ul>
          {isEditing ? (
            <button
              onClick={addBullet}
              className="mt-2 text-[11px] font-bold px-2 py-0.5 rounded-full border"
              style={{ color: marker.hex, borderColor: marker.hex, background: 'white' }}
            >+ Add bullet</button>
          ) : null}
        </div>
      </div>
    </div>
  );
});

// ── Main view ───────────────────────────────────────────────────────────
const AnchorChartView = React.memo((props) => {
  const generatedContent = props.generatedContent;
  const handleNoteUpdate = props.handleNoteUpdate || (() => {});
  const isTeacherMode = !!props.isTeacherMode;
  const callImagen = props.callImagen || null;
  const t = props.t || ((k, d) => d || k);
  // Bridge to Concept Pictionary — when present + session active, surfaces a
  // "Play Pictionary with these terms" button that hands the chart's section
  // labels to the Pictionary host as the round's concept candidates.
  const activeSessionCode = props.activeSessionCode || null;
  const onPlayPictionary = typeof props.onPlayPictionary === 'function' ? props.onPlayPictionary : null;

  if (!generatedContent || generatedContent.type !== 'anchor-chart') return null;
  const data = generatedContent.data || {};
  const title = data.title || '';
  const chartType = data.chartType || 'reference';
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const lessonRef = data.lessonRef || {};
  const annotations = Array.isArray(data.annotations) ? data.annotations : [];

  const [isEditing, setIsEditing] = React.useState(false);
  const [showCritique, setShowCritique] = React.useState(false);
  const [regenIdx, setRegenIdx] = React.useState(-1);

  // First-mount: trigger Imagen calls for any section missing an iconUrl.
  // Each section's `iconPrompt` is biased toward the hand-drawn marker look.
  const triedRef = React.useRef({});
  React.useEffect(() => {
    if (!callImagen) return;
    sections.forEach((s, idx) => {
      if (!s) return;
      const key = `${generatedContent.id}::${s.id || idx}`;
      if (s.iconUrl || triedRef.current[key]) return;
      if (!s.iconPrompt) return;
      triedRef.current[key] = true;
      const marker = _markerFor(idx);
      const prompt = _iconPromptBiased(s.iconPrompt, marker.name);
      callImagen(prompt, 256, 0.75).then((url) => {
        if (!url) return;
        handleNoteUpdate('sections', (data.sections || []).map((sec, i) => i === idx ? { ...sec, iconUrl: url } : sec));
      }).catch(() => { /* swallow — section renders placeholder */ });
    });
  }, [generatedContent.id, sections.length, callImagen]);

  const updateSection = (idx, nextSection) => {
    const next = sections.map((s, i) => i === idx ? nextSection : s);
    handleNoteUpdate('sections', next);
  };
  const handleRegenIcon = async (idx) => {
    if (!callImagen) return;
    setRegenIdx(idx);
    try {
      const s = sections[idx] || {};
      const marker = _markerFor(idx);
      const prompt = _iconPromptBiased(s.iconPrompt || s.label, marker.name);
      const url = await callImagen(prompt, 256, 0.75);
      if (url) updateSection(idx, { ...s, iconUrl: url });
    } catch (_) { /* ignore */ }
    finally { setRegenIdx(-1); }
  };
  const handleTitleChange = (e) => handleNoteUpdate('title', e.target.value);
  const handleAddSection = () => {
    const next = sections.concat([{ id: _ac_genId('sec'), label: 'NEW SECTION', bullets: [''], iconPrompt: '', iconUrl: '' }]);
    handleNoteUpdate('sections', next);
  };
  const handleRemoveSection = (idx) => {
    handleNoteUpdate('sections', sections.filter((_, i) => i !== idx));
  };
  const handleAnnotationsChange = (nextAnnotations) => {
    handleNoteUpdate('annotations', Array.isArray(nextAnnotations) ? nextAnnotations : []);
  };

  return (
    <div className="ac-root max-w-5xl mx-auto px-4 py-6">
      <style>{`
        .ac-paper {
          background-color: #fdfaf2;
          background-image:
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.6  0 0 0 0 0.55  0 0 0 0 0.4  0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size: 240px 240px;
          border: 1px solid #e6dfc8;
          box-shadow: 0 8px 24px rgba(60,40,15,0.08), inset 0 0 0 1px rgba(255,255,255,0.6);
          border-radius: 14px;
        }
        .ac-title {
          font-family: "Permanent Marker", "Patrick Hand", cursive;
          letter-spacing: 0.02em;
        }
        @media print {
          .ac-no-print { display: none !important; }
          .ac-section { box-shadow: none !important; }
          .ac-paper { box-shadow: none !important; border: 1px solid #ccc; }
        }
      `}</style>
      <div className="ac-toolbar ac-no-print flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
          <span>📋</span> Anchor Chart
          {chartType && chartType !== 'reference' ? (
            <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-amber-900 capitalize">{chartType}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing((v) => !v)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full border ${isEditing ? 'bg-amber-600 text-white border-amber-700' : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'}`}
            aria-pressed={isEditing}
            aria-label={isEditing ? 'Finish editing' : 'Edit chart'}
          >{isEditing ? '✓ Done editing' : '✎ Edit'}</button>
          <button
            onClick={() => setShowCritique(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-full border bg-white text-sky-800 border-sky-300 hover:bg-sky-50"
            aria-label="Open critique mode"
          >📌 Critique mode</button>
          {isTeacherMode && activeSessionCode && onPlayPictionary && sections.length > 0 ? (
            <button
              onClick={() => onPlayPictionary({ concepts: sections.map(s => (s && s.label) || '').filter(Boolean) })}
              className="px-3 py-1.5 text-xs font-bold rounded-full border bg-white text-rose-800 border-rose-300 hover:bg-rose-50"
              aria-label="Play Pictionary using this chart's section labels"
              title="Open Concept Pictionary pre-loaded with this chart's terms"
            >🎨 Play Pictionary</button>
          ) : null}
          <button
            onClick={() => { try { window.print(); } catch (_) {} }}
            className="px-3 py-1.5 text-xs font-bold rounded-full border bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            aria-label="Print or save as PDF"
          >🖨️ Print</button>
        </div>
      </div>
      <div className="ac-paper p-6 sm:p-8">
        <div className="text-center mb-4">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Chart title"
              className="ac-title w-full text-center bg-transparent outline-none border-b border-dashed border-amber-300 focus:border-amber-600 py-1"
              style={{ fontSize: '42px', color: '#7a4a1e' }}
              aria-label="Chart title"
            />
          ) : (
            <h1 className="ac-title" style={{ fontSize: '42px', color: '#7a4a1e', margin: 0 }}>{title || '(untitled chart)'}</h1>
          )}
          {lessonRef.generatedAt ? (
            <div className="text-[11px] text-amber-700/70 italic mt-1">
              Created {new Date(lessonRef.generatedAt).toLocaleDateString()}
            </div>
          ) : null}
        </div>
        <div className="ac-sections">
          {sections.map((s, idx) => (
            <div key={s.id || idx} className="relative group">
              <AnchorChartSection
                section={s}
                sectionIndex={idx}
                isEditing={isEditing}
                onChange={(next) => updateSection(idx, next)}
                onRegenIcon={handleRegenIcon}
                isRegeneratingIcon={regenIdx === idx}
              />
              {isEditing ? (
                <button
                  onClick={() => handleRemoveSection(idx)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs px-1.5 py-0.5 bg-white/80 rounded-full border border-slate-200"
                  aria-label={`Remove section ${idx + 1}`}
                >✕ remove</button>
              ) : null}
            </div>
          ))}
          {isEditing ? (
            <div className="text-center mt-3">
              <button
                onClick={handleAddSection}
                className="px-4 py-1.5 text-sm font-bold rounded-full bg-white border-2 border-dashed border-amber-400 text-amber-800 hover:bg-amber-50"
              >+ Add section</button>
            </div>
          ) : null}
        </div>
        <div className="text-[11px] text-amber-700/70 italic text-center mt-4 ac-no-print">
          Saved to your history. Open Critique mode to leave I notice / I wonder notes for peers.
        </div>
      </div>
      <AnchorChartCritiqueOverlay
        isOpen={showCritique}
        onClose={() => setShowCritique(false)}
        chartId={generatedContent.id}
        annotations={annotations}
        onAnnotationsChange={handleAnnotationsChange}
        isTeacherMode={isTeacherMode}
      />
    </div>
  );
});
