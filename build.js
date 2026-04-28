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
        name: 'AlloData',
        filename: 'allo_data_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PromptsLibraryModule',
        filename: 'prompts_library_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'TextPipelineHelpersModule',
        filename: 'text_pipeline_helpers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AdaptiveControllerModule',
        filename: 'adaptive_controller_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'UdlChatModule',
        filename: 'udl_chat_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AdventureHandlersModule',
        filename: 'adventure_handlers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'GlossaryHelpersModule',
        filename: 'glossary_helpers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewRenderersModule',
        filename: 'view_renderers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AudioHelpersModule',
        filename: 'audio_helpers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'GenerationHelpersModule',
        filename: 'generation_helpers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'MiscHandlersModule',
        filename: 'misc_handlers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PureHelpersModule',
        filename: 'pure_helpers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'MathHelpersModule',
        filename: 'math_helpers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'CmapHandlersModule',
        filename: 'concept_map_handlers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'GenDispatcherModule',
        filename: 'generate_dispatcher_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PhaseKHelpersModule',
        filename: 'phase_k_helpers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AdventureSessionHandlersModule',
        filename: 'adventure_session_handlers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'TextUtilityHelpersModule',
        filename: 'text_utility_helpers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewDbqModule',
        filename: 'view_dbq_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ExportHandlersModule',
        filename: 'export_handlers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'LargeFileModule',
        filename: 'large_file_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'KeyConceptMapModule',
        filename: 'key_concept_map_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'UtilsPure',
        filename: 'utils_pure_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'MiscComponents',
        filename: 'misc_components_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'RemediationAudio',
        filename: 'remediation_audio_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
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
    },
    {
        name: 'LitLab',
        filename: 'story_stage_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'VisualPanelModule',
        filename: 'visual_panel_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'WordSoundsSetupModule',
        filename: 'word_sounds_setup_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AdventureModule',
        filename: 'adventure_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'TimelineRevisionModule',
        filename: 'timeline_revision_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'StudentInteractionModule',
        filename: 'student_interaction_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'MathFluency',
        filename: 'math_fluency_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'UIModalsModule',
        filename: 'ui_modals_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ImmersiveReaderModule',
        filename: 'immersive_reader_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PersonaUIModule',
        filename: 'persona_ui_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'DocPipelineModule',
        filename: 'doc_pipeline_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ContentEngineModule',
        filename: 'content_engine_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'GeminiAPI',
        filename: 'gemini_api_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'TTS',
        filename: 'tts_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'Personas',
        filename: 'personas_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'Export',
        filename: 'export_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    }
];

// Plugin files loaded via the setTimeout plugin loader (not loadModule)
// build.js updates their CDN hash in the pluginCdnBase variable
const PLUGIN_FILES = [
    'stem_lab/stem_tool_dna.js',
    'stem_lab/stem_tool_unitconvert.js',
    'stem_lab/stem_tool_logiclab.js',
    'stem_lab/stem_tool_probability.js',
    'stem_lab/stem_tool_calculus.js',
    'stem_lab/stem_tool_galaxy.js',
    'stem_lab/stem_tool_datastudio.js',
    'stem_lab/stem_tool_dataplot.js',
    'stem_lab/stem_tool_geo.js',
    'stem_lab/stem_tool_fractions.js',
    'stem_lab/stem_tool_manipulatives.js',
    'stem_lab/stem_tool_money.js',
    'stem_lab/stem_tool_coordgrid.js',
    'stem_lab/stem_tool_angles.js',
    'stem_lab/stem_tool_archstudio.js',
    'stem_lab/stem_tool_geometryworld.js',
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
    'stem_lab/stem_tool_a11yauditor.js',
    'stem_lab/stem_tool_worldbuilder.js',
    'stem_lab/stem_tool_flightsim.js',
    'stem_lab/stem_tool_atctower.js',
    'stem_lab/stem_tool_music.js',
    'stem_lab/stem_tool_climateExplorer.js',
    'stem_lab/stem_tool_fireecology.js',
    'stem_lab/stem_tool_moonmission.js',
    'stem_lab/stem_tool_beehive.js',
    'stem_lab/stem_tool_spacecolony.js',
    'stem_lab/stem_tool_spaceexplorer.js',
    'stem_lab/stem_tool_areamodel.js',
    'stem_lab/stem_tool_artstudio.js',
    'stem_lab/stem_tool_brainatlas.js',
    'stem_lab/stem_tool_cell.js',
    'stem_lab/stem_tool_chembalance.js',
    'stem_lab/stem_tool_coding.js',
    'stem_lab/stem_tool_epidemic.js',
    'stem_lab/stem_tool_funcgrapher.js',
    'stem_lab/stem_tool_gamestudio.js',
    'stem_lab/stem_tool_geosandbox.js',
    'stem_lab/stem_tool_inequality.js',
    'stem_lab/stem_tool_lifeskills.js',
    'stem_lab/stem_tool_echolocation.js',
    'stem_lab/stem_tool_multtable.js',
    'stem_lab/stem_tool_numberline.js',
    'stem_lab/stem_tool_platetectonics.js',
    'stem_lab/stem_tool_punnett.js',
    'stem_lab/stem_tool_semiconductor.js',
    'stem_lab/stem_tool_titration.js',
    'stem_lab/stem_tool_volume.js',
    'stem_lab/stem_tool_wave.js',
    'stem_lab/stem_tool_oratory.js',
    'stem_lab/stem_tool_singing.js',
    'stem_lab/stem_tool_applab.js',
    'stem_lab/stem_tool_migration.js',
    'stem_lab/stem_tool_echotrainer.js',
    'stem_lab/stem_tool_bakingscience.js',
    'stem_lab/stem_tool_allobotsage.js',
    'stem_lab/stem_tool_skatelab.js',
    'sel_hub/sel_safety_layer.js',  // MUST load before any sel_tool_*.js
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
    'sel_hub/sel_tool_cultureexplorer.js',
    'sel_hub/sel_tool_growthmindset.js',
    'sel_hub/sel_tool_transitions.js',
    'sel_hub/sel_tool_friendship.js',
    'sel_hub/sel_tool_compassion.js',
    'sel_hub/sel_tool_upstander.js'
];

