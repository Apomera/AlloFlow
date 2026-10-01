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

  it('confirms inline, saves the role, collapses and can reopen without native dialogs', () => {
    const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
    const { flushSync } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));
    const container = document.createElement('div'); document.body.appendChild(container);
    const root = createRoot(container);
    const onSave = vi.fn(); const nativeConfirm = vi.spyOn(window, 'confirm').mockImplementation(() => { throw new Error('Blocked in iframe'); });
    const Control = SimplifiedView.ReadingRoleControl;
    function Harness() {
      const [item, setItem] = React.useState(baseItem());
      return React.createElement(Control, { role: item.instructionalText.role, roleLabel: item.instructionalText.role === 'primary' ? 'Main reading' : 'Supporting reading', formLabel: 'Adapted text', isTeacherMode: true, needsAuthorization: !item.instructionalText.replacementAuthorization.authorized,
        onSave: role => { onSave(role); setItem(SimplifiedView.updateInstructionalRole(item, role)); return true; } });
    }
    const change = value => flushSync(() => { const select = container.querySelector('select'); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
    const click = text => flushSync(() => Array.from(container.querySelectorAll('button')).find(button => button.textContent === text).click());
    try {
      flushSync(() => root.render(React.createElement(Harness)));
      change('primary');
      expect(onSave).not.toHaveBeenCalled();
      expect(container.querySelector('[aria-label="Confirm main reading"]')).not.toBeNull();
      click('Cancel'); expect(container.querySelector('select').value).toBe('supplemental');
      expect(onSave).not.toHaveBeenCalled();
      change('primary'); click('Confirm main reading');
      expect(onSave).toHaveBeenCalledWith('primary');
      expect(container.querySelector('summary').textContent).toContain('Main reading');
      expect(container.querySelector('details').open).toBe(false);
      expect(document.activeElement).toBe(container.querySelector('summary'));
      flushSync(() => container.querySelector('summary').click());
      expect(container.querySelector('details').open).toBe(true);
      change('supplemental');
      expect(onSave).toHaveBeenLastCalledWith('supplemental');
      expect(container.querySelector('details').open).toBe(false);
      expect(nativeConfirm).not.toHaveBeenCalled();
    } finally { flushSync(() => root.unmount()); container.remove(); nativeConfirm.mockRestore(); }
  });

  it('keeps the choice open with feedback if saving fails', () => {
    const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
    const { flushSync } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));
    const container = document.createElement('div'); const root = createRoot(container);
    try {
      flushSync(() => root.render(React.createElement(SimplifiedView.ReadingRoleControl, { role: 'supplemental', roleLabel: 'Supporting reading', formLabel: 'Adapted text', isTeacherMode: true, onSave: () => false })));
      flushSync(() => { const select = container.querySelector('select'); select.value = 'unspecified'; select.dispatchEvent(new Event('change', { bubbles: true })); });
      expect(container.querySelector('details').open).toBe(true);
      expect(container.querySelector('[role="alert"]').textContent).toContain('could not be saved');
      expect(container.querySelector('select').value).toBe('supplemental');
    } finally { flushSync(() => root.unmount()); }
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


describe('source analysis role presentation', () => {
  it('offers review when an imported adapted main has no educator authorization', () => {
    const AnalysisView = compileSourceView('view_analysis_source.jsx', 'AnalysisView');
    const { renderToStaticMarkup } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
    const markup = renderToStaticMarkup(React.createElement(AnalysisView, {
      t: key => key, isTeacherMode: true, isProcessing: false, sourceRefineInstruction: '',
      selectedDiscrepancies: new Set(), selectedGrammarErrors: new Set(),
      onInstructionalRoleChange: () => {}, formatInlineText: text => text, renderFormattedText: text => text,
      splitReferencesFromBody: text => ({ body: text, references: '' }),
      generatedContent: { id: 'analyzed-adaptation', type: 'analysis',
        data: { originalText: 'Adapted passage analyzed for readability.', concepts: [], grammar: [], readingLevel: '5', accuracy: { rating: 'High', reason: '' } },
        instructionalText: { form: 'adapted', role: 'primary', replacementAuthorization: { authorized: true, source: 'workflow-default' } }
      }
    }));
    expect(markup).toContain('Adapted text');
    expect(markup).toContain('needs review');
    expect(markup).toContain('Review main-reading choice');
    expect(markup).toContain('Use in this lesson');
  });
});
