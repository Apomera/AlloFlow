// Nuclear & Radiation Lab — section 19, "Compared with the alternatives".
//
// This section carries the tool's most contested claim and used to carry the
// least to do: two static bar charts and a paragraph, no interaction and no
// quest. A student could scroll past the coal/nuclear gap without ever forming
// a view, and the per-source `note` fields had been written but never rendered.
//
// The section now asks for a prediction first. These tests protect the part
// that makes that worth doing: the answer must not be visible while the
// question is still open, and being wrong must stay recoverable rather than
// scored.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

let act;
let cfg;
let host;
let root;
let originalGetContext;

beforeAll(() => {
  act = React.act;
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
  host = document.createElement('div');
  document.body.appendChild(host);
  originalGetContext = window.HTMLCanvasElement.prototype.getContext;
  // DOM interaction, not pixels. null is the documented "no context" path.
  window.HTMLCanvasElement.prototype.getContext = () => null;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  window.HTMLCanvasElement.prototype.getContext = originalGetContext;
  vi.restoreAllMocks();
});

// Mount for real (ReactDOMClient + act) rather than rendering to a string:
// this section's whole behaviour is state that changes on click, and a
// string render cannot see a second write land on top of the first.
function mount(state) {
  const seen = { data: null };
  const Comp = () => {
    const [toolData, setToolData] = React.useState({ _nuclearLab: state || {} });
    seen.data = toolData._nuclearLab;
    return cfg.render(makeCtx({ toolData, setToolData }));
  };
  act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Comp));
  });
  return seen;
}

function section() {
  return host.querySelector('#nksec-compare');
}

