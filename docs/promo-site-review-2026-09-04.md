# AlloFlow promotional website: accuracy, engagement, and SEO review

Reviewed September 4, 2026. Public site: https://apomera.github.io/AlloFlow/. Repository: Apomera/AlloFlow. Changes in this review are local and have not been published.

## Follow-up implementation: classroom example and root deployment

The resumed pass adds a static, expandable water-cycle example immediately after the homepage hero. It includes the shared source, shorter-sentence reading, four-term glossary, an exit ticket with equivalent response options, and the teacher's review decisions. The samples are explicitly illustrative rather than presented as live model output or a real learner record. A downloadable text file lets visitors try the source themselves; the full worked teaching vignette remains one click away. The hero now links directly to the example and explains optional provider, hosting, and support costs near the launch decision.

The host-root fix is prepared in [deployment/github-pages-root](../deployment/github-pages-root/README.md), including the scoped robots policy, a minimal root landing redirect, and publishing instructions. The preparation/check command is:

    node dev-tools/sync_promo_robots.cjs --check

After root deployment, verify it with:

    node dev-tools/sync_promo_robots.cjs --live

The current live check still returns HTTP 404 at https://apomera.github.io/robots.txt. The GitHub connection also returns 404 for the expected Apomera/apomera.github.io repository, which may mean it is absent or unavailable to the connection. No new repository, host setting, or public deployment was created. The prepared exclusion rules are limited to /AlloFlow/ and the exact /AlloFlow URL, so they do not impose training-crawler restrictions on sibling projects. Publishing the files under the existing project's /AlloFlow/ path would not resolve the root issue.

The promotional, wave-3, and AI discovery static audits pass. The extended browser regression suite also passed: keyboard expansion, a source download identical to the visible passage, operation without JavaScript, tool search, feedback routes, navigation breakpoints, and accessibility checks. The 47-page sitemap inspection found no missing local targets. Fresh desktop/mobile browser captures show no horizontal overflow, no page errors, and no axe findings in the states tested. These observations do not establish complete accessibility conformance or field performance. Follow-up screenshots and raw observations use the resumed- prefix in scratch/promo-audit-2026-09-04/.

## Assessment

AlloFlow has a stronger foundation than a typical project landing page: useful task routes, a searchable tool finder, a substantial teacher guide, distinct deployment explanations, canonical URLs, social previews, and structured project information. The biggest opportunities are factual consistency and helping a new visitor understand and try one useful workflow. Adding more feature claims would make the homepage harder to navigate.

The review covered the live homepage at desktop and mobile widths, the local sitemap and linked files, the site's existing promotional audits, release metadata, tool registries, representative product source, the launch route, and official search-engine guidance. This is not an independent evaluation of every product capability or a full manual assistive-technology audit. Search Console, Bing Webmaster Tools, analytics, conversion data, and field Core Web Vitals were not available.

## Corrections made locally

| Priority | Finding | Change |
| --- | --- | --- |
| High | The navigation and live release.json said v1.3, while homepage/About structured data, About prose, and the launcher fallback said v1.2. | Aligned current release facts with release.json. Added a reusable release synchronizer and drift checks. Historical manuals and VPAT version labels remain historical. |
| High | The Report Writer was described as the safest AI-assisted clinical report tool and as ensuring every claim was traceable. No comparative evidence supported the superlative. | Described source-linked drafting, consistency checks, and professional verification of scores and conclusions. |
| High | Search grounding was described as preventing hallucinations and ensuring factual accuracy. | Explained that citations support verification and require review. |
| High | The homepage suggested Canvas automatically inherited the district's Google agreements. | Explained that schools must verify covered services, configuration, retention, and data handling. |
| Medium | Reading and walkthrough copy included universal guarantees, a fixed sub-60-second generation time, and 100% keyboard accessibility. | Qualified AI output, learner fit, processing time, supported navigation targets, and assistive-technology verification. Dolch vocabulary support is distinguished from decodability. |
| Medium | The first screen led with the acronym expansion rather than a classroom benefit. | Added “One lesson. More ways to learn.” and a concrete differentiated-instruction explanation. Preserved the full acronym below the primary actions. |
| Medium | The final CTA asked users to copy a URL rather than open the product. | Added direct launch and first-lesson guide links, with a more concrete closing invitation. |
| Medium | Two audits hard-coded obsolete August inventory counts. | Audits now derive the STEM/SEL inventory from the checked registry rather than expecting 143/70. At review: 147 plugin files, 147 STEM registrations, 71 SEL activities. |
| Medium | Homepage styling arrived near the end of a roughly 414 KB HTML document, contributing to visible layout changes. The icon library blocked parsing. | Moved the two late homepage CSS blocks into an early, cacheable stylesheet; deferred homepage icon loading and reserved icon space. |
| Medium | Sitemap dates lagged changed content, and the sitemap listed an application shell whose canonical pointed to a different host. | Updated lastmod for the pages changed in this review and removed the noncanonical educator-evaluation shell from the promotional sitemap. |

