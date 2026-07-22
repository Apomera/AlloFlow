import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Symbol Studio Board Builder target and action accessibility', () => {
  const source = read('symbol_studio_module.js');
  const start = source.indexOf('function renderBoardTab()');
  const end = source.indexOf('function renderScheduleTab()', start);
  const board = source.slice(start, end);

  it('gives page add/delete controls explicit behavior, names, and 32px targets', () => {
    expect(board).toContain("'aria-label': 'Add a new page'");
    expect(board).toContain("'aria-label': 'Delete current board page'");
    expect(board).toContain("width: '32px', height: '32px'");
    expect(board).not.toContain("'aria-label': '✕'");
  });

  it('uses item-specific names for every cell action', () => {
    expect(board).toContain("'Regenerate symbol for '");
    expect(board).toContain("'Record audio for '");
    expect(board).toContain("'Stop recording audio for '");
    expect(board).toContain("'Replace recorded audio for '");
    expect(board).toContain("'Play recorded audio for '");
    expect(board).toContain("'Remove ' + (word.translatedLabel || word.label) + ' from board'");
    expect(board).not.toContain("'aria-label': 'Reset progress'");
    expect(board).not.toContain("'aria-label': '🔊'");
  });

  it('gives all five corner cell actions at least 28px targets without overlap', () => {
    expect(board.split("width: '28px', height: '28px'")).toHaveLength(6);
    expect(board).toContain("top: 4, right: 36");
    expect(board).toContain("top: 36, left: 4");
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/symbol_studio_module.js'));
  });
});
