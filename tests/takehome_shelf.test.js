// Take-Home Pack v1 (2026-07-19): the live mailbox session doubles as the homework hand-off.
// Teacher: a 'directions' resource composer + a "Send home" broadcast (kind:'takehome');
// student: the dispatcher persists the CURRENT student-safe pack to storageDB
// ('allo_homework_shelf_v1'); at home a banner rehydrates it through the SAME state path the
// homework-QR assignment loader uses. These pins hold the contracts; the markdown-bodied
// 'directions' type deliberately reuses the default text renderer + read-aloud.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const mirror = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8');

describe('take-home: teacher side', () => {
  it("Send home broadcasts kind:'takehome' on the existing mailbox down-channel", () => {
    expect(anti).toContain("v: { kind: 'takehome', title, at: Date.now() }");
    // and it refuses an empty pack instead of sending a hollow save signal
    // (2026-07-20: the candidate rule is the shared _alloStudentSafeResources —
    // TEACHER_ONLY filtering lives inside it / SessionTransport).
    expect(anti).toMatch(/sendPackHome[\s\S]{0,600}?_alloStudentSafeResources\(history\)/);
  });
  it('directions composer writes a NORMAL student-safe history item (auto-sync carries it)', () => {
    // v2: derivation provenance rides meta.derivedFrom — a one-way snapshot marker, never a live link.
    // Objectives Phase 1: data is the plain markdown string UNLESS goals exist (structured build
    // pinned in tests/directions_objectives.test.js).
    expect(anti).toContain("const item = { id: generateUUID(), type: 'directions', title, timestamp: new Date().toISOString(), data: _dirData, ...(d.derivedFrom ? { meta: { derivedFrom: d.derivedFrom } } : {}) };");
    expect(anti).toMatch(/addDirectionsToPack[\s\S]{0,1100}?setHistory\(prev => \[\.\.\.\(Array\.isArray\(prev\) \? prev : \[\]\), item\]\)/);
    // due date is markdown INSIDE the body — no new schema field to drift
    expect(anti).toContain("(due ? '**Due:** ' + due + '\\n\\n' : '') + body");
  });
  it('v2: the composer is ALWAYS available — palette card after Lesson Plan opens the modal', () => {
    expect(anti).toContain('id="tour-tool-directions"');
    // card sits AFTER the lesson-plan card and BEFORE the full-pack card
    const lp = anti.indexOf('id="tour-tool-lesson-plan"');
    const dir = anti.indexOf('id="tour-tool-directions"');
    const fp = anti.indexOf('id="tour-tool-fullpack"');
    expect(lp).toBeGreaterThan(0);
    expect(dir).toBeGreaterThan(lp);
    expect(fp).toBeGreaterThan(dir);
    expect(anti).toContain('setShowDirectionsComposer(true)');
  });
  it('v2: derivation context = lesson plan (intent) + STUDENT-SAFE pack manifest (tasks), with the privacy rule pinned', () => {
    const idx = anti.indexOf('const deriveDirectionsDraft = useCallback(');
    expect(idx).toBeGreaterThan(0);
    const body = anti.slice(idx, idx + 3200);
    // manifest excludes teacher-only items AND prior directions; titles/types only, no content
    // (2026-07-20: shared candidate rule + local 'directions' exclusion)
    expect(body).toContain("_alloStudentSafeResources(history).filter(h => h.type !== 'directions')");
    expect(body).toContain("'- ' + String(it.title || it.type).slice(0, 120) + ' (' + it.type + ')'");
    // the non-negotiable privacy line travels IN the prompt
    expect(body).toContain('PRIVACY: Never mention accommodations, IEPs, disabilities, reading levels, groupings, or why any student might get different work.');
    // plan text is context-only and quarantined as such
    expect(body).toContain('TEACHER LESSON PLAN (context only');
    // works plan-less: only bails when BOTH context sources are empty
    expect(body).toContain('if (!planText && !manifest) {');
    // review-before-share: a draft lands in the EDITABLE composer, never straight into the pack
    expect(body).toContain('setMbDirectionsDraft(prev => ({');
    expect(body).not.toContain('setHistory');
  });
  it('v2: delivery rule — the QR assignment loader opens directions FIRST (storage order untouched)', () => {
    expect(anti).toContain("const _dirFirst = restoredResources.find(item => item && item.type === 'directions');");
    expect(anti).toContain('const firstResource = _dirFirst || restoredResources.find(item => item && item.id === firstId) || restoredResources[0];');
  });
  it("'directions' is student-safe (NOT in TEACHER_ONLY_TYPES) and registered (icon + title)", () => {
    const teacherOnly = anti.slice(anti.indexOf('const TEACHER_ONLY_TYPES = ['), anti.indexOf('const TEACHER_ONLY_TYPES = [') + 600);
    expect(teacherOnly).not.toContain("'directions'");
    expect(anti).toContain("case 'directions': return <ClipboardList size={16} />;");
    expect(anti).toContain("case 'directions': return t('directions.title') || 'Assignment Directions';");
  });
});

describe('take-home: student side', () => {
  it("dispatcher persists the student-safe pack on kind:'takehome' via storageDB, honoring the boolean write contract", () => {
    const idx = anti.indexOf("if (v.kind === 'takehome') {");
    expect(idx).toBeGreaterThan(0);
    const branch = anti.slice(idx, idx + 2200);
    expect(branch).toContain('!TEACHER_ONLY_TYPES.includes(it.type)');
    expect(branch).toContain("storageDB.set('allo_homework_shelf_v1', shelf)");
    expect(branch).toContain("if (ok === false) throw new Error('storage unavailable')"); // CS2-B: set() returns boolean
    // honest fallback: storage refused → in-memory shelf + download guidance, never silence
    expect(branch).toContain('setHomeworkShelf(shelf); // in-memory for this visit');
  });
  it('the shelf loads from storage on mount and only surfaces with real resources', () => {
    expect(anti).toContain("const saved = await storageDB.get('allo_homework_shelf_v1');");
    expect(anti).toContain('saved && Array.isArray(saved.resources) && saved.resources.length');
  });
  it('the banner never overlays an ACTIVE session (teacher, mailbox student, or Firebase)', () => {
    expect(anti).toMatch(/homeworkShelf\.resources\.length > 0 && !mbLive && !mbStudent && !activeSessionCode && !isTeacherMode/);
  });
  it('opening the shelf mirrors the homework-QR assignment loader state path, directions first', () => {
    const idx = anti.indexOf('const openHomeworkShelf = useCallback(');
    expect(idx).toBeGreaterThan(0);
    const body = anti.slice(idx, idx + 1600);
    for (const setter of ['setHasSelectedMode(true)', 'setIsStudentLinkMode(true)', 'setHistory(shelf.resources)', 'hydratedHistoryRef.current = shelf.resources']) {
      expect(body).toContain(setter);
    }
    expect(body).toContain("shelf.resources.find(r => r && r.type === 'directions')");
    expect(body).toContain('setPendingQrAssignmentResource(first)');
  });
  it('the JSON download fallback exists for shared/locked-down devices', () => {
    expect(anti).toContain("a.download = 'alloflow-homework-'");
  });
});

describe('take-home: mirror parity', () => {
  it('desktop/web-app/src mirror carries the identical feature', () => {
    expect(mirror).toBe(anti);
  });
});
