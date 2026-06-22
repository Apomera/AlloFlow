// Signed Audit Trail — veraPDF verdict + shipped-bytes fingerprint (2026-06-22), HARDENED after an
// adversarial verify pass (wmvwez8h8) found a stale-verdict defect: the trail could pair a hash of
// the SHIPPED bytes with a veraPDF verdict computed on DIFFERENT bytes (e.g. a baseline/typeset PDF
// produced after validating the remediated one). Fix: bind every veraPDF verdict to a SHA-256 of the
// exact bytes it validated (veraPdfBytesHash), and in the trail attach the verdict ONLY when that hash
// matches shippedFingerprint — otherwise withhold it ("stale"). Also clear the verdict at the two
// byte-producing buttons. This file tests the hash helper, mirrors the gated verdict transform, and
// pins the source wiring (the trail builder is a deep inline onClick, not extractable).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const audit = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8').replace(/\r\n/g, '\n');

// ── Extract + run the real _sha256OfBytes top-level helper ──
const _extractFn = (src, sig) => {
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('not found: ' + sig);
  // balance braces from the first '{' after the signature
  let i = src.indexOf('{', start), depth = 0, end = -1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return src.slice(start, end);
};
const _sha256OfBytes = new Function(_extractFn(audit, 'async function _sha256OfBytes(bytes)') + '\nreturn _sha256OfBytes;')();

