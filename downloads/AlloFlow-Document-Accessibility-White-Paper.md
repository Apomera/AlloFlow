# Evidence-Aware Document Accessibility Remediation in AlloFlow

Architecture, standards context, privacy boundaries, delivery paths, and the limits of automated assurance.

Public draft 1.0 — August 13, 2026

This paper is technical information, not legal advice or a conformance certification.

## Executive summary

Document remediation is not simply file conversion. An accessible result must preserve the source while exposing meaningful headings, lists, tables, links, image alternatives, language, reading order, navigation, and interaction to people using different sensory and input modes. Automated tools can identify and repair some failures, but they cannot decide whether every description is useful, every table conveys its intended relationships, or every page remains faithful to the author.

AlloFlow treats remediation as a staged, evidence-producing workflow. It assesses and extracts the source; rebuilds semantic HTML; applies deterministic and AI-supported repairs; checks the exact HTML with multiple evidence sources; stops or reverts when an improvement loop plateaus or regresses; then creates a native tagged PDF and, when the local validator is available, runs veraPDF against the final PDF bytes.

AlloFlow is designed to produce a more accessible, reviewable document package with source-bound evidence. It does not claim that automation alone establishes WCAG, PDF/UA, Section 508, or legal compliance.

## Standards and current public-sector timeline

The Web Content Accessibility Guidelines are a shared international technical standard for making digital content more accessible to people with disabilities. WCAG 2 organizes its requirements under four principles: content should be perceivable, operable, understandable, and robust. Testable success criteria are grouped at Levels A, AA, and AAA. W3C encourages use of WCAG 2.2.

AlloFlow's engineering work is aimed toward WCAG 2.2 Level AA. That engineering target should not be confused with the legal baseline selected in a regulation or with a product-wide conformance claim.

The U.S. Department of Justice's 2024 Title II rule adopted WCAG 2.1 Level AA as the technical standard for covered web content and mobile applications provided by state and local governments. An interim final rule effective April 20, 2026 extended the compliance dates:

- April 26, 2027 for public entities with a population of 50,000 or more.
- April 26, 2028 for public entities with a population below 50,000 and special district governments.

The rule contains definitions, exceptions, and entity-specific considerations. Institutions should consult current official guidance and counsel. DOJ also emphasizes that accessibility obligations under Title II continue independently of these dates.

## The remediation problem

Conventional documents often encode appearance more reliably than meaning. A heading may be only large bold text. A table may be positioned words. A scanned PDF may contain no text layer. Reading order can diverge from visual order. Form fields can be unlabeled. Images may lack useful text alternatives.

A robust process must address:

- Extraction risk: text or relationships can be lost, duplicated, or placed in the wrong order.
- Semantic risk: a visually plausible output can expose weak structure to assistive technology.
- Transformation risk: a proposed fix can alter meaning or introduce a new defect.
- Assurance risk: a clean automated scan can be mistaken for complete accessibility evidence.

## Pipeline architecture

```text
PDF / DOCX / PPTX
        ↓
source assessment + text/layout extraction + OCR when needed
        ↓
semantic HTML rebuild
        ↓
deterministic repair → AI-diagnosed surgical repair → complex rewrite only when needed
        ↓
fresh rubric review + axe-core + IBM Equal Access on exact HTML bytes
        ↓
bounded keep-best loop with plateau stop and regression rollback
        ↓
reviewable HTML + evidence report + native tagged PDF
        ↓
internal PDF preflight + optional local veraPDF PDF/UA-1 validation
        ↓
human source comparison and usability review
```

### Assessment and extraction

The pipeline identifies the source format, page characteristics, text availability, images, links, and likely reading-order or structure risks. Text-native pages are extracted directly. Image-based pages can be routed through OCR. Extraction remains an evidence source, not an authority: recovered tokens and order must be compared with the source.

### Semantic rebuild

The primary intermediate representation is semantic HTML. This creates an inspectable structure for headings, paragraphs, lists, tables, figures, links, language, navigation, and accessible names. Deterministic fixes are preferred because they are reproducible. More invasive AI-supported repair is reserved for defects that require diagnosis or rewriting.

### Bounded improvement

