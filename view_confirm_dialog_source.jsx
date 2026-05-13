/**
 * AlloFlow — Confirm Dialog Module
 *
 * Reusable confirm dialog. Renders when parent passes a `confirmDialog`
 * object with `{ message, onConfirm }`. Two buttons: Cancel and Confirm.
 *
 * Extracted from AlloFlowANTI.txt lines 20299-20325 (May 2026).
 *
 * Required props:
 *   confirmDialog    — { message, onConfirm }
 *   setConfirmDialog — (null) to dismiss
 *   t                — translation function from LanguageContext
 *
 * Icons (read from window globals): AlertCircle
 */
function ConfirmDialog({ confirmDialog, setConfirmDialog, t }) {
  const AlertCircle = window.AlertCircle || (() => null);
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && setConfirmDialog(null)}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border-2 border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertCircle size={20} className="text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">{t('common.confirm') || 'Confirm'}</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{confirmDialog.message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setConfirmDialog(null)}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
            className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-red-500/25"
          >
            {t('common.confirm_action') || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
