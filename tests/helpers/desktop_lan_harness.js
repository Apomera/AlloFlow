// Drives the real desktop runtime over HTTP: the teacher seeds sessions through
// the private server, students join through the LAN share (PIN -> signed token
// carrying a server-assigned uid) and PATCH/GET with their own tokens.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ENV_KEYS = ['ALLOFLOW_DESKTOP_HOME', 'ALLOFLOW_DESKTOP_CONFIG'];

export async function startLanHarness({ code, pin = 'LAN-TEST-PIN', students = [] }) {
  const savedEnv = {};
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-lan-harness-'));
  process.env.ALLOFLOW_DESKTOP_HOME = home;
  delete process.env.ALLOFLOW_DESKTOP_CONFIG;
  const runtime = require('../../desktop/runtime/alloflow-desktop-runtime.cjs');
  const privateServer = runtime.createServer();
  await new Promise((resolve, reject) => {
    privateServer.once('error', reject);
    privateServer.listen(0, '127.0.0.1', resolve);
  });
  const privateUrl = 'http://127.0.0.1:' + privateServer.address().port;
  const seed = async (data) => {
    const response = await fetch(privateUrl + '/api/lan-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, session: data }),
    });
    if (response.status !== 200) throw new Error('seed failed: ' + response.status);
  };
  await seed({ mode: 'sync', roster: {} });
  const share = await runtime.startLanShare({ liveSession: { mode: 'schoolbox-lan', lan: { shareHost: '127.0.0.1', sharePort: 0, pin } } });
  const shareUrl = 'http://127.0.0.1:' + share.port;
  const auth = async () => fetch(shareUrl + '/api/lan-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionCode: code, pin }),
  }).then((response) => response.json());
  const tokens = {};
  const uids = {};
  for (const name of students) {
    const grant = await auth();
    if (!grant.token || !grant.uid) throw new Error('lan-auth did not return a token and uid');
    tokens[name] = grant.token;
    uids[name] = grant.uid;
  }
  const stored = async () => {
    const body = await fetch(privateUrl + '/api/lan-sessions/' + code).then((response) => response.json());
    return body.session.data;
  };
  const patchWithToken = async (token, updates) => {
    const response = await fetch(shareUrl + '/api/lan-sessions/' + code, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    return { status: response.status, body: await response.json() };
  };
  const studentPatch = (name, updates) => patchWithToken(tokens[name], updates);
  const studentRead = async (name) => {
    const response = await fetch(shareUrl + '/api/lan-sessions/' + code, { headers: { Authorization: 'Bearer ' + tokens[name] } });
    const body = await response.json();
    return body.session && body.session.data;
  };
  const teacherRead = async () => {
    const body = await fetch(privateUrl + '/api/lan-sessions/' + code).then((response) => response.json());
    return body.session && body.session.data;
  };
  const stop = async () => {
    await runtime.stopLanShare().catch(() => {});
    await new Promise((resolve) => privateServer.close(resolve));
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    fs.rmSync(home, { recursive: true, force: true });
  };
  return { runtime, code, pin, privateUrl, shareUrl, seed, stored, auth, tokens, uids, studentPatch, patchWithToken, studentRead, teacherRead, stop };
}