The homepage title and matching social titles now describe “Free AI Tools for Differentiated Instruction.” The existing description, canonical URL, social image, and software identity are retained.

## Browser and technical evidence

The original live homepage returned HTTP 200, showed no horizontal overflow at 1440 or 390 pixels, and had no axe violations for the WCAG A/AA rule tags tested. The mobile menu opened, closed with Escape, and returned focus to its trigger. Main content and navigation were available without JavaScript. These are useful positive findings, not proof of complete accessibility conformance.

Live layout-shift observations were approximately 0.392 on desktop and 0.155–0.161 on mobile. The updated local page measured approximately 0.031 desktop and 0.038 mobile in the final initial-load checks. Both local observations are below the 0.1 good threshold. Live and local delivery conditions differ: these are diagnostic observations, not a validated production percentage improvement or field score. Recheck the deployed page after publishing. Font swapping still caused small residual shifts.

Load timing varied substantially with third-party requests and local machine activity. No reliable LCP improvement is claimed. No Lighthouse performance score, field INP, traffic uplift, or ranking gain was measured. The DevTools MCP browser could not start because its profile was already in use; an isolated Playwright browser provided the runtime evidence instead.

The initial sitemap contained 48 URLs. Local inspection found one noncanonical application shell with a missing static heading and an extensionless manual link. Its canonical is https://alloflow-cdn.pages.dev/educator-evaluation, so it was removed from this sitemap rather than treated as a marketing landing page. The application itself was not changed. The remaining 47 sitemap entries have local targets; internal-link and metadata checks are recorded in the audit artifacts.

## Highest-priority follow-up: host-root robots.txt

A live GET returned 404 for https://apomera.github.io/robots.txt and 200 for https://apomera.github.io/AlloFlow/robots.txt. Standard robots rules must be served at the host root, so the project-path file does not enact the intended crawler policy. A missing root file does not block normal search crawling; the problem is that the intended training-crawler exclusions and sitemap discovery are not established there.

Publish the intended policy through the host-root GitHub Pages site, or move to a deliberately chosen domain where the root is controlled. Scope exclusions to /AlloFlow/ if other projects share the host. Merge with any existing host policy instead of overwriting it. Confirm root HTTP 200, inspect crawler rules, and submit the canonical sitemap directly in Search Console and Bing Webmaster Tools. This requires a change outside this project's current Pages subdirectory and was not deployed as part of the local edits.

Google's rules: https://developers.google.com/crawling/docs/robots-txt/create-robots-txt

## Content and engagement priorities

