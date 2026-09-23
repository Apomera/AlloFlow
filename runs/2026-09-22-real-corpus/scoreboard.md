# Real-document remediation scoreboard

Generated 2026-09-23T01:28:23.685Z. The run finished.

## At a glance

- 39 public documents (20 kinds), 3 trial(s) each: 117 of 117 document trials completed.
- Model stage BLOCKED on this machine (no model key or backend), so no document was remediated in this run. Everything below comes from the model-free stages, which ran on every document.
- Model-free stages completed on 107 of 117 document trials. Crashes or hangs: 0.
- Source files: 0 of 34 already pass the veraPDF PDF/UA-1 checks; 4 are image-only (no text to check until OCR); 1 have a text layer that decodes to unreadable glyphs.
- Document Safety scan: the tagged PDF would be withheld for 4 of 39 documents (4 carry active content such as scripts; 0 could not be fully examined). This gate withholds only the tagged PDF, never the accessible HTML.
- Most serious product finding: source-pdf-ua:failed:unclassified:tool-failed-verapdf-cli-returned-incomplete-or-c (5 document trials).
- Repeat trials: 35 of 39 documents gave the same answer on every trial; 4 differed (listed under Consistency).

## How to reproduce

```
node dev-tools/benchmark_document_remediation.cjs --mode corpus --manifest mcp-testing/corpus/real-corpus-2026-09-22.json --corpus-dir C:\tmp\remediation_corpus --trials 3 --out-dir runs/2026-09-22-real-corpus
```

Fetch or check the documents first with the same command and `--mode fetch`. The PDFs are public and are not stored in the repository.

## Engine

**Model stage BLOCKED.** No Gemini key (GEMINI_API_KEY or an ALLOFLOW_MCP_ENV_PATH key file) and no ALLOFLOW_MCP_MODEL_BACKEND is configured on this machine. To unblock: Get a free Gemini key at https://aistudio.google.com/app/apikey, set it for this shell only (PowerShell: $env:GEMINI_API_KEY = "<key>"), then run the same command again.

Model-free stages (text extraction, the Document Safety scan, veraPDF on the source) ran on every document with no model and no network request for document content.

## Streak

Trial 1: deliverable streak not measured, because no document reached the model stage. Model-free stages completed on 16 documents in a row (of 39); no crash or hang on 39 in a row.
Trial 2: deliverable streak not measured, because no document reached the model stage. Model-free stages completed on 34 documents in a row (of 39); no crash or hang on 39 in a row.
Trial 3: deliverable streak not measured, because no document reached the model stage. Model-free stages completed on 35 documents in a row (of 39); no crash or hang on 39 in a row.

## Corpus

39 public documents, 3 trial(s) each, 117 of 117 document trials completed.

