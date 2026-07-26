import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function scanFixture(source) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-ui-rule-'));
  const fixture = path.join(directory, 'fixture.js');
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
});