Verification results feed a keep-best loop. The process can apply a candidate repair, re-run evidence, keep an improvement, revert a regression, and stop when results plateau.

### Output and PDF validation

The application can produce accessible HTML, an audit/evidence report, and native tagged PDF for PDF inputs. Office inputs in the local connector produce accessible HTML. Editable and alternate exports include DOCX, ODT, EPUB 3, DAISY 3, and uncontracted Grade-1 BRF, each with a disclosed validation boundary.

## Evidence model

Complete application-level HTML evidence combines a rubric-based accessibility review with axe-core and IBM Equal Access checks. These are not interchangeable scores. The rubric can address contextual requirements that rule engines may not decide; rule engines provide deterministic findings for supported machine-testable patterns.

Evidence is tied to the artifact being delivered. AlloFlow binds verification to the exact HTML output and, in the portable workflow, binds the repair plan to a SHA-256 digest of the source. Stamped reports and worksheets make stale or altered evidence detectable.

A tagged PDF and browser-accessible HTML are different artifacts. PDF output receives internal structural preflight. When local Java and veraPDF are available, the final PDF bytes can receive independent PDF/UA-1 validation. A veraPDF pass does not prove every description is meaningful or every reading-order choice matches author intent.

A qualified reviewer still compares source and output; checks reading order, tables, equations, forms, and image descriptions; tests keyboard and assistive-technology use where relevant; and resolves cautions that automation cannot decide.

## Delivery paths

### Application pipeline

The full AlloFlow application presents an interactive document workflow with preview, audit, repair, verification, export, and review controls. Its AI and storage boundaries depend on the selected runtime.

### Portable Agent Skill v0.2.9

The portable Skill is the simplest public remediation distribution. A user attaches a document in a compatible AI workspace. The selected host model analyzes it and creates a strict, source-bound repair plan. Bundled scripts perform deterministic rebuild and validation, then produce HTML, tagged PDF when local capability is present, a scoped report, and a privacy receipt. A fresh-context second reader or human reviewer verifies the result. Source files are never overwritten; automatic rebuild is blocked for interactive forms, signed documents, certificates, and legal records.

The neutral Skill is the ordinary direct-use package. The OpenAI package supports the publisher and submission flow, while the Claude Code wrapper supports that plugin environment. They are versioned, checksum-listed assets in the `portable-v0.2.9` GitHub Release, not the Claude Desktop MCP connector. Baseline scripts require Python 3.9 or newer; tagged PDF needs local Node, Playwright, and Chromium capability; PDF/UA validation needs a separate local Java and veraPDF setup.

### Local MCP connector

The local MCP source exposes 29 tools for remediation, auditing, extraction, redaction, form conversion, validation, and alternate-format work. It includes a companion Skill. Offline document tools keep document data local. Setup and some export helpers can download public dependencies without intentionally sending document content; credential checking sends only the key. Gemini-dependent operations may send the full selected document or derived content using the user's configured key.

A public MCPB binary is intentionally not linked at the time of this paper. A trustworthy release requires a fresh non-lean build, parity tests, artifact verification, an updated checksum, an SBOM, attestation, and a versioned release tag and checksum record.

### Institution-owned remote pilot architecture

The repository contains a fail-closed remote MCP design using institution-owned Cloudflare infrastructure for OAuth, opaque identifiers, private storage, durable workflows, isolated containers, quotas, and retention. It has not been provisioned as a public service and is separate from the Cloudflare Pages browser application.

## Privacy boundaries

- Portable Skill: the attachment is processed by the chosen host agent under its terms and settings. Bundled scripts make no document request to AlloFlow, Cloudflare, a remote MCP, another model API, or telemetry.
- Local MCP: offline document tools keep document data local. Some setup and export helpers fetch public dependencies without intentionally sending document content; credential checking sends only the key. Gemini-dependent operations may send the full selected document or derived content using the user's key. Local job metadata can persist for up to 30 days.
- Cloudflare-hosted browser app: Cloudflare Pages delivers static application assets. Ordinary web configuration, including a configured provider key, is stored in that browser's unencrypted local storage; shared or student devices should be avoided and keys removed after use. AI requests go to the selected provider. Cloudflare Pages is not the remediation document service.
- Packaged Electron Desktop: provider keys can use OS-backed encrypted storage, and supported local models can avoid a remote model provider for compatible operations.

