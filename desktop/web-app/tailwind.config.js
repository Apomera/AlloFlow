/** @type {import('tailwindcss').Config} */
// Content paths must cover every file where Tailwind classes appear, or the class
// gets tree-shaken out of the production CSS and users see unstyled elements.
//
// Previously this list only covered ./src/**/* + 5 hand-picked module files,
// which meant 70+ STEM Lab tools, SEL Hub tools, and a dozen feature modules
// were silently excluded. Any class used only in one of those (e.g. a unique
// color on one rare tool) would be missing from the build.
//
// The globs below scan:
//   - ./src/**  → App.jsx (which is synced from AlloFlowANTI.txt) + index.js
//   - ./public/**/*.{js,jsx,html}  → all CDN-loaded modules, STEM Lab/SEL Hub
//     plugins, dev-mode loaders, fallback HTML pages
//
// Kept out of scope (known to have no Tailwind): *.json, *.css, *.map, sw.js.
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/**/*.{js,jsx,html}",
    ],
    // Safelist for dynamically-constructed classes. Tailwind's scanner only finds
    // whole class names in source; patterns like `bg-${color}-500` evaluated at
    // runtime will be missed. Keep this minimal — each entry adds rules to the CSS
    // bundle whether or not they're used. Add only when a concrete missing-style
    // bug is observed in production.
    safelist: [
        // AlloFlow uses dynamic indigo/emerald/amber/red/slate color families for
        // state indicators (success/warning/error) — hedge against tree-shake misses.
        // rose/violet/sky added 2026-06-11: the shared visual-organizer accent
        // palette (_CONCEPT_ACCENTS in key_concept_map_source.jsx + the Venn tokens
        // in concept_map_handlers) applies them via dynamic bg-/border-/ring-${accent}
        // classes the purge can't statically see. Without these, the prismflow build
        // silently dropped those families (latent missing-style bug).
        { pattern: /^(bg|text|border|ring)-(indigo|emerald|amber|red|slate|purple|blue|cyan|teal|rose|violet|sky)-(50|100|200|300|400|500|600|700|800|900)$/ },
    ],
    theme: {
        extend: {},
    },
    // tailwindcss-animate (2026-08-16): the codebase carries 255 animate-in /
    // fade-in / slide-in-from-* / zoom-in-* call sites that were written for this
    // plugin but it was never installed, so none of them ever played (W2's
    // repo-wide finding). Entry animations only — zero animate-out sites exist.
    // The global prefers-reduced-motion guard in app_styles_source.jsx:322 and
    // the app's own disableAnimations setting cover everything this enables.
    plugins: [require('tailwindcss-animate')],
}
