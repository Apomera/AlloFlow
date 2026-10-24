/**
 * AlloFlow — UI Font Library Module
 *
 * Holds the FONT_OPTIONS catalog and a self-contained
 * CSS injection IIFE that defines the font utility classes and loads an
 * optional web font only when the user selects it, plus the
 * `.font-<id>` utility classes used throughout the app, plus responsive
 * and accessibility fixes that ride along.
 *
 * Extracted verbatim from AlloFlowANTI.txt lines 1251-1604 (May 2026).
 *
 * Load order:
 *   1. Monolith parses with shim:  var FONT_OPTIONS = [];
 *   2. loadModule('UIFontLibrary', ...) fires this file from CDN.
 *   3. This IIFE assigns FONT_OPTIONS, mirrors to window, and injects CSS.
 *   4. window._upgradeUIFontLibrary() (set by monolith) re-points the
 *      monolith's FONT_OPTIONS alias to the canonical array so JSX renders
 *      that follow get the real data.
 *
 * Pattern: feedback_monolith_extraction_pattern.md (4 prior deploys: AlloData,
 * FirestoreSync, LargeFileModule, KeyConceptMapModule, UtilsPure).
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.UIFontLibrary) {
    console.log('[CDN] UIFontLibraryModule already loaded, skipping');
    return;
  }

const FONT_OPTIONS = [
    { id: 'default', label: 'Default (System)', family: "", cssClass: '', category: 'default' },
    // Cross-platform stacks keep working in offline and no-egress deployments.
    { id: 'verdana', label: 'Verdana', family: "Verdana, Geneva, sans-serif", cssClass: 'font-verdana', googleFont: null, category: 'accessibility' },
    { id: 'tahoma', label: 'Tahoma', family: "Tahoma, Verdana, sans-serif", cssClass: 'font-tahoma', googleFont: null, category: 'accessibility' },
    { id: 'trebuchet', label: 'Trebuchet MS', family: "'Trebuchet MS', 'Segoe UI', sans-serif", cssClass: 'font-trebuchet', googleFont: null, category: 'sans-serif' },
    { id: 'georgia', label: 'Georgia', family: "Georgia, 'Times New Roman', serif", cssClass: 'font-georgia', googleFont: null, category: 'serif' },
    { id: 'palatino', label: 'Palatino', family: "Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif", cssClass: 'font-palatino', googleFont: null, category: 'serif' },
    { id: 'courier', label: 'Courier New', family: "'Courier New', Courier, monospace", cssClass: 'font-courier', googleFont: null, category: 'monospace' },
    { id: 'opendyslexic', label: 'OpenDyslexic', family: "'OpenDyslexic', sans-serif", cssClass: 'font-opendyslexic', googleFont: null, category: 'accessibility' },
    { id: 'lexend', label: 'Lexend', family: "'Lexend', sans-serif", cssClass: 'font-lexend', googleFont: 'Lexend:wght@400;500;700', category: 'accessibility' },
    { id: 'atkinson', label: 'Atkinson Hyperlegible', family: "'Atkinson Hyperlegible', sans-serif", cssClass: 'font-atkinson', googleFont: 'Atkinson+Hyperlegible:wght@400;700', category: 'accessibility' },
    // Andika (SIL): regular + bold + italic + bold-italic loaded in one Google Fonts call.
    // Italic and Bold Italic are surfaced as their own selectable font options (per teacher
    // request 2026-06-01) so they can be picked from the font dropdown alongside upright
    // Andika; CSS classes below set font-style/font-weight on top of the shared family.
    { id: 'andika', label: 'Andika (SIL)', family: "'Andika', sans-serif", cssClass: 'font-andika', googleFont: 'Andika:ital,wght@0,400;0,700;1,400;1,700', category: 'accessibility' },
    { id: 'andika-italic', label: 'Andika Italic (SIL)', family: "'Andika', sans-serif", cssClass: 'font-andika-italic', googleFont: null, category: 'accessibility' },
    { id: 'andika-bold-italic', label: 'Andika Bold Italic (SIL)', family: "'Andika', sans-serif", cssClass: 'font-andika-bold-italic', googleFont: null, category: 'accessibility' },
    { id: 'noto-sans', label: 'Noto Sans', family: "'Noto Sans', sans-serif", cssClass: 'font-noto-sans', googleFont: 'Noto+Sans:wght@400;500;600;700', category: 'language' },
    { id: 'noto-serif', label: 'Noto Serif', family: "'Noto Serif', serif", cssClass: 'font-noto-serif', googleFont: 'Noto+Serif:wght@400;500;600;700', category: 'language' },
    { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", cssClass: 'font-inter', googleFont: 'Inter:wght@400;500;600;700', category: 'sans-serif' },
    { id: 'roboto', label: 'Roboto', family: "'Roboto', sans-serif", cssClass: 'font-roboto', googleFont: 'Roboto:wght@400;500;700', category: 'sans-serif' },
    { id: 'opensans', label: 'Open Sans', family: "'Open Sans', sans-serif", cssClass: 'font-opensans', googleFont: 'Open+Sans:wght@400;600;700', category: 'sans-serif' },
    { id: 'lato', label: 'Lato', family: "'Lato', sans-serif", cssClass: 'font-lato', googleFont: 'Lato:wght@400;700', category: 'sans-serif' },
    { id: 'nunito', label: 'Nunito', family: "'Nunito', sans-serif", cssClass: 'font-nunito', googleFont: 'Nunito:wght@400;600;700', category: 'sans-serif' },
    { id: 'nunito-sans', label: 'Nunito Sans', family: "'Nunito Sans', sans-serif", cssClass: 'font-nunito-sans', googleFont: 'Nunito+Sans:wght@400;600;700', category: 'sans-serif' },
    { id: 'fira-sans', label: 'Fira Sans', family: "'Fira Sans', sans-serif", cssClass: 'font-fira-sans', googleFont: 'Fira+Sans:wght@400;500;600;700', category: 'sans-serif' },
    { id: 'ubuntu', label: 'Ubuntu', family: "'Ubuntu', sans-serif", cssClass: 'font-ubuntu', googleFont: 'Ubuntu:wght@400;500;700', category: 'sans-serif' },
    { id: 'sourcesans', label: 'Source Sans 3', family: "'Source Sans 3', sans-serif", cssClass: 'font-sourcesans', googleFont: 'Source+Sans+3:wght@400;600;700', category: 'sans-serif' },
    { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", cssClass: 'font-poppins', googleFont: 'Poppins:wght@400;500;600;700', category: 'modern' },
    { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", cssClass: 'font-montserrat', googleFont: 'Montserrat:wght@400;500;600;700', category: 'modern' },
    { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", cssClass: 'font-raleway', googleFont: 'Raleway:wght@400;500;600;700', category: 'modern' },
    { id: 'quicksand', label: 'Quicksand', family: "'Quicksand', sans-serif", cssClass: 'font-quicksand', googleFont: 'Quicksand:wght@400;500;700', category: 'modern' },
    { id: 'comic', label: 'Comic Neue', family: "'Comic Neue', cursive, sans-serif", cssClass: 'font-comic', googleFont: 'Comic+Neue:wght@400;700', category: 'modern' },
    { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif", cssClass: 'font-merriweather', googleFont: 'Merriweather:wght@400;700', category: 'serif' },
    { id: 'gentium', label: 'Gentium Plus', family: "'Gentium Book Plus', serif", cssClass: 'font-gentium', googleFont: 'Gentium+Book+Plus:wght@400;700', category: 'serif' },
    { id: 'lora', label: 'Lora', family: "'Lora', serif", cssClass: 'font-lora', googleFont: 'Lora:wght@400;500;700', category: 'serif' },
    { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", cssClass: 'font-playfair', googleFont: 'Playfair+Display:wght@400;500;700', category: 'serif' },
    { id: 'source-serif', label: 'Source Serif 4', family: "'Source Serif 4', serif", cssClass: 'font-source-serif', googleFont: 'Source+Serif+4:wght@400;600;700', category: 'serif' },
    { id: 'roboto-slab', label: 'Roboto Slab', family: "'Roboto Slab', serif", cssClass: 'font-roboto-slab', googleFont: 'Roboto+Slab:wght@400;500;700', category: 'serif' },
    { id: 'ibm-plex-mono', label: 'IBM Plex Mono', family: "'IBM Plex Mono', monospace", cssClass: 'font-ibm-plex-mono', googleFont: 'IBM+Plex+Mono:wght@400;500;700', category: 'monospace' },
    { id: 'jetbrains-mono', label: 'JetBrains Mono', family: "'JetBrains Mono', monospace", cssClass: 'font-jetbrains-mono', googleFont: 'JetBrains+Mono:wght@400;500;700', category: 'monospace' }
];
if (typeof window !== 'undefined') { window.FONT_OPTIONS = FONT_OPTIONS; }
(function injectFontStyles() {
    if (document.getElementById('alloflow-ui-font-library-css')) return;
    const fontLoads = Object.create(null);
    window.__alloEnsureUIFont = function (fontId) {
        // Italic variants share the complete Andika stylesheet, even on first use.
        const loadId = fontId === 'andika-italic' || fontId === 'andika-bold-italic' ? 'andika' : fontId;
        const option = FONT_OPTIONS.find(f => f.id === loadId);
        if (!option || !option.googleFont || option.id === 'inter') return Promise.resolve(true);
        if (fontLoads[option.id]) return fontLoads[option.id];
        fontLoads[option.id] = new Promise(resolve => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.dataset.alloflowUiFont = option.id;
            link.href = `https://fonts.googleapis.com/css2?family=${option.googleFont}&display=swap`;
            link.onload = () => resolve(true);
            link.onerror = () => { delete fontLoads[option.id]; resolve(false); };
            document.head.appendChild(link);
        });
        return fontLoads[option.id];
    };
    const style = document.createElement('style');
    style.id = 'alloflow-ui-font-library-css';
    style.textContent = `
    .font-opendyslexic, .font-opendyslexic *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'OpenDyslexic', sans-serif !important; }
    .font-verdana, .font-verdana *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: Verdana, Geneva, sans-serif !important; }
    .font-tahoma, .font-tahoma *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: Tahoma, Verdana, sans-serif !important; }
    .font-trebuchet, .font-trebuchet *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Trebuchet MS', 'Segoe UI', sans-serif !important; }
    .font-georgia, .font-georgia *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: Georgia, 'Times New Roman', serif !important; }
    .font-palatino, .font-palatino *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif !important; }
    .font-courier, .font-courier *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Courier New', Courier, monospace !important; }
    .font-lexend, .font-lexend *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Lexend', sans-serif !important; }
    .font-atkinson, .font-atkinson *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Atkinson Hyperlegible', sans-serif !important; }
    .font-andika, .font-andika *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Andika', sans-serif !important; }
    .font-andika-italic, .font-andika-italic *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Andika', sans-serif !important; font-style: italic !important; }
    .font-andika-bold-italic, .font-andika-bold-italic *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Andika', sans-serif !important; font-style: italic !important; font-weight: 700 !important; }
    .font-noto-sans, .font-noto-sans *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Noto Sans', sans-serif !important; }
    .font-noto-serif, .font-noto-serif *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Noto Serif', serif !important; }
    .font-inter, .font-inter *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Inter', sans-serif !important; }
    .font-roboto, .font-roboto *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Roboto', sans-serif !important; }
    .font-opensans, .font-opensans *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Open Sans', sans-serif !important; }
    .font-lato, .font-lato *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Lato', sans-serif !important; }
    .font-nunito, .font-nunito *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Nunito', sans-serif !important; }
    .font-nunito-sans, .font-nunito-sans *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Nunito Sans', sans-serif !important; }
    .font-fira-sans, .font-fira-sans *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Fira Sans', sans-serif !important; }
    .font-ubuntu, .font-ubuntu *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Ubuntu', sans-serif !important; }
    .font-sourcesans, .font-sourcesans *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Source Sans 3', sans-serif !important; }
    .font-poppins, .font-poppins *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Poppins', sans-serif !important; }
    .font-montserrat, .font-montserrat *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Montserrat', sans-serif !important; }
    .font-raleway, .font-raleway *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Raleway', sans-serif !important; }
    .font-quicksand, .font-quicksand *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Quicksand', sans-serif !important; }
    .font-comic, .font-comic *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Comic Neue', cursive, sans-serif !important; }
    .font-merriweather, .font-merriweather *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Merriweather', serif !important; }
    .font-gentium, .font-gentium *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Gentium Book Plus', serif !important; }
    .font-lora, .font-lora *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Lora', serif !important; }
    .font-playfair, .font-playfair *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Playfair Display', serif !important; }
    .font-source-serif, .font-source-serif *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Source Serif 4', serif !important; }
    .font-roboto-slab, .font-roboto-slab *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'Roboto Slab', serif !important; }
    .font-ibm-plex-mono, .font-ibm-plex-mono *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'IBM Plex Mono', monospace !important; }
    .font-jetbrains-mono, .font-jetbrains-mono *:not(svg, svg *, math, math *, .katex, .katex *, .temml, .temml *, math-field, math-field *) { font-family: 'JetBrains Mono', monospace !important; }
    @media (max-width: 768px) {
      select, [role="listbox"], [role="menu"], [role="combobox"] {
        z-index: 50 !important;
        position: relative;
      }
      .overflow-hidden:has(select),
      .overflow-hidden:has([role="listbox"]),
      .overflow-hidden:has([role="menu"]) {
        overflow: visible !important;
      }
      [class*="fixed"][class*="inset-0"] > div {
        max-height: 95vh;
        max-height: 95dvh;
      }
      [class*="fixed"][class*="inset-0"] [class*="overflow-y-auto"] {
        -webkit-overflow-scrolling: touch;
      }
      [class*="fixed"] [class*="max-w-"] {
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      header select, nav select, [class*="sticky"] select {
        z-index: 50 !important;
      }
      #tour-header-settings .absolute.top-full {
        position: fixed !important;
        top: 80px !important;
        right: auto !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        max-width: calc(100vw - 2rem) !important;
      }
      #tour-header-settings .relative {
        position: static !important;
      }
      [class*="text-2xl"][class*="font-black"],
      [class*="text-xl"][class*="font-bold"],
      [class*="text-lg"][class*="font-bold"] {
        font-weight: 700 !important;
      }
    }
    
    .prose {
      font-weight: 400 !important;
      color: #334155;
      max-width: 65ch;
      line-height: 1.6;
    }
    .prose p, .prose span, .prose li, .prose td, .prose th,
    .prose div:not([class*="font-bold"]):not([class*="font-black"]) {
      font-weight: 400 !important;
    }
    .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
      font-weight: 700 !important;
      font-family: inherit !important;
      color: #0f172a !important;
      line-height: 1.3 !important;
    }
    .prose h1 { font-size: 2.25rem !important; margin-top: 2rem !important; margin-bottom: 1rem !important; }
    .prose h2 { font-size: 1.5rem !important; margin-top: 2rem !important; margin-bottom: 1rem !important; }
    .prose h3 { font-size: 1.25rem !important; margin-top: 1.5rem !important; margin-bottom: 0.75rem !important; }
    .prose h4, .prose h5, .prose h6 { font-size: 1rem !important; margin-top: 1.5rem !important; margin-bottom: 0.75rem !important; }
    .prose p { margin-top: 1.25em !important; margin-bottom: 1.25em !important; }
    .prose ul, .prose ol { margin-top: 1.25em !important; margin-bottom: 1.25em !important; padding-left: 1.625em !important; }
    .prose ul { list-style-type: disc !important; }
    .prose ol { list-style-type: decimal !important; }
    .prose li { margin-top: 0.5em !important; margin-bottom: 0.5em !important; }
    .prose a { color: #3b82f6 !important; text-decoration: underline; font-weight: 500; }
    .prose strong, .prose b, .prose [class*="font-bold"], .prose [class*="font-black"] {
      font-weight: 600 !important;
      color: #0f172a !important;
    }
    .prose [role="dialog"] strong { color: #fde047 !important; }
    .prose blockquote {
      font-weight: 500;
      font-style: italic;
      color: #1e293b;
      border-left-width: 0.25rem;
      border-left-color: #e2e8f0;
      quotes: "\\201C""\\201D""\\2018""\\2019";
      margin-top: 1.6em;
      margin-bottom: 1.6em;
      padding-left: 1em;
    }
    .prose hr {
      border-color: #e2e8f0;
      border-top-width: 1px;
      margin-top: 3em;
      margin-bottom: 3em;
    }
    .prose figure { margin-top: 2em; margin-bottom: 2em; }
    .prose pre {
      color: #e2e8f0;
      background-color: #1e293b;
      overflow-x: auto;
      font-weight: 400;
      font-size: 0.875em;
      line-height: 1.7142857;
      margin-top: 1.7142857em;
      margin-bottom: 1.7142857em;
      border-radius: 0.375rem;
      padding: 0.8571429em 1.1428571em;
    }
    .prose pre code {
      background-color: transparent;
      border-width: 0;
      border-radius: 0;
      padding: 0;
      font-weight: inherit;
      color: inherit;
      font-size: inherit;
      font-family: inherit;
      line-height: inherit;
    }
    .prose code {
      color: #0f172a;
      background-color: #f1f5f9;
      font-weight: 600;
      font-size: 0.875em;
      border-radius: 0.25rem;
      padding: 0.25rem 0.375rem;
    }
    .prose table {
      width: 100%;
      table-layout: auto;
      text-align: left;
      margin-top: 2em;
      margin-bottom: 2em;
      font-size: 0.875em;
      line-height: 1.7142857;
    }
    .prose thead { color: #0f172a; font-weight: 600; border-bottom-width: 1px; border-bottom-color: #cbd5e1; }
    .prose thead th { vertical-align: bottom; padding-right: 0.5714286em; padding-bottom: 0.5714286em; padding-left: 0.5714286em; }
    .prose tbody tr { border-bottom-width: 1px; border-bottom-color: #e2e8f0; }
    .prose tbody tr:last-child { border-bottom-width: 0; }
    .prose tbody td { vertical-align: baseline; padding-top: 0.5714286em; padding-right: 0.5714286em; padding-bottom: 0.5714286em; padding-left: 0.5714286em; }
    @media (max-width: 480px) {
      [class*="fixed"][class*="inset-0"] {
        padding: 8px;
      }
      [class*="fixed"][class*="inset-0"] > div {
        max-width: calc(100vw - 16px) !important;
      }
      [class*="fixed"][class*="inset-0"] [class*="p-6"] {
        padding: 12px;
      }
      [class*="fixed"][class*="inset-0"] [class*="p-8"] {
        padding: 16px;
      }
    }
    @media (max-width: 768px) {
      [class*="fixed"][class*="inset-0"] {
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch;
      }
      [class*="fixed"][class*="inset-0"] > [class*="flex-col"] {
        max-height: 100%;
        overflow-y: auto;
      }
    }
    @supports (padding: env(safe-area-inset-top)) {
      @media (max-width: 768px) {
        [class*="fixed"][class*="inset-0"] {
          padding-top: max(8px, env(safe-area-inset-top));
          padding-left: max(8px, env(safe-area-inset-left));
          padding-right: max(8px, env(safe-area-inset-right));
          padding-bottom: max(8px, env(safe-area-inset-bottom));
        }
        [class*="fixed"][class*="bottom-"] {
          padding-bottom: env(safe-area-inset-bottom);
        }
      }
    }
    @media (max-width: 768px) and (orientation: landscape) {
      [class*="fixed"][class*="inset-0"] > div {
        max-height: 90vh;
        max-height: 90dvh;
      }
      [class*="fixed"][class*="inset-0"] [class*="grid-cols-2"] {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 768px) {
      [class*="fixed"][class*="inset-0"],
      [class*="fixed"][class*="inset-0"] > div {
        transition: max-height 0.3s ease-out, padding 0.2s ease-out;
      }
    }
    @media print {
      [class*="fixed"][class*="inset-0"] {
        position: static !important;
        padding: 0 !important;
        max-height: none !important;
        overflow: visible !important;
      }
      [class*="fixed"][class*="inset-0"] > div {
        max-width: 100% !important;
        max-height: none !important;
        box-shadow: none !important;
        border: none !important;
      }
    }
    @media (max-width: 768px) {
      nav[aria-label] {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x mandatory;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE/Edge */
        flex-wrap: nowrap !important;
        gap: 2px;
      }
      nav[aria-label]::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
      }
      nav[aria-label] > button {
        scroll-snap-align: start;
        flex-shrink: 0;
        min-width: max-content;
        white-space: nowrap;
      }
    }
    @media (max-width: 768px) {
      button, [role="button"], a[href], select, input[type="checkbox"], input[type="radio"] {
        min-height: 44px;
        min-width: 44px;
      }
      button[class*="p-1"], button[class*="p-0.5"] {
        min-height: 36px;
        min-width: 36px;
      }
      nav[aria-label] > button {
        min-height: 44px;
        padding: 8px 16px;
      }
      button[class*="rounded-full"], button[class*="rounded-xl"] {
        min-height: 44px;
        min-width: 44px;
      }
    }
    @media (pointer: coarse) {
      [class*="cursor-grab"], [class*="cursor-grabbing"],
      [class*="GripVertical"], [class*="GripHorizontal"] {
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      [draggable="true"] {
        -webkit-user-select: none;
        user-select: none;
        touch-action: none;
      }
      button[class*="border"][class*="rounded"] {
        min-height: 48px;
        padding-top: 10px;
        padding-bottom: 10px;
      }
    }
    @media (min-width: 768px) and (max-width: 1024px) {
      .grid-cols-3 { grid-template-columns: repeat(2, 1fr) !important; }
      [class*="max-w-5xl"] { max-width: calc(100vw - 2rem) !important; }
      [class*="max-w-4xl"] { max-width: calc(100vw - 2rem) !important; }
    }
    .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
    .no-scrollbar::-webkit-scrollbar { display: none; }

    button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible,
    textarea:focus-visible, [tabindex]:focus-visible, [role="button"]:focus-visible,
    summary:focus-visible, details:focus-visible {
      outline: 2px solid #4f46e5 !important;
      outline-offset: 2px !important;
      box-shadow: 0 0 0 4px rgba(79,70,229,0.15) !important;
    }

    .group:focus-within .group-hover\\:opacity-100 { opacity: 1 !important; }
    .group:focus-within .group-hover\\:visible { visibility: visible !important; }

    @media (prefers-reduced-motion: reduce) {
      .animate-spin, .animate-pulse, .animate-bounce, .animate-ping,
      [class*="animate-in"], [class*="slide-in"], [class*="fade-in"], [class*="zoom-in"] {
        animation: none !important;
        transition: none !important;
      }
    }

    @media (pointer: coarse) {
      button, [role="button"], a, input[type="checkbox"], input[type="radio"] {
        min-height: 44px;
        min-width: 44px;
      }
    }
  `;
    document.head.appendChild(style);
    // A persisted custom choice represents explicit user intent, so restore
    // that one family now. The default path never downloads the full catalog.
    try { window.__alloEnsureUIFont(localStorage.getItem('allo_selected_font') || 'default'); } catch (_) {}
    // Font loading must never change whether an application control is enabled.
})();


  // ── Reading settings panel and export helpers (2026-10-20) ──
  // One "Aa" panel any screen can open, including full-screen activities that
  // cover the header and overlays attached to <body>. It reads and writes the
  // host's saved settings through window.__alloReadingSettings (AlloFlowANTI),
  // so a change applies everywhere at once.
  var RS_CSS = '.allo-reading-settings{position:fixed;z-index:2147483000;box-sizing:border-box;width:min(23rem,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;background:#fff;color:#0f172a;border:1px solid #94a3b8;border-radius:14px;box-shadow:0 18px 50px rgba(15,23,42,.35);padding:14px 16px;text-align:start}'
    + '.allo-reading-settings h2{margin:0;font-size:1.1rem;font-weight:800}'
    + '.allo-reading-settings .rs-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}'
    + '.allo-reading-settings .rs-row{display:grid;gap:4px;margin:10px 0}'
    + '.allo-reading-settings .rs-label{display:flex;justify-content:space-between;gap:8px;font-weight:700;font-size:.9rem}'
    + '.allo-reading-settings .rs-line{display:flex;align-items:center;gap:8px}'
    + '.allo-reading-settings input[type=range]{flex:1;min-width:0;min-height:44px;accent-color:#4338ca}'
    + '.allo-reading-settings select{min-height:44px;width:100%;border:1px solid #64748b;border-radius:8px;padding:4px 8px;background:#fff;color:#0f172a;font:inherit}'
    + '.allo-reading-settings button{min-height:44px;min-width:44px;border:1px solid #64748b;border-radius:8px;background:#f8fafc;color:#0f172a;font:inherit;font-weight:700;padding:4px 10px;cursor:pointer}'
    + '.allo-reading-settings button:focus-visible,.allo-reading-settings input:focus-visible,.allo-reading-settings select:focus-visible{outline:3px solid #4338ca;outline-offset:2px}'
    + '.allo-reading-settings fieldset{border:0;padding:0;margin:10px 0}.allo-reading-settings legend{font-weight:700;font-size:.9rem;margin-bottom:4px}'
    + '.allo-reading-settings .rs-choices{display:flex;flex-wrap:wrap;gap:6px}.allo-reading-settings .rs-choices label,.allo-reading-settings .rs-check{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 8px;border:1px solid #cbd5e1;border-radius:8px}'
    + '@media (max-width:520px){.allo-reading-settings{left:8px!important;right:8px!important;top:auto!important;bottom:8px!important;width:auto}}'
    + '@media (prefers-color-scheme:dark){.allo-reading-settings.rs-follow-dark{background:#0f172a;color:#f8fafc;border-color:#475569}}';
  var rsActive = null;
  function readingSettingsAvailable() {
    return !!(window.__alloReadingSettings && typeof window.__alloReadingSettings.get === 'function' && typeof window.__alloReadingSettings.set === 'function');
  }
  function rsText(t, key, fallback) {
    var value = '';
    try { value = typeof t === 'function' ? t(key) : ''; } catch (_) { value = ''; }
    return typeof value === 'string' && value && value !== key ? value : fallback;
  }
  function closeReadingSettings() { if (rsActive) rsActive.close(true); }
  // options: { opener, container?, t?, onClose? }. Opening again from the same opener closes it (a toggle).
  function openReadingSettings(options) {
    options = options || {};
    var api = window.__alloReadingSettings;
    if (!readingSettingsAvailable()) return null;
    var opener = options.opener || null;
    if (rsActive) { var same = rsActive.opener && rsActive.opener === opener; rsActive.close(!same); if (same) return null; }
    var doc = document;
    if (!doc.getElementById('allo-reading-settings-css')) {
      var st = doc.createElement('style'); st.id = 'allo-reading-settings-css'; st.textContent = RS_CSS; doc.head.appendChild(st);
    }
    var t = options.t;
    var tx = function (k, en) { return rsText(t, k, en); };
    // Inside the opener's dialog: a modal's focus trap or inert siblings must not cut the panel off.
    var container = options.container || (opener && opener.closest && opener.closest('[role="dialog"],[aria-modal="true"]')) || doc.body;
    if (doc.fullscreenElement && !doc.fullscreenElement.contains(container)) container = doc.fullscreenElement;
    var uid = 'allo-rs-' + Math.random().toString(36).slice(2, 8);
    var el = function (tag, attrs, kids) {
      var n = doc.createElement(tag);
      Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
      (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
      return n;
    };
    var s = api.get();
    var panel = el('div', { 'class': 'allo-reading-settings', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': uid + '-title', 'data-allo-reading-settings': 'true', id: uid });
    var closeBtn = el('button', { type: 'button', 'aria-label': tx('common.close', 'Close'), text: '×' });
    panel.appendChild(el('div', { 'class': 'rs-head' }, [el('h2', { id: uid + '-title', text: tx('reading_settings.title', 'Reading settings') }), closeBtn]));
    // Font
    var fontSel = el('select', { id: uid + '-font' });
    (s.fonts || []).forEach(function (f) { var o = el('option', { value: f.id, text: f.label }); fontSel.appendChild(o); });
    fontSel.value = s.fontId;
    panel.appendChild(el('div', { 'class': 'rs-row' }, [el('label', { 'for': uid + '-font', 'class': 'rs-label', text: tx('settings.text.font_family', 'Font Family') }), fontSel]));
    // Ranges
    var range = function (key, label, min, max, step, value, format) {
      var out = el('output', { id: uid + '-' + key + '-out', 'for': uid + '-' + key });
      var input = el('input', { type: 'range', id: uid + '-' + key, min: String(min), max: String(max), step: String(step), value: String(value), 'aria-describedby': uid + '-' + key + '-out' });
      out.textContent = format(value);
      var row = el('div', { 'class': 'rs-row' }, [el('div', { 'class': 'rs-label' }, [el('label', { 'for': uid + '-' + key, text: label }), out])]);
      return { row: row, input: input, out: out, format: format };
    };
    var size = range('size', tx('settings.text.size', 'Size'), 10, 48, 1, s.baseFontSize, function (v) { return Math.round(v) + ' px'; });
    var smaller = el('button', { type: 'button', 'aria-label': tx('reading_settings.smaller', 'Smaller text'), text: 'A−' });
    var larger = el('button', { type: 'button', 'aria-label': tx('reading_settings.larger', 'Larger text'), text: 'A+' });
    size.row.appendChild(el('div', { 'class': 'rs-line' }, [smaller, size.input, larger]));
    panel.appendChild(size.row);
    var lh = range('line', tx('settings.text.line_height', 'Line Height'), 1, 2.5, 0.1, s.lineHeight, function (v) { return Number(v).toFixed(1); });
    lh.row.appendChild(lh.input); panel.appendChild(lh.row);
    var ls = range('spacing', tx('settings.text.spacing', 'Letter Spacing'), 0, 0.2, 0.01, s.letterSpacing, function (v) { return Number(v).toFixed(2) + ' em'; });
    ls.row.appendChild(ls.input); panel.appendChild(ls.row);
    // Color overlay
    var overlayNames = { none: tx('header.overlay_none', 'None'), blue: tx('header.reading_theme_blue', 'Blue'), peach: tx('header.overlay_peach', 'Peach'), yellow: tx('header.overlay_yellow', 'Yellow') };
    var choices = el('div', { 'class': 'rs-choices' });
    var radios = {};
    Object.keys(overlayNames).forEach(function (k) {
      var r = el('input', { type: 'radio', name: uid + '-overlay', value: k });
      r.checked = s.colorOverlay === k;
      radios[k] = r;
      choices.appendChild(el('label', null, [r, el('span', { text: overlayNames[k] })]));
    });
    panel.appendChild(el('fieldset', null, [el('legend', { text: tx('reading_settings.overlay', 'Color overlay') }), choices]));
    // Ruler
    var ruler = el('input', { type: 'checkbox', id: uid + '-ruler' });
    ruler.checked = !!s.readingRuler;
    panel.appendChild(el('div', { 'class': 'rs-row' }, [el('label', { 'class': 'rs-check', 'for': uid + '-ruler' }, [ruler, el('span', { text: tx('reading_settings.ruler', 'Reading ruler') })])]));
    var reset = el('button', { type: 'button', text: tx('header.reset_size_spacing', 'Reset size & spacing') });
    panel.appendChild(reset);
    // Wiring: every change applies at once; the host echo refreshes the readouts.
    fontSel.addEventListener('change', function () { api.set({ fontId: fontSel.value }); });
    size.input.addEventListener('input', function () { api.set({ baseFontSize: Number(size.input.value) }); });
    smaller.addEventListener('click', function () { api.set({ baseFontSize: Number(size.input.value) - 1 }); });
    larger.addEventListener('click', function () { api.set({ baseFontSize: Number(size.input.value) + 1 }); });
    lh.input.addEventListener('input', function () { api.set({ lineHeight: Number(lh.input.value) }); });
    ls.input.addEventListener('input', function () { api.set({ letterSpacing: Number(ls.input.value) }); });
    Object.keys(radios).forEach(function (k) { radios[k].addEventListener('change', function () { if (radios[k].checked) api.set({ colorOverlay: k }); }); });
    ruler.addEventListener('change', function () { api.set({ readingRuler: ruler.checked }); });
    reset.addEventListener('click', function () { api.set({ baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0 }); });
    var refresh = function (n) {
      n = n || api.get();
      if (fontSel.value !== n.fontId) fontSel.value = n.fontId;
      [[size, n.baseFontSize], [lh, n.lineHeight], [ls, n.letterSpacing]].forEach(function (pair) {
        if (doc.activeElement !== pair[0].input) pair[0].input.value = String(pair[1]);
        pair[0].out.textContent = pair[0].format(pair[1]);
      });
      Object.keys(radios).forEach(function (k) { radios[k].checked = n.colorOverlay === k; });
      ruler.checked = !!n.readingRuler;
    };
    var unsubscribe = typeof api.subscribe === 'function' ? api.subscribe(refresh) : function () {};
    container.appendChild(panel);
    // Place it by the opener (bottom sheet on narrow screens, by CSS).
    var place = function () {
      var w = panel.offsetWidth || 360, h = panel.offsetHeight || 420;
      var vw = window.innerWidth || 1024, vh = window.innerHeight || 768;
      var r = opener && opener.getBoundingClientRect ? opener.getBoundingClientRect() : null;
      var top = r ? r.bottom + 8 : 16, left = r ? r.right - w : vw - w - 16;
      if (top + h > vh - 8) top = r ? Math.max(8, r.top - h - 8) : 8;
      panel.style.top = Math.max(8, Math.min(top, vh - h - 8)) + 'px';
      panel.style.left = Math.max(8, Math.min(left, vw - w - 8)) + 'px';
    };
    place();
    if (opener) { opener.setAttribute('aria-expanded', 'true'); opener.setAttribute('aria-controls', uid); }
    var focusables = function () { return Array.prototype.slice.call(panel.querySelectorAll('button,select,input')).filter(function (n) { return !n.disabled; }); };
    var onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); handle.close(true); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return;
      // Arrow keys in a radio group stay native; Tab cycles inside the panel.
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      e.stopPropagation();
    };
    var onDown = function (e) { if (!panel.contains(e.target) && !(opener && opener.contains(e.target))) handle.close(false); };
    panel.addEventListener('keydown', onKey);
    doc.addEventListener('pointerdown', onDown, true);
    window.addEventListener('resize', place);
    closeBtn.addEventListener('click', function () { handle.close(true); });
    var handle = {
      opener: opener,
      element: panel,
      close: function (returnFocus) {
        if (rsActive !== handle) return;
        rsActive = null;
        unsubscribe();
        doc.removeEventListener('pointerdown', onDown, true);
        window.removeEventListener('resize', place);
        panel.remove();
        if (opener) { opener.setAttribute('aria-expanded', 'false'); }
        if (returnFocus && opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
        if (typeof options.onClose === 'function') { try { options.onClose(); } catch (_) {} }
      },
    };
    rsActive = handle;
    fontSel.focus();
    return handle;
  }

  // Exports and printouts. The reader's font, size and spacing as CSS for a printed
  // or exported document, plus the font face itself: a <link> for print windows,
  // embedded data for offline files (their security policy blocks remote fonts).
  var OPEN_DYSLEXIC = [['400', 'https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.2.5/files/opendyslexic-latin-400-normal.woff'], ['700', 'https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.2.5/files/opendyslexic-latin-700-normal.woff']];
  function readerSettingsNow() { return readingSettingsAvailable() ? window.__alloReadingSettings.get() : null; }
  function readerExportCss(settings, options) {
    var s = settings || readerSettingsNow();
    if (!s) return '';
    options = options || {};
    var scope = options.scope || 'body';
    var skip = ':not(svg):not(svg *):not(math):not(math *)';
    var rules = [];
    if (s.fontFamily) rules.push(scope + ',' + scope + ' *' + skip + '{font-family:' + s.fontFamily + ' !important}');
    if (s.fontClass === 'font-andika-italic' || s.fontClass === 'font-andika-bold-italic') rules.push(scope + ' *' + skip + '{font-style:italic}');
    if (Number.isFinite(s.baseFontSize) && options.size !== false) rules.push('html{font-size:' + Math.max(10, Math.min(48, s.baseFontSize)) + 'px}');
    rules.push(scope + ' :is(p,li,dd,dt,td,th,h1,h2,h3,h4,h5,h6,span,div,label,figcaption,button,a)' + skip + '{line-height:' + (Number(s.lineHeight) || 1.6) + ' !important;letter-spacing:' + (Number(s.letterSpacing) || 0) + 'em !important}');
    return rules.join('\n');
  }
  function fontOption(fontId) {
    var id = fontId === 'andika-italic' || fontId === 'andika-bold-italic' ? 'andika' : fontId;
    return FONT_OPTIONS.find(function (f) { return f.id === id; }) || null;
  }
  function bytesToBase64(buffer) {
    var bytes = new Uint8Array(buffer), out = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(out);
  }
  // Resolves to { head, css }: head = <link> markup for documents that may load remote
  // fonts; css = @font-face rules with the font embedded (embed: true). Falls back to
  // { head: '', css: '' } (system fonts) when the font is a system font or cannot be fetched.
  function exportFontFaceCss(fontId, options) {
    options = options || {};
    var o = fontOption(fontId || (readerSettingsNow() || {}).fontId);
    var none = { head: '', css: '' };
    if (!o || (o.id !== 'opendyslexic' && !o.googleFont)) return Promise.resolve(none);
    var cssUrl = o.googleFont ? 'https://fonts.googleapis.com/css2?family=' + o.googleFont + '&display=swap' : '';
    if (!options.embed) {
      if (o.id === 'opendyslexic') return Promise.resolve({ head: '', css: OPEN_DYSLEXIC.map(function (w) { return "@font-face{font-family:'OpenDyslexic';src:url('" + w[1] + "') format('woff');font-weight:" + w[0] + ';font-display:swap}'; }).join('') });
      return Promise.resolve({ head: '<link rel="stylesheet" href="' + cssUrl + '">', css: '' });
    }
    var limit = options.maxBytes || 3 * 1024 * 1024, used = 0;
    var fetchFont = function (url) {
      return fetch(url).then(function (r) { if (!r.ok) throw new Error('font ' + r.status); return r.arrayBuffer(); }).then(function (buf) {
        used += buf.byteLength; if (used > limit) throw new Error('font too large to embed');
        return bytesToBase64(buf);
      });
    };
    var mime = function (url) { return /\.woff2(\?|$)/.test(url) ? 'font/woff2' : 'font/woff'; };
    var job = o.id === 'opendyslexic'
      ? Promise.all(OPEN_DYSLEXIC.map(function (w) { return fetchFont(w[1]).then(function (b64) { return "@font-face{font-family:'OpenDyslexic';src:url(data:font/woff;base64," + b64 + ") format('woff');font-weight:" + w[0] + ';font-display:swap}'; }); })).then(function (parts) { return parts.join(''); })
      : fetch(cssUrl).then(function (r) { if (!r.ok) throw new Error('css ' + r.status); return r.text(); }).then(function (css) {
          var urls = []; css.replace(/url\((['"]?)([^'")]+)\1\)/g, function (m, q, u) { if (urls.indexOf(u) < 0) urls.push(u); return m; });
          return Promise.all(urls.map(function (u) { return fetchFont(u).then(function (b64) { return [u, 'data:' + mime(u) + ';base64,' + b64]; }); })).then(function (pairs) {
            pairs.forEach(function (p) { css = css.split(p[0]).join(p[1]); });
            return css;
          });
        });
    return job.then(function (css) { return { head: '', css: css }; }, function () { return none; });
  }

  // Register on AlloModules so callers + the host upgrade hook can find us.
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.UIFontLibrary = {
    FONT_OPTIONS: FONT_OPTIONS,
    readingSettingsAvailable: readingSettingsAvailable,
    openReadingSettings: openReadingSettings,
    closeReadingSettings: closeReadingSettings,
    readerExportCss: readerExportCss,
    exportFontFaceCss: exportFontFaceCss,
  };

  // Trigger the host-scope upgrade hook if the monolith set one up.
  // Pattern: feedback_iife_lazy_lookup.md — re-points the monolith's var
  // FONT_OPTIONS alias to the canonical array so JSX renders that follow
  // get the real data (rather than the empty-array shim).
  if (typeof window._upgradeUIFontLibrary === 'function') {
    try { window._upgradeUIFontLibrary(); } catch (e) { console.warn('[UIFontLibrary] _upgradeUIFontLibrary failed', e); }
  }

  console.log('[CDN] UIFontLibraryModule loaded — ' + FONT_OPTIONS.length + ' fonts registered');
})();
