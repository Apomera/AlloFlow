import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const source = readFileSync('error_reporter_module.js', 'utf8');
const windows = [];
const element = (w, id) => w.document.getElementById(id);
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const response = json => ({ ok: true, json: async () => json });
const canary = 'CREDENTIAL_CANARY_VALUE_3498571';
const logText = 'A useful synthetic diagnostic.';

function boot(options = {}) {
  const w = new JSDOM('<html><body></body></html>', { url: options.url || 'https://app.example/work?view=lesson',
    runScripts: 'outside-only', virtualConsole: new VirtualConsole() }).window;
  windows.push(w);
  w.fetch = vi.fn(options.fetch || (async () => response({ ok: true, id: 'synthetic-receipt' })));
  w.open = vi.fn();
  w.document.execCommand = vi.fn(() => true);
  const clipboard = { writeText: vi.fn(async () => {}) };
  Object.defineProperty(w.navigator, 'clipboard', { value: clipboard });
  if (Object.hasOwn(options, 'policy')) w.ALLOFLOW_SUPPORT_REPORTING_POLICY = options.policy;
  if (options.seed) w.localStorage.setItem('alloflow_error_log', JSON.stringify(options.seed));
  if (options.before) options.before(w);
  w.eval(source);
  const api = w.AlloModules.ErrorReporter;
  api.record('error', logText);
  api.openPanel('errors');
  return { w, api, clipboard };
}
function edit(w, id, value) {
  element(w, id).value = value;
  element(w, id).dispatchEvent(new w.Event('input', { bubbles: true }));
}
function confirm(w) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const checkbox = element(w, 'aer-review-confirm');
    if (!checkbox || checkbox.disabled || checkbox.checked) return;
    checkbox.click();
  }
}
function send(w) { confirm(w); element(w, 'aer-send').click(); }
const payload = w => JSON.parse(w.fetch.mock.calls[0][1].body);

afterEach(() => { windows.splice(0).forEach(w => w.close()); vi.restoreAllMocks(); });

