// Automatic level check (judge once, re-level only on agreement) and the two
// math presets. The dispatcher logic is inline in a 2k-line generator, so this
// pins the load-bearing decisions in the SOURCE and the SHIPPED modules rather
// than mounting the app: the guard against recursion, the off switches, the
// replace-not-append history write, the directive reaching the rewrite prompt,
// the disagreement-is-not-an-action rule, and the view's Undo restoring the
// draft it kept. The math presets ship the same JSON contract as a problem set
// so every downstream consumer keeps working.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const dispatcher = read('generate_dispatcher_source.jsx');
const dispatcherModule = read('generate_dispatcher_module.js');
const dispatcherPublic = read('desktop/web-app/public/generate_dispatcher_module.js');
const simplified = read('view_simplified_source.jsx');
const simplifiedModule = read('view_simplified_module.js');
const sidebar = read('view_sidebar_panels_source.jsx');
const sidebarModule = read('view_sidebar_panels_module.js');

function between(text, start, end) {
    const a = text.indexOf(start);
    const b = text.indexOf(end, a);
    if (a === -1 || b === -1) throw new Error('markers not found: ' + start);
    return text.slice(a, b);
}

describe('automatic level check in the adapted-text pipeline', () => {
    const block = between(dispatcher, '// --- Automatic level check (judge once, re-level only on agreement)', "addToast(`${getDefaultTitle(type)} generated!`");

    it('runs as a generation step after the local measurement and before the teacher sees the text', () => {
        expect(block).toContain("setGenerationStatus(t('status_steps.checking_level') || 'Checking reading level…')");
        expect(block).toContain('const _fkStats = finalAdaptedItem.localStats || null;');
        // The single merged judge call carries the SAME keys the two-call Check Level stores,
        // so the existing rubric panel renders it unchanged.
        expect(block).toContain('const _judgeRaw = await callGemini(_judgePrompt, true);');
        expect(block.split('await callGemini(').length - 1).toBe(1);
        for (const key of ['"estimatedLevel"', '"alignment"', '"confirmedLevel"', '"vocabulary"', '"sentenceStructure"', '"conceptDensity"', '"nuanceSummary"']) {
            expect(block).toContain(key);
        }
        expect(block).toContain('auto: true');
        expect(block).toContain('triangulation: _triangulation');
    });

    it('re-levels only when both signals agree, at most once, and never for non-English (no FK)', () => {
        expect(block).toContain("const _agree = _fkStatus === _judgeStatus && (_fkStatus === 'above-target' || _fkStatus === 'below-target');");
        expect(block).toContain("const _shouldRelevel = _agree && !configOverride.relevelPass && Number.isFinite(_fkGrade) && _autoPref('alloflow_auto_relevel');");
        expect(block).toContain('relevelPass: 1,');
        expect(block).toContain('relevelReplaceId: newId,');
        expect(block).toContain("await handleGenerate('simplified', langOverride, keepLoading, textOverride, {");
        // Off switches, both defaulting to on.
        expect(block).toContain("_autoPref('alloflow_auto_level_check')");
        expect(block).toContain("localStorage.getItem(key) !== 'off'");
        expect(block).toContain('!configOverride.skipAutoLevelCheck');
    });

    it('treats disagreement as information: a specific note, no rewrite', () => {
        expect(block).toContain("if (_fkStatus === 'within-target' && _judgeStatus === 'above-target') _note = 'Sentences measure on target but the ideas are dense");
        expect(block).toContain("else if (_fkStatus === 'above-target' && _judgeStatus === 'within-target') _note = 'Ideas fit the target but sentences run long");
        expect(block).toContain("action: _agree ? (_fkStatus === 'above-target' ? 'relevel-simpler' : 'relevel-harder') : 'none'");
    });

    it('carries the draft it replaces so the view can restore it, and replaces rather than appends in history', () => {
        expect(block).toContain('fromText: fullTargetText,');
        expect(block).toContain('fromLocalStats: _fkStats,');
        expect(block).toContain('measuredBefore: _fkGrade,');
        expect(block).toContain("direction: _simpler ? 'simpler' : 'harder'");
        expect(dispatcher).toContain('setHistory(prev => configOverride.relevelReplaceId');
        expect(dispatcher).toContain('? prev.map(item => item.id === configOverride.relevelReplaceId ? tempItem : item)');
        // The directive reaches the rewrite prompt for every chunk.
        expect(dispatcher).toContain("${configOverride.relevelDirective ? String(configOverride.relevelDirective) : ''}");
        expect(block).toContain('RE-LEVEL PASS (automatic)');
    });

    it('never throws out of the pipeline: the whole step is fenced', () => {
        expect(block.trim().startsWith('// --- Automatic level check')).toBe(true);
        expect(block).toContain('} catch (_autoErr) {');
        expect(block).toContain("console.warn('[AutoLevelCheck] skipped:'");
    });

    it('ships in the built dispatcher and its public mirror', () => {
        for (const text of [dispatcherModule, dispatcherPublic]) {
            expect(text).toContain('relevelReplaceId');
            expect(text).toContain('alloflow_auto_level_check');
            expect(text).toContain('RE-LEVEL PASS (automatic)');
        }
        expect(dispatcherModule).toBe(dispatcherPublic);
    });
});

