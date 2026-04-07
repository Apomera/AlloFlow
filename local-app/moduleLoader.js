/**
 * AlloFlow B4.1 — Module Loader (local app)
 *
 * Lazy-loads feature modules on demand via <script> injection.
 * Each module registers itself on window.AlloModules when loaded.
 *
 * Usage (called by app code when a feature is needed):
 *   await moduleLoader.load('word_sounds');
 *   const WordSoundsModal = window.AlloModules.WordSoundsModal;
 *
 * NOTE: In the v0.3.0 single-bundle build, all sections are compiled into
 * app.js and this loader is a no-op (modules are always present).
 * It will become active in B4 when lazy splitting is implemented.
 */

'use strict';

(function (global) {
    // Base URL where module JS files are served from (set by admin app or defaults)
    const BASE_URL = (global.__alloLocalConfig && global.__alloLocalConfig.modulesUrl) || './modules/';

    // Module registry: name → { file, windowKey, loaded, pending }
    const REGISTRY = {
        word_sounds:         { file: 'modules/word_sounds.js',         windowKey: 'WordSoundsModal' },
        visual_panel:        { file: 'modules/visual_panel.js',        windowKey: 'VisualPanel' },
        analytics:           { file: 'modules/analytics.js',           windowKey: 'StudentAnalytics' },
        student_interaction: { file: 'modules/student_interaction.js', windowKey: 'StudentInteraction' },
        allobot:             { file: 'modules/allobot.js',             windowKey: 'AlloBot' },
        teacher:             { file: 'modules/teacher.js',             windowKey: 'TeacherModule' },
        adventure:           { file: 'modules/adventure.js',           windowKey: 'AdventureModule' },
        games:               { file: 'modules/games.js',               windowKey: 'GamesBundle' },
        escape_room:         { file: 'modules/escape_room.js',         windowKey: 'EscapeRoom' },
        live_quiz:           { file: 'modules/live_quiz.js',           windowKey: 'LiveQuiz' },
        cast:                { file: 'modules/cast.js',                windowKey: 'CastLobby' },
        reader:              { file: 'modules/reader.js',              windowKey: 'Reader' },
    };

    const _pending = {};

    /**
     * Load a module by name. Returns a Promise that resolves when the module
     * is available on window.AlloModules.
     *
     * @param {string} name  Key from REGISTRY (e.g. 'word_sounds')
     * @returns {Promise<void>}
     */
    function load(name) {
        const meta = REGISTRY[name];
        if (!meta) {
            return Promise.reject(new Error('[ModuleLoader] Unknown module: ' + name));
        }

        // Already loaded (present on window.AlloModules)
        if (global.AlloModules && global.AlloModules[meta.windowKey]) {
            return Promise.resolve();
        }

        // Dedup in-flight loads
        if (_pending[name]) return _pending[name];

        _pending[name] = new Promise((resolve, reject) => {
            const url = BASE_URL + meta.file;
            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            script.onload = () => {
                delete _pending[name];
                if (global.AlloModules && global.AlloModules[meta.windowKey]) {
                    resolve();
                } else {
                    // Module loaded but didn't register — still resolve (it may have
                    // registered under a different key or the build bundles everything)
                    console.warn('[ModuleLoader] Module loaded but windowKey not found:', meta.windowKey);
                    resolve();
                }
            };

            script.onerror = () => {
                delete _pending[name];
                reject(new Error('[ModuleLoader] Failed to load: ' + url));
            };

            document.head.appendChild(script);
        });

        return _pending[name];
    }

    /**
     * Preload a list of modules (fire-and-forget, errors are logged not thrown).
     *
     * @param {string[]} names
     */
    function preload(names) {
        for (const name of names) {
            load(name).catch(err => console.warn('[ModuleLoader] Preload failed:', err.message));
        }
    }

    /**
     * Check if a module is already available (synchronous).
     *
     * @param {string} name
     * @returns {boolean}
     */
    function isLoaded(name) {
        const meta = REGISTRY[name];
        if (!meta) return false;
        return !!(global.AlloModules && global.AlloModules[meta.windowKey]);
    }

    // In the v0.3.0 single-bundle build all modules are bundled into app.js
    // so all modules are "loaded" from the start. Expose a flag so app code can
    // detect the build mode and skip dynamic loading.
    const SINGLE_BUNDLE = true; // Updated to false in B4 when lazy splits ship

    global.AlloModuleLoader = { load, preload, isLoaded, REGISTRY, SINGLE_BUNDLE };

})(typeof window !== 'undefined' ? window : global);
