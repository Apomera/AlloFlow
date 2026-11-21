import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const sha256File = (rel) => createHash('sha256').update(readFileSync(path.join(ROOT, rel))).digest('hex');

const verify = require('../packets_verify_core.js');
const readAlong = require('../packet_read_along_builder.js');
const vocab = require('../packet_vocab_builder.js');
const symbolRunner = require('../packet_symbol_runner_builder.js');
const resultsReader = require('../packets_results_reader.js');
const mathPractice = require('../packet_math_practice_builder.js');
const packetParts = require('../dev-tools/make_word_sounds_packet.cjs').loadParts();
const pdPipeline = require('../dev-tools/lib/pd_publish_pipeline.cjs');
const retentionCore = require('../dev-tools/security/school_firestore_retention_core.cjs');
const depPins = require('../dev-tools/security/dependency-pins.cjs');
const mailboxReceipt = require('../dev-tools/security/check_mailbox_deletion_receipt.cjs');
const webSourceFetch = require('../desktop/web-app/functions/web_source_fetch.js');
const webSourceFetchDesktop = require('../desktop/runtime/web-source-fetch.cjs');

// Build a minimal stored-method (0) ZIP containing one UTF-8 file, optionally preceded by `padBefore` junk bytes.
function makeStoredZip(name, bodyText, padBefore = 0) {
  const nameBytes = Buffer.from(name, 'utf8');
  const dataBytes = Buffer.from(bodyText, 'utf8');
  // Standard CRC-32
  let crc = 0xffffffff;
  for (const b of dataBytes) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  crc = (crc ^ 0xffffffff) >>> 0;

  const lfh = Buffer.alloc(30 + nameBytes.length);
  lfh.writeUInt32LE(0x04034b50, 0);
  lfh.writeUInt16LE(20, 4);
  lfh.writeUInt16LE(0, 6);
  lfh.writeUInt16LE(0, 8);
  lfh.writeUInt32LE(crc, 14);
  lfh.writeUInt32LE(dataBytes.length, 18);
  lfh.writeUInt32LE(dataBytes.length, 22);
  lfh.writeUInt16LE(nameBytes.length, 26);
  nameBytes.copy(lfh, 30);

  const cdOffset = lfh.length + dataBytes.length;
  const cd = Buffer.alloc(46 + nameBytes.length);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(20, 4);
  cd.writeUInt16LE(20, 6);
  cd.writeUInt16LE(0, 8);
  cd.writeUInt16LE(0, 10);
  cd.writeUInt32LE(crc, 16);
  cd.writeUInt32LE(dataBytes.length, 20);
  cd.writeUInt32LE(dataBytes.length, 24);
  cd.writeUInt16LE(nameBytes.length, 28);
  cd.writeUInt32LE(0, 42);
  nameBytes.copy(cd, 46);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);

  const zipBuf = Buffer.concat([lfh, dataBytes, cd, eocd]);
  const full = Buffer.alloc(padBefore + zipBuf.length + 8, 0x41);
  zipBuf.copy(full, padBefore);
  return { buffer: full.buffer.slice(full.byteOffset, full.byteOffset + full.byteLength), offset: padBefore, length: zipBuf.length };
}

