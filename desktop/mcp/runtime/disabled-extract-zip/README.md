# Disabled ZIP extraction fallback

This private first-party package replaces `extract-zip` inside the AlloFlow MCP runtime. It always rejects with `ALLOFLOW_ZIP_EXTRACTION_DISABLED` before performing file or network operations. It contains no upstream extraction code and is not a general-purpose ZIP API or an upstream security patch.

Supported EPUB validation uses `remediation_epub_archive.cjs` to inspect and extract bounded regular files into a private directory, then passes that directory to Ace. Browser installation uses Playwright. An accidental attempt to use Ace's legacy archive extraction or another consumer's old ZIP fallback therefore fails closed.

The runtime directly references this directory and overrides transitive `extract-zip` imports to the same package. Install with `npm ci --ignore-scripts --install-links`; `--install-links` materializes regular package files instead of a symlink. The MCPB builder copies this source beside the staged manifest before installing dependencies. The exact packaged artifact must retain this identity, behavior, and the supported EPUB audit path.
