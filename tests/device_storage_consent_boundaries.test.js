import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('storage_bridge.html', 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const documentHtml = html.replace(/<script>[\s\S]*<\/script>/, '');
const bridgeOrigin = 'https://alloflow-cdn.pages.dev';
const nonce = '0123456789abcdef0123456789abcdef';
const approvalNonce = 'abcdef0123456789abcdef0123456789';
const doms = [];
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0)); };
afterEach(() => { for (const dom of doms.splice(0)) dom.window.close(); vi.restoreAllMocks(); });

// A deliberately small IndexedDB fixture. The complete bridge script runs;
// only the persistence boundary is substituted to control read/write timing.
function database(initial = {}) {
  const rows = new Map(Object.entries(initial).map(([key, value]) => [key, { k: key, value: structuredClone(value) }]));
  const reads = [], writes = [];
  const state = { rows, opens: 0, holdReads: false, holdWrites: false,
    releaseReads() { for (const run of reads.splice(0)) run(); }, releaseWrites() { for (const run of writes.splice(0)) run(); } };
  state.indexedDB = { open() {
    state.opens++;
    const request = {};
    setTimeout(() => {
      request.result = { transaction() {
        const transaction = { aborted: false, changes: [], abort() {
          if (this.aborted) return; this.aborted = true;
          setTimeout(() => this.onabort?.(), 0);
        } };
        let scheduled = false;
        const scheduleCommit = () => {
          if (scheduled) return; scheduled = true;
          const commit = () => setTimeout(() => {
            if (transaction.aborted) return;
            for (const change of transaction.changes) change();
            transaction.oncomplete?.();
          }, 0);
          if (state.holdWrites) writes.push(commit); else commit();
        };
        transaction.objectStore = () => ({
          get(key) {
            const read = {};
            const complete = () => setTimeout(() => {
              if (transaction.aborted) return;
              read.result = structuredClone(rows.get(key)); read.onsuccess?.();
            }, 0);
            if (state.holdReads) reads.push(complete); else complete();
            return read;
          },
          put(record) { transaction.changes.push(() => rows.set(record.k, structuredClone(record))); scheduleCommit(); },
          delete(key) { transaction.changes.push(() => rows.delete(key)); scheduleCommit(); },
          clear() { transaction.changes.push(() => rows.clear()); scheduleCommit(); }
        });
        return transaction;
      } };
      request.onsuccess?.();
    }, 0);
    return request;
  } };
  return state;
}

function fixture({ origin = 'https://school.example', channel = 'popup', records = {}, db = database(records), approval = false, noOpener = false, framed = false } = {}) {
  const client = { postMessage: vi.fn() };
  const url = bridgeOrigin + '/storage_bridge.html#' + (approval ? 'allo-approve=' + approvalNonce : 'allo-ds=' + nonce);
  const dom = new JSDOM(documentHtml, { runScripts: 'outside-only', url }); doms.push(dom);
  if (channel === 'iframe') Object.defineProperty(dom.window, 'parent', { configurable: true, value: client });
  else if (!noOpener) Object.defineProperty(dom.window, 'opener', { configurable: true, value: client });
  if (framed || channel === 'iframe') dom.reconfigure({ windowTop: {} });
  dom.window.indexedDB = db.indexedDB;
  const popup = { closed: false, postMessage: vi.fn(), close: vi.fn(function () { this.closed = true; }) };
  const port = { closed: false, postMessage: vi.fn(), start: vi.fn(), close: vi.fn(function () { this.closed = true; }), onmessage: null, onmessageerror: null };
  const open = vi.fn(() => popup); dom.window.open = open;
  dom.window.eval(script);
  const dispatch = (data, overrides = {}) => {
    const { ports = [], ...rest } = overrides;
    const event = new dom.window.MessageEvent('message', { source: client, origin, data: { allo: 'ds2', nonce, ...data }, ...rest });
    Object.defineProperty(event, 'ports', { value: ports });
    return dom.window.dispatchEvent(event);
  };
  let transferred = false;
  return { dom, win: dom.window, client, db, popup, open, dispatch, port,
    send: data => { if (!port.closed) port.onmessage?.({ data: { allo: 'ds2', nonce, ...data }, ports: [] }); },
    hello: () => {
      dispatch({ type: 'allo-bridge-hello', channel });
      if (!transferred && client.postMessage.mock.calls.some(([msg]) => msg.type === 'allo-bridge-port-required')) {
        transferred = true; dispatch({ type: 'allo-bridge-connect', channel }, { ports: [port] });
      }
    },
    approve: () => dom.window.document.getElementById('btn-approve').click(),
    deny: () => dom.window.document.getElementById('btn-deny').click(),
    ready: () => port.postMessage.mock.calls.some(([data]) => data.type === 'allo-bridge-ready'),
    consentRequired: () => port.postMessage.mock.calls.some(([data]) => data.type === 'allo-bridge-consent-required'),
    decision(approved = true, overrides = {}) {
      const request = popup.postMessage.mock.calls[0]?.[0];
      dispatch({ allo: 'ds-approval1', nonce: request?.nonce, type: 'decision', approved }, { source: popup, origin: bridgeOrigin, ...overrides });
    }
  };
}