// ── Source → Module compilation ─────────────────────────────────
// Each pair below describes a *_source.jsx ↔ *_module.js mapping. The compiler
// reads source, wraps it in the module's specific IIFE + registration, writes
// the module file (+ copies to prismflow-deploy/public), and syntax-checks it.
//
// Currently implemented for doc_pipeline only (source has no JSX — a simple
// cat+wrap). JSX-bearing modules (games, teacher, etc.) need Babel and will
// be added in a follow-up pass.
//
// Runs automatically at the start of `--mode=prod` so the dirty-tree guard
// below will catch any compilation-produced changes that weren't committed.
// Run `node build.js --compile` standalone to just do the compile step.
// Lazy-loaded Babel handle — only required if a JSX-bearing pair is compiled.
// Keeps the common --mode=prod path fast when no JSX modules are enrolled yet.
let _babel = null;
function getBabel() {
    if (_babel) return _babel;
    try { _babel = require('@babel/core'); }
    catch (e) { console.error('❌ @babel/core is required for JSX compilation but is not installed.'); process.exit(1); }
    return _babel;
}

function compileJsx(src) {
    const babel = getBabel();
    const r = babel.transformSync(src, {
        plugins: ['@babel/plugin-transform-react-jsx'], // classic runtime → React.createElement output
        configFile: false,
        babelrc: false,
    });
    return r.code;
}

