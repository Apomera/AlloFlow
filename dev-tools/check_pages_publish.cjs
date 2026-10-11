'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const acorn = require('acorn');
const { SaxesParser } = require('saxes');
const { parse } = require('parse5');

const ROOT = path.resolve(__dirname, '..');
const SITE = new URL('https://apomera.github.io/AlloFlow/');
const BUDGET_BYTES = 900_000_000;

function loadConfig(root = ROOT) {
    // JSON is valid YAML; the restricted form also keeps the audit dependency-free.
    const config = JSON.parse(fs.readFileSync(path.join(root, '_config.yml'), 'utf8'));
    for (const field of ['include', 'exclude']) {
        if (!Array.isArray(config[field]) || config[field].some(value => typeof value !== 'string')) {
            throw new Error(`_config.yml ${field} must be a string array`);
        }
    }
    return config;
}

function globRegex(pattern) {
    if (/[?\[\]{}!]/.test(pattern)) throw new Error(`Unsupported publication glob: ${pattern}`);
    let source = '';
    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === '*') source += '.*';
        else source += pattern[i].replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
    }
    // Jekyll 3.10 EntryFilter uses fnmatch without PATHNAME, or a literal prefix.
    const literal = pattern.replace(/[\\^$.*+?()|[\]{}]/g, '\\$&');
    return new RegExp(`^(?:${source}$|${literal})`);
}