1. **Implemented in the follow-up: a classroom example early.** Use a short, clearly labeled sample source, one leveled output, one activity, and the teacher's review decisions. Link the actual worked water-cycle vignette. Avoid implying that a staged sample is a live AI result. A visitor should see the product's output before encountering the entire feature inventory.
2. **Shorten the initial decision path.** Keep launch, tool search, and setup comparison prominent. Move the large feature presentation lower or onto a dedicated tour page, preserving old fragment links. The desktop homepage was about 13,470 pixels tall and the mobile homepage about 21,116 pixels tall before edits. Treat progressive disclosure as a content-design experiment, not an SEO trick.
3. **Make proof specific.** Add dated, permissioned teacher examples with role, task, input, output, review effort, and limitations. Time-saved figures need a stated baseline and method. Do not invent testimonials, adoption numbers, or school endorsements.
4. **Separate software price from provider cost near the launch decision.** AlloFlow's license is free; AI services, infrastructure, and support can introduce costs. The site already explains this farther down. Bringing the distinction nearer to launch can reduce avoidable surprises.
5. **Keep specialist promises precise.** Distinguish formative support from validated assessment, AI drafting from professional judgment, translation availability from verified translation quality, and local options from the behavior of every deployment.
6. **Make demonstrations easier to evaluate.** Use current-version screenshots and short videos with accurate titles, captions, accessible text summaries, and a direct next action. Keep the existing click-to-load video behavior.

## Search strategy

The site already has valuable instructional content. Use it to answer actual tasks, with clear internal links from the homepage and relevant feature sections.

| Search intent to validate | Best destination | Useful content |
| --- | --- | --- |
| Free differentiated instruction tools / AI text differentiation | Homepage and a focused classroom workflow | Source-to-output example, grade-level review, practical setup, and cost boundaries |
| UDL lesson planning / accessible classroom resources | Accessibility and UDL guide | Learning goal, barriers, representation and response choices, learner checks |
| Accessible document remediation | Existing remediation page and white paper | Supported formats, source preservation, sample evidence, human review, measured limitations |
| Local AI tools for schools / school AI privacy | Ways to Use and district overview | Data-flow comparison, hardware/provider requirements, operational responsibilities |
| AAC classroom tools / STEM simulations | Relevant tool-finder routes and focused guides | What learners do, setup, accessibility options, and an actual example |

These are candidate topic clusters, not keyword-volume findings. Validate them against Search Console queries before investing in additional pages. Prefer substantial examples over thin pages for every tool or keyword. The current public website is primarily English; 63 application language-pack files do not establish 63 localized marketing pages. Add hreflang only when real equivalent translations exist.

Do not promise FAQ rich results, ratings, or review stars. Do not invent structured ratings. Keep structured data consistent with visible claims. Google does not require llms.txt or special AI markup to appear in AI search features; ordinary indexability, useful text, clear internal links, and reliable content remain the priorities.

Sources: https://developers.google.com/search/docs/appearance/title-link ; https://developers.google.com/search/docs/appearance/structured-data/sd-policies ; https://developers.google.com/search/docs/appearance/ai-features

## Maintenance and measurement

- Before a release, run node dev-tools/sync_promo_release.cjs and node dev-tools/sync_promo_inventory_counts.cjs. Run both again with --check during review. Keep historical documents separate from current product facts.
- Run the promotional, AI discovery, and wave-3 audits. Update sitemap lastmod only for materially changed pages. Google's sitemap guidance says changefreq and priority are ignored, so adjusting those values is not a ranking strategy: https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping
- After publishing, verify canonical selection and indexing in Search Console, submit the sitemap, and inspect important URLs. The IndexNow workflow is configuration-gated; this review did not access secrets or confirm that live submissions are enabled.
- Establish a baseline for nonbrand impressions, relevant query clicks, launch click-through, tool-search usage, and guide-to-launch completion. Compare subsequent results over a meaningful period. Use aggregate, privacy-conscious measurements; classroom content does not belong in marketing analytics.
- Recheck deployed mobile layout and Core Web Vitals. Diagnostic guidance: https://web.dev/articles/optimize-cls

## Follow-up: teacher guide discovery

The guide generator now emits self-referencing absolute canonical URLs and matching Open Graph/Twitter metadata for all 30 HTML pages: 27 chapters, the guide home, tool reference, and the offline edition. It uses the existing 1200 by 630 social image and each page's existing title and description. The offline edition keeps its own canonical because it contains the full book; it still embeds its styles, images, and search code for local use.