const COMPILE_PAIRS = [
    {
        name: 'DocPipeline',
        srcPath: path.join(ROOT, 'doc_pipeline_source.jsx'),
        modPath: path.join(ROOT, 'doc_pipeline_module.js'),
        publicPath: path.join(ROOT, 'prismflow-deploy', 'public', 'doc_pipeline_module.js'),
        wrap(src) {
            // Idempotency guard + IIFE. Source.jsx already contains its own
            // window.AlloModules registration, so the footer only needs to close
            // the IIFE. Matches the hand-compiled output users have been producing.
            // Match the bash one-liner output byte-for-byte so recompiling an
            // already-compiled module produces no diff. Source.jsx typically
            // ends with its own trailing newline; we just append the footer.
            const trailingNewline = src.endsWith('\n') ? '' : '\n';
            return (
                '(function(){"use strict";\n'
                + 'if(window.AlloModules&&window.AlloModules.DocPipelineModule){console.log("[CDN] DocPipelineModule already loaded");return;}\n'
                + src + trailingNewline
                + '\n'
                + 'window.AlloModules = window.AlloModules || {};\n'
                + 'window.AlloModules.createDocPipeline = createDocPipeline;\n'
                + 'window.AlloModules.DocPipelineModule = true;\n'
                + "console.log('[DocPipelineModule] Pipeline factory registered');\n"
                + '})();\n'
            );
        },
    },
    {
        // ── persona_ui ── JSX-bearing module, verified zero-diff vs deployed module.js after
        // the April 2026 WCAG back-port (slate-500→600 + text-[10px]→[11px]). First JSX module
        // onboarded to Phase 2 auto-compile. To add more modules, verify `_phase2_diff_audit.js`
        // reports PERFECT for that module after any needed source back-ports, then add an
        // entry here with the module's specific wrapper.
        name: 'PersonaUI',
        srcPath: path.join(ROOT, 'persona_ui_source.jsx'),
        modPath: path.join(ROOT, 'persona_ui_module.js'),
        publicPath: path.join(ROOT, 'prismflow-deploy', 'public', 'persona_ui_module.js'),
        wrap(src) {
            const compiled = compileJsx(src);
            return (
                '(function() {\n'
                + "'use strict';\n"
                + '  // WCAG 2.1 AA: Accessibility CSS\n'
                + '  if (!document.getElementById("persona-ui-module-a11y")) { var _s = document.createElement("style"); _s.id = "persona-ui-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }"; document.head.appendChild(_s); }\n'
                + "if (window.AlloModules && window.AlloModules.PersonaUIModule) { console.log('[CDN] PersonaUIModule already loaded, skipping'); return; }\n"
                + compiled
                + '\n})();\n'
            );
        },
    },
    {
        // ── gemini_api ── Pure HTTP wrappers for Gemini text/vision/image-edit calls.
        // Factory pattern: createGeminiAPI({apiKey, GEMINI_MODELS, fetchWithExponentialBackoff,
        // optimizeImage, warnLog, debugLog, _isCanvasEnv, getAbortSignal}) -> {callGemini,
        // callGeminiImageEdit, callGeminiVision}. No React state, no module-level mutable state.
        name: 'GeminiAPI',
        srcPath: path.join(ROOT, 'gemini_api_source.jsx'),
        modPath: path.join(ROOT, 'gemini_api_module.js'),
        publicPath: path.join(ROOT, 'prismflow-deploy', 'public', 'gemini_api_module.js'),
        wrap(src) {
            const compiled = compileJsx(src);
            return (
                '(function() {\n'
                + "'use strict';\n"
                + "if (window.AlloModules && window.AlloModules.GeminiAPI) { console.log('[CDN] GeminiAPI already loaded, skipping'); return; }\n"
                + compiled
                + '\n})();\n'
            );
        },
    },
    {
        // ── tts ── Text-to-speech orchestration: fetchTTSBytes + callTTS + callTTSDirect.
        // Factory pattern: createTTS({state, apiKey, GEMINI_MODELS, AVAILABLE_VOICES,
        // _isCanvasEnv, pcmToWav, languageToTTSCode, isGlobalMuted, warnLog, debugLog,
        // getLeveledTextLanguage, getCurrentUiLanguage, getAiUserConfig, getAi,
        // setShowKokoroOfferModal}) -> {fetchTTSBytes, callTTS, callTTSDirect}.
        // Module-level state (queue/botQueue/urlCache/rateLimitedUntil) passed by reference
        // so window.__clearAlloTtsCacheForWord in monolith can still touch the same cache.
        name: 'TTS',
        srcPath: path.join(ROOT, 'tts_source.jsx'),
        modPath: path.join(ROOT, 'tts_module.js'),
        publicPath: path.join(ROOT, 'prismflow-deploy', 'public', 'tts_module.js'),
        wrap(src) {
            const compiled = compileJsx(src);
            return (
                '(function() {\n'
                + "'use strict';\n"
                + "if (window.AlloModules && window.AlloModules.TTS) { console.log('[CDN] TTS already loaded, skipping'); return; }\n"
                + compiled
                + '\n})();\n'
            );
        },
    },
    {
        // ── personas ── Historical character interview subsystem (16 handlers).
        // Pairs with persona_ui_module.js (which handles presentational components).
        // Factory: createPersonas({liveRef, warnLog, debugLog, cleanJson, safeJsonParse,
        // fisherYatesShuffle, SafetyContentChecker}) -> {16 handlers}.
        // liveRef pattern: component updates liveRef.current every render with state,
        // setters, refs, and component-scoped helpers (callImagen, addToast, etc.).
        // window.callGemini / window.callGeminiImageEdit used directly (avoids closure
        // capture of fallback if Personas module loads before GeminiAPI module).
        name: 'Personas',
        srcPath: path.join(ROOT, 'personas_source.jsx'),
        modPath: path.join(ROOT, 'personas_module.js'),
        publicPath: path.join(ROOT, 'prismflow-deploy', 'public', 'personas_module.js'),
        wrap(src) {
            const compiled = compileJsx(src);
            return (
                '(function() {\n'
                + "'use strict';\n"
                + "if (window.AlloModules && window.AlloModules.Personas) { console.log('[CDN] Personas already loaded, skipping'); return; }\n"
                + compiled
                + '\n})();\n'
            );
        },
    },
    {
        // ── export ── Export pipeline (8 handlers): JSON bundles (language pack,
        // research, profiles), standards-compliant packages (QTI, IMS), slide decks
        // (PPTX via window.PptxGenJS), flashcard HTML, adventure storybook (HTML
        // print window). Skipped: handleExport / handleExportPDF /
        // executeExportFromPreview / generateExportAudio — tightly coupled to the
        // preview-modal iframe system.
        // Factory: createExport({liveRef, warnLog, debugLog, escapeXml, generateUUID})
        // -> {8 handlers}. Inline helpers: getDefaultTitle, cleanTextForPptx.
        // window.callGemini accessed directly from inside handleExportStorybook.
        name: 'Export',
        srcPath: path.join(ROOT, 'export_source.jsx'),
        modPath: path.join(ROOT, 'export_module.js'),
        publicPath: path.join(ROOT, 'prismflow-deploy', 'public', 'export_module.js'),
        wrap(src) {
            const compiled = compileJsx(src);
            return (
                '(function() {\n'
                + "'use strict';\n"
                + "if (window.AlloModules && window.AlloModules.Export) { console.log('[CDN] Export already loaded, skipping'); return; }\n"
                + compiled
                + '\n})();\n'
            );
        },
    },
];

