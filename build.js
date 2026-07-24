#!/usr/bin/env node
/**
 * AlloFlow Build Script
 * 
 * Transforms AlloFlowANTI.txt → desktop/web-app/src/App.jsx
 * with automatic CDN hash management.
 *
 * Usage:
 *   node build.js --mode=dev     Load modules from local paths (for npm start)
 *   node build.js --mode=prod    Load modules from CDN with auto-detected git hash
 *   node build.js --mode=prod --hash=abc1234   Use a specific hash
 *   node build.js --copy-student-shell        Publish the compiled app at public/app/
 *
 * What it does:
 *   1. Reads AlloFlowANTI.txt
 *   2. Finds all loadModule(...) CDN URLs
 *   3. Replaces them with local paths (dev) or hashed CDN URLs (prod)
 *   4. Writes the result to desktop/web-app/src/App.jsx
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createHash } = require('crypto');

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
const OUTPUT = path.join(ROOT, 'desktop/web-app', 'src', 'App.jsx');
const BACKUP = path.join(ROOT, 'desktop/web-app', 'src', 'AlloFlowANTI.txt');
const STUDENT_SHELL_BUILD_DIR = path.join(ROOT, 'desktop/web-app', 'build');
const STUDENT_SHELL_PUBLIC_DIR = path.join(ROOT, 'desktop/web-app', 'public', 'app');
const STUDENT_SHELL_CDN_DIR = path.join(ROOT, 'app');
const STUDENT_SHELL_ENTRIES = [
    'index.html',
    'asset-manifest.json',
    'manifest.json',
    'sw.js',
    'qrcode.js',
    'static',
];
const CLOUDFLARE_MAX_FILE_BYTES = 25 * 1024 * 1024;

function publishStudentShell() {
    const sourceIndex = path.join(STUDENT_SHELL_BUILD_DIR, 'index.html');
    if (!fs.existsSync(sourceIndex)) {
        throw new Error('Compiled app not found. Run npm run build in desktop/web-app first.');
    }

    const html = fs.readFileSync(sourceIndex, 'utf8');
    if (!html.includes('<div id="root"></div>') || Buffer.byteLength(html, 'utf8') < 1024
        || !html.includes('./static/js/main.') || !html.includes('./static/css/main.')) {
        throw new Error('Compiled split shell is missing its root or hashed boot assets.');
    }

    fs.rmSync(STUDENT_SHELL_PUBLIC_DIR, { recursive: true, force: true });
    fs.mkdirSync(STUDENT_SHELL_PUBLIC_DIR, { recursive: true });

    for (const entry of STUDENT_SHELL_ENTRIES) {
        const src = path.join(STUDENT_SHELL_BUILD_DIR, entry);
        if (!fs.existsSync(src)) continue;
        const dest = path.join(STUDENT_SHELL_PUBLIC_DIR, entry);
        if (fs.statSync(src).isDirectory()) {
            fs.cpSync(src, dest, { recursive: true });
        } else {
            fs.copyFileSync(src, dest);
        }
    }

    const publishedIndex = path.join(STUDENT_SHELL_PUBLIC_DIR, 'index.html');
    let publishedHtml = fs.readFileSync(publishedIndex, 'utf8');
    // postbuild may preserve readable or minified service-worker registration.
    const rootSwRegistration = /navigator\.serviceWorker\.register\((['"])\/sw\.js\1,\s*\{\s*updateViaCache:\s*(['"])none\2\s*\}\)/;
    if (!rootSwRegistration.test(publishedHtml)) {
        throw new Error('Student shell service-worker registration anchor was not found.');
    }
    publishedHtml = publishedHtml.replace(
        rootSwRegistration,
        "navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })"
    );
    fs.writeFileSync(publishedIndex, publishedHtml, 'utf8');

    const publishedSw = path.join(STUDENT_SHELL_PUBLIC_DIR, 'sw.js');
    let sw = fs.readFileSync(publishedSw, 'utf8');
    if (!sw.includes("const CACHE_NAME = 'alloflow-v") || !sw.includes("keys.filter(k => k !== CACHE_NAME)")) {
        throw new Error('Student shell service-worker cache anchors were not found.');
    }
    sw = sw
        .replace("const CACHE_NAME = 'alloflow-v", "const CACHE_NAME = 'alloflow-student-shell-v")
        .replace("keys.filter(k => k !== CACHE_NAME)", "keys.filter(k => k.startsWith('alloflow-student-shell-v') && k !== CACHE_NAME)");
    fs.writeFileSync(publishedSw, sw, 'utf8');

    let copiedFiles = 0;
    const oversized = [];
    const scan = (dir) => {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const itemPath = path.join(dir, item.name);
            if (item.isDirectory()) scan(itemPath);
            else if (item.isFile()) {
                copiedFiles += 1;
                if (fs.statSync(itemPath).size >= CLOUDFLARE_MAX_FILE_BYTES) {
                    oversized.push(path.relative(ROOT, itemPath));
                }
            }
        }
    };
    scan(STUDENT_SHELL_PUBLIC_DIR);
    if (oversized.length) {
        throw new Error('Student shell contains Cloudflare-ineligible files: ' + oversized.join(', '));
    }

    fs.rmSync(STUDENT_SHELL_CDN_DIR, { recursive: true, force: true });
    fs.cpSync(STUDENT_SHELL_PUBLIC_DIR, STUDENT_SHELL_CDN_DIR, { recursive: true });

    console.log('Published student shell: ' + path.relative(ROOT, STUDENT_SHELL_PUBLIC_DIR)
        + ' + ' + path.relative(ROOT, STUDENT_SHELL_CDN_DIR)
        + ' (' + copiedFiles + ' files each, split shell with precached assets)');
}


// ── CDN base (May 12 2026) ──────────────────────────────────────
// Switched from jsdelivr (cdn.jsdelivr.net/gh/Apomera/AlloFlow@<hash>/<file>)
// to Cloudflare Pages because jsdelivr started returning GitHub's "429:
// Too Many Requests" plaintext as response bodies, causing ~30-40 of 127
// modules to [CDN-FAIL] every cold load. Cloudflare Pages serves the files
// directly from its edge network — no GitHub API in the request path, no
// rate-limit cascade. URLs no longer need a @hash because Cloudflare
// invalidates by content automatically when a new commit pushes to main.
const CLOUDFLARE_CDN_BASE = 'https://alloflow-cdn.pages.dev';

// ── Module definitions ──────────────────────────────────────────
// Each module: { name, filename, cdnTemplate }
const MODULES = [
    {
        name: 'AlloData',
        filename: 'allo_data_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ToolCatalog',
        filename: 'tool_catalog_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'SubmissionCrypto',
        filename: 'submission_crypto_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AlloCrypto',
        filename: 'allo_crypto_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'SubmissionInbox',
        filename: 'view_submission_inbox_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'SeatingChart',
        filename: 'seating_chart_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'FirestoreSync',
        filename: 'firestore_sync_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'SafetyChecker',
        filename: 'safety_checker_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'Fluency',
        filename: 'fluency_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PromptsLibraryModule',
        filename: 'prompts_library_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AnnotationSuiteModule',
        filename: 'annotation_suite_module.js',
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
        name: 'AgentCoreContracts',
        filename: 'agent_core_contracts_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AgentCoreBlueprintService',
        filename: 'agent_core_blueprint_service_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AgentCoreUIAdapter',
        filename: 'agent_core_ui_adapter_module.js',
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
        name: 'KaraokeAudioStoreModule',
        filename: 'karaoke_audio_store_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'WordTimingModule',
        filename: 'word_timing_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'SessionTransportModule',
        filename: 'session_transport_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ReadAloudAudioServiceModule',
        filename: 'read_aloud_audio_service_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ReadAloudArtifactContractModule',
        filename: 'read_aloud_artifact_contract_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ReadAloudArtifactAudioModule',
        filename: 'read_aloud_artifact_audio_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PersonaSessionArtifactModule',
        filename: 'persona_session_artifact_module.js',
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
        name: 'PhaseNHelpersModule',
        filename: 'phase_n_misc_helpers_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PhaseOHandlersModule',
        filename: 'phase_o_misc_handlers_module.js',
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
        name: 'ViewTimelineModule',
        filename: 'view_timeline_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewGlossaryModule',
        filename: 'view_glossary_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewOutlineModule',
        filename: 'view_outline_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewFaqModule',
        filename: 'view_faq_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewSentenceFramesModule',
        filename: 'view_sentence_frames_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewBrainstormModule',
        filename: 'view_brainstorm_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewImageModule',
        filename: 'view_image_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewAnalysisModule',
        filename: 'view_analysis_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewQuizModule',
        filename: 'view_quiz_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewSimplifiedModule',
        filename: 'view_simplified_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewMathModule',
        filename: 'view_math_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewLessonPlanModule',
        filename: 'view_lesson_plan_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewAlignmentReportModule',
        filename: 'view_alignment_report_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewWordSoundsPreviewModule',
        filename: 'view_word_sounds_preview_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewGeminiBridgeModule',
        filename: 'view_gemini_bridge_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewConceptSortModule',
        filename: 'view_concept_sort_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewPersonaChatModule',
        filename: 'view_persona_chat_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewSpotlightTourModule',
        filename: 'view_spotlight_tour_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewProjectSettingsModule',
        filename: 'view_project_settings_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewLaunchPadModule',
        filename: 'view_launch_pad_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ViewAdventureModule',
        filename: 'view_adventure_module.js',
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
        name: 'CinematicStudio',
        filename: 'cinematic_studio_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AlloStudio',
        filename: 'studio_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'BrandProfile',
        filename: 'brand_profile_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'BrandProfileEditor',
        filename: 'brand_profile_editor_module.js',
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
        name: 'AlloHaven',
        filename: 'allohaven_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'Voice',
        filename: 'voice_module.js',
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
        name: 'CommunityCatalog',
        filename: 'catalog_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ReadingLibrary',
        filename: 'reading_library_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'LinguaPractice',
        filename: 'lingua_practice_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'TestPrepHub',
        filename: 'test_prep_hub_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'TimelineStudio',
        filename: 'timeline_studio_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AccessibilityLab',
        filename: 'accessibility_lab_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AuditRemediator',
        filename: 'audit_remediator_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'QuizModeStrategies',
        filename: 'quiz_mode_strategies.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'QuizAIHelpers',
        filename: 'quiz_ai_helpers.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'QuizLiveAggregators',
        filename: 'quiz_live_aggregators.js',
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
        name: 'MindMap',
        filename: 'mind_map_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        // Shared ConceptGraph format + spine + adapters (acg/v1). No loadModule()
        // call in AlloFlowANTI.txt — Throughline lazy-loads it from the CDN at
        // click time; this entry just gets it copied to desktop/web-app/public.
        name: 'ConceptGraphEngine',
        filename: 'concept_graph_engine_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        // Orbitable WebGL 3D renderer for acg/v1 (lazy-loaded by Throughline's
        // "View in 3D"; lazy-loads three.js itself, falls back to the outline).
        name: 'ConceptGraph3D',
        filename: 'concept_graph_3d_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        // Method-of-loci 3D walk for the 'Memory Palace' organizer (lazy-loaded
        // by view_renderers; shares the three.js download with ConceptGraph3D).
        name: 'MemoryPalace',
        filename: 'memory_palace_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        // Gemini primitive-assembly sculptures (p3d/1) — lazy sidecar of the
        // Memory Palace / AlloHaven 3D walks.
        name: 'Prim3D',
        filename: 'prim3d_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        // Reusable WebXR layer (allovr/1) — feature-detected Enter-VR + rig +
        // controllers + locomotion + comfort vignette + grab, for any three.js
        // STEM scene. Lazy sidecar (loaded only when a headset is present).
        name: 'AlloVR',
        filename: 'allo_vr_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        // Giant primitive landmarks (landmark/1) — one per room in the 3D worlds;
        // renders via Prim3D at building scale. Lazy sidecar of the haven walk.
        name: 'Landmark',
        filename: 'landmark_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        // CC0 collectibles catalog + GLTFLoader (glblib/1) — the shop lane, with
        // a Prim3D fallback so items render before any .glb asset exists.
        name: 'GlbLibrary',
        filename: 'glb_library_module.js',
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
        name: 'UIFontLibrary',
        filename: 'ui_font_library_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'VoiceConfig',
        filename: 'voice_config_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'CanvasTips',
        filename: 'canvas_tips_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'KokoroOfferModal',
        filename: 'view_kokoro_offer_modal_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ConfirmDialog',
        filename: 'view_confirm_dialog_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PromptDialog',
        filename: 'view_prompt_dialog_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'HintsModal',
        filename: 'view_hints_modal_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'XPModal',
        filename: 'view_xp_modal_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'StorybookExportModal',
        filename: 'view_storybook_export_modal_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'InfoModal',
        filename: 'view_info_modal_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'SessionModal',
        filename: 'view_session_modal_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'SocraticChat',
        filename: 'view_socratic_chat_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'GlobalLevelUpModal',
        filename: 'view_global_level_up_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'HeaderBar',
        filename: 'view_header_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'GuidedModeBanner',
        filename: 'view_guided_mode_banner_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'LiveLessonRun',
        filename: 'view_live_lesson_run_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'StudentJoinPanel',
        filename: 'view_student_join_panel_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'StudentSaveAdventurePanel',
        filename: 'view_student_save_adventure_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'SidebarTabsNav',
        filename: 'view_sidebar_tabs_nav_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'UDLGuideButton',
        filename: 'view_udl_guide_button_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'TeacherHistoryTab',
        filename: 'view_teacher_history_tab_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'HistoryPanel',
        filename: 'view_history_panel_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'FabStack',
        filename: 'view_fab_stack_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'StudyTimerModal',
        filename: 'view_study_timer_modal_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'EducatorHubModal',
        filename: 'view_educator_hub_modal_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'VisualSupportsModal',
        filename: 'view_visual_supports_modal_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'LearningHubModal',
        filename: 'view_learning_hub_modal_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'OpenGrooveCore',
        filename: 'music_studio/open_groove_core.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'OpenGrooveScheduler',
        filename: 'music_studio/open_groove_scheduler.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'OpenGrooveAudio',
        filename: 'music_studio/open_groove_audio.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'OpenGrooveStudio',
        filename: 'music_studio/open_groove_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ClozeInteractionPanel',
        filename: 'view_cloze_interaction_panel_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'LabelPositions',
        filename: 'label_positions_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'UILanguageSelector',
        filename: 'ui_language_selector_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AudioBanks',
        filename: 'audio_banks_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'VerificationPolicy',
        filename: 'verification_policy_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'DocBuilderRenderer',
        filename: 'doc_builder_renderer_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PdfAuditView',
        filename: 'view_pdf_audit_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ModuleScopeExtras',
        filename: 'module_scope_extras_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ExportPreviewView',
        filename: 'view_export_preview_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'MiscModals',
        filename: 'view_misc_modals_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'GeminiBridge',
        filename: 'view_gemini_bridge_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'MiscPanels',
        filename: 'view_misc_panels_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'UIPolish',
        filename: 'ui_polish_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'SidebarPanels',
        filename: 'view_sidebar_panels_module.js',
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
    },
    {
        name: 'LivePolling',
        filename: 'live_polling_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'NoteTakingTemplatesModule',
        filename: 'note_taking_templates_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'AnchorChartsModule',
        filename: 'anchor_charts_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'ConceptPictionaryModule',
        filename: 'concept_pictionary_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PoetTree',
        filename: 'poet_tree_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'PdCore',
        filename: 'pd_core_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    },
    {
        name: 'EscapeRoomModule',
        filename: 'escape_room_module.js',
        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'
    }
];

// Plugin files loaded via the setTimeout plugin loader (not loadModule)
// build.js updates their CDN hash in the pluginCdnBase variable
const PLUGIN_FILES = [
    'error_reporter_module.js',
    'ai_backend_module.js',
    'psychometric_probes.json',
    'psychometric_math_probes.json',
    'psychometric_literacy_probes.json',
    'kokoro_tts_loader.js',
    'piper_tts_loader.js',
    'liblouis_braille_loader.js',
    'sre_loader.js',
    'mathlive_loader.js',
    'phonics_g2p_loader.js',
    'translate_loader.js',
    'dictionary_loader.js',
    'sd_turbo_loader.js',
    'stem_lab/stem_tool_arccity.js',
    'stem_lab/stem_tool_dna.js',
    'stem_lab/stem_tool_unitconvert.js',
    'stem_lab/stem_tool_logiclab.js',
    'stem_lab/stem_tool_cellular.js',
    'stem_lab/stem_tool_accesslens.js',
    'stem_lab/stem_tool_alphafold.js',
    'stem_lab/stem_tool_datalab.js',
    'stem_lab/stem_tool_simshelf.js',
    'stem_lab/stem_tool_circuitshelf.js',
    'stem_lab/stem_tool_moleculeshelf.js',
    'stem_lab/stem_tool_particlelab3d.js',
    'stem_lab/stem_tool_zoomgallery.js',
    'stem_lab/stem_tool_probability.js',
    'stem_lab/stem_tool_calculus.js',
    'stem_lab/stem_tool_galaxy.js',
    'stem_lab/stem_tool_datastudio.js',
    'stem_lab/stem_tool_dataplot.js',
    'stem_lab/stem_tool_geo.js',
    'stem_lab/stem_tool_gisstudio.js',
    'stem_lab/stem_tool_fractions.js',
    'stem_lab/stem_tool_manipulatives.js',
    'stem_lab/stem_tool_money.js',
    'stem_lab/stem_tool_coordgrid.js',
    'stem_lab/stem_tool_angles.js',
    'stem_lab/stem_tool_archstudio.js',
    'stem_lab/stem_tool_geometryworld.js',
    'stem_lab/stem_tool_freeforms.js',
    'stem_lab/stem_tool_geologyexplorer.js',
    'stem_lab/stem_tool_cyberdefense.js',
    'stem_lab/stem_tool_physics.js',
    'stem_lab/stem_tool_watercycle.js',
    'stem_lab/stem_tool_weathersystems.js',
    'stem_lab/stem_tool_rocks.js',
    'stem_lab/stem_tool_dissection.js',
    'stem_lab/stem_tool_behaviorlab.js',
    'stem_lab/stem_tool_schoolbehaviortoolkit.js',
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
    'stem_lab/stem_tool_algebracas.js',  // lowercase = the git filename (camelCase never got its CDN hash bumped — audit B5 casing)
    'stem_lab/stem_tool_circuit.js',
    'stem_lab/stem_tool_magnetism.js',
    'stem_lab/stem_tool_a11yauditor.js',
    'stem_lab/stem_tool_worldbuilder.js',
    'stem_lab/stem_tool_flightsim.js',
    // atcTower entry moved to the catch-up batch below; the on-disk + git filename is LOWERCASE
    // stem_tool_atctower.js (a camelCase entry 404s on case-sensitive CDNs — audit B5, 2026-06-28).
    'stem_lab/stem_tool_music.js',
    'stem_lab/stem_tool_climateExplorer.js',
    'stem_lab/stem_tool_renewables.js',
    'stem_lab/stem_tool_pets.js',
    'stem_lab/stem_tool_fireecology.js',
    'stem_lab/stem_tool_stewardship.js',
    'stem_lab/stem_tool_moonmission.js',
    'stem_lab/stem_tool_beehive.js',
    'stem_lab/stem_tool_spacecolony.js',
    'stem_lab/stem_tool_spacestation.js',
    'stem_lab/stem_tool_coasterlab.js',
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
    'stem_lab/stem_tool_arithmetic.js',
    'stem_lab/stem_tool_ratios.js',
    'stem_lab/stem_tool_areaperimeter.js',
    'stem_lab/stem_tool_timeschedule.js',
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
    'stem_lab/stem_tool_statslab.js',
    'stem_lab/stem_tool_optics.js',
    'stem_lab/stem_tool_astronomy.js',
    'stem_lab/stem_tool_bridgelab.js',
    'stem_lab/stem_tool_microbiology.js',
    // Catch-up batch (Apr 30 2026): tools that were live in AlloFlowANTI/App.jsx
    // toolModules array but missing here, so build.js couldn't bump their CDN
    // hash. Fixed alongside the atcTower casing + playlab/throwlab full wiring.
    'stem_lab/stem_tool_atctower.js',  // lowercase = the on-disk + git filename (camelCase 404s on case-sensitive CDNs — audit B5)
    'stem_lab/stem_tool_throwlab.js',
    'stem_lab/stem_tool_playlab.js',
    'stem_lab/stem_tool_assessmentliteracy.js',
    'stem_lab/stem_tool_autorepair.js',
    'stem_lab/stem_tool_bikelab.js',
    'stem_lab/stem_tool_evolab.js',
    'stem_lab/stem_tool_firstresponse.js',
    'stem_lab/stem_tool_learning_lab.js',
    'stem_lab/stem_tool_llm_literacy.js',
    'stem_lab/stem_tool_nutritionlab.js',
    'stem_lab/stem_tool_kitchenlab.js',
    'stem_lab/stem_tool_cephalopodlab.js',
    'stem_lab/stem_tool_roadready.js',
    'stem_lab/stem_tool_typingpractice.js',
    'stem_lab/stem_tool_weldlab.js',
    'stem_lab/stem_tool_birdlab.js',
    'stem_lab/stem_tool_raptorhunt.js',
    'stem_lab/stem_tool_swimlab.js',
    'stem_lab/stem_tool_printingpress.js',
    'stem_lab/stem_tool_aquaculture.js',
    'stem_lab/stem_tool_fisherlab.js',
    // dinolab + lumen are live tools (referenced in toolModules) but were missing here, so build.js
    // never bumped their CDN hash → Cloudflare served stale code (audit B4, 2026-06-28).
    'stem_lab/stem_tool_dinolab.js',
    'stem_lab/stem_tool_lumen.js',
    'stem_lab/stem_tool_forge.js',  // Tool Forge — teacher-gated plugin-authoring harness (Phase A; go-live is Aaron's call)
    'sel_hub/sel_safety_layer.js',  // MUST load before any sel_tool_*.js
    'sel_hub/sel_standards_alignment.js',  // standards alignment data + helper used by sel_tool_*.js About views
    'sel_hub/sel_tool_zones.js', 'sel_hub/sel_tool_emotions.js',
    'sel_hub/sel_tool_coping.js', 'sel_hub/sel_tool_mindfulness.js',
    'sel_hub/sel_tool_social.js',
    'sel_hub/sel_tool_perspective.js',
    'sel_hub/sel_tool_decisions.js',
    'sel_hub/sel_tool_conflict.js',
    'sel_hub/sel_tool_advocacy.js',
    'sel_hub/sel_tool_howl.js',
    'sel_hub/sel_tool_landplace.js',
    'sel_hub/sel_tool_quietquestions.js',
    'sel_hub/sel_tool_careconstellations.js',
    'sel_hub/sel_tool_orientations.js',
    'sel_hub/sel_tool_onepageprofile.js',
    'sel_hub/sel_tool_maps.js',
    'sel_hub/sel_tool_path.js',
    'sel_hub/sel_tool_ecomap.js',
    'sel_hub/sel_tool_circlesofsupport.js',
    'sel_hub/sel_tool_genogram.js',
    'sel_hub/sel_tool_windowoftolerance.js',
    'sel_hub/sel_tool_stressbucket.js',
    'sel_hub/sel_tool_viastrengths.js',
    'sel_hub/sel_tool_wheeloflife.js',
    'sel_hub/sel_tool_thoughtrecord.js',
    'sel_hub/sel_tool_costbenefit.js',
    'sel_hub/sel_tool_tipp.js',
    'sel_hub/sel_tool_dearman.js',
    'sel_hub/sel_tool_valuescommittedaction.js',
    'sel_hub/sel_tool_sfbt.js',
    'sel_hub/sel_tool_behavioralactivation.js',
    'sel_hub/sel_tool_careercompass.js',
    'sel_hub/sel_tool_perma.js',
    'sel_hub/sel_tool_motivationalinterviewing.js',
    'sel_hub/sel_tool_crewprotocols.js',
    'sel_hub/sel_tool_griefloss.js',
    'sel_hub/sel_tool_anxietytoolkit.js',
    'sel_hub/sel_tool_sleep.js',
    'sel_hub/sel_tool_sensoryregulation.js',
    'sel_hub/sel_tool_traumapsychoed.js',
    'sel_hub/sel_tool_bodystory.js',
    'sel_hub/sel_tool_sourcesofstrength.js',
    'sel_hub/sel_tool_bigfeelings.js',
    'sel_hub/sel_tool_healthyrelationships.js',
    'sel_hub/sel_tool_substancepsychoed.js',
    'sel_hub/sel_tool_identitysupport.js',
    'sel_hub/sel_tool_disabilityvoices.js',
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
    'sel_hub/sel_tool_upstander.js',
    'sel_hub/sel_tool_conflicttheater.js',
    'sel_hub/sel_tool_crisiscompanion.js',
    'sel_hub/sel_tool_digitalwellbeing.js',
    'sel_hub/sel_tool_execfunction.js',
    'sel_hub/sel_tool_peersupport.js',
    'sel_hub/sel_tool_selfadvocacy.js',
    'sel_hub/sel_tool_sociallab.js',
    'sel_hub/sel_tool_voicedetective.js'
];

// Companion-window assets used by STEM Lab launchers. These are not JS modules,
// so they must be copied as folders into desktop/web-app/public for clean builds.
const COMPANION_ASSET_DIRS = [
    'alphafold_explorer',
    'circuit_shelf',
    'molecule_shelf',
    'sim_shelf',
    'timeline_studio',
    'zoom_gallery'
];

// ── Source → Module compilation ─────────────────────────────────
// Each pair below describes a *_source.jsx ↔ *_module.js mapping. The compiler
// reads source, wraps it in the module's specific IIFE + registration, writes
// the module file (+ copies to desktop/web-app/public), and syntax-checks it.
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

function simplePureCompilePair(name, fileBase, guardKey) {
    return {
        name,
        srcPath: path.join(ROOT, fileBase + '_source.jsx'),
        modPath: path.join(ROOT, fileBase + '_module.js'),
        publicPath: path.join(ROOT, 'desktop/web-app', 'public', fileBase + '_module.js'),
        wrap(src) {
            return (
                '(function(){"use strict";\n'
                + 'if(window.AlloModules&&window.AlloModules.' + guardKey + '){console.log("[CDN] ' + guardKey + ' already loaded, skipping"); return;}\n'
                + src.trim() + '\n'
                + '})();\n'
            );
        },
    };
}

const COMPILE_PAIRS = [
    simplePureCompilePair('VerificationPolicy', 'verification_policy', 'VerificationPolicyModule'),
    simplePureCompilePair('DocBuilderRenderer', 'doc_builder_renderer', 'DocBuilderRendererModule'),
    {
        name: 'DocPipeline',
        srcPath: path.join(ROOT, 'doc_pipeline_source.jsx'),
        modPath: path.join(ROOT, 'doc_pipeline_module.js'),
        publicPath: path.join(ROOT, 'desktop/web-app', 'public', 'doc_pipeline_module.js'),
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
                + 'if(window.AlloModules&&window.AlloModules.DocPipelineModule){console.log("[CDN] DocPipelineModule already loaded, skipping"); return;}\n'
                + src + trailingNewline
                + '})();\n'
            );
        },
    },
    {
        // ── persona_ui ── JSX-bearing module, verified zero-diff vs deployed module.js after
        // the April 2026 WCAG back-port (slate-500→600 + text-[10px]→[11px]). First JSX module
        // onboarded to Phase 2 auto-compile. To add more modules, verify `dev-tools/phase2_diff_audit.js`
        // reports PERFECT for that module after any needed source back-ports, then add an
        // entry here with the module's specific wrapper.
        name: 'PersonaUI',
        srcPath: path.join(ROOT, 'persona_ui_source.jsx'),
        modPath: path.join(ROOT, 'persona_ui_module.js'),
        publicPath: path.join(ROOT, 'desktop/web-app', 'public', 'persona_ui_module.js'),
        wrap(src) {
            const compiled = compileJsx(src);
            return (
                '(function() {\n'
                + "'use strict';\n"
                + '  // WCAG 2.2 AA: Accessibility CSS\n'
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
        publicPath: path.join(ROOT, 'desktop/web-app', 'public', 'gemini_api_module.js'),
        wrap(src) {
            // gemini_api_source.jsx is PURE JS (no JSX). Running it through
            // compileJsx (Babel) re-printed the source into a different ~804-line
            // form that DRIFTED from the canonical 686-line raw-wrap produced by
            // _build_gemini_api_module.js (→ _build_simple_iife) on EVERY build —
            // so the two builders fought and gemini_api had to be re-minified by
            // hand on consecutive deploys (@3271ffd0, @8bc35926). Raw-wrap it
            // BYTE-FOR-BYTE like _build_simple_iife (and like DocPipeline above)
            // so both builders produce identical bytes and the drift is now
            // structurally impossible. Keep this matching _build_simple_iife.
            return (
                '(function(){"use strict";\n'
                + 'if(window.AlloModules&&window.AlloModules.GeminiAPI){console.log("[CDN] GeminiAPI already loaded, skipping"); return;}\n'
                + src.trim() + '\n'
                + '})();\n'
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
        publicPath: path.join(ROOT, 'desktop/web-app', 'public', 'tts_module.js'),
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
        publicPath: path.join(ROOT, 'desktop/web-app', 'public', 'personas_module.js'),
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
        publicPath: path.join(ROOT, 'desktop/web-app', 'public', 'export_module.js'),
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
    {
        // Brand Settings editor UI (consumes window.AlloModules.BrandProfile).
        // Registers window.AlloModules.BrandProfileEditor (a React component),
        // opened from the Educator Hub via CDNModuleGate.
        name: 'BrandProfileEditor',
        srcPath: path.join(ROOT, 'brand_profile_editor_source.jsx'),
        modPath: path.join(ROOT, 'brand_profile_editor_module.js'),
        publicPath: path.join(ROOT, 'desktop/web-app', 'public', 'brand_profile_editor_module.js'),
        wrap(src) {
            const compiled = compileJsx(src);
            return (
                '(function() {\n'
                + "'use strict';\n"
                + "if (window.AlloModules && window.AlloModules.BrandProfileEditor) { console.log('[CDN] BrandProfileEditor already loaded, skipping'); return; }\n"
                + compiled
                + '\n})();\n'
            );
        },
    },
    {
        // ── immersive_reader ── Reading overlays (Focus/Speed/Bionic/Crawl/Karaoke)
        // + toolbar. JSX-bearing. Unlike the Babel-compiled pairs above, this module
        // is built with esbuild (--jsx=transform) via the canonical builder in
        // _build_immersive_reader_module.js, whose preamble injects the React-hook
        // aliases, lazy lucide-icon shims, and window.AlloLanguageContext binding.
        // Both this pair and that script's CLI call the SAME buildImmersiveReaderModule()
        // so they can never drift (cf. the gemini_api double-builder incident).
        // Onboarded 2026-07-07 after the FocusReaderOverlay `studentTakeTick is not
        // defined` crash — now covered by check_free_vars + this compile/dirty-tree guard.
        name: 'ImmersiveReader',
        srcPath: path.join(ROOT, 'immersive_reader_source.jsx'),
        modPath: path.join(ROOT, 'immersive_reader_module.js'),
        publicPath: path.join(ROOT, 'desktop/web-app', 'public', 'immersive_reader_module.js'),
        wrap(src) {
            return require('./_build_immersive_reader_module.js').buildImmersiveReaderModule(src);
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

// Publish the postbuild output into the Cloudflare Pages public tree without
// duplicating the hundreds of megabytes of teaching assets already served there.
if (hasFlag('copy-student-shell')) {
    try {
        publishStudentShell();
        process.exit(0);
    } catch (error) {
        console.error('Student shell publish failed: ' + error.message);
        process.exit(1);
    }
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

    // ── Module registry contract check ────────────────────────────────
    // Verifies every `window.AlloModules.X` consumer in AlloFlowANTI.txt
    // has at least one CDN module that registers X. Catches the bug class
    // surfaced 2026-05-10 (Teacher Dashboard 10 components silently
    // unregistered, GeminiBridgeView deleted-but-consumed, etc.).
    console.log('── Verifying window.AlloModules.X consumer/producer contract ──');
    try {
        execSync('node dev-tools/verify_module_registry.cjs --quiet', { cwd: ROOT, stdio: 'inherit' });
        console.log('  ✓ All consumers resolved.\n');
    } catch (e) {
        console.error('❌ Module registry verification failed. Aborting build.');
        console.error('   Run `npm run verify:registry` for the full report.');
        process.exit(1);
    }
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

// Contract modules pinned by content hash (see EXCEPTION note below).
const CONTENT_HASH_PINNED = new Set([
    'student_interaction_module.js',
    'view_student_join_panel_module.js',
    'view_student_save_adventure_module.js',
    'view_socratic_chat_module.js',
    'karaoke_audio_store_module.js',
    'word_timing_module.js',
    'session_transport_module.js',
    // tts + phase_k joined 2026-07-20: the karaoke resilience gate asserts
    // content-hash pins for the whole read-aloud runtime, but every deploy
    // restamped these two to the git hash and re-broke the gate.
    'tts_module.js',
    'phase_k_helpers_module.js',
    'read_aloud_audio_service_module.js',
    'read_aloud_artifact_contract_module.js',
    'read_aloud_artifact_audio_module.js',
    'persona_session_artifact_module.js',
    'export_module.js',
    'view_storybook_export_modal_module.js',
    'personas_module.js',
    'view_persona_chat_module.js',
    'firestore_sync_module.js',
    'view_faq_module.js',
    'immersive_reader_module.js',
    'view_simplified_module.js',
]);
const _contentHashCache = {};
function contentHashPin(filename) {
    if (!CONTENT_HASH_PINNED.has(filename)) return null;
    if (!_contentHashCache[filename]) {
        try {
            _contentHashCache[filename] = createHash('sha256').update(fs.readFileSync(path.join(ROOT, filename))).digest('hex').slice(0, 8);
        } catch (e) {
            console.warn(`  ⚠️  content-hash pin failed for ${filename} (${e.message}); falling back to git hash`);
            _contentHashCache[filename] = '';
        }
    }
    return _contentHashCache[filename] || null;
}
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
        // Production: Cloudflare Pages serves from its edge network, which caches
        // by filename and can serve a STALE copy of large stable-named files — the
        // 1.9MB doc_pipeline_module.js got stuck across deploys while small modules
        // refreshed. Append the deploy hash as a cache-buster so every deploy is a
        // NEW URL the edge has never cached → always fresh. (The earlier "Cloudflare
        // auto-invalidates by content" assumption was false for the big file.)
        // moduleDef.cdnBase (legacy jsdelivr URL) is left in the MODULES table
        // but unused; kept for diff readability if we ever need to switch back.
        // EXCEPTION: student-facing contract modules pin by CONTENT hash
        // (sha256-8 of the generated file) — tests/student_accessibility_
        // contracts.test.js asserts host tags match the file, so a stale edge
        // can never serve an old student module the host doesn't expect, and
        // unchanged files keep a stable (cacheable) URL across deploys.
        newUrl = `${CLOUDFLARE_CDN_BASE}/${moduleDef.filename}?v=${contentHashPin(moduleDef.filename) || gitHash}`;
    }

    replacementCount++;
    const oldShort = currentUrl.length > 60 ? '...' + currentUrl.slice(-50) : currentUrl;
    const newShort = newUrl.length > 60 ? '...' + newUrl.slice(-50) : newUrl;
    console.log(`  ✏️  ${moduleName}: ${oldShort}`);
    console.log(`  →  ${newShort}`);

    return `loadModule('${moduleName}', '${newUrl}')`;
});

// ── Transform plugin loader CDN base ────────────────────────────
// Matches either the legacy jsdelivr URL OR the new Cloudflare Pages URL,
// so re-running build.js after the May 12 2026 CDN switch still works.
//   var pluginCdnBase = 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@HASH/'
//   var pluginCdnBase = 'https://alloflow-cdn.pages.dev/'
//   var pluginCdnBase = './'   (dev mode)
const PLUGIN_CDN_RE = /var\s+pluginCdnBase\s*=\s*'[^']*'/;
const PLUGIN_VERSION_RE = /var\s+pluginCdnVersion\s*=\s*'[^']*'/;
let pluginReplaced = false;

if (mode === 'dev') {
    // In dev mode, plugins load from local paths
    content = content.replace(PLUGIN_CDN_RE, () => {
        pluginReplaced = true;
        console.log('  ✏️  pluginCdnBase: → local (./)');
        return "var pluginCdnBase = './'";
    });
} else {
    content = content.replace(PLUGIN_CDN_RE, () => {
        pluginReplaced = true;
        const newBase = `${CLOUDFLARE_CDN_BASE}/`;
        console.log(`  ✏️  pluginCdnBase: → Cloudflare Pages (${CLOUDFLARE_CDN_BASE})`);
        return `var pluginCdnBase = '${newBase}'`;
    });
}

content = content.replace(PLUGIN_VERSION_RE, () => {
    const version = mode === 'dev' ? String(Date.now()) : gitHash;
    console.log(`  ✏️  pluginCdnVersion: → ${version}`);
    return `var pluginCdnVersion = '${version}'`;
});

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

    // ── Auto-copy module files to desktop/web-app/public/ ──
    const PUBLIC_DIR = path.join(ROOT, 'desktop/web-app', 'public');
    // Accessibility Lab uses a same-origin axe-core build first so audits work
    // offline and under restrictive content-security policies.
    const axeCoreSource = path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js');
    const axeCoreDest = path.join(PUBLIC_DIR, 'vendor', 'axe-core', 'axe.min.js');
    if (fs.existsSync(axeCoreSource)) {
        fs.mkdirSync(path.dirname(axeCoreDest), { recursive: true });
        fs.copyFileSync(axeCoreSource, axeCoreDest);
    }
    const modulesToCopy = [
        // Root-level modules
        ...MODULES.map(m => m.filename),
        'word_sounds_module.js',
        'teacher_module.js',
        'ui_strings.js',
        'qrcode.js',
        'escape_room_module.js',
        // stem_lab hub and Lumen support modules
        'stem_lab/stem_lab_module.js',
        'stem_lab/stem_lumen_evidence.js',
        'stem_lab/stem_lumen_documents.js',
        'stem_lab/stem_lumen_study.js'
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
    let assetDirCopyCount = 0;
    COMPANION_ASSET_DIRS.forEach(d => {
        const src = path.join(ROOT, d);
        const dest = path.join(PUBLIC_DIR, d);
        if (fs.existsSync(src)) {
            fs.rmSync(dest, { recursive: true, force: true });
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.cpSync(src, dest, { recursive: true });
            assetDirCopyCount++;
        }
    });
    console.log(`📦 Auto-copied ${copyCount} module/plugin files and ${assetDirCopyCount} companion asset folders to desktop/web-app/public/`);

    // Show next steps
    console.log('\n── Next Steps ──');
    if (mode === 'dev') {
        console.log('  Run: cd desktop/web-app && npm start');
        console.log('  ⚠️  Make sure stem_lab_module.js and word_sounds_module.js');
        console.log('     are available in desktop/web-app/public/ or served locally.');
    } else {
        console.log('  1. cd desktop/web-app && npm run build');
        console.log('  2. npx firebase deploy --only hosting');
        console.log(`  3. Commit updated AlloFlowANTI.txt with hash @${gitHash}`);
    }
}
