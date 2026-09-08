import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
describe('SEL educator guidance stays consistent across delivery paths', () => {
  it('embeds the canonical document instead of an outdated privacy guide', () => {
    const source = read('sel_hub/sel_hub_module.js');
    const block = source.match(/var FOR_EDUCATORS_MD = (\[[\s\S]*?\])\.join\('\\n'\);/);
    expect(block).not.toBeNull();
    expect(JSON.parse(block[1]).join('\n')).toBe(read('sel_hub/FOR_EDUCATORS.md').trimEnd());
  });
  it('delivers the same updated guide and coping activities in the public bundle', () => {
    for (const file of ['sel_hub_module.js', 'sel_tool_coping.js']) {
      expect(read('desktop/web-app/public/sel_hub/' + file)).toBe(read('sel_hub/' + file));
    }
  });
});
