import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = fs.readFileSync(path.resolve(process.cwd(), 'view_analysis_module.js'), 'utf8');
const TOOLBAR_START = SOURCE.indexOf('className: "flex items-center gap-1 p-2 bg-indigo-50 border-b border-indigo-100"');
const TOOLBAR_END = SOURCE.indexOf('}), /*#__PURE__*/React.createElement("textarea", {', TOOLBAR_START);
const TOOLBAR = SOURCE.slice(TOOLBAR_START, TOOLBAR_END);

function controlSource(command) {
  const click = `handleFormatText('${command}'`;
  const clickIndex = TOOLBAR.indexOf(click);
  return clickIndex < 0 ? '' : TOOLBAR.slice(Math.max(0, clickIndex - 260), clickIndex);
}

describe('analysis editor formatting toolbar accessibility', () => {
  it('keeps every formatting action an explicit non-submit button', () => {
    for (const command of ['bold', 'italic', 'highlight', 'h1', 'h2', 'h3', 'list', 'numlist']) {
      expect(controlSource(command), `${command} control should be present`).toContain('type: "button"');
    }
  });

  it('gives icon-only actions localized accessible names with English fallbacks', () => {
    for (const [command, fallback] of [
      ['bold', 'Bold'],
      ['italic', 'Italic'],
      ['highlight', 'Highlight'],
      ['list', 'Bulleted list'],
      ['numlist', 'Numbered list'],
    ]) {
      const source = controlSource(command);
      expect(source, `${command} icon control should be present`).toContain(`"aria-label": t('formatting.${command}') || '${fallback}'`);
    }
  });
});
