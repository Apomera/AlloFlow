/**
 * Drives the standalone surface end to end in jsdom.
 *
 * `node --check` cannot catch a stray identifier that parses as a valid
 * expression statement but throws the moment its branch runs, so the interface
 * is exercised by clicking real buttons rather than by inspecting source.
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();

let fetchCalls = [];
let fetchResponder = () => ({ ok: false, error: 'no responder' });

// Reloading the page without wiping storage is how we test that a saved
// connection survives, so clearing is opt-in rather than baked into the loader.
function loadPage(options) {
  document.body.innerHTML = '<div class="wrap"><div id="app"></div>'
    + '<p id="live" role="status" aria-live="polite"></p><footer id="foot"></footer></div>';
  delete window.AlloModules;
  if (!(options && options.keepStorage)) {
    try { window.localStorage.clear(); } catch (err) { /* jsdom always has one */ }
  }
  fetchCalls = [];
  // No test may reach the network. Every call is recorded and answered here.
  window.fetch = (url, options) => {
    const body = JSON.parse(options.body);
    fetchCalls.push({ url, options, body });
    return Promise.resolve({ json: () => Promise.resolve(fetchResponder(body)) });
  };
  // Same load order as walkthrough-copilot.html.
  for (const file of [
    'walkthrough_copilot_module.js',
    'walkthrough_copilot_fixtures.js',
    'walkthrough_copilot_scenarios.js',
    'walkthrough_script_source_module.js',
  ]) {
    const source = readFileSync(resolve(root, file), 'utf8');
    // eslint-disable-next-line no-new-func
    new Function('window', 'module', source)(window, { exports: {} });
  }
  const ui = readFileSync(resolve(root, 'walkthrough_copilot_standalone.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'navigator', ui)(window, document, window.navigator);
}

function buttons() {
  return Array.from(document.querySelectorAll('button'));
}
function byText(fragment) {
  return buttons().find((node) => node.textContent.includes(fragment));
}
function clickId(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error('No element with id: ' + id);
  if (node.disabled) throw new Error('Disabled: ' + id);
  node.click();
  return node;
}
function click(fragment) {
  const node = byText(fragment);
  if (!node) throw new Error('No button matching: ' + fragment + '\nSaw: ' + buttons().map((b) => b.textContent).join(' | '));
  if (node.disabled) throw new Error('Button is disabled: ' + fragment);
  node.click();
  return node;
}
function text() {
  return document.getElementById('app').textContent;
}

describe('walkthrough copilot standalone surface', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadPage();
  });

  it('boots into practice mode with no draft', () => {
    expect(text()).toContain('Practice mode');
    expect(text()).toContain('Nothing is saved');
    expect(text()).toContain('Choose a practice scenario');
    // Later stages are unreachable until notes are frozen.
    expect(byText('Review suggestions').disabled).toBe(true);
    expect(byText('Copy to your form').disabled).toBe(true);
  });

  it('opens with an explanation of what the tool does and the four steps', () => {
    const shown = text();
    expect(shown).toContain('What this does');
    // The four steps, in plain words rather than product jargon.
    for (const step of ['Capture', 'Review', 'Read', 'Copy']) {
      expect(shown, 'step ' + step).toContain(step);
    }
    expect(shown).toMatch(/never rates anyone/i);
  });

  it('states the district advisory as three specific questions, not vague caution', () => {
    const shown = text();
    expect(shown).toMatch(/Before using this with a real staff member/i);
    expect(shown, 'names the provider question').toMatch(/which AI provider/i);
    expect(shown, 'names the evidence-collection question').toMatch(/evidence collections/i);
    expect(shown, 'names the retention question').toMatch(/how long anything typed here is retained/i);
    // And it is honest that this build cannot analyze the user's own notes.
    expect(shown).toMatch(/no AI connected/i);
  });

  it('repeats the advisory in the footer so it survives dismissing the intro', () => {
    const foot = document.getElementById('foot');
    expect(foot.textContent).toMatch(/before using this with a real staff member/i);
    expect(foot.textContent).toMatch(/never assigns a rating/i);

    click('Hide this');
    expect(text()).not.toContain('What this does');
    expect(document.getElementById('foot').textContent).toMatch(/before using this with a real staff member/i);
  });

  it('lets the introduction be hidden and brought back', () => {
    click('Hide this');
    expect(text()).not.toContain('What this does');
    click('What is this?');
    expect(text()).toContain('What this does');
  });

  it('shows how many suggestions are left to decide', () => {
    click('A five-minute drop-in');
    clickId('freeze-btn');
    const progress = document.querySelector('.progress');
    expect(progress).toBeTruthy();
    expect(progress.textContent).toMatch(/0 of \d+ decided/);

    buttons().find((node) => node.textContent === 'Accept').click();
    expect(document.querySelector('.progress').textContent).toMatch(/1 of \d+ decided/);

    while (buttons().some((node) => node.textContent === 'Accept' && node.getAttribute('aria-pressed') === 'false')) {
      buttons().find((node) => node.textContent === 'Accept' && node.getAttribute('aria-pressed') === 'false').click();
    }
    expect(document.querySelector('.progress').textContent).toMatch(/All \d+ decided/);
  });

  it('tells the user that rejecting a lot is a normal outcome', () => {
    click('A five-minute drop-in');
    clickId('freeze-btn');
    expect(text()).toMatch(/normal outcome/i);
  });

  it('shows the three ways this gets used, not just the one it is in', () => {
    const shown = text();
    expect(shown).toContain('Three ways this gets used');
    expect(shown).toContain('Practice, on this device');
    expect(shown).toContain('Deliver to your teachers');
    expect(shown).toContain('District system of record');
    // Honest about what each one costs.
    expect(shown).toContain('Nothing to set up');
    expect(shown).toMatch(/You deploy a script/);
    expect(shown).toMatch(/Your district deploys and runs it/);
    // And honest that the district tier is not something this page can enable.
    expect(shown).toMatch(/not something this page can switch on/i);
  });

  it('walks the user through deploying their own script', () => {
    click('Set up delivery');
    const shown = text();
    expect(shown).toContain('Set up delivery to your teachers');
    expect(shown).toContain('script.new');
    expect(shown).toContain('Who has access: Anyone');
    expect(shown).toMatch(/has not verified/i);
    expect(shown).toContain('/exec');
    // The script ships in the page, so this works with no network.
    expect(byText('Copy script code')).toBeTruthy();
    expect(shown).toMatch(/works offline/i);
  });

  it('rejects a URL that is not a deployment before calling anything', () => {
    click('Set up delivery');
    const url = document.getElementById('exec-url');
    url.value = 'https://script.google.com/home/projects/abc/edit';
    url.dispatchEvent(new window.Event('input'));
    clickId('connect-btn');
    expect(text()).toMatch(/end with \/exec/i);
    expect(fetchCalls, 'a malformed URL must not be contacted').toHaveLength(0);
  });

  it('connects, stores the token, and self-tests', async () => {
    fetchResponder = (body) => {
      if (body.action === 'claim') return { ok: true, token: 'tok-abc', owner: 'principal@school.org', version: 1 };
      if (body.action === 'selftest') return { ok: true, owner: 'principal@school.org', folderName: 'AlloFlow Walkthrough Records', allowedDomain: 'school.org', canSendMail: true };
      return { ok: false };
    };
    click('Set up delivery');
    const url = document.getElementById('exec-url');
    url.value = 'https://script.google.com/macros/s/AKfycbxTEST_id/exec';
    url.dispatchEvent(new window.Event('input'));
    clickId('connect-btn');

    await vi.waitFor(() => expect(text()).toMatch(/Self-test passed/));
    expect(fetchCalls[0].body.action).toBe('claim');
    // Apps Script cannot answer a preflight, so the body must be text/plain.
    expect(fetchCalls[0].options.headers['Content-Type']).toMatch(/text\/plain/);
    expect(fetchCalls[1].body.token, 'the claimed token must travel on later calls').toBe('tok-abc');
    expect(text()).toContain('AlloFlow Walkthrough Records');

    // And it survives a reload, because the connection is config, not content.
    loadPage({ keepStorage: true });
    expect(text()).toMatch(/Connected to principal@school\.org/);
  });

  it('stores only connection config, never observation content', async () => {
    fetchResponder = () => ({ ok: true, token: 'tok-abc', owner: 'principal@school.org' });
    click('Set up delivery');
    const url = document.getElementById('exec-url');
    url.value = 'https://script.google.com/macros/s/AKfycbxTEST_id/exec';
    url.dispatchEvent(new window.Event('input'));
    clickId('connect-btn');
    await vi.waitFor(() => expect(window.localStorage.getItem('allo_wcop_delivery_v1')).toBeTruthy());

    const saved = window.localStorage.getItem('allo_wcop_delivery_v1');
    expect(saved).toContain('execUrl');
    expect(saved).not.toContain('9:05');
    expect(saved).not.toContain('sourceNotes');
    expect(saved).not.toContain('suggestions');
  });

  it('reports a refusal from the script instead of claiming success', async () => {
    fetchResponder = () => ({ ok: false, code: 'already_claimed', error: 'This script is already connected to a device.' });
    click('Set up delivery');
    const url = document.getElementById('exec-url');
    url.value = 'https://script.google.com/macros/s/AKfycbxTEST_id/exec';
    url.dispatchEvent(new window.Event('input'));
    clickId('connect-btn');
    await vi.waitFor(() => expect(text()).toMatch(/already connected to a device/i));
  });

  it('never offers to send practice material to a colleague', async () => {
    fetchResponder = (body) => body.action === 'claim'
      ? { ok: true, token: 'tok-abc', owner: 'principal@school.org' }
      : { ok: true, owner: 'principal@school.org', allowedDomain: 'school.org', canSendMail: true };
    click('Set up delivery');
    const url = document.getElementById('exec-url');
    url.value = 'https://script.google.com/macros/s/AKfycbxTEST_id/exec';
    url.dispatchEvent(new window.Event('input'));
    clickId('connect-btn');
    await vi.waitFor(() => expect(text()).toMatch(/Self-test passed/));

    click('Back to the tool');
    click('A five-minute drop-in');
    clickId('freeze-btn');
    while (buttons().some((n) => n.textContent === 'Keep' || (n.textContent === 'Accept' && n.getAttribute('aria-pressed') === 'false'))) {
      const next = buttons().find((n) => n.textContent === 'Accept' && n.getAttribute('aria-pressed') === 'false');
      if (!next) break;
      next.click();
    }
    click('Continue to the feedback');
    click('Continue to copy');

    const shown = text();
    expect(shown).toMatch(/this is a practice scenario/i);
    expect(byText('Save to my Drive and share'), 'sending must be unavailable for practice').toBeFalsy();
  });

  it('offers setup from the copy step when delivery is not connected', () => {
    click('A five-minute drop-in');
    clickId('freeze-btn');
    while (buttons().some((n) => n.textContent === 'Accept' && n.getAttribute('aria-pressed') === 'false')) {
      buttons().find((n) => n.textContent === 'Accept' && n.getAttribute('aria-pressed') === 'false').click();
    }
    click('Continue to the feedback');
    click('Continue to copy');
    expect(text()).toContain('Send it to the teacher');
    expect(byText('Set up delivery')).toBeTruthy();
  });

  function affirm(name) {
    click('Use this for a real observation');
    document.getElementById('affirm-providerApproved').checked = true;
    document.getElementById('affirm-scopeConfirmed').checked = true;
    document.getElementById('affirm-name').value = name || 'A. Principal';
    clickId('affirm-btn');
  }

  it('offers a route to a real observation from practice mode', () => {
    expect(byText('Use this for a real observation')).toBeTruthy();
    click('Use this for a real observation');
    const shown = text();
    expect(shown).toContain('Use this for a real observation');
    expect(shown).toMatch(/approved the AI provider and data flow/i);
    expect(shown).toMatch(/how a walkthrough is treated in our evaluation system/i);
    expect(shown).toMatch(/not remembered after this session/i);
    expect(shown).toMatch(/changes no analysis/i);
  });

  it('refuses to leave practice mode without every confirmation and a name', () => {
    click('Use this for a real observation');
    clickId('affirm-btn');
    expect(document.getElementById('affirm-msg').textContent).toMatch(/confirm each statement/i);
    expect(text(), 'still in the affirmation, not the tool').toContain('Confirm each of these');

    document.getElementById('affirm-providerApproved').checked = true;
    document.getElementById('affirm-scopeConfirmed').checked = true;
    clickId('affirm-btn');
    expect(document.getElementById('affirm-msg').textContent).toMatch(/enter your name/i);
  });

  it('records who affirmed and shows it in the banner', () => {
    affirm('J. Nauhaus');
    expect(text()).toContain('Real observation');
    expect(text()).toContain('Affirmed by J. Nauhaus for this session only');
    expect(text()).not.toContain('Practice mode');
  });

  it('never remembers the affirmation across a reload', () => {
    affirm();
    expect(text()).toContain('Real observation');
    loadPage({ keepStorage: true });
    expect(text(), 'a new session must ask again').toContain('Practice mode');
    expect(window.localStorage.getItem('allo_wcop_delivery_v1') || '').not.toMatch(/affirm/i);
  });

  it('swaps scenarios for your own notes once affirmed', () => {
    affirm();
    const shown = text();
    expect(shown).toContain('Your observation notes');
    expect(shown).not.toContain('Choose a practice scenario');
    expect(document.getElementById('notes-input').value).toBe('');
    // Locking is unavailable until something is typed.
    expect(document.getElementById('freeze-btn').disabled).toBe(true);
  });

  it('lets an observer record evidence by hand, with no AI involved', () => {
    affirm();
    const notes = document.getElementById('notes-input');
    notes.value = '9:14 T circulates, stops at four desks, quiet check-ins.';
    notes.dispatchEvent(new window.Event('input'));
    render_lock();

    expect(text()).toContain('Add evidence');
    document.getElementById('manual-component').value = '3d';
    document.getElementById('manual-component').dispatchEvent(new window.Event('change'));
    document.getElementById('manual-quote').value = '9:14 T circulates, stops at four desks, quiet check-ins.';
    document.getElementById('manual-quote').dispatchEvent(new window.Event('input'));
    document.getElementById('manual-evidence').value = 'The teacher circulated and stopped at four desks.';
    document.getElementById('manual-evidence').dispatchEvent(new window.Event('input'));
    clickId('manual-add');

    expect(document.querySelectorAll('.sugg').length).toBe(1);
    expect(text()).toContain('The teacher circulated and stopped at four desks.');
    expect(fetchCalls, 'manual entry must not contact anything').toHaveLength(0);
  });

  it('refuses a hand-written quote that is not in the notes', () => {
    affirm();
    const notes = document.getElementById('notes-input');
    notes.value = '9:14 T circulates, stops at four desks.';
    notes.dispatchEvent(new window.Event('input'));
    render_lock();

    document.getElementById('manual-component').value = '3d';
    document.getElementById('manual-component').dispatchEvent(new window.Event('change'));
    document.getElementById('manual-quote').value = 'the teacher praised three students by name';
    document.getElementById('manual-quote').dispatchEvent(new window.Event('input'));
    document.getElementById('manual-evidence').value = 'Praise was given.';
    document.getElementById('manual-evidence').dispatchEvent(new window.Event('input'));
    clickId('manual-add');

    expect(text()).toMatch(/does not appear in your notes/i);
    expect(document.querySelectorAll('.sugg').length).toBe(0);
  });

  // The lock button is the same id in both capture modes.
  function render_lock() {
    clickId('freeze-btn');
  }

  it('lists every practice scenario as a real button', () => {
    const scenarios = require('../walkthrough_copilot_scenarios.js');
    for (const meta of scenarios.listScenarios()) {
      const node = byText(meta.title);
      expect(node, meta.id).toBeTruthy();
      expect(node.tagName, meta.id + ' must be a real button, not a div with a role').toBe('BUTTON');
    }
  });

  it('walks a full scenario from capture through to copy', () => {
    click('A five-minute drop-in');
    expect(document.querySelector('textarea').value).toContain('Small group at back table');

    clickId('freeze-btn');
    expect(text()).toContain('Source notes, frozen');
    expect(text()).toContain('Your call on each suggestion');

    // Continue is blocked while anything is undecided.
    expect(byText('Continue to the feedback').disabled).toBe(true);

    const accepts = buttons().filter((node) => node.textContent === 'Accept');
    expect(accepts.length).toBeGreaterThan(0);
    while (buttons().some((node) => node.textContent === 'Accept' && node.getAttribute('aria-pressed') === 'false')) {
      buttons().find((node) => node.textContent === 'Accept' && node.getAttribute('aria-pressed') === 'false').click();
    }

    click('Continue to the feedback');
    expect(text()).toContain('The feedback as the teacher will read it');
    expect(text()).toContain('Disclosure');
    expect(text()).toContain('AI assistance');

    click('Continue to copy');
    expect(text()).toContain('Copy into your walkthrough form');
    expect(text()).toContain('Domain 3 - Instruction');
    expect(text()).toContain('Copy everything');
  });

  it('warns as soon as the scenario notes are edited, not on the next render', () => {
    click('A five-minute drop-in');
    vi.advanceTimersByTime(5);
    expect(document.getElementById('notes-guard').textContent).toBe('');
    expect(document.getElementById('freeze-btn').disabled).toBe(false);
    expect(document.getElementById('restore-btn').hidden).toBe(true);

    const area = document.getElementById('notes-input');
    area.value = area.value + '\n10:50 a line that breaks the citations.';
    area.dispatchEvent(new window.Event('input'));

    // The warning and the disabled state must appear on the keystroke itself.
    expect(document.getElementById('notes-guard').textContent).toMatch(/no longer match/i);
    expect(document.getElementById('freeze-btn').disabled).toBe(true);
    expect(document.getElementById('restore-btn').hidden).toBe(false);
  });

  it('restores the scenario notes and re-enables analysis', () => {
    click('A five-minute drop-in');
    vi.advanceTimersByTime(5);
    const area = document.getElementById('notes-input');
    const original = area.value;

    area.value = 'completely different notes';
    area.dispatchEvent(new window.Event('input'));
    expect(document.getElementById('freeze-btn').disabled).toBe(true);

    click('Restore scenario notes');
    expect(document.getElementById('notes-input').value).toBe(original);
    expect(document.getElementById('freeze-btn').disabled).toBe(false);
    expect(document.getElementById('notes-guard').textContent).toBe('');

    // And the restored notes still analyze cleanly.
    clickId('freeze-btn');
    expect(text()).toContain('Your call on each suggestion');
  });

  it('keeps the frozen notes visible and unchanged while reviewing', () => {
    const scenarios = require('../walkthrough_copilot_scenarios.js');
    const original = scenarios.getScenario('contradiction').notes;
    click('Clear directions, confused room');
    clickId('freeze-btn');

    const frozen = document.querySelector('.frozen pre').textContent;
    expect(frozen).toBe(original);

    buttons().find((node) => node.textContent === 'Reject').click();
    expect(document.querySelector('.frozen pre').textContent).toBe(original);
  });

  it('shows the cited excerpt for every supported suggestion', () => {
    click('One voice, twenty-four students');
    clickId('freeze-btn');
    const quotes = Array.from(document.querySelectorAll('.sugg blockquote'));
    expect(quotes.length).toBeGreaterThan(0);
    const notes = document.querySelector('.frozen pre').textContent;
    for (const quote of quotes) {
      expect(notes, 'a displayed excerpt must appear in the frozen notes').toContain(quote.textContent);
    }
  });

  it('surfaces validator warnings in the interface', () => {
    click('One voice, twenty-four students');
    clickId('freeze-btn');
    const flags = Array.from(document.querySelectorAll('.flag')).map((node) => node.textContent).join(' ');
    expect(flags).toMatch(/cites a single moment|judgment/i);
  });

  it('blocks copying when the disclosure is emptied', () => {
    click('A five-minute drop-in');
    clickId('freeze-btn');
    while (buttons().some((node) => node.textContent === 'Accept' && node.getAttribute('aria-pressed') === 'false')) {
      buttons().find((node) => node.textContent === 'Accept' && node.getAttribute('aria-pressed') === 'false').click();
    }
    click('Continue to the feedback');

    const box = document.getElementById('disclosure-text');
    box.value = '   ';
    box.dispatchEvent(new window.Event('input'));

    expect(document.getElementById('readiness').textContent).toMatch(/cannot be blank/i);
    // Every affordance that depends on readiness must update, not just the message.
    expect(byText('Continue to copy').disabled).toBe(true);
    expect(document.querySelector('button[data-stage="copy"]').disabled).toBe(true);

    // Restoring wording re-enables them.
    box.value = 'Organized with AI assistance. The observer approved all feedback.';
    box.dispatchEvent(new window.Event('input'));
    expect(byText('Continue to copy').disabled).toBe(false);
    expect(document.querySelector('button[data-stage="copy"]').disabled).toBe(false);
  });

  it('compares against the reference reading without producing a score', () => {
    click('One voice, twenty-four students');
    clickId('freeze-btn');
    while (buttons().some((node) => node.textContent === 'Accept' && node.getAttribute('aria-pressed') === 'false')) {
      buttons().find((node) => node.textContent === 'Accept' && node.getAttribute('aria-pressed') === 'false').click();
    }
    click('Continue to the feedback');
    click('Compare with the reference reading');

    const shown = text();
    expect(shown).toContain('Your reading and the reference reading');
    expect(shown).toMatch(/not an answer key/i);
    expect(shown).toMatch(/Worth discussing/);
    for (const banned of ['% correct', 'Score:', 'You passed', 'You failed']) {
      expect(shown).not.toContain(banned);
    }
  });

  it('clears everything on teardown', () => {
    click('A five-minute drop-in');
    clickId('freeze-btn');
    while (buttons().some((node) => node.textContent === 'Accept' && node.getAttribute('aria-pressed') === 'false')) {
      buttons().find((node) => node.textContent === 'Accept' && node.getAttribute('aria-pressed') === 'false').click();
    }
    click('Continue to the feedback');
    click('Continue to copy');
    click('Clear and start over');

    expect(text()).toContain('Choose a practice scenario');
    expect(document.querySelector('textarea').value).toBe('');
    expect(document.querySelector('.frozen')).toBeNull();
  });

  it('announces state changes through the live region', () => {
    click('A five-minute drop-in');
    vi.advanceTimersByTime(50);
    expect(document.getElementById('live').textContent).toMatch(/Scenario selected/);

    clickId('freeze-btn');
    vi.advanceTimersByTime(50);
    expect(document.getElementById('live').textContent).toMatch(/Notes frozen/);
  });

  it('gives every control an accessible name and keyboard reachability', () => {
    click('A five-minute drop-in');
    clickId('freeze-btn');
    for (const node of buttons()) {
      const name = (node.textContent || '').trim() || node.getAttribute('aria-label');
      expect(name, 'every button needs an accessible name').toBeTruthy();
      // Native buttons are focusable; a positive tabindex would break order.
      expect(node.getAttribute('tabindex')).not.toBe('-1');
    }
    for (const area of Array.from(document.querySelectorAll('textarea'))) {
      const labelled = area.getAttribute('aria-label')
        || (area.id && document.querySelector('label[for="' + area.id + '"]'));
      expect(labelled, 'every textarea needs a label').toBeTruthy();
    }
  });

  it('never injects model or scenario text as markup', () => {
    click('Notes that already decided');
    clickId('freeze-btn');
    // A scenario cannot smuggle an element into the page.
    expect(document.querySelector('.sugg script')).toBeNull();
    expect(document.querySelector('.frozen pre').children.length).toBe(0);
  });
});