Chapter and tool-reference pages also emit BreadcrumbList JSON-LD matching their existing visible breadcrumb trail. Guide home and the offline edition do not claim a trail that is absent from their content. No ratings, usage figures, or fresh content-verification dates were introduced.

Three existing worked examples were missing from the sitemap: worked-student-vignette.html, worked-multilingual-vignette.html, and worked-assessment-access-vignette.html. They are now included, bringing the sitemap to 50 URLs. Guide URL lastmod values reflect this metadata change on September 4; the guide's editorial lastVerified date remains unchanged.

A snapshot comparison verified that the complete body of each of the 30 generated HTML pages is unchanged from the start of this pass, including the current document-accessibility additions. The generator's deterministic check passes after regeneration. Regression coverage checks unique canonical URLs, exact sitemap coverage, title/description agreement, real social-image dimensions, and breadcrumb schema agreement with visible links.

Validation: the teacher guide suite passed all 53 tests. The expanded sitemap contains 50 unique URLs, each backed by a local page, and the scoped diff whitespace check passed.

This implements Google's [canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) and [breadcrumb guidance](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb). Metadata is a discovery and presentation improvement, not evidence of higher rankings or guaranteed rich results. After deployment, verify representative guide URLs in Search Console and Google's Rich Results Test.

## Follow-up: homepage navigation and trying the sample

A compact, wrapping navigation row now links to the classroom example, tool finder, tutorials, access and costs, and privacy. These are native fragment links with unique, focusable targets and spacing below the fixed site navigation. They work without JavaScript and preserve the existing content and routes. This makes the long homepage easier to navigate; it does not claim to reduce its total size or scroll length.