describe('persistent DeviceStorage grants', () => {
  it('does not replay a legitimate legacy popup grant for an unrelated origin or expose its records', async () => {
    const h = fixture({ origin: 'https://unrelated.example', records: {
      '__bridge\0consent_v1': { v: 1, origin: 'https://school.example', channel: 'popup' },
      'ls_prefs\0all': { synthetic: 'private' }
    } });
    h.hello(); await flush();
    h.send({ id: 'read', op: 'get', ns: 'ls_prefs', key: 'all' }); await flush();
    expect(h.ready()).toBe(false); expect(h.consentRequired()).toBe(true);
    expect(h.port.postMessage.mock.calls.some(([data]) => data.id === 'read')).toBe(false);
    expect(h.db.rows.get('ls_prefs\0all').value).toEqual({ synthetic: 'private' });
  });

  it.each([
    { v: 1, origin: 'https://school.example', channel: 'popup' },
    { v: 2, origin: 'https://other.example', channel: 'popup' },
    { v: 2, origin: 'https://school.example', channel: 'iframe' },
    { v: 2, origin: 'https://school.example.evil.test', channel: 'popup' },
    { v: 2, origin: 'https://school.example/', channel: 'popup' },
    { v: 2, origin: 'null', channel: 'popup' }
  ])('does not reuse a mismatched or legacy grant %j', async record => {
    const h = fixture({ records: { '__bridge\0consent_v2': record } });
    h.hello(); await flush(); expect(h.ready()).toBe(false); expect(h.consentRequired()).toBe(true);
  });

  it.each(['iframe', 'popup'])('reuses exact concrete-origin %s grants and preserves its stored data', async channel => {
    const h = fixture({ channel, records: {
      '__bridge\0consent_v2': { v: 2, origin: 'https://school.example', channel }, 'ls_prefs\0all': { synthetic: 'private' }
    } });
    h.hello(); await flush(); expect(h.ready()).toBe(true); expect(h.open).not.toHaveBeenCalled();
    h.send({ id: 'read', op: 'get', ns: 'ls_prefs', key: 'all' }); await flush();
    expect(h.port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'read', ok: true, value: { synthetic: 'private' } }));
  });

  it('opaque approval is per connection and creates no reusable grant', async () => {
    const db = database({ '__bridge\0consent_v2': { v: 2, origin: 'null', channel: 'popup' } });
    const first = fixture({ origin: 'null', db }); first.hello(); await flush();
    expect(first.ready()).toBe(false); first.approve(); await flush(); expect(first.ready()).toBe(true);
    expect(db.rows.get('__bridge\0consent_v2').value).toEqual({ v: 2, origin: 'null', channel: 'popup' });
    const second = fixture({ origin: 'null', db }); second.hello(); await flush(); expect(second.ready()).toBe(false);
    expect(first.win.document.getElementById('approval-origin').textContent).toBe('Unidentified page (opaque origin)');
  });

  it('direct top-level approval records the exact observed origin and channel', async () => {
    const h = fixture(); h.hello(); await flush(); h.approve(); await flush();
    expect(h.ready()).toBe(true);
    expect(h.db.rows.get('__bridge\0consent_v2').value).toMatchObject({ v: 2, origin: 'https://school.example', channel: 'popup' });
  });

  it('retains same-origin automatic connection without consulting stored grants', async () => {
    const h = fixture({ origin: bridgeOrigin }); h.hello(); await flush();
    expect(h.ready()).toBe(true); expect(h.db.opens).toBe(0);
  });
});

