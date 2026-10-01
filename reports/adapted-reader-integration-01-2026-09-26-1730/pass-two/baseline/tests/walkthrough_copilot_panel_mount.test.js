// Walkthrough Copilot panel — REAL-REACT mount smoke.
//
// The standalone suite covers the vanilla surface, and the core suites cover
// the rules, but neither would catch a wiring mistake unique to the React
// panel: a hook-order bug, a handler wired to the wrong setter, a stage that
// renders only when clicked. This mounts the panel with the real React 18 from
// desktop/web-app/node_modules and clicks through it, the same way
// admin_suite_mount_smoke.test.js does for the Leadership Hub.
//
// It loads walkthrough_copilot_cdn_module.js, which is the artifact that
// actually ships to Canvas, so a build that forgot to export a component fails
// here rather than in front of a principal.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let Mods;
const roots = [];
let fetchCalls = [];
let fetchResponder = () => ({ ok: false, error: 'no responder' });

const EXEC_URL = 'https://script.google.com/macros/s/AKfycbxTEST_id/exec';

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.WalkthroughCopilot;
  delete window.AlloModules.WalkthroughScriptSource;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'walkthrough_copilot_cdn_module.js'), 'utf8'))();
  Mods = window.AlloModules;
  if (!Mods.WalkthroughCopilot || !Mods.WalkthroughCopilot.WalkthroughCopilotPanel) {
    throw new Error('WalkthroughCopilot panel did not register');
  }
});

afterEach(() => {
  while (roots.length) {
    const { root, container } = roots.pop();
    act(() => { root.unmount(); });
    container.remove();
  }
  localStorage.clear();
  fetchCalls = [];
});

// No test may reach the network.
window.fetch = (url, options) => {
  const body = JSON.parse(options.body);
  fetchCalls.push({ url, options, body });
  return Promise.resolve({ json: () => Promise.resolve(fetchResponder(body)) });
};

function mount() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(React.createElement(Mods.WalkthroughCopilot.WalkthroughCopilotPanel, {
      isOpen: true, onClose: () => {}, t: null, addToast: () => {}
    }));
  });
  roots.push({ root, container });
  return container;
}

