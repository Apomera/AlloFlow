import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Anxiety Toolkit accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalAnxietyToolkit(props) {');
  const end = source.indexOf('  function PersonalDecisionMaker(props) {', start);
  const toolkit = source.slice(start, end);

  it('exposes crisis resources in a named aside', () => {
    expect(toolkit).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-anxiety-crisis-heading'");
    expect(toolkit).toContain("id: 'learning-lab-anxiety-crisis-heading'");
    expect(toolkit).toContain('If you are in crisis or feel unsafe');
  });

  it('provides actionable labeled 988 call, text, and chat links', () => {
    expect(toolkit).toContain("href: 'tel:988'");
    expect(toolkit).toContain("'aria-label': 'Call the 988 Suicide and Crisis Lifeline'");
    expect(toolkit).toContain("href: 'sms:988'");
    expect(toolkit).toContain("'aria-label': 'Text the 988 Suicide and Crisis Lifeline'");
    expect(toolkit).toContain("href: 'https://988lifeline.org/chat/'");
  });

  it('discloses new-tab behavior for 988 chat', () => {
    expect(toolkit).toContain("target: '_blank', rel: 'noopener noreferrer'");
    expect(toolkit).toContain('opens in a new tab');
  });

  it('provides actionable labeled Maine crisis and relay links', () => {
    expect(toolkit).toContain("href: 'tel:+18885681112'");
    expect(toolkit).toContain("'aria-label': 'Call the Maine Crisis Line at 1-888-568-1112'");
    expect(toolkit).toContain("href: 'tel:711'");
    expect(toolkit).toContain("'aria-label': 'Call Maine Relay at 711'");
  });

  it('uses a semantic list of named anxiety-tool controls', () => {
    expect(toolkit).toContain("hh('ul', { 'aria-label': 'Available anxiety tools'");
    expect(toolkit).toContain("return hh('li', { key: 'at-' + tool.id }");
    expect(toolkit).toContain("'aria-label': 'Open ' + tool.label + ', '");
  });

  it('moves focus into a tool and back to its launcher', () => {
    expect(toolkit).toContain("focusById('learning-lab-anxiety-active-heading')");
    expect(toolkit).toContain("id: 'learning-lab-anxiety-active-heading', tabIndex: -1");
    expect(toolkit).toContain("focusById('learning-lab-anxiety-start-' + tool.id)");
  });

  it('exposes tool steps as a labeled ordered list', () => {
    expect(toolkit).toContain("'aria-labelledby': 'learning-lab-anxiety-steps-heading'");
    expect(toolkit).toContain("hh('ol', { style:");
    expect(toolkit).toContain("return hh('li', { key: 'st-' + index");
  });

  it('uses a named action group with native buttons', () => {
    expect(toolkit).toContain("role: 'group', 'aria-label': 'Anxiety tool actions'");
    expect(toolkit).toContain("type: 'button'");
    expect(toolkit).toContain('Finish and log this tool');
  });

  it('preserves unrelated section data when logging tool use', () => {
    expect(toolkit).toContain("setData(Object.assign({}, data, { logs: [entry].concat(rawLogs) }))");
    expect(toolkit).not.toContain('setData({ logs:');
  });

  it('handles malformed legacy log data without crashing', () => {
    expect(toolkit).toContain('var rawLogs = Array.isArray(data.logs) ? data.logs : [];');
    expect(toolkit).toContain('return !!entry && entry.toolId === toolId;');
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(toolkit).toContain('if (!pendingFocusId) return;');
    expect(toolkit).toContain('var target = document.getElementById(pendingFocusId);');
    expect(toolkit).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(toolkit).not.toContain('setTimeout');
  });

  it('explains optional use, local saving, and non-communication', () => {
    expect(toolkit).toContain('These tools are optional self-help strategies for everyday anxious moments.');
    expect(toolkit).toContain('They are not therapy and do not replace professional support.');
    expect(toolkit).toContain('does not notify a teacher, school, employer, clinician, or family member');
  });

  it('describes strategies with attribution instead of clinical effect claims', () => {
    expect(toolkit).toContain('This practice comes from acceptance and commitment therapy (ACT).');
    expect(toolkit).toContain('This idea comes from dialectical behavior therapy (DBT) distress-tolerance skills.');
    expect(toolkit).not.toContain('regulation circuits');
    expect(toolkit).not.toContain('reduces fusion');
  });

  it('lets the user clear logged uses behind an accessible confirmation', () => {
    expect(toolkit).toContain("title: 'Clear logged uses?', confirmText: 'Clear logged uses'");
    expect(toolkit).toContain("setData(Object.assign({}, data, { logs: [] }))");
    expect(toolkit).toContain("llAnnounce('All logged anxiety-tool uses cleared.')");
    expect(toolkit).toContain("focusById('learning-lab-anxiety-start-' + TOOLS[0].id)");
    expect(toolkit).not.toContain('confirm(');
  });

  it('announces open, return, and logged-use state changes', () => {
    expect(toolkit).toContain("llAnnounce(tool.label + ' anxiety tool opened.')");
    expect(toolkit).toContain("llAnnounce('Returned to the anxiety tool list.')");
    expect(toolkit).toContain("llAnnounce(tool.label + ' use logged.')");
  });

  it('shows logged tools without ranking or scoring', () => {
    expect(toolkit).toContain("'aria-labelledby': 'learning-lab-anxiety-usage-heading'");
    expect(toolkit).toContain("'Tools you have logged'");
    expect(toolkit).toContain("item.count + (item.count === 1 ? ' use' : ' uses')");
    expect(toolkit).toContain('Counts are informational only; using a tool more or less often is not better or worse.');
    expect(toolkit).not.toContain('.sort(function(a, b) { return b.count - a.count; })');
    expect(toolkit).not.toContain('Most-used tools');
    expect(toolkit).not.toContain("(index + 1) + '. '");
  });

  it('does not use accent colors for essential small text', () => {
    expect(toolkit).toContain("color: 'var(--allo-stem-text, #e2e8f0)'");
    expect(toolkit).toContain("color: 'var(--allo-stem-text-soft, #94a3b8)'");
    expect(toolkit).not.toContain('fontSize: 13, fontWeight: 800, color: tool.color');
  });

  it('provides 44-pixel tool and action controls', () => {
    expect(toolkit).toContain("minHeight: 44, padding: '9px 14px'");
    expect(toolkit).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
