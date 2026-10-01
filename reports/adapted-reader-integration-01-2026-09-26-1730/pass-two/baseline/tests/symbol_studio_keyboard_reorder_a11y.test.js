import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Symbol Studio keyboard reorder accessibility', () => {
  const source = read('symbol_studio_module.js');
  const boardStart = source.indexOf('function renderBoardTab()');
  const boardEnd = source.indexOf('function renderScheduleTab()', boardStart);
  const board = source.slice(boardStart, boardEnd);

  it('provides keyboard instructions and live reorder announcements', () => {
    expect(source).toContain("id: 'ss-page-reorder-help'");
    expect(source).toContain("id: 'ss-cell-reorder-help'");
    expect(source).toContain('var announceBoardReorder = function (message)');
    expect(source).toContain("ssLiveRef.current.textContent = message");
  });

  it('reorders pages with Alt plus Left or Right Arrow through the shared path', () => {
    expect(source).toContain("'aria-keyshortcuts': 'Alt+ArrowLeft Alt+ArrowRight'");
    expect(source).toContain("'aria-describedby': 'ss-page-reorder-help'");
    expect(source).toContain("moveBoardPage(fromIdx, pi)");
    expect(source).toContain("moveBoardPage(pi, Math.max(0");
    expect(source).toContain("focusReorderedControl('[data-board-page-id]', movedPage.id)");
  });

  it('reorders cells in all four directions from a separate native Speak control', () => {
    expect(source).toContain("'aria-keyshortcuts': 'Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown'");
    expect(source).toContain("'aria-describedby': 'ss-cell-reorder-help'");
    expect(source).toContain("ev.key === 'ArrowUp' ? -boardCols");
    expect(source).toContain("ev.key === 'ArrowDown' ? boardCols");
    expect(source).toContain("moveBoardWordByKeyboard(word.id, delta)");
    expect(source).toContain("role: 'group'");
    expect(board).not.toContain("role: 'button', tabIndex: 0, 'aria-label': 'Speak '");
  });

  it('routes pointer and touch reordering through the same announced helper', () => {
    expect(source).toContain('reorderBoardWord(dragBoardId, word.id)');
    expect(source).toContain('reorderBoardWord(fromId, toId)');
    expect(source).toContain("focusReorderedControl('[data-board-speak-id]', movedWord.id)");
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/symbol_studio_module.js'));
  });
});
