/**
 * AlloFlow — Prompt Dialog Module
 *
 * Polished replacement for native `window.prompt()`. Renders when parent
 * passes a `promptDialog` object. Returns the entered value via onSubmit
 * or null via onCancel.
 *
 * Required props:
 *   promptDialog — {
 *                    message,        (string, required)
 *                    onSubmit,       ((value: string) => void, required)
 *                    defaultValue?,  (string — pre-fills input)
 *                    title?,         (string — overrides default "Enter Value")
 *                    placeholder?,   (string)
 *                    confirmText?,   (string — default "OK")
 *                    cancelText?,    (string — default "Cancel")
 *                    multiline?,     (boolean — uses textarea)
 *                    maxLength?,     (number)
 *                    inputType?,     ('text' | 'url' | 'email' | 'number' — default 'text')
 *                    onCancel?,      (() => void)
 *                    validate?,      ((value: string) => string | null — return error msg or null)
 *                  }
 *   setPromptDialog — (null) to dismiss
 *   t — translation function
 *
 * Icons read from window globals: Edit3, X
 */
function PromptDialog({ promptDialog, setPromptDialog, t }) {
  const Edit3 = window.Edit3 || (() => null);
  const X     = window.X     || (() => null);

  const [value, setValue] = React.useState(promptDialog.defaultValue != null ? String(promptDialog.defaultValue) : '');
  const [error, setError] = React.useState(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    try {
      inputRef.current && inputRef.current.focus();
      if (inputRef.current && inputRef.current.select) inputRef.current.select();
    } catch (_) {}
  }, []);

  const handleCancel = React.useCallback(() => {
    if (typeof promptDialog.onCancel === 'function') { try { promptDialog.onCancel(); } catch (_) {} }
    setPromptDialog(null);
  }, [promptDialog, setPromptDialog]);

  const handleSubmit = React.useCallback(() => {
    if (typeof promptDialog.validate === 'function') {
      const err = promptDialog.validate(value);
      if (err) { setError(err); return; }
    }
    try { promptDialog.onSubmit(value); } catch (_) {}
    setPromptDialog(null);
  }, [promptDialog, setPromptDialog, value]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
      else if (e.key === 'Enter' && !promptDialog.multiline) { e.preventDefault(); handleSubmit(); }
      else if (e.key === 'Enter' && promptDialog.multiline && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCancel, handleSubmit, promptDialog.multiline]);

  const InputTag = promptDialog.multiline ? 'textarea' : 'input';
  const inputCommonProps = {
    ref: inputRef,
    value,
    onChange: (e) => { setValue(e.target.value); if (error) setError(null); },
    placeholder: promptDialog.placeholder || '',
    maxLength: promptDialog.maxLength,
    className: 'w-full border-2 border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-800 placeholder:text-slate-600',
    'aria-label': promptDialog.message,
    'aria-invalid': !!error,
    'aria-describedby': error ? 'alloflow-prompt-error' : undefined,
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alloflow-prompt-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border-2 border-slate-200"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <Edit3 size={20} className="text-indigo-600" />
          </div>
          <h3 id="alloflow-prompt-title" className="text-lg font-bold text-slate-800 flex-1 truncate">
            {promptDialog.title || t('common.enter_value') || 'Enter Value'}
          </h3>
          <button
            type="button"
            aria-label={t('common.close') || 'Close'}
            onClick={handleCancel}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">{promptDialog.message}</p>
        {promptDialog.multiline
          ? <textarea {...inputCommonProps} rows={4} />
          : <input {...inputCommonProps} type={promptDialog.inputType || 'text'} />
        }
        {error && (
          <p id="alloflow-prompt-error" role="alert" className="text-xs text-red-600 mt-2 font-semibold">{error}</p>
        )}
        <div className="flex gap-3 justify-end mt-5">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            {promptDialog.cancelText || t('common.cancel') || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-300"
          >
            {promptDialog.confirmText || t('common.ok') || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
