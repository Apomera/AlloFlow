import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let api, shared, View, root, host;
const passage = 'Upon the heath. Anon.';
function readings() {
  const original = api.createSupportedReading(passage, { id: 'original', title: 'Original scene', sourceFamilyId: 'scene', unitId: 'lesson-a' });
  original.readingSupports = api.validateReadingSupports(original, {
    annotations: [{ id: 'heath', start: 9, end: 14, quote: 'heath', text: 'PRIVATE_DEFINITION_NOT_IN_SUMMARY', origin: 'educator', pinned: true },
      { id: 'anon', start: 16, end: 20, quote: 'Anon', text: 'suppressed explanation' }],
    suppressedAnnotations: [{ start: 16, end: 20, quote: 'Anon' }]
  });
  const adapted = { id: 'companion', type: 'simplified', title: 'Scene companion', data: 'On open ground. Soon.', sourceSnapshot: original.sourceSnapshot,
    sourceFamilyId: 'scene', unitId: 'lesson-a', instructionalText: { form: 'adapted', role: 'supplemental' } };
  return { original, adapted };
}
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('instructional_context_module.js'); loadAlloModule('shared_activity_module.js'); loadAlloModule('view_share_session_surfaces_module.js');
  api = window.AlloModules.InstructionalContext; shared = window.AlloModules.SharedActivity; View = window.AlloModules.HomeworkQrDialogView;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; vi.restoreAllMocks(); });
