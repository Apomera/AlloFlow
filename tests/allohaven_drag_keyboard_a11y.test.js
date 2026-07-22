import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'allohaven_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'prismflow-deploy/public/allohaven_module.js'), 'utf8');

describe('AlloHaven non-drag movement alternatives', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('provides native Move up/down buttons for flashcards', () => {
    expect(source).toContain("'aria-label': 'Move card ' + (idx + 1) + ' up'");
    expect(source).toContain("'aria-label': 'Move card ' + (idx + 1) + ' down'");
    expect(source).toContain("'data-ah-card-id': card.id");
    expect(source).toContain("notifyAlloHaven('Card ' + (fromIdx + 1) + ' moved to position '");
  });

  it('supports complete keyboard movement across room grids and surfaces', () => {
    expect(source).toContain('function moveDecorationByKeyboard(decoration, surface, index, key)');
    expect(source).toContain("var cols = surface === 'wall' ? 4 : 6");
    expect(source).toContain("key === 'PageUp'");
    expect(source).toContain("key === 'PageDown'");
    expect(source).toContain("moveDecorationToCell(decoration.id, targetSurface, targetIndex)");
  });

  it('exposes keyboard shortcuts, instructions, announcements, and focus restoration', () => {
    expect(source).toContain("'aria-keyshortcuts': 'Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+PageUp Alt+PageDown'");
    expect(source).toContain("'data-ah-decoration-id': decoration.id");
    expect(source).toContain('Alt plus Page Up or Page Down moves between wall and floor');
    expect(source).toContain("document.querySelectorAll('[data-ah-decoration-id]')");
  });
});
