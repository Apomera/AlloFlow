# Titration apparatus close-ups — September 7, 2026

This pass adds Full apparatus, Flask close-up, and Burette close-up views to the immersive titration bench. Each close-up frames the relevant apparatus and hides surrounding equipment, while preserving experiment state. Reset view resets the camera within the selected view. Returning from the 2D diagram preserves the selected close-up.

The flask has a subtle liquid-surface rim to improve visibility. A responsive observation panel explains what to look for in the selected view and keeps the current indicator/endpoint observation nearby. All new labels use translation lookups and are included in the English catalog; new language-pack translations remain a follow-up.

54 focused tests passed across five files. New geometry checks verify that every visible close-up object is inside its camera-fit bounds, that numerical readings remain unchanged, and that animation cannot make an excluded drop reappear in the burette view. Existing science, motion, accessibility, and deep regression checks also passed.

Real Chromium WebGL checks verified both close-ups, selected states, additions while inspecting the flask, keyboard and button camera controls, preserved state through 2D/3D switching, reduced motion, refill and redox behavior, and the graphics-failure fallback. Nine targeted axe scans covered all three views at 1200, 360, and 320 pixels, with no violations or panel overflow. No browser exceptions occurred. Visual review covered the desktop flask close-up and mobile layout.

Evidence is in `reports/chemistry-refinement-2026-09-06/`: `titration-closeup-tests.json`, `titration-closeup-browser.cjs`, `titration-closeup-browser-results.json`, and `titration-closeup-*.jpg`.

Source and desktop public copies are synchronized. No deployment was performed. These are illustrative apparatus views, not calibrated scales or a headset VR implementation; the numeric experiment model remains the measurement reference.
