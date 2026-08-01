import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'view_history_panel_module.js';
const PUBLIC = 'desktop/web-app/public/view_history_panel_module.js';

describe('History panel move-to-unit control', () => {
  it('keeps the source and public view mirrors in sync', () => {
    expect(readFileSync(PUBLIC, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('exposes a named, stateful, keyboard-sized button', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain('"data-help-key": "history_move_to_unit_btn"');
    expect(source).toContain('"aria-label": `${t("history.tooltips.move_to_unit") || "Move to unit"}: ${itemTitle}`');
    expect(source).toContain('"aria-expanded": movingItemId === item.id');
    expect(source).toContain('type: "button"');
    expect(source).toContain('min-h-11 min-w-11');
  });
});
