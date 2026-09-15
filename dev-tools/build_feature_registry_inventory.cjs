#!/usr/bin/env node
'use strict';
/**
 * Feature registry inventory: what the app SAYS it has, read from its own
 * registries rather than from anyone's memory of it.
 *
 * FEATURE_INVENTORY.md is the hand-written narrative and goes stale between
 * audits. This generator walks the registries that must be edited for a feature
 * to exist at all (the command palette, the panel openers, the generation
 * dispatcher's resource types, the sidebar's <select> controls, the STEM and SEL
 * tool headers, the AlloPack files, the hub card lists, the Apps Scripts and
 * their manifests, the module build list, the language packs, the test suites)
 * and writes docs/FEATURE_REGISTRY_INVENTORY.md plus a JSON twin. A test
 * regenerates it and diffs, so it cannot drift from the code.
 *
 *   node dev-tools/build_feature_registry_inventory.cjs          # write both files
 *   node dev-tools/build_feature_registry_inventory.cjs --check  # exit 1 if stale
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_MD = path.join(ROOT, 'docs', 'FEATURE_REGISTRY_INVENTORY.md');
const OUT_JSON = path.join(ROOT, 'docs', 'feature_registry_inventory.json');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const listDir = (rel) => (exists(rel) ? fs.readdirSync(path.join(ROOT, rel)) : []);
const uniqSorted = (arr) => Array.from(new Set(arr)).sort();
const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();

// ---------------------------------------------------------------- commands
function parseCommands() {
    const src = read('allo_commands_source.jsx');
    const byId = new Map();
    const re = /\{\s*id:\s*'([a-z0-9_]+)'/g;
    let m;
    while ((m = re.exec(src))) {
        const id = m[1];
        const window = src.slice(m.index, m.index + 900);
        // label: t('key', 'X')  |  label: tx(ctx, 'key', 'X')  |  label: 'X'
        const label = (window.match(/label:\s*(?:tx?\(\s*(?:ctx\s*,\s*)?["'][a-z0-9_.]+["']\s*,\s*)?["']([^"']+)["']/) || [])[1] || '';
        const roles = (window.match(/roles:\s*'([a-z|,\s]+)'/) || [])[1] || '';
        const opensPanel = (window.match(/opensPanel:\s*["']([a-zA-Z]+)["']/) || [])[1] || '';
        const gated = /requiresCapabilities:/.test(window.slice(0, window.indexOf('label:') > 0 ? window.indexOf('label:') : 200));
        const entry = { id, label, roles, opensPanel, gated };
        const prev = byId.get(id);
        // The regex-parser table repeats ids without labels; keep the labelled one.
        if (!prev || (!prev.label && entry.label)) byId.set(id, entry);
    }
    return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function parsePanels(commands) {
    const panels = new Map();
    commands.forEach((c) => {
        if (!c.opensPanel) return;
        if (!panels.has(c.opensPanel)) panels.set(c.opensPanel, []);
        if (c.label) panels.get(c.opensPanel).push(c.label);
    });
    return Array.from(panels.entries()).sort(([a], [b]) => a.localeCompare(b))
        .map(([panel, labels]) => ({ panel, openers: uniqSorted(labels) }));
}

// ---------------------------------------------------------- resource types
function parseResourceTypes() {
    const src = read('generate_dispatcher_source.jsx');
    return uniqSorted(Array.from(src.matchAll(/type === '([a-z-]+)'/g), (x) => x[1]));
}

// ---------------------------------------------------------- sidebar selects
function parseSidebarSelects() {
    const src = read('view_sidebar_panels_source.jsx');
    const out = [];
    const re = /<select([^>]*)>([\s\S]*?)<\/select>/g;
    let m;
    while ((m = re.exec(src))) {
        const attrs = m[1];
        const body = m[2];
        const options = Array.from(body.matchAll(/<option\s+value="([^"]+)"/g), (x) => x[1]);
        if (options.length < 2) continue;
        const key = (attrs.match(/data-help-key="([^"]+)"/) || [])[1]
            || (attrs.match(/aria-label=\{t\('([^']+)'\)/) || [])[1]
            || (attrs.match(/aria-label="([^"]+)"/) || [])[1]
            || '';
        if (!key) continue;
        // Generic accessible names (common.selection) say nothing about the
        // control; key those by their first option instead so the row is legible.
        const control = /^common\./.test(key) ? `select (${options[0]}…)` : key;
        out.push({ control, options });
    }
    // Same control key can appear in more than one branch; merge option lists.
    const merged = new Map();
    out.forEach(({ control, options }) => {
        const prev = merged.get(control) || [];
        merged.set(control, uniqSorted(prev.concat(options)));
    });
    return Array.from(merged.entries()).sort(([a], [b]) => a.localeCompare(b))
        .map(([control, options]) => ({ control, options }));
}

// ------------------------------------------------------------- tool headers
// Tool files name themselves in their header comment, in several house styles:
//   // stem_tool_x.js — Name (…)        // stem_tool_X.js - Name (standalone CDN module)
//    * stem_tool_x.js — Name             // AlloFlow STEAM Lab - Name
//   // sel_tool_x.js · Name              // sel_tool_x.js  (name on the next line)
// Read the comment lines only, find the filename line (case-insensitive), take
// what follows the separator or the next comment line; else the "STEAM Lab -"
// line; else the first real comment line, flagged so a human can check it.
function parseHeaderTools(dir, prefix) {
    const BORDER = /^[\s=\-─═╌╍━┄┅·•*]*$/;
    const clean = (line) => line.replace(/^\s*(\/\*\*?|\*\/|\*|\/\/)\s?/, '').replace(/\*\/\s*$/, '').trim();
    const tidy = (s) => s.replace(/\s*\((?:standalone CDN module|v\d[^)]*)\)\s*$/i, '').replace(/\s+Plugin$/i, '').trim();
    return listDir(dir)
        .filter((f) => f.startsWith(prefix) && f.endsWith('.js'))
        .map((f) => {
            const id = f.slice(prefix.length, -3);
            const raw = fs.readFileSync(path.join(ROOT, dir, f), 'utf8').split('\n').slice(0, 16);
            const lines = raw.map(clean).filter((l) => l && !BORDER.test(l));
            const fileRe = new RegExp('^' + prefix + id + '\\.js\\b\\s*(?:[—–\\-·:]+\\s*)?(.*)$', 'i');
            let name = '';
            let nameSource = 'header';
            for (let i = 0; i < lines.length; i++) {
                const m = lines[i].match(fileRe);
                if (!m) continue;
                name = (m[1] || '').trim();
                if (!name && lines[i + 1]) name = lines[i + 1].split(/\s+[—–]\s+/)[0].trim();
                break;
            }
            if (!name) {
                const lab = lines.map((l) => l.match(/^AlloFlow STE?A?M Lab\s*[—–\-:]+\s*(.+)$/i)).find(Boolean);
                if (lab) name = lab[1].trim();
            }
            if (!name) {
                const first = lines.find((l) => !/^(Generated|Loaded|Version|Auto-extracted|Standalone plugin)/i.test(l) && !/^\(/.test(l));
                if (first) { name = first; nameSource = 'first-line'; }
            }
            name = tidy(name) || id;
            return { id, name, nameSource: name === id ? 'id' : nameSource };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------- AlloPacks
function parseAlloPacks() {
    return listDir('allopacks')
        .filter((f) => f.endsWith('.allopack.json'))
        .map((f) => {
            let pack = {};
            let sourceTopic = '';
            try {
                const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, 'allopacks', f), 'utf8'));
                pack = parsed.allopack || {};
                sourceTopic = parsed.sourceTopic || '';
            } catch (_) { /* unreadable pack still counts as a file */ }
            const standards = Array.isArray(pack.standards) ? pack.standards.join('; ') : String(pack.standards || '');
            return {
                file: f.replace(/\.allopack\.json$/, ''),
                title: String(pack.title || sourceTopic || ''),
                grade: String(pack.gradeLevel || ''),
                standards: standards.slice(0, 160),
            };
        })
        .sort((a, b) => a.file.localeCompare(b.file));
}

