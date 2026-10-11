# GitHub Pages Publication

GitHub Pages publishes the promotion site at `https://apomera.github.io/AlloFlow/`.
The maintained site launches the interactive application at
`https://alloflow-cdn.pages.dev/app/`; Cloudflare Pages and the repository CDNs
remain responsible for application modules, translations and learning libraries.

The branch-root Jekyll build reads `_config.yml`. That file uses JSON, a valid YAML
form, so the same configuration can be checked without a second YAML parser.
Its exclusions remove reports, developer/test tools, desktop copies and the
duplicate application tree from the Pages artifact, not from the repository.
Original AlloPack authoring PNGs are excluded while illustrated packs, compact
WebP images and their provenance manifests remain available. Promotion pages,
teacher manuals, guide chapters, example downloads, assets and the language
manifest remain published. These exclusions do not change raw GitHub or jsDelivr
access to any committed file, or the Cloudflare app build.

Run `node --max-old-space-size=512 dev-tools/check_pages_publish.cjs` before
changing this boundary. Add `--verbose` to trace each checked dependency.
The check inventories selected tracked files, enforces a 900 MB source budget,
rejects selected symlinks/hard links and checks the local dependency closure of
the sitemap and generated guide. It parses page links, script references and
static fetches, CSS asset URLs and responsive image references. The regression
suite also deliberately excludes a required stylesheet, simulates budget growth,
and verifies rejection. The HTML/XML parsers come from the existing locked jsdom
dependency tree; pages are inspected without creating browser windows.

This is a source/publication-contract check, not a local Jekyll compilation or a
confirmation of a remote deployment. The GitHub Pages build and deploy checks
must pass after the fix is committed and pushed. GitHub limits published Pages
sites to 1 GB; the extra headroom accommodates generated Markdown and metadata.
The check models this repository's publication boundary, not every Jekyll plugin
or configuration feature. Its restricted matcher follows Jekyll 3.10's
per-directory entry filtering: an included entry can override its exclusion,
an excluded ancestor prevents traversal, and literal exclusion prefixes can
also match similarly named paths. The root configuration does not need includes
for the ordinary `vendor` directory.

## Local Verification

On 2026-10-10, the final selected tracked source measured approximately 728.6 MB:
6,155 files with 312 required promotion dependencies and no audit errors. Nine
focused regression tests passed with one worker. The canonical and public
educator-evaluation pages now use the existing `.html` manual URL; this
also corrected a broken relative link discovered by the dependency audit.

No local Ruby/Jekyll runtime was available. These checks do not establish the
final generated artifact size or remote deployment success. No repository
history, reports, application assets or account settings were deleted or changed
by the publication configuration, and nothing was pushed or deployed.

## Incident

On 2026-10-10, the GitHub Pages `deploy` check for commit
`a1deedf3f2665cd1277df2078ed2beb8b2c1d357` reported an 8,815,218,498-byte
artifact, warned about the 1 GB limit and failed deployment. The repository had
no root Jekyll publication exclusions. The repository remains the evidence
archive; diagnostics are not part of the promotion site's hosting payload.

The separate Cloudflare `Workers Builds: alloflow-cdn` failure did not publish
diagnostics in its GitHub check. Cloudflare Pages was successful. Do not infer
that the Worker failure has the same cause or alter account build settings
without reading the failed Worker build log.

References: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits),
[Jekyll configuration options](https://jekyllrb.com/docs/configuration/options/),
[GitHub Pages and Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll),
[Jekyll 3.10 entry filter](https://github.com/jekyll/jekyll/blob/v3.10.0/lib/jekyll/entry_filter.rb),
[Jekyll 3.10 directory reader](https://github.com/jekyll/jekyll/blob/v3.10.0/lib/jekyll/reader.rb).