function compileSources() {
    const results = [];
    for (const pair of COMPILE_PAIRS) {
        if (!fs.existsSync(pair.srcPath)) {
            results.push({ name: pair.name, status: 'skipped', reason: 'source not found' });
            continue;
        }
        const src = fs.readFileSync(pair.srcPath, 'utf-8');
        let compiled;
        try {
            compiled = pair.wrap(src);
        } catch (e) {
            results.push({ name: pair.name, status: 'error', reason: 'wrap failed: ' + e.message });
            continue;
        }
        const existing = fs.existsSync(pair.modPath) ? fs.readFileSync(pair.modPath, 'utf-8') : null;
        // Match existing file's line endings so recompiling an unchanged source
        // produces no diff (on Windows, committed files typically use CRLF).
        const useCRLF = existing && existing.includes('\r\n');
        const finalOutput = useCRLF ? compiled.replace(/(?<!\r)\n/g, '\r\n') : compiled;
        const changed = existing !== finalOutput;
        if (changed) {
            fs.writeFileSync(pair.modPath, finalOutput, 'utf-8');
            if (pair.publicPath) {
                try {
                    if (!fs.existsSync(path.dirname(pair.publicPath))) {
                        fs.mkdirSync(path.dirname(pair.publicPath), { recursive: true });
                    }
                    fs.writeFileSync(pair.publicPath, finalOutput, 'utf-8');
                } catch (e) { /* public copy is best-effort */ }
            }
        }
        // Syntax-check the output so we fail loudly on any regression.
        try {
            execSync('node -c "' + pair.modPath + '"', { stdio: 'pipe' });
        } catch (e) {
            results.push({ name: pair.name, status: 'syntax-error', reason: (e.stderr && e.stderr.toString()) || e.message });
            continue;
        }
        results.push({ name: pair.name, status: changed ? 'compiled' : 'unchanged', bytes: compiled.length });
    }
    return results;
}

// Standalone compile mode — run just the compilation step and exit.
if (args.includes('--compile')) {
    console.log('── Compiling source modules ──');
    const results = compileSources();
    let hadError = false;
    for (const r of results) {
        const icon = r.status === 'compiled' ? '🔧' : r.status === 'unchanged' ? '✓' : r.status === 'skipped' ? '↩️' : '❌';
        console.log(`  ${icon} ${r.name}: ${r.status}${r.reason ? ' — ' + r.reason : ''}${r.bytes ? ' (' + r.bytes + ' bytes)' : ''}`);
        if (r.status === 'error' || r.status === 'syntax-error') hadError = true;
    }
    process.exit(hadError ? 1 : 0);
}

// ── Read source ─────────────────────────────────────────────────
if (!fs.existsSync(SOURCE)) {
    console.error(`❌ Source file not found: ${SOURCE}`);
    process.exit(1);
}

