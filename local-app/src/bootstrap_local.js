/**
 * local-app/src/bootstrap_local.js
 *
 * OPTIONAL OVERRIDE — Local pre-core shim.
 *
 * This file replaces AlloFlowANTI.txt lines 1–285 in the local build.
 * If this file exists, extract_modules_local.js uses it instead of the
 * inline DEFAULT_BOOTSTRAP_SHIM defined in the script.
 *
 * Edit this file to:
 *   - Change Ollama / SQLite default ports
 *   - Add local AI provider initialization
 *   - Adjust local auth logic
 *   - Customize audio bank loading
 *
 * The file is picked up automatically by:
 *   node scripts/extract_modules_local.js
 *   node local_build.js
 *
 * NOTE: This file contains JSX/ES module syntax and is compiled by esbuild
 * as part of the LocalApp.jsx assembly. Do NOT wrap in IIFE here.
 */

// @bootstrap-stub — This comment tells extract_modules_local.js to use the
// inline DEFAULT_BOOTSTRAP_SHIM instead of this file. Delete this line and
// add your custom code below when you are ready to override the default.
//
// The inline DEFAULT_BOOTSTRAP_SHIM in extract_modules_local.js provides
// the complete default implementation. Copy it here to start customizing.
