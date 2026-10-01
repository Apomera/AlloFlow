import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const readEvaluationSource = () => fs.readFileSync(path.join(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8').replace(/\r\n/g, '\n');
const readAppsScriptBuilder = () => fs.readFileSync(path.join(process.cwd(), '_build_educator_evaluation_apps_script.js'), 'utf8');

const evaluateSourceFunction = (source, name) => {
  const start = source.indexOf(`function ${name}(`);
  expect(start, `${name} should exist in educator_evaluation_source.jsx`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf('\n\nfunction ', start + 1);
  const declaration = source.slice(start, end < 0 ? source.length : end);
  return Function(`"use strict"; ${declaration}; return ${name};`)();
};

const readAsyncHandler = (source, name) => {
  const start = source.indexOf(`  const ${name} = async `);
  expect(start, `${name} should exist in educator_evaluation_source.jsx`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf('\n  const ', start + 1);
  expect(end, `${name} should be followed by another component handler or value`).toBeGreaterThan(start);
  return source.slice(start, end);
};

describe('educator evaluation operations UX hardening', () => {
  it('fails Authorized Exports reviews closed when the ACL envelope is missing or partial', () => {
    const source = readEvaluationSource();
    const validate = evaluateSourceFunction(source, 'aeValidAuthorizedExportsAclReview');
    const complete = {
      status: 'verified',
      inspectable: true,
      manualReviewRequired: false,
      folderDrift: false,
      fileCount: 2,
      driftedFileCount: 0,
      explicitAccessCount: 0,
    };

    expect(validate(null)).toBe(false);
    for (const field of Object.keys(complete)) {
      const partial = { ...complete };
      delete partial[field];
      expect(validate(partial), `missing ${field} must fail closed`).toBe(false);
    }
    expect(validate(complete)).toBe(true);
    expect(validate({ ...complete, inspectable: false })).toBe(true);
    expect(validate({ ...complete, manualReviewRequired: true })).toBe(true);

    expect(source).toContain('!review.token || !aeValidAuthorizedExportsAclReview(review.authorizedExportsAcl)');
    expect(source).toContain("'The private-export review was incomplete. Ask district IT to deploy the current portal and Apps Script package before confirming an export.'");
    expect(source).toContain('const exportAclBlocked = !exportAclReview || !aeValidAuthorizedExportsAclReview(exportAclReview) || exportAclReview.inspectable !== true || exportAclReview.manualReviewRequired !== false;');
    expect(source).toContain("exportState.status === 'performing' || !aeValidAuthorizedExportsAclReview(acl) || acl.inspectable !== true || acl.manualReviewRequired !== false");
    expect(source).toContain("checked={exportAck} disabled={exportAclBlocked || exportState.status === 'unconfirmed'}");
  });

  it('locks schedule and restore-rehearsal controls while performing or preserving exact recovery', () => {
    const source = readEvaluationSource();

    expect(source).toContain("if (reviewPreparationRef.current || ['reviewing', 'performing'].includes(scheduleState.status)) return;");
    expect(source).toContain("if (!scheduleState.review || !scheduleAck || scheduleState.status === 'performing') return;");
    expect(source).toContain("disabled={!scheduleAck || !scheduleState.review.affectedEducators || scheduleState.status === 'performing'}");
    expect(source).toContain('Applying reviewed schedule');
    expect(source).toContain("disabled={scheduleState.status === 'performing'} onClick={() => setScheduleState");

    expect(source).toContain("const loadArchives = async () => {\n    if (['loading', 'reviewing', 'performing', 'unconfirmed'].includes(archiveState.status)) return;");
    expect(source).toContain("if (reviewPreparationRef.current || ['loading', 'reviewing', 'performing', 'unconfirmed'].includes(archiveState.status)) return;");
    expect(source).toContain("if (!archiveState.review || !rehearsalAck || archiveState.status === 'performing') return;");
    expect(source).toContain("disabled={['loading', 'reviewing', 'performing', 'unconfirmed'].includes(archiveState.status)} onClick={loadArchives}");
    expect(source).toContain("disabled={!archive.verified || ['loading', 'reviewing', 'performing', 'unconfirmed'].includes(archiveState.status)}");
    expect(source).toContain("disabled={!rehearsalAck || archiveState.status === 'performing'}");
    expect(source).toContain('Creating private candidate');
    expect(source).toContain("disabled={['performing', 'unconfirmed'].includes(archiveState.status)} onClick={() => setArchiveState");
    expect(source).toContain("JSON.stringify({ kind: directoryReview.kind, candidate }) === directoryDraftFingerprint");
    expect(source).toContain('The directory draft changed, so its prior review was discarded.');
  });

  it('renders recovery-pending operations as warnings with explicit no-repeat guidance', () => {
    const source = readEvaluationSource();
    const recoveryPending = evaluateSourceFunction(source, 'aeOperationRecoveryPending');

    expect(recoveryPending(null)).toBe(false);
    expect(recoveryPending({ status: 'completed' })).toBe(false);
    expect(recoveryPending({ auditPending: true })).toBe(true);
    expect(recoveryPending({ recoveryPending: true })).toBe(true);
    expect(recoveryPending({ configurationPending: true })).toBe(true);
    expect(recoveryPending({ status: 'recovery_pending' })).toBe(true);
    expect(recoveryPending({ status: 'audit_recovery_pending' })).toBe(true);

    expect(source).toContain("directoryNotice.tone === 'warn' ? 'ae-warn' : 'ae-ok'");
    expect(source).toContain('Do not repeat the change.');
    expect(source).toContain("scheduleRecoveryPending ? 'ae-warn' : 'ae-ok'");
    expect(source).toContain('Do not apply the schedule again.');
    expect(source).toContain("exportRecoveryPending ? 'ae-warn' : 'ae-ok'");
    expect(source).toContain('Do not create another export.');
    expect(source).toContain('then select Check exact export outcome.');
    expect(source).toContain("rehearsalRecoveryPending ? 'ae-warn' : 'ae-ok'");
    expect(source).toContain('Do not create another candidate.');
    expect(source).toContain('then select Check exact candidate outcome.');
    expect(source).toContain('outcome could not be confirmed. Do not repeat the operation.');
    expect(source).toContain("aeUnconfirmedMutationMessage('Directory change', error)");
    expect(source).toContain("aeUnconfirmedMutationMessage('District configuration', error)");
    expect(source).toContain("aeUnconfirmedMutationMessage('Annual rollover', error)");
  });

  it('keeps review preparation retryable and reserves no-repeat guidance for mutating confirmations', () => {
    const source = readEvaluationSource();
    const definitelyNotStarted = evaluateSourceFunction(source, 'aeArtifactOperationDefinitelyNotStarted');
    expect(definitelyNotStarted(null)).toBe(false);
    expect(definitelyNotStarted({ ok: true, status: 'pending' })).toBe(false);
    expect(definitelyNotStarted({ ok: true, status: 'completed' })).toBe(false);
    expect(definitelyNotStarted({ ok: true, status: 'ambiguous' })).toBe(false);
    expect(definitelyNotStarted({ ok: true, status: 'not_started', reviewUsable: true })).toBe(false);
    expect(definitelyNotStarted({ ok: true, status: 'not_started', reviewUsable: false })).toBe(true);
    const canReset = evaluateSourceFunction(source, 'aeArtifactOperationCanReset');
    const evictedReceipt = { ok: true, status: 'not_started', reviewUsable: false };
    expect(canReset(false, evictedReceipt)).toBe(true);
    expect(canReset(true, evictedReceipt)).toBe(false);
    expect(canReset(false, { ok: true, status: 'pending' })).toBe(false);
    const reviewHandlers = ['beginScheduleReview', 'beginExportReview', 'reviewRehearsal'];
    reviewHandlers.forEach((name) => {
      const handler = readAsyncHandler(source, name);
      expect(handler, `${name} should use an ordinary retryable error state`).toContain("status: 'error'");
      expect(handler, `${name} should expose the preparation error`).toContain('error: String((error && error.message) || error)');
      expect(handler, `${name} must not warn that a read-only review may have mutated state`).not.toContain('aeUnconfirmedMutationMessage');
      expect(handler, `${name} must clear an incomplete review`).toContain('review: null');
    });

    const scheduleFailure = readAsyncHandler(source, 'confirmSchedule').slice(readAsyncHandler(source, 'confirmSchedule').indexOf('catch (error)'));
    expect(scheduleFailure).toContain("status: 'unconfirmed'");
    expect(scheduleFailure).toContain('review: null');
    expect(scheduleFailure).toContain('setScheduleAck(false)');
    expect(scheduleFailure).toContain("aeUnconfirmedMutationMessage('Schedule change', error)");

    [
      ['confirmExport', 'district_export', 'setExportAck(false)', 'setExportAck(true)', "aeRecoverableArtifactOutcomeMessage('Private export', error)"],
      ['createRehearsal', 'restore_rehearsal', 'setRehearsalAck(false)', 'setRehearsalAck(true)', "aeRecoverableArtifactOutcomeMessage('Restore rehearsal candidate', error)"],
    ].forEach(([name, kind, clearedAcknowledgement, retainedAcknowledgement, message]) => {
      const handler = readAsyncHandler(source, name);
      const failurePath = handler.slice(handler.indexOf('catch (error)'));
      expect(handler, `${name} should keep exact recovery available after a confirmed artifact returns with audit recovery pending`).toContain('const recoveryPending = aeOperationRecoveryPending(response)');
      expect(handler, `${name} should retain the reviewed token until the artifact journal is fully complete`).toContain("status: recoveryPending ? 'unconfirmed' : 'completed'");
      expect(handler, `${name} should capture whether this is an exact-recovery attempt before changing state`).toContain("const startedFromUnconfirmed = ");
      expect(handler, `${name} should capture the exact reviewed token before changing state`).toContain('const exactReview = ');
      expect(handler, `${name} should conditionally retain the exact reviewed token for recovery`).toContain('review: recoveryPending ? exactReview : null');
      expect(failurePath, `${name} should probe the exact reviewed operation`).toContain(`getArtifactOperationOutcome({ kind: '${kind}'`);
      expect(failurePath, `${name} should unlock only an initial confirmation with a conclusive safe result`).toContain('aeArtifactOperationCanReset(startedFromUnconfirmed, outcome)');
      expect(failurePath, `${name} should clear an unusable pre-intent review`).toContain("status: 'error', review: null, error: String((error && error.message) || error)");
      expect(failurePath, `${name} should clear its acknowledgement after definite non-start`).toContain(clearedAcknowledgement);
      expect(failurePath, `${name} should mark every non-conclusive response as unconfirmed`).toContain("status: 'unconfirmed'");
      expect(failurePath, `${name} should retain the exact review when an aged receipt disappears`).toContain("review: exactReview");
      expect(failurePath, `${name} should retain its acknowledgement for exact replay`).toContain(retainedAcknowledgement);
      expect(failurePath, `${name} should offer safe exact-operation recovery`).toContain(message);
      expect(failurePath, `${name} should direct aged-receipt recovery to manual exact-artifact inspection`).toContain("startedFromUnconfirmed && aeArtifactOperationDefinitelyNotStarted(outcome) ? aeArtifactReceiptUnavailableMessage");
    });
    expect(readAppsScriptBuilder()).toContain("getArtifactOperationOutcome: (request) => callPortalAdminRpc('getPortalArtifactOperationOutcome', request)");
    expect(source).toContain('Select the same confirmation again to check and recover this exact reviewed operation');
    expect(source).toContain('exact recovery receipt is no longer available. Keep this reviewed operation locked');
    expect(source).toContain('Run Setup health and ask district IT to inspect the exact private artifact destination and audit ledger');
    expect(source).toContain('Check exact export outcome');
    expect(source).toContain('Check exact candidate outcome');
    expect(source).toContain("['loading', 'reviewing', 'performing', 'unconfirmed'].includes(archiveState.status)");
    expect(source).toContain("checked={exportAck} disabled={exportAclBlocked || exportState.status === 'unconfirmed'}");
    expect(source).toContain("disabled={['performing', 'unconfirmed'].includes(exportState.status)} onClick={() => setExportState");
    expect(source).toContain("checked={rehearsalAck} disabled={['performing', 'unconfirmed'].includes(archiveState.status)}");
    expect(source).toContain("disabled={['performing', 'unconfirmed'].includes(archiveState.status)} onClick={() => setArchiveState");
    expect(source).toContain("['Private artifact recovery', checks.artifactRecoveryManualRequired");
    expect(source).toContain('use Check exact outcome with the retained review');
  });

  it('prevents ledger and released-access recovery confirmations from racing each other', () => {
    const source = readEvaluationSource();

    expect(source).toContain("!state.acknowledged || accessBusy || ['running', 'reviewing', 'reconciling'].includes(state.status)");
    expect(source).toContain("!accessState.acknowledged || accessBusy || ['running', 'reviewing', 'reconciling'].includes(state.status)");
    expect(source).toContain("busy={accessState.status === 'reconciling' || ['running', 'reviewing', 'reconciling'].includes(state.status)}");
    expect(source).toContain("busy={state.status === 'reconciling' || accessBusy}");
    expect(source).toContain("const busy = ['running', 'reviewing', 'reconciling'].includes(state.status) || accessBusy;");
    expect(source).toContain("aria-busy={['reviewing', 'performing'].includes(state.status) ? 'true' : undefined}");
    expect(source).toContain("aria-busy={['reviewing', 'performing', 'reconciling'].includes(state.status) ? 'true' : undefined}");
    expect(source).toContain("'orphanQueueItems', 'orphanCandidates', 'orphanManualReviewCandidates'");
    expect(source).toContain("'Reviewed quarantine candidates'");
  });

  it('hands focus to each new operations review once and removes unavailable remote panels from interaction', () => {
    const source = readEvaluationSource();

    expect(source).toContain("const focusedReviewTokensRef = React.useRef({ directory: '', schedule: '', export: '', rehearsal: '' });");
    expect(source).toContain('const reviewPreparationRef = React.useRef(false);');
    expect(source.match(/if \([^\n]*reviewPreparationRef\.current[^\n]*\) return;/g)).toHaveLength(4);
    expect(source.match(/finally \{ reviewPreparationRef\.current = false;/g)).toHaveLength(4);
    expect(source).toContain("const reviewPreparationBusy = (directoryBusy && !directoryReview) || scheduleState.status === 'reviewing'");
    expect(source).toContain('<fieldset data-testid="ae-operations-body" disabled={reviewPreparationBusy}');
    expect(source).toContain("aria-disabled={reviewPreparationBusy ? 'true' : undefined}");
    expect(source).not.toContain('inert={operationsBusy');
    expect(source).toContain("if (!exactToken || focusedReviewTokensRef.current[kind] === exactToken) return;");
    expect(source).toContain('focusedReviewTokensRef.current[kind] = exactToken;');
    expect(source).toContain("if (!heading || typeof heading.focus !== 'function') return;");
    expect(source).toContain("heading.closest('details')");
    expect(source).toContain('if (disclosure && !disclosure.open) disclosure.open = true;');
    expect(source).toContain('}, [directoryReviewToken, scheduleReviewToken, exportReviewToken, rehearsalReviewToken]);');
    [
      'directoryReviewHeadingRef',
      'scheduleReviewHeadingRef',
      'exportReviewHeadingRef',
      'rehearsalReviewHeadingRef',
    ].forEach((refName) => {
      expect(source).toContain(`<h4 ref={${refName}} className="ae-review-heading" tabIndex={-1}>`);
    });
    expect(source).toContain("const remotePanelUnavailable = isRemote && ['error', 'conflict'].includes(remoteState.status);");
    expect(source).toContain("aria-disabled={remotePanelUnavailable ? 'true' : undefined} inert={remotePanelUnavailable ? '' : undefined}");
    expect(source).toContain('onClickCapture={blockRemoteMutation} onChangeCapture={blockRemoteMutation} onInputCapture={blockRemoteMutation} onSubmitCapture={blockRemoteMutation}');
  });
});
