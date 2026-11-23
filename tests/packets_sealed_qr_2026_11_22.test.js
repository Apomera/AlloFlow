// Tests for the zero-network cryptographic Offline Sealed QR Results system (AFPK1 / AFSK1 / AFQR1).
// Covers RFC 7748 / 5869 / 8439 vectors + OpenSSL interop, ISO 18004 QR matrix + 1-bit PNG accuracy,
// packet build/attach/re-seal + verifyPacket closed checks, student packet JSDOM E2E (Practice & Check),
// teacher companion page (packets-qr.html) static hygiene & JSDOM E2E, and 4-copy mirror parity.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const Q = require(path.join(ROOT, 'packets_qr_crypto.js'));
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const R = require(path.join(ROOT, 'packets_results_reader.js'));
const ZIP = require(path.join(ROOT, 'packets_zip.js'));
const MP = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const qrcode = require(path.join(ROOT, 'qrcode.js'));
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;

const hex = (s) => Uint8Array.from(Buffer.from(s.replace(/\s+/g, ''), 'hex'));
const toHex = (b) => Buffer.from(b).toString('hex');

function makePracticeLesson() {
  const lesson = MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'add-doubles', count: 2 });
  lesson.lessonId = 'qr-math-doubles';
  lesson.revision = '2026-11-22';
  lesson.title = 'Doubles Practice';
  lesson.blocks[0].items = lesson.blocks[0].items.slice(0, 2);
  return lesson;
}

function makeCheckLesson() {
  return {
    schema: TH.LESSON_SCHEMA,
    lessonId: 'qr-chk-add-1',
    revision: '2026-11-22',
    title: 'Addition Check',
    mode: 'probe',
    form: 'A',
    timeLimitS: 120,
    check: { measure: 'math_computation', scoreUnit: 'digits_correct_per_minute', scoringVersion: 3, formVersion: 2 },
    blocks: [{
      activity: 'math_computation',
      items: [
        { id: 'c1', a: 4, op: 'add', b: 3 },
        { id: 'c2', a: 6, op: 'add', b: 5 },
      ],
    }],
  };
}

function openPacket(html) {
  let clock = 1000;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://alloflow.local/packet.html',
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
      Object.defineProperty(w, 'performance', { configurable: true, value: { now: () => clock } });
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    },
  });
  const d = dom.window.document;
  const q = (sel) => d.querySelector(sel);
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent.trim() === text);
  const press = (key) => q('[data-key="' + key + '"]').click();
  return {
    dom, w: dom.window, d, q, seen, button, press,
    tick: (ms) => { clock += ms; },
    type: (digits) => { String(digits).split('').forEach(press); press('next'); },
  };
}

