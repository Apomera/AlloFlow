import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = file => readFileSync(resolve(ROOT, file), 'utf8');
const source = read('view_assignment_center_source.jsx');
const moduleCode = read('view_assignment_center_module.js');
const host = read('AlloFlowANTI.txt');
const build = read('build.js');
const builder = read('_build_view_assignment_center_module.js');

function loadApi() {
  const React = {
    Fragment: Symbol('Fragment'),
    useRef: current => ({ current }),
    useEffect: () => {},
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  const window = { React, AlloModules: {}, AlloIcons: {} };
  const context = {
    window,
    React,
    console,
    document: { activeElement: null },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Number,
    String,
  };
  vm.runInNewContext(moduleCode, context, { filename: 'view_assignment_center_module.js' });
  return window.AlloModules.AssignmentCenter;
}

describe('Assignment Center safe view extraction', () => {
  it('registers exactly the intended presentation API', () => {
    const api = loadApi();
    expect(Object.keys(api)).toEqual(['AssignmentCenterModal']);
    expect(typeof api.AssignmentCenterModal).toBe('function');
  });

  it('renders from sanitized display rows without running effects or controllers', () => {
    const api = loadApi();
    const row = {
      viewKey: 'assignment-1',
      title: 'Biology week 2',
      lifecycle: 'active',
      resourceCount: 2,
      hasSharedActivity: true,
      activityType: 'survey',
      activityState: 'ready',
      participantCount: 4,
      pendingCount: 1,
      approvedCount: 2,
      hiddenCount: 1,
      linkLabel: 'Private assignment link',
      onManage: () => {},
      onCopyLink: () => {},
      onRemoveRecord: () => {},
    };
    const tree = api.AssignmentCenterModal({ isOpen: true, rowViews: [row] });
    expect(tree.type).toBe('div');
    const rendered = JSON.stringify(tree);
    expect(rendered).toContain('Share & Collect');
    expect(rendered).toContain('Biology week 2');
    expect(rendered).toContain('Private assignment link');
    expect(rendered).not.toMatch(/packSecret|packId|researchMeta|mailbox admin/i);
  });

  it('keeps credentials, raw records, persistence, AI, and network work outside the module', () => {
    for (const forbiddenIdentifier of [
      'mbConfig',
      'admin',
      'packSecret',
      'packId',
      'researchMeta',
      'recentQrShares',
      'assignmentCenterActionByUrl',
      'createHomeworkAssignmentLink',
      'extendAssignmentCenterShare',
      'duplicateAssignmentCenterShare',
      'revokeHomeworkAssignment',
    ]) {
      expect(source, forbiddenIdentifier).not.toMatch(new RegExp(`\\b${forbiddenIdentifier}\\b`));
    }
    expect(source).not.toMatch(/\b(?:fetch|safeGetItem|safeSetItem)\s*\(|\blocalStorage\b|\bsessionStorage\b|_alloMailbox|callGemini/);
    expect(source).not.toContain('view.url');
    expect(source).toContain('rowViews must contain display-only fields plus callback closures');
    expect(source).toContain('value={view.linkLabel ||');
    expect(source).toContain('typeof view.onCopyLink');
    expect(source).toContain('typeof view.onRevoke');
    expect(source).toContain('surveyHostingAvailable');
    expect(source).toContain('hostedMutationAvailable');
  });

  it('removes the large view body while retaining stateful host controllers', () => {
    for (const shell of [
      host,
      read('desktop/web-app/src/AlloFlowANTI.txt'),
      read('desktop/web-app/src/App.jsx'),
    ]) {
      expect(shell).toContain('<AssignmentCenterModal');
      expect(shell).not.toContain('id="activity-setup-title"');
      expect(shell).not.toContain('data-assignment-lifecycle={row.lifecycle}');
      expect(shell).toContain('const suggestPollTimes = useCallback');
      expect(shell).toContain('const refreshAssignmentCenter = useCallback');
      expect(shell).toContain('const importSurveyShareToResearchSuite = useCallback');
      expect(shell).toContain('const extendAssignmentCenterShare = useCallback');
      expect(shell).toContain('const duplicateAssignmentCenterShare = useCallback');
      expect(shell).toContain('const revokeHomeworkAssignment = useCallback');
    }
  });

  it('passes a deliberately narrow host contract instead of raw privileged state', () => {
    const seamStart = host.indexOf('{showRecentQrShares && <AssignmentCenterModal');
    const seamEnd = host.indexOf('{qrShareModal && (', seamStart);
    const seam = host.slice(seamStart, seamEnd);
    expect(seamStart).toBeGreaterThan(0);
    expect(seamEnd).toBeGreaterThan(seamStart);
    expect(seam).toContain('rowViews={assignmentCenterRowViews}');
    expect(seam).toContain('showSurveyPairingGuidance={assignmentCenterActivityView.showSurveyPairingGuidance}');
    expect(seam).toContain('mailboxVersion={Math.max(0, Math.min(999');
    expect(seam).not.toMatch(/\b(?:mbConfig|sharedAssignmentActivity|assignmentCenterRows|recentQrShares)=\{/);
    expect(seam).not.toMatch(/\b(?:packSecret|packId|researchMeta|admin)=\{/);
    expect(host).not.toContain('linkLabel: share.url');
    expect(host).toContain('showSurveyPairingGuidance: !!draft._researchMeta');
  });

  it('loads only when Share & Collect is requested', () => {
    expect(host).toContain("loadModule('AssignmentCenter', 'https://alloflow-cdn.pages.dev/view_assignment_center_module.js");
    expect(host).toContain('window.__alloLazyAssignmentCenter');
    const core = host.match(/const CORE_BOOT_MODULES = \[([^\]]+)\]/)?.[1] || '';
    expect(core).not.toContain('AssignmentCenter');
  });

  it('is build-managed and keeps generated deploy mirrors byte-identical', () => {
    expect(build).toContain("name: 'AssignmentCenter'");
    expect(build).toContain("filename: 'view_assignment_center_module.js'");
    expect(build).toContain("buildAssignmentCenterModule(src)");
    expect(builder).toContain("SOURCE = path.join(ROOT, 'view_assignment_center_source.jsx')");
    expect(builder).toContain("OUTPUT = path.join(ROOT, 'view_assignment_center_module.js')");
    expect(read('desktop/web-app/public/view_assignment_center_module.js')).toBe(moduleCode);
  });
});
