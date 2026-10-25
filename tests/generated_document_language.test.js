// WCAG 3.1.1 / 3.1.2 for documents the app writes into print windows, iframes
// and Drive: each <html> declares the page language, and Communications
// Studio marks the family translation with its own lang (and dir for RTL), so
// a screen reader does not read Somali or Arabic with an English voice.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function loadStudio(documentElement) {
    const stubReact = { createElement: () => null, Fragment: 'Fragment', useState: (v) => [typeof v === 'function' ? v() : v, () => {}], useMemo: (f) => f(), useEffect: () => {} };
    const w = { AlloModules: {}, React: stubReact };
    const doc = { documentElement, getElementById: () => null, createElement: () => ({ setAttribute() {}, style: {} }), body: { appendChild() {} } };
    vm.runInNewContext(read('communications_studio_module.js'), { window: w, document: doc, console: { log() {}, warn() {}, error() {} }, localStorage: { getItem: () => null, setItem() {} } }, { filename: 'communications_studio_module.js' });
    return w.AlloModules.CommunicationsStudio._testing;
}

describe('Communications Studio documents', () => {
    it('declares the page language from the app and falls back to English', () => {
        expect(loadStudio({ lang: 'es' }).csPrintHtml('Carta', [{ text: 'Hola' }], {})).toMatch(/^<!DOCTYPE html><html lang="es">/);
        expect(loadStudio({ lang: '' }).csPrintHtml('Letter', [{ text: 'Hi' }], {})).toMatch(/^<!DOCTYPE html><html lang="en">/);
        expect(loadStudio({ lang: 'en" onload="x' }).csPrintHtml('Letter', [{ text: 'Hi' }], {})).not.toContain('" onload="');
    });

    it('marks the printed translation with its language and direction', () => {
        const T = loadStudio({ lang: 'en' });
        const html = T.csPrintHtml('Update', [{ text: 'We read.', translation: 'Waan akhrinnay.', language: 'Somali' }, { text: 'We read.', translation: 'قرأنا.', language: 'Arabic' }], {});
        expect(html).toContain('<div lang="so"><p>Waan akhrinnay.</p></div>');
        expect(html).toContain('<div lang="ar" dir="rtl"><p>قرأنا.</p></div>');
    });

    it('marks the Drive translation and tags every offered language', () => {
        const T = loadStudio({ lang: 'en' });
        expect(T.csDraftToHtml('Update', 'We read.', 'لوستل مو.', { language: 'Pashto' })).toContain('<div lang="ps" dir="rtl"><p>لوستل مو.</p></div>');
        for (const name of T.CS_LANGUAGES) {
            expect(T.csDraftToHtml('x', 'y', 'z', { language: name }), name).toMatch(/<div lang="[a-zA-Z-]+"/);
        }
    });
});

describe('print and preview shells declare a language', () => {
    const shells = [
        ['communications_studio', 1],
        ['memory_aid', 1],
        ['seating_chart', 1],
        ['view_export_preview', 1],
        ['view_renderers', 2],
        ['view_session_modal', 1],
    ];
    const toolShells = [
        ['sel_hub/sel_tool_crisiscompanion.js', 1], ['sel_hub/sel_tool_digitalwellbeing.js', 1], ['sel_hub/sel_tool_upstander.js', 1],
        ['stem_lab/stem_tool_applab.js', 1], ['stem_lab/stem_tool_cyberdefense.js', 1], ['stem_lab/stem_tool_ecosystem.js', 1],
        ['stem_lab/stem_tool_forge.js', 1], ['stem_lab/stem_tool_fractions.js', 5], ['stem_lab/stem_tool_geometryworld.js', 2],
        ['stem_lab/stem_tool_lifeskills.js', 1], ['stem_lab/stem_tool_openbim.js', 1], ['stem_lab/stem_tool_printingpress.js', 1],
        ['stem_lab/stem_tool_renewables.js', 1], ['stem_lab/stem_tool_typingpractice.js', 1],
    ];
    for (const [file, count] of toolShells) {
        it(file + ' and its public copy', () => {
            for (const copy of [file, 'desktop/web-app/public/' + file]) {
                const text = read(copy);
                expect((text.match(/<html>(?=[\s\S]{0,200}?<head[\s>])/gi) || []).length, copy + ' has a document shell without lang').toBe(0);
                expect((text.match(/<html lang=(?=[\s\S]{0,400}?<head[\s>])/gi) || []).length, copy).toBeGreaterThanOrEqual(count);
            }
        });
    }
    for (const [name, count] of shells) {
        it(name + ' source, module and public copy', () => {
            for (const file of [name + '_source.jsx', name + '_module.js', 'desktop/web-app/public/' + name + '_module.js']) {
                const text = read(file);
                const bare = text.match(/<html>(?=[\s\S]{0,200}?<head[\s>])/gi) || [];
                const tagged = text.match(/<html lang=(?=[\s\S]{0,400}?<head[\s>])/gi) || [];
                expect(bare.length, file + ' has a document shell without lang').toBe(0);
                expect(tagged.length, file).toBeGreaterThanOrEqual(count);
            }
        });
    }
});