function click(node) {
  act(() => {
    node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}

// The reveal button relabels itself, so match on the stable prefix.
function revealButton() {
  return [...section().querySelectorAll('button')]
    .find((b) => /Show me the data|Answer all three|Answers shown/.test(b.textContent));
}

function guessButton(questionText, label) {
  const block = [...section().querySelectorAll('p')]
    .find((p) => p.textContent.trim() === questionText)
    ?.parentElement;
  return [...block.querySelectorAll('button')]
    .find((b) => b.textContent.trim() === label);
}

describe('the prediction gate', () => {
  it('does not show the death figures while the questions are still open', () => {
    mount({});
    const text = section().textContent;
    // 24.6 is coal's figure, the answer to the first question.
    expect(text).not.toContain('24.6');
    expect(text).toContain('The chart appears once you have answered');
  });

  it('does not give the ranking away anywhere else in the section', () => {
    // A screenshot caught what the first version of this test missed: the
    // carbon chart, the summary box and the ponder prompt all sat below the
    // hidden bars and each stated the ordering outright — "nuclear sits with
    // wind and solar rather than with fossil fuels", "800 times more people".
    // Hiding one chart while three neighbours answer it is not a gate.
    mount({});
    const text = section().textContent;
    expect(text).not.toContain('sits with wind and solar');
    expect(text).not.toContain('Lifecycle CO');
    // The carbon figures rank the same sources in the same order.
    expect(text).not.toContain('820');
    // The reflection prompt stays on the page — the lab must always answer the
    // questions it asks — so it must not state the gap as a number either.
    expect(text).toContain('provokes far more fear');
    expect(text).not.toContain('800 times');
  });

  it('brings all of that back once the reveal happens', () => {
    mount({
      cmpRevealed: true,
      cmpGuess: { coal_nuclear: 'Coal', hydro_nuclear: 'Hydropower', gas_solar: 'Natural gas' },
    });
    const text = section().textContent;
    expect(text).toContain('sits with wind and solar');
    expect(text).toContain('Lifecycle CO');
    expect(text).toContain('820');
  });

  it('will not reveal until every question has an answer', () => {
    mount({ cmpGuess: { coal_nuclear: 'Coal' } });
    const button = revealButton();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('1 of 3');

    click(button);
    expect(section().textContent).not.toContain('24.6');
  });

  it('reveals the chart once all three are answered', () => {
    mount({ cmpGuess: { coal_nuclear: 'Coal', hydro_nuclear: 'Hydropower', gas_solar: 'Natural gas' } });
    const button = revealButton();
    expect(button.disabled).toBe(false);

    click(button);
    const text = section().textContent;
    expect(text).toContain('24.6');
    expect(text).toContain('3 of 3 predicted correctly');
  });

  it('keeps feedback hidden until the reveal, so later questions stay honest', () => {
    // Answering the first question must not tell you whether you were right —
    // that would hand over the pattern for the two that follow.
    mount({ cmpGuess: { coal_nuclear: 'Coal' } });
    const text = section().textContent;
    expect(text).not.toContain('Right —');
    expect(text).not.toContain('Actually');
  });

  it('marks a wrong prediction without scoring it', () => {
    // Hydro (1.3) really is above nuclear (0.03): the trap this pair is for.
    mount({
      cmpRevealed: true,
      cmpGuess: { coal_nuclear: 'Coal', hydro_nuclear: 'Nuclear', gas_solar: 'Natural gas' },
    });
    const text = section().textContent;
    expect(text).toContain('Actually Hydropower');
    expect(text).toContain('2 of 3 predicted correctly');
    // Being wrong is framed as ordinary, not as a failure.
    expect(text).toContain('worth sitting with');
  });

  it('lets a student change a prediction before revealing', () => {
    const seen = mount({ cmpGuess: { coal_nuclear: 'Nuclear' } });
    click(guessButton('Per unit of electricity, which has killed more people?', 'Coal'));
    expect(seen.data.cmpGuess.coal_nuclear).toBe('Coal');
  });
});

describe('the chart itself', () => {
  it('renders every source as a real button carrying its own figure', () => {
    mount({ cmpRevealed: true });
    const rows = [...section().querySelectorAll('button')]
      .filter((b) => /deaths per terawatt hour\. Show what is behind/.test(b.getAttribute('aria-label') || ''));
    expect(rows).toHaveLength(8);
    // The label a screen reader gets must carry the number, not just the name.
    expect(rows[0].getAttribute('aria-label')).toContain('24.6 deaths per terawatt hour');
  });

  it('shows the note written for a source when it is opened', () => {
    mount({ cmpRevealed: true });
    expect(section().textContent).not.toContain('Banqiao');

    const hydro = [...section().querySelectorAll('button')]
      .find((b) => (b.getAttribute('aria-label') || '').startsWith('Hydropower,'));
    click(hydro);
    // The note that existed in the data for years and was never rendered.
    expect(section().textContent).toContain('Banqiao');
    expect(hydro.getAttribute('aria-pressed')).toBe('true');
  });

  it('closes an open source when it is clicked again', () => {
    const seen = mount({ cmpRevealed: true, cmpSel: 'Coal' });
    const coal = [...section().querySelectorAll('button')]
      .find((b) => (b.getAttribute('aria-label') || '').startsWith('Coal,'));
    expect(coal.getAttribute('aria-pressed')).toBe('true');
    click(coal);
    expect(seen.data.cmpSel).toBe('');
  });

  it('records each source opened once, for the quest', () => {
    const seen = mount({ cmpRevealed: true });
    const open = (name) => {
      const b = [...section().querySelectorAll('button')]
        .find((x) => (x.getAttribute('aria-label') || '').startsWith(`${name},`));
      click(b);
    };
    open('Coal');
    open('Nuclear');
    open('Coal');
    expect(seen.data.cmpSeen).toEqual(['Coal', 'Nuclear']);
  });
});

describe('the quest', () => {
  const quest = () => cfg.questHooks.find((q) => q.id === 'nk_compare');

  it('exists for a section that used to have none', () => {
    expect(quest()).toBeTruthy();
  });

  it('is not granted on mount', () => {
    expect(quest().check({})).toBe(false);
  });

  it('needs the reveal and four sources, not just one of them', () => {
    expect(quest().check({ cmpRevealed: true })).toBe(false);
    expect(quest().check({ cmpSeen: ['Coal', 'Oil', 'Nuclear', 'Solar'] })).toBe(false);
    expect(quest().check({
      cmpRevealed: true,
      cmpSeen: ['Coal', 'Oil', 'Nuclear', 'Solar'],
    })).toBe(true);
  });

  it('does not require a correct prediction', () => {
    // Understanding is the goal; the quest must not punish a wrong guess.
    expect(quest().check({
      cmpRevealed: true,
      cmpGuess: { coal_nuclear: 'Nuclear', hydro_nuclear: 'Nuclear', gas_solar: 'Solar' },
      cmpSeen: ['Coal', 'Oil', 'Nuclear', 'Solar'],
    })).toBe(true);
  });
});