describe('deployment-owned support destinations', () => {
  it.each([null, undefined, {}, { version: 2, enabled: true }, { version: 1, enabled: 'yes' },
    { version: 1, enabled: true, endpoint: 'http://support.example/report' },
    { version: 1, enabled: true, endpoint: 'https://user:password@support.example/report' },
    { version: 1, enabled: true, endpoint: 'https://support.example/report?key=value' },
    { version: 1, enabled: true, endpoint: 'https://support.example/report#private' },
    { version: 1, enabled: true, allowGoogleFormFallback: 'yes' },
    { version: 1, enabled: true, typo: true }])('fails closed for malformed configuration %j', async policy => {
    const { w, api, clipboard } = boot({ policy });
    expect(api.getSupportReportingPolicy().enabled).toBe(false);
    confirm(w);
    element(w, 'aer-send').onclick();
    expect(w.fetch).not.toHaveBeenCalled();
    expect(w.open).not.toHaveBeenCalled();
    expect(element(w, 'aer-report-form')).toBeNull();
    element(w, 'aer-copy').click();
    await flush();
    expect(clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(api.getBuffer()).toHaveLength(1);
  });

  it('retains local diagnostics/copy with reporting disabled, including a stale handler call', async () => {
    const { w, api, clipboard } = boot({ policy: { version: 1, enabled: false } });
    expect(element(w, 'aer-review-confirm').disabled).toBe(true);
    element(w, 'aer-send').onclick();
    element(w, 'aer-copy').click();
    await flush();
    expect(w.fetch).not.toHaveBeenCalled();
    expect(w.open).not.toHaveBeenCalled();
    expect(clipboard.writeText.mock.calls[0][0]).toContain(logText);
    expect(api.getBuffer()[0].message).toBe(logText);
  });

  it('sends the exact reviewed fields only to the configured HTTPS endpoint', async () => {
    const endpoint = 'https://district.example/support/report';
    const { w, api } = boot({ policy: { version: 1, enabled: true, endpoint } });
    const stored = w.localStorage.getItem('alloflow_error_log');
    edit(w, 'aer-report-what', 'Reviewed diagnostic text.');
    edit(w, 'aer-report-steps', 'Reviewed steps.');
    edit(w, 'aer-report-browser', 'Reviewed browser metadata.');
    edit(w, 'aer-report-url', 'https://district.example/permitted-context');
    expect(w.fetch).not.toHaveBeenCalled();
    send(w);
    await flush();
    expect(w.fetch).toHaveBeenCalledTimes(1);
    expect(w.fetch.mock.calls[0][0]).toBe(endpoint);
    expect(payload(w)).toEqual({ type: 'Bug Report', what: 'Reviewed diagnostic text.', steps: 'Reviewed steps.',
      browser: 'Reviewed browser metadata.', url: 'https://district.example/permitted-context' });
    expect(w.fetch.mock.calls[0][1]).toMatchObject({ redirect: 'error', credentials: 'omit',
      referrerPolicy: 'no-referrer', cache: 'no-store' });
    expect(w.localStorage.getItem('alloflow_error_log')).toBe(stored);
    expect(api.getBuffer()[0].message).toBe(logText);
    expect(w.open).not.toHaveBeenCalled();
    expect(element(w, 'aer-report-form')).toBeNull();
  });

  it('revokes confirmation when policy changes before dispatch', async () => {
    const { w } = boot();
    confirm(w);
    const oldSend = element(w, 'aer-send');
    w.ALLOFLOW_SUPPORT_REPORTING_POLICY = { version: 1, enabled: false };
    oldSend.onclick();
    expect(w.fetch).not.toHaveBeenCalled();
    expect(element(w, 'aer-review-confirm').checked).toBe(false);
    expect(element(w, 'aer-report-form')).toBeNull();
  });

  it('does not approve a newly changed destination through a checkbox beside stale destination text', () => {
    const { w } = boot();
    w.ALLOFLOW_SUPPORT_REPORTING_POLICY = { version: 1, enabled: true, endpoint: 'https://district.example/report' };
    element(w, 'aer-review-confirm').click();
    expect(element(w, 'aer-review-confirm').checked).toBe(false);
    expect(element(w, 'aer-send').disabled).toBe(true);
    expect(element(w, 'aer-support-destination').textContent).toContain('district.example');
    expect(w.fetch).not.toHaveBeenCalled();
  });

  it('does not follow redirect failures or open fallback automatically; disabled form fallback stays absent', async () => {
    const { w } = boot({ policy: { version: 1, enabled: true, endpoint: 'https://district.example/report' },
      fetch: async () => { throw new TypeError('redirect refused'); } });
    send(w); await flush();
    expect(element(w, 'aer-submit-status').textContent).toContain('Save not confirmed');
    expect(element(w, 'aer-report-form')).toBeNull();
    expect(w.open).not.toHaveBeenCalled();
  });

  it('checks policy again on explicit fallback and exposes no stale external link for middle click', async () => {
    const { w } = boot({ fetch: async () => ({ ok: false, json: async () => ({ ok: false }) }) });
    send(w); await flush();
    const fallback = element(w, 'aer-report-form');
    expect(fallback.tagName).toBe('BUTTON');
    expect(fallback.hasAttribute('href')).toBe(false);
    w.ALLOFLOW_SUPPORT_REPORTING_POLICY = { version: 1, enabled: false };
    fallback.dispatchEvent(new w.MouseEvent('auxclick', { button: 1, bubbles: true }));
    fallback.click();
    expect(w.open).not.toHaveBeenCalled();
    expect(element(w, 'aer-report-form')).toBeNull();
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('exact outgoing-copy review', () => {
  it('requires a confirmation and freezes the draft across new log captures', async () => {
    const { w, api } = boot();
    expect(element(w, 'aer-send').disabled).toBe(true);
    element(w, 'aer-send').onclick();
    expect(w.fetch).not.toHaveBeenCalled();
    const expected = element(w, 'aer-report-what').value;
    confirm(w);
    api.record('error', 'A later event that has not been reviewed.');
    expect(element(w, 'aer-report-what').value).toBe(expected);
    expect(element(w, 'aer-review-confirm').checked).toBe(true);
    element(w, 'aer-send').click(); await flush();
    expect(payload(w).what).toBe(expected);
    expect(payload(w).what).not.toContain('later event');
  });

  it('sanitizes programmatic edits at dispatch, shows the changed copy, and requires new confirmation', async () => {
    const { w } = boot();
    confirm(w);
    element(w, 'aer-report-what').value = 'Authorization: Bearer ' + canary;
    element(w, 'aer-send').onclick();
    expect(w.fetch).not.toHaveBeenCalled();
    expect(element(w, 'aer-review-confirm').checked).toBe(false);
    expect(element(w, 'aer-report-what').value).not.toContain(canary);
    send(w); await flush();
    expect(w.fetch).toHaveBeenCalledTimes(1);
    expect(w.fetch.mock.calls[0][1].body).not.toContain(canary);
  });

  it('invalidates confirmation on a normal edit and updates diagnostics only by explicit refresh', () => {
    const { w, api } = boot();
    confirm(w);
    edit(w, 'aer-report-what', 'Edited diagnostic.');
    expect(element(w, 'aer-review-confirm').checked).toBe(false);
    confirm(w);
    api.record('error', 'Explicit refresh event.');
    expect(element(w, 'aer-report-what').value).toBe('Edited diagnostic.');
    element(w, 'aer-refresh-report').click();
    expect(element(w, 'aer-report-what').value).toContain('Explicit refresh event.');
    expect(element(w, 'aer-review-confirm').checked).toBe(false);
  });
});

describe('credential scrubbing without altering clinical content', () => {
  const jwt = Buffer.from('{"alg":"HS256"}').toString('base64url') + '.' +
    Buffer.from('{"sub":"synthetic-canary"}').toString('base64url') + '.signaturecanary12345';
  const examples = [
    ['Authorization: Bearer ' + canary, canary],
    ['Basic ' + Buffer.from('canary-user:canary-password').toString('base64'), Buffer.from('canary-user:canary-password').toString('base64')],
    [JSON.stringify({ apiKey: canary, password: canary, refresh_token: canary }), canary],
    [JSON.stringify(JSON.stringify({ access_token: canary })), canary],
    ['{"api\\u004bey":"' + canary + '"}', canary],
    ['https://user:' + canary + '@tools.example/path?api%4Bey=' + canary + '#fragment-canary', canary],
    [encodeURIComponent('https://tools.example/?token=' + canary), canary],
    ['https://tools.example/?next=' + encodeURIComponent('https://inner.example/?token=' + canary), canary],
    ['https://tools.example/?next=' + encodeURIComponent(encodeURIComponent('https://inner.example/?token=' + canary)), canary],
    ['Cookie: sessionid=' + canary + '; another=' + canary, canary],
    ['Set-Cookie: session=' + canary + '; Path=/; HttpOnly', canary],
    [JSON.stringify({ Cookie: 'sessionid=' + canary + '; another=' + canary, sessionid: canary }), canary],
    [jwt, jwt],
    ['-----BEGIN PRIVATE KEY-----\n' + canary + '\n-----END PRIVATE KEY-----', canary]
  ];
  it.each(examples.map((example, index) => [index, ...example]))('removes structured credential canary %s idempotently', (_, input, secret) => {
    const { api } = boot();
    const cleaned = api.redactSecrets(input);
    expect(cleaned).not.toContain(secret);
    expect(api.redactSecrets(cleaned)).toBe(cleaned);
  });

  it('scrubs rehydrated source/API fields and raw trace values before truncation/storage/send/copy', async () => {
    const credential = 'Bearer ' + canary;
    const { w, api, clipboard } = boot({
      seed: [{ ts: new Date().toISOString(), level: 'error', message: 'Earlier failure', source: credential,
        api: { Cookie: 'session=' + canary }, url: 'https://app.example/#' + canary, v: 'web' }],
      before: w => {
        w.__alloTtsTrace = [{ at: Date.now(), event: 'synthetic', detail: { padding: 'x'.repeat(95), token: canary } }];
        w.__alloSessionSyncTrace = [{ at: Date.now(), event: 'synthetic', detail: { url: 'https://user:' + canary + '@app.example/?token=' + canary } }];
        w.__alloSearchTrace = [{ at: Date.now(), event: 'synthetic', detail: { Authorization: credential } }];
      }
    });
    api.record('error', 'Request failed ' + credential, credential, 'https://user:' + canary + '@app.example/source',
      1, 1, { password: canary, sessionCount: 12 });
    expect(w.localStorage.getItem('alloflow_error_log')).not.toContain(canary.slice(0, 12));
    expect(JSON.stringify(api.getBuffer())).not.toContain(canary.slice(0, 12));
    expect(api.getBuffer().at(-1).api.sessionCount).toBe(12);
    element(w, 'aer-refresh-report').click();
    element(w, 'aer-copy').click(); await flush();
    send(w); await flush();
    expect(w.fetch.mock.calls[0][1].body).not.toContain(canary.slice(0, 12));
    for (const tab of ['tts', 'session', 'search']) {
      element(w, 'aer-tab-' + tab).click();
      element(w, tab === 'session' ? 'aer-sess-copy' : 'aer-' + tab + '-copy').click();
      await flush();
    }
    for (const [copied] of clipboard.writeText.mock.calls) expect(copied).not.toContain(canary.slice(0, 12));
  });

  it('removes full credentials before input length caps can leave short credential prefixes', async () => {
    const { w, api } = boot();
    const key = 'sk-proj-' + 'A'.repeat(40) + 'END';
    expect(element(w, 'aer-report-browser').hasAttribute('maxlength')).toBe(false);
    edit(w, 'aer-report-browser', 'x'.repeat(480) + key);
    edit(w, 'aer-description', 'x'.repeat(1980) + key);
    expect(element(w, 'aer-report-browser').value.length).toBeLessThanOrEqual(500);
    expect(element(w, 'aer-description').value.length).toBeLessThanOrEqual(2000);
    expect(element(w, 'aer-report-browser').value).not.toContain('sk-proj-');
    expect(element(w, 'aer-description').value).not.toContain('sk-proj-');
    api.record('error', 'x'.repeat(1980) + key);
    expect(JSON.stringify(api.getBuffer())).not.toContain('sk-proj-');
    send(w); await flush();
    expect(w.fetch.mock.calls[0][1].body).not.toContain('sk-proj-');
  });

  it('scrubs execCommand fallback copies across every diagnostics tab', async () => {
    const { w, api, clipboard } = boot({ before: w => {
      const detail = { authorization: 'Bearer ' + canary };
      w.__alloTtsTrace = [{ at: Date.now(), event: 'synthetic', detail }];
      w.__alloSessionSyncTrace = [{ at: Date.now(), event: 'synthetic', detail }];
      w.__alloSearchTrace = [{ at: Date.now(), event: 'synthetic', detail }];
    } });
    clipboard.writeText.mockRejectedValue(new Error('Synthetic clipboard denial'));
    const copied = [];
    w.document.execCommand = vi.fn(() => {
      copied.push(w.document.querySelector('textarea[aria-label^="Temporary field"]').value);
      return true;
    });
    api.record('error', 'Authorization: Bearer ' + canary);
    element(w, 'aer-refresh-report').click();
    element(w, 'aer-copy').click(); await flush();
    for (const tab of ['tts', 'session', 'search']) {
      element(w, 'aer-tab-' + tab).click();
      element(w, tab === 'session' ? 'aer-sess-copy' : 'aer-' + tab + '-copy').click();
      await flush();
    }
    expect(copied).toHaveLength(4);
    copied.forEach(text => expect(text).not.toContain(canary.slice(0, 12)));
    expect(w.fetch).not.toHaveBeenCalled();
  });

  it('keeps benign clinical prose, scores, timings, and session counts', () => {
    const { api } = boot();
    const text = 'Basic reading instruction helped. At 9:15, score 88, sessionCount: 12. Needed visual support for 4 of 6 items.';
    expect(api.redactSecrets(text)).toBe(text);
  });

  it('preserves ordinary long diagnostics without quadratic field-label scanning', () => {
    const { api } = boot();
    const started = performance.now();
    for (const length of [2000, 20000]) {
      const text = 'x'.repeat(length);
      expect(api.redactSecrets(text)).toBe(text);
    }
    // Generous allowance for loaded CI; the former 20k scan alone took >2s.
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('omits an excessive whole diagnostic value before parsing rather than exposing a clipped credential', async () => {
    const { w, api, clipboard } = boot();
    const huge = 'Ordinary diagnostic prefix. ' + 'x'.repeat(100000) + ' Authorization: Bearer ' + canary;
    const omitted = api.redactSecrets(huge);
    expect(omitted).toContain('Diagnostic text omitted');
    expect(omitted).not.toContain('Ordinary diagnostic prefix');
    expect(omitted).not.toContain(canary);
    expect(omitted.length).toBeLessThan(100);
    api.record('error', huge);
    expect(api.getBuffer().at(-1).message).toBe(omitted);
    expect(w.localStorage.getItem('alloflow_error_log')).not.toContain('Ordinary diagnostic prefix');
    element(w, 'aer-refresh-report').click();
    element(w, 'aer-copy').click(); await flush();
    expect(clipboard.writeText.mock.calls[0][0]).not.toContain('Ordinary diagnostic prefix');
    expect(clipboard.writeText.mock.calls[0][0]).not.toContain(canary);
  });

  it('recognizes supported credential field delimiters while leaving similarly named ordinary fields intact', () => {
    const { api } = boot();
    const text = '{"token":"' + canary + '","sessionCount":12}; password=' + canary + '\nX-Api-Key: ' + canary;
    expect(api.redactSecrets(text)).not.toContain(canary);
    expect(api.redactSecrets(text)).toContain('"sessionCount":12');
    expect(api.redactSecrets('tokenCount: 12; session_duration: 60; clinician_note: basic reading support.'))
      .toBe('tokenCount: 12; session_duration: 60; clinician_note: basic reading support.');
  });
});
