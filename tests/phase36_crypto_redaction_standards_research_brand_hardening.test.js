import { describe, expect, it, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readBuf = (rel) => fs.readFileSync(path.join(ROOT, rel));

const PHASE36_FILES = [
  'allo_crypto_module.js',
  'identifier_redaction_module.js',
  'standards_context_module.js',
  'lesson_teaching_research_module.js',
  'brand_profile_module.js',
];

const MIRRORS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

describe('Phase 36 — Mirror Parity & 3-Host SRI Delivery Sync', () => {
  it('keeps all 5 Phase 36 modules byte-identical across 4-way mirrors and synced across all 3 host manifests', () => {
    const manifestHelper = require('../dev-tools/build_browser_delivery_manifest.cjs');
    const releaseIds = [];

    for (const rel of PHASE36_FILES) {
      const rootBuf = readBuf(rel);
      for (const mirror of MIRRORS) {
        const mirrorDir = path.join(ROOT, mirror);
        if (!fs.existsSync(mirrorDir)) continue;
        const mirrorBuf = fs.readFileSync(path.join(mirrorDir, rel));
        expect(mirrorBuf.equals(rootBuf), `${mirror}/${rel} must match root`).toBe(true);
      }
    }

    for (const host of HOSTS) {
      const embedded = manifestHelper.readEmbeddedManifest(read(host));
      expect(embedded && embedded.assets, host).toBeTruthy();
      const { releaseId, ...body } = embedded;
      const expectedReleaseId = crypto.createHash('sha256').update(manifestHelper.canonical(body)).digest('hex');
      expect(releaseId, `${host} canonical releaseId`).toBe(expectedReleaseId);
      releaseIds.push(releaseId);

      for (const rel of PHASE36_FILES) {
        const rootBuf = readBuf(rel);
        const expectedSri = 'sha384-' + crypto.createHash('sha384').update(rootBuf).digest('base64');
        expect(embedded.assets[rel], `${host} missing ${rel}`).toBeTruthy();
        expect(embedded.assets[rel].bytes, `${host} bytes for ${rel}`).toBe(rootBuf.length);
        expect(embedded.assets[rel].integrity, `${host} SRI for ${rel}`).toBe(expectedSri);
      }
    }

    expect(new Set(releaseIds).size).toBe(1);
  });
});

describe('Phase 36 — allo_crypto_module.js hardening', () => {
  const AlloCrypto = require('../allo_crypto_module.js');

  it('strips prototype keys on decryptJSON/decryptRecord, rejects unsafe/deep AAD, and returns false on oversized verifyPassword', async () => {
    const payload = JSON.parse('{"safe":1,"__proto__":{"polluted":true}}');
    const env = await AlloCrypto.encryptJSON(payload, 'Pass-Phrase-1', 10000);
    const decrypted = await AlloCrypto.decryptJSON(env, 'Pass-Phrase-1');
    expect(decrypted.safe).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(decrypted, '__proto__')).toBe(false);
    expect(({}).polluted).toBeUndefined();

    const dek = await AlloCrypto.createVaultKey();
    try {
      const unsafeAad = JSON.parse('{"__proto__":{"x":1},"ok":"yes"}');
      await expect(AlloCrypto.encryptRecord({ a: 1 }, dek, unsafeAad)).rejects.toThrow(/unsafe property key/i);

      let deep = { leaf: true };
      for (let i = 0; i < 40; i++) deep = { child: deep };
      await expect(AlloCrypto.encryptRecord({ a: 1 }, dek, deep)).rejects.toThrow(/maximum depth/i);
    } finally {
      AlloCrypto.destroyVaultKey(dek);
    }

    const verifier = await AlloCrypto.hashPassword('Valid-Code-99', 10000);
    expect(await AlloCrypto.verifyPassword('a'.repeat(5000), verifier)).toBe(false);
    expect(AlloCrypto.validateRecoveryCode('A'.repeat(400))).toBe(false);
  });
});

describe('Phase 36 — identifier_redaction_module.js hardening', () => {
  const IR = require('../identifier_redaction_module.js');

  it('prevents $& / $\' replacement-pattern leaks in custom roles and caps sensitive review queue', async () => {
    const scrubbed = IR.scrubIdentifiers('Dr. Elena Vance met with Elena Vance today.', {
      people: [{ name: 'Elena Vance', role: "Guardian $& $' [bad]" }],
    });
    expect(scrubbed).not.toContain('Elena');
    expect(scrubbed).not.toContain('Vance');
    expect(scrubbed).toContain('[Guardian $& $\' bad]');

    const gate = IR.createSensitivePromptGate({
      onChange: () => { throw new Error('broken listener'); },
    });
    const pending = [];
    for (let i = 0; i < 50; i++) {
      const p = gate.request('Clinical note ' + i, { studentName: 'Elena Vance' });
      p.catch(() => {});
      pending.push(p);
    }
    await expect(gate.request('Overflow note', { studentName: 'Elena Vance' }))
      .rejects.toThrow(/Too many pending/i);
    gate.cancelAll({ notify: false });
    expect(gate.getCurrent()).toBeNull();
  });
});

