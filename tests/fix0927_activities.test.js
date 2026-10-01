// 2026-09-27 Activities fixes: readable Simulation output (A1), derivatives made
// before an activity edit are marked for review (A2), the UDL banner is teacher-only
// and translated (A4), and blank editor lines never become student items (A5).
// FIX0927_ACT_DIR points the module loads at another build; FIX0927_LP_ANTI at another ANTI.
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const require = createRequire(import.meta.url);
const DIR = process.env.FIX0927_ACT_DIR || process.cwd();
let React, createRoot, act, root, host, View, dispatcher;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.React = React;
  window.AlloModules = window.AlloModules || {};
  new Function('window', 'console', readFileSync(join(DIR, 'generate_dispatcher_module.js'), 'utf8'))(window, console);
  dispatcher = window.AlloModules.GenDispatcher;
  new Function(readFileSync(join(DIR, 'view_brainstorm_module.js'), 'utf8'))();
  View = window.AlloModules.BrainstormView;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; });
function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, {
    t: () => '', isTeacherMode: true, isEditingBrainstorm: false, isGeneratingGuide: {}, isGeneratingWorksheet: {}, isGeneratingWorksheetCover: {},
    handleBrainstormChange: () => {}, renderFormattedText: v => v, getRows: () => 3, ...props
  })));
}

