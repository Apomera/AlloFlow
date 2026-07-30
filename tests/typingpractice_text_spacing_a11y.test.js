import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

function snippetAfter(marker, length = 900) {
  const start = source.indexOf(marker);
  expect(start, 'Missing marker: ' + marker).toBeGreaterThanOrEqual(0);
  return source.slice(start, start + length);
}

describe('Typing Practice text-spacing and long-label resilience', () => {
  it('allows button and settings-link labels to wrap at increased spacing', () => {
    expect(source).toContain("button:not(.tp-session-bar) { min-width: 24px; min-height: 24px; touch-action: manipulation; overflow-wrap: anywhere; white-space: normal; line-height: 1.35;");
    expect(source).toContain(".tp-settings-nav a { min-height: 44px;");
    expect(source).toContain('overflow-wrap: anywhere; line-height: 1.35; text-align: center;');
    expect(source).toContain("'.tp-root .tp-theme-quick-choice { max-width: 100%; }'");
  });

  it('shows drill previews without hover-only ellipsis truncation', () => {
    const preview = snippetAfter("className: 'tp-drill-preview'");
    expect(preview).toContain("whiteSpace: 'normal'");
    expect(preview).toContain("overflowWrap: 'anywhere'");
    expect(preview).not.toContain("textOverflow: 'ellipsis'");
    expect(preview).not.toContain("whiteSpace: 'nowrap'");
  });

  it('lets translated coach actions grow and wrap', () => {
    const coach = snippetAfter("title: 'Open ' + recDrill.name", 420);
    expect(source.slice(Math.max(0, source.indexOf("title: 'Open ' + recDrill.name") - 500), source.indexOf("title: 'Open ' + recDrill.name") + 100)).toContain("overflowWrap: 'anywhere'");
    expect(coach).not.toContain("whiteSpace: 'nowrap'");
  });

  it('stacks saved-passage actions at narrow widths and keeps text visible', () => {
    expect(source).toContain("className: 'tp-saved-passage-item'");
    expect(source).toContain("className: 'tp-saved-passage-actions'");
    expect(source).toContain("'  .tp-root .tp-saved-passage-item { flex-direction: column !important;");
    expect(source).toContain("'  .tp-root .tp-saved-passage-actions button { flex: 1 1 120px; }'");
    const saved = snippetAfter("className: 'tp-saved-passage-item'", 2200);
    expect(saved).toContain("overflowWrap: 'anywhere'");
    expect(saved).not.toContain("textOverflow: 'ellipsis'");
  });

  it('keeps Festival celebration copy inside the viewport', () => {
    expect(source).toContain('font-size: clamp(28px, 12vw, 56px)');
    expect(source).toContain('font-size: clamp(32px, 14vw, 64px)');
    expect(source.match(/white-space: normal; overflow-wrap: anywhere;/g)).toHaveLength(3);
    expect(source).not.toContain("font-weight: 900; font-size: 64px;");
  });
});
