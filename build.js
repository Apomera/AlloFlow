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
const forceFlag = hasFlag('force');

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
        filename: 'stem_lab/stem_lab_module.js',
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
    },
    {
        name: 'SymbolStudio',
        filename: 'symbol_studio_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'GamesBundle',
        filename: 'games_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'SelHub',
        filename: 'sel_hub/sel_hub_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'QuickStartWizard',
        filename: 'quickstart_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AlloBot',
        filename: 'allobot_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'TeacherModule',
        filename: 'teacher_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'StoryForge',
        filename: 'story_forge_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    }
];

// Plugin files loaded via the setTimeout plugin loader (not loadModule)
// build.js updates their CDN hash in the pluginCdnBase variable
const PLUGIN_FILES = [
    'stem_lab/stem_tool_dna.js',
    'stem_lab/stem_tool_math.js',
    'stem_lab/stem_tool_unitconvert.js',
    'stem_lab/stem_tool_logiclab.js',
    'stem_lab/stem_tool_probability.js',
    'stem_lab/stem_tool_calculus.js',
    'stem_lab/stem_tool_science.js', 'stem_lab/stem_tool_galaxy.js',
    'stem_lab/stem_tool_creative.js',
    'stem_lab/stem_tool_art.js',
    'stem_lab/stem_tool_datastudio.js',
    'stem_lab/stem_tool_dataplot.js',
    'stem_lab/stem_tool_geo.js',
    'stem_lab/stem_tool_fractions.js',
    'stem_lab/stem_tool_manipulatives.js',
    'stem_lab/stem_tool_money.js',
    'stem_lab/stem_tool_coordgrid.js',
    'stem_lab/stem_tool_angles.js',
    'stem_lab/stem_tool_archstudio.js',
    'stem_lab/stem_tool_cyberdefense.js',
    'stem_lab/stem_tool_physics.js',
    'stem_lab/stem_tool_watercycle.js',
    'stem_lab/stem_tool_rocks.js',
    'stem_lab/stem_tool_dissection.js',
    'stem_lab/stem_tool_behaviorlab.js',
    'stem_lab/stem_tool_anatomy.js',
    'stem_lab/stem_tool_decomposer.js',
    'stem_lab/stem_tool_companionplanting.js',
    'stem_lab/stem_tool_aquarium.js',
    'stem_lab/stem_tool_ecosystem.js',
    'stem_lab/stem_tool_molecule.js',
    'stem_lab/stem_tool_solarsystem.js',
    'stem_lab/stem_tool_universe.js',
    'stem_lab/stem_tool_economicslab.js',
    'stem_lab/stem_tool_graphcalc.js',
    'stem_lab/stem_tool_algebraCAS.js',
    'stem_lab/stem_tool_circuit.js',
    'stem_lab/stem_tool_climateExplorer.js',
    'sel_hub/sel_tool_zones.js', 'sel_hub/sel_tool_emotions.js',
    'sel_hub/sel_tool_coping.js', 'sel_hub/sel_tool_mindfulness.js',
    'sel_hub/sel_tool_social.js',
    'sel_hub/sel_tool_perspective.js',
    'sel_hub/sel_tool_decisions.js',
    'sel_hub/sel_tool_conflict.js',
    'sel_hub/sel_tool_advocacy.js',
    'sel_hub/sel_tool_strengths.js',
    'sel_hub/sel_tool_goals.js',
    'sel_hub/sel_tool_community.js',
    'sel_hub/sel_tool_teamwork.js',
    'sel_hub/sel_tool_journal.js',
    'sel_hub/sel_tool_safety.js',
    'sel_hub/sel_tool_restorativecircle.js',
    'sel_hub/sel_tool_civicaction.js',
    'sel_hub/sel_tool_ethicalreasoning.js',
    'sel_hub/sel_tool_cultureexplorer.js'
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

    // ── Dirty-tree guard: block prod builds with uncommitted module files ──
    // The CDN serves files from the committed hash. If module files have
    // uncommitted changes, the CDN URLs will point to old code.
    if (!forceFlag) {
        try {
            const gitStatus = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' }).trim();
            if (gitStatus) {
                const allManagedFiles = MODULES.map(m => m.filename).concat(PLUGIN_FILES);
                const dirtyModules = [];
                gitStatus.split('\n').forEach(line => {
                    const filePath = line.substring(3).trim();
                    allManagedFiles.forEach(mf => {
                        if (filePath === mf || filePath.endsWith('/' + mf) || filePath.endsWith('\\' + mf)) {
                            dirtyModules.push(filePath);
                        }
                    });
                });
                if (dirtyModules.length > 0) {
                    console.error('');
                    console.error('❌ UNCOMMITTED MODULE FILES DETECTED — CDN will serve stale code!');
                    dirtyModules.forEach(f => console.error(`   Modified: ${f}`));
                    console.error('');
                    console.error('   The CDN hash @' + gitHash + ' does NOT contain these changes.');
                    console.error('   You MUST commit + push before running build.js --mode=prod.');
                    console.error('   Or use --force to skip this check.');
                    console.error('');
                    process.exit(1);
                }
            }
        } catch (e) {
            // git status failed — warn but don't block
            console.warn('⚠️  Could not check git status for uncommitted files: ' + e.message);
        }
    } else {
        console.warn('⚠️  --force flag: skipping uncommitted file check');
    }

    // ── Stale hash guard: block when explicit hash misses newer module commits ──
    // If you pass --hash=abc123 but modules were updated AFTER that commit,
    // the CDN will serve stale code. This catches exactly the bug where
    // `build.js --mode=prod --hash=OLD` skips a fix committed later.
    if (explicitHash && !forceFlag) {
        try {
            const allManagedFiles = MODULES.map(m => m.filename).concat(PLUGIN_FILES);
            const newerCommits = execSync(
                `git log --oneline ${explicitHash}..HEAD -- ${allManagedFiles.join(' ')}`,
                { cwd: ROOT, encoding: 'utf-8' }
            ).trim();
            if (newerCommits) {
                const lines = newerCommits.split('\n');
                console.error('');
                console.error('⚠️  STALE HASH — module files were updated AFTER @' + explicitHash + ':');
                lines.forEach(l => console.error('   ' + l));
                console.error('');
                console.error('   The CDN at @' + explicitHash + ' will serve OUTDATED module code.');
                console.error('   Run without --hash to auto-detect HEAD, or use --force to override.');
                console.error('');
                process.exit(1);
            }
        } catch (e) {
            console.warn('⚠️  Could not check for stale hash: ' + e.message);
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

    // NOTE: SW stamping moved to postbuild.js (runs AFTER CRA build copies public/sw.js → build/sw.js)

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
