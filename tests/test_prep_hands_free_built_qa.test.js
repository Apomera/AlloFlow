import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Hub;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [value, () => {}],
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
});

describe('Test Prep rebuilt hands-free QA', () => {
  it('preserves the general rationale and adds bounded option-level feedback', () => {
    const item = {
      answerIndex: 1,
      choices: ['A choice', 'B choice', 'C choice', 'D choice', 'E choice', 'F choice', 'G choice'],
      rationale: 'The general supported rationale remains intact.',
      choiceRationales: [
        'Selected A misses the controlling condition.',
        'B satisfies the controlling condition.',
        'C relies on an unsupported exception.',
        'D changes the population.',
        'E reverses the relevant sequence.',
        'F adds a fact that is not present.',
        'G uses the wrong decision rule.',
      ],
    };

    const speech = Hub.feedbackSpeechText(item, 0);
    expect(speech).toContain('The general supported rationale remains intact.');
    expect(speech).toContain('Feedback for your selected option A. Selected A misses the controlling condition.');
    expect(speech).toContain('Other option feedback.');
    expect(speech).toContain('Option C. C relies on an unsupported exception.');
    expect(speech).not.toContain('B satisfies the controlling condition.');
    expect(speech).toContain('1 additional option note remains available on screen.');
    expect(speech.length).toBeLessThan(2_500);
  });
});
