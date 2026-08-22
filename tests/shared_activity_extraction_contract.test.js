import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = file => readFileSync(resolve(ROOT, file), 'utf8');
const source = read('shared_activity_source.jsx');
const moduleCode = read('shared_activity_module.js');
const host = read('AlloFlowANTI.txt');

function runtime() {
  const React = {
    Fragment: Symbol('Fragment'),
    memo: fn => fn,
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: current => ({ current }),
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useEffect: () => {},
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  const window = { React, AlloModules: {} };
  const context = { window, console, document: { hidden: false }, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, setTimeout, clearTimeout, Date, JSON };
  vm.runInNewContext(moduleCode, context, { filename: 'shared_activity_module.js' });
  return { React, window, api: window.AlloModules.SharedActivity };
}

function hostFallbacks() {
  const start = host.indexOf('const _alloSharedActivityModule =');
  const end = host.indexOf('const SharedAssignmentActivityPanel = React.memo', start);
  if (start < 0 || end < 0) throw new Error('SharedActivity host fallback markers missing');
  const window = { AlloModules: {} };
  return new Function('window', `${host.slice(start, end)}\nreturn {
    normalizeRatingActivity: _alloNormalizeSharedRatingActivity,
    activityUiMeta: _alloSharedActivityUiMeta,
    assignmentCenterActivityStatus: _alloAssignmentCenterActivityStatus,
    buildAssignmentCenterRows: _alloBuildAssignmentCenterRows,
    filterAssignmentCenterRows: _alloFilterAssignmentCenterRows,
    buildAssignmentCenterCsv: _alloBuildAssignmentCenterCsv,
    nextSummaryOrder: _alloNextSharedActivitySummaryOrder,
  };`)(window);
}

describe('SharedActivity extraction contract', () => {
  it('registers the complete runtime API from the generated module', () => {
    const { api } = runtime();
    expect(Object.keys(api).sort()).toEqual([
      'AlloQuestionBoardPanel', 'SharedAssignmentActivityPanel', 'activeCredential',
      'activityUiMeta', 'assignmentCenterActivityStatus', 'buildAssignmentCenterCsv',
      'buildAssignmentCenterRows', 'buildAssignmentPackEncoded', 'credentialRoster', 'credentialSlotKey',
      'credentialStoreWith', 'filterAssignmentCenterRows', 'nextSummaryOrder',
      'normalizeCredentialStore', 'normalizeRatingActivity',
    ].sort());
  });

  it('builds assignment packets through host-injected safety and encoding boundaries', async () => {
    const { api } = runtime();
    const toasts = [];
    const stripUndefined = value => {
      if (Array.isArray(value)) return value.map(stripUndefined);
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)]));
    };
    const dependencies = {
      resolveAssignmentResources: resourceIds => resourceIds.map(id => ({ id, type: 'analysis', title: 'Source analysis' })),
      sharedAssignmentActivity: {
        enabled: true,
        type: 'availability',
        prompt: 'When can we meet?',
        identityMode: 'named',
        optionsText: 'Tuesday x 2\nWednesday',
      },
      addToast: (message, kind) => toasts.push([message, kind]),
      sourceTopic: 'Cell biology',
      generatedContent: { title: 'Generated fallback' },
      homeworkExpiryDays: 5,
      serializeResourceForStudentPack: item => ({ id: item.id, type: item.type, title: item.title }),
      stripUndefined,
      generateUUID: () => 'fixed-id',
      studentAiPolicyForShare: 'student-byok',
      workStoryEnabled: true,
      encodeAlloPack: async json => json,
    };

    const built = await api.buildAssignmentPackEncoded({ includeSharedActivity: true, resourceIds: ['resource-1'] }, dependencies);
    const packet = JSON.parse(built.encoded);
    expect(toasts).toEqual([]);
    expect(built.count).toBe(1);
    expect(built.resourceTitles).toEqual(['Source analysis']);
    expect(packet).toMatchObject({
      v: 1,
      kind: 'assignment',
      title: 'Source analysis',
      currentResourceId: 'resource-1',
      workStory: true,
      aiPolicy: { studentAi: 'student-byok', defaultStudentAi: 'off', teacherPrepared: true },
    });
    expect(packet.sharedActivities[0]).toMatchObject({
      activityId: 'AC-fixed-id',
      type: 'availability',
      identityMode: 'named',
      options: [
        { id: 'o1', label: 'Tuesday', capacity: 2 },
        { id: 'o2', label: 'Wednesday', capacity: 1 },
      ],
    });
    expect(packet.sharedActivities[0].closesAt).toBe(packet.expiresAt);
  });

  it('preserves activity-only links and refuses a truly empty packet', async () => {
    const { api } = runtime();
    const toasts = [];
    const common = {
      resolveAssignmentResources: () => [],
      addToast: (message, kind) => toasts.push([message, kind]),
      serializeResourceForStudentPack: item => item,
      stripUndefined: value => value,
      generateUUID: () => 'activity-only',
      encodeAlloPack: async json => json,
    };
    const activityOnly = await api.buildAssignmentPackEncoded({ includeSharedActivity: true }, {
      ...common,
      sharedAssignmentActivity: { enabled: true, type: 'word_cloud', prompt: 'One word for today' },
    });
    expect(activityOnly.title).toBe('One word for today');
    expect(activityOnly.count).toBe(0);
    expect(JSON.parse(activityOnly.encoded).currentResourceId).toBeNull();

    const empty = await api.buildAssignmentPackEncoded({}, {
      ...common,
      sharedAssignmentActivity: { enabled: false },
    });
    expect(empty).toBeNull();
    expect(toasts.at(-1)).toEqual([
      'Create or restore a teacher resource before making a homework link, or add a shared activity to send on its own.',
      'info',
    ]);
  });

  it('preserves survey wire shaping and its fail-closed authoring checks', async () => {
    const { api } = runtime();
    const toasts = [];
    const stripUndefined = value => {
      if (Array.isArray(value)) return value.map(stripUndefined);
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)]));
    };
    const common = {
      resolveAssignmentResources: () => [{ id: 'survey-source', type: 'analysis', title: 'Survey source' }],
      addToast: (message, kind) => toasts.push([message, kind]),
      serializeResourceForStudentPack: item => item,
      stripUndefined,
      generateUUID: () => 'survey-id',
      encodeAlloPack: async json => json,
    };
    const survey = {
      enabled: true,
      type: 'survey',
      prompt: 'Exit survey',
      identityMode: 'anonymous',
      surveyInfo: 'Answer after class.',
      surveyItems: [
        { type: 'likert', text: 'I can explain it.', steps: 3, lowLabel: 'Not yet', highLabel: 'Yes' },
        { type: 'choice', text: 'Choose one.', optionsText: 'Alpha\nBeta' },
        { type: 'numeric', text: 'Confidence', min: 0, max: 10 },
      ],
    };
    const built = await api.buildAssignmentPackEncoded({ includeSharedActivity: true }, {
      ...common,
      sharedAssignmentActivity: survey,
    });
    const activity = JSON.parse(built.encoded).sharedActivities[0];
    expect(activity).toMatchObject({
      type: 'survey',
      identityMode: 'anonymous',
      info: 'Answer after class.',
      items: [
        { type: 'likert', text: 'I can explain it.', steps: 3, labels: ['Not yet', '', 'Yes'] },
        { type: 'choice', text: 'Choose one.', options: [{ label: 'Alpha' }, { label: 'Beta' }] },
        { type: 'numeric', text: 'Confidence', min: 0, max: 10 },
      ],
    });

    expect(await api.buildAssignmentPackEncoded({ includeSharedActivity: true }, {
      ...common,
      sharedAssignmentActivity: { ...survey, surveyItems: [] },
    })).toBeNull();
    expect(toasts.at(-1)).toEqual(['Add at least one survey question first.', 'info']);

    expect(await api.buildAssignmentPackEncoded({ includeSharedActivity: true }, {
      ...common,
      sharedAssignmentActivity: { ...survey, identityMode: '' },
    })).toBeNull();
    expect(toasts.at(-1)).toEqual(['Pick who is answering before you share this survey.', 'info']);
  });

  it('renders the activity surface without running effects or contacting the mailbox', () => {
    const { api } = runtime();
    const tree = api.SharedAssignmentActivityPanel({
      activity: { type: 'rating', activityId: 'rate-1', prompt: 'How ready are you?', minValue: 1, maxValue: 5 },
      mailbox: { id: 'pack-1', url: 'https://example.invalid', secret: 'not-used-during-render' },
      mode: 'student',
    });
    expect(tree.type).toBe('section');
    expect(tree.props['aria-label']).toBe('Shared class rating');
    expect(JSON.stringify(tree)).toContain('How ready are you?');
  });

  it('keeps hard-timeout pure fallbacks behaviorally aligned with the CDN API', () => {
    const remote = runtime().api;
    const local = hostFallbacks();
    const rating = { type: 'rating', minValue: 2, maxValue: 7, labels: [' Low ', '', '', '', '', 'High'] };
    expect(local.normalizeRatingActivity(rating)).toEqual(remote.normalizeRatingActivity(rating));
    expect(local.activityUiMeta({ type: 'question_board' })).toEqual(remote.activityUiMeta({ type: 'question_board' }));
    const summary = { participantCount: 4, responses: [{ status: 'pending', uid: 'private' }, { status: 'approved', text: 'private' }], revealed: true, updatedAt: 123 };
    expect(local.assignmentCenterActivityStatus(summary)).toEqual(remote.assignmentCenterActivityStatus(summary));
    const shares = [{ url: 'a', createdAt: '2026-08-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', title: '=FORMULA' }];
    const localRows = local.buildAssignmentCenterRows(shares, {}, Date.parse('2026-08-12T00:00:00Z'));
    const remoteRows = remote.buildAssignmentCenterRows(shares, {}, Date.parse('2026-08-12T00:00:00Z'));
    expect(localRows).toEqual(remoteRows);
    expect(local.buildAssignmentCenterCsv(localRows)).toBe(remote.buildAssignmentCenterCsv(remoteRows));
    const result = { version: 3 };
    expect(local.nextSummaryOrder(null, result, 2, 'a:b', 'a:b')).toEqual(remote.nextSummaryOrder(null, result, 2, 'a:b', 'a:b'));
  });

  it('keeps only resilient bridges in every host shell', () => {
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const shell = read(file);
      expect(shell, file).toContain("loadModule('SharedActivity'");
      expect(shell, file).toContain("'SharedActivity', 'LaunchPadView'");
      expect(shell, file).toContain('Shared activity tools are still loading.');
      expect(shell, file).toContain('Retry loading');
      expect(shell, file).toContain('api.buildAssignmentPackEncoded(options, {');
      expect(shell, file).toContain('serializeResourceForStudentPack: _alloSerializeResourceForStudentPack');
      expect(shell, file).not.toContain('const AlloQuestionBoardPanel = React.memo(');
      expect(shell, file).not.toContain('const callStudentUpdate = React.useCallback(');
      expect(shell, file).not.toContain('function alloNormalizeCredentialStore(');
      expect(shell, file).not.toContain('const activityOnly = includeSharedActivity');
    }
  });

  it('is build-managed and root/public module bytes match', () => {
    expect(read('build.js')).toContain("filename: 'shared_activity_module.js'");
    expect(read('build.js')).toContain("require('./_build_shared_activity_module.js').buildSharedActivityModule(src)");
    expect(read('desktop/web-app/public/shared_activity_module.js')).toBe(moduleCode);
    expect(source).toContain('window.AlloModules.SharedActivity = {');
    expect(source).toContain('async function _alloBuildAssignmentPackEncoded');
  });
});
