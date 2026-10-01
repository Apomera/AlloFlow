import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function choose(select, value) { const setter = Object.getOwnPropertyDescriptor(select.constructor.prototype, 'value').set; setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); }
function buttonByText(container, text) { return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text); }
describe('Learning Lab Executive Function Reflection rendered accessibility states', () => {
  let host; let root; let latest;
  beforeEach(async () => {
    resetStemLab(); const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkEF', viewLabel: 'EF Dashboard', mytkEF: { ratings: [{ id: 'legacy', date: 'invalid-date', initiation: 4 }], preservedSibling: true } } };
    const Component = () => { const [toolData, setToolData] = React.useState(initial); latest = toolData; const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) }); return config.render(ctx); };
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });
  afterEach(() => { document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove()); if (root) act(() => root.unmount()); if (host) host.remove(); });
  it('renders non-diagnostic privacy guidance and eight optional not-rated selects', () => {
    expect(host.querySelector('#learning-lab-ef-dashboard-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('not tests of ability, diagnoses, clinical measures');
    const selects = host.querySelectorAll('form[aria-labelledby="learning-lab-ef-rating-heading"] select');
    expect(selects).toHaveLength(8);
    selects.forEach((select) => expect(select.value).toBe(''));
    expect(selects[0].querySelector('option[value=""]')?.textContent).toBe('Not rated');
  });
  it('reports an empty reflection and focuses the first optional select', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-ef-rating-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-ef-rating-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-ef-rating-initiation');
  });
  it('saves only deliberately rated dimensions without a composite average', async () => {
    await act(async () => { choose(host.querySelector('#learning-lab-ef-rating-planning'), '7'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-ef-rating-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-ef-history-heading');
    expect(latest.learningLab.mytkEF.ratings[0].planning).toBe(7);
    expect(latest.learningLab.mytkEF.ratings[0].initiation).toBeUndefined();
    expect(latest.learningLab.mytkEF.preservedSibling).toBe(true);
    expect(host.textContent).not.toContain('average');
  });
  it('renders robust history timestamps and explicit rated dimensions', () => {
    expect(host.querySelector('article time')?.dateTime).toBeTruthy();
    expect(host.querySelector('article ul[aria-label="Rated dimensions"]')?.textContent).toContain('Getting started: 4 out of 10');
  });
  it('opens strategy ideas without requiring a rating and restores launcher focus', async () => {
    await act(async () => { host.querySelector('#learning-lab-ef-dimension-attention').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-ef-detail-heading');
    expect(host.textContent).toContain('optional ideas, not prescriptions or treatment');
    expect(host.querySelectorAll('ul[aria-label="Sustaining attention strategy ideas"] > li')).toHaveLength(3);
    await act(async () => { buttonByText(host, '← Back to dashboard').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-ef-dimension-attention');
  });
  it('confirms deletion and restores the rating heading when history is empty', async () => {
    await act(async () => { host.querySelector('button[aria-label^="Delete executive function reflection from "]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => { buttonByText(dialog, 'Delete reflection').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-ef-rating-heading');
    expect(latest.learningLab.mytkEF.ratings).toHaveLength(0);
    expect(latest.learningLab.mytkEF.preservedSibling).toBe(true);
  });
});
