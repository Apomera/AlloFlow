import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('AlloFlowANTI.txt', 'utf8');
function block(from, to) {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error('Missing host boundary: ' + from);
  return source.slice(start, end);
}
const selectCode = block('  const selectBuilderResources =', '  const getBuilderHistory =');
const signatureCode = block('  const _getBuilderHistorySignature =', '  const getBuilderGuidedDeliveryContext =');
const contextCode = block('  const getBuilderGuidedDeliveryContext =', '  const builderGuidedDeliveryContext =');
const confirmCode = block('  const confirmBuilderGuidedDelivery =', '  const BUILDER_PROJECT_DRAFT_MAX_BYTES =');
const reading = { id: 'reading', type: 'simplified', data: 'The selected lesson reading.' };
const base = overrides => ({ guidedMode: true, exportPreviewSource: 'history', builderResourceIds: ['reading'],
  guidedCreatedHistoryIds: ['reading'], history: [reading], inputText: 'Original lesson passage.', guidedPlanBrief: null, ...overrides });

function render(state, ref = { current: null }, complete = vi.fn()) {
  return new Function('state', 'ref', 'completeGuidedDelivery', `
    const { guidedMode, exportPreviewSource, builderResourceIds, guidedCreatedHistoryIds, history, inputText, guidedPlanBrief } = state;
    const getExportableHistory = items => items.filter(item => item && item.type !== 'persona');
    ${selectCode}
    ${signatureCode}
    ${contextCode}
    const _builderGuidedDeliveryContextRef = ref;
    const capturedContext = getBuilderGuidedDeliveryContext();
    ref.current = capturedContext;
    ${confirmCode}
    return { context: capturedContext, report: () => confirmBuilderGuidedDelivery(capturedContext) };
  `)(state, ref, complete);
}

describe('Builder export evidence belongs to the current Guided lesson', () => {
  it('records a successful export of the complete current selection', () => {
    const complete = vi.fn();
    const result = render(base(), { current: null }, complete);
    expect(result.report()).toBe(true);
    expect(complete).toHaveBeenCalledWith('exportCreated');
  });

  it.each([
    ['ordinary History export', { builderResourceIds: null }],
    ['remediated document', { exportPreviewSource: 'remediation' }],
    ['Guided Mode exited', { guidedMode: false }],
    ['no Guided resources', { guidedCreatedHistoryIds: [] }],
    ['malformed Guided IDs', { guidedCreatedHistoryIds: [null] }],
    ['missing selected resource', { history: [] }],
    ['another lesson', { guidedCreatedHistoryIds: ['other'] }],
    ['only part of the lesson', { guidedCreatedHistoryIds: ['reading', 'directions'] }],
    ['selection includes another lesson', { builderResourceIds: ['reading', 'other'], history: [reading, { id: 'other', type: 'analysis' }] }],
    ['no Builder-compatible output', { history: [{ ...reading, type: 'persona' }] }],
  ])('does not credit %s', (_label, change) => {
    const complete = vi.fn();
    expect(render(base(change), { current: null }, complete).report()).toBe(false);
    expect(complete).not.toHaveBeenCalled();
  });

  it.each([
    ['source', { inputText: 'A different source.' }],
    ['resource content', { history: [{ ...reading, data: 'The revised reading.' }] }],
    ['learning goal', { guidedPlanBrief: { goal: 'Compare two explanations.' } }],
    ['workspace selection', { builderResourceIds: null }],
    ['active lesson', { guidedMode: false }],
  ])('ignores a late success after the %s changes', (_label, change) => {
    const ref = { current: null }, complete = vi.fn();
    const pendingExport = render(base(), ref, complete);
    render(base(change), ref, complete);
    expect(pendingExport.report()).toBe(false);
    expect(complete).not.toHaveBeenCalled();
  });

  it('allows a pending success when only unrelated History changes', () => {
    const ref = { current: null }, complete = vi.fn();
    const pendingExport = render(base(), ref, complete);
    render(base({ history: [{ id: 'unrelated', type: 'analysis', data: 'Another lesson.' }, reading] }), ref, complete);
    expect(pendingExport.report()).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});

describe('Guided delivery completion requires a delivery outcome', () => {
  function delivery(guidedMode = true, step = 'package-deliver') {
    const markGuidedStepDone = vi.fn();
    let evidence = {};
    const api = new Function('guidedMode', 'step', 'markGuidedStepDone', 'setGuidedDeliveryEvidence', `
      const GUIDED_DELIVERY_EVIDENCE_KEYS = ['directionsSaved', 'exportCreated', 'shareCreated', 'liveStarted', 'studentPreviewed'];
      const guidedActiveSteps = [{ id: step }], guidedStep = 0;
      ${block('  const markGuidedDeliveryEvidence =', '  const toggleGuidedStepId =')}
      return completeGuidedDelivery;
    `)(guidedMode, step, markGuidedStepDone, update => { evidence = update(evidence); });
    return { complete: api, markGuidedStepDone, evidence: () => evidence };
  }

  it.each(['studentPreviewed', 'directionsSaved'])('records %s without completing Package & Deliver', key => {
    const h = delivery(); h.complete(key);
    expect(h.evidence()).toEqual({ [key]: true });
    expect(h.markGuidedStepDone).not.toHaveBeenCalled();
  });
  it.each(['exportCreated', 'shareCreated', 'liveStarted'])('completes delivery for %s', key => {
    const h = delivery(); h.complete(key);
    expect(h.evidence()).toEqual({ [key]: true });
    expect(h.markGuidedStepDone).toHaveBeenCalledWith('package-deliver');
  });
  it('ignores unknown keys and actions outside Guided Mode', () => {
    const h = delivery(); h.complete('unknown');
    expect(h.evidence()).toEqual({});
    expect(h.markGuidedStepDone).not.toHaveBeenCalled();
    const inactive = delivery(false); inactive.complete('exportCreated');
    expect(inactive.evidence()).toEqual({});
    expect(inactive.markGuidedStepDone).not.toHaveBeenCalled();
  });
  it('records an export on another step without marking that step delivered', () => {
    const h = delivery(true, 'simplified'); h.complete('exportCreated');
    expect(h.evidence()).toEqual({ exportCreated: true });
    expect(h.markGuidedStepDone).not.toHaveBeenCalled();
  });
});
