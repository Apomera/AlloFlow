# Rainfall practice: capture provenance

Created September 4, 2026 for general Teacher Guide chapter 19.

- rainfall-practice-source.png: rendered fictional source PDF; not a repair result.
- rainfall-practice-worksheet.pdf: fictional input, also provided under chapters/practice for a supported relative download link. It has one page and deliberately has no accessibility tags.
- workspace-choice.png: untouched 1536 x 1000 capture from the packaged local app through its desktop runtime. Shell: main.1cbe8c3a.js. Fresh browser context, no credentials or student data.

- audit-start-controls.png: direct 896 x 760 browser capture of the audit-choice area after the user-approved upload of rainfall-practice-worksheet.pdf. Setup prompts were dismissed using their UI controls. The source image was not retouched. No audit, AI repair, or export was started.

All images were visually checked for readable labels and clipping. No AI generation or completed repair is claimed. Live Canvas testing remains pending browser control and delivery of the instrumented code.

Local test limitations: early upload during first-time setup reproduced “The file intake module did not finish loading.” A subsequent upload succeeded after setup was dismissed and MiscHandlers finished registering. The successful capture reported no uncaught page errors, but the local runtime still logged missing-script/MIME errors for ai_backend_module.js and allo_quest_contract_module.js, including a CDN fallback attempt. A general error badge remained outside the captured audit panel. This is an upload/control capture, not a clean end-to-end runtime test.