describe('Phase 25 — Track 1: Packets Builders & Core Engines Hardening', () => {
  it('packets_verify_core flags data:, blob:, and unsafe-hashes on script-src and backslash escapes in SVG', () => {
    const baseScript = 'console.log(1);';
    const b64 = createHash('sha256').update(baseScript, 'utf8').digest('base64');
    const hex = createHash('sha256').update(baseScript, 'utf8').digest('hex');
    const makeHtml = (scriptSrc) => {
      const csp = `default-src 'none'; script-src ${scriptSrc}; style-src 'unsafe-inline'; media-src data: blob:; img-src data:; form-action 'none'; base-uri 'none'; connect-src 'none'`;
      const manifest = JSON.stringify({
        kind: 'alloflow-packet-manifest',
        engine: 'alloflow-packet/1',
        player: 'alloflow-word-sounds-take-home/2',
        title: 'Test',
        packet: { id: 'p-1', version: 'r1', form: '', mode: 'practice' },
        network: 'none',
        never: ['internet connection', 'AI'],
        csp,
        scriptSha256: hex,
        licence: 'AGPL-3.0',
      });
      return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"></head><body><script type="application/json" id="packet-manifest">${manifest}</script><script>${baseScript}</script></body></html>`;
    };

    for (const extra of ['data:', 'blob:', "'unsafe-hashes'"]) {
      const report = verify.verifyPacket(makeHtml(`'sha256-${b64}' ${extra}`));
      const scriptFact = report.policy.facts.find((f) => f.id === 'scripts');
      const pinnedFact = report.policy.facts.find((f) => f.id === 'pinned');
      expect(scriptFact.open, `script-src with ${extra} must be flagged open`).toBe(true);
      expect(pinnedFact.open, `pinned fact with ${extra} must not claim pinned`).toBe(true);
    }

    // Backslash escape in SVG style must be flagged
    const evilSvg = '<svg xmlns="http://www.w3.org/2000/svg"><style>@\\69 mport url(https://x.test/a.css);</style><rect width="4" height="4"/></svg>';
    const uri = 'data:image/svg+xml;base64,' + Buffer.from(evilSvg, 'utf8').toString('base64');
    const checks = require('../packet_check_builder.js');
    const checkHtml = checks.buildCheckPacket({
      lesson: checks.lessonFromMathProblems({ title: 'Facts', problems: checks.parseProblems('1+1,2+2'), timeLimitS: 60 }),
      loader: packetParts.loader,
    }).html;
    const m = /var lesson=(.*);\nvar labels=/.exec(checkHtml);
    const lesson = JSON.parse(m[1]);
    lesson.images = { bad: uri };
    const patched = checkHtml.slice(0, m.index) + 'var lesson=' + JSON.stringify(lesson).replace(/</g, '\\u003c') + ';\nvar labels=' + checkHtml.slice(m.index + m[0].length);
    const report = verify.verifyPacket(patched);
    expect(report.findings.some((f) => f.id === 'svg-active' && /escape character/i.test(f.why))).toBe(true);
  });

  it('packet_read_along_builder validates SVG payloads in glossaryFor and handles prototype keys safely', () => {
    const evilSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="5" height="5"/></svg>', 'utf8').toString('base64');
    const added = [];
    const gloss = readAlong.glossaryFor(
      [{ text: 'The constructor builds a bridge.' }],
      (w) => (w === 'constructor' ? { word: 'constructor', pos: 'noun', def: 'A builder.' } : null),
      (w) => (w === 'bridge' ? { uri: evilSvg, label: 'bridge', set: 'teacher', credit: 'https://evil.test/x' } : null),
      (k, uri) => { added.push({ k, uri }); return 'p1'; },
    );
    expect(added).toEqual([]);
    expect(gloss).toBeTruthy();
    expect(gloss.constructor.d).toBe('A builder.');
    expect(gloss.bridge).toBeUndefined();

    const truncated = '<script type="application/json" id="packet-manifest">{"title":"a"}';
    expect(readAlong.withCodeName(truncated, 'Sam')).toBe(truncated);
  });

  it('packet_vocab_builder preserves prototype-named words, rejects active SVGs, and guards withCodeName', () => {
    const parsed = vocab.parseWords('constructor, prototype, toString, cat');
    expect(parsed.words.map((w) => w.key)).toEqual(['constructor', 'prototype', 'tostring', 'cat']);

    const evilSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image xlink:href="https://evil.test/x.png"/></svg>', 'utf8').toString('base64');
    const cleanSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="8" height="8"/></svg>', 'utf8').toString('base64');
    const rows = vocab.draftRows({
      words: ['constructor', 'cat'],
      edits: {
        words: {
          constructor: { def: 'A builder', customPicture: evilSvg },
          cat: { def: 'A small animal', customPicture: cleanSvg },
        },
      },
    });
    expect(rows.find((r) => r.key === 'constructor').customPicture).toBe('');
    expect(rows.find((r) => r.key === 'cat').customPicture).toBe(cleanSvg);

    const truncated = '<script type="application/json" id="packet-manifest">{"title":"v"}';
    expect(vocab.withCodeName(truncated, 'Sam')).toBe(truncated);
    const primitive = '<script type="application/json" id="packet-manifest">"not-an-object"</script>';
    expect(vocab.withCodeName(primitive, 'Sam')).toBe(primitive);
  });

  it('packet_symbol_runner_builder preserves prototype words, tightens audio URIs, and strips credit URLs', () => {
    const items = symbolRunner.parseItems('constructor, toString, cat');
    expect(items.map((x) => x.answer)).toEqual(['constructor', 'tostring', 'cat']);

    const cleanSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>', 'utf8').toString('base64');
    const made = symbolRunner.lessonFromSymbolRunner({
      loader: packetParts.loader,
      symbolMode: 'custom',
      items: ['constructor', 'cat', 'dog', 'sun'],
      pictures: {
        cat: { src: cleanSvg, credit: 'Art from https://example.org/pic open(1)', set: 'custom' },
      },
      clips: {
        cat: 'data:audio/wav;charset=utf-8,notbase64',
        dog: 'data:audio/wav;base64,UklGRg==',
      },
    });
    expect(Object.values(made.lesson.audio)).toEqual(['data:audio/wav;base64,UklGRg==']);
    expect(made.attributions.join(' ')).not.toMatch(/https?:\/\//i);
    expect(made.attributions.join(' ')).not.toMatch(/\bopen\s*\(/i);

    const truncated = '<script type="application/json" id="packet-manifest">{"title":"sr"}';
    expect(symbolRunner.withCodeName(truncated, 'Sam')).toBe(truncated);
  });

  it('packet_math_practice_builder caps parseFacts length and guards withCodeName', () => {
    expect(() => mathPractice.parseFacts('1+1,'.repeat(20000))).toThrow(/too long/i);
    const truncated = '<script type="application/json" id="packet-manifest">{"title":"m"}';
    expect(mathPractice.withCodeName(truncated, 'Sam')).toBe(truncated);
  });

  it('packets_results_reader.unpackZip respects non-zero byteOffset on DataView', async () => {
    const { buffer, offset, length } = makeStoredZip('student.csv', 'learner,score\nSam,10\n', 16);
    const view = new DataView(buffer, offset, length);
    const unpacked = await resultsReader.unpackZip(view);
    expect(unpacked.ok).toBe(true);
    expect(unpacked.entries).toHaveLength(1);
    expect(unpacked.entries[0].name).toBe('student.csv');
    expect(unpacked.entries[0].text).toContain('Sam,10');
  });

  it('Phase 25 mirrored deliverables match across root and all 3 desktop mirrors', () => {
    const mirrored = [
      'packets_verify_core.js',
      'packet_read_along_builder.js',
      'word_sounds_packet_builder.js',
      'packet_symbol_runner_builder.js',
    ];
    for (const file of mirrored) {
      const rootHash = sha256File(file);
      for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
        expect(sha256File(`${dir}/${file}`), `${dir}/${file} mirror parity`).toBe(rootHash);
      }
    }
  });
});

describe('Phase 25 — Track 2: CI Workflows & Security DevTools Hardening', () => {
  it('pd_publish_pipeline handles prototype activity.type safely without throwing', () => {
    const report = pdPipeline.inspectPdModule({
      moduleText: JSON.stringify({
        schemaVersion: 'pd-1.0',
        metadata: { id: 'proto-test', title: 'Test', language: 'en' },
        sections: [{ title: 'S1', activities: [{ type: 'toString', title: 'A1', content: { body: 'x' } }] }],
      }),
    });
    expect(report.checks.some((c) => c.code === 'schema-content-fields' && c.status === 'fail')).toBe(true);
  });

  it('school_firestore_retention_core rejects role-mismatched and out-of-root plan paths', () => {
    const nowIso = '2026-11-19T00:00:00.000Z';
    const now = Date.parse(nowIso);
    const validUntil = new Date(now + retentionCore.LIMITS.planAgeMs).toISOString();
    const ver = { seconds: 1700000000, nanoseconds: 0 };
    const basePlan = {
      kind: 'alloflow-firestore-retention-plan',
      version: 1,
      createdAt: nowIso,
      validUntil,
      scope: {
        projectId: 'proj-one-1',
        databaseId: '(default)',
        appId: 'app-1',
        sessionId: 'ABCD12',
        ownerUid: 'host-1',
      },
      approvalReference: 'TICKET-2026-11-19',
      holdsReviewed: true,
      manifest: {
        documents: [
          { path: 'artifacts/app-1/public/data/sessions/ABCD12', version: ver, role: 'session' },
          { path: 'artifacts/app-1/public/data/sessions/OTHER1', version: ver, role: 'session-child' },
        ],
        structuralPaths: ['artifacts/app-1/public/data/sessions/ABCD12'],
        collectionPaths: ['artifacts/app-1/public/data/sessions/ABCD12/teams'],
        assignmentExpiresAt: null,
      },
    };
    basePlan.planHash = retentionCore.hashPlan(basePlan);
    expect(() => retentionCore.validatePlan(basePlan, { now: () => now, confirmProject: 'proj-one-1', reviewedHash: basePlan.planHash })).toThrow(/RETENTION_PATH_INVALID/);

    const badStruct = JSON.parse(JSON.stringify(basePlan));
    badStruct.manifest.documents = [basePlan.manifest.documents[0]];
    badStruct.manifest.structuralPaths = ['artifacts/app-1/public/data/sessions/OTHER1'];
    badStruct.planHash = retentionCore.hashPlan(badStruct);
    expect(() => retentionCore.validatePlan(badStruct, { now: () => now, confirmProject: 'proj-one-1', reviewedHash: badStruct.planHash })).toThrow(/RETENTION_PATH_INVALID/);
  });

  it('dependency-pins catches FROM --platform, line continuations, and empty Dockerfiles', () => {
    const errors = depPins.inspectImages('services: {}', {
      'Dockerfile.platform': 'FROM --platform=linux/amd64 python:3.12-slim\nRUN echo hi\n',
      'Dockerfile.cont': 'FROM \\\npython:3.12-slim\n',
      'Dockerfile.empty': '# no base image\n',
    });
    expect(errors).toEqual([
      'Dockerfile.platform: base image requires an immutable SHA256 digest',
      'Dockerfile.cont: base image requires an immutable SHA256 digest',
      'Dockerfile.empty: Dockerfile must declare a pinned FROM base image',
    ]);
  });

  it('check_mailbox_deletion_receipt rejects not-found outcome for retained rows', () => {
    const scope = {
      accountRef: 'acct_001',
      scriptId: 'script_001',
      mailboxFolderId: 'folder_mailbox_1',
      deliveryFolderId: 'folder_delivery_1',
    };
    const plan = {
      kind: 'alloflow-mailbox-deletion-plan',
      version: 1,
      requestRef: 'req_001',
      scope,
      reviewedAt: '2026-11-19T00:00:00Z',
      resources: [
        {
          ref: 'res_001',
          type: 'submission',
          id: 'file_001',
          parentId: scope.mailboxFolderId,
          modifiedAt: '2026-11-18T00:00:00Z',
          hold: 'held',
          action: 'retain',
        },
      ],
    };
    const receipt = {
      kind: 'alloflow-mailbox-deletion-receipt',
      version: 1,
      requestRef: 'req_001',
      scope,
      planSha256: mailboxReceipt.planDigest(plan),
      outcomes: [
        {
          ref: 'res_001',
          state: 'not-found',
          observedAt: '2026-11-19T01:00:00Z',
        },
      ],
      externalReviews: mailboxReceipt.AREAS.map((area) => ({ area, status: 'cleared', noteRef: 'note_001' })),
    };
    expect(() => mailboxReceipt.inspectPacket(plan, receipt)).toThrow();
  });

  it('hardened CI workflows enforce security:prepare, PS native errors, and no privileged checkout', () => {
    const trailer = read('.github/workflows/trailer-render.yml');
    expect(trailer).toContain('npm run security:prepare');
    expect(trailer).toContain('Validate dispatch inputs');
    expect(trailer).toContain('npx --no-install');

    const mcpb = read('.github/workflows/mcpb-release.yml');
    expect(mcpb).toContain('$PSNativeCommandUseErrorActionPreference = $true');
    expect(mcpb).toContain('timeout-minutes:');
    expect(mcpb).toContain('retention-days: 14');
    const releaseJob = mcpb.slice(mcpb.indexOf('\n  release:'));
    expect(releaseJob).not.toContain('actions/checkout@');
  });
});

describe('Phase 25 — Track 3: Firebase, SchoolBox, Web Source Fetch & Workers Hardening', () => {
  it('desktop/schoolbox enforces FERPA PocketBase owner scoping, pinned digests, and admin proxy blocks', () => {
    const schema = JSON.parse(read('desktop/schoolbox/pocketbase/pb_schema.json'));
    const byName = Object.fromEntries(schema.map((c) => [c.name, c]));
    for (const [col, ownerField] of [
      ['sessions', 'owner_id'],
      ['teacher_history', 'user_id'],
      ['session_assets', 'owner_id'],
      ['student_progress', 'owner_id'],
      ['images', 'owner_id'],
    ]) {
      expect(byName[col].listRule, `${col} listRule`).toContain(ownerField);
      expect(byName[col].listRule, `${col} listRule auth`).toContain('@request.auth.id');
      expect(byName[col].deleteRule, `${col} deleteRule`).toContain(ownerField);
    }
    const migration = read('desktop/schoolbox/pocketbase/pb_migrations/1731974400_alloflow_collections.js');
    expect(migration).toBe(read('docker/pocketbase/pb_migrations/1731974400_alloflow_collections.js'));

    const compose = read('desktop/schoolbox/docker-compose.yml');
    expect(compose).toContain('no-new-privileges:true');
    expect(compose).toContain('SEARXNG_SECRET=${SEARXNG_SECRET:?');
    expect(compose).toContain('127.0.0.1');
    expect(compose).toContain('./pocketbase/pb_migrations:/pb/pb_migrations:ro');

    const nginx = read('desktop/schoolbox/nginx.conf');
    expect(nginx).toContain('server_tokens off;');
    expect(nginx).toContain('location ^~ /api/pocketbase/');
    expect(nginx).toContain('collections/(?:_|pbc_|import|meta)');
    expect(nginx).toContain('return 403;');
    expect(nginx).toContain('location ~* \\.svg$');

    const searx = read('desktop/schoolbox/searxng/settings.yml');
    expect(searx).not.toContain('alloflow-schoolbox-local');
    expect(searx).toContain('limiter: true');
  });

  it('firestore.rules and desktop/web-app/firestore.rules are byte-identical and carry Phase 25 guards', () => {
    const rootRules = read('firestore.rules');
    const webRules = read('desktop/web-app/firestore.rules');
    expect(webRules).toBe(rootRules);
    expect(rootRules).toContain("affectedKeys().hasOnly(['All'])");
    expect(rootRules).toContain('allow get: if isHost() || (authed() && participantSessionOpen(resource.data));');
    expect(rootRules).toMatch(/function validSdp\(/);
    expect(rootRules).toContain("request.resource.data.keys().hasOnly(['uid', 'text', 'status', 'answered', 'createdAt', 'expiresAt'])");
  });

  it('web_source_fetch.js and desktop/runtime/web-source-fetch.cjs match, block reserved IPv6/single-label hosts, and parse HTML linearly', () => {
    expect(read('desktop/runtime/web-source-fetch.cjs')).toBe(read('desktop/web-app/functions/web_source_fetch.js'));

    for (const blocked of [
      'https://[2001:2::1]/',
      'https://[3fff::1]/',
      'https://[5f00::1]/',
      'http://metadata/computeMetadata/v1/',
      'https://router.home.arpa/',
    ]) {
      expect(() => webSourceFetch.validatePublicHttpUrl(blocked), `functions blocks ${blocked}`).toThrow();
      expect(() => webSourceFetchDesktop.validatePublicHttpUrl(blocked), `desktop blocks ${blocked}`).toThrow();
    }

    const adversarialHtml = '<p>Clean readable body text for students.</p>' + '<script>'.repeat(2500) + '<!--'.repeat(2500);
    const t0 = Date.now();
    const doc = webSourceFetch.extractReadableDocument(adversarialHtml, 'text/html', 'https://example.org/a');
    expect(Date.now() - t0).toBeLessThan(250);
    expect(doc.text).toContain('Clean readable body text');
  });

  it('firebase.json and firebase.functions.json keep CSP-RO and standalone route headers in parity', () => {
    const fb = JSON.parse(read('desktop/web-app/firebase.json'));
    const fbf = JSON.parse(read('desktop/web-app/firebase.functions.json'));
    const getHeader = (cfg, src, key) => {
      const rule = (cfg.hosting.headers || []).find((h) => h.source === src);
      return rule && (rule.headers || []).find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
    };
    const classroomSrc = '/{classroom-import,classroom-import.html,data_lab/data_lab,data_lab/data_lab.html}';
    expect(getHeader(fbf, '**', 'Content-Security-Policy-Report-Only')).toBe(getHeader(fb, '**', 'Content-Security-Policy-Report-Only'));
    for (const cfg of [fb, fbf]) {
      expect(getHeader(cfg, classroomSrc, 'X-Frame-Options')).toBe('DENY');
      expect(getHeader(cfg, classroomSrc, 'Referrer-Policy')).toBe('no-referrer');
      expect(getHeader(cfg, '/allo_sheet/**', 'Content-Security-Policy')).toContain("base-uri 'none'");
      expect(getHeader(cfg, '/song_library/songs.json', 'Cache-Control')).toContain('no-cache');
    }
  });

  it('workers enforce hardened headers, bounded IDs, and reserved IPv6/multi-dot SSRF checks', async () => {
    const importWorker = (await import('../reading_library/import_worker.js')).default;
    const optRes = await importWorker.fetch(new Request('https://worker.test/', { method: 'OPTIONS' }));
    expect(optRes.status).toBe(204);
    const badIdRes = await importWorker.fetch(new Request('https://worker.test/?id=99999999'));
    expect(badIdRes.status).toBe(400);

    const bugDigestSrc = read('catalog/bug-digest-worker/src/index.js');
    expect(bugDigestSrc).toContain("'Cross-Origin-Resource-Policy': 'same-origin'");
    expect(bugDigestSrc).toContain('reader.releaseLock()');

    const cfWorker = (await import('../catalog/cloudflare-worker/src/index.js')).default;
    for (const badUrl of ['https://[2001:1ff::1]/', 'https://[5f00::1]/', 'https://foo.internal../']) {
      const res = await cfWorker.fetch(
        new Request(`https://catalog.test/source-metadata?url=${encodeURIComponent(badUrl)}`),
        { CATALOG_DATA: null },
      );
      expect(res.status, `blocked ${badUrl}`).toBe(400);
      expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'none'; frame-ancestors 'none'");
    }
  });
});
