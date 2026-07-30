import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  path.join(process.cwd(), 'stem_lab/stem_tool_typingpractice.js'),
  'utf8'
);

describe('Typing Practice forced-colors resilience', () => {
  it('keeps every character state independently targetable', () => {
    expect(source).toContain("var chClass = 'tp-char tp-char-' + charState");
    expect(source).toContain("'  .tp-root .tp-char { opacity: 1 !important; }'");
    expect(source).toContain("'  .tp-root .tp-char-current { background: Highlight !important;");
    expect(source).toContain("'  .tp-root .tp-char-wrong-current, .tp-root .tp-char-done-error {");
    expect(source).toContain("'  .tp-root .tp-char-done { border-bottom: 2px solid CanvasText !important; }'");
    expect(source).toContain("'  .tp-root .tp-char-preview { border-bottom: 2px dotted Highlight !important; }'");
  });

  it('uses a persistent non-color cue for incorrect characters', () => {
    expect(source.match(/charStyle\.textDecoration = 'underline wavy'/g)).toHaveLength(2);
    expect(source.match(/charStyle\.textUnderlineOffset = '3px'/g)).toHaveLength(2);
    expect(source).toContain('outline: 3px double CanvasText !important');
  });

  it('retains a bounded progress track and visible fill after completion', () => {
    expect(source).toContain("className: 'tp-progress-track'");
    expect(source).toContain("className: 'tp-progress-fill' + (done ? ' tp-progress-fill-complete' : '')");
    expect(source).toContain("'.tp-root .tp-progress-fill-complete::after { display: none; }'");
    expect(source).toContain("'  .tp-root .tp-progress-track { background: Canvas !important; border: 1px solid CanvasText !important; }'");
  });

  it('shows switch state with text as well as color and thumb position', () => {
    expect(source).toContain("className: 'tp-toggle-state'");
    expect(source).toContain("}, isOn ? 'On' : 'Off')");
    expect(source).toContain("className: 'tp-toggle-thumb'");
    expect(source).toContain("width: '80px'");
    expect(source).toContain("'  .tp-root .tp-toggle-switch { background: ButtonFace !important;");
  });

  it('supports increased-contrast preferences outside Windows forced colors', () => {
    expect(source).toContain("'@media (prefers-contrast: more) {'");
    expect(source).toContain("'  .tp-root .tp-char, .tp-root .tp-session-bar-fill { opacity: 1 !important; }'");
    expect(source).toContain("'  .tp-root .tp-progress-track, .tp-root .tp-session-bar-fill { border: 2px solid currentColor !important; }'");
    expect(source).toContain('outline-width: 3px !important');
  });
});
