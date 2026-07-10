// Module-readiness loader + sort-game scoring economics.
// Loader: registry tracks pending/loaded/failed, splash holds for a core set,
// pill + retry exist. Economics: awards are once-per-item, hint-assisted
// recoveries earn reduced credit — guess-cycling cannot farm XP.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const games = fs.readFileSync(path.join(ROOT, 'games_module.js'), 'utf8');

describe('sort-game scoring economics', () => {
    const start = games.indexOf('var makeSortScoreTracker');
    const end = games.indexOf('// ── App dependencies from window ──', start);
    const factory = new Function(games.slice(start, end) + '; return makeSortScoreTracker;')();

    it('awards full credit once, reduced credit after a miss, nothing on repeats', () => {
        const tracker = factory();
        expect(tracker.correct('a')).toBe(20);   // first-try correct
        expect(tracker.correct('a')).toBe(0);    // re-placing the same item: no farm
        expect(tracker.incorrect('b')).toBe(-5); // miss costs
        expect(tracker.correct('b')).toBe(5);    // hint-assisted recovery: reduced
        expect(tracker.correct('b')).toBe(0);    // and only once
        expect(tracker.incorrect('c')).toBe(-5);
        expect(tracker.incorrect('c')).toBe(-5); // repeated misses keep costing
        expect(tracker.correct('c')).toBe(5);
    });

    it('kills the guess-then-follow-the-hint farm (was net +15/item)', () => {
        const tracker = factory();
        const netPerFarmedItem = tracker.incorrect('x') + tracker.correct('x');
        expect(netPerFarmedItem).toBe(0);
    });

    it('is wired into every drag-sort game and no unguarded +20 award remains', () => {
        const components = ['VennGame', 'CauseEffectSortGame', 'TChartSortGame', '_MultiBucketSortGame', 'MultiZoneSortGame'];
        components.forEach(name => {
            const idx = games.indexOf(`const ${name} = React.memo`);
            expect(idx, name + ' exists').toBeGreaterThan(-1);
            const head = games.slice(idx, idx + 800);
            expect(head, name + ' has tracker ref').toContain('makeSortScoreTracker()');
        });
        expect(games).not.toMatch(/setScore\(\(s\) => s \+ 20\)/);
        // MemoryGame keeps its own -5 mismatch penalty: it has no
        // answer-revealing hint and pairs can only be matched once by
        // construction, so it is not farmable. Exactly one legacy -5 remains.
        expect((games.match(/setScore\(\(s\) => Math\.max\(0, s - 5\)\)/g) || []).length).toBe(1);
    });
});

describe('module readiness loader', () => {
    it('registry tracks transitions and exposes snapshot/ready/retry', () => {
        expect(anti).toMatch(/__alloModuleRegistry/);
        expect(anti).toMatch(/window\.__alloModuleSnapshot = function/);
        expect(anti).toMatch(/window\.__alloModuleReady = function/);
        expect(anti).toMatch(/window\.__alloRetryFailedModules = function/);
        // Never demote a loaded module; fallback failure settles to 'failed'.
        expect(anti).toMatch(/never demote a loaded module/);
        expect(anti).toMatch(/__alloSetModuleStatus\(name, 'failed'\)/);
        expect(anti).toMatch(/alloflow:module-registry-changed/);
    });

    it('splash holds for the curated core set with the existing hard ceiling', () => {
        expect(anti).toMatch(/CORE_BOOT_MODULES = \['LaunchPadView', 'MiscComponents', 'UtilsPure', 'SidebarTabsNav', 'HistoryPanel'\]/);
        expect(anti).toMatch(/window\.__alloModuleReady\(CORE_BOOT_MODULES\)/);
        expect(anti).toMatch(/MAX_WAIT_MS = 15000/);
    });

    it('renders the still-loading pill with a failed-retry affordance after splash only', () => {
        expect(anti).toMatch(/Loading tools… \{moduleLoadInfo\.pending\.length\} left/);
        expect(anti).toMatch(/\{moduleLoadInfo\.failed\.length\} failed — retry/);
        expect(anti).toMatch(/isAppReady && \(moduleLoadInfo\.pending\.length > 0 \|\| moduleLoadInfo\.failed\.length > 0\)/);
        expect(anti).toMatch(/window\.__alloRetryFailedModules\?\.\(\)/);
    });
});

