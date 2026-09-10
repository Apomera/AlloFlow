const { useEffect, useRef } = window.React;

// Handle nested dismissal before the setup dialog's native Escape listener.
export function useBoardEscape(ref, onEscape, active = true) {
  const callback = useRef(onEscape); callback.current = onEscape;
  useEffect(() => {
    const element = ref.current; if (!active || !element) return;
    const key = event => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); callback.current?.();
    };
    element.addEventListener('keydown', key);
    return () => element.removeEventListener('keydown', key);
  }, [ref, active]);
}
