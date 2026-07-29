import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

describe('Typing Practice settings and summary structure', () => {
  it('builds stable, collision-resistant control ids', () => {
    const controlId = Function('return (' + extractFunction('typingPracticeControlId') + ')')();
    expect(controlId('tp-toggle', 'Audio cues')).toBe(controlId('tp-toggle', 'Audio cues'));
    expect(controlId('tp-toggle', 'Audio cues')).toMatch(/^tp-toggle-audio-cues-/);
    expect(controlId('tp-toggle', 'Story mode')).not.toBe(controlId('tp-toggle', 'Story mode!'));
  });

  it('programmatically connects every switch to its visible label and explanation', () => {
    expect(source).toContain("className: 'tp-toggle-row'");
    expect(source).toContain("className: 'tp-toggle-switch'");
    expect(source).toContain("id: idBase + '-label'");
    expect(source).toContain("id: idBase + '-description'");
    expect(source).toContain("'aria-labelledby': idBase + '-label'");
    expect(source).toContain("'aria-describedby': idBase + '-description'");
    expect(source).not.toContain("'aria-label': title");
  });

  it('uses a consistent 44px switch geometry and zoom-safe wrapping', () => {
    expect(source).toContain("width: '64px'");
    expect(source).toContain("height: '44px'");
    expect(source).toContain("width: '28px'");
    expect(source).toContain("top: '7px'");
    expect(source).toContain("flexWrap: 'wrap'");
    expect(source).toContain("'  .tp-root .tp-toggle-row { align-items: flex-start !important; }'");
  });

  it('represents summary and progress metrics as definition lists', () => {
    expect(source).toContain("h('dl', {\n                className: 'tp-stat-stagger'");
    expect(source).toContain("'aria-label': 'Baseline and current metrics'");
    expect(source).toContain("h('dt', { style: labelStyle }, label)");
    expect(source).toContain("h('dd', { style: Object.assign({ margin: 0 }, valueStyle) }, value)");
    expect(source).not.toContain("'aria-label': label + ': ' + value");
  });
});
