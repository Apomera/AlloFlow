# Maine SLD state requirements workspace

Implemented locally October 4, 2026. [Open the local activity](http://127.0.0.1:65063/app/?tool=maine-sld-practice), then choose **Explore your state’s requirements** on Case record or Form reasoning.

The separate workspace supports 50 states plus District of Columbia; PDF/DOCX/TXT/Markdown import through AlloFlow’s local Lumen importer; full extracted-text inspection; literal excerpts, source URL/page, effective and checked dates, revision fingerprint, transfer notes and explicit participant review. Editing source details or notes clears review status. Saved state references use their own tab storage and JSON download/restore, independent of all fictional case work. Unsaved drafts are explicitly excluded from downloads and do not survive closing/reloading.

Public research reuses WebSearchProvider with one fixed state query and cited candidates. Uploaded documents, excerpts, notes and case work are never inserted in search requests. Discovery snippets do not become verified rules. Import and search results require explicit use/save. Cancellation, state changes, edited drafts, collapse and navigation retire late results. Comparison prompts cover criteria, language/validity, intervention/observation evidence, exclusions, instructional need, forms and timelines.

## Verification

70 distinct checks passed: seven reference-core, 21 document, 32 shared/new search-policy, seven new Chromium workflows and three retained case/host/jurisdiction workflows. All final browser jobs used one worker and zero automatic retries. Four new scoped accessibility scans found zero violations; retained jurisdiction checks also passed. Actual source-app launch and cold local text-adapter loading passed. Root directly reviewed six actual source-app captures of metadata, long excerpts, transfer notes and phone/forced-color layouts; independent review covers source preservation and four earlier summary captures.

The first actual-app accessibility run found a duplicate banner from the existing activity header. Its failure, trace and screenshots remain in actual-app-01-artifacts. A one-attribute header correction resolved it, and the complete seven-workflow run passed on the final module. Earlier builds/previews/results are retained.

Case Core, case data, existing activity styles and print remain exact; the original38-scenario specification is byte-identical. Four Maine runtime mirrors, four parser mirrors, six backend mirrors and their scoped content pins are synchronized. Latest shared host bytes were preserved by guarded edits. [Final verification](final-verification.json), [independent review](independent-final-review.md), [root layout review](root-layout-review.json), [browser results](browser-final-results.json), [retained results](retained-browser-results.json), [document results](eol-correction/document-final-results.json), [search results](search-final-results.json) and [frozen activity](frozen-activity.json) contain the evidence.

## Release limits

Hosted proxies still need a separate deployment of the updated allowlist before accepting state SLD queries. No live search credentials or remote acceptance were tested; import/manual entry and an external public-search link remain available. The workspace records participant review and does not certify legal accuracy or substitute for the state’s current rules. No production deployment, full app build, staging, commit or push was performed.

Final module SHA256: 664c72da73a75b1e9fe2763d6913ff216c88a5d3886701f8a2da7e443f032b21. Local preview PID: 39540.

Final formatting verification removed two introduced CR bytes from parser export lines. The raw-IIFE parser builder preserves source bytes, so its four artifacts and three host content pins were regenerated to b774ddf6. Initial formatting-parity failures remain in eol-correction/parity-results.json; all21document checks and the unchanged actual-app import/accessibility workflow passed afterward. Current-source whitespace check passes. The Maine module and all case/UI behavior are unchanged.
