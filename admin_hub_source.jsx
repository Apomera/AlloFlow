/**
 * AlloFlow — Leadership Hub (admin tools container) — Aug 2026.
 *
 * One entry point for the school-leadership tool suite, mirroring the
 * STEM Lab / SEL Hub container pattern: the Educator Hub shows ONE
 * "Leadership Hub" card, and this shell's grid lazy-opens the individual
 * admin tools (each stays its own CDN module with its own tests + pin).
 *
 * The suite covenant is stated ONCE here instead of per-tool: aggregate
 * or de-identified data, computed on this device, descriptive and
 * growth-framed — never an automated verdict about a teacher or student.
 */

function AdminHubPanel(props) {
  const { onClose, t, openTool = (() => {}) } = props;
  const tt = React.useCallback((key, fallback) => {
    if (typeof t === 'function') {
      try { const v = t(key); if (v) return v; } catch (_) {}
    }
    return fallback;
  }, [t]);
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.closest('[hidden], [inert], [aria-hidden="true"]'));
    const first = getFocusable()[0];
    (first || dialog).focus();
    const onKeyDown = (event) => {
      if (!isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) { event.preventDefault(); dialog.focus(); return; }
      const firstItem = focusable[0], lastItem = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? lastItem : firstItem).focus(); }
      else if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const wasTop = isTopTrap();
      const idx = trapStack.indexOf(trap);
      if (idx !== -1) trapStack.splice(idx, 1);
      if (wasTop && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [onClose]);

  const TOOLS = [
    {
      id: 'mtss', icon: '🧮',
      title: tt('adminhub.mtss_title', 'MTSS Triage'),
      desc: tt('adminhub.mtss_desc', 'Screening scores against YOUR benchmark cut points: suggested risk bands for team review (never automatic placement), intervention grouping, and window-over-window progress.'),
      accent: 'from-violet-50 to-purple-50 border-violet-600', titleCls: 'text-violet-800', descCls: 'text-violet-700',
    },
    {
      id: 'announcements', icon: '📣',
      title: tt('adminhub.announcements_title', 'Family Announcements'),
      desc: tt('adminhub.announcements_desc', 'One announcement, every family language: AI-translated with human review, exported as accessible lang-tagged documents with a translation disclosure — the whole-building packet the Bridge’s live messaging doesn’t cover.'),
      accent: 'from-emerald-50 to-lime-50 border-emerald-700', titleCls: 'text-emerald-900', descCls: 'text-emerald-800',
    },
    {
      id: 'walkthrough', icon: '🚪',
      title: tt('adminhub.walkthrough_title', 'UDL Walkthrough'),
      desc: tt('adminhub.walkthrough_desc', 'Growth-framed classroom visits scored against UDL 3.0 look-fors — feedback cards for teachers, a building heatmap, trends, and inter-rater checks for research use.'),
      accent: 'from-cyan-50 to-sky-50 border-cyan-600', titleCls: 'text-cyan-800', descCls: 'text-cyan-700',
    },
    {
      id: 'dispro', icon: '⚖️',
      title: tt('adminhub.dispro_title', 'Disproportionality Analyzer'),
      desc: tt('adminhub.dispro_desc', 'Risk indexes, risk ratios, and composition from aggregate discipline or identification counts — stability cautions, alternate ratios for small groups, multi-year trends.'),
      accent: 'from-slate-50 to-indigo-50 border-slate-600', titleCls: 'text-slate-800', descCls: 'text-slate-600',
    },
    {
      id: 'timelines', icon: '⏰',
      title: tt('adminhub.timelines_title', 'SpEd Timelines'),
      desc: tt('adminhub.timelines_desc', 'Evaluation clocks, IEP annuals, and triennials on one urgency dashboard with per-provider caseloads — student codes only; due dates are editable prefills you confirm against your state rule.'),
      accent: 'from-amber-50 to-orange-50 border-amber-600', titleCls: 'text-amber-800', descCls: 'text-amber-700',
    },
    {
      id: 'meetings', icon: '📋',
      title: tt('adminhub.meetings_title', 'Meeting Documentation'),
      desc: tt('adminhub.meetings_desc', 'Turn notes or a transcript into your district’s meeting format — SST, IEP team, 504, and custom templates — with source-anchored decisions, an action-item tracker, and local name masking before any AI call.'),
      accent: 'from-emerald-50 to-teal-50 border-emerald-600', titleCls: 'text-emerald-800', descCls: 'text-emerald-700',
    },
  ];

  return (
    <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-3 sm:p-4" style={{ zIndex: 260 }} role="presentation" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} data-help-key="adminhub_panel" className="allo-docsuite bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ maxHeight: '90vh' }} role="dialog" aria-modal="true" aria-labelledby="adminhub-title" aria-describedby="adminhub-subtitle" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="adminhub-title" className="text-xl font-bold text-slate-800 flex items-center gap-2"><span aria-hidden="true">🏛️</span> {tt('adminhub.title', 'Leadership Hub')}</h2>
            <p id="adminhub-subtitle" className="text-sm text-slate-600 mt-1">{tt('adminhub.subtitle', 'Tools for principals, coaches, and student-services leaders')}</p>
          </div>
          <button type="button" onClick={onClose} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xl" aria-label={tt('adminhub.close_aria', 'Close Leadership Hub')}>✕</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <button key={tool.id} type="button" data-help-key="adminhub_tool_card"
              onClick={() => openTool(tool.id)}
              className={'flex items-start gap-3 p-4 bg-gradient-to-br border rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left ' + tool.accent}>
              <span className="text-3xl mt-1" aria-hidden="true">{tool.icon}</span>
              <div>
                <h3 className={'font-bold ' + tool.titleCls}>{tool.title}</h3>
                <p className={'text-xs mt-1 ' + tool.descCls}>{tool.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-5 text-[11px] text-slate-500 border-t border-slate-200 pt-3">
          {tt('adminhub.covenant', 'How this suite handles data: tools work from aggregate counts or de-identified codes, everything is computed on this device, and results are descriptive and growth-framed — a prompt for professional judgment and root-cause review, never an automated verdict about a teacher or a student.')}
        </p>
      </div>
    </div>
  );
}
