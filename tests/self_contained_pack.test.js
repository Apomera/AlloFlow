// Self-contained homework packs (#allo_pack): the whole activity is compressed
// into the URL fragment, so students need no account/Firebase/hosting. This
// suite extracts the real helper source from AlloFlowANTI.txt (source-pin
// style) and exercises encode/decode round-trips plus the URL builders, and
// pins the teacher/student wiring so a refactor can't silently drop the path.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// jsdom's Blob has no .stream(); inject Node's real web-stream implementations
// so the compressed '1.' path is exercised the way real browsers run it.
import { Blob as NodeBlob } from 'node:buffer';
import { CompressionStream as NodeCS, DecompressionStream as NodeDS } from 'node:stream/web';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANTI_PATH = path.join(ROOT, 'AlloFlowANTI.txt');
const anti = fs.readFileSync(ANTI_PATH, 'utf8');

function sliceBetween(startMarker, endMarker) {
    const start = anti.indexOf(startMarker);
    const end = anti.indexOf(endMarker, start);
    if (start === -1 || end === -1) throw new Error(`markers not found: ${startMarker} .. ${endMarker}`);
    return anti.slice(start, end);
}

// _alloBase64UrlEncode/_alloBase64UrlDecode + the ALLO_QR_PACK block, ending
// right before _alloValidFirebaseConfig.
const helperSource = sliceBetween('function _alloBase64UrlEncode(value)', 'function _alloValidFirebaseConfig(config)');

function buildHelpers({ windowObj, configuredBase = 'https://alloflow-cdn.pages.dev/app/', notReachable = () => false } = {}) {
    const factory = new Function(
        'window',
        '_alloGetConfiguredStudentBaseUrl',
        '_alloShareHostIsNotStudentReachable',
        'Blob', 'Response', 'CompressionStream', 'DecompressionStream',
        helperSource + `;
        return { _alloBase64UrlEncode, _alloBase64UrlDecode, _alloBytesToBase64Url, _alloBase64UrlToBytes,
                 _alloEncodeAlloPack, _alloDecodeAlloPack, _alloReadAlloPackParam, _buildAlloPackShareUrl,
                 ALLO_QR_PACK_PARAM, ALLO_QR_PACK_MAX_URL_CHARS, ALLO_QR_PACK_QR_MAX_CHARS };`
    );
    return factory(windowObj, () => configuredBase, notReachable, NodeBlob, globalThis.Response, NodeCS, NodeDS);
}

describe('self-contained pack encode/decode', () => {
    it('round-trips a realistic packet through deflate-raw compression', async () => {
        const H = buildHelpers({});
        const packet = {
            v: 1,
            kind: 'assignment',
            title: 'Photosynthesis review',
            currentResourceId: 'r1',
            resources: Array.from({ length: 6 }, (_, i) => ({
                id: 'r' + (i + 1),
                type: 'leveled',
                title: 'Reading level ' + (i + 1),
                meta: 'Grade ' + (i + 3),
                data: { text: 'Plants convert sunlight into chemical energy. '.repeat(200) },
            })),
            aiPolicy: { studentAi: 'off', defaultStudentAi: 'off', teacherPrepared: true },
        };
        const json = JSON.stringify(packet);
        const encoded = await H._alloEncodeAlloPack(json);
        expect(encoded.startsWith('1.')).toBe(true);
        // Highly repetitive classroom text must actually compress.
        expect(encoded.length).toBeLessThan(json.length / 2);
        const decoded = await H._alloDecodeAlloPack(encoded);
        expect(JSON.parse(decoded)).toEqual(packet);
    });

    it('round-trips unicode content (accents, emoji, CJK)', async () => {
        const H = buildHelpers({});
        const json = JSON.stringify({ title: 'Água é vida 🌊 — 光合作用', resources: [{ id: 'a', type: 'summary', data: { text: 'ñandú 🦤' } }] });
        const decoded = await H._alloDecodeAlloPack(await H._alloEncodeAlloPack(json));
        expect(decoded).toBe(json);
    });

    it('decodes the raw "0." fallback format', async () => {
        const H = buildHelpers({});
        const json = JSON.stringify({ v: 1, resources: [{ id: 'x', type: 'summary' }] });
        const raw = '0.' + H._alloBase64UrlEncode(json);
        expect(await H._alloDecodeAlloPack(raw)).toBe(json);
    });

    it('byte-level base64url helpers round-trip binary data', () => {
        const H = buildHelpers({});
        const bytes = new Uint8Array(70000).map((_, i) => (i * 31) % 256);
        const out = H._alloBase64UrlToBytes(H._alloBytesToBase64Url(bytes));
        expect(out.length).toBe(bytes.length);
        expect(Array.from(out.slice(0, 64))).toEqual(Array.from(bytes.slice(0, 64)));
        expect(Array.from(out.slice(-8))).toEqual(Array.from(bytes.slice(-8)));
    });
});