function buttons(container) {
  return Array.from(container.querySelectorAll('button'));
}
function clickText(container, label) {
  const button = buttons(container).find((b) => (b.textContent || '').includes(label));
  if (!button) {
    throw new Error('No button containing "' + label + '". Saw: '
      + buttons(container).map((b) => b.textContent.trim().slice(0, 32)).join(' | '));
  }
  if (button.disabled) throw new Error('Button is disabled: ' + label);
  act(() => { button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
  return button;
}
function setField(container, selector, value) {
  const node = container.querySelector(selector);
  if (!node) throw new Error('No field matching ' + selector);
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : node.tagName === 'INPUT'
        ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
      'value'
    ).set;
    setter.call(node, value);
    node.dispatchEvent(new window.Event('change', { bubbles: true }));
    node.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  return node;
}
function checkBox(container, index) {
  const box = container.querySelectorAll('input[type="checkbox"]')[index];
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked').set;
    setter.call(box, true);
    box.dispatchEvent(new window.Event('click', { bubbles: true }));
    box.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  return box;
}

function keepAll(container) {
  // Bounded: if a click stops registering, this must FAIL, not spin forever.
  for (let guard = 0; guard < 40; guard += 1) {
    const next = buttons(container).find(
      (b) => b.textContent.trim() === 'Keep' && b.getAttribute('aria-pressed') === 'false'
    );
    if (!next) return;
    act(() => { next.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
  }
  throw new Error('keepAll did not settle: a Keep click is not updating aria-pressed');
}

function affirm(container, name) {
  clickText(container, 'Use this for a real observation');
  const boxes = container.querySelectorAll('input[type="checkbox"]');
  for (let i = 0; i < boxes.length; i += 1) checkBox(container, i);
  setField(container, '#wcop-affirm-name', name || 'A. Principal');
  clickText(container, 'Affirm and continue');
}

describe('walkthrough copilot panel mounts and survives the practice flow', () => {
  it('renders practice mode with the intro and the three tiers', () => {
    const c = mount();
    expect(c.textContent).toContain('Practice mode');
    expect(c.textContent).toContain('What this does');
    expect(c.textContent).toContain('Three ways this gets used');
    expect(c.textContent).toContain('District system of record');
    expect(c.textContent).toContain('Choose a practice scenario');
  });

  it('walks a scenario all the way to the copy step without crashing', () => {
    const c = mount();
    clickText(c, 'A five-minute drop-in');
    expect(c.querySelector('textarea').value).toContain('Small group at back table');

    clickText(c, 'Lock these notes and see suggestions');
    expect(c.textContent).toContain('Source notes, locked');
    expect(c.textContent).toContain('Your call on each suggestion');
    expect(c.textContent).toMatch(/0 of \d+ decided/);

    keepAll(c);
    expect(c.textContent).toMatch(/All \d+ decided/);

    clickText(c, 'Continue to the feedback');
    expect(c.textContent).toContain('The feedback as the teacher will read it');
    expect(c.textContent).toContain('AI assistance');

    clickText(c, 'Continue to copy');
    expect(c.textContent).toContain('Copy into your walkthrough form');
    expect(c.textContent).toContain('Domain 3 - Instruction');
  });

  it('shows the cited excerpt and the validator warnings on real render', () => {
    const c = mount();
    clickText(c, 'One voice, twenty-four students');
    clickText(c, 'Lock these notes and see suggestions');

    const quotes = Array.from(c.querySelectorAll('blockquote'));
    expect(quotes.length).toBeGreaterThan(0);
    const frozen = c.querySelector('pre').textContent;
    for (const quote of quotes) expect(frozen).toContain(quote.textContent);
    expect(c.textContent).toMatch(/cites a single moment|judgment/i);
  });

  it('compares against the reference reading without producing a score', () => {
    const c = mount();
    clickText(c, 'Clear directions, confused room');
    clickText(c, 'Lock these notes and see suggestions');
    keepAll(c);
    clickText(c, 'Continue to the feedback');
    clickText(c, 'Compare with the reference reading');

    expect(c.textContent).toContain('Your reading and the reference reading');
    expect(c.textContent).toMatch(/not an answer key/i);
    for (const banned of ['% correct', 'Score:', 'You passed', 'You failed']) {
      expect(c.textContent).not.toContain(banned);
    }
  });
});

describe('walkthrough copilot panel affirmation', () => {
  it('refuses to leave practice mode without every confirmation and a name', () => {
    const c = mount();
    clickText(c, 'Use this for a real observation');
    clickText(c, 'Affirm and continue');
    expect(c.textContent).toMatch(/confirm each statement/i);
    expect(c.textContent, 'still on the affirmation').toContain('Confirm each of these');

    const boxes = c.querySelectorAll('input[type="checkbox"]');
    for (let i = 0; i < boxes.length; i += 1) checkBox(c, i);
    clickText(c, 'Affirm and continue');
    expect(c.textContent).toMatch(/enter your name/i);
  });

  it('records the affirmer in the banner and swaps to your own notes', () => {
    const c = mount();
    affirm(c, 'J. Nauhaus');
    expect(c.textContent).toContain('Real observation');
    expect(c.textContent).toContain('Affirmed by J. Nauhaus for this session only');
    expect(c.textContent).toContain('Your observation notes');
    expect(c.textContent).not.toContain('Choose a practice scenario');
  });

  it('returns to practice mode and forgets the affirmation', () => {
    const c = mount();
    affirm(c);
    clickText(c, 'Back to practice');
    expect(c.textContent).toContain('Practice mode');
    expect(c.textContent).toContain('Choose a practice scenario');
  });

  it('never persists the affirmation', () => {
    const c = mount();
    affirm(c);
    const stored = JSON.stringify(Object.entries(localStorage));
    expect(stored).not.toMatch(/affirm/i);
    expect(stored).not.toContain('A. Principal');
  });
});

describe('walkthrough copilot panel manual evidence entry', () => {
  const NOTES = '9:14 T circulates, stops at four desks, quiet check-ins.\n9:20 exit ticket posted.';

  function lockedRealDraft() {
    const c = mount();
    affirm(c);
    setField(c, 'textarea', NOTES);
    clickText(c, 'Lock these notes');
    return c;
  }

  it('locks your own notes and offers evidence entry rather than suggestions', () => {
    const c = lockedRealDraft();
    expect(c.textContent).toContain('Source notes, locked');
    expect(c.textContent).toContain('Add evidence');
    expect(c.querySelector('#wcop-manual-component')).toBeTruthy();
    expect(c.textContent).toMatch(/0 of 0 decided|All 0 decided/);
  });

  it('records a hand-written claim with a verified citation, contacting nothing', () => {
    const c = lockedRealDraft();
    setField(c, '#wcop-manual-component', '3d');
    setField(c, '#wcop-manual-quote', '9:14 T circulates, stops at four desks, quiet check-ins.');
    setField(c, '#wcop-manual-evidence', 'The teacher circulated and stopped at four desks.');
    clickText(c, 'Add this evidence');

    expect(c.textContent).toContain('The teacher circulated and stopped at four desks.');
    expect(c.textContent).toContain('3d Using Assessment in Instruction');
    expect(fetchCalls, 'manual entry must not contact anything').toHaveLength(0);
  });

  it('refuses a quote that is not in the notes, and says why', () => {
    const c = lockedRealDraft();
    setField(c, '#wcop-manual-component', '3d');
    setField(c, '#wcop-manual-quote', 'the teacher praised three students by name');
    setField(c, '#wcop-manual-evidence', 'Praise was given.');
    clickText(c, 'Add this evidence');

    expect(c.textContent).toMatch(/does not appear in your notes/i);
    expect(c.querySelectorAll('blockquote')).toHaveLength(0);
  });

  it('keeps an earlier decision when more evidence is added', () => {
    const c = lockedRealDraft();
    setField(c, '#wcop-manual-component', '3d');
    setField(c, '#wcop-manual-quote', '9:14 T circulates, stops at four desks, quiet check-ins.');
    setField(c, '#wcop-manual-evidence', 'The teacher circulated and stopped at four desks.');
    clickText(c, 'Add this evidence');
    clickText(c, 'Keep');
    expect(c.textContent).toMatch(/1 of 1 decided|All 1 decided/);

    setField(c, '#wcop-manual-component', '3d');
    setField(c, '#wcop-manual-quote', '9:20 exit ticket posted.');
    setField(c, '#wcop-manual-evidence', 'An exit ticket was posted.');
    clickText(c, 'Add this evidence');

    // The first stays decided; only the new one is pending.
    expect(c.textContent).toMatch(/1 of 2 decided/);
  });

  it('carries hand-written evidence through to the copy step with no watermark', () => {
    const c = lockedRealDraft();
    setField(c, '#wcop-manual-component', '3d');
    setField(c, '#wcop-manual-quote', '9:14 T circulates, stops at four desks, quiet check-ins.');
    setField(c, '#wcop-manual-evidence', 'The teacher circulated and stopped at four desks.');
    clickText(c, 'Add this evidence');
    clickText(c, 'Keep');
    clickText(c, 'Continue to the feedback');
    clickText(c, 'Continue to copy');

    expect(c.textContent).toContain('Copy into your walkthrough form');
    expect(c.textContent).toContain('stopped at four desks');
    expect(c.textContent, 'approved mode carries no practice watermark').not.toContain('DEMO DRAFT');
  });
});

describe('walkthrough copilot panel delivery setup', () => {
  it('shows the deploy steps and the shipped script', () => {
    const c = mount();
    clickText(c, 'Set up delivery');
    expect(c.textContent).toContain('Set up delivery to your teachers');
    expect(c.textContent).toContain('script.new');
    expect(c.textContent).toContain('Who has access: Anyone');
    expect(c.textContent).toMatch(/has not verified/i);
    expect(c.textContent).toMatch(/works offline/i);
    expect(buttons(c).some((b) => b.textContent.includes('Copy script code'))).toBe(true);
  });

  it('rejects a non-deployment URL before contacting anything', () => {
    const c = mount();
    clickText(c, 'Set up delivery');
    setField(c, '#wcop-exec-url', 'https://script.google.com/home/projects/abc/edit');
    clickText(c, 'Connect');
    expect(c.textContent).toMatch(/end with \/exec/i);
    expect(fetchCalls).toHaveLength(0);
  });

  it('connects, self-tests, and reports the owner', async () => {
    fetchResponder = (body) => body.action === 'claim'
      ? { ok: true, token: 'tok-abc', owner: 'principal@school.org', version: 1 }
      : { ok: true, owner: 'principal@school.org', folderName: 'AlloFlow Walkthrough Records', allowedDomain: 'school.org', canSendMail: true };

    const c = mount();
    clickText(c, 'Set up delivery');
    setField(c, '#wcop-exec-url', EXEC_URL);
    await act(async () => {
      buttons(c).find((b) => b.textContent.includes('Connect'))
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(fetchCalls[0].body.action).toBe('claim');
    expect(fetchCalls[0].options.headers['Content-Type']).toMatch(/text\/plain/);
    expect(c.textContent).toMatch(/Connected to principal@school\.org|Self-test passed/);
  });

  it('surfaces a refusal from the script rather than claiming success', async () => {
    fetchResponder = () => ({ ok: false, code: 'already_claimed', error: 'This script is already connected to a device.' });
    const c = mount();
    clickText(c, 'Set up delivery');
    setField(c, '#wcop-exec-url', EXEC_URL);
    await act(async () => {
      buttons(c).find((b) => b.textContent.includes('Connect'))
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(c.textContent).toMatch(/already connected to a device/i);
  });

  it('offers setup from the copy step when nothing is connected', () => {
    const c = mount();
    clickText(c, 'A five-minute drop-in');
    clickText(c, 'Lock these notes and see suggestions');
    keepAll(c);
    clickText(c, 'Continue to the feedback');
    clickText(c, 'Continue to copy');
    expect(c.textContent).toContain('Send it to the teacher');
    expect(buttons(c).some((b) => b.textContent.includes('Set up delivery'))).toBe(true);
  });
});

describe('walkthrough copilot panel accessibility and safety', () => {
  it('gives every control an accessible name', () => {
    const c = mount();
    clickText(c, 'A five-minute drop-in');
    clickText(c, 'Lock these notes and see suggestions');
    for (const button of buttons(c)) {
      const name = (button.textContent || '').trim() || button.getAttribute('aria-label');
      expect(name, 'every button needs an accessible name').toBeTruthy();
    }
    for (const area of Array.from(c.querySelectorAll('textarea, input, select'))) {
      const labelled = area.getAttribute('aria-label')
        || (area.id && c.querySelector('label[for="' + area.id + '"]'));
      expect(labelled, 'every field needs a label: ' + (area.id || area.tagName)).toBeTruthy();
    }
  });

  it('never renders scenario text as markup', () => {
    const c = mount();
    clickText(c, 'Notes that already decided');
    clickText(c, 'Lock these notes and see suggestions');
    expect(c.querySelector('pre script')).toBeNull();
    expect(c.querySelector('pre').children).toHaveLength(0);
  });

  it('states in the footer that it never rates anyone', () => {
    const c = mount();
    expect(c.textContent).toMatch(/never assigns a rating/i);
    expect(c.textContent).toMatch(/before using this with a real staff member/i);
    expect(c.textContent).toMatch(/not an answer key/i);
  });
});
