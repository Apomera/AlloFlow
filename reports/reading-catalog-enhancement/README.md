# Reading catalog picture enhancements

Implemented in `reading_library_module.js` and its desktop public mirror.

- Cover sizes: Compact (144 px), Comfortable (224 px, default), and Large pictures (320 px). Selection is saved on this device, with a safe fallback when storage is unavailable or invalid.
- Full covers use contain sizing, so titles and artwork are not cropped. Responsive columns adapt to the chosen size and available width. Imported books and Continue reading use the same preference.
- Catalog filters and books scroll together, keeping books reachable on small screens.
- Reader illustrations offer Enlarge picture, 100–300% zoom, Fit picture, and Return to page size. Zoom stays inside a scrollable region. Captions and alternative text are retained; failed images show a readable fallback.
- Keyboard users can focus and scroll enlarged images without accidentally turning pages. Escape within the illustration collapses it and returns focus to its toggle, without closing the reader. Changing pages resets illustration state.

Validation: 138 existing reading-library/render/theme tests passed. The local Playwright harness verifies sizing, saved preference, zoom/reset, Escape/focus, mobile overflow containment, keyboard scrolling, image failure, and browser errors. Screenshots use deterministic test artwork and catalog fixtures; they are layout evidence rather than live catalog content. Root and desktop modules are byte-identical. No deployment was performed.

New interface strings use the existing translation lookup with English fallback; additional language translations have not been authored.

Run browser checks from the repository root with `node reports/reading-catalog-enhancement/verify-browser.cjs`.
