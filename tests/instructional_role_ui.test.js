import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));

function compileSourceView(filename, exportName) {
  const source = readFileSync(resolve(process.cwd(), filename), 'utf8');
  const transformed = babel.transformSync(source, {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
    babelrc: false,
    configFile: false,
    parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  });
  // Source files are the canonical JSX fragments; compile in memory so these
  // tests exercise current source without writing generated module mirrors.
  // eslint-disable-next-line no-new-func
  return new Function('window', 'React', `${transformed.code}\nreturn ${exportName};`)(window, React);
}

let SimplifiedView;
let SourceGenPanel;

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  SimplifiedView = compileSourceView('view_simplified_source.jsx', 'SimplifiedView');
  SourceGenPanel = compileSourceView('view_misc_panels_source.jsx', 'SourceGenPanel');
});

describe('leveled-text instructional role controls', () => {
  const baseItem = () => ({
    id: 'adapted-1',
    type: 'simplified',
    data: 'An adapted passage.',
    config: { grade: '5th Grade', standardsContext: { status: 'resolved' } },
    provenance: { generator: 'test' },
    instructionalText: {
      role: 'supplemental',
      form: 'adapted',
      sourceArtifactId: 'source-1',
      primaryArtifactId: 'source-1',
      designationSource: 'workflow-default',
      replacementAuthorization: { authorized: false, source: 'none' },
      complexity: {
        requestedGrade: '5th Grade',
        measuredGrade: 5.5,
        status: 'within-target',
        language: 'English',
      },
    },
  });

  it('records an adapted primary replacement only as an educator-authorized decision', () => {
    const updated = SimplifiedView.updateInstructionalRole(baseItem(), 'primary');

    expect(updated).toMatchObject({
      id: 'adapted-1',
      config: { grade: '5th Grade', standardsContext: { status: 'resolved' } },
      provenance: { generator: 'test' },
      instructionalText: {
        role: 'primary',
        form: 'adapted',
        sourceArtifactId: 'source-1',
        primaryArtifactId: 'source-1',
        designationSource: 'educator',
        replacementAuthorization: { authorized: true, source: 'educator' },
      },
    });
  });

  it('requires an explicit confirmation before the UI records primary replacement authorization', () => {
    const source = readFileSync(resolve(process.cwd(), 'view_simplified_source.jsx'), 'utf8');
    const handler = source.slice(
      source.indexOf('var handleInstructionalRoleChange'),
      source.indexOf('var instructionalRoleControl')
    );
    expect(handler).toContain("if (nextRole === 'primary'");
    expect(handler).toContain('window.confirm(');
    expect(handler.indexOf('window.confirm(')).toBeLessThan(handler.indexOf('updateSimplifiedInstructionalRole('));
  });

  it('revokes replacement authorization when returned to supplemental use', () => {
    const primary = SimplifiedView.updateInstructionalRole(baseItem(), 'primary');
    const supplemental = SimplifiedView.updateInstructionalRole(primary, 'supplemental');

    expect(supplemental.instructionalText).toMatchObject({
      role: 'supplemental',
      designationSource: 'educator',
      replacementAuthorization: { authorized: false, source: 'none' },
    });
  });

  it('merges role changes into the full history artifact instead of replacing it with partial hydration', () => {
    const full = baseItem();
    const partialCurrent = { id: full.id, type: full.type, data: full.data };
    const roleUpdate = SimplifiedView.updateInstructionalRole(partialCurrent, 'supplemental');
    const history = SimplifiedView.upsertFullHistoryArtifact([full], partialCurrent, roleUpdate);

    expect(history).toHaveLength(1);
    expect(history[0].config).toEqual(full.config);
    expect(history[0].provenance).toEqual(full.provenance);
    expect(history[0].instructionalText.role).toBe('supplemental');
  });
});

describe('leveled-text source linkage and complexity evidence', () => {
  it('prefers the exact linked source artifact over the latest analysis heuristic', () => {
    const adapted = {
      type: 'simplified',
      data: 'Adapted.',
      instructionalText: {
        role: 'supplemental',
        form: 'adapted',
        sourceArtifactId: 'source-linked',
        replacementAuthorization: { authorized: false, source: 'none' },
      },
    };
    const history = [
      { id: 'source-linked', type: 'analysis', data: { originalText: 'The linked source.' } },
      { id: 'source-newer', type: 'analysis', data: { originalText: 'A newer unrelated source.' } },
    ];

    expect(SimplifiedView.resolveCompareSource(history, adapted, 'Input fallback.')).toMatchObject({
      text: 'The linked source.',
      selection: 'linked-artifact',
      artifact: { id: 'source-linked' },
    });
  });

  it('uses the shared complexity policy and suppresses stale evidence', () => {
    const context = window.AlloModules.InstructionalContext;
    const text = 'Current passage.';
    const statusSpy = vi.spyOn(context, 'complexityStatus');
    const item = {
      type: 'simplified',
      data: text,
      instructionalText: {
        role: 'supplemental',
        form: 'adapted',
        replacementAuthorization: { authorized: false, source: 'none' },
        complexity: {
          requestedGrade: '5th Grade',
          measuredGrade: 5.8,
          status: 'within-target',
          contentFingerprint: context.fingerprintText(text),
          language: 'English',
        },
      },
    };

    expect(SimplifiedView.getComplexityDisplay(item, '3rd Grade')).toMatchObject({
      measuredGrade: 5.8,
      targetGrade: '5th Grade',
      status: 'within-target',
      target: { fkLabel: '5 to 6' },
    });
    expect(statusSpy).toHaveBeenCalledWith(5.8, '5th Grade');

    const edited = { ...item, data: 'The passage was edited.' };
    expect(SimplifiedView.getComplexityDisplay(edited, '3rd Grade')).toMatchObject({
      measuredGrade: null,
      status: 'stale',
    });

    const invalidated = {
      ...item,
      localStats: { score: '2.0' },
      instructionalText: {
        ...item.instructionalText,
        complexity: {
          ...item.instructionalText.complexity,
          measuredGrade: null,
          status: 'stale',
        },
      },
    };
    expect(SimplifiedView.getComplexityDisplay(invalidated, '3rd Grade')).toMatchObject({
      measuredGrade: null,
      status: 'stale',
    });

    const bilingual = {
      ...item,
      instructionalText: {
        ...item.instructionalText,
        complexity: { ...item.instructionalText.complexity, language: 'English + Spanish' },
      },
    };
    expect(SimplifiedView.getComplexityDisplay(bilingual, '3rd Grade').status).toBe('unavailable');
    statusSpy.mockRestore();
  });
});

describe('source instructional-grade nudge', () => {
  it('normalizes grade aliases before deciding whether to warn', () => {
    expect(SourceGenPanel.getGradeMismatch('5th Grade', 'Grade 5')).toBeNull();
    expect(SourceGenPanel.getGradeMismatch('5th Grade', '3')).toEqual({
      sourceGrade: '5th Grade',
      instructionalGrade: '3rd Grade',
    });
  });
});
