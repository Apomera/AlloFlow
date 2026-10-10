import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const before = { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400, loadDistance: 0.5 };
const pair = () => ({ benchId: 'lever', before: { settings: { ...before } }, after: { settings: { ...before, leverEffortArm: 4 } }, note: 'First line\nSecond line', investigation: { id: 'lever-one-change-v1', force: 'same', distance: 'more' } });
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function session(extra = {}) {
  const store = newStore({ machineLab: { view: 'learn', manualTopic: 'record', bandOverride: 'g68', bench: 'pulley', leverEffortArm: 7, shopAnimating: true, benchExperiments: { lever: pair() }, ...extra } });
  const render = () => tool.render(makeCtx({}, store));
  const find = predicate => nodes(render()).find(predicate);
  return { store, render, find, state: () => store.toolData.machineLab, input: () => find(n => n.props?.id === 'ml-record-note-lever'), html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
describe('Machine Lab work record review', () => {
  it('edits the matching explanation without changing measurements, predictions or live controls', () => {
    const s = session(), original = s.state().benchExperiments.lever;
    s.input().props.onChange({ target: { value: 'Revised\nEvidence <script>literal</script>' } });
    const edited = s.state().benchExperiments.lever;
    expect(edited.note).toBe('Revised\nEvidence <script>literal</script>');
    expect(edited.before).toBe(original.before); expect(edited.after).toBe(original.after);
    expect(edited.investigation).toBe(original.investigation);
    expect(s.state().leverEffortArm).toBe(7); expect(s.state().bench).toBe('pulley');
    expect(s.html()).not.toContain('<script>literal</script>');
  });
  it('bounds explanations and allows clearing them', () => {
    const s = session(); s.input().props.onChange({ target: { value: 'x'.repeat(1500) } });
    expect(s.state().benchExperiments.lever.note.length).toBe(1200);
    s.input().props.onChange({ target: { value: '' } }); expect(s.state().benchExperiments.lever.note).toBe('');
  });
  it.each(['replaced', 'removed'])('ignores stale editors after the record is %s', mode => {
    const s = session(), editor = s.input();
    s.store.toolData.machineLab.benchExperiments = mode === 'removed' ? {} : { lever: pair() };
    const expected = s.state().benchExperiments;
    editor.props.onChange({ target: { value: 'Stale' } }); expect(s.state().benchExperiments).toBe(expected);
  });
  it('keeps multiline explanations out of the frozen evidence text', () => {
    const s = session(), row = s.find(n => n.props?.['data-ml-record-station'] === 'lever');
    const evidence = row.props.children[0].props.children;
    expect(evidence).toContain('200 N → 100 N'); expect(evidence).not.toContain('First line');
    expect(s.input().props.value).toBe('First line\nSecond line');
  });
  it('reviews the correct station without loading recorded geometry or clearing work', () => {
    const s = session(), records = s.state().benchExperiments;
    const button = s.find(n => n.type === 'button' && String(n.props.children).startsWith('Review at station'));
    button.props.onClick();
    expect(s.state().view).toBe('machines'); expect(s.state().bench).toBe('lever');
    expect(s.state().leverEffortArm).toBe(7); expect(s.state().shopAnimating).toBe(false);
    expect(s.state().benchExperiments).toBe(records);
  });
  it.each(['k2', 'g35'])('does not offer a hidden comparison route at %s', bandOverride => {
    const s = session({ bandOverride }); expect(s.input()).toBeTruthy(); expect(s.html()).not.toContain('Review at station');
  });
  it('omits malformed records from review and still offers download without clipboard', () => {
    const s = session({ benchExperiments: { lever: { note: 'bad' } } });
    expect(s.input()).toBeUndefined(); expect(s.html()).toContain('Download text record'); expect(s.html()).toContain('Recorded comparisons: 0/6');
  });
});