The sample source now offers Copy sample text alongside the existing text download. The button appears when a secure-context clipboard API is available and writes only after a visitor activates it. It copies the visible source passage, retains keyboard focus, announces progress and completion, and offers download or manual selection if writing is denied. Without the API or JavaScript, the static passage and download remain available. No source is sent to an AI provider by this control. Clipboard behavior follows [MDN's writeText documentation](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).

Validation: the extended promotional browser suite passed native-link keyboard navigation at 320, 390, 1024, and 1025 pixels; exact copied/downloaded source agreement; simulated copy success and denial; absent clipboard API; no-JavaScript routes; the existing 33-tool finder and feedback routes; and scoped axe checks. The clipboard tests use a stub to avoid modifying the operator's clipboard. The 10-page promotional audit reported no warnings or errors, the wave-3 audit passed, and the scoped whitespace check was clean. Desktop and mobile previews were visually reviewed and are saved as navigation-example-1440.png, navigation-example-390.png, and navigation-shortcuts previews under scratch/promo-audit-2026-09-04/.

## Follow-up: teaching workflow and legacy claims

The homepage's former setup block mixed a three-pathway heading with four deployment options and finished with instant-export claims. It now presents three teaching decisions: bring the source and goal, choose one useful support, and review before sharing. Each step links to the maintained tool finder or relevant guide chapter, with deployment comparison available below. The responsive cards retain readable text and a direct next action.

The lower-page accuracy pass corrected 28 occurrences of unsupported or unclear claims, then corrected the stale 65-tool slide metric and additional provider/diagram wording. Changes cover fixed generation times, guaranteed meaning preservation, perfect audio sequencing, guaranteed clinical accuracy, universal PII scrubbing, device-only clinical data, universal offline interaction, assured translation coverage, zero performance impact from modules, and guaranteed contribution acceptance. The revised copy explains what the feature supports and where output, device, provider, or professional review matters.

Storage copy now links to the maintained saving-and-recovery guide and distinguishes exported JSON project copies from device-profile recovery. The codename explanation no longer equates a nickname with anonymous records. The pedagogy introduction identifies the audio as AI-generated and the slides as descriptions of intended workflows, with links to the design rationale and practical UDL guide.

The promotional audit now checks normalized homepage text, including text split across markup, line breaks, and SVG labels, for the specific unsupported claims corrected here. This is a regression safeguard for known wording, not an automated fact-checker. The browser audit includes the new teaching workflow in its scoped accessibility scan.

## Follow-up: feature-tour readability

The mobile visual review exposed clipped feature-tour slides: the viewport hid overflow while every slide was absolutely positioned, so most body copy could fall outside the visible area. The active slide now participates in normal document flow and grows to fit its content. Inactive slides use display:none, removing their controls from keyboard navigation. The existing slide controls remain available below the complete content.

Body copy, supporting labels, and muted SVG labels now use lighter text on the dark tour background. The control title is derived from each slide's own category and heading, replacing a stale hard-coded title list that did not match the slide order. The current dot receives aria-current. The browser regression check visits every slide at desktop and phone widths, checks content geometry and matching titles, and includes the tour in its accessibility scan.

Final tour verification: all 26 slides have matching navigation titles and unclipped content at 1440 and 390 pixels. The integrated browser suite also passed, including every slide at 1025 and 390 pixels, the tour accessibility scan, and the existing navigation, clipboard, finder, feedback, and no-JavaScript checks. The three slides missing from the old 23-dot navigation are now reachable through generated controls. Manual visual inspection additionally caught dark gradient headings that axe did not flag; these now use solid light text. The reading diagram no longer assigns fixed levels to ESL, IEP, or RTI groups. Workflow and tour captures are saved under scratch/promo-audit-2026-09-04/ with workflow- and copy-slide- prefixes. These checks do not establish full assistive-technology conformance or learning outcomes.

## Follow-up: source-backed claim review

The next accuracy pass compares the remaining tour claims with current implementation and maintained guides. It replaces the unsubstantiated coding-sandbox pitch with the verified Turtle/Robot Coding Playground; corrects report fact-locking and preset wording; separates automated fluency estimates from teacher review; qualifies language coverage and learning-outcome claims; and labels sample metrics as illustrative. The static tour counter and dots now match all 26 slides. See the [claim evidence record](promo-claim-evidence-2026-09-04.md) for sources, decisions, and limits.

The completed pass also corrects the report adaptation callout: the implementation rewrites selected sections for an audience, rather than automatically producing three report versions. The promotional, wave-3, AI-discovery, and integrated browser checks passed, with an additional 26-slide desktop/mobile geometry and selected-slide contrast check.

## Follow-up: supporting pages and lesson downloads

The feature catalog and district overview now use the same qualified descriptions as the homepage for coding, report review, language coverage, source imports, and generated content. The library now correctly identifies its Civil War download, describes the actual 10/8/8 saved resources, and avoids unsupported grade and standards labels. Search and social descriptions name its three real topics. Subject filters now reflect available packs, announce results, support keyboard use, and stay hidden when JavaScript is unavailable. Download links remain available.

A new browser check verifies the three pages at four widths, actual download bytes, filtering, no-JavaScript behavior, missing icon support, and automated accessibility findings. It caught and helped correct a reduced-motion cascade delay in the shared styles. The [claim evidence record](promo-claim-evidence-2026-09-04.md) documents the file comparisons and verification limits.

## Artifacts and validation

Verified: the 10-page promotional audit passed with no warnings or errors; the AI discovery audit passed across 14 linked pages and five structured entities; the inventory synchronizer found all published counts current; the release check found v1.3 current; the earlier 47-page sitemap inspection found no missing local links or missing/duplicate primary headings. Desktop/mobile homepage scans reported no axe violations or page errors. The existing browser suite passed homepage routes, the 33-entry curated finder, feedback context, 320/390/1024/1025-pixel layouts, no-JavaScript paths, and social-preview availability. Extracted CSS was compared with the original blocks and preserved.

Raw inventories, browser reports, and before/after screenshots are under scratch/promo-audit-2026-09-04/. The changed site files, reusable synchronizer, registry-derived checks, and this report are reviewable locally. Nothing was committed, pushed, or deployed by this review.