| Document | Category | Language | Publisher | Public status | Source |
| --- | --- | --- | --- | --- | --- |
| ed-parent-guide-idea | usde-osep-letter | en | U.S. Department of Education, OSERS | US Government work (public domain). Publicly posted, no login. On 2026-09-22 the URL answered HTTP 403 to a scripted client; the checked-out repository copy has the recorded sha256. | https://sites.ed.gov/idea/files/policy_speced_guid_idea_memosdcltrs_iep-translation-06-14-2016.pdf |
| irs-i1040-instructions | government-guidance | en | Internal Revenue Service | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf |
| nasa-artemis-plan | figure-heavy-report | en | NASA | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.nasa.gov/wp-content/uploads/2020/12/artemis_plan-20200921.pdf |
| nist-hb44-excerpt | table-heavy-report | en | National Institute of Standards and Technology | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://nvlpubs.nist.gov/nistpubs/hb/2024/NIST.HB.44-2024.pdf |
| nist-sp800-63-3-digital-identity | government-guidance | en | National Institute of Standards and Technology | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63-3.pdf |
| ohchr-udhr-english | multilingual-reference | en | UN OHCHR | UN OHCHR; UDHR text is public domain; local test use only. Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.ohchr.org/sites/default/files/UDHR/Documents/UDHR_Translations/eng.pdf |
| ohchr-udhr-spanish | multilingual-reference | es | UN OHCHR | UN OHCHR; UDHR text is public domain; local test use only. Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.ohchr.org/sites/default/files/UDHR/Documents/UDHR_Translations/spn.pdf |
| uscis-civics-100q | study-guide | en | U.S. Citizenship and Immigration Services | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.uscis.gov/sites/default/files/document/questions-and-answers/100q.pdf |
| fda-nexium-prea-letter | agency-letter | en | U.S. Food and Drug Administration | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.fda.gov/media/135691/download |
| nsf-science-indicators-brief | figure-heavy-report | en | National Science Board / NSF NCSES | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://ncses.nsf.gov/pubs/nsb20221/assets/nsb20221.pdf |
| usgs-water-cycle | figure-heavy-report | en | U.S. Geological Survey | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://pubs.usgs.gov/gip/2005/17/gip-17.pdf |
| irs-f1040 | fillable-form | en | Internal Revenue Service | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.irs.gov/pub/irs-pdf/f1040.pdf |
| irs-f1040-1913-scan | scanned-ocr-layer | en | Internal Revenue Service | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.irs.gov/pub/irs-prior/f1040--1913.pdf |
| irs-f1040-1954-scan | scanned-image-only | en | Internal Revenue Service | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.irs.gov/pub/irs-prior/f1040--1954.pdf |
| nces-condition-of-education | table-heavy-report | en | National Center for Education Statistics | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://nces.ed.gov/pubs2023/2023144.pdf |
| nist-cyber-framework-quickstart | table-heavy-report | en | National Institute of Standards and Technology | US Government work (public domain). Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf |
| ohchr-udhr-persian | rtl-script | fa | UN OHCHR | UN OHCHR; UDHR text is public domain; local test use only. Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.ohchr.org/sites/default/files/UDHR/Documents/UDHR_Translations/prs.pdf |
| ohchr-udhr-hebrew | rtl-script | he | UN OHCHR | UN OHCHR; UDHR text is public domain; local test use only. Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.ohchr.org/sites/default/files/UDHR/Documents/UDHR_Translations/hbr.pdf |
| ohchr-udhr-urdu | rtl-script | ur | UN OHCHR | UN OHCHR; UDHR text is public domain; local test use only. Publicly posted, no login. Re-fetched from the URL on 2026-09-22 with the same sha256. | https://www.ohchr.org/sites/default/files/UDHR/Documents/UDHR_Translations/urd.pdf |
| pps-board-policy-ebca-2025-06 | board-policy | en | Portland Public Schools (Portland, ME) Board of Education | Publicly posted attachment on Portland Public Schools' public BoardDocs site, no login; board public record | https://go.boarddocs.com/me/portland/Board.nsf/pfiles/DHKPLR652CCF/$file/Policy%20EBCA%20%20.pdf |
| msad35-board-agenda-2025-06 | board-policy | en | Maine School Administrative District No. 35 (Eliot / South Berwick, ME) | Publicly posted board meeting agenda on the district's document host, no login; public meeting record | https://core-docs.s3.us-east-1.amazonaws.com/documents/asset/uploaded_file/1885/MSAD_35/5789678/Agenda_June_18__2025.pdf |
| msad52-family-newsletter-2026-08 | newsletter-flyer | en | Maine School Administrative District 52 (Turner, ME) | District newsletter linked publicly from the district home page (public Google Drive share), no login | https://drive.google.com/uc?export=download&id=1KfoyBrFHC2lopOE4_eBnXKVbkgDAs7eJ |
| pps-childcare-letter-es-2020-12 | family-letter-es | es | Portland Public Schools (Portland, ME) | Publicly posted attachment on Portland Public Schools' public BoardDocs site, no login; district-wide family letter (no individual student) | https://go.boarddocs.com/me/portland/Board.nsf/pfiles/BWDU6G7A84B7/$file/P517-%20SPA%20Child%20Care%20Letter%20to%20Families%20December%202020.pdf |
| mdoe-ml-parent-rights-es | family-letter-es | es | Maine Department of Education | Publicly posted on maine.gov/doe, no login; state family-rights notice template for families | https://www.maine.gov/doe/sites/maine.gov.doe/files/inline-files/ML%20Parent%20Rights%20-%20Copy_Spanish_Final.pdf |
| pps-childcare-letter-ar-2020-12 | family-letter-other | ar | Portland Public Schools (Portland, ME) | Publicly posted attachment on Portland Public Schools' public BoardDocs site, no login; district-wide family letter | https://go.boarddocs.com/me/portland/Board.nsf/pfiles/BWDU777A8911/$file/P517-%20ARA%20Child%20Care%20Letter%20to%20Families%20December%202020.pdf |
| pps-childcare-letter-so-2020-12 | family-letter-other | so | Portland Public Schools (Portland, ME) | Publicly posted attachment on Portland Public Schools' public BoardDocs site, no login; district-wide family letter | https://go.boarddocs.com/me/portland/Board.nsf/pfiles/BWDU6J7A85B6/$file/P517-%20SOM%20Child%20Care%20Letter%20to%20Families%20December%202020.pdf |
| pps-childcare-letter-pt-2020-12 | family-letter-other | pt | Portland Public Schools (Portland, ME) | Publicly posted attachment on Portland Public Schools' public BoardDocs site, no login; district-wide family letter | https://go.boarddocs.com/me/portland/Board.nsf/pfiles/BWDU6L7A86B0/$file/P517-%20POR%20Child%20Care%20Letter%20to%20Families%20December%202020.pdf |
| mdoe-state-complaint-request-form | state-doe-form | en | Maine Department of Education, Office of Special Services & Inclusive Education | Publicly posted on maine.gov/doe, no login; blank state form | https://www.maine.gov/doe/sites/maine.gov.doe/files/inline-files/StateCIRequestForm.pdf |
| osep-dcl-behavior-supports-ieps-2016 | usde-osep-letter | en | U.S. Department of Education, Office of Special Education and Rehabilitative Services (OSERS/OSEP) | Public federal guidance (US Government work, public domain) posted on sites.ed.gov, no login; fetched from the Internet Archive id_ capture because ed.gov refused this machine | https://web.archive.org/web/20250118084459id_/https://sites.ed.gov/idea/files/dcl-on-pbis-in-ieps-08-01-2016.pdf |
| mdifw-worksheet-beaks-and-feet | worksheet | en | Maine Department of Inland Fisheries & Wildlife (reprinted with permission from NYSDEC) | Publicly posted on maine.gov (MDIFW educator materials), no login; free student worksheet | https://www.maine.gov/ifw/docs/Beaks%20&%20Feet.pdf |
| umaine-4h-activity-rain-in-a-jar | worksheet | en | University of Maine Cooperative Extension 4-H | Publicly posted on extension.umaine.edu, no login; free youth activity sheet | https://extension.umaine.edu/4h/wp-content/uploads/sites/38/2020/06/4-H-Friday-Fun-Activity-Sheet-Rain-in-a-Jar.pdf |
| umaine-syllabus-sie515 | university-syllabus | en | University of Maine, Spatial Informatics / School of Computing and Information Science | Publicly posted on umaine.edu, no login; course syllabus (instructor contact details only) | https://spatial.umaine.edu/wp-content/uploads/sites/512/2015/02/SIE515Syllabus.pdf |
| usm-syllabus-bio105 | university-syllabus | en | University of Southern Maine, Department of Biological Sciences | Linked publicly from usm.maine.edu department page (public Google Drive share), no login | https://drive.google.com/uc?export=download&id=1XBomDoVNi7D6iPlbEhq9OZ17POPN5hwW |
| pps-msma-git-declaration-of-trust-2015 | scanned-image-only | en | Portland Public Schools Board of Education (board packet attachment; document of the Maine School Management Association | Publicly posted attachment on Portland Public Schools' public BoardDocs site, no login; board packet public record | https://go.boarddocs.com/me/portland/Board.nsf/pfiles/B6ZSGU6F3EB4/$file/2015%20revised%20GIT%20Declaration%20of%20Trust.pdf |
| union-rsu40-bond-sample-ballot | scanned-image-only | en | Town of Union, Maine (RSU 40 bond referendum) | Publicly posted on the Town of Union municipal website, no login; public election sample ballot | https://www.union.maine.gov/vertical/sites/%7B45C83186-1E71-4F7C-A6A6-4C9EBBC99C05%7D/uploads/RSU_40_Bond_Referendum_Sample_Ballot(1).pdf |
| mdoe-cds-child-find-intake-form | fillable-form | en | Maine Department of Education, Child Development Services | Publicly posted on maine.gov/doe, no login; blank fillable intake form | https://www.maine.gov/doe/sites/maine.gov.doe/files/inline-files/CDS_Child%20Find%20Intake%20Form_0.pdf |
| mdoe-fy25-resident-expenditure-totals | table-heavy-report | en | Maine Department of Education, School Finance | Publicly posted on maine.gov/doe, no login; statewide aggregate finance data (SAU-level, no individuals) | https://www.maine.gov/doe/sites/maine.gov.doe/files/inline-files/School%20Finance%20-%20FY25%20Resident%20Expenditure%20Totals%20-%201.7.2026.pdf |
| msad49-parent-notifications-2025 | multi-column-newsletter | en | Maine School Administrative District 49 (Fairfield, ME) | Publicly posted annual notifications brochure on the district's document host, no login | https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/824/Msad_49/007b25e3-04f1-474b-aa4c-ec2a3515c31e/Parent_Notifications_2025.pdf?disposition=inline |
| rsu57-budget-review-2025-26 | slide-deck | en | Regional School Unit 57 (Waterboro, ME) | Publicly posted budget presentation on the district's document host, no login; public budget record | https://core-docs.s3.us-east-1.amazonaws.com/documents/asset/uploaded_file/1039/RSU_57/5485106/2025-2026_Budget_Review_Session.pdf |

## Outcomes

- blocked: 117

Outcome meanings: delivered = accessible HTML and a tagged PDF were written; delivered-html = accessible HTML written, tagged PDF withheld by a safety or honesty gate; withheld = a gate refused to deliver anything (fail-closed, not a crash); refused = the input was not accepted; throttled = the model provider refused calls; errored = a crash or unexpected failure; timed-out = a hang; blocked = no model engine configured.

## Rates per category

| Category | Docs | Trials | Deliverable rate | No crash or hang | Model-free stages completed | Source passes PDF/UA | Safety scan passes | Image-only |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| agency-letter | 1 | 3 | n/a | 100% | 100% | 0 | 3 | 0 |
| board-policy | 2 | 6 | n/a | 100% | 83.3% | 0 | 6 | 0 |
| family-letter-es | 2 | 6 | n/a | 100% | 100% | 0 | 6 | 0 |
| family-letter-other | 3 | 9 | n/a | 100% | 100% | 0 | 9 | 0 |
| figure-heavy-report | 3 | 9 | n/a | 100% | 100% | 0 | 9 | 0 |
| fillable-form | 2 | 6 | n/a | 100% | 100% | 0 | 0 | 0 |
| government-guidance | 2 | 6 | n/a | 100% | 33.3% | 0 | 3 | 0 |
| multi-column-newsletter | 1 | 3 | n/a | 100% | 100% | 0 | 3 | 0 |
| multilingual-reference | 2 | 6 | n/a | 100% | 100% | 0 | 6 | 0 |
| newsletter-flyer | 1 | 3 | n/a | 100% | 100% | 0 | 3 | 0 |
| rtl-script | 3 | 9 | n/a | 100% | 100% | 0 | 9 | 3 |
| scanned-image-only | 3 | 9 | n/a | 100% | 100% | 0 | 9 | 9 |
| scanned-ocr-layer | 1 | 3 | n/a | 100% | 100% | 0 | 3 | 0 |
| slide-deck | 1 | 3 | n/a | 100% | 66.7% | 0 | 3 | 0 |
| state-doe-form | 1 | 3 | n/a | 100% | 66.7% | 0 | 3 | 0 |
| study-guide | 1 | 3 | n/a | 100% | 100% | 0 | 3 | 0 |
| table-heavy-report | 4 | 12 | n/a | 100% | 75% | 0 | 9 | 0 |
| university-syllabus | 2 | 6 | n/a | 100% | 100% | 0 | 6 | 0 |
| usde-osep-letter | 2 | 6 | n/a | 100% | 100% | 0 | 6 | 0 |
| worksheet | 2 | 6 | n/a | 100% | 100% | 0 | 6 | 0 |

## Failure taxonomy (frequency x severity)

Severity: 5 crash or hang, 4 nothing delivered (withheld or throttled), 3 input refused or a model-free stage failed, 2 tagged PDF withheld or safety scan incomplete, 1 review required or active content found (correct behavior, listed so it is visible).

Run blockers (environment, not product failures): engine:no-model-engine on 117 document trials.

| Rank | Class | Severity | Count | Docs | Minimal repro | Suspected location | Log excerpt |
| ---: | --- | ---: | ---: | --- | --- | --- | --- |
| 1 | source-pdf-ua:failed:unclassified:tool-failed-verapdf-cli-returned-incomplete-or-c | 3 | 5 | irs-i1040-instructions, nist-hb44-excerpt | `node dev-tools/benchmark_document_remediation.cjs --mode corpus --cases irs-i1040-instructions --manifest mcp-testing/corpus/real-corpus-2026-09-22.json --corpus-dir C:\tmp\remediation_corpus --trials 1 --out-dir <empty-directory>` (stage source-pdf-ua) | desktop/mcp/remediation_verification.cjs:4 | Tool failed: veraPDF CLI returned incomplete or contradictory validation evidence (exit 1) |
| 2 | source-pdf-ua:failed:unclassified:tool-failed-java-runtime-not-found-java-version- | 3 | 4 | msad35-board-agenda-2025-06, mdoe-state-complaint-request-form, rsu57-budget-review-2025-26, nist-sp800-63-3-digital-identity | `node dev-tools/benchmark_document_remediation.cjs --mode corpus --cases msad35-board-agenda-2025-06 --manifest mcp-testing/corpus/real-corpus-2026-09-22.json --corpus-dir C:\tmp\remediation_corpus --trials 1 --out-dir <empty-directory>` (stage source-pdf-ua) | desktop/mcp/remediation_epub_validation.cjs:17 | Tool failed: Java runtime not found: `java -version` failed (spawnSync java ETIMEDOUT). PDF/UA validation runs the bundled veraPDF CLI through a local Java runt |
| 3 | safety-scan:active-content | 1 | 12 | irs-i1040-instructions, nist-hb44-excerpt, irs-f1040, mdoe-cds-child-find-intake-form | `node dev-tools/benchmark_document_remediation.cjs --mode corpus --cases irs-i1040-instructions --manifest mcp-testing/corpus/real-corpus-2026-09-22.json --corpus-dir C:\tmp\remediation_corpus --trials 1 --out-dir <empty-directory>` (stage safety-scan) | doc_pipeline_source.jsx:867 | embedded-files x1 |
| 4 | source-pdf-ua:failed:unclassified:tool-failed-verapdf-validation-timed-out | 3 | 1 | nist-hb44-excerpt | `node dev-tools/benchmark_document_remediation.cjs --mode corpus --cases nist-hb44-excerpt --manifest mcp-testing/corpus/real-corpus-2026-09-22.json --corpus-dir C:\tmp\remediation_corpus --trials 1 --out-dir <empty-directory>` (stage source-pdf-ua) | n/a | Tool failed: veraPDF validation timed out |

## Consistency across trials

35 of 39 documents gave the same answer on every trial (outcome, text layer, safety scan, source PDF/UA; durations excluded).

| Document | Trials | Fields that differed |
| --- | --- | --- |
| nist-sp800-63-3-digital-identity | 1, 2, 3 | modelFreeOutcome, sourcePdfUa |
| msad35-board-agenda-2025-06 | 1, 2, 3 | modelFreeOutcome, sourcePdfUa |
| mdoe-state-complaint-request-form | 1, 2, 3 | modelFreeOutcome, sourcePdfUa |
| rsu57-budget-review-2025-26 | 1, 2, 3 | modelFreeOutcome, sourcePdfUa |

## Per document (trial 1; every trial is in scoreboard.json)

| Document | Trial | Category | Language | Pages | Text layer | Source PDF/UA (veraPDF) | Safety scan | Outcome | Readiness | Score before to after | After, per engine | Token recall | Left for a person | Output PDF/UA | Model calls | Wall seconds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ed-parent-guide-idea | 1 | usde-osep-letter | en | 2 | text | fails 5 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 22 |
| irs-i1040-instructions | 1 | government-guidance | en | 126 | text | failed | withholds: active content | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 109 |
| nasa-artemis-plan | 1 | figure-heavy-report | en | 74 | text | fails 9 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 46 |
| nist-hb44-excerpt | 1 | table-heavy-report | en | 573 | text | failed | withholds: active content | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 355 |
| nist-sp800-63-3-digital-identity | 1 | government-guidance | en | 76 | text | fails 13 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 52 |
| ohchr-udhr-english | 1 | multilingual-reference | en | 8 | text | fails 8 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 28 |
| ohchr-udhr-spanish | 1 | multilingual-reference | es | 9 | text | fails 6 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 55 |
| uscis-civics-100q | 1 | study-guide | en | 11 | text | fails 9 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 24 |
| fda-nexium-prea-letter | 1 | agency-letter | en | 7 | text | fails 8 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 104 |
| nsf-science-indicators-brief | 1 | figure-heavy-report | en | 46 | text | fails 3 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 229 |
| usgs-water-cycle | 1 | figure-heavy-report | en | 40 | text | fails 16 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 44 |
| irs-f1040 | 1 | fillable-form | en | 2 | text | fails 5 rules | withholds: active content | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 24 |
| irs-f1040-1913-scan | 1 | scanned-ocr-layer | en | 4 | text | fails 9 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 18 |
| irs-f1040-1954-scan | 1 | scanned-image-only | en | 4 | image-only (no usable text layer) | fails 5 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 21 |
| nces-condition-of-education | 1 | table-heavy-report | en | 54 | text | fails 3 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 86 |
| nist-cyber-framework-quickstart | 1 | table-heavy-report | en | 32 | text | fails 11 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 82 |
| ohchr-udhr-persian | 1 | rtl-script | fa | 12 | text | fails 7 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 27 |
| ohchr-udhr-hebrew | 1 | rtl-script | he | 4 | unreadable glyphs (no ToUnicode map) | fails 7 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 79 |
| ohchr-udhr-urdu | 1 | rtl-script | ur | 7 | image-only (no usable text layer) | fails 6 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 24 |
| pps-board-policy-ebca-2025-06 | 1 | board-policy | en | 2 | text | fails 6 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 47 |
| msad35-board-agenda-2025-06 | 1 | board-policy | en | 7 | text | failed | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 110 |
| msad52-family-newsletter-2026-08 | 1 | newsletter-flyer | en | 4 | text | fails 5 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 93 |
| pps-childcare-letter-es-2020-12 | 1 | family-letter-es | es | 1 | text | fails 6 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 109 |
| mdoe-ml-parent-rights-es | 1 | family-letter-es | es | 1 | text | fails 5 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 183 |
| pps-childcare-letter-ar-2020-12 | 1 | family-letter-other | ar | 1 | text | fails 5 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 199 |
| pps-childcare-letter-so-2020-12 | 1 | family-letter-other | so | 1 | text | fails 5 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 182 |
| pps-childcare-letter-pt-2020-12 | 1 | family-letter-other | pt | 1 | text | fails 3 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 48 |
| mdoe-state-complaint-request-form | 1 | state-doe-form | en | 5 | text | failed | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 84 |
| osep-dcl-behavior-supports-ieps-2016 | 1 | usde-osep-letter | en | 16 | text | fails 5 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 116 |
| mdifw-worksheet-beaks-and-feet | 1 | worksheet | en | 1 | text | fails 8 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 79 |
| umaine-4h-activity-rain-in-a-jar | 1 | worksheet | en | 2 | text | fails 4 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 122 |
| umaine-syllabus-sie515 | 1 | university-syllabus | en | 14 | text | fails 6 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 158 |
| usm-syllabus-bio105 | 1 | university-syllabus | en | 3 | text | fails 5 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 161 |
| pps-msma-git-declaration-of-trust-2015 | 1 | scanned-image-only | en | 3 | image-only (no usable text layer) | fails 6 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 79 |
| union-rsu40-bond-sample-ballot | 1 | scanned-image-only | en | 1 | image-only (no usable text layer) | fails 6 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 66 |
| mdoe-cds-child-find-intake-form | 1 | fillable-form | en | 1 | text | fails 11 rules | withholds: active content | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 146 |
| mdoe-fy25-resident-expenditure-totals | 1 | table-heavy-report | en | 6 | text | fails 6 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 121 |
| msad49-parent-notifications-2025 | 1 | multi-column-newsletter | en | 2 | text | fails 7 rules | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 108 |
| rsu57-budget-review-2025-26 | 1 | slide-deck | en | 25 | text | failed | passes | blocked (no-model-engine) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 170 |

## What this does NOT claim

- AlloFlow does not make a document "WCAG compliant" and this scoreboard does not certify conformance with WCAG, Section 508, the ADA or PDF/UA.
- AlloFlow does not remediate on its own. It drafts an accessible version and an audit report of what is left; a person reviews and decides before anything is handed out.
- Scores come from automated checks (axe-core, IBM Equal Access and an AI rubric). Automated checks cover only part of WCAG; many success criteria need human judgment.
- Token recall is a word-level comparison with the source. It cannot prove that meaning, reading order, table structure or OCR are correct.
- veraPDF checks the machine-verifiable PDF/UA rules only. A clean veraPDF result is not a usability test with assistive technology.
- A withheld tagged PDF is a safety decision (active content, an incomplete scan, or text that may be missing), not a failure to process the document.
- This corpus is small, public and mostly English. Results describe these documents with this engine on this date; they do not predict every document.
- No independent person has reviewed these outputs yet.