describe('simplified view: receipt, undo, disagreement note, and the preference toggle', () => {
    it('renders the re-level receipt with an Undo that restores the kept draft in place', () => {
        const receipt = between(simplified, '{isTeacherMode && generatedContent.relevel && (() => {', "{isTeacherMode && !generatedContent.levelCheck && simplifiedComplexityDisplay.measuredGrade !== null");
        expect(receipt).toContain('const restored = { ...generatedContent, data: info.fromText };');
        expect(receipt).toContain('delete restored.relevel;');
        expect(receipt).toContain('if (info.fromLevelCheck) restored.levelCheck = info.fromLevelCheck;');
        expect(receipt).toContain('setGeneratedContent(restored);');
        expect(receipt).toContain("setHistory(prev => prev.map(item => item.id === restored.id ? restored : item))");
        expect(receipt).toContain("'Undo re-level'");
        expect(receipt).toContain('data-relevel="disagreement"');
        expect(receipt).toContain('!generatedContent.levelCheck.triangulation.agree');
    });

    it('exposes the preference the dispatcher reads, stored per browser', () => {
        expect(simplified).toContain("localStorage.getItem('alloflow_auto_level_check') !== 'off'");
        expect(simplified).toContain("localStorage.setItem('alloflow_auto_level_check', next ? 'on' : 'off')");
        expect(simplified).toContain("'Auto-check on generate'");
        expect(simplifiedModule).toContain('alloflow_auto_level_check');
        expect(simplifiedModule).toContain('Undo re-level');
    });
});

describe('math presets: Spiral Review and Difficulty Ladder', () => {
    it('are selectable in the sidebar and show the topic and quantity fields', () => {
        expect(sidebar).toContain('<option value="Spiral Review">');
        expect(sidebar).toContain('<option value="Difficulty Ladder">');
        expect(sidebar).toContain("mathMode === 'Problem Set Generator' || mathMode === 'Spiral Review' || mathMode === 'Difficulty Ladder' || mathMode === 'Word Problems from Source'");
        expect(sidebar).toContain("(mathMode === 'Problem Set Generator' || mathMode === 'Spiral Review' || mathMode === 'Difficulty Ladder')");
        expect(sidebar).toContain("mathMode === 'Spiral Review' ? (t('math.placeholder_spiral')");
        expect(sidebarModule).toContain('Spiral Review');
        expect(sidebarModule).toContain('Difficulty Ladder');
    });

    it('branch in the dispatcher on the same JSON contract as a problem set, with skill and difficulty labels', () => {
        const branch = between(dispatcher, "} else if (mode === 'Spiral Review' || mode === 'Difficulty Ladder') {", "} else if (mode === 'Problem Set Generator') {");
        expect(branch).toContain("const isSpiral = mode === 'Spiral Review';");
        expect(branch).toContain('never place two problems on the same skill next to each other');
        expect(branch).toContain('Order the problems strictly from easiest to hardest');
        expect(branch).toContain('"problems": [');
        expect(branch).toContain('"skill": "skill name",');
        expect(branch).toContain('"difficulty": "easy | medium | hard | stretch",');
        expect(branch).toContain('"steps": [{ "explanation": "...", "latex": "..." }],');
        expect(branch).toContain('"graphData": null');
        expect(branch).toContain('${standardsDirective}');
        expect(branch).toContain('${dokDirective}');
        expect(dispatcherModule).toContain("mode === 'Spiral Review' || mode === 'Difficulty Ladder'");
    });
});
