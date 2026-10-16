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
 *                    choices?,       (array of { value, label, description? } — renders radio cards)
 *                    onCancel?,      (() => void)
 *                    validate?,      ((value: string) => string | null — return error msg or null)
 *                  }
 *   setPromptDialog — (null) to dismiss
 *   t — translation function
 *
 * Icons read from window globals: Edit3, X
 */
const _promptUseFocusTrap = (typeof window !== 'undefined' && window.__alloHooks && window.__alloHooks.useFocusTrap) || function () {};

function PromptDialog({ promptDialog, setPromptDialog, t }) {
  const Edit3 = window.Edit3 || (() => null);
  const X     = window.X     || (() => null);

  const [value, setValue] = React.useState(promptDialog.defaultValue != null ? String(promptDialog.defaultValue) : '');
  const [error, setError] = React.useState(null);
  const inputRef = React.useRef(null);
  const dialogRef = React.useRef(null);
  const settledRef = React.useRef(false);
  const choiceMode = Array.isArray(promptDialog.choices);
  const choices = choiceMode ? promptDialog.choices.filter(choice => choice && choice.value != null && String(choice.value)) : [];
  const validChoice = choices.some(choice => String(choice.value) === value);

  const handleCancel = React.useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (typeof promptDialog.onCancel === 'function') { try { promptDialog.onCancel(); } catch (_) {} }
    setPromptDialog(null);
  }, [promptDialog, setPromptDialog]);

  const handleSubmit = React.useCallback(() => {
    if (settledRef.current) return;
    if (choiceMode && !validChoice) {
      setError('Choose a source before continuing.');
      return;
    }
    if (typeof promptDialog.validate === 'function') {
      const err = promptDialog.validate(value);
      if (err) { setError(err); return; }
    }
    settledRef.current = true;
    try { promptDialog.onSubmit(value); } catch (_) {}
    setPromptDialog(null);
  }, [promptDialog, setPromptDialog, value, choiceMode, validChoice]);

  _promptUseFocusTrap(dialogRef, true, handleCancel);

  React.useEffect(() => {
    settledRef.current = false;
    setValue(promptDialog.defaultValue != null ? String(promptDialog.defaultValue) : '');
    setError(null);
    try {
      inputRef.current && inputRef.current.focus();
      if (inputRef.current && inputRef.current.select) inputRef.current.select();
    } catch (_) {}
  }, [promptDialog]);

  const handleDialogKeyDown = React.useCallback((e) => {
    // Choice cards use native button activation: Enter on Cancel or Close must
    // not confirm the selected reading through this dialog-level shortcut.
    if (choiceMode && e.target?.closest?.('button')) return;
    if (e.key === 'Enter' && !promptDialog.multiline) { e.preventDefault(); handleSubmit(); }
    else if (e.key === 'Enter' && promptDialog.multiline && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit, promptDialog.multiline, choiceMode]);

  // role="alert" on the error element only triggers SR announcement when the
  // element is INSERTED into the DOM. If the dialog is already open when the
  // error appears (rev validation, etc.), the role="alert" won't re-fire.
  // Push it through the global aria-live region so SR users hear validation
  // failures even on subsequent submit attempts.
  React.useEffect(() => {
    if (error && typeof window !== 'undefined' && typeof window.alloAnnounce === 'function') {
      window.alloAnnounce(error, 'assertive');
    }
  }, [error]);

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
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 motion-reduce:animate-none"
      onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alloflow-prompt-title"
        aria-describedby="alloflow-prompt-description"
        onKeyDown={handleDialogKeyDown}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6 animate-in zoom-in-95 duration-200 motion-reduce:animate-none border-2 border-slate-200"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <Edit3 size={20} className="text-indigo-600" aria-hidden="true" />
          </div>
          <h3 id="alloflow-prompt-title" className={'text-lg font-bold text-slate-800 flex-1 ' + (choiceMode ? 'min-w-0 break-words' : 'truncate')}>
            {promptDialog.title || t('common.enter_value') || 'Enter Value'}
          </h3>
          <button
            type="button"
            aria-label={t('common.close') || 'Close'}
            onClick={handleCancel}
            className="w-11 h-11 shrink-0 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <p id="alloflow-prompt-description" className="text-sm text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">{promptDialog.message}</p>
        {choiceMode ? (
          <fieldset className="min-w-0 space-y-3" aria-describedby={error ? 'alloflow-prompt-error' : undefined}>
            <legend className="sr-only">{promptDialog.message}</legend>
            {choices.map((choice, index) => {
              const choiceValue = String(choice.value);
              const checked = value === choiceValue;
              return <label key={choiceValue} className={'flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-colors focus-within:ring-4 focus-within:ring-indigo-500/20 ' + (checked ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-400')}>
                <input
                  ref={index === 0 ? inputRef : undefined}
                  data-autofocus={index === 0 ? true : undefined}
                  type="radio"
                  name="alloflow-prompt-choice"
                  value={choiceValue}
                  checked={checked}
                  onChange={() => { setValue(choiceValue); setError(null); }}
                  aria-labelledby={'alloflow-prompt-choice-' + index}
                  aria-describedby={choice.description ? 'alloflow-prompt-preview-' + index : undefined}
                  className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
                />
                <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                  <span id={'alloflow-prompt-choice-' + index} className="block text-sm font-semibold text-slate-900">{choice.label || choiceValue}</span>
                  {choice.description && <span id={'alloflow-prompt-preview-' + index} className="mt-1 block text-xs leading-relaxed text-slate-700">{choice.description}</span>}
                </span>
              </label>;
            })}
          </fieldset>
        ) : promptDialog.multiline
          ? <textarea {...inputCommonProps} rows={4} />
          : <input {...inputCommonProps} type={promptDialog.inputType || 'text'} />
        }
        {error && (
          <p id="alloflow-prompt-error" role="alert" className="text-xs text-red-600 mt-2 font-semibold">{error}</p>
        )}
        <div className={'flex gap-3 justify-end mt-5' + (choiceMode ? ' flex-col sm:flex-row' : '')}>
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-11 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            {promptDialog.cancelText || t('common.cancel') || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={choiceMode && !validChoice}
            className="min-h-11 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {promptDialog.confirmText || t('common.ok') || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

PromptDialog.supportsChoices = true;
