// Board styles are scoped under .lb, so each block is added to the page once and kept, in the
// order first requested. Views that mount and unmount (board, tabletop, list, dialogs) then cost
// no style recalculation. Returns null so a style component can render it directly.
const blocks = new Map();
export function addBoardStyle(css) {
  if (typeof document === 'undefined' || !document.head) return null;
  const known = blocks.get(css);
  if (known?.isConnected) return null;
  const style = known || document.createElement('style');
  if (!known) { style.setAttribute('data-lesson-board-style', String(blocks.size)); style.textContent = css; blocks.set(css, style); }
  document.head.appendChild(style);
  return null;
}