describe('Phase 36 — standards_context_module.js hardening', () => {
  const SC = require('../standards_context_module.js');

  it('strips dangerous URL schemes/credentials, refuses sourced=true for unsafe URLs, and ignores inherited keys', () => {
    const ctx = SC.normalize({
      standards: [{
        code: '5-ESS2-1',
        label: 'Earth systems',
        sourceUrl: 'javascript:alert(1)',
        sourceUrls: ['data:text/html,<script>1</script>', 'https://user:pass@evil.example/a', 'https://ngss.example.org/5-ess2-1'],
        instructionalConstraints: {
          textAccessExpectation: 'preserve-primary',
          sourceUrl: 'javascript:alert(1)',
        },
      }],
    });
    expect(ctx.standards[0].sourceUrl).toBe('');
    expect(ctx.standards[0].sourceUrls).toEqual(['https://ngss.example.org/5-ess2-1']);
    expect(ctx.standards[0].instructionalConstraints.sourceUrl).toBe('');
    expect(ctx.standards[0].instructionalConstraints.sourced).toBe(false);

    const inherited = Object.create({ code: 'INHERITED.1', label: 'Inherited' });
    const normInherited = SC.normalize({ standards: [inherited] });
    expect(normInherited.standards).toEqual([]);
  });
});

describe('Phase 36 — lesson_teaching_research_module.js hardening', () => {
  const LTR = require('../lesson_teaching_research_module.js');

  afterEach(() => {
    delete window.__alloQrStudentMode;
    delete window._alloQrBlocked;
    delete window.__alloOfflineOnly;
  });

  it('blocks outbound retrieval in QR/offline modes, rejects oversized/control-char URLs, and guards prototype subjects', async () => {
    expect(LTR.isSupportedUrl('https://ies.ed.gov/ncee/wwc/PracticeGuide/15#' + 'a'.repeat(600))).toBe(false);
    expect(LTR.isSupportedUrl('https://ies.ed.gov/ncee/wwc/PracticeGuide/15#recommendation-2')).toBe(true);

    window.__alloQrStudentMode = true;
    let fetched = false;
    await expect(LTR.readPublicGuidance('https://ies.ed.gov/ncee/wwc/PracticeGuide/15', {
      fetch: async () => { fetched = true; return { ok: true }; },
    })).rejects.toThrow(/disabled/i);
    expect(fetched).toBe(false);

    delete window.__alloQrStudentMode;
    window.__alloOfflineOnly = true;
    await expect(LTR.readPublicGuidance('https://ies.ed.gov/ncee/wwc/PracticeGuide/15', {
      fetch: async () => { fetched = true; return { ok: true }; },
    })).rejects.toThrow(/disabled/i);
    expect(fetched).toBe(false);

    const query = LTR.buildSearchQuery({ subject: 'toString', grade: '5th Grade', topic: 'Fractions' });
    expect(query).toContain('site:ies.ed.gov/ncee/wwc/PracticeGuide instruction');
  });
});

describe('Phase 36 — brand_profile_module.js hardening', () => {
  let BP;

  beforeAll(() => {
    delete window.AlloModules?.BrandProfile;
    loadAlloModule('brand_profile_module.js');
    BP = window.AlloModules.BrandProfile;
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('enforces read-only downgrade freeze, blocks prototype-key profile lookups, and rejects unbalanced CSS quotes', () => {
    // Prototype-key safety
    expect(BP.getBrandProfile('toString')).toBeNull();
    expect(BP.setActiveBrandProfile('toString')).toBe(false);
    expect(BP.deleteBrandProfile('toString')).toBe(false);

    // Unbalanced quote in font stack rejected
    const badFont = BP.validateBrandProfile({
      name: 'Quote Test',
      colors: BP.DEFAULT_COLORS,
      fonts: { body: "'Inter, sans-serif", heading: null },
    });
    expect(badFont.ok).toBe(false);

    // Unsafe id re-minted cleanly and invalid logo dimensions sanitized
    const saved = BP.saveBrandProfile({
      id: '__proto__',
      name: 'Oak Academy',
      colors: BP.DEFAULT_COLORS,
      logo: { src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'Oak emblem', width: Infinity, height: -50 },
    });
    expect(saved.ok).toBe(true);
    expect(saved.id).toBe('oak-academy');
    const fetched = BP.getBrandProfile('oak-academy');
    expect(fetched.logo.width).toBeNull();
    expect(fetched.logo.height).toBeNull();

    // Future schema version freezes storage read-only without clobbering data
    const futureRaw = JSON.stringify({ schemaVersion: 99, activeProfileId: 'future-1', profiles: { 'future-1': { name: 'Future' } } });
    localStorage.setItem(BP.STORAGE_KEY, futureRaw);
    expect(BP.listBrandProfiles()).toEqual([]);
    const writeBlocked = BP.saveBrandProfile({ name: 'Should Fail', colors: BP.DEFAULT_COLORS });
    expect(writeBlocked.ok).toBe(false);
    expect(localStorage.getItem(BP.STORAGE_KEY)).toBe(futureRaw);
  });
});
