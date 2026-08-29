// Mailbox return leg (2026-08-23): the encrypted offline worksheet's Save
// button posts its envelope straight to the teacher-owned Class Mailbox via
// the EXISTING putsubmission homework auth (pack id+k capability) - no Apps
// Script change, no admin token in the page - with the encrypted file
// download as the never-removed fallback. Behavior was verified end-to-end
// in a real browser (scratchpad mailbox_leg_e2e.mjs): healthy mailbox ->
// chunked POST + receipt + no download; mailbox 500 -> warning + fallback
// download; no target tag -> legacy path byte-for-byte.

import { describe, it, beforeAll, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadAlloModule } from './setup.js';

const root = process.cwd();
const appSource = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8');
const pipeSource = fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8');
const inboxSource = fs.readFileSync(path.join(root, 'view_submission_inbox_source.jsx'), 'utf8');

let SC;
beforeAll(() => {
  if (!window.crypto || !window.crypto.subtle) {
    Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true, writable: true });
  }
  loadAlloModule('submission_crypto_module.js');
  SC = window.AlloModules.SubmissionCrypto;
});

describe('export side: capability selection (monolith)', () => {
  it('picks the newest non-expired, non-revoked hosted share and passes only id+k', () => {
    expect(appSource).toContain("const _hostedSubmitShare = (recentQrShares || []).filter(share => share?.type === 'assignment-pack-hosted'");
    expect(appSource).toContain('&& share.packId && share.packSecret && !share.revokedAt');
    expect(appSource).toContain("&& (!share.expiresAt || Date.parse(share.expiresAt) > Date.now()))");
    expect(appSource).toContain('? { url: mbConfig.url, id: _hostedSubmitShare.packId, k: _hostedSubmitShare.packSecret,');
    // The teacher admin token must NEVER ride an export.
    const targetBlock = appSource.slice(appSource.indexOf('const _mailboxSubmitTarget'),
      appSource.indexOf('const cfgBase', appSource.indexOf('const _mailboxSubmitTarget')));
    expect(targetBlock).not.toContain('admin');
  });

  it('attaches the target only to the encrypted (classPublicJwk) export branch', () => {
    expect(appSource).toContain('...(_mailboxSubmitTarget ? { mailboxSubmitTarget: _mailboxSubmitTarget } : {}) }');
    const plainBranch = "      : { ...exportConfig, ...(stableClassId ? { classId: stableClassId } : {}), assignmentId: offlineAssignmentId };";
    expect(appSource).toContain(plainBranch);
    expect(plainBranch).not.toContain('mailboxSubmitTarget');
  });
});

describe('generated page: submit path (doc_pipeline template)', () => {
  it('injects a validated target tag alongside the key and identity tags', () => {
    expect(pipeSource).toContain('id="alloflow-mailbox-target"');
    expect(pipeSource).toContain("/^PK-[0-9a-f-]{36}$/i.test(String(cfg.mailboxSubmitTarget.id || ''))");
    expect(pipeSource).toContain('${_mailboxTargetJson}');
  });

  it('tries the mailbox first and keeps the download as the wrapped fallback', () => {
    expect(pipeSource).toContain("a: 'putsubmission', id: mailboxTarget.id, k: mailboxTarget.k, sid: sid");
    expect(pipeSource).toContain('if (!mailboxDelivered) {');
    // Client-side expiry check mirrors the server's, so a closed window falls
    // straight to the file instead of burning a doomed request.
    expect(pipeSource).toContain('(mailboxTarget.expiresAt && Date.parse(mailboxTarget.expiresAt) <= Date.now())');
    // Without secure random the sid would collide across students; the guard
    // routes those browsers to the download path.
    expect(pipeSource).toContain("if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') throw new Error('secure random unavailable');");
    // Chunking matches the mailbox limits (60k chars, 200 parts).
    expect(pipeSource).toContain('var chunkSize = 60000;');
    expect(pipeSource).toContain("if (totalParts > 200) throw new Error('work file too large for the mailbox');");
  });

  it('ships the ENCRYPTED envelope - never plaintext responses - and posts as text/plain', () => {
    const start = pipeSource.indexOf('var submissionEnvelope = JSON.stringify({');
    expect(start).toBeGreaterThan(-1);
    const envelope = pipeSource.slice(start, pipeSource.indexOf('});', start));
    expect(envelope).toContain("kind: 'encrypted-worksheet'");
    expect(envelope).toContain('wrappedKey: encrypted.wrappedKey');
    expect(envelope).toContain('ciphertext: encrypted.ciphertext');
    expect(envelope).toContain('documentId: payload.documentId');
    expect(envelope).not.toContain('responses');
    expect(pipeSource).toContain("headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: partBody");
  });
});

describe('inbox side: mailbox JSON joins the decrypt queue', () => {
  it('recognizes the encrypted-worksheet kind as a pending encrypted row', () => {
    expect(inboxSource).toContain("if (p && p.kind === 'encrypted-worksheet' && p.ciphertext && p.wrappedKey && p.iv) {");
    const branch = inboxSource.slice(inboxSource.indexOf("p.kind === 'encrypted-worksheet'"),
      inboxSource.indexOf('continue;', inboxSource.indexOf("p.kind === 'encrypted-worksheet'")));
    expect(branch).toContain('encryptedBlob: p');
    expect(branch).toContain("status: 'pending'");
    expect(branch).toContain('mailboxReceipt');
  });

  it('decryptSubmission tolerates the mailbox envelope’s extra metadata fields', async () => {
    const { publicJwk, privateJwk } = await SC.generateClassKeypair();
    const payload = { nickname: 'Ada', docTitle: 'Engines', timestamp: '2026-08-23T12:00:00.000Z', responses: { 'allo-ta:doc1:q1': 'weaves algebraic patterns' }, schemaVersion: 2 };
    const encrypted = await SC.encryptSubmission(payload, publicJwk);
    // What putsubmission stores in Drive: envelope + plaintext routing metadata.
    const mailboxFile = {
      schemaVersion: 2,
      kind: 'encrypted-worksheet',
      studentName: 'Ada',
      nickname: 'Ada',
      docTitle: 'Engines',
      timestamp: payload.timestamp,
      wrappedKey: encrypted.wrappedKey,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      classId: 'class-1',
      assignmentId: 'assign-1',
      mailboxReceipt: { sourceKind: 'homework', sourceId: 'PK-x', receivedAt: '2026-08-23T12:00:05.000Z' },
    };
    const decrypted = await SC.decryptSubmission(mailboxFile, privateJwk);
    expect(decrypted.responses['allo-ta:doc1:q1']).toBe('weaves algebraic patterns');
    expect(decrypted.nickname).toBe('Ada');
  });
});
