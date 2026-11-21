// FEATURE_INVENTORY.md is the hand-written narrative; the registry layer
// (docs/FEATURE_REGISTRY_INVENTORY.md) is generated and cannot drift, but the
// narrative can silently miss whole tools: the 2026-11-20 audit found 33 of 72
// SEL tools and 5 STEM tools never mentioned. This suite turns "the narrative
// forgot a tool" into a CI failure. A tool counts as covered when the narrative
// names its file id (e.g. `windowoftolerance` or sel_tool_windowoftolerance.js),
// case-insensitively, or its display name from the registry.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { buildInventory } = require(path.join(ROOT, 'dev-tools', 'build_feature_registry_inventory.cjs'));

const narrative = fs.readFileSync(path.join(ROOT, 'FEATURE_INVENTORY.md'), 'utf8').toLowerCase();
const { json } = buildInventory();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const displayName = (name) => String(name || '').split(/\s[—–-]\s|:|\(/)[0].trim().toLowerCase();

function isCovered(tool) {
    const id = tool.id.toLowerCase();
    if (new RegExp('(^|[^a-z0-9_])' + escapeRe(id) + '([^a-z0-9_]|$)').test(narrative)) return true;
    const name = displayName(tool.name);
    return name.length >= 4 && name !== id && narrative.includes(name);
}

describe('FEATURE_INVENTORY.md names every tool', () => {
    it('mentions every STEM Lab tool', () => {
        expect(json.stem.length).toBeGreaterThanOrEqual(140);
        expect(json.stem.filter((t) => !isCovered(t)).map((t) => t.id)).toEqual([]);
    });

    it('mentions every SEL Hub tool', () => {
        expect(json.sel.length).toBeGreaterThanOrEqual(60);
        expect(json.sel.filter((t) => !isCovered(t)).map((t) => t.id)).toEqual([]);
    });

    it('quotes the current STEM and SEL totals in its snapshot callout', () => {
        expect(narrative).toContain(`${json.counts.stemTools} stem`);
        expect(narrative).toContain(`${json.counts.selTools} sel`);
    });
});
