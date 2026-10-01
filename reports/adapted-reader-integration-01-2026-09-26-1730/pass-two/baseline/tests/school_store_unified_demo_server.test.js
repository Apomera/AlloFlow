import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const portal = readFileSync(resolve(process.cwd(), 'apps_script/school_rewards/Portal.html'), 'utf8');

// The repository's Vitest setup supplies jsdom globals. Run the unchanged real
// factory in a clean Node process so URL and binary preflight checks use their
// actual Node constructors, just as the local presentation command does.
function createNativeDemo({ unified = false } = {}) {
  const moduleUrl = pathToFileURL(resolve(process.cwd(), 'dev-tools/school_rewards_admin_demo.mjs')).href;
  const program = 'import { createDemoServer } from ' + JSON.stringify(moduleUrl) + ';\n'
    + 'try { const demo = await createDemoServer({ port: 0, unified: ' + JSON.stringify(unified) + ' });\n'
    + 'process.once("message", message => { if (message === "close") demo.server.close(() => process.exit(0)); });\n'
    + 'process.send({ url: demo.url, address: demo.server.address() });\n'
    + '} catch (error) { process.send({ error: error.message }, () => process.exit(1)); }';
  return new Promise((resolveDemo, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', program], {
      cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    let diagnostic = '', ready = false;
    const timer = setTimeout(() => { child.kill(); reject(new Error('Local demo startup timed out: ' + diagnostic)); }, 10000);
    child.stderr.on('data', chunk => { diagnostic += chunk.toString(); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { if (!ready) { clearTimeout(timer); reject(new Error('Local demo exited before readiness (' + code + '): ' + diagnostic)); } });
    child.once('message', message => {
      clearTimeout(timer);
      if (message.error) { reject(new Error(message.error)); child.kill(); return; }
      ready = true;
      resolveDemo({ child, url: message.url, address: message.address });
    });
  });
}

function localRequest(demo, { path = '/', method = 'GET', headers = {}, body } = {}) {
  const base = new URL(demo.url);
  return new Promise((resolveResponse, reject) => {
    const request = http.request({
      hostname: '127.0.0.1', port: base.port, path, method, agent: false,
      headers: { Host: base.host, ...headers },
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json;
        try { json = JSON.parse(text); } catch (_) { /* HTML and fixed text responses are expected. */ }
        resolveResponse({ status: response.statusCode, headers: response.headers, text, json });
      });
    });
    request.on('error', reject);
    if (body !== undefined) request.write(typeof body === 'string' ? body : JSON.stringify(body));
    request.end();
  });
}

function closeDemo(demo) {
  if (demo.child.exitCode !== null) return Promise.resolve();
  return new Promise((resolveClose, reject) => {
    const timer = setTimeout(() => { demo.child.kill(); reject(new Error('Local demo did not close cleanly')); }, 5000);
    demo.child.once('exit', code => { clearTimeout(timer); code === 0 ? resolveClose() : reject(new Error('Local demo exit code ' + code)); });
    demo.child.send('close');
  });
}

