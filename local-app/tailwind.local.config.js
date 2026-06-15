/**
 * Tailwind config for the LOCAL app build (local_build.js).
 *
 * Reuses the web app's config (theme + safelist) but scans the local app's
 * sources plus everything the local build serves at runtime, so no class
 * used by a runtime-loaded module gets tree-shaken away.
 */
const webConfig = require('../prismflow-deploy/tailwind.config.js');

module.exports = {
    ...webConfig,
    content: [
        './src/**/*.{js,jsx,ts,tsx}',
        './public/**/*.{js,html}',
        '../prismflow-deploy/public/**/*.{js,jsx,html}',
    ],
};
