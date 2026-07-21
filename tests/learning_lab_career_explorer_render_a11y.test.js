import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
async function answerAll(host) {
  const picks = ['q1-people', 'q2-steady', 'q3-collaborate', 'q4-help', 'q5-office'];
  for (const pick of picks) {
    await act(async () => { host.querySelector('#learning-lab-career-' + pick).click(); await Promise.resolve(); });
  }
}

describe('Learning Lab Career Explorer rendered accessibility states', () => {
  let host;
  let root;
  let latestToolData;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkCareer', viewLabel: 'Career Explorer',
      mytkCareer: { saved: [ { id: 'teach', savedAt: '2026-07-01' }, { id: 'unknown-legacy-career', savedAt: null }, null, 'legacy-string' ], preservedSibling: true }
    } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initial);
      latestToolData = toolData;
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders hedged framing, local-only guidance, and a disabled submit until all questions are answered', () => {
    expect(host.textContent).toContain('Use it as a starting point, not a decision or prediction.');
    expect(host.textContent).toContain('nothing here is shared with or sent to a teacher, school, counselor, or family member');
    expect(host.textContent).toContain('There are no right or wrong answers.');
    expect(host.textContent).toContain('0 of 5 questions answered.');
    expect(buttonByText(host, 'See career suggestions').disabled).toBe(true);
    expect(host.querySelectorAll('fieldset')).toHaveLength(5);
    expect(host.textContent).not.toContain('null');
  });

  it('tracks progress in a live status and enables submission when complete', async () => {
    await answerAll(host);
    expect(host.querySelector('#learning-lab-career-progress')?.textContent).toBe('5 of 5 questions answered.');
    expect(buttonByText(host, 'See career suggestions').disabled).toBe(false);
  });

  it('shows honest, non-prescriptive results with focus on the results heading', async () => {
    await answerAll(host);
    await act(async () => { buttonByText(host, 'See career suggestions').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-career-results-heading');
    expect(host.textContent).toContain('not a measure of ability or a recommendation to choose a specific career');
    const matches = host.querySelectorAll('ul[aria-label="Career suggestions"] > li');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(8);
    expect(host.textContent).toMatch(/Matched \d of \d career themes\./);
  });

  it('lists legacy saved careers safely and toggles saving without crashing on malformed entries', async () => {
    await answerAll(host);
    await act(async () => { buttonByText(host, 'See career suggestions').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.textContent).toContain('Careers saved to explore further');
    expect(host.textContent).toContain('Teacher or educator');
    const socialSave = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Save Social worker to careers to explore');
    expect(socialSave).not.toBeUndefined();
    await act(async () => { socialSave.click(); await Promise.resolve(); });
    expect(host.textContent).toContain('Social worker');
    expect(latestToolData.learningLab.mytkCareer.preservedSibling).toBe(true);
    const socialRemove = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove Social worker from careers to explore');
    expect(socialRemove).not.toBeUndefined();
    await act(async () => { socialRemove.click(); await Promise.resolve(); });
    expect(Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Save Social worker to careers to explore')).not.toBeUndefined();
  });

  it('retakes the quiz with focus moved to the first option', async () => {
    await answerAll(host);
    await act(async () => { buttonByText(host, 'See career suggestions').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Retake career quiz').click(); await settleFocus(); });
    expect(host.textContent).toContain('0 of 5 questions answered.');
    expect(document.activeElement?.id).toBe('learning-lab-career-q1-people');
  });
});