describe('unified fictional School Store presentation server', () => {
  let demo;
  let generation;

  async function rootPage(path = '/') {
    const response = await localRequest(demo, { path });
    expect(response.status).toBe(200);
    const match = response.text.match(/data-demo-generation="([^"]+)"/);
    expect(match).not.toBeNull();
    generation = match[1];
    return response;
  }

  function post(path, payload, headers = {}) {
    return localRequest(demo, {
      path, method: 'POST',
      headers: { Origin: demo.url, 'Content-Type': 'application/json', ...headers },
      body: payload,
    });
  }

  async function rpc(role, name, argument, changes = {}) {
    const response = await post('/rpc', { role, name, argument, demoGeneration: generation, ...changes });
    expect(response.status).toBe(200);
    expect(response.json).toMatchObject({ ok: true });
    return response.json.result;
  }

  async function bootstrap(role = 'student') {
    return rpc(role, 'getSchoolRewardsBootstrap');
  }

  async function snapshot() {
    const view = await bootstrap();
    return { students: view.students, catalog: view.catalog, recentLedger: view.recentLedger, recentOrders: view.recentOrders };
  }

  async function linkedAvery() {
    const linked = await rpc('staff', 'listSchoolRewardsAlloFlowLinkedClasses');
    expect(linked).toMatchObject({ ok: true, enabled: true });
    const manifestResponse = await localRequest(demo, { path: '/demo-manifest.json' });
    expect(manifestResponse.status).toBe(200);
    const manifest = manifestResponse.json;
    const classInfo = linked.classes.find(item => item.classId === manifest.classId);
    expect(classInfo).toBeDefined();
    expect(classInfo.learners).toEqual(manifest.learners);
    const learner = classInfo.learners.find(item => item.codename === 'Calm Otter');
    expect(learner).toBeDefined();
    const request = {
      repositoryId: linked.repositoryId, yearKey: linked.yearKey, classId: classInfo.classId,
      learnerId: learner.learnerId, expectedClassRevision: classInfo.revision,
    };
    const resolved = await rpc('staff', 'resolveSchoolRewardsAlloFlowLearner', request);
    expect(resolved).toMatchObject({ ok: true, learnerId: learner.learnerId, student: { firstName: 'Avery' } });
    return { linked, manifest, request, student: resolved.student };
  }

  async function awardFive(key = 'unified_demo_qa_award_5') {
    const { student } = await linkedAvery();
    const staff = await bootstrap('staff');
    const award = await rpc('staff', 'awardSchoolRewardsPoints', {
      studentId: student.id, categoryId: staff.categories[0].id, amount: 5,
      reason: 'Helping a partner in this fictional demo', idempotencyKey: key,
    });
    expect(award).toMatchObject({ ok: true, balance: 65 });
    return { student, award };
  }

  async function reset() {
    const result = await post('/reset', { demoGeneration: generation });
    expect(result.status).toBe(200);
    expect(result.json).toEqual({ ok: true });
    await rootPage();
  }

  beforeEach(async () => {
    demo = await createNativeDemo({ unified: true });
    expect(demo.address).toMatchObject({ address: '127.0.0.1', family: 'IPv4' });
    await rootPage();
  });

  afterEach(async () => {
    if (demo) await closeDemo(demo);
    demo = null;
  });

  it('starts with the actual Portal and already-reviewed fictional class links', async () => {
    const page = await rootPage();
    expect(page.text).toContain('id="unified-demo"');
    expect(page.text).toContain(portal);
    expect(page.text).toMatch(/fictional/i);
    expect(page.text).toMatch(/simulat/i);
    expect(page.headers).toMatchObject({
      'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY',
    });
    expect(generation).toMatch(/^[a-f0-9-]{36}$/i);
    const { student } = await linkedAvery();
    const view = await bootstrap();
    expect(view.students.find(item => item.id === student.id)).toMatchObject({ firstName: 'Avery', balance: 60, availableBalance: 60 });
    expect(view.catalog.find(item => item.name === 'Notebook')).toMatchObject({ cost: 10, remaining: 5 });
    expect(view.windows.some(item => item.status === 'OPEN')).toBe(true);
  });

  it('uses the real linked identity, award ledger, student balance, and cashier checkout: 60 to 65 to 55', async () => {
    const { student, award } = await awardFive();
    const studentView = await bootstrap();
    expect(studentView.actor.role).toBe('student');
    expect(studentView.students.find(item => item.id === student.id)).toMatchObject({ balance: 65, availableBalance: 65 });
    expect(studentView.recentLedger.some(entry => entry.amount === 5)).toBe(true);
    const cashier = await bootstrap('cashier');
    const notebook = cashier.catalog.find(item => item.name === 'Notebook');
    const window = cashier.windows.find(item => item.status === 'OPEN');
    const request = {
      studentId: student.id, windowId: window.id,
      lines: [{ catalogId: notebook.id, quantity: 1 }], idempotencyKey: 'unified_demo_qa_notebook',
    };
    const checkout = await rpc('cashier', 'checkoutSchoolRewardsOrder', request);
    expect(checkout).toMatchObject({ ok: true, balance: 55, order: { total: 10 } });
    const retry = await rpc('cashier', 'checkoutSchoolRewardsOrder', request);
    expect(retry).toEqual(checkout);
    const finalView = await bootstrap();
    expect(finalView.students[0]).toMatchObject({ balance: 55, availableBalance: 55 });
    expect(finalView.catalog.find(item => item.name === 'Notebook').remaining).toBe(4);
    expect(finalView.recentOrders).toHaveLength(1);
    const staffView = await bootstrap('staff');
    const repeatedAward = await rpc('staff', 'awardSchoolRewardsPoints', {
      studentId: student.id, categoryId: staffView.categories[0].id, amount: 5,
      reason: 'Helping a partner in this fictional demo', idempotencyKey: 'unified_demo_qa_award_5',
    });
    expect(repeatedAward).toEqual(award);
    expect((await bootstrap()).students[0].balance).toBe(55);
  });

  it('previews only captured receipt mail with current generation and no side effects', async () => {
    const { student } = await awardFive(), view = await bootstrap('cashier');
    const checkout = await rpc('cashier', 'checkoutSchoolRewardsOrder', {
      studentId: student.id, windowId: view.windows.find(item => item.status === 'OPEN').id,
      lines: [{ catalogId: view.catalog.find(item => item.name === 'Notebook').id, quantity: 1 }], idempotencyKey: 'email_preview_checkout',
    });
    const input = { role: 'cashier', receiptId: checkout.receipt.id, orderId: checkout.order.id, demoGeneration: generation };
    const before = await snapshot();
    const preview = await post('/demo-receipt-email', input);
    expect(preview.status).toBe(200); expect(preview.headers['cache-control']).toBe('no-store');
    expect(preview.json.message).toMatchObject({ simulated: true, receiptId: input.receiptId, orderId: input.orderId, to: 'avery@school.example' });
    expect(preview.json.message.body).toContain('55 points'); expect(preview.json.message.htmlBody).toContain('Notebook');
    expect((await post('/demo-receipt-email', input)).json).toEqual(preview.json);
    expect(await snapshot()).toEqual(before);
    expect((await post('/demo-receipt-email', { ...input, orderId: 'wrong' })).status).toBe(404);
    expect((await post('/demo-receipt-email', { ...input, to: 'personal@example.org' })).status).toBe(404);
    expect((await post('/demo-receipt-email', { ...input, role: 'outsider' })).status).toBe(403);
    expect((await post('/demo-receipt-email', input, { Origin: 'https://outside.example' })).status).toBe(403);
    expect((await post('/demo-receipt-email', { ...input, demoGeneration: '' })).status).toBe(409);
    expect((await localRequest(demo, { path: '/demo-receipt-email' })).status).toBe(404);
    await reset();
    expect((await post('/demo-receipt-email', input)).status).toBe(409);
    expect((await post('/demo-receipt-email', { ...input, demoGeneration: generation })).status).toBe(404);
  });

  it('reset clears transactions, restores 60 points and five notebooks, and reseeds functional class links', async () => {
    const { student } = await awardFive();
    const cashier = await bootstrap('cashier');
    await rpc('cashier', 'checkoutSchoolRewardsOrder', {
      studentId: student.id, windowId: cashier.windows.find(item => item.status === 'OPEN').id,
      lines: [{ catalogId: cashier.catalog.find(item => item.name === 'Notebook').id, quantity: 1 }],
      idempotencyKey: 'unified_demo_qa_before_reset',
    });
    const previousGeneration = generation;
    await reset();
    expect(generation).not.toBe(previousGeneration);
    const fresh = await bootstrap();
    expect(fresh.students[0]).toMatchObject({ firstName: 'Avery', balance: 60, availableBalance: 60 });
    expect(fresh.catalog.find(item => item.name === 'Notebook')).toMatchObject({ remaining: 5 });
    expect(fresh.recentOrders).toEqual([]);
    expect(fresh.recentLedger).toHaveLength(1);
    await linkedAvery();
    await awardFive();
    expect((await bootstrap()).students[0].balance).toBe(65);
  });

  it('downloads only the minimal codename roster and never changes points or creates links on GET', async () => {
    const before = await snapshot();
    const pageGeneration = generation;
    const { linked, manifest, student } = await linkedAvery();
    const downloaded = await localRequest(demo, { path: '/demo-manifest.json?role=admin&demoStep=class' });
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers['content-type']).toMatch(/^application\/json/);
    expect(downloaded.headers['content-disposition']).toMatch(/^attachment(?:;|$)/);
    expect(downloaded.headers['cache-control']).toBe('no-store');
    expect(downloaded.json).toEqual(manifest);
    expect(Object.keys(manifest).sort()).toEqual(['classId', 'format', 'learners', 'version']);
    expect(manifest).toMatchObject({ format: 'alloflow-store-roster', version: 1 });
    expect(manifest.learners.length).toBeGreaterThan(0);
    for (const learner of manifest.learners) {
      expect(Object.keys(learner).sort()).toEqual(['codename', 'learnerId']);
      expect(typeof learner.codename).toBe('string');
      expect(typeof learner.learnerId).toBe('string');
    }
    for (const privateValue of [student.id, student.firstName, linked.repositoryId, linked.yearKey, generation, '@school.example']) {
      expect(downloaded.text).not.toContain(privateValue);
    }
    expect(downloaded.text).not.toMatch(/"(?:studentId|firstName|lastInitial|email|staffEmails|repositoryId|token|secret|demoGeneration)"\s*:/i);
    expect(await snapshot()).toEqual(before);
    await rootPage();
    expect(generation).toBe(pageGeneration);
  });

  it.each([
    ['recognize', 'staff'], ['balance', 'student'], ['shop', 'cashier'], ['class', 'staff'],
  ])('serves the %s tour link as a read-only page for simulated %s', async (step, role) => {
    const before = await snapshot();
    const previousGeneration = generation;
    const page = await rootPage('/?demoStep=' + step + '&role=' + role);
    expect(page.text).toContain('id="unified-demo"');
    expect(page.text).toContain(portal);
    expect(generation).toBe(previousGeneration);
    expect(await snapshot()).toEqual(before);
  });

  it('does not execute awards, resets, or administrator actions supplied through GET parameters', async () => {
    const before = await snapshot();
    const previousGeneration = generation;
    const root = await localRequest(demo, { path: '/?demoStep=recognize&role=admin&name=awardSchoolRewardsPoints&amount=1000&reset=true' });
    expect(root.status).toBe(200);
    for (const path of [
      '/rpc?role=admin&name=awardSchoolRewardsPoints&amount=1000',
      '/reset?role=admin', '/adminConfigureSchoolRewardsClassLinks?enabled=true',
    ]) expect((await localRequest(demo, { path })).status).toBe(404);
    expect(await snapshot()).toEqual(before);
    await rootPage();
    expect(generation).toBe(previousGeneration);
  });

  it('a tour step or query role cannot override the explicit simulated RPC actor', async () => {
    const view = await bootstrap('staff');
    const result = await post('/rpc?role=admin&demoStep=recognize', {
      demoGeneration: generation, role: 'student', name: 'awardSchoolRewardsPoints',
      argument: {
        studentId: view.students[0].id, categoryId: view.categories[0].id,
        amount: 5, reason: 'Must not award', idempotencyKey: 'unified_demo_qa_wrong_role',
        actorRole: 'admin', actorEmail: 'admin@school.example',
      },
    });
    expect(result.status).toBe(400);
    expect(result.json.ok).toBe(false);
    expect((await bootstrap()).students[0].balance).toBe(60);
  });

  it.each(['/rpc', '/reset'])('rejects missing and stale generation on %s before mutation', async path => {
    const before = await snapshot();
    const payload = { role: 'admin', name: 'getSchoolRewardsBootstrap' };
    for (const input of [payload, { ...payload, demoGeneration: '' }, { ...payload, demoGeneration: 'stale-generation' }]) {
      const result = await post(path, input);
      expect(result.status).toBe(409);
      expect(result.json.ok).toBe(false);
    }
    expect(await snapshot()).toEqual(before);
  });

  it('rejects an old tab award and reset after a successful reset', async () => {
    const view = await bootstrap('staff');
    const previousGeneration = generation;
    await reset();
    const staleAward = {
      demoGeneration: previousGeneration, role: 'staff', name: 'awardSchoolRewardsPoints',
      argument: { studentId: view.students[0].id, categoryId: view.categories[0].id, amount: 5, reason: 'Old tab', idempotencyKey: 'unified_demo_qa_old_tab' },
    };
    expect((await post('/rpc', staleAward)).status).toBe(409);
    expect((await post('/reset', { demoGeneration: previousGeneration })).status).toBe(409);
    expect((await bootstrap()).students[0].balance).toBe(60);
  });

  it('rejects an award begun before reset but delivered after reset without touching the fresh fixture', async () => {
    const view = await bootstrap('staff');
    const payload = JSON.stringify({
      demoGeneration: generation, role: 'staff', name: 'awardSchoolRewardsPoints',
      argument: { studentId: view.students[0].id, categoryId: view.categories[0].id, amount: 5, reason: 'Delayed old tab', idempotencyKey: 'unified_demo_qa_delayed_tab' },
    });
    const base = new URL(demo.url);
    let delayed;
    const completed = new Promise((resolveResponse, reject) => {
      delayed = http.request({
        hostname: '127.0.0.1', port: base.port, path: '/rpc', method: 'POST', agent: false,
        headers: { Host: base.host, Origin: demo.url, 'Content-Type': 'application/json' },
      }, response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolveResponse({ status: response.statusCode, json: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
      });
      delayed.on('error', reject);
    });
    const split = Math.floor(payload.length / 2);
    await new Promise((resolveWrite, reject) => delayed.write(payload.slice(0, split), error => error ? reject(error) : resolveWrite()));
    try {
      await reset();
      delayed.end(payload.slice(split));
      const result = await completed;
      expect(result.status).toBe(409);
      expect(result.json.ok).toBe(false);
      expect((await bootstrap()).students[0].balance).toBe(60);
      await linkedAvery();
    } finally {
      delayed.destroy();
      await completed.catch(() => {});
    }
  });

  it.each(['/rpc', '/reset'])('requires an exact same-host browser Origin for %s', async path => {
    const before = await snapshot();
    const input = { demoGeneration: generation, role: 'admin', name: 'getSchoolRewardsBootstrap' };
    const origins = [undefined, 'null', 'https://foreign.example', demo.url + '.foreign.example', demo.url.replace('127.0.0.1', 'localhost'), demo.url.replace('http:', 'https:')];
    for (const origin of origins) {
      const headers = { 'Content-Type': 'application/json' };
      if (origin !== undefined) headers.Origin = origin;
      const result = await localRequest(demo, { path, method: 'POST', headers, body: input });
      expect(result.status).toBe(403);
      expect(result.headers['access-control-allow-origin']).toBeUndefined();
    }
    expect(await snapshot()).toEqual(before);
  });

  it.each(['/', '/demo-manifest.json', '/rpc', '/reset'])('rejects a foreign Host on %s even with a forged matching Origin', async path => {
    const before = await snapshot();
    for (const host of ['foreign.example', 'localhost:' + new URL(demo.url).port, '127.0.0.1.foreign.example']) {
      const result = await localRequest(demo, {
        path, method: path === '/rpc' || path === '/reset' ? 'POST' : 'GET',
        headers: { Host: host, Origin: 'http://' + host, 'Content-Type': 'application/json' },
        body: { demoGeneration: generation, role: 'admin', name: 'getSchoolRewardsBootstrap' },
      });
      expect(result.status).toBe(403);
      expect(result.headers['access-control-allow-origin']).toBeUndefined();
    }
    expect(await snapshot()).toEqual(before);
  });

  it.each(['/rpc', '/reset'])('rejects non-JSON content types and malformed JSON on %s', async path => {
    const before = await snapshot();
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data']) {
      const result = await post(path, { demoGeneration: generation, role: 'admin', name: 'getSchoolRewardsBootstrap' }, { 'Content-Type': type });
      expect(result.status).toBe(403);
    }
    const malformed = await post(path, '{ this is not JSON');
    expect(malformed.status).toBe(400);
    expect(malformed.json.ok).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it.each([
    '/apps_script/school_rewards/Code.gs', '/tests/helpers/school_rewards_repository.js',
    '/.git/config', '/package.json', '/../../package.json', '/%2e%2e/package.json',
    '/design/../../package.json', '/C:/Windows/win.ini', '/demo-summary', '/not-a-demo-route',
  ])('never exposes arbitrary local files or unimplemented downloads at %s', async path => {
    const result = await localRequest(demo, { path });
    expect(result.status).toBe(404);
    expect(result.json).toEqual({ ok: false, error: 'Not found' });
    expect(result.text).not.toContain('setupSchoolRewardsRepository');
    expect(result.text).not.toContain('[core]');
    expect(result.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('keeps unsupported methods and RPC names outside the allowlist', async () => {
    const before = await snapshot();
    for (const method of ['PUT', 'DELETE', 'OPTIONS', 'PATCH']) {
      const result = await localRequest(demo, { path: '/reset', method, headers: { Origin: demo.url, 'Content-Type': 'application/json' } });
      expect(result.status).toBe(404);
    }
    for (const [role, name] of [
      ['admin', 'setupSchoolRewardsRepository'], ['admin', 'sendSchoolRewardsBalanceStatements'],
      ['admin', 'exportSchoolRewardsStudentRecord'], ['admin', 'constructor'],
      ['__proto__', 'getSchoolRewardsBootstrap'], ['unknown', 'getSchoolRewardsBootstrap'],
      ['admin', 'getSchoolRewardsBootstrap(); awardSchoolRewardsPoints({})'],
    ]) {
      const result = await post('/rpc', { demoGeneration: generation, role, name });
      expect(result.status).toBe(403);
      expect(result.json.ok).toBe(false);
    }
    expect(await snapshot()).toEqual(before);
  });

  it('preserves the default legacy demo contract without requiring a generation', async () => {
    const legacy = await createNativeDemo();
    try {
      const page = await localRequest(legacy);
      expect(page.status).toBe(200);
      expect(page.text).toContain('Fictional admin demo');
      expect(page.text).not.toContain('id="unified-demo"');
      const legacyPost = (path, body) => localRequest(legacy, {
        path, method: 'POST', headers: { Origin: legacy.url, 'Content-Type': 'application/json' }, body,
      });
      const view = await legacyPost('/rpc', { role: 'student', name: 'getSchoolRewardsBootstrap' });
      expect(view.status).toBe(200);
      expect(view.json.result.students[0]).toMatchObject({ firstName: 'Avery', balance: 60 });
      const links = await legacyPost('/rpc', { role: 'staff', name: 'listSchoolRewardsAlloFlowLinkedClasses' });
      expect(links.status).toBe(200);
      expect(links.json.result).toMatchObject({ enabled: false, classes: [] });
      expect((await legacyPost('/reset', {})).json).toEqual({ ok: true });
      const sample = await localRequest(legacy, { path: '/sample-handoff.json' });
      expect(sample.status).toBe(200);
      expect(sample.headers['content-disposition']).toMatch(/^attachment/);
      expect(sample.json.contentHash).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await closeDemo(legacy);
    }
  });
});
