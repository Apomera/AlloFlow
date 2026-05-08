/**
 * AlloFlow — UI Font Library Module
 *
 * Holds the FONT_OPTIONS catalog (20 font families) and a self-contained
 * CSS injection IIFE that loads the Google Fonts <link> and defines the
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
    { id: 'default', label: 'Default (System)', cssClass: '', category: 'default' },
    { id: 'opendyslexic', label: 'OpenDyslexic', cssClass: 'font-opendyslexic', googleFont: null, category: 'accessibility' },
    { id: 'lexend', label: 'Lexend', cssClass: 'font-lexend', googleFont: 'Lexend:wght@400;500;700', category: 'accessibility' },
    { id: 'atkinson', label: 'Atkinson Hyperlegible', cssClass: 'font-atkinson', googleFont: 'Atkinson+Hyperlegible:wght@400;700', category: 'accessibility' },
    { id: 'andika', label: 'Andika (SIL)', cssClass: 'font-andika', googleFont: 'Andika:wght@400;700', category: 'accessibility' },
    { id: 'inter', label: 'Inter', cssClass: 'font-inter', googleFont: 'Inter:wght@400;500;600;700', category: 'sans-serif' },
    { id: 'roboto', label: 'Roboto', cssClass: 'font-roboto', googleFont: 'Roboto:wght@400;500;700', category: 'sans-serif' },
    { id: 'opensans', label: 'Open Sans', cssClass: 'font-opensans', googleFont: 'Open+Sans:wght@400;600;700', category: 'sans-serif' },
    { id: 'lato', label: 'Lato', cssClass: 'font-lato', googleFont: 'Lato:wght@400;700', category: 'sans-serif' },
    { id: 'nunito', label: 'Nunito', cssClass: 'font-nunito', googleFont: 'Nunito:wght@400;600;700', category: 'sans-serif' },
    { id: 'sourcesans', label: 'Source Sans 3', cssClass: 'font-sourcesans', googleFont: 'Source+Sans+3:wght@400;600;700', category: 'sans-serif' },
    { id: 'poppins', label: 'Poppins', cssClass: 'font-poppins', googleFont: 'Poppins:wght@400;500;600;700', category: 'modern' },
    { id: 'montserrat', label: 'Montserrat', cssClass: 'font-montserrat', googleFont: 'Montserrat:wght@400;500;600;700', category: 'modern' },
    { id: 'raleway', label: 'Raleway', cssClass: 'font-raleway', googleFont: 'Raleway:wght@400;500;600;700', category: 'modern' },
    { id: 'quicksand', label: 'Quicksand', cssClass: 'font-quicksand', googleFont: 'Quicksand:wght@400;500;700', category: 'modern' },
    { id: 'comic', label: 'Comic Neue', cssClass: 'font-comic', googleFont: 'Comic+Neue:wght@400;700', category: 'modern' },
    { id: 'merriweather', label: 'Merriweather', cssClass: 'font-merriweather', googleFont: 'Merriweather:wght@400;700', category: 'serif' },
    { id: 'gentium', label: 'Gentium Plus', cssClass: 'font-gentium', googleFont: 'Gentium+Book+Plus:wght@400;700', category: 'serif' },
    { id: 'lora', label: 'Lora', cssClass: 'font-lora', googleFont: 'Lora:wght@400;500;700', category: 'serif' },
    { id: 'playfair', label: 'Playfair Display', cssClass: 'font-playfair', googleFont: 'Playfair+Display:wght@400;500;700', category: 'serif' }
];
if (typeof window !== 'undefined') { window.FONT_OPTIONS = FONT_OPTIONS; }
(function injectFontStyles() {
    if (document.getElementById('alloflow-ui-font-library-css')) return;
    const fonts = FONT_OPTIONS.filter(f => f.googleFont).map(f => f.googleFont);
    if (fonts.length > 0) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fonts.join('&family=')}&display=swap`;
        document.head.appendChild(link);
    }
    const style = document.createElement('style');
    style.id = 'alloflow-ui-font-library-css';
    style.textContent = `
    .font-opendyslexic, .font-opendyslexic * { font-family: 'OpenDyslexic', cursive, sans-serif !important; }
    .font-lexend, .font-lexend * { font-family: 'Lexend', sans-serif !important; }
    .font-atkinson, .font-atkinson * { font-family: 'Atkinson Hyperlegible', sans-serif !important; }
    .font-andika, .font-andika * { font-family: 'Andika', sans-serif !important; }
    .font-inter, .font-inter * { font-family: 'Inter', sans-serif !important; }
    .font-roboto, .font-roboto * { font-family: 'Roboto', sans-serif !important; }
    .font-opensans, .font-opensans * { font-family: 'Open Sans', sans-serif !important; }
    .font-lato, .font-lato * { font-family: 'Lato', sans-serif !important; }
    .font-nunito, .font-nunito * { font-family: 'Nunito', sans-serif !important; }
    .font-sourcesans, .font-sourcesans * { font-family: 'Source Sans 3', sans-serif !important; }
    .font-poppins, .font-poppins * { font-family: 'Poppins', sans-serif !important; }
    .font-montserrat, .font-montserrat * { font-family: 'Montserrat', sans-serif !important; }
    .font-raleway, .font-raleway * { font-family: 'Raleway', sans-serif !important; }
    .font-quicksand, .font-quicksand * { font-family: 'Quicksand', sans-serif !important; }
    .font-comic, .font-comic * { font-family: 'Comic Neue', cursive, sans-serif !important; }
    .font-merriweather, .font-merriweather * { font-family: 'Merriweather', serif !important; }
    .font-gentium, .font-gentium * { font-family: 'Gentium Book Plus', serif !important; }
    .font-lora, .font-lora * { font-family: 'Lora', serif !important; }
    .font-playfair, .font-playfair * { font-family: 'Playfair Display', serif !important; }
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
    const disabledEls = document.querySelectorAll('button[disabled], input[disabled], textarea[disabled]');
    disabledEls.forEach(el => {
        el.removeAttribute('disabled');
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('data-was-disabled', 'true');
    });
})();

  // Register on AlloModules so callers + the host upgrade hook can find us.
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.UIFontLibrary = { FONT_OPTIONS: FONT_OPTIONS };

  // Trigger the host-scope upgrade hook if the monolith set one up.
  // Pattern: feedback_iife_lazy_lookup.md — re-points the monolith's var
  // FONT_OPTIONS alias to the canonical array so JSX renders that follow
  // get the real data (rather than the empty-array shim).
  if (typeof window._upgradeUIFontLibrary === 'function') {
    try { window._upgradeUIFontLibrary(); } catch (e) { console.warn('[UIFontLibrary] _upgradeUIFontLibrary failed', e); }
  }

  console.log('[CDN] UIFontLibraryModule loaded — ' + FONT_OPTIONS.length + ' fonts registered');
})();