function publicationPredicate(config) {
    const excludes = config.exclude.map(globRegex);
    const includes = config.include.map(globRegex);
    return file => {
        const normalized = file.replace(/\\/g, '/');
        if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) return false;
        const parts = normalized.split('/');
        for (let index = 0; index < parts.length; index++) {
            const entry = parts[index];
            const relative = parts.slice(0, index + 1).join('/');
            if (includes.some(pattern => pattern.test(entry))) continue;
            if (/^[_.#~]/.test(entry) || entry.endsWith('~') || excludes.some(pattern => pattern.test(relative))) return false;
        }
        return true;
    };
}

function localTarget(file, reference) {
    if (!reference || /^(?:#|data:|blob:|javascript:|mailto:|tel:)/i.test(reference)) return null;
    const url = new URL(reference, new URL(file, SITE));
    if (url.origin !== SITE.origin) return null;
    if (!url.pathname.startsWith(SITE.pathname)) throw new Error(`${file}: URL escapes project site: ${reference}`);
    const target = decodeURIComponent(url.pathname.slice(SITE.pathname.length));
    if (target.startsWith('/') || target.includes('\\') || target.split('/').includes('..')) {
        throw new Error(`${file}: URL escapes project site: ${reference}`);
    }
    return target.endsWith('/') || !target ? target + 'index.html' : target;
}

function staticString(node) {
    if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
    if (node?.type === 'BinaryExpression' && node.operator === '+') {
        const left = staticString(node.left);
        const right = staticString(node.right);
        if (left !== null && right !== null) return left + right;
        return left !== null && /[?#]/.test(left) ? left : null;
    }
    if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
    return null;
}

function scriptReferences(source) {
    const references = [];
    const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
    const visit = node => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' ||
            (node.type === 'ExportNamedDeclaration' && node.source)) references.push(node.source.value);
        if (node.type === 'ImportExpression') {
            const value = staticString(node.source);
            if (value) references.push(value);
        }
        if (node.type === 'CallExpression' &&
            (node.callee?.name === 'fetch' || node.callee?.property?.name === 'fetch')) {
            const value = staticString(node.arguments[0]);
            if (value) references.push(value);
        }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(visit);
            else if (value && typeof value === 'object') visit(value);
        }
    };
    visit(ast);
    return references;
}

function htmlReferences(source) {
    const references = [];
    const scripts = [];
    const visit = node => {
        if (node.attrs) {
            const attributes = Object.fromEntries(node.attrs.map(attribute => [attribute.name, attribute.value]));
            for (const name of ['href', 'src', 'poster', 'data-search-index']) {
                if (attributes[name]) references.push(attributes[name]);
            }
            if (attributes.srcset) {
                for (const item of attributes.srcset.split(',')) references.push(item.trim().split(/\s+/)[0]);
            }
            if (node.tagName === 'meta' && /^(?:og:image|twitter:image)$/.test(attributes.property || attributes.name || '')) {
                references.push(attributes.content);
            }
            if (node.tagName === 'script' && !attributes.src &&
                (!attributes.type || /^(?:module|text\/javascript|application\/javascript)$/.test(attributes.type))) {
                scripts.push(node.childNodes.map(child => child.value || '').join(''));
            }
        }
        for (const child of node.childNodes || []) visit(child);
        if (node.content) visit(node.content);
    };
    visit(parse(source));
    return { references, scripts };
}

function sitemapReferences(source) {
    const references = [];
    const parser = new SaxesParser({ xmlns: true });
    let location = null;
    parser.on('opentag', tag => { if (tag.local === 'loc') location = ''; });
    parser.on('text', text => { if (location !== null) location += text; });
    parser.on('closetag', tag => {
        if (tag.local === 'loc') { references.push(location.trim()); location = null; }
    });
    parser.write(source).close();
    return references;
}

function requiredPublication(root = ROOT, config = loadConfig(root), onFile = () => {}) {
    const published = publicationPredicate(config);
    const errors = [];
    const required = new Set(['sitemap.xml', 'robots.txt', 'release.json', 'guide/search-index.json']);
    const queue = [];
    const visited = new Set();
    const requireReference = (file, reference) => {
        let target;
        try { target = localTarget(file, reference); }
        catch (error) { errors.push(error.message); return; }
        if (!target) return;
        const absolute = path.join(root, target);
        if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) target += '/index.html';
        required.add(target);
        if (/\.(?:html|css|js)$/.test(target)) queue.push(target);
    };
    for (const reference of sitemapReferences(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'))) requireReference('index.html', reference);
    // Include the complete generated guide even if a chapter temporarily drops from navigation.
    for (const name of fs.readdirSync(path.join(root, 'guide'))) if (name.endsWith('.html')) queue.push(`guide/${name}`);
    while (queue.length) {
        const file = queue.shift();
        if (visited.has(file)) continue;
        visited.add(file);
        required.add(file);
        const absolute = path.join(root, file);
        if (!fs.existsSync(absolute) || !published(file)) continue;
        onFile(file);
        const source = fs.readFileSync(absolute, 'utf8');
        if (file.endsWith('.html')) {
            const page = htmlReferences(source);
            page.references.forEach(reference => requireReference(file, reference));
            for (const script of page.scripts) {
                try { scriptReferences(script).forEach(reference => requireReference(file, reference)); }
                catch (error) { errors.push(`${file}: inline script: ${error.message}`); }
            }
        } else if (file.endsWith('.js')) {
            try { scriptReferences(source).forEach(reference => requireReference(file, reference)); }
            catch (error) { errors.push(`${file}: ${error.message}`); }
        } else {
            for (const match of source.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) requireReference(file, match[1]);
        }
    }
    for (const file of required) {
        if (!published(file)) errors.push(`${file}: required promotion dependency is excluded`);
        if (!fs.existsSync(path.join(root, file))) errors.push(`${file}: required promotion dependency is missing`);
    }
    return { required: [...required].sort(), errors: [...new Set(errors)] };
}

function publicationInventory(root = ROOT, config = loadConfig(root)) {
    const published = publicationPredicate(config);
    const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 64_000_000 }).toString().split('\0').filter(Boolean);
    const files = tracked.filter(published);
    let bytes = 0;
    const errors = [];
    for (const file of files) {
        const absolute = path.join(root, file);
        if (!fs.existsSync(absolute)) { errors.push(`${file}: selected tracked file is missing`); continue; }
        const stat = fs.lstatSync(absolute);
        if (stat.isSymbolicLink()) errors.push(`${file}: Pages artifact must not include a symbolic link`);
        else if (stat.isFile()) {
            if (stat.nlink > 1) errors.push(`${file}: Pages artifact must not include a hard link`);
            bytes += stat.size;
        }
    }
    if (bytes > BUDGET_BYTES) errors.push(`Publication source is ${bytes} bytes, above the ${BUDGET_BYTES}-byte budget`);
    return { files, bytes, excludedFileCount: tracked.length - files.length, errors };
}

function checkPublication(root = ROOT, onFile) {
    const config = loadConfig(root);
    const inventory = publicationInventory(root, config);
    const dependencies = requiredPublication(root, config, onFile);
    return {
        bytes: inventory.bytes,
        budgetBytes: BUDGET_BYTES,
        publishedFileCount: inventory.files.length,
        excludedFileCount: inventory.excludedFileCount,
        requiredFileCount: dependencies.required.length,
        errors: [...inventory.errors, ...dependencies.errors]
    };
}

module.exports = { BUDGET_BYTES, loadConfig, globRegex, publicationPredicate, localTarget, scriptReferences, htmlReferences, sitemapReferences, requiredPublication, publicationInventory, checkPublication };

if (require.main === module) {
    const result = checkPublication(ROOT, process.argv.includes('--verbose') ? file => console.error(file) : undefined);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.errors.length ? 1 : 0;
}
