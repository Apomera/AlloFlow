import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_advocacy.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_advocacy.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Advocacy confirmation dialog accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('uses a named modal alert dialog instead of browser confirmations', () => {
    const text = source();
    expect(text).not.toContain("confirm('");
    expect(text).toContain("role: 'alertdialog'");
    expect(text).toContain("'aria-modal': 'true'");
    expect(text).toContain("'aria-labelledby': 'adv-confirm-title'");
    expect(text).toContain("'aria-describedby': 'adv-confirm-description'");
  });

  it('focuses Cancel first, traps Tab, supports Escape, and restores cancelled triggers', () => {
    const text = source();
    expect(text).toContain("focusAdvocacyControl('adv-confirm-cancel')");
    expect(text).toContain("if (event.key === 'Escape')");
    expect(text).toContain("if (event.key !== 'Tab') return");
    expect(text).toContain("querySelectorAll('button:not([disabled])')");
    expect(text).toContain('if (triggerId) focusAdvocacyControl(triggerId)');
    expect(text.indexOf("}, 'Cancel')")).toBeLessThan(text.indexOf('}, copy[2])'));
  });

  it('routes all three actions through the shared confirmation state', () => {
    const text = source();
    for (const type of ['reset-strengths', 'delete-journal', 'new-bingo-card']) {
      expect(text).toContain(`type: '${type}'`);
    }
    expect(text).toContain('patch.strengthsRatings = {}');
    expect(text).toContain("entry.id !== advConfirmAction.entryId");
    expect(text).toContain('patch.bingoCard = { cells: shuffled.slice(0, 25)');
  });

  it('moves focus to meaningful section headings after confirmed actions', () => {
    const text = source();
    for (const id of ['adv-strengths-heading', 'adv-journal-heading', 'adv-bingo-heading']) {
      expect(text).toContain(`id: '${id}', tabIndex: -1`);
    }
  });
});
