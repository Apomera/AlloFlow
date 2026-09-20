# Rendered checkpoint follow-up audit

Read-only application audit of explicitly requested `href` and `language` checkpoint properties. Six bounded synthetic Chromium probes ran through the actual `compareRenderedHtml` implementation; two also ran through the actual post-export `runAcceptance` integration. All implementation hashes stayed unchanged. No application or permanent test files were edited.

Evidence: [reproducible probe](probe.cjs), [complete reports, native observations, tool versions and implementation hashes](results.json). Rerun from the repository root with `node reports/document-remediation-next-opportunities-2026-09-19/rendered/probe.cjs`. Every navigation was intercepted; document scripts and external resources were blocked. These observations are not live-model or screen-reader acceptance.

## 1. Resolve SVG link destinations before comparing requested href

Priority: P2. `dev-tools/rendered_document_fidelity.cjs:170` treats an SVG `<a>` like an HTML anchor and returns its `href` property directly. On SVG this is an `SVGAnimatedString`, which serializes as `{}`. Two different absolute destinations therefore compare equal. `xlink:href` destinations also escape the literal-relative guard because `getAttribute('href')` is null.

- `svg-absolute-link-change`: `https://example.test/source` changed to `https://example.test/changed`. The requested `href`, `text`, `name` and `role` all pass; the source and candidate href observations are both `{}`. Native clicks attempt the two different URLs, with both requests intercepted and aborted. The integrated export acceptance report also passes.
- `svg-xlink-relative-change`: `xlink:href="source"` changed to `xlink:href="changed"`; both href observations are `{}` and the comparison passes. Native navigation targets differ.
- Valid control `svg-link-harmless-class`: adding a class preserves the native destination and correctly passes.

Suggested refinement: resolve links according to their element namespace, using the SVG animated-string base value plus the effective document base for SVG anchors. Preserve literal relative references, including `xlink:href`, as the current contract promises. If a URL observation cannot be produced, report unavailable instead of treating an opaque object as an equal destination. Add both harmful changes and the harmless control to native and export regression coverage.

## 2. Compare effective language and accept equivalent tag casing

Priority: P2. `dev-tools/rendered_document_fidelity.cjs:176` reads only the nearest HTML `lang` attribute and compares its original spelling. This ignores namespaced `xml:lang` on inline SVG, even though Chromium applies it, and rejects equivalent capitalization of HTML language tags.

- `svg-xml-language-change`: inherited `xml:lang="fr"` changed to `xml:lang="de"`. Both requested language observations are the outer HTML `en`, so rendered comparison and integrated export acceptance pass. Chromium's native `:lang(fr)` / `:lang(de)` matching proves the effective language changes from French to German.
- Valid control `svg-xml-language-harmless-class`: an added class preserves effective French and passes.
- Valid control `html-language-equivalent-case`: `lang="en-US"` becomes `lang="EN-us"`. Chromium matches the same `:lang(en)` and `:lang(en-US)` conditions on both sides, but the language checkpoint fails and the overall result is review-required.

Suggested refinement: collect the effective inherited language according to the element namespace and attribute precedence, preserving explicit unknown-language resets; normalize language-tag casing before equality. Add namespace inheritance, changed language, case-equivalent markup, empty resets, and unchanged controls to the calibration corpus.

## Scope

The findings concern properties explicitly requested in the source-authored checkpoint. They do not assert whole-document coverage or require unrequested properties. Six probe cases assert the observed behavior: three harmful changes incorrectly pass, two harmless controls pass, and one equivalent-language control incorrectly fails. Both selected export integrations incorrectly pass. Application changes and fixes are left for the implementing turn.
