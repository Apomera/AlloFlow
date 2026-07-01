// Group resource push semantics (2026-07-01) — source pins on AlloFlowANTI.txt.
//
// The bug these pins guard against: in student-paced (async) mode, the group
// resource branch of the session onSnapshot handler force-navigated a grouped
// student back to the group resource on EVERY snapshot where they weren't
// currently viewing it. Any unrelated session-doc write (xp sync, quiz
// answers, help signals) re-yanked them — student-paced mode wasn't
// student-paced for grouped students. The fix: each push carries a
// groups.{gid}.resourceAt nonce, and students consume each
// group+resource+nonce key exactly once (teacher re-push = new nonce = one
// new jump). Sync (teacher-paced) mode keeps its continuous-lock semantics.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

describe('group resource push is consume-once in student-paced mode', () => {
  it('teacher push writes a resourceAt nonce alongside resourceId', () => {
    const handlerIdx = src.indexOf('const handleSetGroupResource');
    expect(handlerIdx).toBeGreaterThan(-1);
    const handler = src.slice(handlerIdx, handlerIdx + 900);
    expect(handler).toContain('groups.${groupId}.resourceId');
    expect(handler).toContain('groups.${groupId}.resourceAt');
  });

  it('student consumer dedupes on group|resource|nonce, once per push', () => {
    expect(src).toContain('const lastGroupPushKeyRef = useRef(null)');
    expect(src).toContain("const groupPushKey = userGroupId + '|' + groupResourceId + '|' + (data.groups[userGroupId].resourceAt || 0)");
    expect(src).toContain('lastGroupPushKeyRef.current !== groupPushKey');
  });

  it('allowlists resourceAt as a Tier-1 leaf', () => {
    expect(src).toContain("'resourceAt',");
  });

  it('teacher-paced (sync) branch keeps continuous-lock semantics (no dedup key)', () => {
    // The sync branch resolves the class/group target and follows it while
    // locked; only the async branch uses the consume-once key.
    const syncIdx = src.indexOf("if (data.mode === 'sync' && data.currentResourceId)");
    expect(syncIdx).toBeGreaterThan(-1);
    const asyncIdx = src.indexOf('const groupPushKey =');
    expect(asyncIdx).toBeGreaterThan(syncIdx);
  });
});
