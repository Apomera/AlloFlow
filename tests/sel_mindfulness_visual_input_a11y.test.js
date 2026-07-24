import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_mindfulness.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_mindfulness.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Mindfulness visual and input accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('programmatically names all twelve SVG visual practices', () => {
    const text = source();
    expect(text.match(/h\('svg', \{ role: /g)?.length).toBe(12);
    expect(text).toContain("'aria-label': pattern.name + ' breathing guide.");
    expect(text).toContain("'aria-label': selected.name + ' hand position illustration'");
  });

  it('makes body-scan regions keyboard operable and at least 24 pixels wide', () => {
    const text = source();
    expect(text).toContain("key: r.id, role: 'button', tabIndex: 0, focusable: 'true'");
    expect(text).toContain("event.key === 'Enter' || event.key === ' '");
    expect(text).toContain("r: Math.max(r.r, 12)");
    expect(text).toContain("'aria-current': isCurrent ? 'step' : undefined");
  });

  it('names the grounding response and all four library searches', () => {
    const text = source();
    expect(text).toContain("'aria-label': currentGround.prompt");
    expect(text).toContain("'aria-label': 'Search guided meditation scripts'");
    expect(text).toContain("'aria-label': 'Search mantras and focal phrases'");
    expect(text).toContain("'aria-label': 'Search mindful living scenarios'");
    expect(text).toContain("'aria-label': 'Search mindfulness research'");
  });
});
