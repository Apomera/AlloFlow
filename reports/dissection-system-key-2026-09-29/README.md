# Dissection Lab: more room for the specimen

September 29, 2026

## Changes

- The eight-row system color key no longer covers the specimen in the normal Advanced workspace. A compact **System color key** disclosure sits below the canvas controls and depth key.
- Opening it reveals labeled color swatches in a responsive grid. It supports keyboard navigation, large text, and high contrast, and remains open through ordinary canvas updates.
- The HTML key, fullscreen key, and structure list share the same color palette. The two keys also share localized system names.
- Fullscreen keeps its canvas key. Its labels now stay fixed when the specimen is zoomed, panned, or switched between dorsal and ventral views.
- Assessment hides both versions of the key. Opening the disclosure leaves saved observations unchanged.

## Visual review

| Previous phone view | Updated phone view |
| --- | --- |
| [Color key over the specimen](before-phone-390.png) | [Clearer specimen view](specimen-390.png) |

- [Expanded key at 390 px](expanded-key-390.png)
- [Expanded key at 320 px with high contrast](expanded-key-320.png)
- [Fullscreen key at 2× zoom](fullscreen-zoomed.png)

## Verification

- **3 Chromium scenarios passed:** 390 px and 320 px layouts, keyboard expansion, palette colors, text size, overflow, saved-note preservation, assessment, and fullscreen zoom/pan/orientation stability. See [browser-tests.log](browser-tests.log).
- **109/109 focused canvas and workspace regression checks passed.** See [unit-results.json](unit-results.json).
- JavaScript syntax, both locale JSON files, and scoped whitespace checks pass. The web and desktop modules match byte for byte.

The existing palette test was updated because key entries now come directly from the shared color table instead of a separate array.
