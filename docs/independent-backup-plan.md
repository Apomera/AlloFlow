# AlloFlow independent backup plan

Status: Deferred by the maintainer on October 24, 2026. Preserve the current Cloudflare deployment and prioritize security hardening. Resume this project only when requested.

## Purpose and hosting options

Provide a separately reachable classroom application during a Cloudflare outage. AWS is a candidate for the standby, not a selected provider or a migration commitment. A possible AWS configuration is CloudFront serving approved public assets from a private S3 bucket, with origin access control. Other providers remain eligible if their hosting, DNS, certificates, and required delivery services can operate independently of Cloudflare.

The current site continues running throughout development and testing. The first release uses its own address; production DNS changes and automatic traffic switching are outside the initial scope. A subdomain using the same Cloudflare authoritative DNS would retain that dependency.

## Initial classroom scope

The proposed recovery journey is: open the standby address, import a previously exported project or AlloPack, use supported reading controls and activities, then save or export the work.

| Include after acceptance testing | Defer to a separately scoped project |
| --- | --- |
| Saved project and AlloPack import | Automatic migration of browser profiles and saved work |
| Original-text reading, display controls, and manually edited supports | Cloud AI generation, analysis, images, OCR, and remote voices |
| A selected set of STEM simulations and SEL activities | A guarantee covering every feature within every tool |
| Project download and selected print or export formats | Recovery of existing live sessions, accounts, and shared student state |
| Required scripts, fonts, language files, media, and public resources | Private submissions, inboxes, notifications, cloud proxies, and their databases |

Teachers can work locally and download files. The first release adds no application server accepting student submissions and no shared student database. Controls for unavailable services must explain their status accurately.

A different origin has separate localStorage, IndexedDB, and service-worker caches. The standby cannot automatically read lessons saved at the primary address. Export/import preparation must happen before an outage; this plan does not promise recovery of unsaved work or zero data loss. Browser/system speech is included only where verified on supported devices.

## Existing foundations and work required

AlloFlow Desktop already bundles local assets, and the School Box provides local hosting components. The public production build still embeds Cloudflare addresses in module and plugin loading. Existing GitHub fallbacks cannot recover an initial application shell that never loads. Source mirrors protect source availability but do not replicate private Cloudflare records.

Relevant implementation starting points:

- [Build and module URL generation](../build.js)
- [Canonical application and plugin routing](../AlloFlowANTI.txt)
- [Device storage](../allo_device_storage_module.js)
- [Project import handlers](../misc_handlers_module.js)
- [Desktop continuity path](../desktop/README.md)
- [School Box limits](../docker/README.md)
- [Current service-worker behavior](../app/sw.js)

The standby needs complete asset packaging and explicit origin configuration. Copying the current HTML to another host is insufficient. School Box's local API proxies are not a public production deployment template.

## Implementation sequence when resumed

1. Select concrete reading, project, STEM, and SEL acceptance journeys. Inventory their scripts, media, models, workers, fonts, export engines, and network calls.
2. Build from a reviewed source snapshot in an isolated checkout with an approved empty environment. Current build commands rewrite generated sources and application directories, so do not run them against an unrelated dirty workspace.
3. Add a standby configuration that loads its own packaged assets, uses the correct student-link origin, and disables unsupported backend actions. Keep the production configuration as the default and avoid a second independently maintained application fork.
4. Generate an explicit public-file manifest with hashes, sizes, release identity, and dependency destinations. Upload only those files; never publish a whole working tree or its existing local build output.
5. Test locally with an empty browser profile and Cloudflare endpoints blocked. Verify task completion, import/export recovery, accessibility, routing, MIME types, caching, and update behavior.
6. Choose the provider and address after measuring the artifact and expected traffic. Prepare hosting, HTTPS, monitoring, rollback, and recovery instructions separately from production credentials.

The earlier planning estimate was roughly 5–15 engineering days for a deliberately limited first release, subject to the dependency inventory and device testing. Full feature parity requires a separate estimate. Hosting, domain, and ongoing maintenance costs remain unbudgeted until the provider and package are selected.

## Security requirements

- Publish only approved public application assets. Exclude credentials, local environment files, private records, reports, development artifacts, and maintainer configuration; scan the final artifact.
- Use a separate hosting account or bounded deployment identity, MFA, and permissions that cannot modify production. Keep recovery access available without Cloudflare authentication.
- Preserve import sanitization and isolated previews. Test security headers and Content Security Policy against the supported document, worker, and media features before enforcement.
- Retain verified older releases independently. A shared bad source release or compromised build dependency could otherwise affect both sites; do not automatically promote every production release to the standby.
- Define a patching owner and release update process. Monitor reachability and certificate validity, and repeat the outage drill after relevant asset or configuration changes.
- Distinguish outage operation from compromise recovery. Suspected compromise requires a verified build and retained recovery data rather than blindly copying the latest state.

The additional origin, hosting account, deployment credentials, and retained code increase the maintenance and attack surface. Static hosting limits the new server-side exposure but does not eliminate browser application vulnerabilities or replace a provider's global DDoS defenses.

## Acceptance criteria

- A fresh browser can start the standby without an existing primary-site cache while all required Cloudflare paths are blocked.
- Each declared classroom journey completes, including saving, reloading, and importing representative work and embedded media.
- Required assets come from independently available destinations; unsupported external features report their limitations without retry loops or hidden uploads.
- HTTPS, MIME types, security headers, deep links, missing-file responses, and service-worker release matching work on the selected host.
- Negative probes for private paths do not disclose files. Final artifact review finds no server secrets or maintainer deployment settings.
- A previous release can be restored using standby access alone. Classroom recovery instructions explain the separate browser storage and tested import/export path.

## References

- [CloudFront restricted access to S3](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [Browser storage isolation](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy#cross-origin_data_storage_access)
- [Content Security Policy implementation](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSP)

Provider capabilities and costs must be rechecked when this plan resumes.
