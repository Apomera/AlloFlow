# Spoken-direction exports and playback feedback — September 19, 2026

The spoken classroom view now copies, downloads and prints either all steps or the current step. Export options sit inside a native disclosure to preserve reading space. Unfinished drafts are labeled on clipboard, downloaded text and print; teacher-only notes remain excluded. Downloads distinguish scope and draft status in filenames and clean up object URLs. Empty spoken steps show useful guidance and disable unavailable exports for that scope. Print documents include accessible language/viewport/main structure, escaped content, opener isolation and responsive text.

A delayed failed-clip cleanup can no longer replace feedback for newer playback or a different step. Null/non-Error audio rejections produce a readable failure message and release busy controls.

Validation: all 134 tests across five lesson/audio suites passed after the final rebuild, including ten new scoped export and audio regression cases. Chromium checks passed at 1280 and 320 px with real downloads and rendered print documents for saved/draft, current/all-step exports. Existing classroom navigation, fullscreen, editing, deletion, full-script export and lesson-list workflows also passed. No browser errors, horizontal overflow or axe violations in the checked views. Phone reading and draft print screenshots visually reviewed. Print dispatch was intercepted to avoid opening the system printer dialog.

Persistence and audio providers in these checks are fixtures; no live AI/TTS provider was exercised. Generated root/public view mirrors are synchronized. Nothing pushed or deployed.
