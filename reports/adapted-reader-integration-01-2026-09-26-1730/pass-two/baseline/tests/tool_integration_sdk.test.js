import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const sdk = require('../tool_integration_sdk.js');
const CONTRACT = {
  schemaVersion: 1, id: 'bounded_text_tool', name: 'Bounded Text Tool', version: '1.2.3', reviewedAt: '2026-01-01', reviewAfter: '2099-01-01',
  license: { spdx: 'MIT' }, citation: { text: 'Cite the source edition and tool version.' }, supportedMethodPacks: ['humanistic_interpretation'],
  capabilities: { captureArtifact: true, rawDataIncluded: false }, privacy: { learnerApprovalRequired: true, directIdentifiersAllowed: false, sanitizerId: 'bounded_guard_v1', sanitizerRequired: false },
  reproducibility: { requiredFields: ['softwareVersion', 'sourceRecordId', 'parameters', 'randomSeed', 'limitations', 'transformations'] },
};
function receipt() { return { softwareVersion: '1.2.3', sourceRecordId: 'source-1', parameters: { caseFold: true }, randomSeed: 'not applicable', limitations: ['Counts require interpretation.'], transformations: ['lowercase comparison'] }; }
describe('AlloFlow Tool Integration SDK', () => {
  it('validates current contracts and rejects overdue review windows', () => {
    expect(sdk.version).toBe('1.0.0');
    expect(sdk.validateContract(CONTRACT).ok).toBe(true);
    expect(sdk.validateContract({ ...CONTRACT, reviewAfter: '2026-02-01' }, { now: '2026-07-22' }).errors).toContain('integration review is overdue');
  });
  it('prepares a bounded, sanitized artifact with identity and receipt', () => {
    const adapter = sdk.createAdapter({ contract: CONTRACT, buildCapture: (payload) => ({ title: 'Pattern', summary: 'A bounded repeated pattern with context.', data: payload, reproducibilityReceipt: receipt() }), sanitizeCapture: (capture) => { delete capture.data.fullText; return capture; } });
    const prepared = adapter.prepare({ fullText: 'must not leave tool', term: 'home', count: 4 });
    expect(prepared.ok).toBe(true);
    expect(prepared.capture.data).toEqual({ term: 'home', count: 4 });
    expect(prepared.capture.sourceToolId).toBe(CONTRACT.id);
    expect(prepared.capture.integrationContract).toEqual(CONTRACT);
  });
  it('refuses incomplete reproducibility receipts before calling the Hub', () => {
    const captureArtifact = vi.fn();
    const adapter = sdk.createAdapter({ contract: CONTRACT, resolveResearchHub: () => ({ captureArtifact }), buildCapture: () => ({ summary: 'Bounded output', reproducibilityReceipt: { softwareVersion: '1.2.3' } }) });
    const result = adapter.capture({});
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('sourceRecordId');
    expect(captureArtifact).not.toHaveBeenCalled();
  });
  it('sends only the prepared artifact through an injected Research Hub bridge', () => {
    const captureArtifact = vi.fn(() => ({ ok: true, queued: true }));
    const adapter = sdk.createAdapter({ contract: CONTRACT, resolveResearchHub: () => ({ captureArtifact }), buildCapture: () => ({ title: 'Pattern', summary: 'Bounded output with a counter-reading.', data: { count: 3 }, reproducibilityReceipt: receipt() }) });
    expect(adapter.capture({})).toEqual({ ok: true, queued: true });
    expect(captureArtifact).toHaveBeenCalledOnce();
    expect(captureArtifact.mock.calls[0][0].integrationContract.id).toBe(CONTRACT.id);
  });
});