describe('embedded storage approval window', () => {
  it('an embedded click only opens review; a genuine bound popup decision authorizes the existing store', async () => {
    const h = fixture({ channel: 'iframe', records: { 'ls_prefs\0all': { synthetic: 'existing partition' } } });
    h.hello(); await flush(); h.approve(); await flush();
    expect(h.ready()).toBe(false); expect(h.open).toHaveBeenCalledOnce();
    expect(new URL(h.open.mock.calls[0][0]).hash).toMatch(/^#allo-approve=[a-f0-9]{32}$/);
    expect(h.popup.postMessage).toHaveBeenCalledWith(expect.objectContaining({ allo: 'ds-approval1', requestOrigin: 'https://school.example', channel: 'iframe' }), bridgeOrigin);
    h.decision(); await flush(); expect(h.ready()).toBe(true);
    h.send({ id: 'read', op: 'get', ns: 'ls_prefs', key: 'all' }); await flush();
    expect(h.port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'read', value: { synthetic: 'existing partition' } }));
    expect(h.db.rows.get('__bridge\0consent_v2').value.channel).toBe('iframe');
  });

  it('does not accept an approval from the embedding client, wrong origin, or wrong nonce', async () => {
    const h = fixture({ channel: 'iframe' }); h.hello(); await flush(); h.approve();
    h.decision(true, { source: h.client }); h.decision(true, { origin: 'https://unrelated.example' });
    h.dispatch({ allo: 'ds-approval1', type: 'decision', approved: true, nonce: 'wrong' }, { source: h.popup, origin: bridgeOrigin });
    await flush(); expect(h.ready()).toBe(false); expect(h.db.rows.has('__bridge\0consent_v2')).toBe(false);
  });

  it('stays blocked and permits retry when the approval popup is blocked', async () => {
    const h = fixture({ channel: 'iframe' }); h.open.mockReturnValue(null);
    h.hello(); await flush(); h.approve(); await flush();
    expect(h.ready()).toBe(false); expect(h.win.document.getElementById('btn-approve').disabled).toBe(false);
    expect(h.win.document.getElementById('approval-status').textContent).toContain('blocked');
  });

  it('ignores an old popup decision after it closes and a new review opens', async () => {
    const h = fixture({ channel: 'iframe' }); h.hello(); await flush(); h.approve();
    const oldRequest = h.popup.postMessage.mock.calls[0][0]; h.popup.closed = true;
    await new Promise(resolve => setTimeout(resolve, 270));
    const freshPopup = { closed: false, close: vi.fn(), postMessage: vi.fn() }; h.open.mockReturnValue(freshPopup); h.approve();
    h.dispatch({ allo: 'ds-approval1', type: 'decision', nonce: oldRequest.nonce, approved: true }, { source: h.popup, origin: bridgeOrigin });
    await flush(); expect(h.ready()).toBe(false);
    expect(freshPopup.postMessage.mock.calls[0][0].nonce).not.toBe(oldRequest.nonce);
  });

  it('denial cancels the popup and ignores its later affirmative message', async () => {
    const h = fixture({ channel: 'iframe' }); h.hello(); await flush(); h.approve(); h.deny(); h.decision(); await flush();
    expect(h.ready()).toBe(false); expect(h.popup.close).toHaveBeenCalled(); expect(h.db.rows.has('__bridge\0consent_v2')).toBe(false);
  });

  it('an explicit popup denial blocks repeated hello and does not store a grant', async () => {
    const h = fixture({ channel: 'iframe' }); h.hello(); await flush(); h.approve(); h.decision(false); h.hello(); await flush();
    expect(h.ready()).toBe(false); expect(h.db.rows.has('__bridge\0consent_v2')).toBe(false);
    expect(h.port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'allo-bridge-error', error: expect.objectContaining({ code: 'allo/approval-denied' }) }));
  });
});

