import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_advocacy.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_advocacy.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Advocacy vocabulary flashcard accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('uses a native button with state and content relationships', () => {
    const text = source();
    expect(text).toContain("h('button', { type: 'button', onClick: function() { upd('vocabFlipped'");
    expect(text).toContain("'aria-expanded': vocabFlipped ? 'true' : 'false'");
    expect(text).toContain("'aria-controls': 'advocacy-vocab-card-content'");
    expect(text).toContain("id: 'advocacy-vocab-card-content'");
    expect(text).not.toContain("h('div', { onClick: function() { upd('vocabFlipped'");
  });

  it('provides device-independent instructions and action names', () => {
    const text = source();
    expect(text).toContain('Keyboard users can press Enter or Space.');
    expect(text).toContain("(vocabFlipped ? 'Show term for ' : 'Show definition for ') + current.word");
    expect(text).toContain('Activate to show definition');
  });

  it('announces navigation status and exposes selected toggle states', () => {
    const text = source();
    expect(text).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(text).toContain("'aria-pressed': active ? 'true' : 'false'");
    expect(text).toContain("'aria-pressed': learned.indexOf(current.word) >= 0 ? 'true' : 'false'");
  });

  it('keeps button descendants within the valid phrasing-content model', () => {
    const text = source();
    const start = text.indexOf("h('button', { type: 'button', onClick: function() { upd('vocabFlipped'");
    const end = text.indexOf("h('div', { style: { display: 'flex', gap: 8", start);
    const card = text.slice(start, end);
    expect(card).not.toContain("h('div'");
    expect(card).not.toContain("h('p'");
    expect(card).toContain("h('span'");
  });
});