describe('_sha256OfBytes helper (shipped-bytes + verdict-binding fingerprint)', () => {
  it('hashes bytes to the known SHA-256 vector', async () => {
    const abc = new Uint8Array([0x61, 0x62, 0x63]); // "abc"
    expect(await _sha256OfBytes(abc)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('returns null for empty / null input (never a bogus hash)', async () => {
    expect(await _sha256OfBytes(null)).toBe(null);
    expect(await _sha256OfBytes(new Uint8Array(0))).toBe(null);
    expect(await _sha256OfBytes(undefined)).toBe(null);
  });
});

// ── Mirror of the GATED veraPdfTrail transform (verdict only if bytes-hash matches the shipped fp) ──
const buildVerdict = (ltv, shippedFingerprint) => {
  const _vera = ltv && ltv.veraPdf;
  const _veraBytesMatch = !!(_vera && shippedFingerprint && ltv.veraPdfBytesHash && ltv.veraPdfBytesHash === shippedFingerprint);
  const _veraStale = !!(_vera && !_veraBytesMatch);
  const veraPdfTrail = (_veraBytesMatch && !_vera.error) ? {
    validator: 'veraPDF (ISO 14289-1 / PDF/UA-1)',
    validatedAt: ltv.veraPdfAt || null,
    compliant: _vera.compliant === true,
    failedChecks: _vera.failedChecks != null ? _vera.failedChecks : (_vera.failedRules ? _vera.failedRules.length : 0),
    failedRules: (_vera.failedRules || []).map(f => ({ clause: f.clause, testNumber: f.testNumber, message: f.message, count: f.count || 1 })),
    bytesHash: { algo: 'SHA-256', hash: ltv.veraPdfBytesHash },
  } : (_veraBytesMatch && _vera.error ? { validator: 'veraPDF (ISO 14289-1 / PDF/UA-1)', error: String(_vera.error) } : null);
  return { veraPdfTrail, _veraStale };
};
const FP = 'aaaa';

describe('audit trail: veraPDF verdict is bound to the bytes it validated (no stale pairing)', () => {
  it('matching bytes-hash + compliant → verdict attached, carries its bytesHash', () => {
    const { veraPdfTrail, _veraStale } = buildVerdict({ veraPdf: { compliant: true, failedRules: [] }, veraPdfBytesHash: FP, veraPdfAt: 'T' }, FP);
    expect(veraPdfTrail.compliant).toBe(true);
    expect(veraPdfTrail.bytesHash.hash).toBe(FP);
    expect(_veraStale).toBe(false);
  });
  it('matching bytes-hash + failures → verdict attached, compliant:false', () => {
    const { veraPdfTrail } = buildVerdict({ veraPdf: { compliant: false, failedRules: [{ clause: '7.1', testNumber: 3, message: 'x' }] }, veraPdfBytesHash: FP }, FP);
    expect(veraPdfTrail.compliant).toBe(false);
    expect(veraPdfTrail.failedChecks).toBe(1);
  });
  it('MISMATCHED bytes-hash → verdict WITHHELD (null) and marked stale', () => {
    const { veraPdfTrail, _veraStale } = buildVerdict({ veraPdf: { compliant: true, failedRules: [] }, veraPdfBytesHash: 'bbbb' }, FP);
    expect(veraPdfTrail).toBe(null);       // never claim "Passes" for bytes it didn't validate
    expect(_veraStale).toBe(true);
  });
  it('MISSING bytes-hash (legacy/unbound verdict) → withheld + stale (can\'t prove linkage)', () => {
    const { veraPdfTrail, _veraStale } = buildVerdict({ veraPdf: { compliant: true } }, FP);
    expect(veraPdfTrail).toBe(null);
    expect(_veraStale).toBe(true);
  });
  it('error verdict with matching hash → error carried; no verdict → null/not-stale', () => {
    expect(buildVerdict({ veraPdf: { error: 'boom' }, veraPdfBytesHash: FP }, FP).veraPdfTrail.error).toBe('boom');
    const none = buildVerdict(null, FP);
    expect(none.veraPdfTrail).toBe(null);
    expect(none._veraStale).toBe(false);
  });
});

describe('anti-drift: source wires verdict-to-bytes binding + clears stale verdicts', () => {
  it('a shared _sha256OfBytes helper exists and the trail uses it for the shipped fingerprint', () => {
    expect(audit).toMatch(/async function _sha256OfBytes\(bytes\)/);
    expect(audit).toMatch(/const shippedFingerprint = await _sha256OfBytes\(_lastTaggedBytesRef\.current\);/);
  });
  it('both veraPDF validation sites store veraPdfBytesHash (verdict bound to validated bytes)', () => {
    expect(audit).toMatch(/const _vbhV = await _sha256OfBytes\(_tbV\);/);          // auto-validate (Make Accessible)
    expect(audit).toMatch(/const _vbh = await _sha256OfBytes\(_vbBytes\);/);       // on-demand validate
    const stores = audit.match(/veraPdfBytesHash: _vbh[V]?/g) || [];
    expect(stores.length).toBeGreaterThanOrEqual(2);
  });
  it('the trail attaches the verdict ONLY on a bytes-hash match', () => {
    expect(audit).toMatch(/const _veraBytesMatch = !!\(_vera && shippedFingerprint && lastTaggedValidation\.veraPdfBytesHash && lastTaggedValidation\.veraPdfBytesHash === shippedFingerprint\);/);
    expect(audit).toMatch(/const veraPdfTrail = \(_veraBytesMatch && !_vera\.error\) \?/);
  });
  it('the baseline + typeset byte-producing buttons clear the stale verdict', () => {
    const clears = audit.match(/veraPdf: null, veraPdfAt: null, veraPdfBytesHash: null/g) || [];
    expect(clears.length).toBeGreaterThanOrEqual(2);
  });
  it('the stale path is surfaced honestly (withheld, re-validate) in payload + visible row', () => {
    expect(audit).toMatch(/computed on a DIFFERENT set of bytes/);
    expect(audit).toMatch(/A prior veraPDF verdict was for different bytes/);
  });
  it('fail wording is emphatic + signer is fully escaped', () => {
    expect(audit).toContain('Does NOT pass PDF/UA-1');
    expect(audit).toContain('${_escT(signer)}');
    expect(audit).not.toContain("${signer.replace(/</g, '&lt;')}");
  });
  it('the integrity hash still signs the full payload (new fields covered)', () => {
    const pj = audit.indexOf('const payloadJson = JSON.stringify(payloadCore');
    const hh = audit.indexOf("crypto.subtle.digest('SHA-256', enc)", pj);
    expect(pj).toBeGreaterThan(0);
    expect(hh).toBeGreaterThan(pj);
  });
});
