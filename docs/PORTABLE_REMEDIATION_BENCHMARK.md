# Portable remediation benchmark

Run the no-account structural benchmark from the repository root:

```bash
npm run benchmark:portable-remediation
```

To preserve its generated HTML, reports, privacy receipts, synthetic inputs, and machine-readable
receipt, run:

```bash
node dev-tools/benchmark_alloflow_portable.cjs --out-dir ./portable-benchmark-evidence
```

The runner calls the canonical `alloflow_portable.py` engine. It does not contain another
remediation implementation.

## Current cases

- An existing multi-column reading-order PDF and reviewed repair plan.
- A generated complex table with column and row headers.
- A meaningful embedded image with alt text and a caption.
- A simulated image-only reconstruction that must retain a human-review note.
- An interactive form that must be blocked without partial output.

The receipt records semantic-HTML audit results, plan-internal token recall, required human review,
and safety blocking. Every engine invocation has model and Cloudflare credentials removed.

## Evidence boundary

This benchmark proves deterministic plan validation, rendering, static HTML checks, packaging
behavior, and safety gates. It cannot prove that Claude, ChatGPT, or another host read a source
correctly. Both `source_pages` and repair blocks come from the host, so agreement between them is
not independent source-PDF evidence.

Human comparison remains required for wording, reading order, tables, images, equations, and
scanned pages. The corpus currently contains one repository PDF fixture plus privacy-safe generated
cases. Add reviewed, licensed real-world documents before making public quality claims.