describe('mailbox live-session parity', () => {
    it('nickname announces are not gated behind first-poll completion', () => {
        const start = anti.indexOf('// Keep the announced nickname current');
        const effect = anti.slice(start, anti.indexOf('}, [studentNickname, mbStudent]);', start));
        expect(effect).not.toContain('mbStudentConnectedRef.current &&');
    });

    it('teacher resource-open auto-follows the mailbox class (sync parity)', () => {
        expect(anti).toMatch(/Mailbox sync-mode parity/);
        expect(anti).toMatch(/pushResourceToMailbox\(item, \{ silentTeacher: true \}\)/);
    });

    it('full-pack sharing delivers quietly without yanking the student view (async parity)', () => {
        expect(anti).toMatch(/shareFullPackToMailbox/);
        expect(anti).toMatch(/_mbPushOneResource\(item, \{ open: false, quiet: true \}\)/);
        expect(anti).toMatch(/if \(v\.open !== false\) setPendingQrAssignmentResource\(resource\);/);
        expect(anti).toMatch(/kind: 'packdone'/);
    });

    it('pack auto-syncs like syncResourcesToSession: incremental, removals, no button needed', () => {
        expect(anti).toMatch(/the exact analogue\s*\n\s*\/\/ of syncResourcesToSession/);
        expect(anti).toMatch(/_alloQuickHash\(JSON\.stringify\(stripUndefined/);
        expect(anti).toMatch(/kind: 'res-remove', ids: removedIds/);
        expect(anti).toMatch(/v\.kind === 'res-remove' && Array\.isArray\(v\.ids\)/);
        // Late joiners get the pack over their own channel (post-45min replay).
        expect(anti).toMatch(/Late-joiner welcome/);
        // Mode semantics match Firestore: teacher-paced gates auto-follow.
        expect(anti).toMatch(/mbLive && mbMode === 'sync'/);
        expect(anti).toMatch(/Teacher-paced: class follows what you open/);
    });

    it('interruption resilience: teacher resume, RTC retry-forever, cursor self-heal, clean student pack', () => {
        // Teacher refresh restores the live session from localStorage and
        // self-validates via the first poll.
        expect(anti).toMatch(/localStorage\.getItem\(ALLO_MB_LIVE_KEY\)/);
        expect(anti).toMatch(/localStorage\.setItem\(ALLO_MB_LIVE_KEY/);
        expect((anti.match(/localStorage\.removeItem\(ALLO_MB_LIVE_KEY\)/g) || []).length).toBeGreaterThanOrEqual(2);
        // RTC retries forever with capped backoff + visibility nudge.
        expect(anti).toMatch(/Math\.min\(15000 \* Math\.pow\(2, Math\.max\(0, tries - 1\)\), 60000\)/);
        expect(anti).toMatch(/onRtcVisible/);
        expect(anti).not.toMatch(/tries >= 4/);
        // Cursor self-heal on server counter eviction, both directions.
        expect((anti.match(/box\.latest === 'number' && box\.latest < mb/g) || []).length).toBe(2);
        // Live-join students start with a clean pack (Firestore parity).
        const entry = anti.slice(anti.indexOf('// Mailbox live-session student entry'), anti.indexOf('setMbStudent({ url: entry.u'));
        expect(entry).toMatch(/setHistory\(\[\]\);/);
    });

    it('server-side session resume works without local storage (Canvas-correct)', () => {
        // The connect flow queries the server, not localStorage, for open sessions.
        expect(anti).toMatch(/a: 'mysessions', admin/);
        expect(anti).toMatch(/setMbResumable\(open\)/);
        expect(anti).toMatch(/resumeMailboxLiveSession/);
        expect(anti).toMatch(/Resume class \{String\(s\.c\)\.toUpperCase\(\)\}/);
        // localStorage is documented as the non-Canvas fast path only.
        expect(anti).toMatch(/unavailable in the sandboxed Gemini Canvas iframe/);
    });

    it('flaky-connection hardening: fetch timeout + auto-retries', () => {
        expect(anti).toMatch(/controller\.abort\(\)/);
        expect(anti).toMatch(/allo\/mailbox-' \+ \(fetchErr\?\.name === 'AbortError' \? 'timeout' : 'unreachable'\)/);
        expect(anti).toMatch(/code\.includes\('timeout'\)/);
        expect(anti).toMatch(/splashAutoRetried = true/);
        expect(anti).toMatch(/moduleAutoRetryRef\.current = true/);
        // Hosted homework fetches ride the retry wrapper too.
        expect(anti).toMatch(/_alloMailboxCallWithRetry\(entry\.u, \{ a: 'getpack'/);
    });
});
