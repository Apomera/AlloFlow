// Backend API test suite
const http = require('http');

const BASE = 'http://127.0.0.1:3747';

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1',
      port: 3747,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  let pass = 0, fail = 0;
  function ok(n, cond, detail) {
    if (cond) { console.log(`  ✅ ${n}: ${detail}`); pass++; }
    else       { console.log(`  ❌ ${n}: ${detail}`); fail++; }
  }

  // 1. Health
  let r = await req('GET', '/health');
  ok(1, r.status === 200 && r.body.ok, `Health ok=${r.body.ok} backend=${r.body.backend}`);

  // 2. Setup PIN
  r = await req('POST', '/auth/setup-pin', { pin: '1234', teacherName: 'Test Teacher' });
  ok(2, r.status === 200 || r.status === 409,
    r.status === 200 ? `SetupPIN ok` : `SetupPIN already set (409 expected)`);

  // 3. Login
  r = await req('POST', '/auth/login', { pin: '1234' });
  const token = r.body.token;
  ok(3, r.status === 200 && token, `Login token=${token ? token.slice(0,8)+'...' : 'MISSING'} isTeacher=${r.body.user?.isTeacher}`);

  // 4. Session
  r = await req('GET', '/auth/session', null, token);
  ok(4, r.status === 200 && r.body.user?.uid, `Session uid=${r.body.user?.uid} role=${r.body.user?.role}`);

  // 5. Bad login
  r = await req('POST', '/auth/login', { pin: '0000' });
  ok(5, r.status === 401, `BadLogin => ${r.status}`);

  // 6. SetDoc (flat fields — matches db_local_module.js usage)
  r = await req('POST', '/db/sessions', { id: 'sess-abc', code: 1234, active: false }, token);
  ok(6, r.status === 200 && r.body.id === 'sess-abc', `SetDoc id=${r.body.id}`);

  // 7. GetDoc
  r = await req('GET', '/db/sessions/sess-abc', null, token);
  ok(7, r.status === 200 && r.body.code === 1234, `GetDoc code=${r.body.code}`);

  // 8. UpdateDoc
  r = await req('PUT', '/db/sessions/sess-abc', { active: true, mode: 'quiz' }, token);
  ok(8, r.status === 200 && r.body.mode === 'quiz', `UpdateDoc mode=${r.body.mode} active=${r.body.active} code=${r.body.code}`);

  // 9. ListDocs
  r = await req('GET', '/db/sessions', null, token);
  ok(9, r.status === 200 && r.body.docs?.length >= 1, `ListDocs count=${r.body.docs?.length}`);

  // 10. DeleteDoc
  r = await req('DELETE', '/db/sessions/sess-abc', null, token);
  ok(10, r.status === 200 && r.body.ok, `DeleteDoc ok=${r.body.ok}`);

  // 11. Verify deleted
  r = await req('GET', '/db/sessions/sess-abc', null, token);
  ok(11, r.status === 404, `VerifyDeleted => ${r.status}`);

  // 12. Logout
  r = await req('POST', '/auth/logout', null, token);
  ok(12, r.status === 200 && r.body.ok, `Logout ok=${r.body.ok}`);

  // 13. Session after logout
  r = await req('GET', '/auth/session', null, token);
  ok(13, r.status === 401, `SessionAfterLogout => ${r.status}`);

  console.log(`\n${ fail === 0 ? '✅ All' : '⚠️ ' + fail + ' FAILED,'} ${pass}/13 backend tests passed`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => { console.error('Test error:', e); process.exit(1); });