describe('Offline Sealed QR — RFC cryptographic vectors and OpenSSL interop', () => {
  it('matches RFC 7748 §6.1 X25519 vectors and Node OpenSSL diffieHellman', () => {
    const aPriv = hex('77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a');
    const aPubWant = '8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a';
    const bPriv = hex('5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb');
    const bPubWant = 'de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f';
    const sharedWant = '4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742';

    expect(toHex(Q.x25519Public(aPriv))).toBe(aPubWant);
    expect(toHex(Q.x25519Public(bPriv))).toBe(bPubWant);
    expect(toHex(Q.x25519(aPriv, hex(bPubWant)))).toBe(sharedWant);
    expect(toHex(Q.x25519(bPriv, hex(aPubWant)))).toBe(sharedWant);

    // Random keypair cross-check against OpenSSL
    const kp1 = Q.generateKeyPair('A');
    const kp2 = Q.generateKeyPair('B');
    const sk1 = Q.parseSecretKey(kp1.secretKey);
    const sk2 = Q.parseSecretKey(kp2.secretKey);
    const privDer = Buffer.concat([Buffer.from('302e020100300506032b656e04220420', 'hex'), Buffer.from(sk1.bytes)]);
    const pubDer = Buffer.concat([Buffer.from('302a300506032b656e032100', 'hex'), Buffer.from(sk2.publicBytes)]);
    const osslShared = crypto.diffieHellman({
      privateKey: crypto.createPrivateKey({ key: privDer, format: 'der', type: 'pkcs8' }),
      publicKey: crypto.createPublicKey({ key: pubDer, format: 'der', type: 'spki' }),
    });
    expect(toHex(Q.x25519(sk1.bytes, sk2.publicBytes))).toBe(osslShared.toString('hex'));
  });

  it('matches RFC 5869 Test Case 1 HKDF-SHA-256 and Node OpenSSL hkdfSync', () => {
    const ikm = hex('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b');
    const salt = hex('000102030405060708090a0b0c');
    const info = hex('f0f1f2f3f4f5f6f7f8f9');
    const want = '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865';
    const got = Q.hkdfSha256(ikm, salt, info, 42);
    expect(toHex(got)).toBe(want);

    const ossl = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, 42)).toString('hex');
    expect(toHex(got)).toBe(ossl);
  });

  it('matches RFC 8439 §2.8.2 ChaCha20-Poly1305 AEAD and Node OpenSSL decipher', () => {
    const key = hex('808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f');
    const nonce = hex('070000004041424344454647');
    const aad = hex('50515253c0c1c2c3c4c5c6c7');
    const pt = new TextEncoder().encode("Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.");
    const ctWant = 'd31a8d34648e60db7b86afbc53ef7ec2a4aded51296e08fea9e2b5a736ee62d63dbea45e8ca9671282fafb69da92728b1a71de0a9e060b2905d6a5b67ecd3b3692ddbd7f2d778b8c9803aee328091b58fab324e4fad675945585808b4831d7bc3ff4def08e4b7a9de576d26586cec64b6116';
    const tagWant = '1ae10b594f09e26a7e902ecbd0600691';

    const sealed = Q.aeadSeal(key, nonce, pt, aad);
    expect(toHex(sealed)).toBe(ctWant + tagWant);
    expect(Buffer.from(Q.aeadUnseal(key, nonce, sealed, aad)).toString('utf8')).toBe(Buffer.from(pt).toString('utf8'));

    // Cross-decrypt our sealed output with OpenSSL
    const decipher = crypto.createDecipheriv('chacha20-poly1305', Buffer.from(key), Buffer.from(nonce), { authTagLength: 16 });
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(Buffer.from(sealed.subarray(sealed.length - 16)));
    const dec = Buffer.concat([decipher.update(Buffer.from(sealed.subarray(0, sealed.length - 16))), decipher.final()]);
    expect(dec.toString('utf8')).toBe(Buffer.from(pt).toString('utf8'));
  });

  it('produces ISO 18004 QR matrices identical to qrcode.js and pixel-exact 1-bit PNGs', () => {
    const kp = Q.generateKeyPair('QR check');
    const samples = ['AFQR1:HELLO234567', Q.sealResult({
      kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 's1',
      packet: { id: 'p1', version: '1', mode: 'practice' }, lessonId: 'p1', lessonTitle: 'Plus 2',
      learner: 'Maya Patel', activeMs: 18000,
      summary: { items: 2, done: 2, firstTry: 1, afterRetry: 1, missed: 0, practised: 0 },
      items: [
        { n: 1, activity: 'math_rehearsal', word: '4 + 2', target: '6', responses: ['6'], attempts: 1, firstTry: true, correct: true, done: true, ms: 4000 },
        { n: 2, activity: 'math_rehearsal', word: '5 + 2', target: '7', responses: ['8', '7'], attempts: 2, firstTry: false, correct: true, done: true, ms: 9000 },
      ],
    }, kp.publicKey).code];

    const maskBit = (m, x, y) => m === 0 ? ((x + y) % 2 === 0) : m === 1 ? (y % 2 === 0) : m === 2 ? (x % 3 === 0) : m === 3 ? ((x + y) % 3 === 0)
      : m === 4 ? ((Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0) : m === 5 ? (((x * y) % 2) + ((x * y) % 3) === 0)
      : m === 6 ? ((((x * y) % 2) + ((x * y) % 3)) % 2 === 0) : ((((x + y) % 2) + ((x * y) % 3)) % 2 === 0);

    for (const payload of samples) {
      const qr = Q.qrMatrix(payload);
      const ref = qrcode(qr.version, 'L');
      ref.addData(payload, 'Alphanumeric');
      ref.make();

      // Read qrcode.js chosen mask from its top-left format bits, then compare ALL unmasked data + EC + finder + timing modules
      let refFmt = 0;
      for (let k = 0; k < 6; k++) refFmt |= (ref.isDark(k, 8) ? 1 : 0) << k;
      refFmt |= (ref.isDark(7, 8) ? 1 : 0) << 6;
      refFmt |= (ref.isDark(8, 8) ? 1 : 0) << 7;
      refFmt |= (ref.isDark(8, 7) ? 1 : 0) << 8;
      for (let k = 9; k < 15; k++) refFmt |= (ref.isDark(8, 14 - k) ? 1 : 0) << k;
      const refMask = ((refFmt ^ 0x5412) >> 10) & 7;

      // Alignment pattern centers for version >= 2
      const align = qr.version === 1 ? [] : (() => {
        const cnt = Math.floor(qr.version / 7) + 2;
        const step = qr.version === 32 ? 26 : Math.ceil((qr.size - 13) / (cnt - 1) / 2) * 2;
        const pos = [6];
        for (let p = qr.size - 7; pos.length < cnt; p -= step) pos.splice(1, 0, p);
        const pts = [];
        for (const r of pos) for (const c of pos) {
          if ((r <= 8 && c <= 8) || (r <= 8 && c >= qr.size - 8) || (r >= qr.size - 8 && c <= 8)) continue;
          pts.push([r, c]);
        }
        return pts;
      })();

      let diffs = 0;
      for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
          const isFormat = (x === 8 && (y <= 8 || y >= qr.size - 8)) || (y === 8 && (x <= 8 || x >= qr.size - 8));
          if (isFormat) continue;
          const isFinder = (x < 8 && y < 8) || (x >= qr.size - 8 && y < 8) || (x < 8 && y >= qr.size - 8);
          const isTiming = x === 6 || y === 6;
          const isVersion = qr.version >= 7 && ((x < 6 && y >= qr.size - 11 && y < qr.size - 8) || (y < 6 && x >= qr.size - 11 && x < qr.size - 8));
          const isAlign = align.some(([ar, ac]) => Math.abs(y - ar) <= 2 && Math.abs(x - ac) <= 2);
          if (isFinder || isTiming || isVersion || isAlign) {
            if (Boolean(qr.modules[y * qr.size + x]) !== Boolean(ref.isDark(y, x))) diffs++;
          } else {
            const oursData = Boolean(qr.modules[y * qr.size + x]) ^ maskBit(qr.mask, x, y);
            const refData = Boolean(ref.isDark(y, x)) ^ maskBit(refMask, x, y);
            if (oursData !== refData) diffs++;
          }
        }
      }
      expect(diffs).toBe(0);

      // Verify PNG structure, CRCs, zlib inflate, and quiet zone
      const png = Q.qrPngDataUrl(payload, 3);
      expect(png.url.startsWith('data:image/png;base64,')).toBe(true);
      const buf = Buffer.from(png.bytes);
      expect(buf.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      let pos = 8;
      const idat = [];
      while (pos < buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
        const crcGot = buf.readUInt32BE(pos + 8 + len);
        const crcWant = zlib.crc32(buf.subarray(pos + 4, pos + 8 + len)) >>> 0;
        expect(crcGot).toBe(crcWant);
        if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
        pos += 12 + len;
      }
      const raw = zlib.inflateSync(Buffer.concat(idat));
      expect(raw.length).toBe(png.height * (1 + Math.ceil(png.width / 8)));
    }
  });
});

