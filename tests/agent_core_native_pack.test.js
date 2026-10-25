import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const service = require('../agent_core_resource_pack_module.js');
const media = require('../agent_core_pack_media_module.js');
const native = { profile: 'native' };
const request = history => ({ requestId: 'native-check', sourceTopic: 'Evidence and reasoning', learningGoal: 'Connect claims to evidence.', privacy: { confirmNoStudentPii: true, confirmSourcePermission: true }, profile: 'native', history });
const capabilities = service.getCapabilities('native');
const examples = capabilities.contracts.map(contract => contract.example);
const pack = item => service.compose(request([structuredClone(item)]));

describe('native AlloPack authoring coverage', () => {
  it('covers every tool in the actual platform catalog with a discoverable valid example', () => {
    const context = { window: {} };
    vm.runInNewContext(readFileSync('tool_catalog_source.jsx', 'utf8'), context);
    const catalogTypes = context.window.AlloModules.ToolCatalog.getToolIds();
    for (const type of catalogTypes) expect(capabilities.resourceTypes).toContain(type);
    expect(examples.map(item => item.type).sort()).toEqual([...service.NATIVE_TYPES].sort());
    for (const example of examples) {
      const result = pack(example);
      expect(result.ok, example.type + ': ' + JSON.stringify(result.errors)).toBe(true);
      const saved = structuredClone(result.value);
      saved.editorMetadata = { rubricReviewed: false, provenance: 'Authored example' };
      saved.history[0].nativeReview = { attribution: 'Keep this field' };
      const exported = service.exportPack(saved, native);
      expect(exported.ok, example.type + ': ' + JSON.stringify(exported.errors)).toBe(true);
      expect(JSON.parse(exported.json)).toEqual(saved);
      expect(service.previewPack(saved, native).resources[0].type).toBe(example.type);
    }
  });

  it('preserves old profile boundaries and rejects unknown types', () => {
    expect(service.getCapabilities('text').resourceTypes).toHaveLength(12);
    expect(service.getCapabilities('illustrated').resourceTypes).toHaveLength(15);
    const p = pack(examples.find(item => item.type === 'brainstorm')).value;
    expect(service.validatePack(p, { profile: 'illustrated' }).errors.some(e => e.code === 'unregistered-type')).toBe(true);
    p.history[0].type = 'not-a-native-resource';
    expect(service.validatePack(p, native).errors.some(e => e.code === 'unregistered-type')).toBe(true);
    expect(service.getCapabilities('unknown').ok).toBe(false);
  });

  it('preserves slash-delimited IPA only in native phoneme fields', () => {
    const words = structuredClone(examples.find(item => item.type === 'word-sounds'));
    words.data[0].phonemes = ['/k/', { ipa: '/æ/' }, '/t/'];
    const report = pack(words);
    expect(report.ok, JSON.stringify(report.errors)).toBe(true);
    expect(report.value.history[0].data[0].phonemes).toEqual(words.data[0].phonemes);
    words.data[0].definition = '/private/file';
    expect(pack(words).errors.some(e => e.code === 'unsafe-path-value')).toBe(true);
    words.data[0].definition = 'A test word';
    words.data[0].phonemes[0] = '/private/file';
    expect(pack(words).errors.some(e => e.code === 'unsafe-path-value')).toBe(true);
  });

  it('does not label native authored teacher materials as student-safe', () => {
    const p = pack(examples.find(item => item.type === 'lesson-plan')).value;
    expect(service.previewPack(p, native)).toMatchObject({ ok: true, reviewRequired: true });
    expect(service.previewPack(p, native).studentSafe).toBeUndefined();
  });

  const notebook = capabilities.contracts.find(contract => contract.type === 'note-taking');
  it.each(notebook.variants.map(data => [data.templateType, data]))('round-trips the %s notebook without filling learner responses', (_, data) => {
    const item = { id: 'notes', type: 'note-taking', title: 'My notes', data: structuredClone(data) };
    const report = pack(item);
    expect(report.ok, JSON.stringify(report.errors)).toBe(true);
    expect(report.value.history[0].data).toEqual(data);
    expect(JSON.parse(service.exportPack(report.value, native).json).history[0].data).toEqual(data);
    expect(service.validatePack(report.value, { profile: 'illustrated' }).ok).toBe(false);
  });

  it('rejects malformed notebook rows, duplicate IDs, missing keys, and broken lesson links', () => {
    const item = { id: 'notes', type: 'note-taking', title: 'Notes', data: { templateType: 'guided-notes', blanks: [{ id: 'x', before: 'A ', after: '.', answer: '', studentAnswer: {} }, { id: 'x', before: '', after: '', answer: 'b', studentAnswer: '' }], lessonRef: { resourceId: 'missing' } } };
    const report = pack(item);
    expect(report.ok).toBe(false);
    expect(report.errors.map(e => e.code)).toEqual(expect.arrayContaining(['invalid-note-text', 'missing-note-prompt', 'duplicate-or-missing-id', 'unresolved-resource-reference']));
  });

  it('accepts native paragraph scaffolds, short exit checks, and single math problems', () => {
    const history = [
      { id: 'paragraph', type: 'sentence-frames', title: 'Reasoning', data: { mode: 'paragraph', text: 'My claim is ___. The evidence supports it because ___.', rubric: 'Link evidence and reasoning.' } },
      { id: 'exit', type: 'quiz', title: 'Exit check', data: { questions: [{ type: 'mcq', question: 'Which supports a claim?', options: ['Relevant evidence', 'Volume'], correctAnswer: 'Relevant evidence' }] } },
      { id: 'math', type: 'math', title: 'One problem', data: { problem: '2 + 1', answer: 3, steps: [{ explanation: 'Add one to two.' }] } }
    ];
    const report = service.compose(request(history));
    expect(report.ok, JSON.stringify(report.errors)).toBe(true);
    expect(report.value.history.map(i => i.data)).toEqual(history.map(i => i.data));
  });

  it('attaches native single/timeline images without mutating the input', () => {
    const image = JSON.parse(readFileSync('allopacks/illustrated/water_cycle_grade6.allopack.json')).history.find(item => item.type === 'glossary').data[0].image;
    const timeline = pack(examples.find(item => item.type === 'timeline')).value;
    const before = structuredClone(timeline);
    const report = service.attachImage(timeline, { resourceId: timeline.history[0].id, slot: 'timeline', index: 0, dataUrl: image, alt: 'Water-cycle illustration for an authoring test.', altSource: 'planning' }, native);
    expect(report.ok, JSON.stringify(report.errors)).toBe(true);
    expect(timeline).toEqual(before);
    expect(report.value.history[0].data.items[0].altHash).toBe(media.hashImage(image));
    const single = structuredClone(timeline);
    single.history = [{ id: 'image', type: 'image', title: 'One image', data: { imageUrl: image, altText: 'Illustration.', altSource: 'planning' } }];
    expect(service.attachImage(single, { resourceId: 'image', slot: 'single', index: 0, dataUrl: image, alt: 'Updated illustration description.' }, native).ok).toBe(true);
    expect(service.attachImage(single, { resourceId: 'image', slot: 'single', index: 1, dataUrl: image, alt: 'Description.' }, native).ok).toBe(false);
  });

  it('supports browser module loading and fails closed if a dependency is missing', () => {
    const context = { window: { AlloModules: {} } };
    for (const file of ['agent_core_pack_media_module.js', 'agent_core_resource_pack_module.js']) vm.runInNewContext(readFileSync(file, 'utf8'), context);
    expect(context.window.AlloModules.AgentCoreResourcePack.getCapabilities('native').ok).toBe(false);
    vm.runInNewContext(readFileSync('agent_core_pack_native_module.js', 'utf8'), context);
    expect(context.window.AlloModules.AgentCoreResourcePack.getCapabilities('native').resourceTypes).toHaveLength(25);
    const report = context.window.AlloModules.AgentCoreResourcePack.compose(request([examples[0]]));
    expect(report.ok, JSON.stringify(report.errors)).toBe(true);
  });
});
