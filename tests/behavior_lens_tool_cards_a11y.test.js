import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('BehaviorLens hub tool-card accessibility', () => {
  const source = read('behavior_lens_module.js');
  const start = source.indexOf('const renderCard = (tool) =>');
  const end = source.indexOf('const dismissWelcome = () =>', start);
  const card = source.slice(start, end);

  it('uses a labelled and described non-interactive card group', () => {
    expect(card).toContain("return h('article', {");
    expect(card).toContain("role: 'group'");
    expect(card).toContain("'aria-labelledby': titleId");
    expect(card).toContain("'aria-describedby': descriptionId");
    expect(card).toContain('id: titleId');
    expect(card).toContain('id: descriptionId');
    expect(card).not.toContain("return h('button', { key: tool.id");
  });

  it('provides separate native Favorite and Open actions', () => {
    expect(card.split("h('button', {")).toHaveLength(3);
    expect(card).toContain("type: 'button'");
    expect(card).toContain("'aria-pressed': isFav ? 'true' : 'false'");
    expect(card).toContain("disabled: isDisabled");
    expect(card).toContain("onClick: () => handleToolOpen(tool.id)");
    expect(card).not.toContain("role: 'button'");
    expect(card).not.toContain('tabIndex: 0');
  });

  it('uses accurate availability and minimum target behavior', () => {
    expect(card).toContain('const isDisabled = Boolean(');
    expect(card).toContain('w-8 h-8 min-w-8 min-h-8');
    expect(card).toContain('min-h-11');
    expect(card).toContain('focus-visible:outline');
    expect(card).toContain("Unavailable until required data is selected");
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/behavior_lens_module.js'));
  });
});
