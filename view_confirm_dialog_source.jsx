/**
 * AlloFlow — Confirm Dialog Module
 *
 * Reusable confirm dialog. Renders when parent passes a `confirmDialog`
 * object with at minimum `{ message, onConfirm }`.
 *
 * Extracted from AlloFlowANTI.txt lines 20299-20325 (May 2026).
 * Enhanced May 2026 polish pass: tone, custom button labels, onCancel,
 * title override, secondary message, Escape/Enter keyboard handling,
 * focus management.
 *
 * Required props:
 *   confirmDialog    — {
 *                        message,         (string, required)
 *                        onConfirm,       (() => void, required)
 *                        title?,          (string — overrides default "Confirm")
 *                        detail?,         (string — small print under message)
 *                        confirmText?,    (string — default "Confirm")
 *                        cancelText?,     (string — default "Cancel")
 *                        tone?,           ('danger' | 'warning' | 'info' — default 'warning')
 *                        onCancel?,       (() => void)
 *                      }
 *   setConfirmDialog — (null) to dismiss
 *   t                — translation function from LanguageContext
 *
 * Icons (read from window globals): AlertCircle, AlertTriangle, Info
 */
function ConfirmDialog({ confirmDialog, setConfirmDialog, t }) {
  const AlertCircle    = window.AlertCircle    || (() => null);
  const AlertTriangle  = window.AlertTriangle  || AlertCircle;
  const Info           = window.Info           || AlertCircle;

  const tone = confirmDialog.tone || 'warning';
  const iconMap = { danger: AlertTriangle, warning: AlertCircle, info: Info };
  const colorMap = {
    danger:  { iconBg: 'bg-red-100',   iconText: 'text-red-600',   btn: 'bg-red-500 hover:bg-red-600 shadow-red-500/25' },
    warning: { iconBg: 'bg-amber-100', iconText: 'text-amber-600', btn: 'bg-red-500 hover:bg-red-600 shadow-red-500/25' },
    info:    { iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25' },
  };
  const Icon = iconMap[tone] || AlertCircle;
  const palette = colorMap[tone] || colorMap.warning;

  const handleCancel = React.useCallback(() => {
    if (typeof confirmDialog.onCancel === 'function') { try { confirmDialog.onCancel(); } catch (_) {} }
    setConfirmDialog(null);
  }, [confirmDialog, setConfirmDialog]);

  const handleConfirm = React.useCallback(() => {
    try { confirmDialog.onConfirm(); } catch (_) {}
    setConfirmDialog(null);
  }, [confirmDialog, setConfirmDialog]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
      else if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCancel, handleConfirm]);

  const confirmBtnRef = React.useRef(null);
  React.useEffect(() => { try { confirmBtnRef.current && confirmBtnRef.current.focus(); } catch (_) {} }, []);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alloflow-confirm-title"
        aria-describedby="alloflow-confirm-message"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border-2 border-slate-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full ${palette.iconBg} flex items-center justify-center shrink-0`}>
            <Icon size={20} className={palette.iconText} />
          </div>
          <h3 id="alloflow-confirm-title" className="text-lg font-bold text-slate-800">
            {confirmDialog.title || t('common.confirm') || 'Confirm'}
          </h3>
        </div>
        <p id="alloflow-confirm-message" className="text-sm text-slate-700 leading-relaxed mb-2 whitespace-pre-wrap">
          {confirmDialog.message}
        </p>
        {confirmDialog.detail ? (
          <p className="text-xs text-slate-600 leading-relaxed mb-6 whitespace-pre-wrap">{confirmDialog.detail}</p>
        ) : <div className="mb-6" />}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            {confirmDialog.cancelText || t('common.cancel') || 'Cancel'}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2.5 ${palette.btn} text-white font-semibold rounded-xl transition-colors shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-red-300`}
          >
            {confirmDialog.confirmText || t('common.confirm_action') || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
