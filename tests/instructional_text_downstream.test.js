import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let handlers;

beforeAll(() => {
  loadAlloModule('export_handlers_module.js');
  handlers = window.AlloModules.ExportHandlers;
});

const baseDeps = {
  history: [],
  targetStandards: [],
  inputText: '',
};

describe('downstream instructional-text role handling', () => {
  it('uses the designated primary for lesson context and keeps an adaptation supplemental', () => {
    const history = [
      {
        id: 'primary-1',
        type: 'analysis',
        data: { originalText: 'This is the designated grade-level primary source.', concepts: ['evidence'], readingLevel: { range: '5-6' } },
        instructionalText: {
          role: 'primary', form: 'original',
          replacementAuthorization: { authorized: false, source: 'none' },
          complexity: { requestedGrade: '5th Grade', measuredGrade: 5.5 },
        },
      },
      {
        id: 'adapted-1',
        type: 'simplified',
        data: 'This is a supplemental adapted companion.',
        instructionalText: {
          role: 'supplemental', form: 'adapted', sourceArtifactId: 'primary-1',
          replacementAuthorization: { authorized: false, source: 'none' },
        },
      },
    ];

    const context = handlers.getLessonContext(history, { ...baseDeps, history });
    expect(context).toContain('PRIMARY TEXT (EDUCATOR/WORKFLOW DESIGNATED)');
    expect(context).toContain('designated grade-level primary source');
    expect(context).toContain('ADAPTED TEXT (SUPPLEMENTAL ACCESS VERSION)');
    expect(context).toContain('Do not substitute this version for the primary text');
    expect(context).not.toContain('CORE TEXT (Leveled Reading)');
  });

  it('does not promote a legacy adapted text to primary', () => {
    const history = [{ id: 'legacy-1', type: 'simplified', data: 'Legacy adapted text only.' }];
    const context = handlers.getLessonContext(history, { ...baseDeps, history });
    expect(context).toContain('PRIMARY TEXT NOT AVAILABLE');
    expect(context).toContain('ADAPTED TEXT (ROLE UNSPECIFIED)');
    expect(context).not.toContain('PRIMARY TEXT (EDUCATOR/WORKFLOW DESIGNATED)');
  });

  it('accepts an adapted primary only with explicit educator authorization', () => {
    const unauthorized = {
      id: 'a1', type: 'simplified', data: 'Unauthorized replacement.',
      instructionalText: { role: 'primary', form: 'adapted', replacementAuthorization: { authorized: true, source: 'model' } },
    };
    const authorized = {
      id: 'a2', type: 'simplified', data: 'Educator authorized replacement.',
      instructionalText: { role: 'primary', form: 'adapted', replacementAuthorization: { authorized: true, source: 'educator' } },
    };
    expect(handlers.getTextAccessSummary([unauthorized]).unauthorizedPrimaryAdaptations).toHaveLength(1);
    expect(handlers.getTextAccessSummary([unauthorized]).hasPrimary).toBe(false);
    expect(handlers.getTextAccessSummary([authorized]).hasPrimary).toBe(true);
    expect(handlers.getLessonContext([authorized], { ...baseDeps, history: [authorized] }))
      .toContain('PRIMARY TEXT (EDUCATOR/WORKFLOW DESIGNATED)');
  });
});

describe('downstream export and history integration guards', () => {
  const previewSource = readFileSync('view_export_preview_source.jsx', 'utf8');
  const pipelineSource = readFileSync('doc_pipeline_source.jsx', 'utf8');
  const historySource = readFileSync('view_history_panel_source.jsx', 'utf8');
  const projectSource = readFileSync('misc_handlers_source.jsx', 'utf8');

  it('shows an advisory export warning without exposing internal calibration as a student label', () => {
    expect(previewSource).toContain('textAccessExportReview.supplementalWithoutPrimary');
    expect(previewSource).toContain('Text-access review before sharing');
    expect(previewSource).toContain('This notice is advisory and does not make an IEP or legal-compliance determination.');
    expect(previewSource).toContain("['includeSimplified', '📖 Adapted Text', 'simplified']");
    expect(previewSource).not.toContain('calibrationTarget');
  });

  it('embeds role/source/measurement metadata and a pack-level warning code in export manifests', () => {
    expect(pipelineSource).toContain('instructionalText: _alloInstructionalTextForManifest(item)');
    expect(pipelineSource).toContain("_textAccessWarningCodes.push('supplemental-text-without-primary')");
    expect(pipelineSource).toContain("_textAccessWarningCodes.push('adapted-text-role-unspecified')");
    expect(pipelineSource).toContain("_textAccessWarningCodes.push('adapted-primary-not-educator-authorized')");
    expect(pipelineSource).toContain('role: role');
    expect(pipelineSource).toContain('contentFingerprint: complexity.contentFingerprint');
  });

  it('keeps role metadata through community staging and full-artifact project restoration', () => {
    expect(historySource).toContain('textAccessPreflight');
    expect(historySource).toContain('instructionalText: getInstructionalTextRecord(item)');
    // Access hardened through safeField (null-tolerant) in the 2026-08 pass.
    expect(historySource).toContain("safeField(config, 'instructionalText')");
    expect(projectSource).toContain('setGeneratedContent({ ...lastItem });');
  });
});
