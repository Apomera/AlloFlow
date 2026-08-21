import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const host = read('AlloFlowANTI.txt');
const renderer = read('view_renderers_source.jsx');
const rules = read('firestore.rules');
const mailbox = read('apps_script/session_mailbox/Code.gs');

describe('visual organizer live activity contract', () => {
  it('binds every arm to one activity and exact organizer resource', () => {
    expect(host).toContain('let interactiveOrganizer = type ? { type, activityId, resourceId, resourceRevision, structureType, armedAt } : null;');
    expect(host).toContain("if (remote.resourceId && String(generatedContent?.id || '') !== String(remote.resourceId)) return;");
    expect(host).toContain("if (remote.structureType && String(generatedContent?.data?.structureType || '') !== String(remote.structureType)) return;");
    expect(host).toContain("if (remote.resourceRevision && getLiveOrganizerResourceRevision(generatedContent) !== String(remote.resourceRevision)) return;");
    expect(host).toContain("const organizerResourceId = String(data.interactiveOrganizer?.resourceId || '');");
    expect(host).toContain('else if (data.mode === \'sync\' && data.currentResourceId)');
  });

  it('rejects stale same-id resources and organizer/activity type mismatches', () => {
    expect(host).toContain('const LIVE_ORGANIZER_STRUCTURE_TYPES = Object.freeze({');
    for (const type of ['venn', 'tchart', 'cesort', 'pipeline', 'conceptmap', 'outline', 'fishbone', 'problemsolution', 'frayer', 'seethinkwonder', 'storymap', 'strandchallenge3d', 'conceptrecall3d', 'palacerecall']) {
      expect(host).toContain(`${type}: new Set(`);
    }
    expect(host).toContain('const getLiveOrganizerResourceRevision = (resource) => {');
    expect(host).toContain('const getLiveOrganizerReadiness = (type, resource) => {');
    expect(host).toContain("throw new Error('The latest organizer changes are still syncing. Wait a moment and try again.')");
    expect(host).toContain('currentGenContentRevisionRef.current !== organizerResourceRevision');
    expect(host).toContain('const organizerResourceIsCurrent = !!organizerResource');
  });

  it('keeps malformed arms retryable until their resource and game data are ready', () => {
    const readinessAt = host.indexOf('if (!getLiveOrganizerReadiness(remote.type, generatedContent).ok) return;');
    const vennReadyAt = host.indexOf('if (!isPlayableInteractiveVennData(syncedGameData)) return;', readinessAt);
    const consumedAt = host.indexOf('lastSeenInteractiveArmRef.current = remote.armedAt;', readinessAt);
    expect(readinessAt).toBeGreaterThan(0);
    expect(vennReadyAt).toBeGreaterThan(readinessAt);
    expect(consumedAt).toBeGreaterThan(vennReadyAt);
  });

  it('does not claim a launch or stop until the shared write succeeds', () => {
    expect(host).toContain("setInteractiveOrganizerSync({ status: type ? 'starting' : 'stopping'");
    expect(host).toContain("await window.__alloWriteToSession(sessionRef, { interactiveOrganizer });");
    expect(host).toContain("setInteractiveOrganizerSync({ status: 'live', type, activityId, error: null });");
    expect(host).toContain('The activity could not be stopped and remains live. Please try again.');
    expect(renderer).not.toMatch(/setIsInteractive[A-Za-z]+\(true\);[^\n]{0,120}_broadcastInteractiveOrganizer\('/);
  });

  it('reports privacy-safe loading, ready, failed, and completion receipts to the teacher dock', () => {
    expect(host).toContain("writeInteractiveOrganizerLaunchStatus('loading')");
    expect(host).toContain("writeInteractiveOrganizerLaunchStatus('ready')");
    expect(host).toContain("writeInteractiveOrganizerLaunchStatus('failed')");
    expect(host).toContain("[`roster.${user.uid}.organizerProgress`]: receipt");
    expect(host).toContain("status: isAttempt ? 'attempted' : 'complete'");
    expect(host).toContain("'Organizer ready'");
    expect(host).toContain("'Organizer failed to open'");
    expect(host).toContain("'Organizer working'");
    expect(host).toContain("'organizerProgress',");
  });

  it('keeps launch receipts monotonic and times out unresolved resource delivery', () => {
    const effectAt = host.indexOf('if (!remote || !remote.type) {', host.indexOf('writeInteractiveOrganizerLaunchStatus'));
    const alreadyOpenedAt = host.indexOf('if (remote.armedAt === lastSeenInteractiveArmRef.current) return;', effectAt);
    const loadingAt = host.indexOf("writeInteractiveOrganizerLaunchStatus('loading');", effectAt);
    const resourceCheckAt = host.indexOf("if (remote.resourceId && String(generatedContent?.id || '') !== String(remote.resourceId)) return;", effectAt);
    expect(alreadyOpenedAt).toBeGreaterThan(effectAt);
    expect(loadingAt).toBeGreaterThan(alreadyOpenedAt);
    expect(resourceCheckAt).toBeGreaterThan(loadingAt);
    expect(host.slice(loadingAt, resourceCheckAt)).toContain('timeout: setTimeout(() => handleInteractiveOrganizerFailed(), 16000)');
  });

  it('uses the session envelope as the only teacher live-state authority', () => {
    expect(host).toContain('const _setOnlyInteractiveOrganizer = (type = null) => {');
    expect(host).toContain('_setOnlyInteractiveOrganizer(remote.type);');
    expect(host).toContain('_setOnlyInteractiveOrganizer(null);');
    expect(renderer).toContain('const LiveOrganizerStatus = ({ type }) => {');
    expect(renderer).toContain('Stop for students');
    expect(host).toContain('Teacher preview closed. The activity is still live for students');
  });

  it('keeps the running organizer observable and stoppable from the global live dashboard', () => {
    expect(host).toContain('const summarizeLiveOrganizerProgress = ({ roster, interactiveOrganizer } = {}) => {');
    expect(host).toContain('const liveOrganizerSummary = summarizeLiveOrganizerProgress({ roster: rosterEntries, interactiveOrganizer: liveOrganizer });');
    expect(host).toContain('Live organizer activity');
    expect(host).toContain('Student activity launch summary');
    expect(host).toContain('handleRestoreView(organizerResource, { suppressLiveFollow: true });');
    expect(host).toContain("onClick={() => broadcastInteractiveOrganizer(null)}");
    for (const status of ['complete', 'attempted', 'ready', 'working', 'loading', 'failed', 'pending']) {
      expect(host).toContain(`{ key: '${status}'`);
    }
  });

  it('aggregates only current-activity receipts and treats stale or missing receipts as waiting', () => {
    const extractConstFunction = (name, nextName) => {
      const start = host.indexOf(`const ${name} =`);
      const end = host.indexOf(`const ${nextName} =`, start);
      expect(start).toBeGreaterThan(0);
      expect(end).toBeGreaterThan(start);
      return host.slice(start, end);
    };
    const normalizeSource = extractConstFunction('normalizeLiveOrganizerProgress', 'summarizeLiveOrganizerProgress');
    const summarizeSource = extractConstFunction('summarizeLiveOrganizerProgress', 'mergeLiveQuizEvidenceResponse');
    const summarize = new Function(
      'LIVE_ORGANIZER_TYPES',
      'LIVE_ORGANIZER_GAME_TYPES',
      `${normalizeSource}\n${summarizeSource}\nreturn summarizeLiveOrganizerProgress;`,
    )(new Set(['tchart']), { tchart: new Set(['tchartSort']) });
    const activityId = 'organizer:test:tchart:current';
    const receipt = status => ({ activityId, type: 'tchart', gameType: null, status, score: 0, correct: 0, total: 0, attempts: 0, at: 10 });
    expect(summarize({
      interactiveOrganizer: { activityId },
      roster: {
        ready: { organizerProgress: receipt('ready') },
        complete: { organizerProgress: receipt('complete') },
        failed: { organizerProgress: receipt('failed') },
        stale: { organizerProgress: { ...receipt('ready'), activityId: 'organizer:test:tchart:old' } },
        missing: {},
      },
    })).toEqual({ total: 5, pending: 2, loading: 0, ready: 1, failed: 1, working: 0, attempted: 0, complete: 1 });
  });

  it('remotely arms 3D Concept Recall separately from Strand Challenge', () => {
    expect(host).toContain("conceptrecall3d: new Set(['conceptRecall', 'conceptRecallAttempt'])");
    expect(host).toContain('conceptrecall3d: setIsInteractiveConceptRecall3d');
    expect(renderer).toContain("_broadcastInteractiveOrganizer('conceptrecall3d')");
    expect(renderer).toContain('recallArmed={!!isInteractiveConceptRecall3d}');
    expect(renderer).toContain('if (recallArmed && !isTeacherMode && !recall');
  });

  it('uses the authoritative readiness contract in Memory Palace and both 3D Concept Space launches', () => {
    expect(host).toContain('getLiveOrganizerReadiness,\n        handleInteractiveOrganizerReady');
    expect(renderer).toContain("liveRecallReadiness={_liveReadinessFor('palacerecall')}");
    expect(renderer).toContain("challengeLiveReadiness={_liveReadinessFor('strandchallenge3d')}");
    expect(renderer).toContain("recallLiveReadiness={_liveReadinessFor('conceptrecall3d')}");
    expect(renderer).toContain('challengeLiveReadiness?.ok === false');
    expect(renderer).toContain('recallLiveReadiness?.ok === false');
    expect(renderer).toContain('liveRecallReadiness?.ok === false');
    expect(renderer).toContain('Strand Challenge: {challengeLiveReadiness.message}');
    expect(renderer).toContain('Concept Recall: {recallLiveReadiness.message}');
    expect(renderer).toContain('Recall walk: {liveRecallReadiness.message}');
  });

  it('uses the authoritative readiness contract for every 2D organizer launch control', () => {
    expect(renderer).toContain('const activityTypeByStructure = {');
    expect(renderer).toContain('const organizerLaunchReadiness = organizerActivityType ? _liveReadinessFor(organizerActivityType) : { ok: true };');
    expect(renderer).toContain('const _startOrganizerGame = (activityType, startLocal, activityConfig = null) => {');
    expect(renderer).toContain('id="game-btn-readiness" role="status"');
    expect(renderer.match(/disabled=\{!organizerLaunchReadiness\.ok\}/g)).toHaveLength(11);
    for (const type of ['pipeline', 'tchart', 'fishbone', 'problemsolution', 'conceptmap', 'frayer', 'seethinkwonder', 'storymap', 'outline']) {
      expect(renderer).toContain(`_startOrganizerGame('${type}'`);
      expect(renderer).not.toContain(`_broadcastInteractiveOrganizer('${type}')`);
    }
    expect(renderer.match(/_startOrganizerGame\('cesort'/g)).toHaveLength(2);
    expect(renderer).not.toContain("_broadcastInteractiveOrganizer('cesort')");
  });

  it('shape-validates receipts on Firebase and Class Mailbox paths', () => {
    expect(rules).toContain('function validOrganizerProgress(progress)');
    expect(rules).toContain("'organizerProgress' in request.resource.data");
    expect(mailbox).toContain('function validOrganizerProgressValue(value)');
    expect(mailbox).toContain("if (field === 'organizerProgress') return validOrganizerProgressValue(value);");
    expect(mailbox).toContain('organizerProgress: 1');
  });
});
