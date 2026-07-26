import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function scanFixture(source, fileName = 'fixture.js') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-ui-rule-'));
  const fixture = path.join(directory, fileName);
  fs.writeFileSync(fixture, source, 'utf8');
  try {
    return spawnSync(process.execPath, ['a11y-audit/static-audit.js', '--file', fixture], {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).stdout;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

describe('static audit UI heuristics', () => {
  it('does not treat a data property named tab as a rendered tab interface', () => {
    const report = scanFixture([
      'const target = targets[id];',
      'item.targetTab = target.tab;',
      'renderSearchTarget(item);',
    ].join('\n'));
    expect(report).not.toContain('TABS-001');
  });

  it('still reports a state-driven tab interface without ARIA tab semantics', () => {
    const report = scanFixture([
      'const [activeTab, setTab] = useState("summary");',
      'button.onclick = () => setTab("details");',
      'render(activeTab === "summary" ? summary : details);',
    ].join('\n'));
    expect(report).toContain('TABS-001');
  });

  it('recognizes labels later in a multi-line createElement property block', () => {
    const report = scanFixture([
      "h('input', {",
      "  type: 'url',",
      "  defaultValue: hostedUrl,",
      "  placeholder: 'Optional hosted link',",
      "  className: 'hosted-link',",
      "  onKeyDown: saveOnEnter,",
      "  'aria-label': 'Hosted video link'",
      '});',
    ].join('\n'));
    expect(report).not.toContain('INPUT-001');
  });

  it('still reports an unlabeled multi-line input', () => {
    const report = scanFixture([
      "h('input', {",
      "  type: 'text',",
      "  value: title,",
      "  placeholder: 'Title',",
      '  onChange: updateTitle',
      '});',
    ].join('\n'));
    expect(report).toContain('INPUT-001');
  });
  it('does not treat array.push("svg") as a rendered SVG element', () => {
    const report = scanFixture([
      "if (documentClone.querySelector('svg')) contentProperties.push('svg');",
      "if (documentClone.querySelector('math')) contentProperties.push('mathml');",
    ].join('\n'));
    expect(report).not.toContain('SVG-001');
  });

  it('still reports an unnamed SVG created by the renderer helper', () => {
    const report = scanFixture("const icon = h('svg', { viewBox: '0 0 20 20' });");
    expect(report).toContain('SVG-001');
  });
  it('does not report pointer-only outline suppression that preserves focus-visible', () => {
    const report = scanFixture([
      ".tool button:focus-visible { outline: 3px solid #4f46e5; }",
      ".tool :focus:not(:focus-visible) { outline: none; }",
    ].join('\n'));
    expect(report).not.toContain('FOCUS-001');
  });

  it('still reports unqualified outline suppression without a replacement', () => {
    const report = scanFixture(".tool input:focus { outline: none; }");
    expect(report).toContain('FOCUS-001');
  });
  it('still reports another unqualified rule sharing a line with a pointer-only rule', () => {
    const report = scanFixture(".tool input:focus { outline: none; } .tool :focus:not(:focus-visible) { outline: none; }");
    expect(report).toContain('FOCUS-001');
  });

  it('recognizes a documented arrow-key reorder control inside a draggable group', () => {
    const report = scanFixture([
      "h('div', {",
      "  draggable: true,",
      "  onDragStart: startDrag,",
      "  role: 'group'",
      "}, h('button', {",
      "  'aria-keyshortcuts': 'Alt+ArrowLeft Alt+ArrowRight',",
      "  'aria-describedby': 'reorder-help',",
      "  onKeyDown: function (event) {",
      "    if (event.altKey && event.key === 'ArrowLeft') moveItem(-1);",
      '  }',
      '}));',
    ].join('\n'));
    expect(report).not.toContain('DRAGDROP-001');
  });

  it('still reports drag-only groups without a keyboard movement alternative', () => {
    const report = scanFixture([
      "h('div', {",
      "  draggable: true,",
      "  onDragStart: startDrag,",
      "  onDrop: reorderFromPointer,",
      "  role: 'group'",
      "}, 'Item');",
    ].join('\n'));
    expect(report).toContain('DRAGDROP-001');
  });

  it('does not require a live region inside a headless status service', () => {
    const report = scanFixture([
      '// Returns Promise<string> and emits a rubric value like <integer 1-20>.',
      'let status = { state: "idle" };',
      'const observers = [];',
      'function setState(next) {',
      '  status = next;',
      '  observers.forEach((observer) => observer(status));',
      '}',
      'function subscribeToStatus(observer) { observers.push(observer); }',
    ].join('\n'), 'voice_module.js');
    expect(report).not.toContain('LIVE-001');
  });

  it('still reports an interactive rendered module without a live region', () => {
    const report = scanFixture([
      'function StatusTool() {',
      '  const [done, setState] = React.useState(false);',
      '  return React.createElement("button", { onClick: () => setState(true) }, done ? "Done" : "Run");',
      '}',
    ].join('\n'), 'status_tool.js');
    expect(report).toContain('LIVE-001');
  });

  it('still recognizes authored JSX as rendered UI', () => {
    const report = scanFixture([
      'function StatusTool() {',
      '  const [done, setState] = useState(false);',
      '  return <button onClick={() => setState(true)}>{done ? "Done" : "Run"}</button>;',
      '}',
    ].join('\n'), 'status_tool.jsx');
    expect(report).toContain('LIVE-001');
  });
});
