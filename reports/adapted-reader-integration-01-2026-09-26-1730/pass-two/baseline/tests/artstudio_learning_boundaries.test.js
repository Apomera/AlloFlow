import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const toolPath = process.env.ART_STUDIO_LEARNING_SOURCE || 'stem_lab/stem_tool_artstudio.js';
const cssKey = 'learning_dialog_data_artstudio_inspector_shell_backdrop_b_9d42016';

function walk(node, visit, ancestors = []) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, ancestors);
  for (const [name, value] of Object.entries(node)) {
    if (name === 'start' || name === 'end') continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit, ancestors.concat(node)));
    else if (value && typeof value.type === 'string') walk(value, visit, ancestors.concat(node));
  }
}

beforeEach(() => {
  resetStemLab();
  loadTool(toolPath, 'artStudio');
});

describe('Art Studio learning translation boundaries', () => {
  it('keeps code elements and technical attributes outside learning translation calls', () => {
    const source = fs.readFileSync(path.join(process.cwd(), toolPath), 'utf8');
    const ast = parse(source, { ecmaVersion: 2022 });
    const technicalProperties = new Set(['id', 'className', 'role', 'aria-controls', 'aria-labelledby', 'aria-describedby', 'href', 'src', 'download', 'type', 'name', 'value', 'key', 'style']);
    const invalid = [];
    walk(ast, (node, ancestors) => {
      if (node.type !== 'CallExpression' || node.callee.name !== '__alloT' || !node.arguments[0]?.value?.startsWith('stem.artstudio.learning_')) return;
      const badParent = ancestors.find(parent =>
        parent.type === 'Property' && technicalProperties.has(parent.key.name || parent.key.value) ||
        parent.type === 'CallExpression' && parent.callee.type === 'MemberExpression' && parent.callee.property.name === 'createElement' && ['style', 'script', 'code', 'pre', 'kbd'].includes(parent.arguments[0]?.value));
      if (badParent) invalid.push(node.arguments[0].value);
    });
    expect(invalid).toEqual([]);
  });

  it('preserves inspector CSS even when every learning string is translated', () => {
    const t = vi.fn((key, fallback) => key.startsWith('stem.artstudio.learning_') ? 'Translated learning text' : fallback);
    const html = renderTool('artStudio', { artStudio: { tab: 'watercolor', studioHome: false } }, { t });
    const host = document.createElement('div');
    host.innerHTML = html;
    const css = host.querySelector('style').textContent;
    expect(css).toContain('dialog[data-artstudio-inspector-shell]::backdrop{background:rgba(15,23,42,.58)}');
    expect(css).toContain('@media(max-width:639px)');
    expect(css).not.toContain('Translated learning text');
    expect(t.mock.calls.some(([key]) => key === 'stem.artstudio.' + cssKey)).toBe(false);
  });

  it('does not expose inspector CSS as an English translation leaf', () => {
    for (const relative of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', 'dev-tools/i18n/stem_artstudio_en.json']) {
      const registry = JSON.parse(fs.readFileSync(path.join(process.cwd(), relative), 'utf8'));
      const entries = relative.endsWith('stem_artstudio_en.json') ? registry : registry.stem.artstudio;
      expect(entries[cssKey], relative).toBeUndefined();
    }
  });
});

