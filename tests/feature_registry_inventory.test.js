// The feature registry inventory is generated from the app's own registries;
// this suite regenerates it and diffs against the committed file so the
// inventory (and every count anyone quotes from it) cannot drift from the
// code. Threshold assertions catch a parser that silently starts returning
// nothing for a registry, which would otherwise pass a diff after a regenerate.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { buildInventory, OUT_MD, OUT_JSON } = require(path.join(ROOT, 'dev-tools', 'build_feature_registry_inventory.cjs'));

const built = buildInventory();

describe('feature registry inventory', () => {
    // Test-file counts change with every new suite; they are reported in the
    // inventory but excluded from the freshness diff so adding a test never
    // demands a regenerate. Everything else must match byte for byte.
    const stripVolatile = (md) => md.split('\n').filter((line) => !/^(- Unit test files:|- End-to-end specs:|\| unitTestFiles \||\| e2eSpecs \|)/.test(line)).join('\n');
    const stripVolatileJson = (json) => {
        const copy = JSON.parse(JSON.stringify(json));
        delete copy.tests;
        delete copy.counts.unitTestFiles;
        delete copy.counts.e2eSpecs;
        return copy;
    };

    it('is current: the committed markdown and JSON equal a fresh regeneration', () => {
        expect(stripVolatile(fs.readFileSync(OUT_MD, 'utf8'))).toBe(stripVolatile(built.markdown));
        expect(stripVolatileJson(JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')))).toEqual(stripVolatileJson(built.json));
    });

    it('reads every registry (a parser returning nothing is a bug, not an empty feature)', () => {
        const c = built.json.counts;
        expect(c.commands).toBeGreaterThanOrEqual(150);
        expect(c.panels).toBeGreaterThanOrEqual(30);
        expect(c.resourceTypes).toBeGreaterThanOrEqual(20);
        expect(c.sidebarControls).toBeGreaterThanOrEqual(10);
        expect(c.stemTools).toBeGreaterThanOrEqual(140);
        expect(c.selTools).toBeGreaterThanOrEqual(60);
        expect(c.alloPacks).toBeGreaterThanOrEqual(50);
        expect(c.hubCards).toBeGreaterThanOrEqual(10);
        expect(c.appsScripts).toBe(6);
        expect(c.modules).toBeGreaterThanOrEqual(200);
        expect(c.langPacks).toBe(63);
        expect(c.unitTestFiles).toBeGreaterThanOrEqual(3000);
        expect(c.e2eSpecs).toBeGreaterThanOrEqual(300);
    });

    it('resolves names, not just ids, for the tool registries and the palette', () => {
        const named = (list) => list.filter((t) => t.name && t.name !== t.id).length / list.length;
        expect(named(built.json.stem)).toBeGreaterThan(0.9);
        expect(named(built.json.sel)).toBeGreaterThan(0.9);
        const labelled = built.json.commands.filter((c) => c.label).length / built.json.commands.length;
        expect(labelled).toBeGreaterThan(0.9);
        expect(built.json.commands.find((c) => c.id === 'open_report_writer')).toMatchObject({ opensPanel: 'reportWriter', roles: 'teacher' });
        expect(built.json.commands.find((c) => c.id === 'open_mind_map')).toMatchObject({ opensPanel: 'mindMap' });
        expect(built.json.stem.find((t) => t.id === 'kitchenlab').name).toMatch(/Kitchen Lab/);
        expect(built.json.sel.find((t) => t.id === 'howl').name).toMatch(/HOWL/);
    });

    it('records the things this repo is most often misquoted on', () => {
        const j = built.json;
        expect(j.resourceTypes).toContain('lesson-plan');
        expect(j.resourceTypes).toContain('math');
        expect(j.sidebar.find((s) => s.control === 'math_mode').options).toEqual(expect.arrayContaining(['Problem Set Generator', 'Spiral Review', 'Difficulty Ladder']));
        expect(j.exportFormats.office).toEqual(expect.arrayContaining(['docx', 'odt']));
        expect(j.exportFormats.drive).toEqual(expect.arrayContaining(['google-doc', 'google-form']));
        const mailbox = j.scripts.find((s) => s.script === 'session_mailbox');
        expect(mailbox.actions).toEqual(expect.arrayContaining(['deliver', 'deliverform', 'fetchpage']));
        expect(mailbox.scopes).toEqual(['drive.file', 'script.external_request']);
        expect(j.packs.every((p) => p.title)).toBe(true);
    });
});
