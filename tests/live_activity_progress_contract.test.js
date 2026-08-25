import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const shell = read('AlloFlowANTI.txt');
const live = read('live_polling_module.js');
const mailbox = read('apps_script/session_mailbox/Code.gs');
const rules = read('firestore.rules');

describe('Universal live activity progress contract', () => {
  it('uses one fixed content-free receipt through resource, Word Sounds, and organizer writers', () => {
    expect(shell).toContain("const normalizeLiveActivityProgress = (value) =>");
    expect(shell).toContain("'activityProgress',");
    expect(shell).toContain("sync:REFUSED-invalid-activity-progress");
    expect(shell).toContain("kind: 'resource'");
    expect(shell).toContain("kind: 'word_sounds'");
    expect(shell).toContain("kind: 'visual_organizer'");
    expect(shell).toContain('canWriteLiveActivityProgress()');
    expect(shell).not.toMatch(/activityProgress[^\n]*(?:prompt|answer|draft|screen)/);
  });

  it('fails closed in Firebase and Class Mailbox with matching field and status bounds', () => {
    expect(mailbox).toContain('var VERSION = 19;');
    expect(mailbox).toContain('function validActivityProgressValue(value)');
    expect(mailbox).toContain("if (field === 'activityProgress') return validActivityProgressValue(value);");
    expect(mailbox).toContain('activityProgress: 1');
    expect(rules).toContain('function validActivityProgress(progress)');
    expect(rules).toContain("'activityProgress' in request.resource.data");
    for (const status of ['waiting', 'loading', 'ready', 'working', 'opened', 'attempted', 'submitted', 'revised', 'complete', 'failed', 'paused']) {
      expect(mailbox).toContain(`'${status}'`);
      expect(rules).toContain(`'${status}'`);
    }
  });
});

describe('Live Command Center UX contract', () => {
  it('provides responsive panes, actionable engagement filters, selection, and refresh recovery', () => {
    expect(live).toContain('live-command-center-body');
    expect(live).toContain('@media (min-width:1120px)');
    expect(live).toContain("setStudentActivityFilter(metric.id)");
    expect(live).toContain('selectedStudentActivityUids');
    expect(live).toContain('sendCheckInToSelectedStudents');
    expect(live).toContain('sendResourceToSelectedStudents');
    expect(live).toContain('writeLiveCommandCenterRecovery');
    expect(live).toContain('LIVE_COMMAND_CENTER_RECOVERY_MAX_AGE_MS');
  });

  it('tells students exactly what is visible and explicitly excludes screen monitoring', () => {
    expect(live).toContain('What my teacher can see');
    expect(live).toContain('Activity visible · screen private');
    expect(live).toContain('Your screen, other tabs, and unsent drafts are not shared.');
    expect(live).toContain('not a live screen');
  });
});
