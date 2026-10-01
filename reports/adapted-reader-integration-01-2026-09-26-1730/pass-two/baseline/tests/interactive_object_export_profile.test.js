import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let pipeline;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}',
    callGeminiVision: async () => '{}',
    callImagen: async () => null,
    addToast: () => {},
    t: (key) => key,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: (type) => type || 'Resource',
    state: {},
  });
});

describe('interactive object export profile', () => {
  it('classifies core resource types for HTML, interactive HTML, IMS, and QTI', () => {
    const quiz = pipeline.interactiveObjectProfileFor('quiz');
    const conceptSort = pipeline.interactiveObjectProfileFor('concept-sort');
    const persona = pipeline.interactiveObjectProfileFor('persona');

    expect(quiz.canExportHtml).toBe(true);
    expect(quiz.canExportIms).toBe(true);
    expect(quiz.interactiveHtml).toBe(true);
    expect(quiz.qti).toBe(true);

    expect(conceptSort.interactiveHtml).toBe(true);
    expect(conceptSort.tracking).toBe('local-only');

    expect(persona.canExportHtml).toBe(false);
    expect(persona.canExportIms).toBe(false);
    expect(persona.status).toBe('unsupported');
  });

  it('embeds manifest metadata and removes unsupported resources from rendered navigation', () => {
    const historyItems = [
      {
        type: 'simplified',
        id: 's1',
        title: 'Reading',
        data: 'Volcanoes erupt when pressure builds. Students can reread this passage for the main idea.',
      },
      {
        type: 'quiz',
        id: 'q1',
        title: 'Quiz & Check',
        data: {
          questions: [
            { type: 'mcq', question: 'Is 2 < 3?', options: ['Yes', 'No'], correctAnswer: 'Yes' },
          ],
        },
      },
      {
        type: 'adventure',
        id: 'adv1',
        title: 'Adventure Ghost',
        data: { scenes: [] },
      },
    ];

    const html = pipeline.generateFullPackHTML(historyItems, 'Volcanoes', false, {}, {});
    const dom = new JSDOM(html);
    const script = dom.window.document.getElementById('alloflow-interactive-object-profile');
    expect(script).toBeTruthy();

    const manifest = JSON.parse(script.textContent);
    expect(manifest.kind).toBe('alloflow.interactive-object-profile');
    expect(manifest.summary.total).toBe(3);
    expect(manifest.summary.htmlReady).toBe(2);
    expect(manifest.summary.interactiveReady).toBe(1);
    expect(manifest.resources.find((r) => r.id === 'q1').qti).toBe(true);

    const adventure = manifest.resources.find((r) => r.id === 'adv1');
    expect(adventure.canExportHtml).toBe(false);
    expect(adventure.renderedInStudentHtml).toBe(false);
    expect(html).not.toContain('href="#adv1"');
    expect(html).not.toContain('data-alloflow-resource-id="adv1"');
  });

  it('documents IMS package profile output and XML-safe packaging hooks', () => {
    const exportModule = readFileSync('export_module.js', 'utf8');
    expect(exportModule).toContain('alloflow-object-profile.json');
    expect(exportModule).toContain('no-ims-adapter');
    expect(exportModule).toContain('lom:description');
    expect(exportModule).toContain('_safeXmlIdentifier');
    expect(exportModule).toContain('_escapeExportText(title)');
    expect(exportModule).toContain("reason: 'render-error'");
    expect(exportModule).toContain("const idSeed = `${item && item.id ? item.id : 'item'}-${entry.originalIndex}-${idx}`");
  });
});
