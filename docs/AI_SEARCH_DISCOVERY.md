# AI search discovery

AlloFlow's AI-discovery strategy uses the same durable foundations as search SEO: a crawlable site, canonical URLs, descriptive public content, structured data, an XML sitemap, and an authoritative project-facts page. It does not depend on undocumented ranking tricks or an `llms.txt` file.

## Crawler policy

[`robots.txt`](../robots.txt) explicitly allows standard search engines plus the published search or user-directed agents for OpenAI, Perplexity, Anthropic, and Apple. It disallows training-specific agents where a provider offers a cleanly separate control:

- Allowed: `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Perplexity-User`, `Claude-SearchBot`, `Claude-User`, `Applebot`, and standard crawlers covered by `*`.
- Disallowed: `GPTBot`, `ClaudeBot`, and `Applebot-Extended`.

This file is a crawler preference, not an access-control mechanism. Review it when crawler vendors change their documented user agents. Google currently uses `Googlebot` for Google Search and its AI search features; the separate `Google-Extended` control combines Gemini model improvement and grounding, so it is left to the standard wildcard policy rather than described here as search-only.

## Authoritative facts

[`about.html`](../about.html) gives humans and retrieval systems a maintained, citable record of the project's canonical name, upstream repository, release, license, maintainer, inventory, deployment boundaries, and fork relationship. Keep its visible facts and JSON-LD synchronized with the homepage, README, release metadata, and `CITATION.cff`.

## IndexNow activation

The `Notify AI and search indexes` workflow validates locally on every relevant push, but live submission remains inactive unless both repository Actions secrets exist:

1. Generate an IndexNow key containing 8-128 letters, numbers, or hyphens.
2. Arrange for deployment to serve a plain-text key file beneath `https://apomera.github.io/AlloFlow/` without committing the key to the public repository. The response body must be exactly the key.
3. Add `INDEXNOW_KEY` as a repository Actions secret.
4. Add the full hosted key-file URL as the `INDEXNOW_KEY_LOCATION` repository Actions secret.
5. Run the workflow manually, or let its daily schedule submit the deployed sitemap.

The submitter verifies the hosted key, fetches the live sitemap, rejects URLs outside the official site path, confirms that `about.html` is deployed, and then sends one IndexNow URL-set request. It never prints the key. Test the local payload without network access with:

```sh
npm run audit:ai-discovery
node dev-tools/submit_indexnow.cjs --dry-run
```

IndexNow helps participating search engines discover changes; it does not guarantee crawling, indexing, ranking, or inclusion in an AI-generated answer. Continue submitting the sitemap through Google Search Console and Bing Webmaster Tools as the primary account-level discovery controls.
