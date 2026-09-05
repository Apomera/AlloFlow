# Host-root crawler policy for AlloFlow

These are prepared deployment files, not an active host configuration. Nothing in this directory fixes the root URL merely by being published under /AlloFlow/.

## Verified state on September 4, 2026

- https://apomera.github.io/robots.txt returns HTTP 404.
- https://apomera.github.io/AlloFlow/robots.txt returns HTTP 200.
- The connected GitHub API returns 404 for Apomera/apomera.github.io. That can mean the repository is absent or unavailable to this connection.

## Deployment target

Use the root publishing directory of the user-site repository Apomera/apomera.github.io. Copy robots.txt, index.html, and .nojekyll from this directory. The landing page points to the existing AlloFlow project URL; its noindex and canonical metadata avoid creating a second marketing homepage. The project repository and its canonical URLs remain in place.

If a root site or robots policy exists by deployment time, review and merge its configuration rather than replacing it. Training-crawler exclusions here apply only to /AlloFlow/ and the exact /AlloFlow path; they do not impose a policy on sibling projects. Search and user-directed retrieval retain the existing AlloFlow policy.

For a new user-site repository, configure GitHub Pages to deploy from its intended branch root after the files have been reviewed. Do not point the AlloFlow project's Pages settings at this directory: that would still publish under /AlloFlow/ and would replace the promotional site.

## Prepare and verify

Run from the AlloFlow project:

    node dev-tools/sync_promo_robots.cjs
    node dev-tools/sync_promo_robots.cjs --check

After publishing the host-root files:

    node dev-tools/sync_promo_robots.cjs --live

The live check requires HTTP 200, a plain-text content type, and the reviewed policy at the actual host root. Comments and whitespace do not affect comparison. It intentionally fails while the root file is missing. It is an exact deployment check, not a complete robots-standard parser. If the host needs a merged policy, review and update this deployment process before claiming a match.

Submit https://apomera.github.io/AlloFlow/sitemap.xml in the site's Search Console and Bing Webmaster Tools properties. Search crawling is currently allowed by default; a missing root robots file does not itself deindex the site. Crawler preferences are voluntary and do not secure private data.

References: [Google's robots location rules](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt), [GitHub user-site setup](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
