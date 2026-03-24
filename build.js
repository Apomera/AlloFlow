#!/usr/bin/env node
/**
 * AlloFlow Build Script
 * 
 * Transforms AlloFlowANTI.txt → prismflow-deploy/src/App.jsx
 * with automatic CDN hash management.
 *
 * Usage:
 *   node build.js --mode=dev     Load modules from local paths (for npm start)
 *   node build.js --mode=prod    Load modules from CDN with auto-detected git hash
 *   node build.js --mode=prod --hash=abc1234   Use a specific hash
 *
 * What it does:
 *   1. Reads AlloFlowANTI.txt
 *   2. Finds all loadModule(...) CDN URLs
 *   3. Replaces them with local paths (dev) or hashed CDN URLs (prod)
 *   4. Writes the result to prismflow-deploy/src/App.jsx
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Parse CLI args ──────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
    const match = args.find(a => a.startsWith(`--${name}=`));
    return match ? match.split('=')[1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const mode = getArg('mode') || 'dev';
const explicitHash = getArg('hash');
const dryRun = hasFlag('dry-run');

if (!['dev', 'prod'].includes(mode)) {
    console.error('❌ Invalid mode. Use --mode=dev or --mode=prod');
    process.exit(1);
}

// ── Paths ───────────────────────────────────────────────────────
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'AlloFlowANTI.txt');
const OUTPUT = path.join(ROOT, 'prismflow-deploy', 'src', 'App.jsx');
const BACKUP = path.join(ROOT, 'prismflow-deploy', 'src', 'AlloFlowANTI.txt');

// ── Module definitions ──────────────────────────────────────────
// Each module: { name, filename, cdnTemplate }
const MODULES = [
    {
        name: 'StemLab',
        filename: 'stem_lab_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'WordSoundsModal',
        filename: 'word_sounds_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'BehaviorLens',
        filename: 'behavior_lens_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ReportWriter',
        filename: 'report_writer_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'StudentAnalytics',
        filename: 'student_analytics_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    }
];

// Plugin files loaded via the setTimeout plugin loader (not loadModule)
// build.js updates their CDN hash in the pluginCdnBase variable
const PLUGIN_FILES = [
    'stem_tool_dna.js',
    'stem_tool_math.js',
    'stem_tool_science.js',
    'stem_tool_creative.js',
    'stem_tool_geo.js',
    'stem_tool_fractions.js',
    'stem_tool_manipulatives.js',
    'stem_tool_money.js'
];

// ── Read source ─────────────────────────────────────────────────
if (!fs.existsSync(SOURCE)) {
    console.error(`❌ Source file not found: ${SOURCE}`);
    process.exit(1);
}

let content = fs.readFileSync(SOURCE, 'utf-8');
const originalContent = content;

// ── Regex to match loadModule calls with CDN or local URLs ──────
// Matches: loadModule('StemLab', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@HASH/stem_lab_module.js')
// Also matches local paths like: loadModule('StemLab', './stem_lab_module.js')
const LOAD_MODULE_RE = /loadModule\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;

// ── Get git hash for prod mode ──────────────────────────────────
let gitHash = null;
if (mode === 'prod') {
    if (explicitHash) {
        gitHash = explicitHash;
        console.log(`📌 Using explicit hash: ${gitHash}`);
    } else {
        try {
            gitHash = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf-8' }).trim();
            console.log(`🔍 Auto-detected git hash: ${gitHash}`);
        } catch (e) {
            console.error('❌ Could not determine git hash. Pass --hash=<hash> or run from within the git repo.');
            process.exit(1);
        }
    }
}

// ── Transform URLs ──────────────────────────────────────────────
let replacementCount = 0;

content = content.replace(LOAD_MODULE_RE, (match, moduleName, currentUrl) => {
    const moduleDef = MODULES.find(m => m.name === moduleName);
    if (!moduleDef) {
        // Not one of our managed modules — leave unchanged
        return match;
    }

    let newUrl;
    if (mode === 'dev') {
        // Point to local file for hot-reloading during development
        newUrl = `./${moduleDef.filename}`;
    } else {
        // Production: CDN URL with git hash
        newUrl = `${moduleDef.cdnBase}@${gitHash}/${moduleDef.filename}`;
    }

    replacementCount++;
    const oldShort = currentUrl.length > 60 ? '...' + currentUrl.slice(-50) : currentUrl;
    const newShort = newUrl.length > 60 ? '...' + newUrl.slice(-50) : newUrl;
    console.log(`  ✏️  ${moduleName}: ${oldShort}`);
    console.log(`  →  ${newShort}`);

    return `loadModule('${moduleName}', '${newUrl}')`;
});

// ── Transform plugin loader CDN base ────────────────────────────
// Matches: var pluginCdnBase = 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@HASH/';
const PLUGIN_CDN_RE = /var\s+pluginCdnBase\s*=\s*'https:\/\/cdn\.jsdelivr\.net\/gh\/Apomera\/AlloFlow@[^/]+\//;
let pluginReplaced = false;

if (mode === 'dev') {
    // In dev mode, plugins load from local paths
    content = content.replace(PLUGIN_CDN_RE, () => {
        pluginReplaced = true;
        console.log('  ✏️  pluginCdnBase: → local (./)'); 
        return "var pluginCdnBase = './";
    });
} else {
    content = content.replace(PLUGIN_CDN_RE, () => {
        pluginReplaced = true;
        const newBase = `https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@${gitHash}/`;
        console.log(`  ✏️  pluginCdnBase: → @${gitHash}`);
        return `var pluginCdnBase = '${newBase}`;
    });
}

if (pluginReplaced) {
    replacementCount++;
    console.log(`  📦 Plugin files managed: ${PLUGIN_FILES.join(', ')}`);
}

// ── Summary ─────────────────────────────────────────────────────
if (replacementCount === 0) {
    console.warn('⚠️  No loadModule() calls were matched. Check AlloFlowANTI.txt for the expected pattern.');
} else {
    console.log(`\n✅ Replaced ${replacementCount} module URL(s) for ${mode.toUpperCase()} mode`);
}

// ── Write output ────────────────────────────────────────────────
if (dryRun) {
    console.log('\n🔍 Dry run — no files written.');
} else {
    // Ensure output directory exists
    const outDir = path.dirname(OUTPUT);
    if (!fs.existsSync(outDir)) {
        console.error(`❌ Output directory not found: ${outDir}`);
        process.exit(1);
    }

    fs.writeFileSync(OUTPUT, content, 'utf-8');
    console.log(`📄 Written: ${path.relative(ROOT, OUTPUT)}`);

    // Also write backup copy
    fs.writeFileSync(BACKUP, content, 'utf-8');
    console.log(`📄 Backup:  ${path.relative(ROOT, BACKUP)}`);

    // ── Write hashes back to root AlloFlowANTI.txt (prod only) ──
    // Keeps the root source-of-truth file in sync with deployed CDN hashes.
    if (mode === 'prod') {
        fs.writeFileSync(SOURCE, content, 'utf-8');
        console.log(`📄 Source:  ${path.relative(ROOT, SOURCE)} (updated with @${gitHash})`);
    }

    // ── Stamp service worker with build timestamp ───────────────
    const SW_SOURCE = path.join(ROOT, 'prismflow-deploy', 'public', 'sw.js');
    if (fs.existsSync(SW_SOURCE)) {
        const buildTs = Date.now();
        let swContent = fs.readFileSync(SW_SOURCE, 'utf-8');
        swContent = swContent.replace('__BUILD_TS__', String(buildTs));
        // Write stamped sw.js directly — CRA copies public/ to build/ as-is,
        // but we also write to build/ in case the build already ran
        const SW_BUILD = path.join(ROOT, 'prismflow-deploy', 'build', 'sw.js');
        if (fs.existsSync(path.dirname(SW_BUILD))) {
            fs.writeFileSync(SW_BUILD, swContent, 'utf-8');
        }
        console.log(`🔧 SW stamped: CACHE_NAME = 'alloflow-v${buildTs}'`);
    }

    // Show next steps
    console.log('\n── Next Steps ──');
    if (mode === 'dev') {
        console.log('  Run: cd prismflow-deploy && npm start');
        console.log('  ⚠️  Make sure stem_lab_module.js and word_sounds_module.js');
        console.log('     are available in prismflow-deploy/public/ or served locally.');
    } else {
        console.log('  1. cd prismflow-deploy && npm run build');
        console.log('  2. npx firebase deploy --only hosting');
        console.log(`  3. Commit updated AlloFlowANTI.txt with hash @${gitHash}`);
    }
}
