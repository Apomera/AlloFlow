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

  it('recognizes a tablist inside an escaped HTML string', () => {
    const report = scanFixture([
      'const [activeTab, setActiveTab] = useState("summary");',
      'const html = "<nav role=\\\"tablist\\\"><button role=\\\"tab\\\">Summary</button></nav>";',
    ].join('\n'));
    expect(report).not.toContain('TABS-001');
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

  it('does not misclassify a native confirmation mechanism as a 3.3.4 failure', () => {
    const report = scanFixture('button.onclick = () => window.confirm("Delete this item?");');
    expect(report).not.toContain('CONFIRM-001');
  });

  it('does not misclassify custom confirmation APIs or prose', () => {
    const report = scanFixture([
      'return ux.confirm(message);',
      '// no window.confirm is used in this flow',
      'function confirm(answer) { return answer === "yes"; }',
    ].join('\n'));
    expect(report).not.toContain('CONFIRM-001');
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
  it('recognizes an SVG excluded by its immediate aria-hidden parent', () => {
    const report = scanFixture([
      "return h('span', { className: 'thumbnail', style: { color: accent }, 'aria-hidden': 'true' },",
      "  h('svg', { viewBox: '0 0 20 20' },",
      "    h('path', { d: 'M0 0L20 20' })",
      '  )',
      ');',
    ].join('\n'));
    expect(report).not.toContain('SVG-001');
  });
  it('does not borrow aria-hidden from a closed sibling before an SVG', () => {
    const report = scanFixture([
      "h('span', { 'aria-hidden': 'true' }, 'Decorative marker'),",
      "h('svg', { viewBox: '0 0 20 20' });",
    ].join('\n'));
    expect(report).toContain('SVG-001');
  });
  it('does not report an SVG mentioned only in source documentation', () => {
    const report = scanFixture("// Rendered with React.createElement('svg', ...) after the library loads.");
    expect(report).not.toContain('SVG-001');
  });
  it('does not flag motion-safe utility animations', () => {
    const report = scanFixture('<div className="motion-safe:animate-spin">Loading</div>');
    expect(report).not.toContain('MOTION-001');
  });

  it('recognizes conditional dialog semantics for full-screen shells', () => {
    const report = scanFixture('<div className="fixed inset-0 z-[9999]" role={presenting ? "dialog" : undefined} aria-modal={presenting ? "true" : undefined}></div>');
    expect(report).not.toContain('DIALOG-001');
  });

  it('does not treat a named full-screen status boundary as a modal', () => {
    const report = scanFixture("h('div', { role: 'status', 'aria-live': 'polite', className: 'fixed inset-0 z-[260]' }, 'Loading');");
    expect(report).not.toContain('DIALOG-001');
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

  it('recognizes a lift-and-move button nested in a draggable list item', () => {
    const report = scanFixture([
      '<div draggable={true} onDragStart={startDrag} role="listitem">',
      '  <button aria-pressed={isLifted} onKeyDown={moveWithArrows} onClick={toggleLift}>',
      '    Lift or drop this position',
      '  </button>',
      '</div>',
    ].join('\n'));
    expect(report).not.toContain('DRAGDROP-001');
  });

  it('recognizes a documented keyboard contract for a pointer-draggable application surface', () => {
    const report = scanFixture([
      'canvas.tabIndex = 0;',
      "canvas.setAttribute('role', 'application');",
      "canvas.setAttribute('aria-label', 'Keyboard: Q and E rotate the view.');",
      "canvas.setAttribute('aria-keyshortcuts', 'Q E');",
      'function onMouseDown(event) { dragging = true; }',
    ].join('\n'));
    expect(report).not.toContain('DRAGDROP-001');
  });

  it('recognizes rotate and zoom buttons provided above a draggable 3-D view', () => {
    const report = scanFixture([
      '<button onClick={() => setCubeRotation(value => value - 15)}>Rotate left</button>',
      '<button onClick={() => setCubeRotation(value => value + 15)}>Tilt up</button>',
      '<button onClick={() => setCubeScale(value => value + 0.1)}>Zoom in</button>',
      ...Array.from({ length: 40 }, () => '// layout'),
      '<div onMouseDown={(event) => { cubeDragRef.current = event.clientX; }}>3-D view</div>',
    ].join('\n'));
    expect(report).not.toContain('DRAGDROP-001');
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
