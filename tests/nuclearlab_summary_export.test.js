// Nuclear & Radiation Lab — "What you worked out".
//
// The lab asks a student to estimate their own dose, predict a ranking, judge
// five claims and write a reflection, and until now none of that left the tool:
// closing the tab lost it, and a teacher had no way to see any of it happened.
// The closing section now gathers the work and makes it copyable.
//
// The risk in a summary like this is that it reports DEFAULTS as findings —
// telling a student who touched nothing that they estimated a dose, because the
// sliders always hold a number. These tests exist mostly to pin that it stays
// silent about work that was never done.

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

function mount(state, ctxOverrides = {}) {
  const seen = { data: null };
  const Comp = () => {
    const [toolData, setToolData] = React.useState({ _nuclearLab: state || {} });
    seen.data = toolData._nuclearLab;
    return cfg.render(makeCtx({ ...ctxOverrides, toolData, setToolData }));
  };
  act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Comp));
  });
  return seen;
}

function summary() {
  return [...host.querySelectorAll('h5')]
    .find((el) => el.textContent.includes('What you worked out'))
    ?.parentElement || null;
}

function copyButton() {
  return [...host.querySelectorAll('button')]
    .find((b) => b.textContent.includes('Copy my summary'));
}

function click(node) {
  act(() => {
    node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}

describe('it reports work, not defaults', () => {
  it('shows nothing at all for a student who has done nothing', () => {
    // Every slider in the dose section holds a number from the first render,
    // so a naive summary would announce an "estimated annual dose" to someone
    // who never opened that section.
    mount({});
    expect(summary()).toBeNull();
  });

  it('stays silent about the dose until the student actually estimates one', () => {
    mount({ evidenceMastered: ['reactor-bomb'] });
    const text = summary().textContent;
    expect(text).not.toContain('estimated annual dose');
  });

  it('reports the dose once the section has been used', () => {
    mount({ doseEstimated: true });
    const text = summary().textContent;
    expect(text).toContain('My estimated annual dose');
    expect(text).toMatch(/mSv\/year/);
    // It must name the dominant contributor rather than only a bare total.
    expect(text).toContain('Largest single contributor');
  });

  it('does not claim a prediction that was never revealed', () => {
    mount({ cmpGuess: { coal_nuclear: 'Coal' } });
    expect(summary()).toBeNull();
  });

  it('reports the prediction score and what was actually said', () => {
    mount({
      cmpRevealed: true,
      cmpGuess: { coal_nuclear: 'Coal', hydro_nuclear: 'Nuclear', gas_solar: 'Natural gas' },
    });
    const text = summary().textContent;
    expect(text).toContain('2 of 3 correct');
    // A wrong answer must be recorded as what it was, not quietly dropped.
    expect(text).toContain('actually Hydropower');
  });

  it('counts only claims that were genuinely mastered', () => {
    mount({ evidenceMastered: ['reactor-bomb', 'reactor-bomb'] });
    const text = summary().textContent;
    // Duplicates in saved state must not inflate the count.
    expect(text).toMatch(/Evidence claims judged/);
    expect(text).toMatch(/1 of 5/);
    expect(text).not.toMatch(/2 of 5/);
    // A bare 'n of 5' in a summary a teacher reads looks like a mark out of
    // five. The activity is untimed and revisable, and the summary has to say
    // so rather than quietly converting progress into a grade.
    expect(text).toContain('progress rather than a score');
  });
});

describe('the reflection travels with it', () => {
  const withReflection = {
    doseEstimated: true,
    nkReflections: {
      all: { confidence: 'explain', idea: 'Dose rate falls with the square of distance.', question: 'How is low-dose risk actually measured?' },
    },
  };

  it('carries the idea and the open question into the summary', () => {
    mount(withReflection);
    const text = summary().textContent;
    expect(text).toContain('Dose rate falls with the square of distance.');
    expect(text).toContain('How is low-dose risk actually measured?');
  });

  it('shows the summary for a reflection even with no other work', () => {
    // Writing a reflection IS work; it should not need a number beside it.
    mount({ nkReflections: { all: { idea: 'Half-life is a convention.' } } });
    expect(summary()).toBeTruthy();
    expect(summary().textContent).toContain('Half-life is a convention.');
  });
});

describe('copying', () => {
  it('routes through the shell clipboard rather than navigator directly', async () => {
    // In Gemini Canvas the Clipboard API is blocked and only the shell's
    // execCommand fallback lands, so a direct writeText drops it silently.
    const writeClipboard = vi.fn(() => Promise.resolve());
    window.StemLab = { ...(window.StemLab || {}), writeClipboard };

    mount({ doseEstimated: true });
    click(copyButton());
    await act(async () => {});

    expect(writeClipboard).toHaveBeenCalledTimes(1);
    const text = writeClipboard.mock.calls[0][0];
    expect(text).toContain('Nuclear & Radiation Lab — what I worked out');
    expect(text).toContain('My estimated annual dose');
    // The provenance line matters: a figure pasted into an assignment should
    // carry where it came from.
    expect(text).toContain('NNDC NuDat 3');
  });

  it('offers selectable text when the copy fails', async () => {
    window.StemLab = {
      ...(window.StemLab || {}),
      writeClipboard: vi.fn(() => Promise.reject(new Error('blocked'))),
    };

    mount({ doseEstimated: true });
    expect(host.querySelector('textarea[aria-label*="ready to select"]')).toBeNull();

    click(copyButton());
    await act(async () => {});

    const fallback = host.querySelector('textarea[aria-label*="ready to select"]');
    expect(fallback).toBeTruthy();
    expect(fallback.value).toContain('My estimated annual dose');
  });

  it('tells a screen reader what happened either way', async () => {
    const announceToSR = vi.fn();
    window.StemLab = {
      ...(window.StemLab || {}),
      writeClipboard: vi.fn(() => Promise.resolve()),
    };

    mount({ doseEstimated: true }, { announceToSR });
    click(copyButton());
    await act(async () => {});

    expect(announceToSR).toHaveBeenCalledWith(expect.stringMatching(/copied/i));
  });
});