describe('approval-only pages', () => {
  it.each([{ noOpener: true }, { framed: true }])('does not open a database or enable approval without a top-level trusted connection %j', async options => {
    const h = fixture({ approval: true, ...options });
    h.dispatch({ allo: 'ds-approval1', type: 'request', nonce: approvalNonce, channel: 'iframe', requestOrigin: 'https://school.example' }, { origin: bridgeOrigin });
    h.approve(); await flush(); expect(h.db.opens).toBe(0); expect(h.client.postMessage).not.toHaveBeenCalled();
    expect(h.win.document.getElementById('review-ui').hidden).toBe(true);
  });

  it('accepts context only from its exact bridge opener, then sends only a bound decision without storage access', async () => {
    const h = fixture({ approval: true });
    const message = { allo: 'ds-approval1', type: 'request', nonce: approvalNonce, channel: 'iframe', requestOrigin: 'null' };
    h.dispatch(message, { origin: 'https://unrelated.example' }); h.dispatch(message, { source: {}, origin: bridgeOrigin });
    h.approve(); expect(h.client.postMessage).not.toHaveBeenCalled();
    h.dispatch(message, { origin: bridgeOrigin });
    expect(h.win.document.getElementById('approval-origin').textContent).toBe('Unidentified page (opaque origin)');
    h.dispatch({ id: 'read', op: 'get', ns: 'ls_prefs', key: 'all' }, { origin: bridgeOrigin });
    h.approve(); await flush();
    expect(h.client.postMessage).toHaveBeenCalledExactlyOnceWith({ allo: 'ds-approval1', type: 'decision', nonce: approvalNonce, approved: true }, bridgeOrigin);
    expect(h.db.opens).toBe(0); expect(h.win.document.getElementById('review-ui').hidden).toBe(true);
  });
});

describe('approval asynchronous invalidation', () => {
  it('does not authorize a stale consent read after the client changes origin', async () => {
    const db = database({ '__bridge\0consent_v2': { v: 2, origin: 'https://school.example', channel: 'popup' } }); db.holdReads = true;
    const h = fixture({ db }); h.hello(); await flush();
    h.dispatch({ type: 'allo-bridge-hello', channel: 'popup' }, { origin: 'https://unrelated.example' });
    db.releaseReads(); await flush(); expect(h.ready()).toBe(false);
  });

  it.each(['denial', 'origin change', 'pagehide', 'port disconnect'])('aborts saved-grant writes and authorization after %s', async action => {
    const db = database(); const h = fixture({ db }); h.hello(); await flush(); db.holdWrites = true;
    h.approve(); await flush();
    if (action === 'denial') h.deny();
    else if (action === 'origin change') h.dispatch({ type: 'allo-bridge-hello', channel: 'popup' }, { origin: 'https://unrelated.example' });
    else if (action === 'port disconnect') h.send({ type: 'allo-bridge-disconnect' });
    else h.win.dispatchEvent(new h.win.Event('pagehide'));
    db.releaseWrites(); await flush(); expect(h.ready()).toBe(false); expect(db.rows.has('__bridge\0consent_v2')).toBe(false);
  });

  it('suppresses already-pending read replies after observed origin invalidation', async () => {
    const h = fixture({ origin: bridgeOrigin, records: { 'ls_prefs\0all': { synthetic: 'private' } } });
    h.hello(); h.db.holdReads = true; h.send({ id: 'read', op: 'get', ns: 'ls_prefs', key: 'all' }); await flush();
    h.dispatch({ type: 'allo-bridge-hello', channel: 'popup' }, { origin: 'https://unrelated.example' });
    h.db.releaseReads(); await flush(); expect(h.port.postMessage.mock.calls.some(([data]) => data.id === 'read')).toBe(false);
  });
});

