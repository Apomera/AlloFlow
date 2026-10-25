#!/usr/bin/env node
'use strict';

// Uses the actual Firestore rules emulator, synthetic documents and loopback
// only. A captured pre-fix rule file provides the vulnerable negative control.
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('../desktop/web-app/node_modules/@firebase/rules-unit-testing');
const { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } = require('../desktop/web-app/node_modules/firebase/firestore');

const projectId = process.env.FIREBASE_RULES_TEST_PROJECT_ID || 'demo-alloflow-session-metadata';
if (projectId !== 'demo-alloflow-session-metadata') throw new Error('Use the fixed local demo project.');
const address = String(process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
if (address.length !== 2 || address[0] !== '127.0.0.1') throw new Error('Use the loopback Firestore emulator.');
const legacy = process.env.SESSION_EXPIRY_EXPECT_LEGACY === '1';
const rulesPath = process.env.FIRESTORE_RULES_PATH ? path.resolve(process.env.FIRESTORE_RULES_PATH) : path.resolve('firestore.rules');
const appId = 'assignment-expiry-test';
const base = 'artifacts/' + appId + '/public/data/';
const sessionPath = code => base + 'sessions/' + code;
const answerPath = code => sessionPath(code) + '/boardAnswers/guest-user';
const hostPath = code => sessionPath(code) + '/boardHost/attempt';
const assetPath = code => base + 'session_assets/img_' + code;
const peerPath = (kind, code, uid = 'guest-user') => base + kind + '/' + code + '/peers/' + uid;
const future = () => new Date(Date.now() + 60 * 60 * 1000);
const past = () => new Date(Date.now() - 60 * 60 * 1000);
const action = { attemptId: 'attempt', turn: 0, requestId: 'a1', kind: 'answer', targetId: 'heater', value: '1' };
const boardState = {
  mode: 'lesson-board', isActive: true, isPaused: false, privateAnswers: true,
  attemptId: 'attempt', teams: { 'guest-user': 'All' },
  teamProgress: { All: { boardActions: {}, boardRuns: { attempt: { turn: 0, steps: { t0: { phase: 'answer', targetId: 'heater' } } } } } }
};
function sessionData(extra = {}) {
  return { hostId: 'host-user', mode: 'sync', roster: { 'guest-user': {} }, quizState: { teams: {} }, escapeRoomState: boardState, ...extra };
}
function peerData() { return { offer: 'synthetic-offer', codename: 'Calm Otter', createdAt: new Date(), expiresAt: future() }; }
function assetData(code) {
  return { kind: 'sessionImage', data: 'data:image/png;base64,AA==', ownerUid: 'host-user', parentId: code,
    parentKind: 'assignment', createdAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) };
}

