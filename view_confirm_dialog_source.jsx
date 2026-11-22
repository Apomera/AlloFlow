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
function ConfirmDialog({ confirmDialog: rawConfirmDialog, setConfirmDialog, t }) {
  const AlertCircle    = (window.AlloIcons && window.AlloIcons.AlertCircle)   || window.AlertCircle   || (() => null);
  const AlertTriangle  = (window.AlloIcons && window.AlloIcons.AlertTriangle) || window.AlertTriangle || AlertCircle;
  const Info           = (window.AlloIcons && window.AlloIcons.Info)          || window.Info          || AlertCircle;

  const confirmDialog = rawConfirmDialog && typeof rawConfirmDialog === 'object' ? rawConfirmDialog : {};
  const dialogConfig = confirmDialog;
  const tone = dialogConfig.tone || 'warning';
  const iconMap = { danger: AlertTriangle, warning: AlertCircle, info: Info };
  const colorMap = {
    danger:  {
      iconBg: 'bg-red-100',
      iconText: 'text-red-700',
      btn: 'bg-red-700 hover:bg-red-800 shadow-red-500/25',
      cardBorder: 'border-red-200',
      badgeBg: 'bg-red-50 text-red-800 border-red-200',
      badgeKey: 'confirm.tone_danger',
      badgeFallback: 'Caution',
    },
    warning: {
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-800',
      btn: 'bg-red-700 hover:bg-red-800 shadow-red-500/25',
      cardBorder: 'border-amber-200',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
      badgeKey: 'confirm.tone_warning',
      badgeFallback: 'Check before continuing',
    },
    info:    {
      iconBg: 'bg-indigo-100',
      iconText: 'text-indigo-700',
      btn: 'bg-indigo-700 hover:bg-indigo-800 shadow-indigo-500/25',
      cardBorder: 'border-indigo-200',
      badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      badgeKey: 'confirm.tone_info',
      badgeFallback: 'Confirmation',
    },
  };
  const Icon = iconMap[tone] || AlertCircle;
  const palette = colorMap[tone] || colorMap.warning;

  const tx = typeof t === 'function' ? t : () => '';
  const safeTx = (key, fallback) => {
    const val = tx(key);
    return (typeof val === 'string' && val && val !== key) ? val : fallback;
  };
  const toneBadgeLabel = dialogConfig.toneLabel || safeTx(palette.badgeKey, palette.badgeFallback);
  const dialogConfigRef = React.useRef(dialogConfig);
  dialogConfigRef.current = dialogConfig;
  const setConfirmDialogRef = React.useRef(setConfirmDialog);
  setConfirmDialogRef.current = setConfirmDialog;
  const settledRef = React.useRef(false);
  const backdropDownRef = React.useRef(null);

  const handleCancel = React.useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    const cfg = dialogConfigRef.current;
    if (typeof cfg.onCancel === 'function') { try { cfg.onCancel(); } catch (_) {} }
    if (typeof setConfirmDialogRef.current === 'function') setConfirmDialogRef.current(null);
  }, []);

  const handleConfirm = React.useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    const cfg = dialogConfigRef.current;
    if (typeof cfg.onConfirm === 'function') { try { cfg.onConfirm(); } catch (_) {} }
    if (typeof setConfirmDialogRef.current === 'function') setConfirmDialogRef.current(null);
  }, []);

  const handleCancelRef = React.useRef(handleCancel);
  handleCancelRef.current = handleCancel;

  const backdropRef = React.useRef(null);
  const dialogRef = React.useRef(null);
  const cancelBtnRef = React.useRef(null);
  const didMountRef = React.useRef(false);
  React.useEffect(() => {
    const dialog = dialogRef.current;
    const backdrop = backdropRef.current;
    if (!dialog || !backdrop) return undefined;
    const previousFocus = document.activeElement;
    // Keep the accessibility tree modal as well as the keyboard interaction:
    // sibling app surfaces across ancestor containers up through document.body
    // are inert while this top-level alertdialog is open.
    const backgroundState = [];
    const seenNodes = new Set();
    let branch = backdrop;
    while (branch && branch.parentElement) {
      const parent = branch.parentElement;
      Array.from(parent.children).forEach((node) => {
        const liveSel = '[aria-live], [role="status"], [role="alert"], [data-toast-region]';
        if (!node || node === branch || seenNodes.has(node) || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(node.tagName) || (typeof node.matches === 'function' && node.matches(liveSel)) || (typeof node.querySelector === 'function' && !!node.querySelector(liveSel))) return;
        seenNodes.add(node);
        backgroundState.push({
          node,
          hadInert: node.hasAttribute('inert'),
          prevInert: node.inert,
          ariaHidden: node.getAttribute('aria-hidden'),
        });
        try { node.inert = true; } catch (_) {}
        node.setAttribute('inert', '');
        node.setAttribute('aria-hidden', 'true');
      });
      if (parent === document.body) break;
      branch = parent;
    }
    // Shared scroll-lock counter: only the last dialog to close unlocks the page.
    const alloScrollLock = window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '' });
    const alloScrollLocked = !!document.body;
    if (alloScrollLocked && ++alloScrollLock.count === 1) { alloScrollLock.prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    // Register on the shared trap stack so a useFocusTrap-owned parent modal
    // (e.g. the Class Mailbox panel) defers while this dialog is on top —
    // otherwise its document-level handler yanks Tab focus back and its
    // Escape closes the parent underneath this dialog.
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    (cancelBtnRef.current || dialog).focus();
    const getFocusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')).filter((element) => {
      if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const closedDetails = element.closest('details:not([open])');
      if (closedDetails && !(element.tagName === 'SUMMARY' && element.parentElement === closedDetails)) return false;
      const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
      if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
      const hasLayout = typeof dialog.getBoundingClientRect === 'function' && (dialog.getBoundingClientRect().width > 0 || dialog.getBoundingClientRect().height > 0);
      if (hasLayout && typeof element.getClientRects === 'function' && element.getClientRects().length === 0) return false;
      return true;
    });
    const onKeyDown = (event) => {
      if (!dialog.isConnected) return;
      if (event.isComposing || event.keyCode === 229 || !isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); handleCancelRef.current(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (alloScrollLocked) { alloScrollLock.count = Math.max(0, alloScrollLock.count - 1); if (alloScrollLock.count === 0 && document.body) document.body.style.overflow = alloScrollLock.prev; }
      backgroundState.forEach(({ node, hadInert, ariaHidden }) => {
        if (!node || !node.isConnected) return;
        if (!hadInert) node.removeAttribute('inert');
        if (!hadInert) { try { node.inert = false; } catch (_) {} }
        if (ariaHidden == null) node.removeAttribute('aria-hidden');
        else if (ariaHidden !== 'true') node.setAttribute('aria-hidden', ariaHidden);
      });
      const wasTopTrap = isTopTrap();
      const trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previousFocus !== document.body && previousFocus !== document.documentElement) {
        if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
      }
    };
  }, []);
  React.useEffect(() => {
    settledRef.current = false;
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (cancelBtnRef.current && typeof cancelBtnRef.current.focus === 'function') {
      try { cancelBtnRef.current.focus(); } catch (_) {}
    }
  }, [rawConfirmDialog]);

  return (
    <div
      ref={backdropRef}
      role="presentation"
      className="fixed inset-0 z-[10050] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 motion-reduce:animate-none"
      onMouseDown={(e) => { backdropDownRef.current = (e.target === e.currentTarget); }}
      onClick={(e) => {
        const allowBackdropClose = backdropDownRef.current !== false;
        backdropDownRef.current = null;
        if (e.target === e.currentTarget && allowBackdropClose) handleCancel();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alloflow-confirm-title"
        aria-describedby={confirmDialog.detail ? 'alloflow-confirm-message alloflow-confirm-detail' : 'alloflow-confirm-message'}
        className={`allo-docsuite bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6 animate-in zoom-in-95 duration-200 motion-reduce:animate-none border-2 ${palette.cardBorder}`}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full ${palette.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
            <Icon size={20} className={palette.iconText} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <span
              data-confirm-tone={tone}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border mb-1 ${palette.badgeBg}`}
            >
              {toneBadgeLabel}
            </span>
            <h2 id="alloflow-confirm-title" className="text-lg font-bold text-slate-800 leading-snug">
              {dialogConfig.title || tx('common.confirm') || 'Confirm'}
            </h2>
          </div>
        </div>
        <p id="alloflow-confirm-message" className="text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-wrap">
          {dialogConfig.message}
        </p>
        {dialogConfig.detail ? (
          <p id="alloflow-confirm-detail" className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 leading-relaxed mb-5 whitespace-pre-wrap">{dialogConfig.detail}</p>
        ) : <div className="mb-5" />}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={handleCancel}
            className="min-h-11 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-600"
          >
            {dialogConfig.cancelText || tx('common.cancel') || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`min-h-11 px-5 py-2.5 ${palette.btn} text-white font-semibold rounded-xl transition-colors motion-reduce:transition-none shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-700`}
          >
            {dialogConfig.confirmText || tx('common.confirm_action') || 'Confirm'}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-600 flex items-center justify-end gap-1.5">
          <span>{safeTx('confirm.esc_hint_prefix', 'Press')}</span>
          <kbd className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 font-mono text-xs text-slate-700">Esc</kbd>
          <span>{safeTx('confirm.esc_hint_suffix', 'to cancel')}</span>
        </p>
      </div>
    </div>
  );
}