No path should be used for protected content solely because it is described as local or portable. Institutions must approve the host, account, provider, retention, device, storage, and human workflow together.

## Case-study evidence

Repository test reports provide examples under specific conditions, not general accuracy estimates.

A dated five-document corpus report recorded agreement between two PDF/UA validation pathways across all five tested outputs and zero failed rules in those runs, alongside corroborating axe-core and IBM Equal Access results on the tested HTML.

A 126-page case recorded 1,663 of 1,663 verification items in its round report. A separate 40-page, 17-image teacher-guide case recorded 388 of 388 items after verification exposed seven authoring discrepancies and they were corrected. These examples show why an evaluator must be able to block or revise output—not merely produce a positive score.

## Current limitations and non-claims

- Automated output is not a legal opinion, accessibility certification, or substitute for an organization's conformance evaluation.
- A zero-finding axe or Equal Access run covers only the rules and rendered state tested.
- AI review can be inconsistent and must be corroborated by deterministic checks and people.
- OCR can misrecognize characters, order, mathematical notation, or language.
- Alternative-text quality, source fidelity, and reading-order intent require human judgment.
- EPUB checking is structural and is not an epubcheck result.
- DAISY output is not currently backed by a contracted DAISY validator.
- BRF output is uncontracted Grade 1 and requires qualified review; Grade 2 UEB is not claimed.
- The public MCPB connector release is pending a clean, reproducible release gate.
- The remote institutional MCP is code for a pilot architecture, not a live public service.

## Adoption guidance

1. Inventory active, archived, duplicate, exempt-candidate, and high-impact content with counsel and accessibility leadership.
2. Prioritize documents people need to participate, apply, learn, communicate, or receive support.
3. Pair remediation with accessible templates, procurement requirements, training, and publishing gates.
4. Approve the complete host/provider/device data path before uploading protected documents.
5. Keep the source digest, output digest, check versions, findings, cautions, and review record together.
6. Include disabled users and assistive-technology testing; technical checks cannot represent the full experience.

## References

- U.S. DOJ, [First Steps Toward Complying with the Title II Web and Mobile App Rule](https://www.ada.gov/resources/web-rule-first-steps/).
- U.S. DOJ, [Fact Sheet on the Title II Web and Mobile App Rule](https://www.ada.gov/resources/2024-03-08-web-rule/).
- U.S. DOJ, [2026 Interim Final Rule extending compliance dates](https://www.ada.gov/assets/pdfs/2026-ifr.pdf).
- W3C WAI, [WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/).
- W3C WAI, [WCAG 2 at a Glance](https://www.w3.org/WAI/standards-guidelines/wcag/glance/).
- AlloFlow, [current remediation pipeline architecture](https://github.com/Apomera/AlloFlow/blob/main/PIPELINE_ARCHITECTURE.md).
- AlloFlow, [generated WCAG capability map](https://github.com/Apomera/AlloFlow/blob/main/docs/wcag_sc_coverage.md).
- AlloFlow, [interim accessibility conformance report](https://github.com/Apomera/AlloFlow/blob/main/VPAT-2.5-WCAG-AlloFlow.md).
- AlloFlow, [portable remediation architecture and trust model](https://github.com/Apomera/AlloFlow/blob/main/docs/alloflow-portable-remediation.md).
- AlloFlow, [local MCP privacy policy](https://github.com/Apomera/AlloFlow/blob/main/desktop/mcp/PRIVACY.md).
- AlloFlow, [five-document cross-validation report](https://github.com/Apomera/AlloFlow/blob/main/mcp-testing/CROSS-VALIDATION-2026-08-04.md).
- AlloFlow, [Round 11: 126-page verification record](https://github.com/Apomera/AlloFlow/blob/main/mcp-testing/corpus/round-11/ROUND-11.md).
- AlloFlow, [Round 12: 40-page image-rich verification record](https://github.com/Apomera/AlloFlow/blob/main/mcp-testing/corpus/round-12/ROUND-12.md).
- AlloFlow, [portable remediation v0.2.9 release](https://github.com/Apomera/AlloFlow/releases/tag/portable-v0.2.9).