describe('A1: Simulation output contrast', () => {
  const HEX = { 'slate-900': '#0f172a', 'slate-800': '#1e293b', 'slate-600': '#475569', 'slate-300': '#cbd5e1', 'slate-200': '#e2e8f0', 'slate-100': '#f1f5f9', 'green-700': '#15803d', 'green-300': '#86efac', 'green-200': '#bbf7d0' };
  const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(HEX[a]), lum(HEX[b])].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  it('every text colour on the dark prompt panel reaches 4.5:1', () => {
    const anti = readFileSync(process.env.FIX0927_LP_ANTI || 'AlloFlowANTI.txt', 'utf8');
    const start = anti.indexOf("{activeView === 'gemini-bridge' && generatedContent && (");
    const block = anti.slice(start, anti.indexOf('{activeView ===', start + 20));
    const pick = re => { const m = block.match(re); expect(m, String(re)).toBeTruthy(); return m[1]; };
    const checks = [
      [pick(/className="bg-slate-900 text-([a-z]+-\d+) p-6/), 'slate-900'],
      [pick(/className="flex items-center gap-2 text-([a-z]+-\d+) font-bold"/), 'slate-900'],
      [pick(/className="text-xs text-([a-z]+-\d+) font-sans"/), 'slate-900'],
      [pick(/leading-relaxed text-([a-z]+-\d+) overflow-x-auto font-mono/), 'slate-800'],
      [pick(/text-xs text-([a-z]+-\d+) flex items-center gap-2 justify-center/), 'slate-900']
    ];
    checks.forEach(([fg, bg]) => { expect(HEX[fg], fg).toBeTruthy(); expect(ratio(fg, bg), fg + ' on ' + bg).toBeGreaterThanOrEqual(4.5); });
  });
});

describe('A2: editing an activity marks its derivatives for review', () => {
  const base = () => dispatcher.attachActivityDerivativeMetadata([{ kind: 'idea', title: 'Build a volcano', description: 'Model an eruption.', connection: 'Plate tectonics' }], 'pack-1')[0];
  it('records the source at generation and flags a guide after the activity content changes', () => {
    let activity = dispatcher.stampActivityDerivative({ ...base(), guide: '## Steps' }, 'pack-1', 0, 'guide', { status: 'ready', bumpVersion: true });
    expect(dispatcher.activityDerivativeNeedsReview(activity, 'guide')).toBe(false);
    activity = { ...activity, description: 'Model an eruption with baking soda.' };
    expect(dispatcher.activityDerivativeNeedsReview(activity, 'guide')).toBe(true);
    // Editing the guide itself counts as reviewing it; a failed retry does not.
    const failed = dispatcher.stampActivityDerivative(activity, 'pack-1', 0, 'guide', { status: 'failed', lastError: 'x' });
    expect(dispatcher.activityDerivativeNeedsReview(failed, 'guide')).toBe(true);
    const edited = dispatcher.stampActivityDerivative({ ...activity, guide: '## Steps (revised)' }, 'pack-1', 0, 'guide', { status: 'edited' });
    expect(dispatcher.activityDerivativeNeedsReview(edited, 'guide')).toBe(false);
  });
  it('a new derivative for one kind does not clear another kind that still needs review', () => {
    let activity = dispatcher.stampActivityDerivative({ ...base(), guide: 'G' }, 'pack-1', 0, 'guide', { status: 'ready' });
    activity = { ...activity, title: 'Build a model volcano', worksheet: 'W' };
    activity = dispatcher.stampActivityDerivative(activity, 'pack-1', 0, 'worksheet', { status: 'ready' });
    expect(dispatcher.activityDerivativeNeedsReview(activity, 'worksheet')).toBe(false);
    expect(dispatcher.activityDerivativeNeedsReview(activity, 'guide')).toBe(true);
  });
  it('older saved derivatives with no recorded source are not flagged', () => {
    const legacy = { kind: 'idea', title: 'T', guide: 'G', derivatives: { guide: { status: 'ready', version: 1 } } };
    expect(dispatcher.activityDerivativeNeedsReview(legacy, 'guide')).toBe(false);
  });
  it('the teacher view shows "needs review" and Mark as reviewed records the current source', () => {
    let activity = dispatcher.stampActivityDerivative({ ...base(), guide: 'G' }, 'pack-1', 0, 'guide', { status: 'ready' });
    activity = { ...activity, connection: 'Earth science' };
    const handleBrainstormChange = vi.fn();
    mount({ generatedContent: { id: 'pack-1', type: 'brainstorm', data: [activity] }, handleBrainstormChange });
    expect(host.querySelector('[data-derivative-review="guide"]').textContent).toContain('needs review');
    const button = [...host.querySelectorAll('button')].find(b => b.textContent === 'Mark as reviewed');
    act(() => button.click());
    const [index, field, value] = handleBrainstormChange.mock.calls[0];
    expect([index, field]).toEqual([0, 'derivatives']);
    expect(dispatcher.activityDerivativeNeedsReview({ ...activity, derivatives: value }, 'guide')).toBe(false);
  });
});

describe('A4: UDL goal banner', () => {
  it('is teacher-only and translated', () => {
    const t = key => ({ 'brainstorm.udl_goal_label': 'Meta DUA:', 'brainstorm.udl_goal_body': 'Opciones de compromiso.' }[key] || '');
    const content = { id: 'p', type: 'brainstorm', data: [{ kind: 'idea', title: 'Idea', description: 'D', connection: 'C' }] };
    mount({ generatedContent: content, t });
    expect(host.textContent).toContain('Meta DUA:');
    expect(host.textContent).not.toContain('UDL Goal:');
    act(() => root.unmount()); root = null; host.remove();
    mount({ generatedContent: content, isTeacherMode: false });
    expect(host.textContent).not.toContain('UDL Goal');
    expect(host.textContent).not.toContain('Providing options for engagement');
  });
});

describe('A5: blank editor lines are not student items', () => {
  const discussion = { kind: 'discussion', title: 'Talk', protocol: 'think-pair-share', questionSets: [{ depth: 'literal', questions: ['Why?', '', '  '] }, { depth: 'inferential', questions: [''] }], talkStems: { agree: ['I agree because', ''], disagree: [''], clarify: [], build: [] } };
  const jigsaw = { kind: 'jigsaw', title: 'Jig', groupSize: 3, chunks: [{ label: 'A', expertPacket: 'P', teachBack: { keyPoints: ['K', ''], checkQuestions: [' '] } }], accountabilityCheck: [{ q: 'Real?', answer: 'Yes' }, { q: '', answer: '' }] };
  it('the student projection drops blank questions, stems, points and checks', () => {
    const projected = View.projectStudentActivityResource({ id: 'r', type: 'brainstorm', data: [discussion, jigsaw] });
    expect(projected.data[0].questionSets).toEqual([{ depth: 'literal', questions: ['Why?'] }]);
    expect(projected.data[0].talkStems.agree).toEqual(['I agree because']);
    expect(projected.data[0].talkStems.disagree).toEqual([]);
    expect(projected.data[1].chunks[0].teachBack).toEqual({ keyPoints: ['K'], checkQuestions: [] });
    expect(projected.data[1].accountabilityCheck).toEqual([{ q: 'Real?' }]);
  });
  it('the rendered activity shows no empty list items', () => {
    mount({ generatedContent: { id: 'r', type: 'brainstorm', data: [discussion, jigsaw] }, isTeacherMode: false });
    const empty = [...host.querySelectorAll('li')].filter(li => !li.textContent.replace(/[“”\s]/g, ''));
    expect(empty).toHaveLength(0);
    expect(host.querySelectorAll('ol li').length).toBe(2);
  });
});
