import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
const read = path => fs.readFileSync(path, 'utf8');
const guides = JSON.parse(read('sel_hub/sel_learning_guides.json'));
const hub = read('sel_hub/sel_hub_module.js');
const registered = fs.readdirSync('sel_hub').filter(name => /^sel_tool_.*\.js$/.test(name)).map(name => read('sel_hub/' + name).match(/registerTool\(\s*['"]([^'"]+)['"]/)[1]);
const fields = ['purpose', 'model', 'practice', 'reflect', 'transfer', 'boundary'];
describe('SEL learning guide coverage', () => {
  it('covers every registered tool exactly once, including dynamically cataloged plugins', () => {
    expect(Object.keys(guides).sort()).toEqual(registered.sort());
    expect(new Set(registered).size).toBe(72);
  });
  it.each(Object.keys(guides))('%s has an explicit purpose, worked example, practice, reflection, transfer and boundary', id => {
    expect(Object.keys(guides[id]).sort()).toEqual(fields.slice().sort());
    for (const field of fields) {
      expect(guides[id][field].trim().length).toBeGreaterThan(30);
      expect(guides[id][field]).not.toMatch(/TODO|placeholder|lorem ipsum/i);
    }
  });
  it('uses distinct examples and practice steps rather than assigning generic pathway content', () => {
    for (const field of fields) expect(new Set(Object.values(guides).map(guide => guide[field])).size).toBe(registered.length);
  });
  it('embeds the canonical guide content without requiring another network fetch', () => {
    const block = hub.match(/var SEL_TOOL_GUIDES = (\{[\s\S]*?\});\r?\n    \/\/ END SEL TOOL LEARNING GUIDES/);
    expect(block).not.toBeNull();
    expect(JSON.parse(block[1])).toEqual(guides);
    expect(read('desktop/web-app/public/sel_hub/sel_hub_module.js')).toBe(hub);
  });
});
