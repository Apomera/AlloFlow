/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/word_sounds_module.js",
        "./public/stem_lab_module.js",
        "./public/behavior_lens_module.js",
        "./public/report_writer_module.js",
        "./public/ui_strings.js",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