function render(summary, overrides = {}) {
  const Icon = () => null, noop = () => {};
  const props = { BookOpen: Icon, ClipboardList: Icon, Copy: Icon, ExternalLink: Icon, Printer: Icon, Share2: Icon, Trash2: Icon, X: Icon,
    SharedAssignmentActivityPanel: Icon, t: key => key, addToast: noop, copyToClipboard: noop, homeworkQrDialogRef: React.createRef(),
    createSelfContainedHomeworkLink: vi.fn(), hostPackOnMailbox: vi.fn(), printQrSheet: noop, revokeHomeworkAssignment: noop, setQrShareModal: noop, testHomeworkAsStudent: vi.fn(),
    qrShareModal: { type: 'assignment', title: 'Scene', url: 'https://example.invalid/homework', noQr: true, resourceCount: summary?.resourceCount ?? 2,
      resourceTitles: ['Scene companion', 'Original scene'], deliverySummary: summary, expiresAt: '2026-10-01T00:00:00Z' }, ...overrides };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props))); return props;
}
const button = text => Array.from(host.querySelectorAll('button')).find(el => el.textContent.includes(text));
describe('actual assignment delivery details', () => {
  it('names the opening reading and counts validated, unsuppressed glosses without copying prose', () => {
    const { original, adapted } = readings();
    const summary = shared.describeAssignmentDelivery([adapted, original], adapted.id, [adapted.id]);
    expect(summary).toMatchObject({ resourceCount: 2, openingResourceId: adapted.id, openingTitle: adapted.title, conversionResourceIds: [adapted.id] });
    expect(summary.readings[0]).toMatchObject({ form: 'adapted', originalStatus: 'included', supportsCount: 1 });
    expect(summary.readings[1]).toMatchObject({ form: 'original', originalStatus: 'included', supportsCount: 1 });
    expect(JSON.stringify(summary)).not.toContain(passage); expect(JSON.stringify(summary)).not.toContain('PRIVATE_DEFINITION');
  });
  it('does not borrow supports from another lesson, family or source revision', () => {
    const { original, adapted } = readings();
    for (const changed of [{ ...original, unitId: 'other' }, { ...original, sourceFamilyId: 'other' }, { ...original, data: 'Changed original' }]) {
      const row = shared.describeAssignmentDelivery([adapted, changed], adapted.id).readings[0];
      expect(row).toMatchObject({ originalStatus: 'captured', supportsCount: 0 });
    }
  });
  it('distinguishes unavailable originals, reduced readings and unavailable validation', () => {
    const { original, adapted } = readings(); delete adapted.sourceSnapshot;
    expect(shared.describeAssignmentDelivery([adapted], adapted.id).readings[0].originalStatus).toBe('unavailable');
    expect(shared.describeAssignmentDelivery([{ ...original, syncTruncated: true, readingSourceAvailability: { status: 'unavailable' } }], original.id).readings[0])
      .toMatchObject({ originalStatus: 'unavailable', incomplete: true });
    delete window.AlloModules.InstructionalContext;
    try { expect(shared.describeAssignmentDelivery([original], original.id).readings[0]).toMatchObject({ form: 'unverified', supportsCount: null }); }
    finally { window.AlloModules.InstructionalContext = api; }
  });
  it('decodes only explicit serialized-text envelopes while preserving JSON-looking source text', () => {
    const original = api.createSupportedReading('{"text":"heath"}', { id: 'json-reading' });
    for (const item of [original, { ...original, data: JSON.stringify(original.data), dataEncoding: 'json-text/v1' }]) {
      expect(shared.describeAssignmentDelivery([item], item.id).readings[0]).toMatchObject({ form: 'original', originalStatus: 'included' });
    }
  });
  it('keeps conversion inside the actual packet and never silently truncates a large selection', () => {
    const items = Array.from({ length: 26 }, (_, i) => ({ id: String(i), title: 'Quiz ' + i, type: 'quiz', data: [] }));
    expect(shared.describeAssignmentDelivery(items, '0').conversionResourceIds).toBeNull();
    expect(shared.describeAssignmentDelivery(items, '0', ['0', '1', 'missing']).conversionResourceIds).toEqual(['0', '1']);
    expect(shared.describeAssignmentDelivery([], null).resourceCount).toBe(0);
  });
  it('derives packet metadata after serializer exclusions instead of teacher history', async () => {
    const { original, adapted } = readings();
    const dependencies = {
      resolveAssignmentResources: () => [adapted, original], serializeResourceForStudentPack: item => item.id === original.id ? null : item,
      stripUndefined: value => value, generateUUID: () => 'packet', encodeAlloPack: async value => value
    };
    // Explicit companion delivery must retain its original; the general packet
    // path still reports only the resources that survive privacy filtering.
    expect(await shared.buildAssignmentPackEncoded({resourceIds:[adapted.id]}, dependencies)).toBeNull();
    const result = await shared.buildAssignmentPackEncoded({}, dependencies);
    expect(result.deliverySummary).toMatchObject({ resourceCount: 1, resourceIds: [adapted.id] });
    expect(result.deliverySummary.readings[0]).toMatchObject({ originalStatus: 'captured', supportsCount: 0 });
  });
});
describe('teacher reading-delivery dialog', () => {
  it('shows saved-link contents and passes only its selection to both conversion callbacks', () => {
    const { original, adapted } = readings(); const summary = shared.describeAssignmentDelivery([adapted, original], adapted.id, [adapted.id]);
    const props = render(summary);
    expect(host.textContent).toContain('What students receive'); expect(host.textContent).toContain('Opens first: Scene companion');
    expect(host.textContent).toContain('Matching original included.'); expect(host.textContent).toContain('1 saved word supports.');
    act(() => button('share_collect.make_self_contained_version_no_accounts').click()); act(() => button('Host on Class Mailbox').click());
    expect(props.createSelfContainedHomeworkLink).toHaveBeenCalledWith([adapted.id], { aiPolicy: 'off' }); expect(props.hostPackOnMailbox).toHaveBeenCalledWith([adapted.id], { includeSharedActivity: false, aiPolicy: 'off' });
    expect(summary.conversionResourceIds).toEqual([adapted.id]);
  });
  it('passes the saved optional-AI policy to both formats', () => {
    const { original, adapted } = readings(); const summary = shared.describeAssignmentDelivery([adapted, original], adapted.id, [adapted.id]);
    const props = render(summary, {qrShareModal:{type:'assignment',title:'Saved',url:'https://example.invalid/saved',noQr:true,resourceCount:2,deliverySummary:summary,aiPolicy:'student-byok'}});
    act(() => button('share_collect.make_self_contained_version_no_accounts').click()); act(() => button('Host on Class Mailbox').click());
    expect(props.createSelfContainedHomeworkLink).toHaveBeenCalledWith([adapted.id], {aiPolicy:'student-byok'});
    expect(props.hostPackOnMailbox).toHaveBeenCalledWith([adapted.id], {includeSharedActivity:false,aiPolicy:'student-byok'});
  });
  it('leaves legacy links usable but prevents conversion without a saved selection', () => {
    const props = render(undefined); expect(button('share_collect.make_self_contained_version_no_accounts').disabled).toBe(true); expect(button('Host on Class Mailbox').disabled).toBe(true);
    act(() => button('share_collect.make_self_contained_version_no_accounts').click()); expect(props.createSelfContainedHomeworkLink).not.toHaveBeenCalled();
    expect(host.textContent).toContain('select the resources again in History');
    act(() => button('share_collect.test_as_student').click()); expect(props.testHomeworkAsStudent).toHaveBeenCalledOnce();
  });
  it('escapes titles and shows incomplete-reading guidance instead of a verified original claim', () => {
    const { original, adapted } = readings(); adapted.title = '<img src=x onerror=evil>';
    const summary = shared.describeAssignmentDelivery([{ ...adapted, syncTruncated: true, sourceSnapshot: null }], adapted.id, [adapted.id]);
    render(summary); expect(host.querySelector('img,[onerror]')).toBeNull();
    expect(host.textContent).toContain('<img src=x onerror=evil>'); expect(host.textContent).toContain('Matching original unavailable'); expect(host.textContent).toContain('reading was reduced');
  });
});