describe('pack URL read/build', () => {
    it('reads allo_pack from the hash first, then falls back to search', () => {
        const fromHash = buildHelpers({ windowObj: { location: { hash: '#allo_pack=1.abc', search: '?allo_pack=1.zzz' } } });
        expect(fromHash._alloReadAlloPackParam()).toBe('1.abc');
        const fromSearch = buildHelpers({ windowObj: { location: { hash: '', search: '?allo_pack=1.qqq' } } });
        expect(fromSearch._alloReadAlloPackParam()).toBe('1.qqq');
        const none = buildHelpers({ windowObj: { location: { hash: '', search: '' } } });
        expect(none._alloReadAlloPackParam()).toBe('');
    });

    it('builds the share URL on the configured student base with the pack in the fragment only', () => {
        const H = buildHelpers({ windowObj: { location: { href: 'https://example.test/app', hash: '', search: '' } } });
        const url = H._buildAlloPackShareUrl('1.abc123');
        expect(url).toBe('https://alloflow-cdn.pages.dev/app/#allo_pack=1.abc123');
        expect(url.includes('?')).toBe(false);
    });

    it('returns empty when no student-reachable base exists', () => {
        const H = buildHelpers({
            windowObj: { location: { href: 'https://gemini.google.com/canvas', hash: '', search: '' } },
            configuredBase: '',
            notReachable: () => true,
        });
        expect(H._buildAlloPackShareUrl('1.abc')).toBe('');
    });
});

describe('ANTI wiring pins', () => {
    it('teacher creator exists and the cloud homework path falls back to it', () => {
        expect(anti).toMatch(/const createSelfContainedHomeworkLink = useCallback/);
        expect(anti).toMatch(/Cloud homework link failed — making a self-contained link instead\./);
        expect(anti).toMatch(/return createSelfContainedHomeworkLink\(\);/);
        // Creator must be defined BEFORE the cloud creator that references it (TDZ).
        expect(anti.indexOf('const createSelfContainedHomeworkLink = useCallback'))
            .toBeLessThan(anti.indexOf('const createHomeworkAssignmentLink = useCallback'));
    });

    it('student #allo_pack entry installs the AI guard and never touches Firebase', () => {
        const start = anti.indexOf('// Self-contained homework entry (#allo_pack');
        expect(start).toBeGreaterThan(-1);
        const effect = anti.slice(start, anti.indexOf('}, []);', start) + 7);
        expect(effect).toMatch(/__alloInstallQrStudentAiGuard/);
        expect(effect).toMatch(/setIsStudentLinkMode\(true\)/);
        expect(effect).toMatch(/setPendingQrAssignmentResource\(firstResource\)/);
        expect(effect).not.toMatch(/_alloEnsureAuthenticatedUser|getDoc|doc\(db/);
    });

    it('modal renders the pack variant with size guidance and a no-QR notice', () => {
        expect(anti).toMatch(/Self-contained homework link/);
        expect(anti).toMatch(/too large for a scannable QR code/);
        expect(anti).toMatch(/Make self-contained version \(no accounts needed\)/);
        // QR generation is skipped for oversized packs.
        expect(anti).toMatch(/qrShareModal\?\.noQr \? '' : \(qrShareModal\?\.url \|\| ''\)/);
    });
});
