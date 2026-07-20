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
const mirror = readFileSync(resolve(process.cwd(), 'prismflow-deploy/src/AlloFlowANTI.txt'), 'utf8');

describe('take-home: teacher side', () => {
  it("Send home broadcasts kind:'takehome' on the existing mailbox down-channel", () => {
    expect(anti).toContain("v: { kind: 'takehome', title, at: Date.now() }");
    // and it refuses an empty pack instead of sending a hollow save signal
    expect(anti).toMatch(/sendPackHome[\s\S]{0,600}?!TEACHER_ONLY_TYPES\.includes\(h\.type\)/);
  });
  it('directions composer writes a NORMAL student-safe history item (auto-sync carries it)', () => {
    expect(anti).toContain("const item = { id: generateUUID(), type: 'directions', title, timestamp: new Date().toISOString(), data: md };");
    expect(anti).toMatch(/addDirectionsToPack[\s\S]{0,900}?setHistory\(prev => \[\.\.\.\(Array\.isArray\(prev\) \? prev : \[\]\), item\]\)/);
    // due date is markdown INSIDE the body — no new schema field to drift
    expect(anti).toContain("(due ? '**Due:** ' + due + '\\n\\n' : '') + body");
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
  it('prismflow-deploy/src mirror carries the identical feature', () => {
    expect(mirror).toBe(anti);
  });
});