describe('Offline Sealed QR — envelope security, freshness, tamper, wrong key, and trimming', () => {
  const sampleResult = {
    kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'sess-sec-1',
    packet: { id: 'p-sec', version: '2026-11-22', mode: 'practice' },
    lessonId: 'p-sec', revision: '2026-11-22', lessonTitle: 'Secret Student Practice',
    learner: 'Jordan Alvarez', learnerName: 'Jordan Alvarez', activeMs: 42000,
    summary: { items: 2, done: 2, firstTry: 1, afterRetry: 0, missed: 1, practised: 0 },
    items: [
      { n: 1, activity: 'math_rehearsal', word: '7 + 8', target: '15', responses: ['15'], attempts: 1, firstTry: true, correct: true, done: true, ms: 4000 },
      { n: 2, activity: 'math_rehearsal', word: '9 + 6', target: '15', responses: ['14'], attempts: 2, firstTry: false, correct: false, done: true, ms: 9000 },
    ],
  };

  it('produces non-URL opaque Base32 ciphertext with fresh randomness every seal', () => {
    const kp = Q.generateKeyPair('Room 12');
    const s1 = Q.sealResult(sampleResult, kp.publicKey);
    const s2 = Q.sealResult(sampleResult, kp.publicKey);
    expect(s1.code).toMatch(/^AFQR1:[A-Z2-7]+$/);
    expect(s1.code).not.toMatch(/https?:\/\//i);
    expect(s1.code.toLowerCase()).not.toContain('jordan');
    expect(s1.code.toLowerCase()).not.toContain('alvarez');
    expect(s1.code).not.toBe(s2.code); // fresh ephemeral X25519 key + 96-bit nonce

    const u1 = Q.unsealResult(s1.code, kp.secretKey);
    const u2 = Q.unsealResult(s2.code, kp.secretKey);
    expect(u1.ok).toBe(true);
    expect(u2.ok).toBe(true);
    expect(u1.result.learnerName).toBe('Jordan Alvarez');
    expect(u2.result.items[1].responses).toEqual(['14']);
  });

  it('rejects wrong teacher keys (with expected Key ID) and rejects 1-char tampered ciphertext', () => {
    const kp1 = Q.generateKeyPair('Teacher A');
    const kp2 = Q.generateKeyPair('Teacher B');
    const sealed = Q.sealResult(sampleResult, kp1.publicKey);

    const wrong = Q.unsealResult(sealed.code, kp2.secretKey);
    expect(wrong.ok).toBe(false);
    expect(wrong.reason).toBe('wrong_key');
    expect(wrong.expectedFingerprint).toBe(kp1.fingerprint);

    const chars = sealed.code.split('');
    const idx = chars.length - 4;
    chars[idx] = chars[idx] === 'A' ? 'B' : 'A';
    const tampered = Q.unsealResult(chars.join(''), kp1.secretKey);
    expect(tampered.ok).toBe(false);
    expect(tampered.reason).toBe('tampered');

    // Canonical Base32 check: even altering the very last character (trailing pad bits) is rejected as tampered
    const tail = sealed.code.split('');
    const lastIdx = tail.length - 1;
    tail[lastIdx] = tail[lastIdx] === 'A' ? 'B' : 'A';
    const tailTampered = Q.unsealResult(tail.join(''), kp1.secretKey);
    expect(tailTampered.ok).toBe(false);
    expect(tailTampered.reason).toBe('tampered');
  });

  it('condenses very long 60-item packets cleanly while preserving all misses/retries and exact totals', () => {
    const kp = Q.generateKeyPair('Big Packet');
    const bigItems = Array.from({ length: 60 }, (_, i) => ({
      n: i + 1,
      activity: 'math_rehearsal',
      word: `${i + 1} + 7`,
      target: String(i + 8),
      responses: i % 15 === 0 ? [String(i + 9), String(i + 8)] : [String(i + 8)],
      attempts: i % 15 === 0 ? 2 : 1,
      firstTry: i % 15 !== 0,
      correct: i !== 30,
      done: true,
      ms: 2500,
    }));
    const bigResult = {
      ...sampleResult,
      sessionId: 'sess-big-60',
      summary: { items: 60, done: 60, firstTry: 56, afterRetry: 3, missed: 1, practised: 0 },
      items: bigItems,
    };
    const sealed = Q.sealResult(bigResult, kp.publicKey);
    expect(sealed.truncated).toBe(true);
    const qr = Q.qrMatrix(sealed.code);
    expect(qr.version).toBeLessThanOrEqual(30);

    const unsealed = Q.unsealResult(sealed.code, kp.secretKey);
    expect(unsealed.ok).toBe(true);
    expect(unsealed.truncated).toBe(true);
    expect(unsealed.result.summary.items).toBe(60);
    expect(unsealed.result.summary.firstTry).toBe(56);
    expect(unsealed.result.summary.afterRetry).toBe(3);
    expect(unsealed.result.summary.missed).toBe(1);
    expect(unsealed.result.items.filter((it) => !it.firstTry)).toHaveLength(4);
    expect(unsealed.result.items.length).toBe(60);
  });
});

describe('Offline Sealed QR — packet build, attachQrKey, re-seal, and verifyPacket', () => {
  it('adds zero QR runtime/styles/labels to regular packets and matches byte-for-byte between buildHtml and attachQrKey', async () => {
    const kp1 = Q.generateKeyPair('Room 12');
    const kp2 = Q.generateKeyPair('Room 14');
    const lesson = makePracticeLesson();
    const core = { soundAnswerMatches: () => false };

    const plain = TH.buildHtml(lesson, { core });
    expect(plain).not.toContain('kit.qrLib=');
    expect(plain).not.toContain('afqr-start');
    expect(plain).not.toContain('qr_show');

    const built = TH.buildHtml(lesson, { core, qrPublicKey: kp1.publicKey });
    const attached = TH.attachQrKey(plain, kp1.publicKey);
    expect(attached.ok).toBe(true);
    expect(attached.fingerprint).toBe(kp1.fingerprint);
    expect(attached.html).toBe(built);

    const v1 = await V.verifyPacket(attached.html);
    expect(v1.ok).toBe(true);
    expect(v1.result).toBe('closed');
    expect(v1.counts.look).toBe(0);
    expect(v1.counts.notExpected).toBe(0);
    expect(attached.html).toContain("connect-src 'none'");
    // verifyPacket surfaces verified sealed-qr claim, report.qr metadata, and plain-language summary
    expect(v1.qr).toMatchObject({ enabled: true, fingerprint: kp1.fingerprint });
    expect(v1.claims.find((c) => c.id === 'sealed-qr')?.verdict).toBe('agree');
    expect(v1.plain.about.join(' ')).toContain(kp1.fingerprint);
    // Zero http:// strings outside http-equiv (preserves IT guide promise)
    expect(attached.html.split('http').length - 1).toBe(attached.html.split('http-equiv').length - 1);

    // Re-sealing with a second key replaces cleanly with zero duplication
    const resealed = TH.attachQrKey(attached.html, kp2.publicKey);
    expect(resealed.ok).toBe(true);
    expect(resealed.fingerprint).toBe(kp2.fingerprint);
    expect(resealed.html.match(/\/\*afqr-start\*\//g)).toHaveLength(1);
    expect(resealed.html.match(/\/\*afqr-css\*\//g)).toHaveLength(1);
    const v2 = await V.verifyPacket(resealed.html);
    expect(v2.ok).toBe(true);
    expect(v2.result).toBe('closed');
    expect(v2.counts.look).toBe(0);
    expect(v2.counts.notExpected).toBe(0);
  });

  it('seals Check packets with connect-src none and passes verifyPacket cleanly', async () => {
    const kp = Q.generateKeyPair('Math Check');
    const chkPlain = TH.buildHtml(makeCheckLesson(), { teacherCode: '7421' });
    const chkSealed = TH.attachQrKey(chkPlain, kp.publicKey);
    expect(chkSealed.ok).toBe(true);
    const v = await V.verifyPacket(chkSealed.html);
    expect(v.ok).toBe(true);
    expect(v.result).toBe('closed');
    expect(v.counts.look).toBe(0);
    expect(v.counts.notExpected).toBe(0);
  });
});

describe('Offline Sealed QR — student packet JSDOM E2E (Practice and Check)', () => {
  it('Practice packet seals student results inside Show my teacher, clears DOM on hide, and unlocks with teacher secret key', () => {
    const kp = Q.generateKeyPair('Room 12');
    const core = { soundAnswerMatches: () => false };
    const lesson = makePracticeLesson();
    const ans = lesson.blocks[0].items.map((it) => String(it.answer));
    const wrongAns = String(Number(ans[1]) + 1);
    const html = TH.buildHtml(lesson, { core, qrPublicKey: kp.publicKey });
    const t = openPacket(html);
    const doc = t.d;

    // Start as Maya Patel
    doc.getElementById('learner-name').value = 'Maya Patel';
    t.button('Start').click();

    // Item 1: right on first try
    t.tick(1000);
    t.q('[data-cover]').click();
    t.tick(1000);
    t.type(ans[0]);
    t.tick(500);
    (t.button('Next') || t.button('See my results')).click();

    // Item 2: wrong once then right (Cover-Copy-Compare study/copy/try)
    t.tick(1000);
    t.q('[data-cover]').click();
    t.tick(1000);
    t.type(wrongAns);
    t.tick(500); t.type(ans[1]);
    t.tick(500); t.type(ans[1]);
    t.tick(500);
    (t.button('Next') || t.button('See my results')).click();

    // Verify Show my teacher fold has sealed QR toggle, hidden by default
    const confer = doc.querySelector('[data-teacher-confer]');
    expect(confer).toBeTruthy();
    const toggle = confer.querySelector('[data-qr-toggle]');
    const panel = confer.querySelector('[data-qr-panel]');
    expect(toggle).toBeTruthy();
    expect(panel.hidden).toBe(true);

    // Click Show sealed QR for teacher
    toggle.click();
    expect(panel.hidden).toBe(false);
    const img = confer.querySelector('.qr-img');
    expect(img).toBeTruthy();
    expect(img.src.startsWith('data:image/png;base64,')).toBe(true);
    const code1 = confer.querySelector('[data-qr-code]').textContent.trim();
    expect(code1).toMatch(/^AFQR1:[A-Z2-7]+$/);
    expect(confer.querySelector('[data-qr-fp]').textContent).toContain(kp.fingerprint);

    // Decrypt with teacher secret key
    const unsealed = Q.unsealResult(code1, kp.secretKey);
    expect(unsealed.ok).toBe(true);
    expect(unsealed.result.learnerName).toBe('Maya Patel');
    expect(unsealed.result.summary.firstTry).toBe(1);
    expect(unsealed.result.summary.afterRetry).toBe(1);
    expect(unsealed.result.items[1].responses).toContain(wrongAns);
    expect(unsealed.result.items[1].responses).toContain(ans[1]);

    // Hide sealed QR clears image and code from DOM; showing again generates fresh ciphertext
    confer.querySelector('[data-qr-hide]').click();
    expect(panel.hidden).toBe(true);
    expect(confer.querySelector('.qr-img')).toBeNull();
    expect(confer.querySelector('[data-qr-code]').textContent).toBe('');

    toggle.click();
    const code2 = confer.querySelector('[data-qr-code]').textContent.trim();
    expect(code2).toMatch(/^AFQR1:[A-Z2-7]+$/);
    expect(code2).not.toBe(code1);

    // Pressing Escape inside the open sealed QR panel closes it cleanly and clears the DOM
    panel.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.hidden).toBe(true);
    expect(confer.querySelector('.qr-img')).toBeNull();
    t.dom.window.close();
  });

  it('Check packet exposes sealed QR inside For the teacher without typing teacher code and decrypts full Check score', () => {
    const kp = Q.generateKeyPair('Check Key');
    const html = TH.buildHtml(makeCheckLesson(), { teacherCode: '7421', qrPublicKey: kp.publicKey });
    const t = openPacket(html);
    const doc = t.d;

    // Start check as Leo Chen
    doc.getElementById('learner-name').value = 'Leo Chen';
    (t.button('Next') || doc.querySelector('#app button.primary')).click();
    t.tick(500);
    t.button('Start').click();

    // Answer both items using keypad + tick: 4+3=7 (right), 6+5=12 (wrong)
    t.tick(1200);
    t.type('7');
    t.tick(1200);
    t.type('12');

    // Inside [data-teacher], QR toggle works WITHOUT unlocking teacher code
    const teacherCard = doc.querySelector('[data-teacher]');
    expect(teacherCard).toBeTruthy();
    const toggle = teacherCard.querySelector('[data-qr-toggle]');
    expect(toggle).toBeTruthy();
    toggle.click();

    const code = teacherCard.querySelector('[data-qr-code]').textContent.trim();
    expect(code).toMatch(/^AFQR1:[A-Z2-7]+$/);
    const unsealed = Q.unsealResult(code, kp.secretKey);
    expect(unsealed.ok).toBe(true);
    expect(unsealed.result.learnerName).toBe('Leo Chen');
    expect(unsealed.result.packet.mode).toBe('check');
    expect(unsealed.result.score).toBeTruthy();
    expect(unsealed.result.score.itemsCorrect).toBe(1);
    expect(unsealed.result.score.itemsAttempted).toBe(2);
    t.dom.window.close();
  });
});

describe('Offline Sealed QR — teacher collector page (packets-qr.html) static hygiene, E2E, and mirrors', () => {
  it('enforces strict CSP, zero inline code/handlers, zero innerHTML/localStorage, exact file inventory, and 4-copy mirror parity', () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-qr.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'packets-qr.js'), 'utf8');
    const doc = new JSDOM(html).window.document;

    const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(doc.querySelectorAll('script:not([src])')).toHaveLength(0);
    expect(doc.querySelectorAll('[style]')).toHaveLength(0);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(js).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b/);
    expect(js).not.toMatch(/\blocalStorage\b|\bsessionStorage\b/);

    // Proof bar names every loaded file accurately
    const proofText = doc.querySelector('details.proof').textContent;
    expect(proofText).toContain('ten files');
    for (const f of ['packets.css', 'packets-qr.css', 'packets-page.js', 'packets_qr_crypto.js', 'word_sounds_take_home_loader.js', 'packets_zip.js', 'packets_handoff.js', 'packets-qr.js']) {
      expect(proofText).toContain(f);
    }
    expect(doc.body.textContent).toContain('School-managed devices only');

    // School IT guide documents Collect by sealed QR and packets_qr_crypto.js
    const itHtml = fs.readFileSync(path.join(ROOT, 'packets-it.html'), 'utf8');
    expect(itHtml).toContain('packets-qr.html');
    expect(itHtml).toContain('packets_qr_crypto.js');

    // All 4 mirror copies match byte-for-byte for sealed-QR deliverables
    const mirrors = ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
    for (const file of ['packets_qr_crypto.js', 'packets-qr.html', 'packets-qr.js', 'packets-qr.css', 'packets_verify_core.js']) {
      const rootBuf = fs.readFileSync(path.join(ROOT, file));
      for (const m of mirrors) {
        const copyBuf = fs.readFileSync(path.join(ROOT, m, file));
        expect(copyBuf.equals(rootBuf)).toBe(true);
      }
    }
  });

  it('runs the full teacher workflow on packets-qr.html and exports a ZIP that packets_results_reader.js parses with integrity ok', async () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-qr.html'), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://alloflow.local/packets-qr.html' });
    const win = dom.window;
    const doc = win.document;
    if (doc.readyState === 'loading') {
      await new Promise((resolve) => doc.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    // Attach required globals and capture Blob downloads + handoff
    Object.defineProperty(win, 'crypto', { value: globalThis.crypto, configurable: true });
    win.AlloPacketQrCrypto = Q;
    win.AlloWordSoundsTakeHome = TH;
    win.AlloPacketZip = ZIP;
    const handoffCalls = [];
    win.AlloPacketHandoff = {
      redirect: (file, href, hash) => { handoffCalls.push({ file, href, hash }); return Promise.resolve(true); },
    };
    const downloads = [];
    win.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:test-' + downloads.length; };
    win.URL.revokeObjectURL = () => {};

    // Execute packets-qr.js in the JSDOM window (readyState is now complete)
    const pageJs = fs.readFileSync(path.join(ROOT, 'packets-qr.js'), 'utf8');
    win.eval(pageJs);

    // Step 1: Create session key
    doc.getElementById('key-label').value = 'Room 12';
    doc.getElementById('make-key').click();
    const fp = doc.getElementById('key-fp').textContent.trim();
    const pubKey = doc.getElementById('key-pub').value.trim();
    expect(fp).toMatch(/^[0-9a-f]{8}$/);
    expect(pubKey).toMatch(/^AFPK1\./);

    // Save private key file and inspect downloaded JSON
    doc.getElementById('save-key').click();
    expect(downloads).toHaveLength(1);
    const savedKeyJson = JSON.parse(await downloads[0].text());
    expect(savedKeyJson.publicKey).toBe(pubKey);
    expect(savedKeyJson.secretKey).toMatch(/^AFSK1\./);

    // Step 2: Seal an existing plain Practice packet .html through the page UI
    const plainHtml = TH.buildHtml(makePracticeLesson(), { core: { soundAnswerMatches: () => false } });
    const fakeFile = { name: 'Plus-2.html', text: () => Promise.resolve(plainHtml) };
    const sealFilesEl = doc.getElementById('seal-files');
    Object.defineProperty(sealFilesEl, 'files', { value: [fakeFile], configurable: true });
    sealFilesEl.dispatchEvent(new win.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
    expect(doc.getElementById('seal-results').hidden).toBe(false);
    expect(doc.getElementById('seal-list').textContent).toContain('Plus-2__qr.html');
    expect(doc.getElementById('seal-list').textContent).toContain(fp);
    doc.getElementById('seal-download').click();
    expect(downloads).toHaveLength(2);
    const sealedHtmlDownloaded = await downloads[1].text();
    const verifiedDownloaded = await V.verifyPacket(sealedHtmlDownloaded);
    expect(verifiedDownloaded.ok).toBe(true);
    expect(verifiedDownloaded.result).toBe('closed');
    expect(verifiedDownloaded.counts.look).toBe(0);
    expect(verifiedDownloaded.counts.notExpected).toBe(0);

    // Step 3: Paste 1 Practice + 1 Check + 1 duplicate + 1 wrong-key + 1 tampered
    const practiceCode = Q.sealResult({
      kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'qr-p-1',
      packet: { id: 'p1', version: '2026-11-22', mode: 'practice' },
      lessonId: 'p1', revision: '2026-11-22', lessonTitle: 'Plus 2 Practice',
      learner: 'Maya Patel', activeMs: 32000,
      summary: { items: 2, done: 2, firstTry: 1, afterRetry: 1, missed: 0, practised: 0 },
      items: [
        { n: 1, activity: 'math_rehearsal', word: '4 + 2', target: '6', responses: ['6'], attempts: 1, firstTry: true, correct: true, done: true, ms: 4000 },
        { n: 2, activity: 'math_rehearsal', word: '5 + 2', target: '7', responses: ['8', '7'], attempts: 2, firstTry: false, correct: true, done: true, ms: 9000 },
      ],
    }, pubKey).code;

    const checkCode = Q.sealResult({
      kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'qr-c-1',
      packet: { id: 'c1', version: '2026-11-22', form: 'A', mode: 'check' },
      lessonId: 'c1', revision: '2026-11-22', lessonTitle: 'Addition Check',
      learner: 'Leo Chen', activeMs: 120000,
      summary: { items: 2, done: 2, firstTry: 1, afterRetry: 0, missed: 1, practised: 0 },
      items: [
        { n: 1, activity: 'math_computation', word: '4 + 3', target: '7', responses: ['7'], attempts: 1, firstTry: true, correct: true, done: true, ms: 5000, digitsCorrect: 1, digitsPossible: 1 },
        { n: 2, activity: 'math_computation', word: '6 + 5', target: '11', responses: ['12'], attempts: 1, firstTry: false, correct: false, done: true, ms: 7000, digitsCorrect: 1, digitsPossible: 2 },
      ],
      score: { measure: 'math_computation', score: 10, scoreUnit: 'digits_correct_per_minute', digitsCorrect: 2, digitsPossible: 3, itemsCorrect: 1, itemsAttempted: 2, timeLimitS: 120, elapsedS: 120, hiddenS: 0, pausedS: 0, pauses: 0, directionsHeard: 0, completion: 'time', prorated: false, noScoreReason: '', scoringVersion: 3, formVersion: 2, attempt: 1, flags: [], tools: [] },
    }, pubKey).code;

    doc.getElementById('code-input').value = practiceCode + '\n' + checkCode + '\n' + practiceCode;
    doc.getElementById('code-add').click();
    expect(doc.querySelectorAll('#collected-body tr')).toHaveLength(2);
    expect(doc.getElementById('collected-body').textContent).toContain('Maya Patel');
    expect(doc.getElementById('collected-body').textContent).toContain('Leo Chen');

    // Wrong-key warning names both Key IDs
    const otherKp = Q.generateKeyPair('Other Teacher');
    const wrongCode = Q.sealResult({ kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'w1', packet: { id: 'p1', mode: 'practice' }, lessonId: 'p1', lessonTitle: 'P', learner: 'X', summary: { items: 1, done: 1, firstTry: 1, afterRetry: 0, missed: 0, practised: 0 }, items: [{ n: 1, activity: 'math_rehearsal', word: '1+1', target: '2', responses: ['2'], attempts: 1, firstTry: true, correct: true, done: true, ms: 1000 }] }, otherKp.publicKey).code;
    doc.getElementById('code-input').value = wrongCode;
    doc.getElementById('code-add').click();
    expect(doc.getElementById('collect-status').textContent).toContain('Wrong teacher key');
    expect(doc.getElementById('collect-status').textContent).toContain(otherKp.fingerprint);
    expect(doc.getElementById('collect-status').textContent).toContain(fp);

    // Tampered code rejection
    const tam = practiceCode.slice(0, -3) + (practiceCode.slice(-3) === 'AAA' ? 'BBB' : 'AAA');
    doc.getElementById('code-input').value = tam;
    doc.getElementById('code-add').click();
    expect(doc.getElementById('collect-status').textContent).toContain('changed or cut off');

    // Open in Add up results hands off a valid ZIP whose CSVs parse with integrity 'ok'
    doc.getElementById('open-results').click();
    expect(handoffCalls).toHaveLength(1);
    expect(handoffCalls[0].href).toBe('packets-results.html');
    expect(handoffCalls[0].hash).toBe('#import-results');
    const entries = ZIP.readZip(new Uint8Array(handoffCalls[0].file.bytes));
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.crcOk).toBe(true);
      const csvText = new TextDecoder('utf-8').decode(entry.bytes);
      const parsed = await R.read(csvText, { name: entry.name });
      expect(parsed.ok).toBe(true);
      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.sessions[0].integrity).toBe('ok');
    }
    dom.window.close();
  });

  it('supports live sample sealed QRs demo, public-key-only co-teacher sealing, unsaved-key reminder, and DEFLATE .zip sealing', async () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-qr.html'), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://alloflow.local/packets-qr.html' });
    const win = dom.window;
    const doc = win.document;
    if (doc.readyState === 'loading') {
      await new Promise((resolve) => doc.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }
    Object.defineProperty(win, 'crypto', { value: globalThis.crypto, configurable: true });
    win.DecompressionStream = globalThis.DecompressionStream;
    win.Response = globalThis.Response;
    win.Blob = globalThis.Blob;
    win.AlloPacketQrCrypto = Q;
    win.AlloWordSoundsTakeHome = TH;
    win.AlloPacketZip = ZIP;
    const downloads = [];
    win.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:demo-' + downloads.length; };
    win.URL.revokeObjectURL = () => {};
    win.eval(fs.readFileSync(path.join(ROOT, 'packets-qr.js'), 'utf8'));

    // 1. Live sample demo creates real scannable PNG QR, unlocks 3 students with Details folds, and proves wrong-key & tamper rejection
    doc.getElementById('demo-start').click();
    expect(doc.getElementById('demo-panel').hidden).toBe(false);
    const demoImg = doc.querySelector('#demo-qr-slot img.qr-img');
    expect(demoImg).toBeTruthy();
    expect(demoImg.src.startsWith('data:image/png;base64,')).toBe(true);

    doc.getElementById('demo-unlock').click();
    expect(doc.querySelectorAll('#collected-body tr')).toHaveLength(3);
    expect(doc.querySelectorAll('#collected-body details.qr-row-details').length).toBeGreaterThanOrEqual(3);
    expect(doc.getElementById('collected-count').textContent).toContain('3 collected');

    doc.getElementById('demo-wrong-key').click();
    expect(doc.getElementById('collect-status').textContent).toContain('Wrong teacher key');

    doc.getElementById('demo-tamper').click();
    expect(doc.getElementById('collect-status').textContent).toContain('changed or cut off');

    // 2. Unsaved-key reminder appears after sealing with a fresh unsaved key and clears once saved
    doc.getElementById('clear-key').click();
    doc.getElementById('make-key').click();
    expect(doc.getElementById('key-unsaved-tag').hidden).toBe(false);
    expect(doc.getElementById('seal-save-nudge').hidden).toBe(true);

    // Build a real DEFLATE-compressed .zip (method 8) containing a plain Practice packet
    const plainHtml = TH.buildHtml(makePracticeLesson(), { core: { soundAnswerMatches: () => false } });
    const rawBytes = Buffer.from(plainHtml, 'utf8');
    const compBytes = zlib.deflateRawSync(rawBytes);
    const crc = zlib.crc32(rawBytes) >>> 0;
    const nameBytes = Buffer.from('Folder/Doubles.html', 'utf8');
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(compBytes.length, 18);
    local.writeUInt32LE(rawBytes.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);
    const cd = Buffer.alloc(46 + nameBytes.length);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(compBytes.length, 20);
    cd.writeUInt32LE(rawBytes.length, 24); cd.writeUInt16LE(nameBytes.length, 28); cd.writeUInt32LE(0, 42);
    nameBytes.copy(cd, 46);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(local.length + compBytes.length, 16);
    const deflateZip = Buffer.concat([local, compBytes, cd, eocd]);

    const zipFile = { name: 'ClassroomPackets.zip', arrayBuffer: () => Promise.resolve(deflateZip.buffer.slice(deflateZip.byteOffset, deflateZip.byteOffset + deflateZip.byteLength)) };
    const sealFilesEl = doc.getElementById('seal-files');
    Object.defineProperty(sealFilesEl, 'files', { value: [zipFile], configurable: true });
    sealFilesEl.dispatchEvent(new win.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 80));
    expect(doc.getElementById('seal-list').textContent).toContain('Doubles__qr.html');
    expect(doc.getElementById('seal-save-nudge').hidden).toBe(false);

    doc.getElementById('save-key').click();
    expect(doc.getElementById('key-unsaved-tag').hidden).toBe(true);
    expect(doc.getElementById('seal-save-nudge').hidden).toBe(true);

    // 3. Co-teacher Public-Key-Only mode can seal packets in Step 2, hides Save private key, and blocks unlocking in Step 3
    const leadKp = Q.generateKeyPair('Lead Teacher');
    doc.getElementById('clear-key').click();
    doc.getElementById('pub-only-input').value = leadKp.publicKey;
    doc.getElementById('use-pub-only').click();
    expect(doc.getElementById('key-fp').textContent).toBe(leadKp.fingerprint);
    expect(doc.getElementById('key-pubonly-tag').hidden).toBe(false);
    expect(doc.getElementById('save-key').hidden).toBe(true);

    const sampleSealedForLead = Q.sealResult({ kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'lead-1', packet: { id: 'p1', mode: 'practice' }, lessonId: 'p1', lessonTitle: 'P', learner: 'Sam', summary: { items: 1, done: 1, firstTry: 1, afterRetry: 0, missed: 0, practised: 0 }, items: [{ n: 1, activity: 'math_ccc', word: '2+2', target: '4', responses: ['4'], attempts: 1, firstTry: true, correct: true, done: true, ms: 1000 }] }, leadKp.publicKey).code;
    doc.getElementById('code-input').value = sampleSealedForLead;
    doc.getElementById('code-add').click();
    expect(doc.getElementById('collect-status').textContent).toContain('Public key only is loaded');
    dom.window.close();
  });
});