// Run compilation automatically in prod mode. Any compilation-produced changes
// will be caught by the dirty-tree guard further down, forcing the user to
// commit them before the CDN can pick them up.
if (mode === 'prod') {
    console.log('── Compiling source modules ──');
    const compileResults = compileSources();
    for (const r of compileResults) {
        const icon = r.status === 'compiled' ? '🔧' : r.status === 'unchanged' ? '✓' : r.status === 'skipped' ? '↩️' : '❌';
        console.log(`  ${icon} ${r.name}: ${r.status}${r.reason ? ' — ' + r.reason : ''}`);
    }
    if (compileResults.some(r => r.status === 'error' || r.status === 'syntax-error')) {
        console.error('❌ Compilation failed. Aborting build.');
        process.exit(1);
    }
    console.log('');
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

    // ── Module shrink guard: block if any managed module lost significant content vs HEAD ──
    // Protects against the failure mode where `git add -A` bundles a stale local copy of a
    // module file that is behind the remote version, silently reverting ~100s of lines of work.
    // This happened on 2026-04-13 when af4f52f silently dropped ~900 lines from doc_pipeline_source.jsx.
    if (!forceFlag) {
        const SHRINK_THRESHOLD_LINES = 200; // refuse a prod build if any module lost >200 lines vs HEAD
        try {
            const allManagedFiles = MODULES.map(m => m.filename).concat(PLUGIN_FILES);
            const shrunk = [];
            for (const rel of allManagedFiles) {
                const abs = path.join(ROOT, rel);
                if (!fs.existsSync(abs)) continue;
                try {
                    const headContent = execSync(`git show HEAD:"${rel}"`, { cwd: ROOT, encoding: 'utf-8' });
                    const headLines = headContent.split('\n').length;
                    const currentLines = fs.readFileSync(abs, 'utf-8').split('\n').length;
                    const loss = headLines - currentLines;
                    if (loss > SHRINK_THRESHOLD_LINES) {
                        shrunk.push({ file: rel, headLines, currentLines, loss });
                    }
                } catch(fileErr) {
                    // File may be new / not in HEAD — skip shrink check
                }
            }
            if (shrunk.length > 0) {
                console.error('');
                console.error('❌ MODULE SHRINK GUARD — One or more module files lost significant content vs HEAD:');
                shrunk.forEach(s => console.error(`   ${s.file}: ${s.headLines} lines in HEAD → ${s.currentLines} lines now (lost ${s.loss} lines)`));
                console.error('');
                console.error('   This often indicates a stale local copy clobbered the authoritative one.');
                console.error('   Investigate: compare your local file to HEAD (git diff HEAD -- <file>).');
                console.error('   If the shrink is intentional, re-run with --force to override this check.');
                console.error('');
                process.exit(1);
            }
        } catch (e) {
            console.warn('⚠️  Could not run module shrink guard: ' + e.message);
        }
    } else {
        console.warn('⚠️  --force flag: skipping module shrink guard');
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

    // ── Auto-copy module files to prismflow-deploy/public/ ──
    const PUBLIC_DIR = path.join(ROOT, 'prismflow-deploy', 'public');
    const modulesToCopy = [
        // Root-level modules
        ...MODULES.map(m => m.filename),
        'word_sounds_module.js',
        'teacher_module.js',
        'ui_strings.js',
        'escape_room_module.js',
        // stem_lab hub
        'stem_lab/stem_lab_module.js'
    ];
    let copyCount = 0;
    modulesToCopy.forEach(f => {
        const src = path.join(ROOT, f);
        const isSubdir = f.includes('/');
        const destDir = isSubdir ? path.join(PUBLIC_DIR, path.dirname(f)) : PUBLIC_DIR;
        const dest = path.join(destDir, path.basename(f));
        // For stem_lab_module.js, copy to public root (not public/stem_lab/)
        const finalDest = f === 'stem_lab/stem_lab_module.js' ? path.join(PUBLIC_DIR, 'stem_lab_module.js') : dest;
        if (fs.existsSync(src)) {
            if (!fs.existsSync(path.dirname(finalDest))) fs.mkdirSync(path.dirname(finalDest), { recursive: true });
            fs.copyFileSync(src, finalDest);
            copyCount++;
        }
    });
    // Copy all stem_tool plugin files
    PLUGIN_FILES.forEach(f => {
        const src = path.join(ROOT, f);
        const dest = path.join(PUBLIC_DIR, f);
        if (fs.existsSync(src)) {
            if (!fs.existsSync(path.dirname(dest))) fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(src, dest);
            copyCount++;
        }
    });
    console.log(`📦 Auto-copied ${copyCount} module/plugin files to prismflow-deploy/public/`);

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