describe('document-bound storage port', () => {
  const newPort = () => ({ onmessage: null, onmessageerror: null, start: vi.fn(), postMessage: vi.fn(), close: vi.fn() });

  it('rejects ds1 with a generic upgrade error and never runs its window storage operations', async () => {
    const h = fixture({ origin: 'null', records: { 'ls_prefs\0all': { synthetic: 'private' } } });
    h.dispatch({ allo: 'ds1', type: 'allo-bridge-hello', channel: 'popup' });
    h.dispatch({ allo: 'ds1', id: 'old-read', op: 'get', ns: 'ls_prefs', key: 'all' });
    h.dispatch({ allo: 'ds1', id: 'old-write', op: 'set', ns: 'ls_prefs', key: 'all', value: 'replaced' });
    await flush();
    expect(h.db.opens).toBe(0); expect(h.ready()).toBe(false);
    expect(h.client.postMessage).toHaveBeenCalledExactlyOnceWith({ allo: 'ds1', nonce, type: 'allo-bridge-error',
      error: { code: 'allo/bridge-upgrade-required', message: 'Update the app to use document-bound device storage.' } }, '*');
    expect(h.db.rows.get('ls_prefs\0all').value).toEqual({ synthetic: 'private' });
  });

  it('sends only a data-free port-required handshake until a port is transferred', async () => {
    const h = fixture({ origin: bridgeOrigin });
    h.dispatch({ type: 'allo-bridge-hello', channel: 'popup' });
    h.dispatch({ id: 'window-read', op: 'get', ns: 'ls_prefs', key: 'all' });
    await flush(); expect(h.db.opens).toBe(0); expect(h.ready()).toBe(false);
    expect(h.client.postMessage).toHaveBeenCalledExactlyOnceWith({ allo: 'ds2', nonce, type: 'allo-bridge-port-required' }, bridgeOrigin);
  });

  it('requires a valid preceding hello and closes unexpected transferred ports', async () => {
    const h = fixture({ origin: bridgeOrigin }); const premature = newPort();
    h.dispatch({ type: 'allo-bridge-connect', channel: 'popup' }, { ports: [premature] });
    expect(premature.close).toHaveBeenCalledOnce(); expect(premature.start).not.toHaveBeenCalled();
    h.dispatch({ type: 'allo-bridge-hello', channel: 'popup' });
    const first = newPort(), second = newPort();
    h.dispatch({ type: 'allo-bridge-connect', channel: 'popup' }, { ports: [first, second] });
    expect(first.close).toHaveBeenCalledOnce(); expect(second.close).toHaveBeenCalledOnce();
    expect(h.db.opens).toBe(0); expect(h.ready()).toBe(false);
    h.hello(); expect(h.port.start).toHaveBeenCalledOnce(); expect(h.ready()).toBe(true);
  });

  it.each(['source', 'nonce', 'channel'])('rejects a connect with the wrong %s', async mismatch => {
    const h = fixture({ origin: bridgeOrigin }); h.dispatch({ type: 'allo-bridge-hello', channel: 'popup' });
    const port = newPort(), data = { type: 'allo-bridge-connect', channel: 'popup' }, overrides = { ports: [port] };
    if (mismatch === 'source') overrides.source = {};
    else if (mismatch === 'nonce') data.nonce = 'wrong';
    else data.channel = 'iframe';
    h.dispatch(data, overrides); await flush();
    expect(port.close).toHaveBeenCalledOnce(); expect(port.start).not.toHaveBeenCalled(); expect(h.db.opens).toBe(0);
  });

  it('binds the observed origin at hello and cancels a differently originated connect', async () => {
    const h = fixture({ origin: bridgeOrigin }); h.dispatch({ type: 'allo-bridge-hello', channel: 'popup' });
    const port = newPort();
    h.dispatch({ type: 'allo-bridge-connect', channel: 'popup' }, { origin: 'https://unrelated.example', ports: [port] });
    h.hello(); await flush(); expect(h.ready()).toBe(false); expect(port.close).toHaveBeenCalledOnce(); expect(h.db.opens).toBe(0);
  });

  it('ignores window read/write operations after approval while valid port operations still work', async () => {
    const h = fixture({ origin: bridgeOrigin, records: { 'ls_prefs\0all': { synthetic: 'private' } } }); h.hello();
    h.dispatch({ id: 'window-read', op: 'get', ns: 'ls_prefs', key: 'all' });
    h.dispatch({ id: 'window-write', op: 'set', ns: 'ls_prefs', key: 'all', value: 'replaced' }); await flush();
    expect(h.db.opens).toBe(0); expect(h.db.rows.get('ls_prefs\0all').value).toEqual({ synthetic: 'private' });
    expect(h.client.postMessage.mock.calls.every(([msg]) => msg.type === 'allo-bridge-port-required')).toBe(true);
    h.send({ id: 'port-read', op: 'get', ns: 'ls_prefs', key: 'all' }); await flush();
    expect(h.port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'port-read', ok: true, value: { synthetic: 'private' } }));
    expect(h.client.postMessage.mock.calls.some(([msg]) => msg.id)).toBe(false);
  });

  it('never replaces a bound port even with the same window, origin, channel and nonce', async () => {
    const h = fixture({ origin: bridgeOrigin, records: { 'ls_prefs\0all': { synthetic: 'private' } } }); h.hello();
    const replacement = newPort(); h.dispatch({ type: 'allo-bridge-hello', channel: 'popup' });
    h.dispatch({ type: 'allo-bridge-connect', channel: 'popup' }, { ports: [replacement] });
    expect(replacement.close).toHaveBeenCalledOnce(); expect(replacement.start).not.toHaveBeenCalled();
    h.send({ id: 'original', op: 'get', ns: 'ls_prefs', key: 'all' }); await flush();
    expect(h.port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'original', ok: true }));
    expect(replacement.postMessage).not.toHaveBeenCalled(); expect(h.client.postMessage).toHaveBeenCalledTimes(1);
  });

  it('keeps a delayed opaque read on the original document port despite replacement-window messages', async () => {
    const h = fixture({ origin: 'null', records: { 'ls_prefs\0all': { synthetic: 'private' } } });
    h.hello(); await flush(); h.approve(); await flush(); h.db.holdReads = true;
    h.send({ id: 'pending', op: 'get', ns: 'ls_prefs', key: 'all' }); await flush();
    const replacement = newPort();
    h.dispatch({ type: 'allo-bridge-connect', channel: 'popup' }, { ports: [replacement] });
    h.dispatch({ id: 'window-read', op: 'get', ns: 'ls_prefs', key: 'all' });
    h.db.releaseReads(); await flush();
    expect(replacement.close).toHaveBeenCalledOnce(); expect(replacement.postMessage).not.toHaveBeenCalled();
    expect(h.port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'pending', ok: true, value: { synthetic: 'private' } }));
    expect(h.client.postMessage.mock.calls.every(([msg]) => msg.type === 'allo-bridge-port-required')).toBe(true);
  });

  it('explicit disconnect closes the port, suppresses pending replies and permanently refuses replacement ports', async () => {
    const h = fixture({ origin: bridgeOrigin, records: { 'ls_prefs\0all': { synthetic: 'private' } } }); h.hello(); h.db.holdReads = true;
    h.send({ id: 'pending', op: 'get', ns: 'ls_prefs', key: 'all' }); await flush();
    h.send({ type: 'allo-bridge-disconnect' }); h.db.releaseReads(); await flush();
    expect(h.port.close).toHaveBeenCalledOnce(); expect(h.port.onmessage).toBeNull();
    expect(h.port.postMessage.mock.calls.some(([msg]) => msg.id === 'pending')).toBe(false);
    const replacement = newPort(); h.dispatch({ type: 'allo-bridge-connect', channel: 'popup' }, { ports: [replacement] });
    expect(replacement.close).toHaveBeenCalledOnce(); expect(replacement.start).not.toHaveBeenCalled();
  });

  it('ignores old protocol and wrong-nonce port requests and preserves reserved-namespace validation', async () => {
    const h = fixture({ origin: bridgeOrigin }); h.hello();
    h.send({ allo: 'ds1', id: 'old', op: 'get', ns: 'ls_prefs', key: 'all' });
    h.send({ nonce: 'wrong', id: 'wrong', op: 'get', ns: 'ls_prefs', key: 'all' });
    h.send({ id: 'reserved', op: 'get', ns: '__bridge', key: 'consent_v2' }); await flush();
    expect(h.db.opens).toBe(0);
    expect(h.port.postMessage.mock.calls.some(([msg]) => msg.id === 'old' || msg.id === 'wrong')).toBe(false);
    expect(h.port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'reserved', ok: false, error: expect.objectContaining({ code: 'allo/reserved-namespace' }) }));
  });

  it('closes the bound port and cancels pending approval after a channel message error', async () => {
    const h = fixture({ channel: 'iframe' }); h.hello(); await flush(); h.approve();
    h.port.onmessageerror({}); h.decision(); await flush();
    expect(h.ready()).toBe(false); expect(h.port.close).toHaveBeenCalledOnce(); expect(h.popup.close).toHaveBeenCalled();
  });
});