(async () => {
  const env = await initializeTestEnvironment({ projectId, firestore: { host: address[0], port: Number(address[1]), rules: fs.readFileSync(rulesPath, 'utf8') } });
  const host = env.authenticatedContext('host-user').firestore();
  const guest = env.authenticatedContext('guest-user').firestore();
  const other = env.authenticatedContext('other-user').firestore();
  const unauth = env.unauthenticatedContext().firestore();
  const results = [];
  async function check(name, expected, operation) {
    await (expected === 'allow' ? assertSucceeds(operation()) : assertFails(operation()));
    results.push({ name, expected });
  }
  const allow = (name, operation) => check(name, 'allow', operation);
  const deny = (name, operation) => check(name, 'deny', operation);
  const tightened = (name, operation) => check(name, legacy ? 'allow' : 'deny', operation);
  async function seed(code, extra, { parent = true, signaling = true } = {}) {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      if (parent) await setDoc(doc(db, sessionPath(code)), sessionData(extra));
      await setDoc(doc(db, answerPath(code)), action);
      await setDoc(doc(db, hostPath(code)), { ready: true });
      await setDoc(doc(db, assetPath(code)), assetData(code));
      if (signaling) for (const kind of ['signaling', 'pictionary-signaling', 'quiz-signaling']) await setDoc(doc(db, peerPath(kind, code)), peerData());
    });
  }
  try {
    // Actual authenticated creation and normal activity remain available.
    await allow('active assignment host creation', () => setDoc(doc(host, sessionPath('ACTIVE')), sessionData({ kind: 'assignment', expiresAt: future() })));
    await allow('active assignment participant get', () => getDoc(doc(guest, sessionPath('ACTIVE'))));
    await allow('active assignment participant update', () => updateDoc(doc(guest, sessionPath('ACTIVE')), { 'quizState.teams.guest-user': 'Red' }));
    await allow('active private answer create', () => setDoc(doc(guest, answerPath('ACTIVE')), action));
    await allow('active private answer get', () => getDoc(doc(guest, answerPath('ACTIVE'))));
    await allow('active private answer update', () => updateDoc(doc(guest, answerPath('ACTIVE')), { requestId: 'a2' }));
    await deny('different learner cannot read private answer', () => getDoc(doc(other, answerPath('ACTIVE'))));
    await deny('different learner cannot change private answer', () => updateDoc(doc(other, answerPath('ACTIVE')), { requestId: 'forged' }));
    await deny('participant cannot list sessions', () => getDocs(collection(guest, base + 'sessions')));
    await deny('unauthenticated active assignment get', () => getDoc(doc(unauth, sessionPath('ACTIVE'))));
    await allow('active assignment asset create', () => setDoc(doc(host, assetPath('ACTIVE')), assetData('ACTIVE')));
    await allow('active assignment asset participant get', () => getDoc(doc(guest, assetPath('ACTIVE'))));
    for (const kind of ['signaling', 'pictionary-signaling', 'quiz-signaling']) {
      await allow(kind + ' active create', () => setDoc(doc(guest, peerPath(kind, 'ACTIVE')), peerData()));
      await allow(kind + ' active own read', () => getDoc(doc(guest, peerPath(kind, 'ACTIVE'))));
      await allow(kind + ' active own update', () => updateDoc(doc(guest, peerPath(kind, 'ACTIVE')), { offer: 'synthetic-offer-2' }));
      await allow(kind + ' active host answer', () => updateDoc(doc(host, peerPath(kind, 'ACTIVE')), { answer: 'synthetic-answer' }));
      await deny(kind + ' different learner read', () => getDoc(doc(other, peerPath(kind, 'ACTIVE'))));
    }

    const invalidAssignments = [
      ['EXPIRED', { kind: 'assignment', expiresAt: past() }],
      ['MISSING', { kind: 'assignment' }],
      ['NULLX', { kind: 'assignment', expiresAt: null }],
      ['STRING', { kind: 'assignment', expiresAt: '2099-01-01T00:00:00.000Z' }],
      ['NUMBER', { kind: 'assignment', expiresAt: Date.now() + 3600000 }],
    ];
    for (const [code, extra] of invalidAssignments) {
      await seed(code, extra);
      await deny(code + ' parent remains unreadable', () => getDoc(doc(guest, sessionPath(code))));
      await tightened(code + ' participant update cutoff', () => updateDoc(doc(guest, sessionPath(code)), { 'quizState.teams.guest-user': 'Red' }));
      await tightened(code + ' own private answer read cutoff', () => getDoc(doc(guest, answerPath(code))));
      await tightened(code + ' own private answer update cutoff', () => updateDoc(doc(guest, answerPath(code)), { requestId: 'a2' }));
      await env.withSecurityRulesDisabled(context => deleteDoc(doc(context.firestore(), answerPath(code))));
      await tightened(code + ' own private answer create cutoff', () => setDoc(doc(guest, answerPath(code)), action));
      await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), answerPath(code)), action));
      await tightened(code + ' asset read respects parent cutoff', () => getDoc(doc(guest, assetPath(code))));
      await allow(code + ' asset owner can retrieve', () => getDoc(doc(host, assetPath(code))));
      await allow(code + ' host can maintain assignment', () => updateDoc(doc(host, sessionPath(code)), { mode: 'review' }));
      await allow(code + ' host can read private answer', () => getDoc(doc(host, answerPath(code))));
      await allow(code + ' host can list private answers', () => getDocs(collection(host, sessionPath(code) + '/boardAnswers')));
      await allow(code + ' host-only board state remains available', () => updateDoc(doc(host, hostPath(code)), { ready: false }));
      await deny(code + ' learner cannot delete private answer', () => deleteDoc(doc(guest, answerPath(code))));
      await deny(code + ' learner cannot read host-only state', () => getDoc(doc(guest, hostPath(code))));
      for (const kind of ['signaling', 'pictionary-signaling', 'quiz-signaling']) {
        await tightened(code + ' ' + kind + ' own read cutoff', () => getDoc(doc(guest, peerPath(kind, code))));
        await tightened(code + ' ' + kind + ' own update cutoff', () => updateDoc(doc(guest, peerPath(kind, code)), { offer: 'synthetic-stale-offer' }));
      }
    }

    for (const kind of ['signaling', 'pictionary-signaling', 'quiz-signaling']) {
      await env.withSecurityRulesDisabled(context => deleteDoc(doc(context.firestore(), peerPath(kind, 'EXPIRED'))));
      await tightened(kind + ' expired assignment own create cutoff', () => setDoc(doc(guest, peerPath(kind, 'EXPIRED')), peerData()));
      await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), peerPath(kind, 'EXPIRED')), peerData()));
      await allow(kind + ' expired host can retrieve', () => getDoc(doc(host, peerPath(kind, 'EXPIRED'))));
      await allow(kind + ' expired host can maintain answer', () => updateDoc(doc(host, peerPath(kind, 'EXPIRED')), { answer: 'synthetic-maintenance-answer' }));
      await allow(kind + ' expired peer owner can delete', () => deleteDoc(doc(guest, peerPath(kind, 'EXPIRED'))));
    }

    // Deleting the parent must not leave an own-UID data retrieval bypass.
    await seed('DELETED', { kind: 'assignment', expiresAt: future() });
    await allow('host can delete parent', () => deleteDoc(doc(host, sessionPath('DELETED'))));
    await tightened('deleted parent own private answer get', () => getDoc(doc(guest, answerPath('DELETED'))));
    await deny('deleted parent private answer create already denied', () => setDoc(doc(guest, answerPath('DELETED')), action));
    await deny('deleted parent asset participant read remains denied', () => getDoc(doc(guest, assetPath('DELETED'))));
    await allow('orphan asset owner can retrieve', () => getDoc(doc(host, assetPath('DELETED'))));
    await allow('orphan asset owner can delete', () => deleteDoc(doc(host, assetPath('DELETED'))));
    for (const kind of ['signaling', 'pictionary-signaling', 'quiz-signaling']) {
      await tightened(kind + ' deleted parent own read cutoff', () => getDoc(doc(guest, peerPath(kind, 'DELETED'))));
      await tightened(kind + ' deleted parent own update cutoff', () => updateDoc(doc(guest, peerPath(kind, 'DELETED')), { offer: 'synthetic-orphan-offer' }));
      await allow(kind + ' deleted parent owner can clean up', () => deleteDoc(doc(guest, peerPath(kind, 'DELETED'))));
      await tightened(kind + ' deleted parent own create cutoff', () => setDoc(doc(guest, peerPath(kind, 'DELETED')), peerData()));
    }

    // Legacy live sessions deliberately do not acquire a new expiry contract.
    for (const [code, extra] of [['LIVE1', {}], ['LIVE2', { kind: 'live', expiresAt: past() }]]) {
      await seed(code, extra);
      await allow(code + ' legacy participant get', () => getDoc(doc(guest, sessionPath(code))));
      await allow(code + ' legacy participant update', () => updateDoc(doc(guest, sessionPath(code)), { 'quizState.teams.guest-user': 'Red' }));
      await allow(code + ' legacy own private answer get', () => getDoc(doc(guest, answerPath(code))));
      await allow(code + ' legacy own private answer update', () => updateDoc(doc(guest, answerPath(code)), { requestId: 'live-a2' }));
      await allow(code + ' legacy asset get', () => getDoc(doc(guest, assetPath(code))));
      for (const kind of ['signaling', 'pictionary-signaling', 'quiz-signaling']) {
        await allow(code + ' ' + kind + ' legacy read', () => getDoc(doc(guest, peerPath(kind, code))));
        await allow(code + ' ' + kind + ' legacy update', () => updateDoc(doc(guest, peerPath(kind, code)), { offer: 'synthetic-live-offer' }));
      }
    }

    await allow('host can extend an expired assignment deliberately', () => updateDoc(doc(host, sessionPath('EXPIRED')), { expiresAt: future() }));
    await allow('extended assignment participant access resumes', () => getDoc(doc(guest, sessionPath('EXPIRED'))));
    await allow('extended assignment participant update resumes', () => updateDoc(doc(guest, sessionPath('EXPIRED')), { 'quizState.teams.guest-user': 'Blue' }));
    await allow('expired assignment host can delete answer', () => deleteDoc(doc(host, answerPath('NULLX'))));
    await allow('expired assignment host can delete host-only state', () => deleteDoc(doc(host, hostPath('NULLX'))));
    await allow('expired assignment host can delete parent', () => deleteDoc(doc(host, sessionPath('NULLX'))));

    // The dormant native Driving Questions adapter already expects auth for
    // approved items. The public-item branch must not bypass that requirement.
    const boardPath = base + 'boards/QUESTIONBOARD';
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, boardPath), { hostId: 'host-user', revealPolicy: 'teacher_review', expiresAt: future() });
      await setDoc(doc(db, boardPath + '/items/APPROVED'), { uid: 'other-user', status: 'approved', text: 'Synthetic public lesson question', answered: false });
      await setDoc(doc(db, boardPath + '/items/PENDING'), { uid: 'other-user', status: 'pending', text: 'Synthetic pending lesson question', answered: false });
    });
    await tightened('unauthenticated approved board item get cutoff', () => getDoc(doc(unauth, boardPath + '/items/APPROVED')));
    await tightened('unauthenticated approved board item query cutoff', () => getDocs(query(collection(unauth, boardPath + '/items'), where('status', '==', 'approved'))));
    await allow('authenticated approved board item get', () => getDoc(doc(guest, boardPath + '/items/APPROVED')));
    await allow('authenticated approved board item query', () => getDocs(query(collection(guest, boardPath + '/items'), where('status', '==', 'approved'))));
    await deny('different learner cannot get pending board item', () => getDoc(doc(guest, boardPath + '/items/PENDING')));
    await deny('participant cannot issue unrestricted board item query', () => getDocs(collection(guest, boardPath + '/items')));
    await allow('own pending board item remains readable', () => getDoc(doc(other, boardPath + '/items/PENDING')));
    await allow('own pending board item query remains available', () => getDocs(query(collection(other, boardPath + '/items'), where('uid', '==', 'other-user'))));
    await allow('host can list all board items', () => getDocs(collection(host, boardPath + '/items')));
    await deny('unauthenticated pending board item remains denied', () => getDoc(doc(unauth, boardPath + '/items/PENDING')));
  } finally { await env.cleanup(); }
  console.log(JSON.stringify({ suite: 'assignment-expiry', legacyNegativeControl: legacy, checks: results.length, results }));
})().catch(error => { console.error(error); process.exitCode = 1; });