// ---------------------------------------------------------------- hub cards
// The Educator and Learning hubs declare their cards as DOM data attributes
// (the workflow-order test pins that order), so read those the same way.
function parseDataHubCards(hub, file) {
    if (!exists(file)) return null;
    const src = read(file);
    const cards = [];
    const re = /data-hub-id="([^"]+)"\s+data-hub-label="([^"]*)"/g;
    let m;
    while ((m = re.exec(src))) cards.push({ id: m[1], title: m[2] });
    return { hub, cards };
}

function parseHubCards() {
    const hubs = [
        { hub: 'Leadership Hub', file: 'admin_hub_source.jsx' },
        { hub: 'Research Hub', file: 'research_hub_source.jsx' },
        { hub: 'Test Prep Hub', file: 'test_prep_hub_source.jsx' },
    ];
    const dataHubs = [
        parseDataHubCards('Educator Hub', 'view_educator_hub_modal_source.jsx'),
        parseDataHubCards('Learning Hub', 'view_learning_hub_modal_source.jsx'),
    ].filter(Boolean);
    return dataHubs.concat(hubs.filter((h) => exists(h.file)).map((h) => {
        const src = read(h.file);
        const cards = [];
        const re = /\{\s*id:\s*'([a-zA-Z0-9_]+)'\s*,([^}]{0,200})/g;
        let m;
        while ((m = re.exec(src))) {
            // title: 'X'  |  title: t('key', 'X')  |  title: tt('key', 'X')
            const title = (m[2].match(/(?:title|label|name):\s*(?:tt?\(\s*['"][^'"]+['"]\s*,\s*)?['"]([^'"]{2,80})['"]/) || [])[1] || '';
            cards.push({ id: m[1], title });
        }
        const seen = new Map();
        cards.forEach((c) => { if (!seen.has(c.id) || (!seen.get(c.id).title && c.title)) seen.set(c.id, c); });
        return { hub: h.hub, cards: Array.from(seen.values()).sort((a, b) => a.id.localeCompare(b.id)) };
    }));
}

// ------------------------------------------------------------- Apps Scripts
function parseAppsScripts() {
    return listDir('apps_script').filter((d) => exists(path.join('apps_script', d, 'Code.gs'))).sort().map((d) => {
        const code = read(path.join('apps_script', d, 'Code.gs'));
        const actions = uniqSorted(Array.from(code.matchAll(/\ba === '([a-z_]+)'/g), (x) => x[1]));
        const version = (code.match(/var VERSION = (\d+);/) || [])[1] || '';
        let scopes = [];
        let access = '';
        const manifestPath = path.join('apps_script', d, 'appsscript.json');
        if (exists(manifestPath)) {
            try {
                const man = JSON.parse(read(manifestPath));
                scopes = (man.oauthScopes || []).map((s) => s.replace('https://www.googleapis.com/auth/', ''));
                access = man.webapp ? `${man.webapp.access} / ${man.webapp.executeAs}` : '';
            } catch (_) { /* leave empty */ }
        }
        return { script: d, version, actions, scopes, access, manifest: exists(manifestPath) };
    });
}

// ----------------------------------------------------------- export formats
function parseExportFormats() {
    const src = read('view_export_preview_source.jsx');
    const office = uniqSorted(Array.from(src.matchAll(/runOfficeExport\('([a-z]+)'\)/g), (x) => x[1]));
    const packages = uniqSorted(Array.from(src.matchAll(/runPackageExport\('([a-z0-9]+)'\)/g), (x) => x[1]));
    const primary = [];
    if (/action_download_html/.test(src)) primary.push('html');
    if (/action_print_pdf/.test(src)) primary.push('print-pdf');
    if (/action_export_slides/.test(src)) primary.push('pptx');
    const drive = [];
    if (/send to my Drive/i.test(src)) drive.push('google-doc');
    if (/deliverform/.test(src)) drive.push('google-form');
    return { primary, office, packages, drive };
}

// ------------------------------------------------------------------ modules
function parseModules() {
    const src = read('build.js');
    return uniqSorted(Array.from(src.matchAll(/filename:\s*'([a-z0-9_]+_module\.js)'/g), (x) => x[1]));
}

function parseLangPacks() {
    return listDir('lang').filter((f) => /^[a-z_]+\.js$/.test(f)).map((f) => f.slice(0, -3)).sort();
}

function countTests() {
    const unit = listDir('tests').filter((f) => /\.test\.(js|cjs|mjs|ts)$/.test(f)).length;
    const e2e = listDir(path.join('tests', 'e2e')).filter((f) => /\.spec\.(ts|js)$/.test(f)).length;
    return { unit, e2e };
}

// ------------------------------------------------------------------ build
function buildInventory() {
    const commands = parseCommands();
    const panels = parsePanels(commands);
    const resourceTypes = parseResourceTypes();
    const sidebar = parseSidebarSelects();
    const stem = parseHeaderTools('stem_lab', 'stem_tool_');
    const sel = parseHeaderTools('sel_hub', 'sel_tool_');
    const packs = parseAlloPacks();
    const hubs = parseHubCards();
    const scripts = parseAppsScripts();
    const exportFormats = parseExportFormats();
    const modules = parseModules();
    const langPacks = parseLangPacks();
    const tests = countTests();

    const json = {
        schema: 'feature-registry-inventory/v1',
        counts: {
            commands: commands.length, panels: panels.length, resourceTypes: resourceTypes.length,
            sidebarControls: sidebar.length, stemTools: stem.length, selTools: sel.length, alloPacks: packs.length,
            hubCards: hubs.reduce((n, h) => n + h.cards.length, 0), appsScripts: scripts.length,
            modules: modules.length, langPacks: langPacks.length, unitTestFiles: tests.unit, e2eSpecs: tests.e2e,
        },
        commands, panels, resourceTypes, sidebar, stem, sel, packs, hubs, scripts, exportFormats, modules, langPacks, tests,
    };

    const L = [];
    L.push('# AlloFlow feature registry inventory');
    L.push('');
    L.push('Generated by `dev-tools/build_feature_registry_inventory.cjs` from the registries a feature must be');
    L.push('registered in to exist. Regenerate after adding a command, panel, resource type, tool, pack, script or');
    L.push('module; `tests/feature_registry_inventory.test.js` fails when this file is stale. The hand-written');
    L.push('narrative lives in `FEATURE_INVENTORY.md`; this file is the count-and-name layer under it.');
    L.push('');
    L.push('## Summary');
    L.push('');
    L.push('| Registry | Count |');
    L.push('| --- | ---: |');
    Object.entries(json.counts).forEach(([k, v]) => L.push(`| ${k} | ${v} |`));
    L.push('');
    L.push('## Command palette');
    L.push('');
    L.push('Every user-reachable action has a palette entry. `roles` is who may run it; `opens` is the panel it launches.');
    L.push('');
    L.push('| id | label | roles | opens | gated |');
    L.push('| --- | --- | --- | --- | --- |');
    commands.forEach((c) => L.push(`| ${c.id} | ${esc(c.label)} | ${c.roles} | ${c.opensPanel} | ${c.gated ? 'yes' : ''} |`));
    L.push('');
    L.push('## Panels (surfaces a command can open)');
    L.push('');
    L.push('| panel | opened by |');
    L.push('| --- | --- |');
    panels.forEach((p) => L.push(`| ${p.panel} | ${esc(p.openers.join('; '))} |`));
    L.push('');
    L.push('## Generation dispatcher resource types');
    L.push('');
    L.push(resourceTypes.map((t) => `\`${t}\``).join(', '));
    L.push('');
    L.push('## Sidebar controls and their options');
    L.push('');
    L.push('| control | options |');
    L.push('| --- | --- |');
    sidebar.forEach((s) => L.push(`| ${esc(s.control)} | ${esc(s.options.join(', '))} |`));
    L.push('');
    L.push(`## STEM Lab tools (${stem.length})`);
    L.push('');
    L.push('| id | name |');
    L.push('| --- | --- |');
    stem.forEach((t) => L.push(`| ${t.id} | ${esc(t.name)} |`));
    L.push('');
    L.push(`## SEL Hub tools (${sel.length})`);
    L.push('');
    L.push('| id | name |');
    L.push('| --- | --- |');
    sel.forEach((t) => L.push(`| ${t.id} | ${esc(t.name)} |`));
    L.push('');
    L.push(`## AlloPacks (${packs.length})`);
    L.push('');
    L.push('| file | title | grade | standards |');
    L.push('| --- | --- | --- | --- |');
    packs.forEach((p) => L.push(`| ${p.file} | ${esc(p.title)} | ${esc(p.grade)} | ${esc(p.standards)} |`));
    L.push('');
    L.push('## Hub cards');
    L.push('');
    hubs.forEach((h) => {
        L.push(`### ${h.hub} (${h.cards.length})`);
        L.push('');
        L.push(h.cards.map((c) => (c.title ? `${c.id} (${esc(c.title)})` : c.id)).join(', '));
        L.push('');
    });
    L.push('## Apps Scripts (teacher- or district-owned)');
    L.push('');
    L.push('| script | version | web app | scopes | actions |');
    L.push('| --- | --- | --- | --- | --- |');
    scripts.forEach((s) => L.push(`| ${s.script} | ${s.version} | ${esc(s.access) || (s.manifest ? '' : 'no manifest')} | ${esc(s.scopes.join(', '))} | ${s.actions.length ? esc(s.actions.join(', ')) : '(portal, no wire actions)'} |`));
    L.push('');
    L.push('## Export formats (Document Builder)');
    L.push('');
    L.push(`- Primary: ${exportFormats.primary.join(', ')}`);
    L.push(`- Editable documents: ${exportFormats.office.join(', ')}`);
    L.push(`- Packages: ${exportFormats.packages.join(', ')}`);
    L.push(`- Google Drive (via the Class Mailbox): ${exportFormats.drive.join(', ')}`);
    L.push('');
    L.push(`## Language packs (${langPacks.length})`);
    L.push('');
    L.push(langPacks.join(', '));
    L.push('');
    L.push(`## CDN modules registered in build.js (${modules.length})`);
    L.push('');
    L.push(modules.join(', '));
    L.push('');
    L.push('## Tests');
    L.push('');
    L.push(`- Unit test files: ${tests.unit}`);
    L.push(`- End-to-end specs: ${tests.e2e}`);
    L.push('');
    return { markdown: L.join('\n'), json };
}

module.exports = { buildInventory, OUT_MD, OUT_JSON };

if (require.main === module) {
    const { markdown, json } = buildInventory();
    const check = process.argv.includes('--check');
    if (check) {
        const current = fs.existsSync(OUT_MD) ? fs.readFileSync(OUT_MD, 'utf8') : '';
        if (current !== markdown) {
            console.error('feature registry inventory is STALE; run: node dev-tools/build_feature_registry_inventory.cjs');
            process.exit(1);
        }
        console.log('feature registry inventory is current');
        process.exit(0);
    }
    fs.writeFileSync(OUT_MD, markdown, 'utf8');
    fs.writeFileSync(OUT_JSON, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log('Wrote', path.relative(ROOT, OUT_MD), 'and', path.relative(ROOT, OUT_JSON));
    console.log(JSON.stringify(json.counts));
}
