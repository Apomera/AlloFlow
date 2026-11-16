const { useEffect } = window.React;
export function useRoomDialog(dialogRef, closeRef) {
  useEffect(() => {
    const dialog = dialogRef.current, previous = document.activeElement, changed = new Map();
    const stack = typeof window !== 'undefined' ? (window.__alloFocusTrapStack = window.__alloFocusTrapStack || []) : [];
    const trap = { root: dialog };
    stack.push(trap);
    const isTopTrap = () => !Array.isArray(window.__alloFocusTrapStack) || window.__alloFocusTrapStack.length === 0 || window.__alloFocusTrapStack[window.__alloFocusTrapStack.length - 1] === trap;
    const isolate = () => {
      for (let branch = dialog; branch?.parentElement && branch !== document.body; branch = branch.parentElement) {
        for (const sibling of branch.parentElement.children) if (sibling !== branch && !changed.has(sibling) && !['SCRIPT', 'STYLE'].includes(sibling.tagName)) { changed.set(sibling, sibling.inert); sibling.inert = true; }
      }
    };
    isolate();
    const observer = new MutationObserver(isolate); observer.observe(document.body, { childList: true, subtree: true });
    const focusable = () => [...dialog.querySelectorAll('button,input,select,textarea,summary,a[href],[tabindex]')].filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && !el.hidden && el.getAttribute('aria-hidden') !== 'true' && !el.closest('[inert]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && ![...dialog.querySelectorAll('details:not([open])')].some(d => d.contains(el) && el !== d.querySelector('summary')));
    dialog.querySelector('button')?.focus();
    const key = event => {
      if (event.defaultPrevented) return;
      if (event.nativeEvent?.isComposing || event.isComposing || event.keyCode === 229) return;
      if (!isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current?.(); }
      if (event.key !== 'Tab') return;
      const items = focusable(), index = items.indexOf(document.activeElement);
      if (!items.length) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && (index === items.length - 1 || !dialog.contains(document.activeElement))) { event.preventDefault(); items[0].focus(); }
    };
    const contain = event => {
      if (!isTopTrap()) return;
      if (!dialog.contains(event.target)) (focusable()[0] || dialog).focus();
    };
    dialog.addEventListener('keydown', key); document.addEventListener('focusin', contain);
    return () => { observer.disconnect(); dialog.removeEventListener('keydown', key); document.removeEventListener('focusin', contain); const idx = stack.lastIndexOf(trap); if (idx !== -1) stack.splice(idx, 1); changed.forEach((value, el) => { el.inert = value; }); if (previous?.isConnected && typeof previous.focus === 'function') previous.focus(); };
  }, []);
}
